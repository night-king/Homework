# Phase 1 — 地基与账号 Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (if subagents available) or `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 ABP 10 CLI 搭起一个能跑起来、连上 MySQL、有家长管理员登录、并已播种两个孩子账号与 `ChildProfile` 的最小可运行地基。

**Architecture:** 单体 ABP MVC 解决方案（DDD 分层：Domain / Application / EntityFrameworkCore / HttpApi / Web / DbMigrator）。ABP 样板由 `abp new` 生成；本阶段只在生成物上新增一个聚合根 `ChildProfile`、一个 `Child` 角色、和一个数据播种器。基础设施步骤"运行即验证"，领域逻辑走 TDD。

**Tech Stack:** ABP CLI 10.4.x · .NET 10 · EF Core 10 + Pomelo MySQL · MySQL 9.6 · LeptonX-Lite 主题 · xUnit（ABP 生成的测试工程）

**Spec:** `docs/superpowers/specs/2026-07-04-kids-homework-pet-game-design.md`（§3 角色、§6 领域模型、§7 架构）

---

## 前置决策（执行前先确认，因为 `abp new` 之后难改）

- [ ] **解决方案名 / 根命名空间**：默认 `NightKing.Homework`（生成 `./NightKing.Homework/` 子目录，与已有 `docs/` 并存）。如需改，改本计划里所有 `NightKing.Homework`。
- [ ] **孩子游戏端产品名**：默认「学习小伙伴」（仅显示用，后续可改本地化）。
- [ ] **MySQL 服务端**：确认本机 MySQL 9.6 **服务已启动**、拿到可用账号密码（默认按 `root` 规划）。连接串占位见 Task 3，执行时替换真实密码。
- [ ] **MySQL 9.x 兼容性**：MySQL 9.6 较新，Task 3 含一步用 `ServerVersion.AutoDetect` 探测；若 Pomelo 报版本不支持，退回固定 `MySqlServerVersion(new Version(8,4,0))` 并记录（见 Task 3 备注）。

---

## Chunk 1: 脚手架与运行（Scaffold & Run）

### Task 1: 生成 ABP 10 MVC + MySQL 解决方案

**Files:**
- Create: `NightKing.Homework/`（整套解决方案，由 CLI 生成）

- [ ] **Step 1: 在仓库根确认工具与目录**

Run:
```bash
cd /d/WorkSpaces/night-king/Homework
abp --version && dotnet --version && ls
```
Expected: 打印 `ABP CLI 10.4.1`、`10.0.201`；`ls` 能看到 `docs`、`.gitignore`（尚无 `NightKing.Homework`）。

- [ ] **Step 2: 生成解决方案**

Run:
```bash
abp new NightKing.Homework -u mvc -m none --dbms mysql -csf true
```
Expected: 生成 `./NightKing.Homework/` 子目录（内含 `src/` 与 `test/`），CLI 自动执行 `abp install-libs`（拉取前端库）；末尾提示创建成功。耗时数分钟。

- [ ] **Step 3: 核对生成的分层结构**

Run:
```bash
ls NightKing.Homework/src
```
Expected: 看到
`NightKing.Homework.Domain.Shared`、`...Domain`、`...Application.Contracts`、`...Application`、`...EntityFrameworkCore`、`...HttpApi`、`...HttpApi.Client`、`...Web`、`...DbMigrator` 九个项目。

- [ ] **Step 4: 编译一次确保生成物可构建**

Run:
```bash
dotnet build NightKing.Homework
```
Expected: `Build succeeded`，0 error。（首次会还原大量 NuGet 包，稍慢。）

- [ ] **Step 5: 更新根 `.gitignore` 并提交脚手架**

在根 `.gitignore` 追加 .NET 忽略项（若生成的子目录已带 `.gitignore` 亦保留）：
```gitignore
# .NET / ABP
[Bb]in/
[Oo]bj/
*.user
.vs/
NightKing.Homework/**/wwwroot/libs/
NightKing.Homework/**/logs/
```

Run:
```bash
git -C /d/WorkSpaces/night-king/Homework add -A
git -C /d/WorkSpaces/night-king/Homework commit -m "chore: scaffold ABP 10 MVC + MySQL solution (NightKing.Homework)"
```
Expected: 提交成功；`git status` 干净。

---

### Task 2: 让前端库与本地化就绪（冒烟前置）

**Files:**
- Modify: `NightKing.Homework/src/NightKing.Homework.Web`（仅在缺库时）

- [ ] **Step 1: 确认前端库已安装**

Run:
```bash
ls NightKing.Homework/src/NightKing.Homework.Web/wwwroot/libs | head
```
Expected: 存在 `abp`、`bootstrap`、`jquery` 等目录。若为空，执行下一步。

- [ ] **Step 2:（仅当上一步为空）手动安装前端库**

Run:
```bash
cd /d/WorkSpaces/night-king/Homework/NightKing.Homework/src/NightKing.Homework.Web && abp install-libs
```
Expected: 库安装完成，`wwwroot/libs` 填充。

---

### Task 3: 配置 MySQL 连接并运行 DbMigrator（建库+种子）

**Files:**
- Modify: `NightKing.Homework/src/NightKing.Homework.DbMigrator/appsettings.json`
- Modify: `NightKing.Homework/src/NightKing.Homework.Web/appsettings.json`
- （备注）可能 Modify: `NightKing.Homework/src/NightKing.Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkEntityFrameworkCoreModule.cs`

- [ ] **Step 1: 确认 MySQL 服务端可连**

Run（替换真实密码）：
```bash
"D:/Programs/mysql-9.6.0-winx64/bin/mysql.exe" -u root -p -e "SELECT VERSION();"
```
Expected: 打印 `9.6.0`。若连不上，先启动 MySQL 服务再继续。

- [ ] **Step 2: 写入连接串**

把两个 `appsettings.json` 的 `ConnectionStrings:Default` 改为（替换 `YOUR_PWD`）：
```json
"ConnectionStrings": {
  "Default": "Server=localhost;Port=3306;Database=NightKingHomework;Uid=root;Pwd=YOUR_PWD;SslMode=None;"
}
```
Expected: 两处一致。（`abp new --dbms mysql` 已默认写好 MySQL 串，此处仅替换库名与密码。）

- [ ] **Step 3: 运行 DbMigrator 建库、迁移、播种管理员**

Run:
```bash
dotnet run --project NightKing.Homework/src/NightKing.Homework.DbMigrator
```
Expected: 日志出现 `Started database migrations...` → 创建 `NightKingHomework` 库、应用初始迁移、播种 `admin` 用户与 OpenIddict 数据 → `Successfully completed ... database migrations.`。

- [ ] **Step 4: 核对库已建**

Run:
```bash
"D:/Programs/mysql-9.6.0-winx64/bin/mysql.exe" -u root -p -e "SHOW DATABASES LIKE 'NightKingHomework'; SELECT UserName FROM NightKingHomework.AbpUsers;"
```
Expected: 列出 `NightKingHomework`；`AbpUsers` 含 `admin`。

> **备注（MySQL 9.x 兼容）**：若 Step 3 报 Pomelo 无法识别服务器版本，打开 `HomeworkEntityFrameworkCoreModule.cs`，把 `UseMySQL`/`options.UseMySql(...)` 的版本参数由 `ServerVersion.AutoDetect(connectionString)` 暂时改为固定 `new MySqlServerVersion(new Version(8, 4, 0))`，重跑 Step 3，并在 spec §12 风险处标注。

- [ ] **Step 5: 提交配置**

Run:
```bash
git -C /d/WorkSpaces/night-king/Homework add -A
git -C /d/WorkSpaces/night-king/Homework commit -m "chore: configure MySQL connection and run initial DbMigrator"
```
Expected: 提交成功。（注意：不要把真实密码提交到公共仓库——本项目为私有自部署，可接受；若担心，改用 user-secrets。）

---

### Task 4: 冒烟——跑起来并用 admin 登录

**Files:** 无（仅运行验证）

- [ ] **Step 1: 信任本地 https 证书（首次）**

Run:
```bash
dotnet dev-certs https --trust
```
Expected: 证书已受信任（或提示已存在）。

- [ ] **Step 2: 启动 Web**

Run:
```bash
dotnet run --project NightKing.Homework/src/NightKing.Homework.Web
```
Expected: 控制台打印监听地址（如 `https://localhost:443xx`）；无致命异常。

- [ ] **Step 3: 浏览器登录验证**

打开控制台给出的 URL → 用 `admin` / `1q2w3E*`（ABP 默认初始密码）登录。
Expected: 进入 ABP 后台首页；左侧有「Administration」菜单（Identity/角色/用户）。验证后回终端 `Ctrl+C` 停服。

- [ ] **Step 4: 记一条运行说明到 README**

Create `NightKing.Homework/RUN.md`，写清：先跑 DbMigrator，再 `dotnet run --project src/NightKing.Homework.Web`，默认 admin 账号与本地地址。
Run:
```bash
git -C /d/WorkSpaces/night-king/Homework add -A && git -C /d/WorkSpaces/night-king/Homework commit -m "docs: add RUN.md with local run steps"
```
Expected: 提交成功。

---

## Chunk 2: 领域地基——`ChildProfile` 与两个孩子播种

> 本 chunk 起用 TDD：先写失败测试 → 跑红 → 最小实现 → 跑绿 → 提交。参考 `@superpowers:test-driven-development`、ABP 分层惯例 `@abp82`。

### Task 5: 新增 `ChildProfile` 聚合根 + DbContext + 迁移

**Files:**
- Create: `NightKing.Homework/src/NightKing.Homework.Domain/Children/ChildProfile.cs`
- Create: `NightKing.Homework/src/NightKing.Homework.Domain/Children/Grade.cs`
- Modify: `NightKing.Homework/src/NightKing.Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`
- Modify: `NightKing.Homework/src/NightKing.Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContextModelCreatingExtensions.cs`
- Test: `NightKing.Homework/test/NightKing.Homework.Domain.Tests/Children/ChildProfile_Tests.cs`

- [ ] **Step 1: 写失败测试——创建 `ChildProfile` 会校验姓名非空、年级范围**

```csharp
// ChildProfile_Tests.cs
using System;
using Shouldly;
using Xunit;

namespace NightKing.Homework.Children;

public class ChildProfile_Tests
{
    [Fact]
    public void Should_Create_Valid_ChildProfile()
    {
        var id = Guid.NewGuid();
        var child = new ChildProfile(id, identityUserId: Guid.NewGuid(), displayName: "哥哥", grade: 3);

        child.DisplayName.ShouldBe("哥哥");
        child.Grade.ShouldBe(3);
        child.Pin.ShouldBeNull();
    }

    [Fact]
    public void Should_Reject_Empty_DisplayName()
    {
        Should.Throw<ArgumentException>(() =>
            new ChildProfile(Guid.NewGuid(), Guid.NewGuid(), displayName: " ", grade: 1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    public void Should_Reject_OutOfRange_Grade(int grade)
    {
        Should.Throw<ArgumentException>(() =>
            new ChildProfile(Guid.NewGuid(), Guid.NewGuid(), displayName: "弟弟", grade: grade));
    }
}
```

- [ ] **Step 2: 跑测试确认失败**

Run:
```bash
dotnet test NightKing.Homework/test/NightKing.Homework.Domain.Tests --filter ChildProfile_Tests
```
Expected: 编译失败 / 红——`ChildProfile` 尚不存在。

- [ ] **Step 3: 实现 `Grade` 常量与 `ChildProfile` 聚合根**

```csharp
// Grade.cs
namespace NightKing.Homework.Children;

public static class GradeConsts
{
    public const int Min = 1;
    public const int Max = 12;
}
```

```csharp
// ChildProfile.cs
using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace NightKing.Homework.Children;

/// <summary>孩子的游戏档案（1:1 关联一个 Child 身份用户）。</summary>
public class ChildProfile : FullAuditedAggregateRoot<Guid>
{
    public Guid IdentityUserId { get; private set; }
    public string DisplayName { get; private set; }
    public int Grade { get; private set; }
    public string? AvatarKey { get; private set; }
    public string? Pin { get; private set; }          // 可选 4 位 PIN（明文/哈希由 App 层决定，本阶段仅占位）
    public Guid? ActivePetId { get; private set; }

    protected ChildProfile() { }

    public ChildProfile(Guid id, Guid identityUserId, [NotNull] string displayName, int grade)
        : base(id)
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
        {
            throw new ArgumentException($"grade must be within [{GradeConsts.Min},{GradeConsts.Max}]", nameof(grade));
        }
        Grade = grade;
        return this;
    }

    public void SetAvatar(string? avatarKey) => AvatarKey = avatarKey;
    public void SetPin(string? pin) => Pin = pin;
    public void SetActivePet(Guid? petId) => ActivePetId = petId;
}
```

- [ ] **Step 4: 把实体加入 DbContext 并配置表映射**

在 `HomeworkDbContext.cs` 加：
```csharp
public DbSet<ChildProfile> ChildProfiles { get; set; }
```
在 `HomeworkDbContextModelCreatingExtensions.cs` 的 `ConfigureHomework(this ModelBuilder builder)` 内加：
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
（若 `HomeworkConsts` 无 `DbTablePrefix`/`DbSchema`，用生成模板里已有的常量名；ABP 模板通常在 `Domain.Shared` 的 `*Consts` 或 EFCore 项目里定义，按实际引用。）

- [ ] **Step 5: 跑领域测试确认通过**

Run:
```bash
dotnet test NightKing.Homework/test/NightKing.Homework.Domain.Tests --filter ChildProfile_Tests
```
Expected: 绿——3 个测试全过。

- [ ] **Step 6: 生成并检视 EF 迁移**

Run:
```bash
dotnet ef migrations add Added_ChildProfile \
  -p NightKing.Homework/src/NightKing.Homework.EntityFrameworkCore \
  -s NightKing.Homework/src/NightKing.Homework.EntityFrameworkCore
```
Expected: 在 `.../Migrations` 生成 `*_Added_ChildProfile.cs`，`Up()` 里 `CreateTable` 名为 `AppChildProfiles`（或按前缀），含 `DisplayName/Grade/AvatarKey/Pin/IdentityUserId` 等列。

- [ ] **Step 7: 应用迁移（跑 DbMigrator）并核对表**

Run:
```bash
dotnet run --project NightKing.Homework/src/NightKing.Homework.DbMigrator
"D:/Programs/mysql-9.6.0-winx64/bin/mysql.exe" -u root -p -e "SHOW COLUMNS FROM NightKingHomework.AppChildProfiles;"
```
Expected: DbMigrator 成功；`AppChildProfiles` 表存在且列齐全。

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
- Modify: `NightKing.Homework/src/NightKing.Homework.Domain/Data/HomeworkDataSeederContributor.cs`（若模板未生成则 Create）
- Create: `NightKing.Homework/src/NightKing.Homework.Domain.Shared/HomeworkRoles.cs`
- Test: `NightKing.Homework/test/NightKing.Homework.Domain.Tests/Data/ChildrenSeed_Tests.cs`

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

namespace NightKing.Homework.Data;

public class ChildrenSeed_Tests : HomeworkDomainTestBase
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
        await _dataSeeder.SeedAsync();

        (await _roleRepo.FindByNormalizedNameAsync("CHILD")).ShouldNotBeNull();

        var children = await _childRepo.GetListAsync();
        children.Count.ShouldBe(2);
        children.Select(c => c.Grade).OrderBy(g => g).ShouldBe(new[] { 1, 3 });
    }
}
```
（`HomeworkDomainTestBase` 为 ABP 生成的领域测试基类；实际类名以生成物为准，如 `NightKingHomeworkDomainTestBase`——执行时对齐命名。）

- [ ] **Step 2: 跑测试确认失败**

Run:
```bash
dotnet test NightKing.Homework/test/NightKing.Homework.Domain.Tests --filter ChildrenSeed_Tests
```
Expected: 红——角色/孩子尚未播种（count 0 或断言失败）。

- [ ] **Step 3: 定义角色常量**

```csharp
// HomeworkRoles.cs
namespace NightKing.Homework;

public static class HomeworkRoles
{
    public const string Parent = "Parent"; // 家长；本项目直接复用 admin，Parent 角色留作语义/扩展
    public const string Child = "Child";   // 孩子：仅能访问自己的游戏数据
}
```

- [ ] **Step 4: 实现播种器（幂等）**

在 `HomeworkDataSeederContributor` 的 `SeedAsync` 内加入：创建 `Child` 角色（若不存在）；创建两个孩子身份用户（`gege`/`didi`，赋 `Child` 角色）并各自建 `ChildProfile`（年级 3 / 1，姓名占位「哥哥」「弟弟」，可后续在后台改）。全部先查后建，保证可重复运行。

```csharp
// HomeworkDataSeederContributor.cs（要点，注入 IIdentityRoleManager/IIdentityUserManager/IGuidGenerator/
// ICurrentTenant + IRepository<ChildProfile,Guid>；命名空间与基类按生成物）
public async Task SeedAsync(DataSeedContext context)
{
    // 1) Child 角色
    if (await _roleManager.FindByNameAsync(HomeworkRoles.Child) == null)
    {
        (await _roleManager.CreateAsync(
            new IdentityRole(_guidGenerator.Create(), HomeworkRoles.Child))).CheckErrors();
    }

    // 2) 两个孩子（用户 + 档案），幂等
    await EnsureChildAsync("gege", "哥哥", grade: 3);
    await EnsureChildAsync("didi", "弟弟", grade: 1);
}

private async Task EnsureChildAsync(string userName, string displayName, int grade)
{
    var user = await _userManager.FindByNameAsync(userName);
    if (user == null)
    {
        user = new IdentityUser(_guidGenerator.Create(), userName,
            email: $"{userName}@homework.local");
        (await _userManager.CreateAsync(user)).CheckErrors();
        (await _userManager.AddToRoleAsync(user, HomeworkRoles.Child)).CheckErrors();
    }

    if (await _childRepo.FindAsync(c => c.IdentityUserId == user.Id) == null)
    {
        await _childRepo.InsertAsync(
            new ChildProfile(_guidGenerator.Create(), user.Id, displayName, grade));
    }
}
```
（`CheckErrors()` 为 ABP `Volo.Abp.Identity` 扩展；`.CheckErrors()` 命名空间随生成物 `using`。）

- [ ] **Step 5: 跑测试确认通过**

Run:
```bash
dotnet test NightKing.Homework/test/NightKing.Homework.Domain.Tests --filter ChildrenSeed_Tests
```
Expected: 绿——角色存在、2 个孩子、年级 {1,3}。

- [ ] **Step 6: 实跑 DbMigrator 落库并核对**

Run:
```bash
dotnet run --project NightKing.Homework/src/NightKing.Homework.DbMigrator
"D:/Programs/mysql-9.6.0-winx64/bin/mysql.exe" -u root -p -e "SELECT DisplayName,Grade FROM NightKingHomework.AppChildProfiles; SELECT Name FROM NightKingHomework.AbpRoles WHERE Name='Child';"
```
Expected: 两行孩子（哥哥/3、弟弟/1）；`Child` 角色存在。

- [ ] **Step 7: 全量测试 + 提交**

Run:
```bash
dotnet test NightKing.Homework
git -C /d/WorkSpaces/night-king/Homework add -A
git -C /d/WorkSpaces/night-king/Homework commit -m "feat(domain): seed Child role and two child profiles (idempotent)"
```
Expected: 测试全绿；提交成功。

---

### Task 7: 收尾——Phase 1 验收清单

**Files:** 无（验收）

- [ ] **Step 1: 端到端复核**
  - `dotnet build NightKing.Homework` 成功
  - `dotnet test NightKing.Homework` 全绿
  - DbMigrator 可重复运行不报错（幂等）
  - `dotnet run --project ...Web` 能起、admin 可登录、后台 Identity 里能看到 `gege`/`didi` 两个用户且带 `Child` 角色
- [ ] **Step 2: 更新 spec §12**：若触发了「MySQL 9.x 固定版本」备注，如实记录一句。
- [ ] **Step 3: 打 Phase 1 完成提交/标签**
```bash
git -C /d/WorkSpaces/night-king/Homework add -A
git -C /d/WorkSpaces/night-king/Homework commit -m "chore: Phase 1 (foundation & accounts) complete" --allow-empty
```

---

## Phase 1 完成的产出
一个可运行的 ABP 10 MVC + MySQL 单体：家长（admin）可登录后台；`Child` 角色与两个孩子账号 + `ChildProfile`（哥哥/三年级、弟弟/一年级）已播种、有测试护航。**下一阶段（Phase 2：任务引擎与记分账本）在此地基上做 TDD。**
