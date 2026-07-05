using System;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi;
using OpenIddict.Validation.AspNetCore;
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
    typeof(AbpSwashbuckleModule)
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

        ConfigureAuthentication(context);
        ConfigureUrls(configuration);
        ConfigureAutoApiControllers();
        ConfigureSwagger(context.Services);
        ConfigureCors(context, configuration);

        Configure<Microsoft.AspNetCore.Builder.RequestLocalizationOptions>(options =>
        {
            options.SetDefaultCulture("zh-Hans");
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
        app.UseConfiguredEndpoints();
    }
}
