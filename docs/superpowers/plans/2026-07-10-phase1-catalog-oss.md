# Phase 1 — 图鉴 + OSS 基座 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让平台管理员能在后台维护全局的宠物 / 奖励道具 / 勋章图鉴，资产（图片、进化视频）存 Aliyun OSS 并经 CDN URL 对外，为后续「旅程 + 成长」打底。

**Architecture:** 在既有 ABP 分层里新增 `Homework.Catalog` 领域：三套全局聚合（无 `ParentId`）+ 管理端 App Service（CRUD + 文件上传）+ 只读列表端点。Blob 走 `IBlobContainer` 抽象——生产用 `Volo.Abp.BlobStoring.Aliyun`，测试用 `Volo.Abp.BlobStoring.FileSystem` 临时目录。实体只存 OSS object key，DTO 经 `IAssetUrlResolver` 输出稳定 CDN URL。

**Tech Stack:** ABP 10.5.0 / .NET 10 / EF Core (PostgreSQL 生产, SQLite in-memory 测试) / Mapperly / Aliyun OSS / xUnit + Shouldly。

**Spec:** `docs/superpowers/specs/2026-07-10-child-journey-pet-backend-design.md`（本计划覆盖其 §11 第一期）。

## Global Constraints

以下为项目级约定，每个任务隐式适用：

- 所有 ABP 新包固定 `Version="10.5.0"`；目标框架 `net10.0`；`<Nullable>enable</Nullable>`。
- 聚合根继承 `Volo.Abp.Domain.Entities.Auditing.FullAuditedAggregateRoot<Guid>`；属性用 `private set`；字符串校验用 `Check.NotNullOrWhiteSpace(value, nameof(value), maxLength: N)`；`Set*` 方法返回 `this` 走 fluent 风格；非法入参抛 `ArgumentException`，业务不变量违背抛 `Volo.Abp.BusinessException(errorCode)`。
- 表名 `HomeworkConsts.DbTablePrefix + "<Name>"`（前缀 `"App"`），schema `HomeworkConsts.DbSchema`（`null`）；每个实体配置调 `b.ConfigureByConvention()`。
- 映射用 Mapperly：`[Mapper] public partial class XxxMapper : MapperBase<TEntity, TDto>`，写在 `backend/src/Homework.Application/HomeworkApplicationMappers.cs`。DTO 中需 resolver 计算的 URL 字段用 `[MapperIgnoreTarget(nameof(...))]` 忽略，由 App Service 手动赋值。
- App Service 继承 `HomeworkAppService`，注入 `IRepository<TEntity, Guid>`；用 `ObjectMapper.Map`、`GuidGenerator.Create()`、`CurrentUser`。自动 API 路由为 `/api/app/<kebab>`。
- 权限常量写在 `backend/src/Homework.Application.Contracts/Permissions/HomeworkPermissions.cs`，在 `HomeworkPermissionDefinitionProvider` 注册，文案加到 `en.json` + `zh-Hans.json`。
- 领域纯逻辑测试放 `backend/test/Homework.Domain.Tests`（普通 xUnit + Shouldly，无 ABP fixture）。DB 相关测试放 `backend/test/Homework.EntityFrameworkCore.Tests`：类加 `[Collection(HomeworkTestConsts.CollectionDefinitionName)]`，继承 `HomeworkEntityFrameworkCoreTestBase`，用 `GetRequiredService<T>()`、`ICurrentPrincipalAccessor.Change(...)`、`WithUnitOfWorkAsync(...)`。测试库是 SQLite in-memory，schema 由模型 `CreateTables()` 生成——**新实体只要进了 `HomeworkDbContext.OnModelCreating` 就自动建表，测试无需迁移**。
- 生产迁移在 `backend` 目录执行：`dotnet ef migrations add <Name> --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore`（设计期工厂读 `Homework.DbMigrator/appsettings.json`）。
- 提交信息：conventional commits，中文主题；结尾加 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。分支已在 `feature/journey-pet-backend`。
- 命令统一从 `backend/` 目录运行（除非另注）。

---

## File Structure

新增/修改的文件与职责：

| 文件 | 职责 |
|---|---|
| `Homework.Application.Contracts/Catalog/IAssetUrlResolver.cs` | object key → CDN URL 抽象 |
| `Homework.Application/Catalog/AssetUrlResolver.cs` | 从 `App:AssetCdnBaseUrl` 拼 URL |
| `Homework.Domain/Catalog/CatalogBlobContainer.cs` | `[BlobContainerName("catalog")]` 容器标记 |
| `Homework.Domain/HomeworkDomainModule.cs` (改) | 依赖 `AbpBlobStoringModule` |
| `Homework.HttpApi.Host/HomeworkHttpApiHostModule.cs` (改) | 依赖 + 配置 `AbpBlobStoringAliyunModule` |
| `Homework.HttpApi.Host/appsettings.json` (改) | `Aliyun` / `App:AssetCdnBaseUrl` 配置键 |
| `Homework.EntityFrameworkCore.Tests` 模块 (改) | 依赖 + 配置 FileSystem blob provider |
| `Homework.Application.Contracts/Permissions/*` (改) | `Homework.Catalog.*` 权限 |
| `Homework.Application/Data/CatalogPermissionDataSeedContributor.cs` | 授权 admin 角色 |
| `Homework.Domain/Catalog/RewardItem.cs` | 奖励道具聚合 |
| `Homework.Domain/Catalog/Medal.cs` | 勋章聚合 |
| `Homework.Domain/Catalog/PetSpecies.cs` + `PetForm.cs` | 宠物聚合 + 5 形态子实体 |
| `Homework.EntityFrameworkCore/.../HomeworkDbContext.cs` (改) | DbSet + 实体配置 |
| `Homework.Application.Contracts/Catalog/**` | 各 DTO + App Service 接口 |
| `Homework.Application/Catalog/**` | 各 App Service 实现 |
| `Homework.Application/HomeworkApplicationMappers.cs` (改) | Mapperly 映射 |

---

## Task 1: Asset URL 解析器

纯逻辑：把存储的 object key 拼成对外 CDN URL。先做，后续所有图鉴 DTO 都用它。

**Files:**
- Create: `backend/src/Homework.Application.Contracts/Catalog/IAssetUrlResolver.cs`
- Create: `backend/src/Homework.Application/Catalog/AssetUrlResolver.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/AssetUrlResolver_Tests.cs`

**Interfaces:**
- Produces: `IAssetUrlResolver.ToUrl(string? objectKey) : string?` — 空 key 返回 null；否则 `{base}/{key}`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/AssetUrlResolver_Tests.cs`:

```csharp
using Homework.Catalog;
using Microsoft.Extensions.Configuration;
using Shouldly;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

public class AssetUrlResolver_Tests
{
    private static IAssetUrlResolver Build(string? baseUrl)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["App:AssetCdnBaseUrl"] = baseUrl })
            .Build();
        return new AssetUrlResolver(config);
    }

    [Fact]
    public void Joins_Base_And_Key()
    {
        Build("https://cdn.example.com/host/catalog")
            .ToUrl("rewards/abc.png")
            .ShouldBe("https://cdn.example.com/host/catalog/rewards/abc.png");
    }

    [Fact]
    public void Trims_Duplicate_Slashes()
    {
        Build("https://cdn.example.com/host/catalog/")
            .ToUrl("/rewards/abc.png")
            .ShouldBe("https://cdn.example.com/host/catalog/rewards/abc.png");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Null_Or_Empty_Key_Returns_Null(string? key)
    {
        Build("https://cdn.example.com").ToUrl(key).ShouldBeNull();
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~AssetUrlResolver_Tests`
Expected: 编译失败 / FAIL —— `IAssetUrlResolver`、`AssetUrlResolver` 不存在。

- [ ] **Step 3: 写接口**

Create `backend/src/Homework.Application.Contracts/Catalog/IAssetUrlResolver.cs`:

```csharp
namespace Homework.Catalog;

/// <summary>把存储的 OSS object key 解析为对外可访问的 CDN URL。</summary>
public interface IAssetUrlResolver
{
    string? ToUrl(string? objectKey);
}
```

- [ ] **Step 4: 写实现**

Create `backend/src/Homework.Application/Catalog/AssetUrlResolver.cs`:

```csharp
using Microsoft.Extensions.Configuration;
using Volo.Abp.DependencyInjection;

namespace Homework.Catalog;

public class AssetUrlResolver : IAssetUrlResolver, ITransientDependency
{
    private readonly string _baseUrl;

    public AssetUrlResolver(IConfiguration configuration)
    {
        _baseUrl = (configuration["App:AssetCdnBaseUrl"] ?? string.Empty).TrimEnd('/');
    }

    public string? ToUrl(string? objectKey)
    {
        return string.IsNullOrEmpty(objectKey)
            ? null
            : $"{_baseUrl}/{objectKey.TrimStart('/')}";
    }
}
```

- [ ] **Step 5: 运行确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~AssetUrlResolver_Tests`
Expected: PASS（3 个用例）。

- [ ] **Step 6: 提交**

```bash
git add backend/src/Homework.Application.Contracts/Catalog/IAssetUrlResolver.cs backend/src/Homework.Application/Catalog/AssetUrlResolver.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/AssetUrlResolver_Tests.cs
git commit -m "feat(catalog): 资产 CDN URL 解析器 IAssetUrlResolver

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Blob 存储接线（Aliyun 生产 + FileSystem 测试 + catalog 容器）

让 `IBlobContainer<CatalogBlobContainer>` 在生产走 OSS、在测试走临时目录，二者对 App Service 透明。

**Files:**
- Create: `backend/src/Homework.Domain/Catalog/CatalogBlobContainer.cs`
- Modify: `backend/src/Homework.Domain/Homework.Domain.csproj`
- Modify: `backend/src/Homework.Domain/HomeworkDomainModule.cs`
- Modify: `backend/src/Homework.HttpApi.Host/Homework.HttpApi.Host.csproj`
- Modify: `backend/src/Homework.HttpApi.Host/HomeworkHttpApiHostModule.cs`
- Modify: `backend/src/Homework.HttpApi.Host/appsettings.json`
- Modify: `backend/test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj`
- Modify: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/HomeworkEntityFrameworkCoreTestModule.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/CatalogBlob_Tests.cs`

**Interfaces:**
- Produces: `CatalogBlobContainer`（`[BlobContainerName("catalog")]` 标记类）；DI 中可解析 `IBlobContainer<CatalogBlobContainer>`，`SaveAsync(name, stream, overrideExisting)` / `GetAsync(name)` 可用。

- [ ] **Step 1: 写失败测试（blob 往返）**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/CatalogBlob_Tests.cs`:

```csharp
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Homework.Catalog;
using Shouldly;
using Volo.Abp.BlobStoring;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class CatalogBlob_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IBlobContainer<CatalogBlobContainer> _blob;

    public CatalogBlob_Tests()
    {
        _blob = GetRequiredService<IBlobContainer<CatalogBlobContainer>>();
    }

    [Fact]
    public async Task Saves_And_Reads_Back()
    {
        var bytes = Encoding.UTF8.GetBytes("hello-oss");
        await _blob.SaveAsync("pets/test/cover.png", new MemoryStream(bytes), overrideExisting: true);

        await using var read = await _blob.GetAsync("pets/test/cover.png");
        using var ms = new MemoryStream();
        await read.CopyToAsync(ms);
        Encoding.UTF8.GetString(ms.ToArray()).ShouldBe("hello-oss");
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~CatalogBlob_Tests`
Expected: 编译失败 —— `CatalogBlobContainer` 不存在。

- [ ] **Step 3: 建容器标记类**

Create `backend/src/Homework.Domain/Catalog/CatalogBlobContainer.cs`:

```csharp
using Volo.Abp.BlobStoring;

namespace Homework.Catalog;

/// <summary>全局图鉴资产的 Blob 容器（宠物/勋章/道具的图与视频）。</summary>
[BlobContainerName("catalog")]
public class CatalogBlobContainer
{
}
```

- [ ] **Step 4: Domain 加 BlobStoring 抽象包 + 模块依赖**

Modify `backend/src/Homework.Domain/Homework.Domain.csproj` — 在现有 `<ItemGroup>` 的包列表内加一行：

```xml
    <PackageReference Include="Volo.Abp.BlobStoring" Version="10.5.0" />
```

Modify `backend/src/Homework.Domain/HomeworkDomainModule.cs` — 加 `using Volo.Abp.BlobStoring;` 并在 `[DependsOn(...)]` 列表里加入 `typeof(AbpBlobStoringModule)`。

- [ ] **Step 5: 测试项目加 FileSystem provider 并配置临时目录**

Modify `backend/test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj` — 在包 `<ItemGroup>` 内加：

```xml
    <PackageReference Include="Volo.Abp.BlobStoring.FileSystem" Version="10.5.0" />
```

Modify `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/HomeworkEntityFrameworkCoreTestModule.cs`:
- 顶部加 `using`：

```csharp
using System;
using System.IO;
using Volo.Abp.BlobStoring;
using Volo.Abp.BlobStoring.FileSystem;
```

- 在 `[DependsOn(...)]` 列表加入 `typeof(AbpBlobStoringFileSystemModule)`。
- 在 `ConfigureServices` 方法体开头加入：

```csharp
        Configure<AbpBlobStoringOptions>(options =>
        {
            options.Containers.ConfigureDefault(container =>
            {
                container.UseFileSystem(fs =>
                {
                    fs.BasePath = Path.Combine(Path.GetTempPath(), "homework-test-blobs", Guid.NewGuid().ToString("N"));
                });
            });
        });
```

- [ ] **Step 6: 运行确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~CatalogBlob_Tests`
Expected: PASS。

- [ ] **Step 7: Host 加 Aliyun provider（生产）**

Modify `backend/src/Homework.HttpApi.Host/Homework.HttpApi.Host.csproj` — 在含 ABP 包的 `<ItemGroup>` 内加：

```xml
    <PackageReference Include="Volo.Abp.BlobStoring.Aliyun" Version="10.5.0" />
```

Modify `backend/src/Homework.HttpApi.Host/HomeworkHttpApiHostModule.cs`:
- 顶部加 `using`：

```csharp
using Volo.Abp.BlobStoring;
using Volo.Abp.BlobStoring.Aliyun;
```

- 在 `[DependsOn(...)]` 列表加入 `typeof(AbpBlobStoringAliyunModule)`。
- 在 `ConfigureServices` 末尾（`RequestLocalizationOptions` 配置之后）加：

```csharp
        ConfigureBlobStoring(configuration);
```

- 新增私有方法：

```csharp
    private void ConfigureBlobStoring(IConfiguration configuration)
    {
        Configure<AbpBlobStoringOptions>(options =>
        {
            options.Containers.ConfigureDefault(container =>
            {
                container.UseAliyun(aliyun =>
                {
                    aliyun.AccessKeyId = configuration["Aliyun:AccessKeyId"];
                    aliyun.AccessKeySecret = configuration["Aliyun:AccessKeySecret"];
                    aliyun.Endpoint = configuration["Aliyun:Oss:Endpoint"];
                    aliyun.BucketName = configuration["Aliyun:Oss:BucketName"];
                    // 公有读 Bucket 由运维预先创建；不由应用自动建桶。
                    aliyun.CreateContainerIfNotExists = false;
                });
            });
        });
    }
```

- [ ] **Step 8: 加配置键（占位，真实值走 secrets/环境变量）**

Modify `backend/src/Homework.HttpApi.Host/appsettings.json` — 在 `App` 节点内加 `AssetCdnBaseUrl`，并在顶层加 `Aliyun` 节点：

```json
  "App": {
    "SelfUrl": "https://localhost:44394",
    "CorsOrigins": "https://localhost:5173,http://localhost:5173",
    "AssetCdnBaseUrl": "https://REPLACE_ME.example.com/host/catalog"
  },
  "Aliyun": {
    "AccessKeyId": "",
    "AccessKeySecret": "",
    "Oss": {
      "Endpoint": "oss-cn-hangzhou.aliyuncs.com",
      "BucketName": "REPLACE_ME"
    }
  },
```

> 运维备注：`App:AssetCdnBaseUrl` 必须指向映射到该 Bucket + `catalog` 容器根（含 provider 追加的 `host/` 前缀）的 CDN 源，使 `IAssetUrlResolver` 拼出的 URL 与 OSS 实际对象路径一致。真实 AK/SK 走 user-secrets 或环境变量，勿提交明文。

- [ ] **Step 9: 编译 Host 确认无误**

Run: `dotnet build src/Homework.HttpApi.Host`
Expected: Build succeeded。

- [ ] **Step 10: 提交**

```bash
git add backend/src/Homework.Domain backend/src/Homework.HttpApi.Host backend/test/Homework.EntityFrameworkCore.Tests
git commit -m "feat(catalog): 接入 Blob 存储 —— Aliyun OSS(生产)/FileSystem(测试) + catalog 容器

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Catalog 权限 + 文案 + 授权 admin

三套图鉴的写操作受 `Homework.Catalog.*` 保护，授予内置 `admin` 角色。

**Files:**
- Modify: `backend/src/Homework.Application.Contracts/Permissions/HomeworkPermissions.cs`
- Modify: `backend/src/Homework.Application.Contracts/Permissions/HomeworkPermissionDefinitionProvider.cs`
- Create: `backend/src/Homework.Application/Data/CatalogPermissionDataSeedContributor.cs`
- Modify: `backend/src/Homework.Domain.Shared/Localization/Homework/en.json`
- Modify: `backend/src/Homework.Domain.Shared/Localization/Homework/zh-Hans.json`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/CatalogPermissions_Tests.cs`

**Interfaces:**
- Produces: 常量 `HomeworkPermissions.Catalog.Default/Pets/RewardItems/Medals`（各 `"Homework.Catalog[.X]"`）。

- [ ] **Step 1: 写失败测试（常量值稳定）**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/CatalogPermissions_Tests.cs`:

```csharp
using Homework.Permissions;
using Shouldly;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

public class CatalogPermissions_Tests
{
    [Fact]
    public void Constant_Values_Are_Stable()
    {
        HomeworkPermissions.Catalog.Default.ShouldBe("Homework.Catalog");
        HomeworkPermissions.Catalog.Pets.ShouldBe("Homework.Catalog.Pets");
        HomeworkPermissions.Catalog.RewardItems.ShouldBe("Homework.Catalog.RewardItems");
        HomeworkPermissions.Catalog.Medals.ShouldBe("Homework.Catalog.Medals");
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~CatalogPermissions_Tests`
Expected: 编译失败 —— `HomeworkPermissions.Catalog` 不存在。

- [ ] **Step 3: 加权限常量**

Modify `backend/src/Homework.Application.Contracts/Permissions/HomeworkPermissions.cs` — 在 `ParentAdmin` 常量之后加：

```csharp
    /// <summary>平台管理员：全局图鉴维护。</summary>
    public static class Catalog
    {
        public const string Default = GroupName + ".Catalog";
        public const string Pets = Default + ".Pets";
        public const string RewardItems = Default + ".RewardItems";
        public const string Medals = Default + ".Medals";
    }
```

- [ ] **Step 4: 注册权限定义**

Modify `backend/src/Homework.Application.Contracts/Permissions/HomeworkPermissionDefinitionProvider.cs` — 在 `myGroup.AddPermission(HomeworkPermissions.ParentAdmin, ...)` 之后加：

```csharp
        var catalog = myGroup.AddPermission(HomeworkPermissions.Catalog.Default, L("Permission:Catalog"));
        catalog.AddChild(HomeworkPermissions.Catalog.Pets, L("Permission:Catalog.Pets"));
        catalog.AddChild(HomeworkPermissions.Catalog.RewardItems, L("Permission:Catalog.RewardItems"));
        catalog.AddChild(HomeworkPermissions.Catalog.Medals, L("Permission:Catalog.Medals"));
```

- [ ] **Step 5: 授权 admin 角色（数据种子）**

Create `backend/src/Homework.Application/Data/CatalogPermissionDataSeedContributor.cs`:

```csharp
using System.Threading.Tasks;
using Homework.Permissions;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.PermissionManagement;

namespace Homework.Data;

/// <summary>把图鉴维护权限授予内置 admin 角色（幂等）。</summary>
public class CatalogPermissionDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IPermissionDataSeeder _permissionDataSeeder;

    public CatalogPermissionDataSeedContributor(IPermissionDataSeeder permissionDataSeeder)
        => _permissionDataSeeder = permissionDataSeeder;

    public async Task SeedAsync(DataSeedContext context)
    {
        await _permissionDataSeeder.SeedAsync(
            RolePermissionValueProvider.ProviderName,
            "admin",
            new[]
            {
                HomeworkPermissions.Catalog.Default,
                HomeworkPermissions.Catalog.Pets,
                HomeworkPermissions.Catalog.RewardItems,
                HomeworkPermissions.Catalog.Medals,
            },
            context.TenantId);
    }
}
```

- [ ] **Step 6: 加本地化文案**

Modify `backend/src/Homework.Domain.Shared/Localization/Homework/en.json` — 在 `texts` 内加：

```json
    "Permission:Catalog": "Catalog",
    "Permission:Catalog.Pets": "Manage Pets",
    "Permission:Catalog.RewardItems": "Manage Reward Items",
    "Permission:Catalog.Medals": "Manage Medals",
```

Modify `backend/src/Homework.Domain.Shared/Localization/Homework/zh-Hans.json` — 在 `texts` 内加：

```json
    "Permission:Catalog": "图鉴管理",
    "Permission:Catalog.Pets": "宠物图鉴",
    "Permission:Catalog.RewardItems": "奖励道具图鉴",
    "Permission:Catalog.Medals": "勋章图鉴",
```

- [ ] **Step 7: 运行确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~CatalogPermissions_Tests`
Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add backend/src/Homework.Application.Contracts/Permissions backend/src/Homework.Application/Data/CatalogPermissionDataSeedContributor.cs backend/src/Homework.Domain.Shared/Localization backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/CatalogPermissions_Tests.cs
git commit -m "feat(catalog): Homework.Catalog 权限组 + 授权 admin 角色

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: RewardItem 领域实体

奖励道具聚合的纯领域逻辑（不涉 DB）。

**Files:**
- Create: `backend/src/Homework.Domain/Catalog/RewardItem.cs`
- Test: `backend/test/Homework.Domain.Tests/Catalog/RewardItem_Tests.cs`

**Interfaces:**
- Produces: `RewardItem(Guid id, string name, int growthValue = 12, int randomWeight = 1)`；`SetName/SetGrowthValue/SetRandomWeight` 返回 `this`；`SetIcon(string?)`、`SetGlyph(string?)`、`SetDisplayOrder(int)`、`Activate()`、`Deactivate()`；属性 `Name/IconObjectKey/Glyph/GrowthValue/RandomWeight/IsActive/DisplayOrder`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.Domain.Tests/Catalog/RewardItem_Tests.cs`:

```csharp
using System;
using Homework.Catalog;
using Shouldly;
using Xunit;

namespace Homework.Catalog;

public class RewardItem_Tests
{
    [Fact]
    public void Creates_With_Defaults_Inactive()
    {
        var item = new RewardItem(Guid.NewGuid(), "星火书签");
        item.Name.ShouldBe("星火书签");
        item.GrowthValue.ShouldBe(12);
        item.RandomWeight.ShouldBe(1);
        item.IsActive.ShouldBeFalse();
    }

    [Fact]
    public void Rejects_Blank_Name()
    {
        Should.Throw<ArgumentException>(() => new RewardItem(Guid.NewGuid(), " "));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Rejects_NonPositive_GrowthValue(int v)
    {
        Should.Throw<ArgumentException>(() => new RewardItem(Guid.NewGuid(), "道具", v));
    }

    [Fact]
    public void Rejects_Negative_RandomWeight()
    {
        Should.Throw<ArgumentException>(() => new RewardItem(Guid.NewGuid(), "道具", 12, -1));
    }

    [Fact]
    public void Activate_Deactivate_Toggle()
    {
        var item = new RewardItem(Guid.NewGuid(), "道具");
        item.Activate();
        item.IsActive.ShouldBeTrue();
        item.Deactivate();
        item.IsActive.ShouldBeFalse();
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~RewardItem_Tests`
Expected: 编译失败 —— `RewardItem` 不存在。

- [ ] **Step 3: 写实体**

Create `backend/src/Homework.Domain/Catalog/RewardItem.cs`:

```csharp
using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Catalog;

/// <summary>全局奖励道具图鉴项（星火书签 / 共鸣号角 / 留存果实 …）。</summary>
public class RewardItem : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string? IconObjectKey { get; private set; }
    public string? Glyph { get; private set; }
    public int GrowthValue { get; private set; }
    public int RandomWeight { get; private set; }
    public bool IsActive { get; private set; }
    public int DisplayOrder { get; private set; }

    protected RewardItem() { }

    public RewardItem(Guid id, [NotNull] string name, int growthValue = 12, int randomWeight = 1)
        : base(id)
    {
        SetName(name);
        SetGrowthValue(growthValue);
        SetRandomWeight(randomWeight);
        IsActive = false;
    }

    public RewardItem SetName([NotNull] string name)
    {
        Name = Check.NotNullOrWhiteSpace(name, nameof(name), maxLength: 64);
        return this;
    }

    public RewardItem SetGrowthValue(int growthValue)
    {
        if (growthValue <= 0)
        {
            throw new ArgumentException("growthValue must be positive", nameof(growthValue));
        }

        GrowthValue = growthValue;
        return this;
    }

    public RewardItem SetRandomWeight(int randomWeight)
    {
        if (randomWeight < 0)
        {
            throw new ArgumentException("randomWeight must be >= 0", nameof(randomWeight));
        }

        RandomWeight = randomWeight;
        return this;
    }

    public void SetIcon(string? iconObjectKey) => IconObjectKey = iconObjectKey;

    public void SetGlyph(string? glyph) => Glyph = glyph;

    public void SetDisplayOrder(int displayOrder) => DisplayOrder = displayOrder;

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~RewardItem_Tests`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add backend/src/Homework.Domain/Catalog/RewardItem.cs backend/test/Homework.Domain.Tests/Catalog/RewardItem_Tests.cs
git commit -m "feat(catalog): RewardItem 奖励道具领域实体

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: RewardItem 持久化 + CRUD App Service

DbSet + 表配置 + DTO + Mapperly + 接口 + 管理端 CRUD，并生成生产迁移。

**Files:**
- Modify: `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/Dtos/RewardItemDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/Dtos/CreateUpdateRewardItemDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/IRewardItemAppService.cs`
- Modify: `backend/src/Homework.Application/HomeworkApplicationMappers.cs`
- Create: `backend/src/Homework.Application/Catalog/RewardItemAppService.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/RewardItemAppService_Tests.cs`

**Interfaces:**
- Consumes: `IAssetUrlResolver`（Task 1）。
- Produces: `IRewardItemAppService` — `GetListAsync()`, `GetActiveListAsync()`, `GetAsync(Guid)`, `CreateAsync(CreateUpdateRewardItemDto)`, `UpdateAsync(Guid, CreateUpdateRewardItemDto)`, `DeleteAsync(Guid)`；`RewardItemDto { Id, Name, IconUrl, Glyph, GrowthValue, RandomWeight, IsActive, DisplayOrder }`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/RewardItemAppService_Tests.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class RewardItemAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IRewardItemAppService _service;

    public RewardItemAppService_Tests()
    {
        _service = GetRequiredService<IRewardItemAppService>();
    }

    [Fact]
    public async Task Create_Then_Get_Roundtrips_Fields()
    {
        var created = await _service.CreateAsync(new CreateUpdateRewardItemDto
        {
            Name = "留存果实", Glyph = "🍎", GrowthValue = 15, RandomWeight = 3, DisplayOrder = 2, IsActive = true
        });

        var fetched = await _service.GetAsync(created.Id);
        fetched.Name.ShouldBe("留存果实");
        fetched.Glyph.ShouldBe("🍎");
        fetched.GrowthValue.ShouldBe(15);
        fetched.RandomWeight.ShouldBe(3);
        fetched.IsActive.ShouldBeTrue();
    }

    [Fact]
    public async Task ActiveList_Excludes_Inactive_And_Sorts_By_DisplayOrder()
    {
        await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "B", GrowthValue = 12, RandomWeight = 1, DisplayOrder = 1, IsActive = true });
        await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "A", GrowthValue = 12, RandomWeight = 1, DisplayOrder = 0, IsActive = true });
        await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "隐藏", GrowthValue = 12, RandomWeight = 1, DisplayOrder = 5, IsActive = false });

        var active = await _service.GetActiveListAsync();
        active.Items.Select(i => i.Name).ShouldNotContain("隐藏");
        var ordered = active.Items.Where(i => i.Name is "A" or "B").Select(i => i.Name).ToList();
        ordered.ShouldBe(new[] { "A", "B" });
    }

    [Fact]
    public async Task Update_Changes_Fields()
    {
        var created = await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "旧", GrowthValue = 12, RandomWeight = 1, IsActive = false });
        var updated = await _service.UpdateAsync(created.Id, new CreateUpdateRewardItemDto { Name = "新", GrowthValue = 20, RandomWeight = 2, IsActive = true });
        updated.Name.ShouldBe("新");
        updated.GrowthValue.ShouldBe(20);
        updated.IsActive.ShouldBeTrue();
    }

    [Fact]
    public async Task Delete_Removes()
    {
        var created = await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "删", GrowthValue = 12, RandomWeight = 1 });
        await _service.DeleteAsync(created.Id);
        (await _service.GetListAsync()).Items.ShouldNotContain(i => i.Id == created.Id);
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~RewardItemAppService_Tests`
Expected: 编译失败 —— DTO / 接口 / service 不存在。

- [ ] **Step 3: 建 DTO**

Create `backend/src/Homework.Application.Contracts/Catalog/Dtos/RewardItemDto.cs`:

```csharp
using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Catalog.Dtos;

public class RewardItemDto : EntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? IconUrl { get; set; }      // 由 IAssetUrlResolver 计算
    public string? Glyph { get; set; }
    public int GrowthValue { get; set; }
    public int RandomWeight { get; set; }
    public bool IsActive { get; set; }
    public int DisplayOrder { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Catalog/Dtos/CreateUpdateRewardItemDto.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Homework.Catalog.Dtos;

public class CreateUpdateRewardItemDto
{
    [Required, StringLength(64)] public string Name { get; set; } = string.Empty;
    [StringLength(8)] public string? Glyph { get; set; }
    [Range(1, int.MaxValue)] public int GrowthValue { get; set; } = 12;
    [Range(0, int.MaxValue)] public int RandomWeight { get; set; } = 1;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}
```

- [ ] **Step 4: 建 App Service 接口**

Create `backend/src/Homework.Application.Contracts/Catalog/IRewardItemAppService.cs`:

```csharp
using System;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Catalog;

public interface IRewardItemAppService : IApplicationService
{
    Task<ListResultDto<RewardItemDto>> GetListAsync();
    Task<ListResultDto<RewardItemDto>> GetActiveListAsync();
    Task<RewardItemDto> GetAsync(Guid id);
    Task<RewardItemDto> CreateAsync(CreateUpdateRewardItemDto input);
    Task<RewardItemDto> UpdateAsync(Guid id, CreateUpdateRewardItemDto input);
    Task DeleteAsync(Guid id);
}
```

- [ ] **Step 5: 加 Mapperly 映射（忽略 IconUrl）**

Modify `backend/src/Homework.Application/HomeworkApplicationMappers.cs` — 顶部 `using` 加 `using Homework.Catalog;` 和 `using Homework.Catalog.Dtos;`，文件末尾加：

```csharp
[Mapper]
public partial class RewardItemMapper : MapperBase<RewardItem, RewardItemDto>
{
    [MapperIgnoreTarget(nameof(RewardItemDto.IconUrl))]
    public override partial RewardItemDto Map(RewardItem source);

    [MapperIgnoreTarget(nameof(RewardItemDto.IconUrl))]
    public override partial void Map(RewardItem source, RewardItemDto destination);
}
```

- [ ] **Step 6: 建 App Service 实现**

Create `backend/src/Homework.Application/Catalog/RewardItemAppService.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace Homework.Catalog;

[Authorize]
public class RewardItemAppService : HomeworkAppService, IRewardItemAppService
{
    private readonly IRepository<RewardItem, Guid> _repository;
    private readonly IAssetUrlResolver _urls;

    public RewardItemAppService(IRepository<RewardItem, Guid> repository, IAssetUrlResolver urls)
    {
        _repository = repository;
        _urls = urls;
    }

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<ListResultDto<RewardItemDto>> GetListAsync()
    {
        var items = await _repository.GetListAsync();
        return List(items.OrderBy(i => i.DisplayOrder).ThenBy(i => i.Name));
    }

    public async Task<ListResultDto<RewardItemDto>> GetActiveListAsync()
    {
        var items = await _repository.GetListAsync(i => i.IsActive);
        return List(items.OrderBy(i => i.DisplayOrder).ThenBy(i => i.Name));
    }

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<RewardItemDto> GetAsync(Guid id) => ToDto(await _repository.GetAsync(id));

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<RewardItemDto> CreateAsync(CreateUpdateRewardItemDto input)
    {
        var item = new RewardItem(GuidGenerator.Create(), input.Name, input.GrowthValue, input.RandomWeight);
        item.SetGlyph(input.Glyph);
        item.SetDisplayOrder(input.DisplayOrder);
        if (input.IsActive) { item.Activate(); }
        await _repository.InsertAsync(item, autoSave: true);
        return ToDto(item);
    }

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<RewardItemDto> UpdateAsync(Guid id, CreateUpdateRewardItemDto input)
    {
        var item = await _repository.GetAsync(id);
        item.SetName(input.Name);
        item.SetGrowthValue(input.GrowthValue);
        item.SetRandomWeight(input.RandomWeight);
        item.SetGlyph(input.Glyph);
        item.SetDisplayOrder(input.DisplayOrder);
        if (input.IsActive) { item.Activate(); } else { item.Deactivate(); }
        await _repository.UpdateAsync(item, autoSave: true);
        return ToDto(item);
    }

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task DeleteAsync(Guid id) => await _repository.DeleteAsync(id);

    private ListResultDto<RewardItemDto> List(System.Collections.Generic.IEnumerable<RewardItem> items)
        => new(items.Select(ToDto).ToList());

    private RewardItemDto ToDto(RewardItem item)
    {
        var dto = ObjectMapper.Map<RewardItem, RewardItemDto>(item);
        dto.IconUrl = _urls.ToUrl(item.IconObjectKey);
        return dto;
    }
}
```

- [ ] **Step 7: 注册 DbSet + 表配置**

Modify `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`:
- 顶部加 `using Homework.Catalog;`。
- 在 `// Homework game` 那组 DbSet 后加：

```csharp
    public DbSet<RewardItem> RewardItems { get; set; }
```

- 在 `OnModelCreating` 里 `FamilyGoal` 配置块之后加：

```csharp
        builder.Entity<RewardItem>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "RewardItems", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(64);
            b.Property(x => x.IconObjectKey).HasMaxLength(256);
            b.Property(x => x.Glyph).HasMaxLength(8);
            b.HasIndex(x => new { x.IsActive, x.DisplayOrder });
        });
```

- [ ] **Step 8: 运行确认通过（测试库自动建表）**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~RewardItemAppService_Tests`
Expected: PASS（4 个用例）。

- [ ] **Step 9: 生成生产迁移**

Run: `dotnet ef migrations add Added_RewardItem --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore`
Expected: 新增 `Migrations/*_Added_RewardItem.cs`，含 `AppRewardItems` 建表。

- [ ] **Step 10: 提交**

```bash
git add backend/src/Homework.Application.Contracts/Catalog backend/src/Homework.Application/Catalog/RewardItemAppService.cs backend/src/Homework.Application/HomeworkApplicationMappers.cs backend/src/Homework.EntityFrameworkCore backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/RewardItemAppService_Tests.cs
git commit -m "feat(catalog): RewardItem 持久化 + CRUD App Service + 迁移

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: RewardItem 图标上传

管理员上传道具图标到 OSS，存 object key，DTO 回 CDN URL。

**Files:**
- Modify: `backend/src/Homework.Application.Contracts/Catalog/IRewardItemAppService.cs`
- Modify: `backend/src/Homework.Application/Catalog/RewardItemAppService.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/RewardItemUpload_Tests.cs`

**Interfaces:**
- Consumes: `IBlobContainer<CatalogBlobContainer>`（Task 2）、`IAssetUrlResolver`。
- Produces: `IRewardItemAppService.UploadIconAsync(Guid id, IRemoteStreamContent file) : Task<RewardItemDto>`；object key 规则 `rewards/{id:N}{ext}`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/RewardItemUpload_Tests.cs`:

```csharp
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Volo.Abp.Content;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class RewardItemUpload_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IRewardItemAppService _service;

    public RewardItemUpload_Tests()
    {
        _service = GetRequiredService<IRewardItemAppService>();
    }

    [Fact]
    public async Task Upload_Sets_IconUrl_With_Png_Extension()
    {
        var created = await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "号角", GrowthValue = 12, RandomWeight = 1 });
        var bytes = Encoding.UTF8.GetBytes("fake-png");
        var file = new RemoteStreamContent(new MemoryStream(bytes), "horn.png", "image/png");

        var dto = await _service.UploadIconAsync(created.Id, file);

        dto.IconUrl.ShouldNotBeNull();
        dto.IconUrl!.ShouldEndWith($"rewards/{created.Id:N}.png");
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~RewardItemUpload_Tests`
Expected: 编译失败 —— `UploadIconAsync` 不存在。

- [ ] **Step 3: 接口加上传方法**

Modify `backend/src/Homework.Application.Contracts/Catalog/IRewardItemAppService.cs` — 顶部加 `using Volo.Abp.Content;`，接口内加：

```csharp
    Task<RewardItemDto> UploadIconAsync(Guid id, IRemoteStreamContent file);
```

- [ ] **Step 4: 实现上传**

Modify `backend/src/Homework.Application/Catalog/RewardItemAppService.cs`:
- 顶部加 `using`：

```csharp
using System.IO;
using Homework.Catalog;
using Volo.Abp.BlobStoring;
using Volo.Abp.Content;
```

- 构造函数注入 blob 容器（改字段与构造）：

```csharp
    private readonly IBlobContainer<CatalogBlobContainer> _blob;

    public RewardItemAppService(
        IRepository<RewardItem, Guid> repository,
        IAssetUrlResolver urls,
        IBlobContainer<CatalogBlobContainer> blob)
    {
        _repository = repository;
        _urls = urls;
        _blob = blob;
    }
```

- 在 `DeleteAsync` 之后加：

```csharp
    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<RewardItemDto> UploadIconAsync(Guid id, IRemoteStreamContent file)
    {
        var item = await _repository.GetAsync(id);
        var ext = Path.GetExtension(file.FileName) ?? string.Empty;
        var objectKey = $"rewards/{id:N}{ext}";
        await using (var stream = file.GetStream())
        {
            await _blob.SaveAsync(objectKey, stream, overrideExisting: true);
        }
        item.SetIcon(objectKey);
        await _repository.UpdateAsync(item, autoSave: true);
        return ToDto(item);
    }
```

- [ ] **Step 5: 运行确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~RewardItemUpload_Tests`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add backend/src/Homework.Application.Contracts/Catalog/IRewardItemAppService.cs backend/src/Homework.Application/Catalog/RewardItemAppService.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/RewardItemUpload_Tests.cs
git commit -m "feat(catalog): RewardItem 图标上传至 OSS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Medal 图鉴（实体 + 持久化 + CRUD + 图片上传 + 列表）

勋章图鉴，结构比道具更简单（无成长值/权重）。一次做完整纵切。

**Files:**
- Create: `backend/src/Homework.Domain/Catalog/Medal.cs`
- Modify: `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/Dtos/MedalDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/Dtos/CreateUpdateMedalDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/IMedalAppService.cs`
- Modify: `backend/src/Homework.Application/HomeworkApplicationMappers.cs`
- Create: `backend/src/Homework.Application/Catalog/MedalAppService.cs`
- Test: `backend/test/Homework.Domain.Tests/Catalog/Medal_Tests.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/MedalAppService_Tests.cs`

**Interfaces:**
- Produces: `Medal(Guid id, string name)`；`SetName/SetDescription/SetImage/SetDisplayOrder/Activate/Deactivate`；`IMedalAppService`（GetList/GetActiveList/Get/Create/Update/Delete/UploadImage）；`MedalDto { Id, Name, Description, ImageUrl, IsActive, DisplayOrder }`。

- [ ] **Step 1: 写失败领域测试**

Create `backend/test/Homework.Domain.Tests/Catalog/Medal_Tests.cs`:

```csharp
using System;
using Homework.Catalog;
using Shouldly;
using Xunit;

namespace Homework.Catalog;

public class Medal_Tests
{
    [Fact]
    public void Creates_Inactive_With_Name()
    {
        var medal = new Medal(Guid.NewGuid(), "暑期毕业勋章");
        medal.Name.ShouldBe("暑期毕业勋章");
        medal.IsActive.ShouldBeFalse();
    }

    [Fact]
    public void Rejects_Blank_Name()
    {
        Should.Throw<ArgumentException>(() => new Medal(Guid.NewGuid(), " "));
    }

    [Fact]
    public void Sets_Image_And_Description()
    {
        var medal = new Medal(Guid.NewGuid(), "勋章");
        medal.SetDescription("坚持一个暑假");
        medal.SetImage("medals/x.png");
        medal.Description.ShouldBe("坚持一个暑假");
        medal.ImageObjectKey.ShouldBe("medals/x.png");
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~Medal_Tests`
Expected: 编译失败 —— `Medal` 不存在。

- [ ] **Step 3: 写实体**

Create `backend/src/Homework.Domain/Catalog/Medal.cs`:

```csharp
using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Catalog;

/// <summary>全局勋章图鉴项；旅程完成时授予其一。</summary>
public class Medal : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? ImageObjectKey { get; private set; }
    public bool IsActive { get; private set; }
    public int DisplayOrder { get; private set; }

    protected Medal() { }

    public Medal(Guid id, [NotNull] string name) : base(id)
    {
        SetName(name);
        IsActive = false;
    }

    public Medal SetName([NotNull] string name)
    {
        Name = Check.NotNullOrWhiteSpace(name, nameof(name), maxLength: 64);
        return this;
    }

    public void SetDescription(string? description) => Description = description;

    public void SetImage(string? imageObjectKey) => ImageObjectKey = imageObjectKey;

    public void SetDisplayOrder(int displayOrder) => DisplayOrder = displayOrder;

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;
}
```

- [ ] **Step 4: 运行确认领域测试通过**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~Medal_Tests`
Expected: PASS。

- [ ] **Step 5: 写失败 App Service 测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/MedalAppService_Tests.cs`:

```csharp
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Volo.Abp.Content;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class MedalAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IMedalAppService _service;

    public MedalAppService_Tests()
    {
        _service = GetRequiredService<IMedalAppService>();
    }

    [Fact]
    public async Task Create_And_ActiveList_Filters()
    {
        await _service.CreateAsync(new CreateUpdateMedalDto { Name = "显示", IsActive = true, DisplayOrder = 0 });
        await _service.CreateAsync(new CreateUpdateMedalDto { Name = "隐藏", IsActive = false, DisplayOrder = 1 });

        var active = await _service.GetActiveListAsync();
        active.Items.ShouldContain(i => i.Name == "显示");
        active.Items.ShouldNotContain(i => i.Name == "隐藏");
    }

    [Fact]
    public async Task Upload_Image_Sets_Url()
    {
        var created = await _service.CreateAsync(new CreateUpdateMedalDto { Name = "勋章" });
        var file = new RemoteStreamContent(new MemoryStream(Encoding.UTF8.GetBytes("img")), "m.png", "image/png");
        var dto = await _service.UploadImageAsync(created.Id, file);
        dto.ImageUrl.ShouldNotBeNull();
        dto.ImageUrl!.ShouldEndWith($"medals/{created.Id:N}.png");
    }
}
```

- [ ] **Step 6: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~MedalAppService_Tests`
Expected: 编译失败。

- [ ] **Step 7: 建 DTO + 接口**

Create `backend/src/Homework.Application.Contracts/Catalog/Dtos/MedalDto.cs`:

```csharp
using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Catalog.Dtos;

public class MedalDto : EntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
    public int DisplayOrder { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Catalog/Dtos/CreateUpdateMedalDto.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Homework.Catalog.Dtos;

public class CreateUpdateMedalDto
{
    [Required, StringLength(64)] public string Name { get; set; } = string.Empty;
    [StringLength(512)] public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Catalog/IMedalAppService.cs`:

```csharp
using System;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Content;

namespace Homework.Catalog;

public interface IMedalAppService : IApplicationService
{
    Task<ListResultDto<MedalDto>> GetListAsync();
    Task<ListResultDto<MedalDto>> GetActiveListAsync();
    Task<MedalDto> GetAsync(Guid id);
    Task<MedalDto> CreateAsync(CreateUpdateMedalDto input);
    Task<MedalDto> UpdateAsync(Guid id, CreateUpdateMedalDto input);
    Task DeleteAsync(Guid id);
    Task<MedalDto> UploadImageAsync(Guid id, IRemoteStreamContent file);
}
```

- [ ] **Step 8: 加 Mapperly 映射**

Modify `backend/src/Homework.Application/HomeworkApplicationMappers.cs` — 末尾加：

```csharp
[Mapper]
public partial class MedalMapper : MapperBase<Medal, MedalDto>
{
    [MapperIgnoreTarget(nameof(MedalDto.ImageUrl))]
    public override partial MedalDto Map(Medal source);

    [MapperIgnoreTarget(nameof(MedalDto.ImageUrl))]
    public override partial void Map(Medal source, MedalDto destination);
}
```

- [ ] **Step 9: 建 App Service 实现**

Create `backend/src/Homework.Application/Catalog/MedalAppService.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.BlobStoring;
using Volo.Abp.Content;
using Volo.Abp.Domain.Repositories;

namespace Homework.Catalog;

[Authorize]
public class MedalAppService : HomeworkAppService, IMedalAppService
{
    private readonly IRepository<Medal, Guid> _repository;
    private readonly IAssetUrlResolver _urls;
    private readonly IBlobContainer<CatalogBlobContainer> _blob;

    public MedalAppService(
        IRepository<Medal, Guid> repository,
        IAssetUrlResolver urls,
        IBlobContainer<CatalogBlobContainer> blob)
    {
        _repository = repository;
        _urls = urls;
        _blob = blob;
    }

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<ListResultDto<MedalDto>> GetListAsync()
    {
        var items = await _repository.GetListAsync();
        return List(items.OrderBy(i => i.DisplayOrder).ThenBy(i => i.Name));
    }

    public async Task<ListResultDto<MedalDto>> GetActiveListAsync()
    {
        var items = await _repository.GetListAsync(i => i.IsActive);
        return List(items.OrderBy(i => i.DisplayOrder).ThenBy(i => i.Name));
    }

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<MedalDto> GetAsync(Guid id) => ToDto(await _repository.GetAsync(id));

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<MedalDto> CreateAsync(CreateUpdateMedalDto input)
    {
        var medal = new Medal(GuidGenerator.Create(), input.Name);
        medal.SetDescription(input.Description);
        medal.SetDisplayOrder(input.DisplayOrder);
        if (input.IsActive) { medal.Activate(); }
        await _repository.InsertAsync(medal, autoSave: true);
        return ToDto(medal);
    }

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<MedalDto> UpdateAsync(Guid id, CreateUpdateMedalDto input)
    {
        var medal = await _repository.GetAsync(id);
        medal.SetName(input.Name);
        medal.SetDescription(input.Description);
        medal.SetDisplayOrder(input.DisplayOrder);
        if (input.IsActive) { medal.Activate(); } else { medal.Deactivate(); }
        await _repository.UpdateAsync(medal, autoSave: true);
        return ToDto(medal);
    }

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task DeleteAsync(Guid id) => await _repository.DeleteAsync(id);

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<MedalDto> UploadImageAsync(Guid id, IRemoteStreamContent file)
    {
        var medal = await _repository.GetAsync(id);
        var ext = Path.GetExtension(file.FileName) ?? string.Empty;
        var objectKey = $"medals/{id:N}{ext}";
        await using (var stream = file.GetStream())
        {
            await _blob.SaveAsync(objectKey, stream, overrideExisting: true);
        }
        medal.SetImage(objectKey);
        await _repository.UpdateAsync(medal, autoSave: true);
        return ToDto(medal);
    }

    private ListResultDto<MedalDto> List(IEnumerable<Medal> items) => new(items.Select(ToDto).ToList());

    private MedalDto ToDto(Medal medal)
    {
        var dto = ObjectMapper.Map<Medal, MedalDto>(medal);
        dto.ImageUrl = _urls.ToUrl(medal.ImageObjectKey);
        return dto;
    }
}
```

- [ ] **Step 10: 注册 DbSet + 表配置**

Modify `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`:
- DbSet 组加：

```csharp
    public DbSet<Medal> Medals { get; set; }
```

- `OnModelCreating` 里 `RewardItem` 配置之后加：

```csharp
        builder.Entity<Medal>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "Medals", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(64);
            b.Property(x => x.Description).HasMaxLength(512);
            b.Property(x => x.ImageObjectKey).HasMaxLength(256);
            b.HasIndex(x => new { x.IsActive, x.DisplayOrder });
        });
```

- [ ] **Step 11: 运行确认全部通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~MedalAppService_Tests`
Expected: PASS（2 个用例）。

- [ ] **Step 12: 生成迁移**

Run: `dotnet ef migrations add Added_Medal --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore`
Expected: 新增迁移含 `AppMedals` 建表。

- [ ] **Step 13: 提交**

```bash
git add backend/src/Homework.Domain/Catalog/Medal.cs backend/src/Homework.Application.Contracts/Catalog backend/src/Homework.Application/Catalog/MedalAppService.cs backend/src/Homework.Application/HomeworkApplicationMappers.cs backend/src/Homework.EntityFrameworkCore backend/test/Homework.Domain.Tests/Catalog/Medal_Tests.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/MedalAppService_Tests.cs
git commit -m "feat(catalog): Medal 勋章图鉴 —— 实体/CRUD/上传/迁移

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: PetSpecies + PetForm 领域实体与不变量

宠物聚合根 + 5 形态子实体；进化阈值/资源齐全性校验集中在聚合。纯领域逻辑。

**Files:**
- Create: `backend/src/Homework.Domain/Catalog/PetForm.cs`
- Create: `backend/src/Homework.Domain/Catalog/PetSpecies.cs`
- Modify: `backend/src/Homework.Domain.Shared/HomeworkDomainErrorCodes.cs`
- Test: `backend/test/Homework.Domain.Tests/Catalog/PetSpecies_Tests.cs`

**Interfaces:**
- Produces:
  - `PetForm : Entity`（复合键 `PetSpeciesId + Level`）；属性 `Level/Name/SpriteObjectKey/RevealText/GrowthToNext/EvolveVideoObjectKey/Scale`；`Set(name, revealText, growthToNext, scale)`、`SetSprite(key)`、`SetEvolveVideo(key)`。
  - `PetSpecies(Guid id, string name, string code)`；`SetName/SetCode/SetAccentColor/SetDescription/SetDisplayOrder/SetCover`；`SetForm(int level, string name, string? revealText, int? growthToNext, decimal? scale) : PetForm`；`SetFormSprite(int level, string key)`、`SetFormEvolveVideo(int level, string key)`；`Activate()`（不满足抛 `BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)`）、`Deactivate()`；`IReadOnlyCollection<PetForm> Forms`。
- 错误码：`HomeworkDomainErrorCodes.PetSpeciesIncomplete = "Homework:Catalog.PetSpeciesIncomplete"`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.Domain.Tests/Catalog/PetSpecies_Tests.cs`:

```csharp
using System;
using System.Linq;
using Homework.Catalog;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Homework.Catalog;

public class PetSpecies_Tests
{
    private static PetSpecies FullyConfigured()
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        s.SetCover("pets/x/cover.png");
        // 1-4 阶：名字 + 阈值 + 精灵图 + 进化视频
        for (var lvl = 1; lvl <= 4; lvl++)
        {
            s.SetForm(lvl, $"阶{lvl}", revealText: null, growthToNext: lvl * 20, scale: 1m);
            s.SetFormSprite(lvl, $"pets/x/form-{lvl}.png");
            s.SetFormEvolveVideo(lvl, $"pets/x/evolve-{lvl}-{lvl + 1}.mp4");
        }
        // 5 阶：名字 + 精灵图，无阈值/视频
        s.SetForm(5, "满阶", revealText: "首次喷火", growthToNext: null, scale: 1.6m);
        s.SetFormSprite(5, "pets/x/form-5.png");
        return s;
    }

    [Fact]
    public void Creates_Inactive_With_Name_And_Code()
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        s.Name.ShouldBe("火龙");
        s.Code.ShouldBe("dragon");
        s.IsActive.ShouldBeFalse();
        s.Forms.Count.ShouldBe(0);
    }

    [Fact]
    public void SetForm_Is_Idempotent_Per_Level()
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        s.SetForm(1, "蛋", null, 20, 0.5m);
        s.SetForm(1, "龙蛋", null, 30, 0.6m);
        s.Forms.Count.ShouldBe(1);
        s.Forms.Single().Name.ShouldBe("龙蛋");
        s.Forms.Single().GrowthToNext.ShouldBe(30);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void SetForm_Rejects_Level_Out_Of_Range(int level)
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        Should.Throw<ArgumentException>(() => s.SetForm(level, "x", null, 10, 1m));
    }

    [Fact]
    public void Activate_Succeeds_When_Fully_Configured()
    {
        var s = FullyConfigured();
        s.Activate();
        s.IsActive.ShouldBeTrue();
    }

    [Fact]
    public void Activate_Fails_When_Missing_A_Form()
    {
        var s = FullyConfigured();
        // 破坏：把第 3 阶精灵图清空
        s.SetFormSprite(3, null!);
        Should.Throw<BusinessException>(() => s.Activate());
    }

    [Fact]
    public void Activate_Fails_When_Only_Four_Forms()
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        s.SetCover("pets/x/cover.png");
        for (var lvl = 1; lvl <= 4; lvl++)
        {
            s.SetForm(lvl, $"阶{lvl}", null, lvl * 20, 1m);
            s.SetFormSprite(lvl, $"pets/x/form-{lvl}.png");
            s.SetFormEvolveVideo(lvl, $"pets/x/e-{lvl}.mp4");
        }
        Should.Throw<BusinessException>(() => s.Activate());
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~PetSpecies_Tests`
Expected: 编译失败 —— `PetSpecies` / `PetForm` 不存在。

- [ ] **Step 3: 加错误码**

Modify `backend/src/Homework.Domain.Shared/HomeworkDomainErrorCodes.cs` — 在类体内加：

```csharp
    public const string PetSpeciesIncomplete = "Homework:Catalog.PetSpeciesIncomplete";
```

- [ ] **Step 4: 写 PetForm**

Create `backend/src/Homework.Domain/Catalog/PetForm.cs`:

```csharp
using System;
using Volo.Abp;
using Volo.Abp.Domain.Entities;

namespace Homework.Catalog;

/// <summary>宠物的一个形态阶（每个 PetSpecies 恰好 5 个，复合键 PetSpeciesId + Level）。</summary>
public class PetForm : Entity
{
    public Guid PetSpeciesId { get; private set; }
    public int Level { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? SpriteObjectKey { get; private set; }
    public string? RevealText { get; private set; }
    public int? GrowthToNext { get; private set; }
    public string? EvolveVideoObjectKey { get; private set; }
    public decimal? Scale { get; private set; }

    protected PetForm() { }

    public PetForm(Guid petSpeciesId, int level)
    {
        PetSpeciesId = petSpeciesId;
        Level = level;
    }

    public void Set(string name, string? revealText, int? growthToNext, decimal? scale)
    {
        Name = Check.NotNullOrWhiteSpace(name, nameof(name), maxLength: 64);
        RevealText = revealText;
        GrowthToNext = growthToNext;
        Scale = scale;
    }

    public void SetSprite(string? spriteObjectKey) => SpriteObjectKey = spriteObjectKey;

    public void SetEvolveVideo(string? evolveVideoObjectKey) => EvolveVideoObjectKey = evolveVideoObjectKey;

    public override object[] GetKeys() => new object[] { PetSpeciesId, Level };
}
```

- [ ] **Step 5: 写 PetSpecies**

Create `backend/src/Homework.Domain/Catalog/PetSpecies.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Catalog;

/// <summary>全局宠物图鉴项：名称 + 封面 + 5 形态（含 4 段进化）。</summary>
public class PetSpecies : FullAuditedAggregateRoot<Guid>
{
    public const int FormCount = 5;

    public string Name { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;
    public string? CoverObjectKey { get; private set; }
    public string? AccentColor { get; private set; }
    public string? Description { get; private set; }
    public bool IsActive { get; private set; }
    public int DisplayOrder { get; private set; }

    private readonly List<PetForm> _forms = new();
    public IReadOnlyCollection<PetForm> Forms => _forms.AsReadOnly();

    protected PetSpecies() { }

    public PetSpecies(Guid id, [NotNull] string name, [NotNull] string code) : base(id)
    {
        SetName(name);
        SetCode(code);
        IsActive = false;
    }

    public PetSpecies SetName([NotNull] string name)
    {
        Name = Check.NotNullOrWhiteSpace(name, nameof(name), maxLength: 64);
        return this;
    }

    public PetSpecies SetCode([NotNull] string code)
    {
        Code = Check.NotNullOrWhiteSpace(code, nameof(code), maxLength: 64);
        return this;
    }

    public void SetAccentColor(string? accentColor) => AccentColor = accentColor;

    public void SetDescription(string? description) => Description = description;

    public void SetDisplayOrder(int displayOrder) => DisplayOrder = displayOrder;

    public void SetCover(string? coverObjectKey) => CoverObjectKey = coverObjectKey;

    public PetForm SetForm(int level, string name, string? revealText, int? growthToNext, decimal? scale)
    {
        if (level < 1 || level > FormCount)
        {
            throw new ArgumentException($"level must be within [1,{FormCount}]", nameof(level));
        }

        var form = _forms.FirstOrDefault(f => f.Level == level);
        if (form == null)
        {
            form = new PetForm(Id, level);
            _forms.Add(form);
        }

        form.Set(name, revealText, growthToNext, scale);
        return form;
    }

    public void SetFormSprite(int level, string? spriteObjectKey)
        => GetForm(level).SetSprite(spriteObjectKey);

    public void SetFormEvolveVideo(int level, string? evolveVideoObjectKey)
        => GetForm(level).SetEvolveVideo(evolveVideoObjectKey);

    public void Activate()
    {
        if (_forms.Count != FormCount)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                .WithData("reason", $"needs {FormCount} forms");
        }

        if (string.IsNullOrEmpty(CoverObjectKey))
        {
            throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                .WithData("reason", "cover missing");
        }

        foreach (var form in _forms)
        {
            if (string.IsNullOrEmpty(form.SpriteObjectKey))
            {
                throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                    .WithData("reason", $"form {form.Level} sprite missing");
            }

            if (form.Level < FormCount)
            {
                if (form.GrowthToNext is null or <= 0)
                {
                    throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                        .WithData("reason", $"form {form.Level} growthToNext invalid");
                }

                if (string.IsNullOrEmpty(form.EvolveVideoObjectKey))
                {
                    throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                        .WithData("reason", $"form {form.Level} evolve video missing");
                }
            }
        }

        IsActive = true;
    }

    public void Deactivate() => IsActive = false;

    private PetForm GetForm(int level)
    {
        var form = _forms.FirstOrDefault(f => f.Level == level);
        if (form == null)
        {
            throw new ArgumentException($"form level {level} not defined yet", nameof(level));
        }

        return form;
    }
}
```

- [ ] **Step 6: 运行确认通过**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~PetSpecies_Tests`
Expected: PASS（7 个用例）。

- [ ] **Step 7: 提交**

```bash
git add backend/src/Homework.Domain/Catalog/PetForm.cs backend/src/Homework.Domain/Catalog/PetSpecies.cs backend/src/Homework.Domain.Shared/HomeworkDomainErrorCodes.cs backend/test/Homework.Domain.Tests/Catalog/PetSpecies_Tests.cs
git commit -m "feat(catalog): PetSpecies + PetForm 领域实体与启用不变量

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: PetSpecies 持久化 + CRUD + 形态编辑

DbSet + owned 集合表配置 + DTO + Mapperly + 接口 + CRUD/形态编辑 App Service + 迁移。上传与启用留到 Task 10。

**Files:**
- Modify: `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/Dtos/PetFormDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/Dtos/PetSpeciesDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/Dtos/CreateUpdatePetSpeciesDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/Dtos/SetPetFormDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Catalog/IPetSpeciesAppService.cs`
- Modify: `backend/src/Homework.Application/HomeworkApplicationMappers.cs`
- Create: `backend/src/Homework.Application/Catalog/PetSpeciesAppService.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/PetSpeciesAppService_Tests.cs`

**Interfaces:**
- Consumes: `IAssetUrlResolver`。
- Produces: `IPetSpeciesAppService` — `GetListAsync()`, `GetActiveListAsync()`, `GetAsync(Guid)`, `CreateAsync(CreateUpdatePetSpeciesDto)`, `UpdateAsync(Guid, CreateUpdatePetSpeciesDto)`, `DeleteAsync(Guid)`, `SetFormAsync(Guid id, SetPetFormDto input)`。
  - `PetSpeciesDto { Id, Name, Code, CoverUrl, AccentColor, Description, IsActive, DisplayOrder, Forms: List<PetFormDto> }`
  - `PetFormDto { Level, Name, SpriteUrl, RevealText, GrowthToNext, EvolveVideoUrl, Scale }`
  - `SetPetFormDto { Level, Name, RevealText, GrowthToNext, Scale }`

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/PetSpeciesAppService_Tests.cs`:

```csharp
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class PetSpeciesAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IPetSpeciesAppService _service;

    public PetSpeciesAppService_Tests()
    {
        _service = GetRequiredService<IPetSpeciesAppService>();
    }

    [Fact]
    public async Task Create_Then_Get_Roundtrips()
    {
        var created = await _service.CreateAsync(new CreateUpdatePetSpeciesDto
        {
            Name = "火龙", Code = "dragon", AccentColor = "#E8461F", DisplayOrder = 1
        });

        var fetched = await _service.GetAsync(created.Id);
        fetched.Name.ShouldBe("火龙");
        fetched.Code.ShouldBe("dragon");
        fetched.AccentColor.ShouldBe("#E8461F");
        fetched.Forms.ShouldBeEmpty();
        fetched.IsActive.ShouldBeFalse();
    }

    [Fact]
    public async Task SetForm_Adds_And_Updates_Form()
    {
        var created = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = "dragon2" });

        await _service.SetFormAsync(created.Id, new SetPetFormDto { Level = 1, Name = "龙蛋", GrowthToNext = 20, Scale = 0.5m });
        await _service.SetFormAsync(created.Id, new SetPetFormDto { Level = 1, Name = "破壳龙蛋", GrowthToNext = 30, Scale = 0.6m });

        var fetched = await _service.GetAsync(created.Id);
        fetched.Forms.Count.ShouldBe(1);
        fetched.Forms.Single().Name.ShouldBe("破壳龙蛋");
        fetched.Forms.Single().GrowthToNext.ShouldBe(30);
    }

    [Fact]
    public async Task Delete_Removes_Species()
    {
        var created = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "删", Code = "del" });
        await _service.DeleteAsync(created.Id);
        (await _service.GetListAsync()).Items.ShouldNotContain(i => i.Id == created.Id);
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~PetSpeciesAppService_Tests`
Expected: 编译失败。

- [ ] **Step 3: 建 DTO**

Create `backend/src/Homework.Application.Contracts/Catalog/Dtos/PetFormDto.cs`:

```csharp
namespace Homework.Catalog.Dtos;

public class PetFormDto
{
    public int Level { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SpriteUrl { get; set; }
    public string? RevealText { get; set; }
    public int? GrowthToNext { get; set; }
    public string? EvolveVideoUrl { get; set; }
    public decimal? Scale { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Catalog/Dtos/PetSpeciesDto.cs`:

```csharp
using System;
using System.Collections.Generic;
using Volo.Abp.Application.Dtos;

namespace Homework.Catalog.Dtos;

public class PetSpeciesDto : EntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public string? AccentColor { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public int DisplayOrder { get; set; }
    public List<PetFormDto> Forms { get; set; } = new();
}
```

Create `backend/src/Homework.Application.Contracts/Catalog/Dtos/CreateUpdatePetSpeciesDto.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Homework.Catalog.Dtos;

public class CreateUpdatePetSpeciesDto
{
    [Required, StringLength(64)] public string Name { get; set; } = string.Empty;
    [Required, StringLength(64)] public string Code { get; set; } = string.Empty;
    [StringLength(16)] public string? AccentColor { get; set; }
    [StringLength(512)] public string? Description { get; set; }
    public int DisplayOrder { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Catalog/Dtos/SetPetFormDto.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Homework.Catalog.Dtos;

public class SetPetFormDto
{
    [Range(1, 5)] public int Level { get; set; }
    [Required, StringLength(64)] public string Name { get; set; } = string.Empty;
    [StringLength(128)] public string? RevealText { get; set; }
    public int? GrowthToNext { get; set; }
    public decimal? Scale { get; set; }
}
```

- [ ] **Step 4: 建接口**

Create `backend/src/Homework.Application.Contracts/Catalog/IPetSpeciesAppService.cs`:

```csharp
using System;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Catalog;

public interface IPetSpeciesAppService : IApplicationService
{
    Task<ListResultDto<PetSpeciesDto>> GetListAsync();
    Task<ListResultDto<PetSpeciesDto>> GetActiveListAsync();
    Task<PetSpeciesDto> GetAsync(Guid id);
    Task<PetSpeciesDto> CreateAsync(CreateUpdatePetSpeciesDto input);
    Task<PetSpeciesDto> UpdateAsync(Guid id, CreateUpdatePetSpeciesDto input);
    Task DeleteAsync(Guid id);
    Task<PetSpeciesDto> SetFormAsync(Guid id, SetPetFormDto input);
}
```

- [ ] **Step 5: 加 Mapperly 映射（实体→DTO；Forms/URL 手工填）**

Modify `backend/src/Homework.Application/HomeworkApplicationMappers.cs` — 末尾加（注意忽略需 resolver / 手工构造的字段）：

```csharp
[Mapper]
public partial class PetSpeciesMapper : MapperBase<PetSpecies, PetSpeciesDto>
{
    [MapperIgnoreTarget(nameof(PetSpeciesDto.CoverUrl))]
    [MapperIgnoreTarget(nameof(PetSpeciesDto.Forms))]
    public override partial PetSpeciesDto Map(PetSpecies source);

    [MapperIgnoreTarget(nameof(PetSpeciesDto.CoverUrl))]
    [MapperIgnoreTarget(nameof(PetSpeciesDto.Forms))]
    public override partial void Map(PetSpecies source, PetSpeciesDto destination);
}
```

> 说明：`PetFormDto` 的 URL 字段依赖 resolver，故 Forms 整体在 App Service 里手工映射，不走 Mapperly。

- [ ] **Step 6: 建 App Service（含 details 加载 + 手工映射 Forms）**

Create `backend/src/Homework.Application/Catalog/PetSpeciesAppService.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace Homework.Catalog;

[Authorize]
public class PetSpeciesAppService : HomeworkAppService, IPetSpeciesAppService
{
    private readonly IRepository<PetSpecies, Guid> _repository;
    private readonly IAssetUrlResolver _urls;

    public PetSpeciesAppService(IRepository<PetSpecies, Guid> repository, IAssetUrlResolver urls)
    {
        _repository = repository;
        _urls = urls;
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<ListResultDto<PetSpeciesDto>> GetListAsync()
    {
        var q = await _repository.WithDetailsAsync(x => x.Forms);
        var items = await AsyncExecuter.ToListAsync(q.OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name));
        return new ListResultDto<PetSpeciesDto>(items.Select(ToDto).ToList());
    }

    public async Task<ListResultDto<PetSpeciesDto>> GetActiveListAsync()
    {
        var q = await _repository.WithDetailsAsync(x => x.Forms);
        var items = await AsyncExecuter.ToListAsync(
            q.Where(x => x.IsActive).OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name));
        return new ListResultDto<PetSpeciesDto>(items.Select(ToDto).ToList());
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> GetAsync(Guid id) => ToDto(await GetWithFormsAsync(id));

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> CreateAsync(CreateUpdatePetSpeciesDto input)
    {
        var species = new PetSpecies(GuidGenerator.Create(), input.Name, input.Code);
        species.SetAccentColor(input.AccentColor);
        species.SetDescription(input.Description);
        species.SetDisplayOrder(input.DisplayOrder);
        await _repository.InsertAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> UpdateAsync(Guid id, CreateUpdatePetSpeciesDto input)
    {
        var species = await GetWithFormsAsync(id);
        species.SetName(input.Name);
        species.SetCode(input.Code);
        species.SetAccentColor(input.AccentColor);
        species.SetDescription(input.Description);
        species.SetDisplayOrder(input.DisplayOrder);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task DeleteAsync(Guid id) => await _repository.DeleteAsync(id);

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> SetFormAsync(Guid id, SetPetFormDto input)
    {
        var species = await GetWithFormsAsync(id);
        species.SetForm(input.Level, input.Name, input.RevealText, input.GrowthToNext, input.Scale);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    private async Task<PetSpecies> GetWithFormsAsync(Guid id)
    {
        var q = await _repository.WithDetailsAsync(x => x.Forms);
        var species = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == id));
        if (species == null)
        {
            throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(PetSpecies), id);
        }

        return species;
    }

    private PetSpeciesDto ToDto(PetSpecies species)
    {
        var dto = ObjectMapper.Map<PetSpecies, PetSpeciesDto>(species);
        dto.CoverUrl = _urls.ToUrl(species.CoverObjectKey);
        dto.Forms = species.Forms
            .OrderBy(f => f.Level)
            .Select(f => new PetFormDto
            {
                Level = f.Level,
                Name = f.Name,
                SpriteUrl = _urls.ToUrl(f.SpriteObjectKey),
                RevealText = f.RevealText,
                GrowthToNext = f.GrowthToNext,
                EvolveVideoUrl = _urls.ToUrl(f.EvolveVideoObjectKey),
                Scale = f.Scale,
            })
            .ToList();
        return dto;
    }
}
```

- [ ] **Step 7: 注册 DbSet + owned 集合表配置**

Modify `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`:
- DbSet 组加：

```csharp
    public DbSet<PetSpecies> PetSpecies { get; set; }
```

- `OnModelCreating` 里 `Medal` 配置之后加：

```csharp
        builder.Entity<PetSpecies>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "PetSpecies", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(64);
            b.Property(x => x.Code).IsRequired().HasMaxLength(64);
            b.Property(x => x.CoverObjectKey).HasMaxLength(256);
            b.Property(x => x.AccentColor).HasMaxLength(16);
            b.Property(x => x.Description).HasMaxLength(512);
            b.HasIndex(x => x.Code).IsUnique();
            b.HasIndex(x => new { x.IsActive, x.DisplayOrder });
            b.HasMany(x => x.Forms).WithOne()
                .HasForeignKey(f => f.PetSpeciesId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PetForm>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "PetForms", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.HasKey(x => new { x.PetSpeciesId, x.Level });
            b.Property(x => x.Name).IsRequired().HasMaxLength(64);
            b.Property(x => x.SpriteObjectKey).HasMaxLength(256);
            b.Property(x => x.RevealText).HasMaxLength(128);
            b.Property(x => x.EvolveVideoObjectKey).HasMaxLength(256);
        });
```

- [ ] **Step 8: 运行确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~PetSpeciesAppService_Tests`
Expected: PASS（3 个用例）。

- [ ] **Step 9: 生成迁移**

Run: `dotnet ef migrations add Added_PetSpecies --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore`
Expected: 新增迁移含 `AppPetSpecies` + `AppPetForms`（复合键）。

- [ ] **Step 10: 提交**

```bash
git add backend/src/Homework.Application.Contracts/Catalog backend/src/Homework.Application/Catalog/PetSpeciesAppService.cs backend/src/Homework.Application/HomeworkApplicationMappers.cs backend/src/Homework.EntityFrameworkCore backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/PetSpeciesAppService_Tests.cs
git commit -m "feat(catalog): PetSpecies 持久化 + CRUD + 形态编辑 + 迁移

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: PetSpecies 资产上传 + 启用/停用

封面 / 形态精灵图 / 进化视频上传到 OSS，并做「启用」不变量校验（复用 Task 8 的领域逻辑）。

**Files:**
- Modify: `backend/src/Homework.Application.Contracts/Catalog/IPetSpeciesAppService.cs`
- Modify: `backend/src/Homework.Application/Catalog/PetSpeciesAppService.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/PetSpeciesUpload_Tests.cs`

**Interfaces:**
- Consumes: `IBlobContainer<CatalogBlobContainer>`。
- Produces: `IPetSpeciesAppService` 增 `UploadCoverAsync(Guid id, IRemoteStreamContent file)`, `UploadFormSpriteAsync(Guid id, int level, IRemoteStreamContent file)`, `UploadFormEvolveVideoAsync(Guid id, int level, IRemoteStreamContent file)`, `ActivateAsync(Guid id)`, `DeactivateAsync(Guid id)`。object key 规则：`pets/{id:N}/cover{ext}`、`pets/{id:N}/form-{level}{ext}`、`pets/{id:N}/evolve-{level}-{level+1}{ext}`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/PetSpeciesUpload_Tests.cs`:

```csharp
using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Content;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class PetSpeciesUpload_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IPetSpeciesAppService _service;

    public PetSpeciesUpload_Tests()
    {
        _service = GetRequiredService<IPetSpeciesAppService>();
    }

    private static RemoteStreamContent File(string name, string ct)
        => new(new MemoryStream(Encoding.UTF8.GetBytes("x")), name, ct);

    private async Task<Guid> FullyBuiltSpeciesAsync(string code)
    {
        var s = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = code });
        await _service.UploadCoverAsync(s.Id, File("cover.png", "image/png"));
        for (var lvl = 1; lvl <= 4; lvl++)
        {
            await _service.SetFormAsync(s.Id, new SetPetFormDto { Level = lvl, Name = $"阶{lvl}", GrowthToNext = lvl * 20, Scale = 1m });
            await _service.UploadFormSpriteAsync(s.Id, lvl, File($"f{lvl}.png", "image/png"));
            await _service.UploadFormEvolveVideoAsync(s.Id, lvl, File($"e{lvl}.mp4", "video/mp4"));
        }
        await _service.SetFormAsync(s.Id, new SetPetFormDto { Level = 5, Name = "满阶", GrowthToNext = null, Scale = 1.6m });
        await _service.UploadFormSpriteAsync(s.Id, 5, File("f5.png", "image/png"));
        return s.Id;
    }

    [Fact]
    public async Task Upload_Cover_Sets_Url()
    {
        var s = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = "dc" });
        var dto = await _service.UploadCoverAsync(s.Id, File("cover.png", "image/png"));
        dto.CoverUrl.ShouldNotBeNull();
        dto.CoverUrl!.ShouldEndWith($"pets/{s.Id:N}/cover.png");
    }

    [Fact]
    public async Task Upload_Form_Sprite_And_Video_Set_Urls()
    {
        var s = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = "dv" });
        await _service.SetFormAsync(s.Id, new SetPetFormDto { Level = 1, Name = "蛋", GrowthToNext = 20, Scale = 0.5m });
        await _service.UploadFormSpriteAsync(s.Id, 1, File("f1.png", "image/png"));
        var dto = await _service.UploadFormEvolveVideoAsync(s.Id, 1, File("e1.mp4", "video/mp4"));

        var form1 = dto.Forms.Single(f => f.Level == 1);
        form1.SpriteUrl!.ShouldEndWith($"pets/{s.Id:N}/form-1.png");
        form1.EvolveVideoUrl!.ShouldEndWith($"pets/{s.Id:N}/evolve-1-2.mp4");
    }

    [Fact]
    public async Task Activate_Succeeds_When_Fully_Built()
    {
        var id = await FullyBuiltSpeciesAsync("full");
        var dto = await _service.ActivateAsync(id);
        dto.IsActive.ShouldBeTrue();
    }

    [Fact]
    public async Task Activate_Fails_When_Incomplete()
    {
        var s = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = "inc" });
        await Should.ThrowAsync<BusinessException>(async () => await _service.ActivateAsync(s.Id));
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~PetSpeciesUpload_Tests`
Expected: 编译失败 —— 上传/启用方法不存在。

- [ ] **Step 3: 接口增方法**

Modify `backend/src/Homework.Application.Contracts/Catalog/IPetSpeciesAppService.cs` — 顶部加 `using Volo.Abp.Content;`，接口内加：

```csharp
    Task<PetSpeciesDto> UploadCoverAsync(Guid id, IRemoteStreamContent file);
    Task<PetSpeciesDto> UploadFormSpriteAsync(Guid id, int level, IRemoteStreamContent file);
    Task<PetSpeciesDto> UploadFormEvolveVideoAsync(Guid id, int level, IRemoteStreamContent file);
    Task<PetSpeciesDto> ActivateAsync(Guid id);
    Task<PetSpeciesDto> DeactivateAsync(Guid id);
```

- [ ] **Step 4: 实现上传/启用**

Modify `backend/src/Homework.Application/Catalog/PetSpeciesAppService.cs`:
- 顶部加 `using`：

```csharp
using System.IO;
using Volo.Abp.BlobStoring;
using Volo.Abp.Content;
```

- 构造函数注入 blob 容器：

```csharp
    private readonly IBlobContainer<CatalogBlobContainer> _blob;

    public PetSpeciesAppService(
        IRepository<PetSpecies, Guid> repository,
        IAssetUrlResolver urls,
        IBlobContainer<CatalogBlobContainer> blob)
    {
        _repository = repository;
        _urls = urls;
        _blob = blob;
    }
```

- 在 `SetFormAsync` 之后加：

```csharp
    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> UploadCoverAsync(Guid id, IRemoteStreamContent file)
    {
        var species = await GetWithFormsAsync(id);
        var key = $"pets/{id:N}/cover{Path.GetExtension(file.FileName)}";
        await SaveAsync(key, file);
        species.SetCover(key);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> UploadFormSpriteAsync(Guid id, int level, IRemoteStreamContent file)
    {
        var species = await GetWithFormsAsync(id);
        var key = $"pets/{id:N}/form-{level}{Path.GetExtension(file.FileName)}";
        await SaveAsync(key, file);
        species.SetFormSprite(level, key);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> UploadFormEvolveVideoAsync(Guid id, int level, IRemoteStreamContent file)
    {
        var species = await GetWithFormsAsync(id);
        var key = $"pets/{id:N}/evolve-{level}-{level + 1}{Path.GetExtension(file.FileName)}";
        await SaveAsync(key, file);
        species.SetFormEvolveVideo(level, key);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> ActivateAsync(Guid id)
    {
        var species = await GetWithFormsAsync(id);
        species.Activate();
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> DeactivateAsync(Guid id)
    {
        var species = await GetWithFormsAsync(id);
        species.Deactivate();
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    private async Task SaveAsync(string objectKey, IRemoteStreamContent file)
    {
        await using var stream = file.GetStream();
        await _blob.SaveAsync(objectKey, stream, overrideExisting: true);
    }
```

- [ ] **Step 5: 运行确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~PetSpeciesUpload_Tests`
Expected: PASS（4 个用例）。

- [ ] **Step 6: 全量回归**

Run: `dotnet test`
Expected: 全部 PASS（含既有测试 + 本期新增）。

- [ ] **Step 7: 提交**

```bash
git add backend/src/Homework.Application.Contracts/Catalog/IPetSpeciesAppService.cs backend/src/Homework.Application/Catalog/PetSpeciesAppService.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/PetSpeciesUpload_Tests.cs
git commit -m "feat(catalog): PetSpecies 资产上传(封面/精灵图/进化视频) + 启用校验

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 收尾校验（全部任务完成后）

- [ ] `dotnet build` 整个解决方案通过。
- [ ] `dotnet test` 全绿。
- [ ] `dotnet ef migrations list --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore` 显示 `Added_RewardItem` / `Added_Medal` / `Added_PetSpecies` 三个新迁移。
- [ ] （可选，需本地 PostgreSQL）`dotnet run --project src/Homework.DbMigrator` 应用迁移无误。
- [ ] 交付：平台管理员可创建并启用一只完整宠物（封面 + 5 精灵图 + 4 进化视频）、维护奖励道具与勋章；`GetActiveList*` 端点对普通登录用户返回带 CDN URL 的数据。

## 遗留给第二期（不在本计划内）

- Journey 聚合（重塑 FamilyGoal）、任务重挂旅程、奖励解析（指定/加权随机）、喂养/进化/完成、勋章授予与收藏。
- 阈值快照、单旅程约束、`ChildProfile.ActivePetId` 迁移。
- OSS 真实凭证接入与 CDN 联调、上传大小上限（进化 mp4）配置。
