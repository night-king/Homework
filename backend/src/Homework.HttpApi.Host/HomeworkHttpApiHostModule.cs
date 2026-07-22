using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi;
using OpenIddict.Validation.AspNetCore;
using Homework.Catalog;
using Homework.Dev;
using Homework.EntityFrameworkCore;
using Homework.MultiTenancy;
using Volo.Abp;
using Volo.Abp.Account.Web;
using Volo.Abp.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc.AntiForgery;
using Volo.Abp.AspNetCore.Mvc.Libs;
using Volo.Abp.AspNetCore.Mvc.UI.Theme.Shared;
using Volo.Abp.AspNetCore.Serilog;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;
using Volo.Abp.OpenIddict;
using Volo.Abp.Security.Claims;
using Volo.Abp.Swashbuckle;
using Volo.Abp.BlobStoring;
using Volo.Abp.BlobStoring.Aliyun;
using Volo.Abp.BlobStoring.FileSystem;
using Volo.Abp.UI.Navigation.Urls;

namespace Homework;

[DependsOn(
    typeof(HomeworkHttpApiModule),
    typeof(HomeworkApplicationModule),
    typeof(HomeworkEntityFrameworkCoreModule),
    typeof(AbpAutofacModule),
    typeof(AbpAccountWebOpenIddictModule),          // 提供 /connect/token（捆绑的 Account Razor 页保留但闲置）
    typeof(AbpAspNetCoreMvcUiThemeSharedModule),    // Account.Web 的依赖，必须留
    typeof(AbpAspNetCoreSerilogModule),
    typeof(AbpSwashbuckleModule),
    typeof(AbpBlobStoringAliyunModule),
    typeof(AbpBlobStoringFileSystemModule)
    )]
public class HomeworkHttpApiHostModule : AbpModule
{
    public override void PreConfigureServices(ServiceConfigurationContext context)
    {
        var hostingEnvironment = context.Services.GetHostingEnvironment();

        PreConfigure<OpenIddictBuilder>(builder =>
        {
            builder.AddValidation(options =>
            {
                options.AddAudiences("Homework");
                options.UseLocalServer();
                options.UseAspNetCore();
            });
        });

        if (!hostingEnvironment.IsDevelopment())
        {
            PreConfigure<AbpOpenIddictAspNetCoreOptions>(options =>
            {
                options.AddDevelopmentEncryptionAndSigningCertificate = false;
            });

            // TODO(deploy): 上线前把 PFX 口令移出源码（AuthServer:CertificatePassPhrase / user-secrets / 环境变量），
            // 不要提交硬编码口令。已在 DEPLOY.md「密钥移出明文」跟踪；dev 分支不会走到这里。
            PreConfigure<OpenIddictServerBuilder>(serverBuilder =>
            {
                serverBuilder.AddProductionEncryptionAndSigningCertificate(
                    "openiddict.pfx", "3b430890-bef8-40bc-8274-86f32686cd0f");
            });
        }
    }

    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        // headless 必配 #1：无 wwwroot/libs → 关掉客户端库检查，否则每个请求（含 /connect/token）500。
        Configure<AbpMvcLibsOptions>(options => options.CheckLibs = false);

        // headless 必配 #2：SPA 用 Bearer（非 Cookie），关掉全局 antiforgery，否则带 token 的 POST/PUT/DELETE 一律 400
        // （AutoValidateFilter 只作用于 controller action，Account/OpenIddict 的 Cookie Razor 登录页仍保留 CSRF 保护）。
        Configure<AbpAntiForgeryOptions>(options =>
        {
            options.AutoValidateFilter = _ => false;
        });

        // 反代（nginx / Cloudflare）终止 TLS：让应用从 X-Forwarded-Proto 认出原始请求是 https，
        // 否则 OpenIddict 令牌端点会判定「非安全传输」而拒绝 /connect/token（登录/刷新全废）。
        // nginx 在本机回环，默认已信任 loopback 代理，无需额外 KnownProxies。
        context.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        });

        ConfigureAuthentication(context);
        ConfigureApiChallenge(context);
        ConfigureUrls(configuration);
        ConfigureAutoApiControllers();
        ConfigureSwagger(context.Services);
        ConfigureCors(context, configuration);

        Configure<Microsoft.AspNetCore.Builder.RequestLocalizationOptions>(options =>
        {
            options.SetDefaultCulture("zh-Hans");
        });

        var blobBasePath = Path.Combine(context.Services.GetHostingEnvironment().ContentRootPath, "App_Data", "blobs");
        ConfigureBlobStoring(configuration, blobBasePath);
    }

    private void ConfigureBlobStoring(IConfiguration configuration, string fileSystemBasePath)
    {
        // 配了真实 Aliyun 凭证 → 走 OSS；否则兜底为本地文件系统 blob，
        // 让开发环境无需 OSS 也能跑图鉴/上传（ABP 的 set_AccessKeyId 会拒绝空串，故必须条件化）。
        var hasAliyun = !string.IsNullOrWhiteSpace(configuration["Aliyun:AccessKeyId"]);

        Configure<AbpBlobStoringOptions>(options =>
        {
            options.Containers.ConfigureDefault(container =>
            {
                if (hasAliyun)
                {
                    container.UseAliyun(aliyun =>
                    {
                        aliyun.AccessKeyId = configuration["Aliyun:AccessKeyId"]!;
                        aliyun.AccessKeySecret = configuration["Aliyun:AccessKeySecret"] ?? string.Empty;
                        aliyun.Endpoint = configuration["Aliyun:Oss:Endpoint"] ?? string.Empty;
                        // ABP Aliyun provider: ContainerName = OSS bucket name (10.5.0 has no BucketName property)
                        aliyun.ContainerName = configuration["Aliyun:Oss:BucketName"] ?? string.Empty;
                        // 公有读 Bucket 由运维预先创建；不由应用自动建桶。
                        aliyun.CreateContainerIfNotExists = false;
                    });
                }
                else
                {
                    container.UseFileSystem(fs => fs.BasePath = fileSystemBasePath);
                }
            });
        });
    }

    private void ConfigureAuthentication(ServiceConfigurationContext context)
    {
        context.Services.ForwardIdentityAuthenticationForBearer(
            OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
        context.Services.Configure<AbpClaimsPrincipalFactoryOptions>(options =>
        {
            options.IsDynamicClaimsEnabled = true;
        });
    }

    private void ConfigureApiChallenge(ServiceConfigurationContext context)
    {
        // Headless：无 Bearer 头的 /api/* 请求走 cookie scheme，默认会 302 重定向到登录页。
        // 对纯 API 而言应返回 401（未认证）/ 403（无权限），SPA 才能据此刷新/重登。
        // 只改 /api/* 路径的挑战响应；非 /api（闲置的 ABP Account 登录页）保持原有重定向。
        context.Services.ConfigureApplicationCookie(options =>
        {
            options.Events.OnRedirectToLogin = ctx =>
            {
                if (ctx.Request.Path.StartsWithSegments("/api"))
                {
                    ctx.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                    return Task.CompletedTask;
                }
                ctx.Response.Redirect(ctx.RedirectUri);
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = ctx =>
            {
                if (ctx.Request.Path.StartsWithSegments("/api"))
                {
                    ctx.Response.StatusCode = (int)HttpStatusCode.Forbidden;
                    return Task.CompletedTask;
                }
                ctx.Response.Redirect(ctx.RedirectUri);
                return Task.CompletedTask;
            };
        });
    }

    private void ConfigureUrls(IConfiguration configuration)
    {
        // Account 模块构建绝对链接（如邮箱确认）时用到；设成本机 SelfUrl 即可。
        Configure<AppUrlOptions>(options =>
        {
            options.Applications["MVC"].RootUrl = configuration["App:SelfUrl"];
        });
    }

    private void ConfigureAutoApiControllers()
    {
        Configure<AbpAspNetCoreMvcOptions>(options =>
        {
            // 默认 RootPath "app" → 应用服务路由为 /api/app/*（如 ChildProfileAppService → /api/app/child-profile）。
            options.ConventionalControllers.Create(typeof(HomeworkApplicationModule).Assembly);
        });
    }

    private void ConfigureSwagger(IServiceCollection services)
    {
        services.AddAbpSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo { Title = "Homework API", Version = "v1" });
            options.DocInclusionPredicate((docName, description) => true);
            options.CustomSchemaIds(type => type.FullName);
        });
    }

    private void ConfigureCors(ServiceConfigurationContext context, IConfiguration configuration)
    {
        context.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(builder =>
            {
                builder
                    .WithOrigins(
                        configuration["App:CorsOrigins"]?
                            .Split(",", StringSplitOptions.RemoveEmptyEntries)
                            .Select(o => o.RemovePostFix("/"))
                            .ToArray() ?? Array.Empty<string>()
                    )
                    .WithAbpExposedHeaders()
                    .SetIsOriginAllowedToAllowWildcardSubdomains()
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });
    }

    public override void OnApplicationInitialization(ApplicationInitializationContext context)
    {
        var app = context.GetApplicationBuilder();
        var env = context.GetEnvironment();

        // 必须是第一个中间件：反代终止 TLS 后据 X-Forwarded-Proto/-For 还原 scheme 与客户端 IP。
        app.UseForwardedHeaders();

        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }

        app.UseAbpRequestLocalization();

        if (!env.IsDevelopment())
        {
            app.UseErrorPage();
        }

        app.UseCorrelationId();
        // UseRouting 必须在 MapAbpStaticAssets 之前：后者是 .NET 9+ 基于 endpoint 的静态资源映射，
        // 顺序反了会导致 controller endpoint 匹配不到 → 每个 /api/* 都 404（对标 port-shield 踩坑注释）。
        app.UseRouting();
        app.MapAbpStaticAssets();
        app.UseCors();
        app.UseAuthentication();
        app.UseAbpOpenIddictValidation();

        if (MultiTenancyConsts.IsEnabled)
        {
            app.UseMultiTenancy();
        }

        app.UseUnitOfWork();
        app.UseDynamicClaims();
        app.UseAuthorization();

        app.UseSwagger();
        app.UseAbpSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "Homework API");
        });

        app.UseAuditing();
        app.UseAbpSerilogEnrichers();
        app.UseConfiguredEndpoints(endpoints =>
        {
            // 把 CatalogBlobContainer 的资产按 object key 通过 HTTP 提供，让 AssetUrlResolver 生成的
            // {AssetCdnBaseUrl}/{key} 能解析。同域名部署时设 AssetCdnBaseUrl=https://域名/blob 即可出图；
            // 若改用 OSS/CDN，把 AssetCdnBaseUrl 指过去、这端点闲置即可。
            // AllowAnonymous：资产设计即「公有读」，<img>/<video> 不带 bearer。响应带 max-age，Cloudflare 边缘会缓存。
            endpoints.MapGet("/blob/{**key}", async (
                string key,
                IBlobContainer<CatalogBlobContainer> blob,
                HttpContext http) =>
            {
                var bytes = await blob.GetAllBytesOrNullAsync(key);
                if (bytes == null)
                {
                    http.Response.StatusCode = StatusCodes.Status404NotFound;
                    return;
                }

                http.Response.ContentType = BlobContentType(key);
                http.Response.Headers.CacheControl = "public, max-age=3600";
                await http.Response.Body.WriteAsync(bytes);
            }).WithMetadata(new AllowAnonymousAttribute());
        });
    }

    public override async Task OnPostApplicationInitializationAsync(ApplicationInitializationContext context)
    {
        // Host 启动后种入初始宠物物种(+美术) + demo 旅程。由 Seed:PlayDemo 开关控制（默认关，幂等）。
        using var scope = context.ServiceProvider.CreateScope();
        await scope.ServiceProvider.GetRequiredService<PlayDemoSeeder>().SeedAsync();
    }

    private static string BlobContentType(string key) =>
        Path.GetExtension(key).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            _ => "application/octet-stream",
        };
}
