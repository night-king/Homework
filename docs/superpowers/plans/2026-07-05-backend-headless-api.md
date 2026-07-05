# Backend Headless API (子项目 1) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用无界面的 `Homework.HttpApi.Host`（REST API + OpenIddict `/connect/token` + Swagger + CORS）替换 Razor MVC 宿主 `Homework.Web`，原样复用已测的 Phase 1–4 各层，并删除 `Homework.Web`。

**Architecture:** 新建 `src/Homework.HttpApi.Host`，架构对标 `D:\WorkSpaces\lehmansoft\port-shield` 的 `HttpApi.Host`——**一个宿主同时托管业务 API 和 OpenIddict token 端点**（token 端点来自 `AbpAccountWebOpenIddictModule`，它捆绑的 ABP 自带 Account Razor 页保留但闲置），无任何自建 Razor UI。认证走 OpenIddict 密码流(ROPC)：前端 `POST /connect/token` 拿 JWT，API 校验 Bearer。`Domain / Application / HttpApi / EntityFrameworkCore / DbMigrator` 及**全部测试原样不动**。

**Tech Stack:** ABP 10.5 · .NET 10 · PostgreSQL/Npgsql · OpenIddict · Swashbuckle · 现有 xUnit/Shouldly 测试（SQLite in-memory）· curl 冒烟。

**Spec:** `docs/superpowers/specs/2026-07-04-backend-headless-api-design.md`

---

## Context & invariants（零上下文实现者必读）

- **直接提交到 `main`**：本仓库是单人项目，所有 Phase 1–4 都直接落 `main`，不开 feature 分支/worktree。每个 Task 末尾 `git commit`；本计划**不 push**（用户会自己决定何时 push）。
- **必须在各自项目目录下运行** `dotnet run`：`DbMigrator` 和宿主都靠**当前工作目录**读 `appsettings.json`。务必 `cd src/<Proj>` 再 `dotnet run`，否则读不到配置、连不上库。
- **测试不需要数据库**：`test/Homework.Domain.Tests`、`test/Homework.EntityFrameworkCore.Tests`、`test/Homework.Application.Tests` 全是 SQLite in-memory。一次只测一个项目：`dotnet test test/<Proj>/<Proj>.csproj`（一条命令传两个 `.csproj` 会 MSB1008 失败）。
- **本地 PostgreSQL**：`localhost:5433`，`postgres`/`postgres`，库 `Homework`。冒烟需要真库（`dotnet run` 起 `DbMigrator` 建库+播种）。
- **dev 复用端口 `https://localhost:44394`**：新宿主沿用旧 `Homework.Web` 的 dev URL——这样 `DbMigrator` 的 `RootUrl`、`ConsoleTestApp` 的 `BaseUrl/Authority`（都指向 44394）无需改动。**dev 必须 HTTPS**：OpenIddict 对 `/connect/token` 在非 HTTPS 下抛 `ID2083` 拒绝。
- **demo 家庭**（`ChildrenDataSeedContributor` 已播种）：家长 `demo` / `1q2w3E*`（demo@homework.today），名下有「哥哥」「弟弟」两个 `ChildProfile`。运营超管 `admin` / `1q2w3E*`。
- **账号归属**：应用服务受 `[Authorize(HomeworkPermissions.ParentAdmin)]` 保护 + `ChildProfileManager` 按当前家长过滤——换宿主后照旧生效，只是从「Cookie + Razor」变成「JWT Bearer + REST」。
- **drop 开发库用 Bash（不要用 PowerShell）**：PS 5.1 会吞掉 `"Homework"` 外层双引号。若需重建库：
  ```bash
  PGPASSWORD=postgres "/c/Program Files/PostgreSQL/17/bin/psql.exe" -h localhost -p 5433 -U postgres -d postgres -c 'DROP DATABASE IF EXISTS "Homework" WITH (FORCE);'
  ```

---

## File structure

**新建**（`src/Homework.HttpApi.Host/`）：
- `Homework.HttpApi.Host.csproj` — Web SDK 宿主工程；引 `Application`/`HttpApi`/`EntityFrameworkCore` + Autofac/Swashbuckle/Serilog/Account.Web.OpenIddict。
- `Program.cs` — Serilog 引导 + `AddApplicationAsync<HomeworkHttpApiHostModule>()`。
- `HomeworkHttpApiHostModule.cs` — 宿主 ABP 模块：OpenIddict validation、Bearer 转发、Auto API controllers、Swagger、CORS、本地化 + headless 必配（CheckLibs/antiforgery）。
- `appsettings.json` / `appsettings.Development.json` — 连接串、`App:SelfUrl`、`App:CorsOrigins`、加密口令。
- `Properties/launchSettings.json` — dev `https://localhost:44394`。

**修改**：
- `src/Homework.Domain/OpenIddict/OpenIddictDataSeedContributor.cs` — 换成只建 `Homework_App` 公共密码客户端。
- `src/Homework.DbMigrator/appsettings.json` — `OpenIddict:Applications` 改为 `Homework_App`。
- `Homework.slnx` — 加入新宿主工程；删除 `Homework.Web`、`Homework.Web.Tests`。

**删除**：
- `src/Homework.Web/`（整目录）
- `test/Homework.Web.Tests/`（整目录）

**保留不动**：`Domain(.Shared)`、`Application(.Contracts)`、`HttpApi(.Client)`、`EntityFrameworkCore`、`DbMigrator`、`test/Homework.{Domain,EntityFrameworkCore,Application}.Tests`、`test/Homework.TestBase`、`test/Homework.HttpApi.Client.ConsoleTestApp`。

---

## Chunk 1: OpenIddict 密码流客户端（种子 + 配置）

把 OpenIddict 种子从「`Homework_Web` 机密客户端（授权码/隐式，给已删的 Razor 宿主）+ `Homework_Swagger`」换成**单个 `Homework_App` 公共客户端**（`password` + `refresh_token` + `offline_access`），供 React/ConsoleTestApp 用密码流换 JWT。

### Task 1.1: 重写 `CreateApplicationsAsync` → 只建 `Homework_App`

**Files:**
- Modify: `src/Homework.Domain/OpenIddict/OpenIddictDataSeedContributor.cs`（替换 `CreateApplicationsAsync` 方法体，当前约 69–129 行；`using` 已含 `OpenIddict.Abstractions`）

- [ ] **Step 1: 替换 `CreateApplicationsAsync` 方法**

把整个 `private async Task CreateApplicationsAsync() { ... }`（含 `//Web Client` 与 `// Swagger Client` 两段）替换为：

```csharp
private async Task CreateApplicationsAsync()
{
    var commonScopes = new List<string> {
        OpenIddictConstants.Permissions.Scopes.Address,
        OpenIddictConstants.Permissions.Scopes.Email,
        OpenIddictConstants.Permissions.Scopes.Phone,
        OpenIddictConstants.Permissions.Scopes.Profile,
        OpenIddictConstants.Permissions.Scopes.Roles,
        "Homework"
    };

    var configurationSection = _configuration.GetSection("OpenIddict:Applications");

    // Homework_App —— SPA（React 家长端/孩子端）与 ConsoleTestApp 用的公共密码流(ROPC)客户端。
    // 公共客户端（无 secret）；password 换 access_token，refresh_token + offline_access 换刷新令牌。
    var appClientId = configurationSection["Homework_App:ClientId"];
    if (!appClientId.IsNullOrWhiteSpace())
    {
        await CreateApplicationAsync(
            name: appClientId!,
            type: OpenIddictConstants.ClientTypes.Public,
            consentType: OpenIddictConstants.ConsentTypes.Implicit,
            displayName: "Homework App (SPA)",
            secret: null,
            grantTypes: new List<string>
            {
                OpenIddictConstants.GrantTypes.Password,
                OpenIddictConstants.GrantTypes.RefreshToken
            },
            scopes: new List<string>(commonScopes) { OpenIddictConstants.Scopes.OfflineAccess }
        );
    }
}
```

> 说明：`CreateApplicationAsync` 辅助方法（约 131 行起）**不改**——它对 `Password`/`RefreshToken` grant 会自动加 Token/Revocation/Introspection 端点权限与对应 grant 权限；`offline_access` 走 `scp:offline_access`。删掉 `Homework_Web`（机密授权码客户端，headless 不需要）与 `Homework_Swagger`（下面用不带 OAuth 的普通 Swagger，无需 swagger 客户端）。

- [ ] **Step 2: 编译 Domain 确认无语法错误**

Run: `dotnet build src/Homework.Domain/Homework.Domain.csproj`
Expected: `Build succeeded`（0 error）。

- [ ] **Step 3: 提交**

```bash
git add src/Homework.Domain/OpenIddict/OpenIddictDataSeedContributor.cs
git commit -m "feat(auth): seed Homework_App public password client; drop Homework_Web/Swagger clients"
```

### Task 1.2: 更新 `DbMigrator` 的 OpenIddict 配置

**Files:**
- Modify: `src/Homework.DbMigrator/appsettings.json`

- [ ] **Step 1: 把 `OpenIddict:Applications` 改为只含 `Homework_App`**

将文件内容替换为：

```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5433;Database=Homework;Username=postgres;Password=postgres;"
  },
  "OpenIddict": {
    "Applications": {
      "Homework_App": {
        "ClientId": "Homework_App"
      }
    }
  }
}
```

> `Homework_App` 是公共客户端，无 `ClientSecret`、无需 `RootUrl`（密码流不用重定向）。种子代码靠 `Homework_App:ClientId` 这个键判断是否建该客户端。

- [ ] **Step 2: 重新播种（建库/更新客户端）**

Run:
```bash
cd src/Homework.DbMigrator
dotnet run
```
Expected: 进程正常退出、日志出现类似 `Successfully completed ... database migrations.`（无异常）。

- [ ] **Step 3: 用 psql 确认 `Homework_App` 已入库、是 Public 客户端**

Run（Bash，注意引号）:
```bash
PGPASSWORD=postgres "/c/Program Files/PostgreSQL/17/bin/psql.exe" -h localhost -p 5433 -U postgres -d Homework \
  -c "SELECT \"ClientId\", \"ClientType\" FROM \"OpenIddictApplications\" WHERE \"ClientId\"='Homework_App';"
```
Expected: 一行 `Homework_App | public`。

- [ ] **Step 4: 清掉已有开发库里遗留的旧客户端行（`Homework_Web`/`Homework_Swagger`）**

> 重新播种只会**新增** `Homework_App`，不会删旧行。若 `Homework` 库先前已被旧种子建过，`Homework_Web`（机密、secret `1q2w3e*`）与 `Homework_Swagger` 仍会残留——spec 要退役的机密客户端还活着。手动删除（dev；全新/生产库首次播种没有这些行，本步是幂等空操作）：

Run（Bash）:
```bash
PGPASSWORD=postgres "/c/Program Files/PostgreSQL/17/bin/psql.exe" -h localhost -p 5433 -U postgres -d Homework \
  -c "DELETE FROM \"OpenIddictApplications\" WHERE \"ClientId\" IN ('Homework_Web','Homework_Swagger');"
PGPASSWORD=postgres "/c/Program Files/PostgreSQL/17/bin/psql.exe" -h localhost -p 5433 -U postgres -d Homework \
  -c "SELECT count(*) FROM \"OpenIddictApplications\" WHERE \"ClientId\" IN ('Homework_Web','Homework_Swagger');"
```
Expected: 第二条 `count` 为 `0`。

- [ ] **Step 5: 提交**

```bash
git add src/Homework.DbMigrator/appsettings.json
git commit -m "chore(dbmigrator): OpenIddict:Applications -> Homework_App only"
```

---

## Chunk 2: `Homework.HttpApi.Host` 宿主工程

新建无界面宿主。模块内容以现有 `src/Homework.Web/HomeworkWebModule.cs` 为蓝本**去掉全部 UI**（LeptonX 主题、菜单、bundles、虚拟文件系统、RazorPages 授权、Web 层 Mapperly），**保留** token 端点与 API 相关配置，**新增** CORS + headless 两必配。骨架对标 port-shield `PortShieldHttpApiHostModule`。

> **实现者注意**：以下代码里的 `AbpMvcLibsOptions.CheckLibs`、`AbpAntiForgeryOptions.AutoValidateFilter`、CORS 辅助方法、`OnApplicationInitialization` 中间件顺序，若与 `D:\WorkSpaces\lehmansoft\port-shield\backend` 里 `PortShieldHttpApiHostModule.cs` 有出入，**以 port-shield 为准**（本项目就是照抄其 headless 骨架）。

### Task 2.1: 新建宿主 `.csproj`

**Files:**
- Create: `src/Homework.HttpApi.Host/Homework.HttpApi.Host.csproj`

- [ ] **Step 1: 写 csproj**

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <Import Project="..\..\common.props" />

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <RootNamespace>Homework</RootNamespace>
    <PreserveCompilationReferences>true</PreserveCompilationReferences>
    <UserSecretsId>Homework-4681b4fd-151f-4221-84a4-929d86723e4c</UserSecretsId>
  </PropertyGroup>

  <ItemGroup>
    <Compile Remove="Logs\**" />
    <Content Remove="Logs\**" />
    <EmbeddedResource Remove="Logs\**" />
    <None Remove="Logs\**" />
  </ItemGroup>

  <ItemGroup Condition="Exists('./openiddict.pfx')">
    <None Remove="openiddict.pfx" />
    <EmbeddedResource Include="openiddict.pfx">
      <CopyToOutputDirectory>Always</CopyToOutputDirectory>
    </EmbeddedResource>
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Serilog.AspNetCore" Version="9.0.0" />
    <PackageReference Include="Serilog.Sinks.Async" Version="2.1.0" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Homework.Application\Homework.Application.csproj" />
    <ProjectReference Include="..\Homework.HttpApi\Homework.HttpApi.csproj" />
    <ProjectReference Include="..\Homework.EntityFrameworkCore\Homework.EntityFrameworkCore.csproj" />
    <PackageReference Include="Volo.Abp.Autofac" Version="10.5.0" />
    <PackageReference Include="Volo.Abp.Swashbuckle" Version="10.5.0" />
    <PackageReference Include="Volo.Abp.AspNetCore.Serilog" Version="10.5.0" />
    <PackageReference Include="Volo.Abp.Account.Web.OpenIddict" Version="10.5.0" />
    <PackageReference Include="Volo.Abp.AspNetCore.Mvc.UI.Theme.Shared" Version="10.5.0" />
  </ItemGroup>

</Project>
```

> 相比 `Homework.Web.csproj`：**去掉** `Volo.Abp.Identity.Web`、`Volo.Abp.TenantManagement.Web`、`Volo.Abp.SettingManagement.Web`、`Volo.Abp.AspNetCore.Mvc.UI.Theme.LeptonXLite`。**保留** `Volo.Abp.Account.Web.OpenIddict`（token 端点）+ 显式加 `Volo.Abp.AspNetCore.Mvc.UI.Theme.Shared`（对标 port-shield；确保 `AbpAspNetCoreMvcUiThemeSharedModule` 类型可解析、版本对齐——原本经 TenantManagement.Web 传递，现已去掉该模块）。

### Task 2.2: 写 `appsettings.json` + `appsettings.Development.json`

**Files:**
- Create: `src/Homework.HttpApi.Host/appsettings.json`
- Create: `src/Homework.HttpApi.Host/appsettings.Development.json`

- [ ] **Step 1: `appsettings.json`**

```json
{
  "App": {
    "SelfUrl": "https://localhost:44394",
    "CorsOrigins": "https://localhost:5173,http://localhost:5173"
  },
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5433;Database=Homework;Username=postgres;Password=postgres;"
  },
  "StringEncryption": {
    "DefaultPassPhrase": "R1urcBlDHdmRjnNr"
  }
}
```

> `CorsOrigins` 逗号分隔；`5173` 是 Vite dev 默认端口（子项目 2 家长 React 端），后续子项目按需增删。`DefaultPassPhrase` 沿用 `Homework.Web` 的值，保证与既有加密数据一致。

- [ ] **Step 2: `appsettings.Development.json`**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### Task 2.3: 写 `Properties/launchSettings.json`

**Files:**
- Create: `src/Homework.HttpApi.Host/Properties/launchSettings.json`

- [ ] **Step 1: 写 launchSettings（dev HTTPS 44394，浏览器直开 swagger）**

```json
{
  "iisSettings": {
    "windowsAuthentication": false,
    "anonymousAuthentication": true,
    "iisExpress": {
      "applicationUrl": "https://localhost:44394/",
      "sslPort": 44394
    }
  },
  "profiles": {
    "Homework.HttpApi.Host": {
      "commandName": "Project",
      "launchBrowser": true,
      "launchUrl": "swagger",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      },
      "applicationUrl": "https://localhost:44394/"
    }
  }
}
```

### Task 2.4: 写 `Program.cs`

**Files:**
- Create: `src/Homework.HttpApi.Host/Program.cs`

- [ ] **Step 1: 写 Program（照搬 `Homework.Web/Program.cs`，仅换模块类型与日志文案）**

```csharp
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;

namespace Homework;

public class Program
{
    public async static Task<int> Main(string[] args)
    {
        Log.Logger = new LoggerConfiguration()
#if DEBUG
            .MinimumLevel.Debug()
#else
            .MinimumLevel.Information()
#endif
            .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .WriteTo.Async(c => c.File("Logs/logs.txt"))
            .WriteTo.Async(c => c.Console())
            .CreateLogger();

        try
        {
            Log.Information("Starting Homework.HttpApi.Host.");
            var builder = WebApplication.CreateBuilder(args);
            builder.Host.AddAppSettingsSecretsJson()
                .UseAutofac()
                .UseSerilog();
            await builder.AddApplicationAsync<HomeworkHttpApiHostModule>();
            var app = builder.Build();
            await app.InitializeApplicationAsync();
            await app.RunAsync();
            return 0;
        }
        catch (Exception ex)
        {
            if (ex is HostAbortedException)
            {
                throw;
            }

            Log.Fatal(ex, "Host terminated unexpectedly!");
            return 1;
        }
        finally
        {
            Log.CloseAndFlush();
        }
    }
}
```

### Task 2.5: 写 `HomeworkHttpApiHostModule.cs`

**Files:**
- Create: `src/Homework.HttpApi.Host/HomeworkHttpApiHostModule.cs`

- [ ] **Step 1: 写宿主模块**

```csharp
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
```

> 相比 `HomeworkWebModule`：**去掉** `ConfigureBundles`、`ConfigureVirtualFileSystem`、`ConfigureNavigationServices`（菜单）、RazorPages `AuthorizeFolder`、`AddMapperlyObjectMapper<HomeworkWebModule>`、`AbpMvcDataAnnotationsLocalizationOptions` 预配置、LeptonX/Identity/Setting/Tenant Web 模块依赖。**保留** OpenIddict validation、生产证书分支、Bearer 转发、动态声明、`ConfigureUrls`(MVC RootUrl)、`if (MultiTenancyConsts.IsEnabled) UseMultiTenancy()` 块、Auto API controllers、Swagger、zh-Hans 本地化。**新增** `CheckLibs=false`、antiforgery 关闭、CORS。
>
> **两个易踩的点**：
> 1. **多租户块必须保留**：`MultiTenancyConsts.IsEnabled` 当前为 `true`（现网 `Homework.Web` 就在跑 `UseMultiTenancy()`），且 `AbpAspNetCoreMultiTenancyModule` 经 `AbpAccountWebOpenIddictModule → Volo.Abp.OpenIddict.AspNetCore` **传递依赖**——所以 `app.UseMultiTenancy()` 照常编译、模块照常加载，无需在 csproj/`[DependsOn]` 显式加。删掉它属于「无理由改行为」。（单一全局实例语义由「API 请求不解析租户 → 落到 host 租户」自然满足，与保留该中间件不冲突。）
> 2. **中间件顺序**对标 port-shield：`UseRouting()` 在 `MapAbpStaticAssets()` **之前**，否则纯 API host 的 `/api/*` 全 404。
> 3. `.WithAbpExposedHeaders()` 需要 `using Microsoft.AspNetCore.Cors;`（已在 using 列表）。
>
> 去掉 `AbpMvcDataAnnotationsLocalizationOptions` 预配置（port-shield 亦无）**仅**影响 API 响应里模型校验消息的本地化（`RequestLocalization` zh-Hans 不受影响）；如需再补。

### Task 2.6: 把新宿主加入 `Homework.slnx` 并整体编译

**Files:**
- Modify: `Homework.slnx`（在 `/src/` 文件夹里加一行）

- [ ] **Step 1: 在 slnx 的 `/src/` 内加入宿主工程**

在 `<Project Path="src/Homework.HttpApi/Homework.HttpApi.csproj" />` 之后加：
```xml
    <Project Path="src/Homework.HttpApi.Host/Homework.HttpApi.Host.csproj" />
```

- [ ] **Step 2: 整体编译（Web 与新宿主此时共存，均应编译通过）**

Run: `dotnet build Homework.slnx`
Expected: `Build succeeded`，0 error（可能有既有 warning，忽略）。

- [ ] **Step 3: 提交**

```bash
git add src/Homework.HttpApi.Host Homework.slnx
git commit -m "feat(host): add headless Homework.HttpApi.Host (API + /connect/token + swagger + cors)"
```

### Task 2.7: 起服冒烟——boot / swagger / 密码流 token / Bearer / 401

> 需要本地 PostgreSQL 在跑，且 Chunk 1 已 `DbMigrator` 播种（有 demo 家庭 + `Homework_App` 客户端）。

- [ ] **Step 1: 起宿主**

Run（**必须在项目目录**）:
```bash
cd src/Homework.HttpApi.Host
dotnet run
```
Expected: 日志出现 `Starting Homework.HttpApi.Host.` 且无致命异常，最终监听 `https://localhost:44394`。**保持运行**，另开一个终端做下面的 curl。

- [ ] **Step 2: Swagger 可达并列出应用 API**

Run:
```bash
curl -k -s https://localhost:44394/swagger/v1/swagger.json | grep -o "/api/app/[a-z-]*" | sort -u
```
Expected: 输出包含 `/api/app/child-profile`（以及其它家长后台服务路由，如 `weekly-task-template`、`daily-task`、`family-goal`）。

- [ ] **Step 3: 用 demo 家长走密码流拿 token，并存入 `$TOKEN`**

Run（需要 `jq`；Git-Bash 若无 jq，见下方 fallback）:
```bash
TOKEN=$(curl -k -s -X POST https://localhost:44394/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=Homework_App" \
  -d "username=demo" \
  -d "password=1q2w3E*" \
  -d "scope=Homework offline_access" | jq -r .access_token)
echo "${TOKEN:0:20}..."
```
Expected: 打印 token 前 20 字符（非空、非 `null`）。响应 JSON 本应含 `access_token`/`token_type:Bearer`/`refresh_token`（因 `offline_access`）。
- **无 jq 的 fallback**：先不带 `| jq` 跑一遍看到 JSON，手动复制 `access_token` 值：`TOKEN=<粘贴>`。
- **若返回 `ID2083`/连接被拒**：确认用的是 `https://`（非 http）。

- [ ] **Step 4: 带 token 调受保护 API 通、不带 token 401**

Run:
```bash
# 带 token → 200 + demo 的哥哥/弟弟
curl -k -s -H "Authorization: Bearer $TOKEN" https://localhost:44394/api/app/child-profile
# 不带 token → 401
curl -k -s -o /dev/null -w "%{http_code}\n" https://localhost:44394/api/app/child-profile
```
Expected: 第一条返回含「哥哥」「弟弟」的 JSON（`items` 数组两条，只属于 demo）；第二条打印 `401`。

- [ ] **Step 5: 自助注册冒烟（闭合 spec 的「注册」项 + 验证 `IsSelfRegistrationEnabled`）**

Run:
```bash
curl -k -s -o /dev/null -w "%{http_code}\n" -X POST https://localhost:44394/api/account/register \
  -H "Content-Type: application/json" \
  -d '{"userName":"smoketest","emailAddress":"smoketest@homework.today","password":"1q2w3E*","appName":"Homework_App"}'
```
Expected: 首次 `200`（建了一个新家长，得默认 `Parent` 角色 → `ParentAdmin`）。重复运行返回 `400`（用户名已存在）——同样证明端点通、注册确实落库。若返回注册被禁用相关错误，则需确认设置 `Abp.Account.IsSelfRegistrationEnabled = true`（ABP 默认 true）。

- [ ] **Step 6: 停服**（Ctrl-C 结束 `dotnet run`）。冒烟无需提交（未改文件）。

---

## Chunk 3: 退役 `Homework.Web`

新宿主验证通过后，删除旧 Razor 宿主及其测试工程，确保解决方案干净、构建与全部测试绿。

### Task 3.1: 删除 `Homework.Web` 与 `Homework.Web.Tests`，从 slnx 移除

**Files:**
- Delete: `src/Homework.Web/`（整目录）
- Delete: `test/Homework.Web.Tests/`（整目录）
- Modify: `Homework.slnx`（移除两个工程行）

- [ ] **Step 1: 从 `Homework.slnx` 删除这两行**

删除：
```xml
    <Project Path="src/Homework.Web/Homework.Web.csproj" />
```
和：
```xml
    <Project Path="test/Homework.Web.Tests/Homework.Web.Tests.csproj" />
```

- [ ] **Step 2: 删除目录**

Run（Bash）:
```bash
git rm -r src/Homework.Web test/Homework.Web.Tests
```
Expected: git 暂存两个目录的删除。

> `test/Homework.Web.Tests` 的 `.csproj` 是**唯一** `ProjectReference` 了 `Homework.Web` 的工程；不一并删，`dotnet build Homework.slnx` 会因缺少被引用工程而失败。`Homework.Application.Tests`（只依赖 Application/Domain）与 `ConsoleTestApp`（依赖 `HttpApi.Client`）**不受影响**。

- [ ] **Step 3: 整体编译确认无残留引用**

Run: `dotnet build Homework.slnx`
Expected: `Build succeeded`，0 error（不再有 `Homework.Web`）。

- [ ] **Step 4: 跑全部现有测试确认全绿**

Run（逐工程；SQLite in-memory，无需库）:
```bash
dotnet test test/Homework.Domain.Tests/Homework.Domain.Tests.csproj
dotnet test test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj
dotnet test test/Homework.Application.Tests/Homework.Application.Tests.csproj
```
Expected: 三个工程 `Passed!`，Failed = 0。

- [ ] **Step 5: 提交**

```bash
git add Homework.slnx
git commit -m "chore: retire Homework.Web + Homework.Web.Tests (headless API is the sole host)"
```

### Task 3.2: 收尾——ConsoleTestApp 端到端冒烟 + 文档

**Files:**
- Modify: `DEPLOY.md`（更新本地运行说明指向新宿主）

- [ ] **Step 1:（可选但推荐）用 ConsoleTestApp 做端到端密码流冒烟**

`test/Homework.HttpApi.Client.ConsoleTestApp/appsettings.json` 已配 `BaseUrl/Authority = https://localhost:44394`、`ClientId = Homework_App`、`admin`/`1q2w3E*`、`scope = Homework`——复用 44394 端口后**无需改动**。先起宿主（`cd src/Homework.HttpApi.Host && dotnet run`），另开终端：
```bash
cd test/Homework.HttpApi.Client.ConsoleTestApp
dotnet run
```
Expected: 进程用密码流以 `admin` 拿到 token 并通过 `HttpApi.Client` 动态代理调通 API。`admin` 已被 `ParentPermissionDataSeedContributor` 授予 `ParentAdmin`，故 `child-profile` 返回 **200 + 空列表**（admin 名下无孩子）——证明「登录→Bearer→调 API」链路通。**若返回 403** 说明该授权回归了（需排查种子）。想直接看到哥哥/弟弟，可临时把该工程 `appsettings.json` 的 `UserName`/`UserPassword` 改为 `demo`/`1q2w3E*`（demo 有 `ParentAdmin` + 两个孩子）。
> 注：`Homework_App` 客户端在 Chunk 1 之前并不存在，所以这个 console 工具此前从未能认证成功——这是它的**首次**可用运行。

- [ ] **Step 2: 更新 `DEPLOY.md` 的「本地运行」段**

把「起服：`cd src/Homework.Web && dotnet run` → https://localhost:44394」改为：
```
3. 起 API 宿主：`cd src/Homework.HttpApi.Host && dotnet run` → https://localhost:44394（Swagger 在 /swagger）
   - 前端（家长端/孩子端，各自子项目）通过该 API 的 `/connect/token` 密码流登录、`/api/app/*` 调用。
   - 后端已 headless：无 Razor 页面；注册走 `POST /api/account/register`。
```
并把第 9 行附近对 `Homework.Web` 的引用一并改成 `Homework.HttpApi.Host`。

- [ ] **Step 3: 提交**

```bash
git add DEPLOY.md
git commit -m "docs(deploy): local-run points at Homework.HttpApi.Host; note headless API"
```

---

## Acceptance criteria（对齐 spec）

- [ ] `Homework.HttpApi.Host` 起得来，`/swagger` 列出应用服务 API。
- [ ] 密码流（`Homework_App` + demo 家长）能拿 token；带 token 调 `/api/app/child-profile` 返回 demo 的哥哥/弟弟且账号归属生效；无 token → 401。
- [ ] `Homework.Web` 与 `Homework.Web.Tests` 已从解决方案删除；`dotnet build Homework.slnx` 绿。
- [ ] `Homework.{Domain,EntityFrameworkCore,Application}.Tests` 全绿；`DbMigrator` 正常建库+种子（含 `Homework_App` 公共客户端）。
- [ ] 后端为纯 API：无我们自建/面向用户的 Razor UI（ABP 自带 Account 页作为 token 端点依赖保留但闲置）。

## Out of scope

官网（Astro）、家长前端（React console）、孩子游戏端（React）——各自子项目。部署（docker/k8s）——用户另有安排。上线安全加固（HTTPS 正式证书、注册限流/邮箱验证、同意服务端强制等）——`DEPLOY.md` 清单。
