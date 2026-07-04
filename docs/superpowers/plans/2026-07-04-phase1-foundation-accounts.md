# Phase 1 — 地基与账号 Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (if subagents available) or `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

> ✅ **已执行完成（2026-07-04）· 有重大偏差**：数据库从 MySQL 改为 **PostgreSQL**（ABP 10.5 的 MySQL/Oracle provider 对 EF Core 10 太不成熟）。实际落地：ABP 10.5 脚手架（生成在仓库根）+ Npgsql + `Microsoft.EntityFrameworkCore.Design` 固定 10.0.7 + DbMigrator 建库并播种 admin + `ChildProfile` 实体 + 播种两娃（哥哥/3、弟弟/1）+ Web 冒烟通过（https://localhost:44394 起得来）。DbMigrator/Web 须在各自项目目录下运行（否则读不到 appsettings）。关键坑见记忆 `abp-postgres-stack`。**下文 MySQL 相关命令仅作历史参考。**

**Goal:** 用 ABP 10 CLI 搭起一个能跑起来、连上 **PostgreSQL**、有家长管理员登录、并已播种两个孩子账号与 `ChildProfile` 的最小可运行地基。

**Architecture:** 单体 ABP MVC 解决方案（DDD 分层：Domain / Application / EntityFrameworkCore / HttpApi / Web / DbMigrator），**生成在仓库根**（`-csf false`）——`Homework.sln`、`src/`、`test/` 与 `docs/` 平级。本阶段只在生成物上新增一个聚合根 `ChildProfile`、一个 `Child` 角色、和一个数据播种器。基础设施步骤"运行即验证"，领域逻辑走 TDD。

**Tech Stack:** ABP CLI 10.4.x · .NET 10 · EF Core 10 + Pomelo MySQL · MySQL 9.6 · LeptonX-Lite 主题 · xUnit（ABP 生成的测试工程）

**Spec:** `docs/superpowers/specs/2026-07-04-kids-homework-pet-game-design.md`（§3 角色、§6 领域模型、§7 架构）

## 已确认参数
- **解决方案名 / 根命名空间**：`Homework`
- **布局**：生成在仓库根（`-csf false`），路径形如 `src/Homework.Domain`、`test/Homework.Domain.Tests`
- **MySQL**：本机 `root` / `123@abc`，数据库名 `Homework`
- **产品名（显示用）**：学习小伙伴（后续本地化可改）
- **备注（MySQL 9.x）**：MySQL 9.6 较新，Task 3 用 `ServerVersion.AutoDetect` 探测；若 Pomelo 报版本不支持，退回固定 `new MySqlServerVersion(new Version(8,4,0))` 并记入 spec §12。

---

## Chunk 1: 脚手架与运行（Scaffold & Run）

### Task 1: 生成 ABP 10 MVC + MySQL 解决方案（在仓库根）

**Files:**
- Create: 仓库根下 `Homework.sln`、`src/*`、`test/*`（由 CLI 生成）

- [ ] **Step 1: 预检工具链（含 EF CLI）**

Run:
```bash
abp --version && dotnet --version && (dotnet ef --version || dotnet tool install --global dotnet-ef)
```
Expected: `ABP CLI 10.4.1`、`10.0.201`、`dotnet ef` 版本（本机已 10.0.5）。

- [ ] **Step 2: 生成解决方案到仓库根**

Run:
```bash
abp new Homework -u mvc -m none --dbms mysql -csf false -sib -o "D:/WorkSpaces/night-king/Homework"
```
说明：`-csf false` 不建外层解决方案文件夹（直接落在 `-o` 指定的仓库根）；`-sib` 先跳过前端库安装（Task 2 再装，加快且更可控）。
Expected: 生成成功；仓库根出现 `Homework.sln`、`src/`、`test/`。

- [ ] **Step 3: 核对分层结构**

Run:
```bash
ls src
```
Expected: `Homework.Domain.Shared`、`Homework.Domain`、`Homework.Application.Contracts`、`Homework.Application`、`Homework.EntityFrameworkCore`、`Homework.HttpApi`、`Homework.HttpApi.Client`、`Homework.Web`、`Homework.DbMigrator` 九个项目。

- [ ] **Step 4: 合并 `.gitignore`（ABP 可能覆盖了根文件）**

确认根 `.gitignore` 仍含项目原有忽略项，若被覆盖则补回：
```gitignore
# Brainstorming visual companion sessions
.superpowers/
# Node
node_modules/
# OS
.DS_Store
Thumbs.db
```
（ABP 自带的 `bin/obj/*.user/logs` 等忽略项保留。）

- [ ] **Step 5: 编译确保生成物可构建**

Run:
```bash
dotnet build Homework.sln
```
Expected: `Build succeeded`，0 error（首次还原较慢）。

- [ ] **Step 6: 提交脚手架**

Run:
```bash
git -C /d/WorkSpaces/night-king/Homework add -A
git -C /d/WorkSpaces/night-king/Homework commit -m "chore: scaffold ABP 10 MVC + MySQL solution (Homework) at repo root"
```
Expected: 提交成功。

---

### Task 2: 安装前端库（冒烟前置）

**Files:** Modify: `src/Homework.Web`（生成前端库到 `wwwroot/libs`）

- [ ] **Step 1: 安装前端库**

Run:
```bash
abp install-libs
```
（在仓库根运行；ABP 会为 Web 项目安装 `@abp/*`、bootstrap、jquery 等。）
Expected: 完成后 `ls src/Homework.Web/wwwroot/libs` 有 `abp`、`bootstrap`、`jquery` 等目录。

- [ ] **Step 2: 提交**

Run:
```bash
git -C /d/WorkSpaces/night-king/Homework add -A && git -C /d/WorkSpaces/night-king/Homework commit -m "chore: install client-side libs for Web"
```
Expected: 提交成功（若 libs 被 .gitignore 忽略则无改动，跳过）。

---

### Task 3: 配置 MySQL 连接并运行 DbMigrator（建库+种子）

**Files:**
- Modify: `src/Homework.DbMigrator/appsettings.json`
- Modify: `src/Homework.Web/appsettings.json`
- （备注）可能 Modify: `src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkEntityFrameworkCoreModule.cs`

- [ ] **Step 1: 确认 MySQL 服务端可连（非交互）**

Run:
```bash
"D:/Programs/mysql-9.6.0-winx64/bin/mysql.exe" -u root -p"123@abc" -e "SELECT VERSION();"
```
Expected: 打印 `9.6.0`。连不上则先启动 MySQL 服务。

- [ ] **Step 2: 写入连接串（两处一致）**

把 `src/Homework.DbMigrator/appsettings.json` 与 `src/Homework.Web/appsettings.json` 的 `ConnectionStrings:Default` 设为：
```json
"ConnectionStrings": {
  "Default": "Server=localhost;Port=3306;Database=Homework;Uid=root;Pwd=123@abc;SslMode=None;"
}
```
Expected: 两处一致。（`--dbms mysql` 已生成 MySQL 串骨架，此处替换库名/账号/密码。）

- [ ] **Step 3: 运行 DbMigrator 建库、迁移、播种管理员**

Run:
```bash
dotnet run --project src/Homework.DbMigrator
```
Expected: 日志 `Started database migrations...` → 创建 `Homework` 库、应用初始迁移、播种 `admin` + OpenIddict → `Successfully completed ... database migrations.`。

- [ ] **Step 4: 核对库已建（非交互）**

Run:
```bash
"D:/Programs/mysql-9.6.0-winx64/bin/mysql.exe" -u root -p"123@abc" -e "SHOW DATABASES LIKE 'Homework'; SELECT UserName FROM Homework.AbpUsers;"
```
Expected: 列出 `Homework`；`AbpUsers` 含 `admin`。

> **备注（MySQL 9.x 兼容）**：若 Step 3 报 Pomelo 无法识别服务器版本，打开 `HomeworkEntityFrameworkCoreModule.cs`，把 `options.UseMySql(... ServerVersion.AutoDetect(...))` 暂时改为固定 `new MySqlServerVersion(new Version(8, 4, 0))`，重跑 Step 3，并在 spec §12 标注。

- [ ] **Step 5: 提交配置**

Run:
```bash
git -C /d/WorkSpaces/night-king/Homework add -A
git -C /d/WorkSpaces/night-king/Homework commit -m "chore: configure MySQL connection and run initial DbMigrator"
```
Expected: 提交成功。（本项目私有自部署，本地明文连接串可接受；如需可改用 user-secrets。）

---

### Task 4: 冒烟——跑起来并用 admin 登录

**Files:** Create: `RUN.md`（仓库根）

- [ ] **Step 1: 信任本地 https 证书（首次）**

Run:
```bash
dotnet dev-certs https --trust
```
Expected: 证书受信任（或已存在）。

- [ ] **Step 2: 启动 Web**

Run:
```bash
dotnet run --project src/Homework.Web
```
Expected: 控制台打印监听地址（如 `https://localhost:443xx`）；无致命异常。

- [ ] **Step 3: 登录验证**

打开 URL → `admin` / `1q2w3E*`（ABP 默认初始密码）登录 → 进入后台首页、有「Administration」菜单。验证后 `Ctrl+C` 停服。

- [ ] **Step 4: 写 RUN.md 并提交**

Create `RUN.md`：写清「先 `dotnet run --project src/Homework.DbMigrator`，再 `dotnet run --project src/Homework.Web`；默认 admin 账号；本地地址」。
Run:
```bash
git -C /d/WorkSpaces/night-king/Homework add -A && git -C /d/WorkSpaces/night-king/Homework commit -m "docs: add RUN.md with local run steps"
```
Expected: 提交成功。

---

## Chunk 2: 领域地基——`ChildProfile` 与两个孩子播种

> 本 chunk 起用 TDD（`@superpowers:test-driven-development`），ABP 惯例参考 `@abp82`。

### Task 5: 新增 `ChildProfile` 聚合根 + DbContext + 迁移

**Files:**
- Create: `src/Homework.Domain/Children/ChildProfile.cs`
- Create: `src/Homework.Domain/Children/GradeConsts.cs`
- Modify: `src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`
- Modify: `src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContextModelCreatingExtensions.cs`
- Test: `test/Homework.Domain.Tests/Children/ChildProfile_Tests.cs`

- [ ] **Step 1: 写失败测试——`ChildProfile` 构造校验姓名/年级**

```csharp
// ChildProfile_Tests.cs
using System;
using Shouldly;
using Xunit;

namespace Homework.Children;

public class ChildProfile_Tests
{
    [Fact]
    public void Should_Create_Valid_ChildProfile()
    {
        var child = new ChildProfile(Guid.NewGuid(), Guid.NewGuid(), "哥哥", 3);
        child.DisplayName.ShouldBe("哥哥");
        child.Grade.ShouldBe(3);
        child.Pin.ShouldBeNull();
    }

    [Fact]
    public void Should_Reject_Empty_DisplayName()
        => Should.Throw<Exception>(() => new ChildProfile(Guid.NewGuid(), Guid.NewGuid(), " ", 1));

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    public void Should_Reject_OutOfRange_Grade(int grade)
        => Should.Throw<ArgumentException>(() => new ChildProfile(Guid.NewGuid(), Guid.NewGuid(), "弟弟", grade));
}
```

- [ ] **Step 2: 跑测试确认失败**

Run:
```bash
dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~ChildProfile_Tests
```
Expected: 编译失败/红——`ChildProfile` 不存在。

- [ ] **Step 3: 实现 `GradeConsts` 与 `ChildProfile`**

```csharp
// GradeConsts.cs
namespace Homework.Children;
public static class GradeConsts { public const int Min = 1; public const int Max = 12; }
```
```csharp
// ChildProfile.cs
using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Children;

/// <summary>孩子的游戏档案（1:1 关联一个 Child 身份用户）。CreatedByParentId 用 FullAudited 的 CreatorId 顶替（见 spec §6）。</summary>
public class ChildProfile : FullAuditedAggregateRoot<Guid>
{
    public Guid IdentityUserId { get; private set; }
    public string DisplayName { get; private set; }
    public int Grade { get; private set; }
    public string? AvatarKey { get; private set; }
    public string? Pin { get; private set; }        // 可选 4 位 PIN，登录逻辑在后续阶段
    public Guid? ActivePetId { get; private set; }

    protected ChildProfile() { }

    public ChildProfile(Guid id, Guid identityUserId, [NotNull] string displayName, int grade) : base(id)
    {
        IdentityUserId = identityUserId;
        SetDisplayName(displayName);
        SetGrade(grade);
    }

    public ChildProfile SetDisplayName([NotNull] string displayName)
    {
        DisplayName = Check.NotNullOrWhiteSpace(displayName, nameof(displayName), maxLength: 32);
        return this;
    }

    public ChildProfile SetGrade(int grade)
    {
        if (grade < GradeConsts.Min || grade > GradeConsts.Max)
            throw new ArgumentException($"grade must be within [{GradeConsts.Min},{GradeConsts.Max}]", nameof(grade));
        Grade = grade;
        return this;
    }

    public void SetAvatar(string? avatarKey) => AvatarKey = avatarKey;
    public void SetPin(string? pin) => Pin = pin;
    public void SetActivePet(Guid? petId) => ActivePetId = petId;
}
```

- [ ] **Step 4: 加入 DbContext 与表映射**

`HomeworkDbContext.cs` 加：`public DbSet<ChildProfile> ChildProfiles { get; set; }`（并 `using Homework.Children;`）。
`HomeworkDbContextModelCreatingExtensions.cs` 的 `ConfigureHomework(...)` 内加：
```csharp
builder.Entity<ChildProfile>(b =>
{
    b.ToTable(HomeworkConsts.DbTablePrefix + "ChildProfiles", HomeworkConsts.DbSchema);
    b.ConfigureByConvention();
    b.Property(x => x.DisplayName).IsRequired().HasMaxLength(32);
    b.Property(x => x.AvatarKey).HasMaxLength(64);
    b.Property(x => x.Pin).HasMaxLength(8);
    b.HasIndex(x => x.IdentityUserId).IsUnique();
});
```
（`HomeworkConsts.DbTablePrefix`/`DbSchema` 为生成模板里的常量，按实际引用；默认前缀 `App`。）

- [ ] **Step 5: 跑领域测试确认通过**

Run:
```bash
dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~ChildProfile_Tests
```
Expected: 绿——3 个测试全过。

- [ ] **Step 6: 生成并检视迁移**

Run:
```bash
dotnet ef migrations add Added_ChildProfile -p src/Homework.EntityFrameworkCore -s src/Homework.EntityFrameworkCore
```
Expected: `.../Migrations/*_Added_ChildProfile.cs` 生成，`Up()` 建 `AppChildProfiles` 表，含 `DisplayName/Grade/AvatarKey/Pin/IdentityUserId`。

- [ ] **Step 7: 应用迁移并核对表（非交互）**

Run:
```bash
dotnet run --project src/Homework.DbMigrator
"D:/Programs/mysql-9.6.0-winx64/bin/mysql.exe" -u root -p"123@abc" -e "SHOW COLUMNS FROM Homework.AppChildProfiles;"
```
Expected: DbMigrator 成功；表存在、列齐全。

- [ ] **Step 8: 提交**

Run:
```bash
git -C /d/WorkSpaces/night-king/Homework add -A
git -C /d/WorkSpaces/night-king/Homework commit -m "feat(domain): add ChildProfile aggregate + EF mapping + migration"
```
Expected: 提交成功。

---

### Task 6: 定义 `Child` 角色并播种两个孩子

**Files:**
- Create: `src/Homework.Domain.Shared/HomeworkRoles.cs`
- Modify: `src/Homework.Domain/Data/HomeworkDataSeederContributor.cs`（模板通常已生成此类）
- Test: `test/Homework.Domain.Tests/Data/ChildrenSeed_Tests.cs`

- [ ] **Step 1: 写失败测试——播种后应有 `Child` 角色与 2 个 `ChildProfile`**

```csharp
// ChildrenSeed_Tests.cs
using System.Linq;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp.Data;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Identity;
using Xunit;

namespace Homework.Data;

public class ChildrenSeed_Tests : HomeworkDomainTestBase<HomeworkDomainTestModule>
{
    private readonly IDataSeeder _dataSeeder;
    private readonly IRepository<Children.ChildProfile, System.Guid> _childRepo;
    private readonly IIdentityRoleRepository _roleRepo;

    public ChildrenSeed_Tests()
    {
        _dataSeeder = GetRequiredService<IDataSeeder>();
        _childRepo = GetRequiredService<IRepository<Children.ChildProfile, System.Guid>>();
        _roleRepo = GetRequiredService<IIdentityRoleRepository>();
    }

    [Fact]
    public async Task Should_Seed_Child_Role_And_Two_Children()
    {
        await _dataSeeder.SeedAsync(new DataSeedContext());

        (await _roleRepo.FindByNormalizedNameAsync("CHILD")).ShouldNotBeNull();

        var children = await _childRepo.GetListAsync();
        children.Count.ShouldBe(2);
        children.Select(c => c.Grade).OrderBy(g => g).ShouldBe(new[] { 1, 3 });
    }
}
```
（基类名 `HomeworkDomainTestBase<HomeworkDomainTestModule>` 对齐生成的 `SampleDomainTests`；若生成物类名带前缀，按实际改。）

- [ ] **Step 2: 跑测试确认失败**

Run:
```bash
dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~ChildrenSeed_Tests
```
Expected: 红——角色/孩子未播种。

- [ ] **Step 3: 定义角色常量**

```csharp
// HomeworkRoles.cs
namespace Homework;
public static class HomeworkRoles
{
    public const string Parent = "Parent"; // 家长；直接复用 admin，Parent 留作语义/扩展
    public const string Child = "Child";   // 孩子：仅能访问自己的游戏数据
}
```

- [ ] **Step 4: 实现幂等播种**

在 `HomeworkDataSeederContributor`（注入具体类型 `IdentityRoleManager`、`IdentityUserManager`、`IGuidGenerator`、`IRepository<ChildProfile,Guid>`；注意 ABP 是 `IdentityRoleManager`/`IdentityUserManager` 具体类，非 `I`-前缀接口）的 `SeedAsync` 加：
```csharp
public async Task SeedAsync(DataSeedContext context)
{
    if (await _roleManager.FindByNameAsync(HomeworkRoles.Child) == null)
        (await _roleManager.CreateAsync(new IdentityRole(_guidGenerator.Create(), HomeworkRoles.Child))).CheckErrors();

    await EnsureChildAsync("gege", "哥哥", 3);
    await EnsureChildAsync("didi", "弟弟", 1);
}

private async Task EnsureChildAsync(string userName, string displayName, int grade)
{
    var user = await _userManager.FindByNameAsync(userName);
    if (user == null)
    {
        // 有意：Phase 1 不设密码，孩子登录在后续阶段实现；此处只需其出现在 Identity 且带 Child 角色
        user = new IdentityUser(_guidGenerator.Create(), userName, $"{userName}@homework.local");
        (await _userManager.CreateAsync(user)).CheckErrors();
        (await _userManager.AddToRoleAsync(user, HomeworkRoles.Child)).CheckErrors();
    }
    if (await _childRepo.FindAsync(c => c.IdentityUserId == user.Id) == null)
        await _childRepo.InsertAsync(new ChildProfile(_guidGenerator.Create(), user.Id, displayName, grade));
}
```
（`CheckErrors()` 在 `Volo.Abp.Identity` 命名空间；`IdentityResult` 扩展。）

- [ ] **Step 5: 跑测试确认通过**

Run:
```bash
dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~ChildrenSeed_Tests
```
Expected: 绿——角色存在、2 孩子、年级 {1,3}。

- [ ] **Step 6: 实跑 DbMigrator 落库核对（非交互）**

Run:
```bash
dotnet run --project src/Homework.DbMigrator
"D:/Programs/mysql-9.6.0-winx64/bin/mysql.exe" -u root -p"123@abc" -e "SELECT DisplayName,Grade FROM Homework.AppChildProfiles; SELECT Name FROM Homework.AbpRoles WHERE Name='Child';"
```
Expected: 两行孩子（哥哥/3、弟弟/1）；`Child` 角色存在。

- [ ] **Step 7: 全量测试 + 提交**

Run:
```bash
dotnet test Homework.sln
git -C /d/WorkSpaces/night-king/Homework add -A
git -C /d/WorkSpaces/night-king/Homework commit -m "feat(domain): seed Child role and two child profiles (idempotent)"
```
Expected: 测试全绿；提交成功。

---

### Task 7: 收尾——Phase 1 验收

**Files:** 无（验收）

- [ ] **Step 1: 端到端复核**
  - `dotnet build Homework.sln` 成功
  - `dotnet test Homework.sln` 全绿
  - DbMigrator 可重复运行不报错（幂等）
  - `dotnet run --project src/Homework.Web` 能起、admin 可登录、后台 Identity 有 `gege`/`didi` 且带 `Child` 角色
- [ ] **Step 2: 更新 spec §12**：若触发「MySQL 9.x 固定版本」备注，如实记录。
- [ ] **Step 3: Phase 1 完成提交**
```bash
git -C /d/WorkSpaces/night-king/Homework add -A
git -C /d/WorkSpaces/night-king/Homework commit -m "chore: Phase 1 (foundation & accounts) complete" --allow-empty
```

---

## Phase 1 完成的产出
可运行的 ABP 10 MVC + MySQL 单体：家长（admin）可登录后台；`Child` 角色与两个孩子账号 + `ChildProfile`（哥哥/三年级、弟弟/一年级）已播种、有测试护航。**下一阶段（Phase 2：任务引擎与记分账本）在此地基上做 TDD。**
