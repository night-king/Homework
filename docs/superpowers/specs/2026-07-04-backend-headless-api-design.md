# 子项目 1：后端 Headless 化（前后端分离地基）· Design Spec

- **日期**：2026-07-04
- **状态**：设计已确认（brainstorming 通过）→ 待评审
- **背景**：产品转向**前后端分离**，架构模仿 `D:\WorkSpaces\lehmansoft\port-shield`（ABP **`HttpApi.Host`**（无界面 API）+ **Astro** 官网 + **React/Vite** 前端）。本 spec **只覆盖后端 headless 化**；官网、家长前端、孩子游戏端各自单独 spec。
- **前置**：Phase 1–4 完成（领域 / 应用 / 记分引擎 / 账号归属 / 家长自助注册，均有测试）。
- **Stack**：ABP 10.5 · .NET 10 · PostgreSQL/Npgsql · OpenIddict · Swagger。

---

## 架构转向（重要）

从 **ABP MVC 单体（Razor UI）** 转为**前后端分离**：后端做成**无界面 REST API**（对标 port-shield 的 `HttpApi.Host`——一个 host 同时托管 API + OpenIddict 认证服务，无独立 AuthServer），UI 全部交给独立前端（家长端 React、官网 Astro、孩子游戏端 React，后续子项目）。**现有 Razor UI（Phase 3 家长后台页 + Phase 4 注册覆盖页 + LeptonX 主题 + 菜单）退役并删除。**

## Goal

把宿主从 `Homework.Web`(MVC+Razor) 换成新的 **`Homework.HttpApi.Host`**（无界面 API + `/connect/token` + Swagger + CORS），**领域 / 应用 / 记分引擎 / 账号归属 / 全部测试原样复用**，为后续前端提供 API 地基。**删除 `Homework.Web`。**

## Locked decisions（brainstorming 结论）

1. **复用已测领域层，不重写**；只换宿主。
2. **认证 = OpenIddict 密码流（ROPC）**：登录 / 注册 UI **全由前端(React)承担**，POST `/connect/token` 拿 JWT，API 校验 Bearer。**不再有任何自建 / 家长后台 Razor UI**。
   - ⚠ 更正（评审）：**不是"零 ABP Razor"**——ABP 的 `/connect/token` 认证服务由 `AbpAccountWebOpenIddictModule` 提供，它**捆绑** ABP 自带的 Account 登录/注册 Razor 页 + 依赖 `Theme.Shared`。这些页**保留但闲置**（密码流拿 token 不渲染任何 UI，前端也不跳过去），不算"给家长用的 UI"。**绝不能为了"去 Razor"而排除该模块或 Theme.Shared——那会把 token 端点一起删掉 / 启动失败**（port-shield 的 headless host 就是包含它俩的）。
   - （ROPC 略过时但首方应用常用、ABP 原生支持；授权码+PKCE 需真用那个登录页，故不选。）
3. **删除 `Homework.Web`**（含家长后台页、注册覆盖页、主题、菜单、branding）。
4. host 与模块图**对标 port-shield 的 `PortShield.HttpApi.Host`**（实现时照抄其 `DependsOn` + `Program.cs` 架构，**去掉部署相关**）。
5. **部署（docker/k8s）不在本 spec**——用户另有安排。

---

## Architecture

### 新增 `src/Homework.HttpApi.Host`
- `Program.cs` + `HomeworkHttpApiHostModule`：`DependsOn` **对标 port-shield `PortShieldHttpApiHostModule`**（照抄架构、删部署）——含 `HomeworkHttpApiModule` + `HomeworkApplicationModule` + `HomeworkEntityFrameworkCoreModule` + `AbpAutofacModule` + **`AbpAccountWebOpenIddictModule`**（提供 `/connect/token` 认证服务；捆绑的 Account Razor 页保留但闲置）+ **`AbpAspNetCoreMvcUiThemeSharedModule`**（前者的依赖，必须留）+ `AbpSwashbuckleModule`(Swagger) + `AbpAspNetCoreSerilogModule` 等。**关键：不能为了"去 Razor"而排除 `AbpAccountWebOpenIddictModule` 或 `Theme.Shared`——会把 token 端点删掉或启动失败。** 不含的是我们自建的 `HomeworkWebModule`、家长后台/注册页、菜单、branding。
- 配置（多数迁自 `HomeworkWebModule`）：
  - **OpenIddict 认证服务**：托管 `/connect/token`（密码流）、发 JWT。
  - **Bearer 校验**：`ForwardIdentityAuthenticationForBearer(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)`（迁自 Web）。
  - **Auto API controllers**：`ConventionalControllers.Create(typeof(HomeworkApplicationModule).Assembly)`（迁自 Web）→ 应用服务全部暴露为 `/api/app/*`。
  - **CORS**：放行前端源（dev 如 `http://localhost:517x`，prod 可配；从 `appsettings` 读）。
  - **Swagger**：`/swagger`（联调 / 冒烟用）。现有 Web 用普通 `AddAbpSwaggerGen`（迁过来即可满足"列出 API"）；若想在 Swagger UI 里直接测受保护接口，可换 port-shield 的 `AddAbpSwaggerGenWithOAuth` + 一个 swagger 客户端（可选）。
  - **`AbpMvcLibsOptions.CheckLibs = false`**（评审补，**headless 必配、非部署**）：无界面 host 没有 `wwwroot/libs`，不关会导致**每个请求（含 `/connect/token`）500**。
  - **`AbpAntiForgeryOptions.AutoValidateFilter = _ => false`**（评审补，**必配**）：否则带 token 的 **POST/PUT/DELETE 一律 400**——会打到 `/api/account/register` 和所有写操作。
  - **本地化**：`RequestLocalization` 默认 `zh-Hans`（迁自 Web，供 API 错误/校验消息本地化）。
  - `appsettings.json`：连接串（同 `Homework.DbMigrator`）、`App:SelfUrl`、CORS origins、OpenIddict 证书（dev 用开发证书；prod 证书是 DEPLOY 事项）。
  - 可选 `/health` 健康检查。

### OpenIddict 密码流客户端
- 种子代码在 **`src/Homework.Domain/OpenIddict/OpenIddictDataSeedContributor.cs`**，配置在 **`src/Homework.DbMigrator/appsettings.json`** 的 `OpenIddict:Applications`（**不是** Web 的 appsettings）。新增一个**公共客户端** `Homework_App`（`GrantTypes.Password` + `RefreshToken`，**无 secret**）+ 授予 `password` grant 相关 permission。**对标 port-shield `OpenIddictDataSeedContributor` 的 `PortShield_App`**（Public/Password 客户端）。React 用它换 token。
- **删除陈旧的 `Homework_Web` 机密客户端**（评审补）：它是给已删的 Razor host 用的授权码/cookie 流客户端，headless 不再需要——从种子里移除，避免留下无用的机密客户端。
- ⚠ **dev 必须走 HTTPS**（评审补）：OpenIddict 对 `/connect/token` 在非 HTTPS 下会抛 **ID2083** 拒绝请求。`Homework.HttpApi.Host` dev 用 `https://localhost:44xxx`（`launchSettings` + dev 证书），CORS 与前端联调按 HTTPS 配。
- **自助注册配置核对**（评审补）：`/api/account/register` 依赖 ABP `Account` 设置——确认 `Abp.Account.IsSelfRegistrationEnabled = true`（现有种子/设置若已开则沿用），`Parent` 默认角色 + `ParentAdmin` 授权链照旧（`ChildrenDataSeedContributor` / `ParentPermissionDataSeedContributor` 不动）。

### 删除 `Homework.Web`
- 从 `Homework.slnx` 移除并删除项目目录（`Pages/ParentAdmin/*`、`Pages/Account/Register.*`、`Menus/*`、`HomeworkWebModule`、`HomeworkBrandingProvider`、`HomeworkWebMappers`、`wwwroot`/前端库 / 主题依赖）。
- **同时删除 `test/Homework.Web.Tests`（评审补）**：它 `ProjectReference` 了 `Homework.Web` 且在 `Homework.slnx` 注册——不删则 `dotnet build Homework.slnx` **失败**。连同从 `Homework.slnx` 移除。（`Homework.Application.Tests` 只依赖 Application/Domain.Tests，**保留**。）
- 检查并清理对 Web 的引用（`Homework.slnx`、CI 若有）；DbMigrator 现依赖 `Homework.Application`（Phase 4 加的）——**保留**。
- 把 Web 里仍需要的配置（auth / auto-api / localization）迁进 HttpApi.Host。

### 复用不动
`Domain(.Shared) / Application(.Contracts) / HttpApi / EntityFrameworkCore / DbMigrator` + 全部测试。应用服务的 `[Authorize(ParentAdmin)]`、`ChildProfileManager` 账号归属、记分引擎照旧——只是访问方式从"Razor 页面 + Cookie"变成"REST API + JWT Bearer"。

## Data flow — 前端登录到调 API
React 登录表单 → `POST /connect/token`（`grant_type=password` + username + password + `client_id`）→ 拿 `access_token`(JWT) → 存 → axios 每次带 `Authorization: Bearer <token>` 调 `/api/app/child-profile` 等 → API 校验 token + `ParentAdmin` 权限 + 账号归属（家长只见自己的娃）。**注册**：React 表单 → `POST /api/account/register`（ABP Account API）→ 建家长（`Parent` 默认角色 → 得 `ParentAdmin`）。同意勾选在 React 表单做（**服务端强制**留 DEPLOY 清单）。

## Testing
- 现有 `Homework.Domain.Tests` + `Homework.EntityFrameworkCore.Tests`：**不受影响，照跑全绿**。
- 新增 **HttpApi.Host 起服冒烟**（`@run` / `@verify`）：
  - `/swagger` 可达、列出家长后台 API。
  - 用 demo 家长（`demo`/`1q2w3E*`）走密码流 `POST /connect/token` 拿到 token。
  - 带 token `GET /api/app/child-profile` → 返回 demo 的哥哥/弟弟；**不带 token → 401**。
- 删 Web 后确认 `dotnet build Homework.slnx` 绿、DbMigrator 仍能跑。

## Acceptance criteria
- `Homework.HttpApi.Host` 起得来，`/swagger` 列出应用服务 API。
- 密码流能拿 token；带 token 调受保护 API 通、账号归属生效；无 token 401。
- `Homework.Web` 已从解决方案删除；`dotnet build Homework.slnx` 绿；Domain/EFCore 测试全绿；DbMigrator 正常建库+种子。
- 后端此后是纯 API、无 Razor UI。

## Out of scope（本子项目不做）
官网（Astro）、家长前端（React console）、孩子游戏端（React）——各自子项目。部署（docker/k8s）——用户另有安排。服务端同意强制 / 上线安全加固——`DEPLOY.md`。

## Open items to confirm at implementation
- 对标 port-shield `PortShield.HttpApi.Host` 的**精确模块 `DependsOn` 清单 + `Program.cs`**（照抄架构、去部署）；确认是否需要 Serilog/健康检查等。
- OpenIddict 密码流客户端的确切 scope / permissions 种子（对标 port-shield 的 `OpenIddictDataSeedContributor`）。
- CORS 允许的前端源（dev 端口）+ 配置化方式。
- HttpApi.Host `appsettings.json`（连接串 / SelfUrl / 证书）与 DbMigrator 对齐；dev 证书生成。
- 删 `Homework.Web` 后，确认没有别处（测试 / CI / DbMigrator）残留引用。
