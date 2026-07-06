# Phase 4 — 账号体系与家长自助注册 Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (if subagents available) or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`). TDD-heavy——先写失败测试（`@superpowers:test-driven-development`）。ABP 惯例 `@abp82`；本地化 `@abp-localization-fix`；Mapperly 见记忆 `abp-mapperly-mapperbase`（每个映射对一个 `XxxMapper : MapperBase<S,D>`）；末尾冒烟 `@run` / `@superpowers:verification-before-completion`。

**Goal:** 把"播种账号 + 单一家庭"改造成"**家长自助注册 → 家长账号拥有孩子档案**"：家长自助注册即成家长；孩子从登录账号降为家庭名下档案（`ChildProfile.IdentityUserId → ParentId`）；家长后台按登录家长**隔离**各自数据并补上"加/删孩子"；为公网上线、全球榜/PK、变现留好架构。不含孩子游戏端（Phase 5）。

**Architecture:** 单一全局实例、**不做多租户**；家庭隐私靠**按家长 ownership 过滤**（含"按实体 id"的越权写入口）。新增领域服务 `ChildProfileManager` 统一做归属校验；四个 Phase 3 应用服务全部接入。启用 ABP 自助注册 + `Parent` 默认角色（带 `ParentAdmin`）。一次 EF 迁移。

**Tech Stack:** ABP 10.5 · .NET 10 · PostgreSQL/Npgsql · EF Core 10 · ABP Account/Identity/OpenIddict · Mapperly · xUnit/Shouldly（SQLite in-memory）。

**Spec:** `docs/superpowers/specs/2026-07-04-phase4-accounts-registration-design.md`

---

## File Structure（决策锁定）

**Domain（改）**
- Modify `src/Homework.Domain/Children/ChildProfile.cs` — `IdentityUserId → ParentId`，构造器改签名。
- Create `src/Homework.Domain/Children/ChildProfileManager.cs` — 归属校验领域服务。
- Modify `src/Homework.Domain/Scoring/FamilyGoal.cs` — 加 `ParentId` + 构造器。
- Modify `src/Homework.Domain/Scoring/FamilyGoalProgressService.cs` — 进度收窄到本家庭 childId 集合。

**EntityFrameworkCore（改）**
- Modify `src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs` — ChildProfile 索引 `(ParentId)`（去 `IdentityUserId` 唯一索引）、FamilyGoal 无需索引改动（可选 `(ParentId)`）。
- Migration: `Reworked_Accounts`。

**Application(.Contracts)（改）**
- Modify `Children/Dtos/ChildProfileDto.cs`（去 `IdentityUserId`）、`Children/IChildProfileAppService.cs`（加 Create/Delete）；Create DTO 新增。
- Modify `HomeworkApplicationMappers.cs`（ChildProfileMapper 去 `IdentityUserId`）。
- Modify 四个 AppService：`Children/ChildProfileAppService`、`Tasks/WeeklyTaskTemplateAppService`、`Tasks/DailyTaskAppService`、`Scoring/FamilyGoalAppService`。
- Modify `Scoring/Dtos/CreateUpdateFamilyGoalDto`? 否——ParentId 由服务从 CurrentUser 填，不入 DTO。
- Modify `src/Homework.Application/Data/ParentPermissionDataSeedContributor.cs`（授 Parent + admin）。

**Domain seed（改）**
- Modify `src/Homework.Domain/Data/ChildrenDataSeedContributor.cs` — 播示例家庭（1 家长 + 2 档案），不建孩子登录账号；建 `Parent` 默认角色。

**Web（改）**
- Modify `src/Homework.Web/HomeworkWebModule.cs` / 注册页 — 启用自助注册 + 同意勾选（实现时定，见 Chunk 2）。
- Modify `Pages/ParentAdmin/Children/`（Index + 新增 CreateModal + 删除行操作）+ 本地化。

**Test**
- Create `test/.../Children/ChildProfileManager_Tests.cs`（Task 0.2）。
- Create 归属隔离测试：`test/.../Accounts/OwnershipIsolation_Tests.cs`（Task 1.3，两个家长上下文）。
- **改（ownership 会打破，需补种 `ChildProfile`——见 Task 1.2/1.3 Step 4）**：`Children/ChildProfileAppService_Tests.cs`、`Tasks/WeeklyTaskTemplateAppService_Tests.cs`、`Tasks/DailyTaskAppService_Tests.cs`、`Scoring/FamilyGoalAppService_Tests.cs`、`Scoring/FamilyGoalProgress_Tests.cs`（后加 `FamilyGoal.parentId` 参数 + 为造分的娃建档案）。

---

## Chunk 0: Domain 改造 + 迁移

> **本 chunk 是跨层 rename 重构**（非新增行为）：`ChildProfile.IdentityUserId→ParentId`、`FamilyGoal` 加 `ParentId` 会**连带**打断同项目/跨项目的调用方（种子器、DTO/mapper、FamilyGoal 各调用方、若干测试）。规则：**每个实体改动与其全部编译连带在同一 task/commit 内改到 `dotnet build Homework.slnx` 绿**，行为不变、既有测试保持绿。

### Task 0.1: `ChildProfile.IdentityUserId → ParentId`（跨层 rename，一次到 build 绿）

**Files:** Modify `src/Homework.Domain/Children/ChildProfile.cs`、`src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`、`src/Homework.Application.Contracts/Children/Dtos/ChildProfileDto.cs`、`src/Homework.Domain/Data/ChildrenDataSeedContributor.cs`、`test/Homework.Domain.Tests/Children/ChildProfile_Tests.cs`。

- [ ] **Step 1: 实体** — `ChildProfile.cs`：`public Guid IdentityUserId { get; private set; }` → `public Guid ParentId { get; private set; }`；构造器参数 `identityUserId` → `parentId`、赋值 `ParentId = parentId;`。（构造器参数个数不变。）
- [ ] **Step 2: DbContext 索引** — `HomeworkDbContext`：`b.HasIndex(x => x.IdentityUserId).IsUnique();` → `b.HasIndex(x => x.ParentId);`。
- [ ] **Step 3: DTO 去字段** — `ChildProfileDto.cs` 删 `public Guid IdentityUserId { get; set; }`（`ParentId` **不外泄**、不加进 DTO）。`ChildProfileMapper` **无需动**：去掉 DTO 目标后，源属性 `ParentId` 未映射——Mapperly 对未映射**源**只告警不报错（`Pin`/`ActivePetId` 早已如此）。
- [ ] **Step 4: 同项目种子器编译连带（临时补丁）** — `ChildrenDataSeedContributor.cs` 把谓词 `c.IdentityUserId == user.Id`（约第 60 行）改成 `c.ParentId == user.Id`（`new ChildProfile(guid, user.Id, ...)` 参数仍是 Guid、无需改）。**说明**：此刻语义仍是旧的，只为让 `Homework.Domain` 编过；**Task 2.3 会把整个种子器重写成"示例家庭"**。
- [ ] **Step 5: 域测试加断言** — `ChildProfile_Tests.cs` 加：
```csharp
[Fact]
public void Exposes_ParentId()
{
    var parentId = Guid.NewGuid();
    var c = new ChildProfile(Guid.NewGuid(), parentId, "哥哥", 3);
    c.ParentId.ShouldBe(parentId);
}
```
（原有姓名/年级校验用例不动——构造器参数个数不变。）
- [ ] **Step 6: build + 域测试绿** — Run: `dotnet build Homework.slnx` → 成功；`dotnet test test/Homework.Domain.Tests/Homework.Domain.Tests.csproj` → 绿（行为未变）。
- [ ] **Step 7: 提交** — `refactor(children): ChildProfile.IdentityUserId -> ParentId (cascade to build-green)`。

### Task 0.2: `ChildProfileManager` 归属校验（TDD，集成测试）

**Files:** Create `src/Homework.Domain/Children/ChildProfileManager.cs`；Create `test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Children/ChildProfileManager_Tests.cs`。

- [ ] **Step 1: 写失败测试** — 用 `ICurrentPrincipalAccessor.Change` 切换两个家长，验证：`GetOwnedAsync(自己的娃)` 成功；`GetOwnedAsync/EnsureChildOwnedAsync(别家的娃)` 抛 `EntityNotFoundException`；`GetOwnedChildIdsAsync` 只返回当前家长的娃。
```csharp
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Children;
using Shouldly;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Children;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class ChildProfileManager_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly ChildProfileManager _manager;
    private readonly IRepository<ChildProfile, Guid> _repo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public ChildProfileManager_Tests()
    {
        _manager = GetRequiredService<ChildProfileManager>();
        _repo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    private async Task<Guid> SeedChildAsync(Guid parentId)
    {
        var id = _guid.Create();
        await WithUnitOfWorkAsync(async () => await _repo.InsertAsync(new ChildProfile(id, parentId, "娃", 3)));
        return id;
    }

    [Fact]
    public async Task Owner_Can_Get_Own_Child_But_Not_Others()
    {
        var pA = _guid.Create();
        var pB = _guid.Create();
        var childOfA = await SeedChildAsync(pA);

        using (_principal.Change(Parent(pA)))
        {
            await WithUnitOfWorkAsync(async () => (await _manager.GetOwnedAsync(childOfA)).ShouldNotBeNull());
        }
        using (_principal.Change(Parent(pB)))
        {
            await WithUnitOfWorkAsync(async () =>
                await Should.ThrowAsync<EntityNotFoundException>(async () => await _manager.GetOwnedAsync(childOfA)));
        }
    }

    [Fact]
    public async Task GetOwnedChildIds_Returns_Only_Current_Parents()
    {
        var pA = _guid.Create();
        var pB = _guid.Create();
        var a1 = await SeedChildAsync(pA);
        await SeedChildAsync(pB);

        using (_principal.Change(Parent(pA)))
        {
            await WithUnitOfWorkAsync(async () =>
            {
                var ids = await _manager.GetOwnedChildIdsAsync();
                ids.ShouldContain(a1);
                ids.Count.ShouldBe(1);
            });
        }
    }
}
```

- [ ] **Step 2: 跑红** → `ChildProfileManager` 未实现。

- [ ] **Step 3: 实现** — `ChildProfileManager.cs`：
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;
using Volo.Abp.Users;

namespace Homework.Children;

/// <summary>家庭归属校验：当前登录家长只能碰自己名下的孩子（spec §授权模型）。</summary>
public class ChildProfileManager : DomainService
{
    private readonly IRepository<ChildProfile, Guid> _repository;

    public ChildProfileManager(IRepository<ChildProfile, Guid> repository)
        => _repository = repository;

    private Guid CurrentParentId => CurrentUser.GetId();

    /// <summary>取当前家长名下的孩子；不属于则当作不存在（不泄露"存在但不是你的"）。</summary>
    public async Task<ChildProfile> GetOwnedAsync(Guid childId)
    {
        var child = await _repository.FindAsync(childId);
        if (child == null || child.ParentId != CurrentParentId)
        {
            throw new EntityNotFoundException(typeof(ChildProfile), childId);
        }

        return child;
    }

    /// <summary>校验某 childId 属于当前家长（用于按实体 id 的写操作前置校验）。</summary>
    public Task EnsureChildOwnedAsync(Guid childId) => GetOwnedAsync(childId);

    /// <summary>当前家长名下所有 childId（列表/聚合用）。</summary>
    public async Task<List<Guid>> GetOwnedChildIdsAsync()
    {
        var children = await _repository.GetListAsync(c => c.ParentId == CurrentParentId);
        return children.Select(c => c.Id).ToList();
    }
}
```
（`CurrentUser.GetId()` 在 `Volo.Abp.Users`；未登录会抛，测试里用 `ICurrentPrincipalAccessor.Change` 造家长。）

- [ ] **Step 4: 跑绿** → 通过。
- [ ] **Step 5: 提交** — `feat(children): ChildProfileManager ownership guard (TDD)`。

### Task 0.3: `FamilyGoal` 加 `ParentId`（含全部调用方连带，一次到 build 绿）

> 构造器加 `parentId` 参数会**打断跨项目调用方**——`FamilyGoalAppService.CreateAsync`（Application）和 `FamilyGoalProgress_Tests`（三处 `new FamilyGoal(...)`）。本 task **一并改到 build 绿**；**只加 parentId、暂不加过滤 / 不收窄进度**（那些在 Chunk 1），故既有测试仍绿。

**Files:** Modify `src/Homework.Domain/Scoring/FamilyGoal.cs`、`src/Homework.Application/Scoring/FamilyGoalAppService.cs`、`test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Scoring/FamilyGoalProgress_Tests.cs`、`test/Homework.Domain.Tests/Scoring/FamilyGoal_Tests.cs`（若存在）。

- [ ] **Step 1: 实体** — `FamilyGoal.cs`：加 `public Guid ParentId { get; private set; }`；构造器在 `id` 之后加 `Guid parentId`（放在 `title` 之前）、赋值 `ParentId = parentId;`。
- [ ] **Step 2: 调用方连带（同一 commit）**：
  - `FamilyGoalAppService.CreateAsync`：`new FamilyGoal(GuidGenerator.Create(), CurrentUser.GetId(), input.Title, input.TargetStars, input.StartDate, input.EndDate, input.RewardText)`（加 `using Volo.Abp.Users;`）。**此刻只填 parentId、不加 GetList 过滤**——既有 `FamilyGoalAppService_Tests` 仍绿。
  - `FamilyGoalProgress_Tests`（约 `:47/65/83` 三处 `new FamilyGoal(...)`）：第 2 参数补一个 `Guid`（如 `Guid.NewGuid()`）。**只补参数**，progress 仍聚合全体、测试仍绿。
  - 若有域测试 `FamilyGoal_Tests` 构造 FamilyGoal，同样补参数（并加一条 `ParentId` 断言）。
- [ ] **Step 3: build + 两测试工程绿** — `dotnet build Homework.slnx` → 成功；`dotnet test`（Domain + EFCore）→ 绿。
- [ ] **Step 4: 提交** — `feat(scoring): FamilyGoal.ParentId + caller updates (build-green)`。

### Task 0.4: DbContext（FamilyGoal 索引）+ 迁移

> 排在 0.1（ChildProfile）+ 0.3（FamilyGoal）**之后**，一次迁移捕获两处。ChildProfile 的索引已在 Task 0.1 Step 2 改过。

**Files:** Modify `HomeworkDbContext.cs`；生成迁移。

- [ ] **Step 1: FamilyGoal 索引（可选）** — `HomeworkDbContext` 的 `FamilyGoal` 映射里加 `b.HasIndex(x => x.ParentId);`。
- [ ] **Step 2: 生成迁移（从 EntityFrameworkCore 项目目录跑——`HomeworkDbContextFactory` 按 CWD 找 `../Homework.DbMigrator/appsettings.json`，见 `abp-postgres-stack` 的 run-from-dir 坑；Design 已 pin 10.0.7）** — Run:
  `cd src/Homework.EntityFrameworkCore && dotnet ef migrations add Reworked_Accounts`
  Expected: 迁移把 `AppChildProfiles.IdentityUserId` 换成 `ParentId`（EF 可能识别为删列+加列，可接受，开发库数据可丢）、`AppFamilyGoals` 加 `ParentId`，索引相应变。
- [ ] **Step 3: 编译** — `dotnet build Homework.slnx` → 成功。
- [ ] **Step 4: 提交** — `feat(efcore): Reworked_Accounts migration (ParentId)`。

---

## Chunk 1: 应用服务归属改造 + DTO/mapper

### Task 1.1: ChildProfile 接口 + CreateChildDto

> `ChildProfileDto` 去 `IdentityUserId` 与 mapper 调整**已在 Task 0.1 完成**；这里只加 contracts。

**Files:** Modify `Children/IChildProfileAppService.cs`；Create `Children/Dtos/CreateChildDto.cs`。

- [ ] **Step 1:** `CreateChildDto.cs`：
```csharp
using System.ComponentModel.DataAnnotations;
using Homework.Children;

namespace Homework.Children.Dtos;

public class CreateChildDto
{
    [Required, StringLength(32)] public string DisplayName { get; set; } = string.Empty;
    [Range(GradeConsts.Min, GradeConsts.Max)] public int Grade { get; set; }
    [StringLength(64)] public string? AvatarKey { get; set; }
}
```
- [ ] **Step 2:** `IChildProfileAppService.cs` 加：
```csharp
Task<ChildProfileDto> CreateAsync(CreateChildDto input);
Task DeleteAsync(Guid id);
```
- [ ] **Step 3:** 编译 → 成功。提交随 Task 1.2。

### Task 1.2: `ChildProfileAppService` 归属过滤 + Create/Delete（TDD）

**Files:** Modify `src/Homework.Application/Children/ChildProfileAppService.cs`；Modify `test/.../Children/ChildProfileAppService_Tests.cs`。

- [ ] **Step 1: 改现有测试 + 加用例（先红）** — 现有 3 个用例用**随机 parentId** 建娃，过滤后会失败。改成"用当前家长建娃"：在测试类注入 `ICurrentPrincipalAccessor`，`SeedChildAsync` 改为在一个固定家长 `_parentId` 下建（`new ChildProfile(id, _parentId, ...)`），并在断言前 `using (_principal.Change(Parent(_parentId)))` 包裹调用。加一条：
```csharp
[Fact]
public async Task Create_Sets_Current_Parent_And_Lists_It()
{
    var pid = _guid.Create();
    using (_principal.Change(Parent(pid)))
    {
        var created = await _service.CreateAsync(new() { DisplayName = "新娃", Grade = 2 });
        var list = await _service.GetListAsync();
        list.Items.ShouldContain(c => c.Id == created.Id);
    }
}

[Fact]
public async Task Cannot_See_Other_Parents_Child()
{
    var pA = _guid.Create(); var pB = _guid.Create();
    Guid childOfA;
    using (_principal.Change(Parent(pA)))
        childOfA = (await _service.CreateAsync(new() { DisplayName = "A娃", Grade = 1 })).Id;
    using (_principal.Change(Parent(pB)))
        await Should.ThrowAsync<EntityNotFoundException>(async () => await _service.GetAsync(childOfA));
}
```
（`Parent(Guid)` helper 同 Task 0.2；测试注入 `ICurrentPrincipalAccessor _principal`。）

- [ ] **Step 2: 跑红** → `CreateAsync` 未实现 / 过滤未做。
- [ ] **Step 3: 实现** — 重写 `ChildProfileAppService`：注入 `ChildProfileManager`；`GetList` 按当前家长过滤；`Get/Update/SetPin/Delete` 走 `manager.GetOwnedAsync(id)`；新增 `Create/Delete`：
```csharp
[Authorize(HomeworkPermissions.ParentAdmin)]
public class ChildProfileAppService : HomeworkAppService, IChildProfileAppService
{
    private readonly IRepository<ChildProfile, Guid> _repository;
    private readonly ChildProfileManager _manager;

    public ChildProfileAppService(IRepository<ChildProfile, Guid> repository, ChildProfileManager manager)
    {
        _repository = repository;
        _manager = manager;
    }

    public async Task<ListResultDto<ChildProfileDto>> GetListAsync()
    {
        var parentId = CurrentUser.GetId();
        var children = await _repository.GetListAsync(c => c.ParentId == parentId);
        var dtos = children.OrderBy(c => c.Grade).Select(ToDto).ToList();
        return new ListResultDto<ChildProfileDto>(dtos);
    }

    public async Task<ChildProfileDto> GetAsync(Guid id) => ToDto(await _manager.GetOwnedAsync(id));

    public async Task<ChildProfileDto> CreateAsync(CreateChildDto input)
    {
        var child = new ChildProfile(GuidGenerator.Create(), CurrentUser.GetId(), input.DisplayName, input.Grade);
        child.SetAvatar(input.AvatarKey);
        await _repository.InsertAsync(child, autoSave: true);
        return ToDto(child);
    }

    public async Task<ChildProfileDto> UpdateAsync(Guid id, UpdateChildProfileDto input)
    {
        var child = await _manager.GetOwnedAsync(id);
        child.SetDisplayName(input.DisplayName);
        child.SetGrade(input.Grade);
        child.SetAvatar(input.AvatarKey);
        await _repository.UpdateAsync(child);
        return ToDto(child);
    }

    public async Task SetPinAsync(Guid id, SetChildPinDto input)
    {
        var child = await _manager.GetOwnedAsync(id);
        child.SetPin(string.IsNullOrEmpty(input.Pin) ? null : input.Pin);
        await _repository.UpdateAsync(child);
    }

    public async Task DeleteAsync(Guid id)
    {
        var child = await _manager.GetOwnedAsync(id);
        await _repository.DeleteAsync(child);
    }

    private ChildProfileDto ToDto(ChildProfile child)
    {
        var dto = ObjectMapper.Map<ChildProfile, ChildProfileDto>(child);
        dto.HasPin = !string.IsNullOrEmpty(child.Pin);
        return dto;
    }
}
```
（`using Volo.Abp.Users;` for `CurrentUser.GetId()`。）
- [ ] **Step 4: 跑绿** → 通过。
- [ ] **Step 5: 提交** — `feat(children): ownership filtering + child create/delete (TDD)`。

### Task 1.3: Weekly/Daily/FamilyGoal 归属校验（TDD 隔离用例）

**Files:** Modify `WeeklyTaskTemplateAppService.cs`、`DailyTaskAppService.cs`、`FamilyGoalAppService.cs`、`FamilyGoalProgressService.cs`；Create `test/.../Accounts/OwnershipIsolation_Tests.cs`。

- [ ] **Step 1: 隔离测试（先红）** — `OwnershipIsolation_Tests`：家长 A 建娃 + 模板 + 当日任务 + 大目标；家长 B 上下文里**拿不到 / 改不动**：
  - `WeeklyTemplate.UpdateAsync(A的模板id)` → `EntityNotFoundException`；`GetListAsync(childId=A的娃)` → 空/抛。
  - `DailyTask.UpdateAsync(A的任务id)` / `RevokeAsync` → 抛；`GetBoardAsync(A的娃)` → 抛。
  - `FamilyGoal.UpdateAsync(A的目标id)` → 抛；`GetListAsync()` → 不含 A 的目标。
  （用 `ICurrentPrincipalAccessor.Change` 切 A/B；每类一条断言。）

- [ ] **Step 2: 跑红**。
- [ ] **Step 3: 实现** — 各服务注入 `ChildProfileManager`，在每个入口加校验：
  - **WeeklyTaskTemplateAppService**：`GetListAsync(input)` 开头 `await _manager.EnsureChildOwnedAsync(input.ChildId);`；`CreateAsync` 开头 `EnsureChildOwnedAsync(input.ChildId)`；`UpdateAsync(id)`/`DeleteAsync(id)` 先 `var item = await _repository.GetAsync(id); await _manager.EnsureChildOwnedAsync(item.ChildId);` 再改。
  - **DailyTaskAppService**：`GetBoardAsync`/`CreateAsync` 开头 `EnsureChildOwnedAsync(input.ChildId)`；`UpdateAsync/DeleteAsync/ReviewAsync(id)` 先 `var task = await _repository.GetAsync(id); await _manager.EnsureChildOwnedAsync(task.ChildId);` 再改（注意 `ReviewAsync` 是私有共用点，在那里校验即覆盖 Revoke/Restore）。
  - **FamilyGoalAppService**：`CreateAsync` 用带 `parentId` 的构造器 `new FamilyGoal(GuidGenerator.Create(), CurrentUser.GetId(), ...)`；`GetListAsync` 按 `g.ParentId == CurrentUser.GetId()` 过滤；`GetAsync/UpdateAsync/DeleteAsync(id)` 先加载 → 校验 `goal.ParentId == CurrentUser.GetId()`（否则 `EntityNotFoundException`，可在服务内小 helper `GetOwnedGoalAsync(id)`）。
  - **FamilyGoalProgressService.CalculateStarsAsync(goal)**：把"聚合区间内**全体** DailyScore"改成"聚合区间内**本家庭孩子**的 DailyScore"——注入 `IRepository<ChildProfile,Guid>`，取 `childIds = 该 goal.ParentId 名下孩子`，`Where(s => s.Date in range && childIds.Contains(s.ChildId))` 求和。
- [ ] **Step 4: 修既有测试 + 跑绿（关键：ownership 会打破所有"用随机 childId、却没建 ChildProfile"的旧用例）** — 加了 `EnsureChildOwnedAsync` 后，下列测试的 childId 必须对应一条**归属当前家长的 `ChildProfile`**，否则抛 `EntityNotFoundException`。逐个改：
  - `WeeklyTaskTemplateAppService_Tests`（4 条：Create/List/Update/Delete）、`DailyTaskAppService_Tests`（3 条）：每个用例开头在**当前家长**（默认 `FakeCurrentPrincipalAccessor` 的 admin id，或 `Change()` 的家长）名下 `InsertAsync(new ChildProfile(childId, currentParentId, "娃", 3))`，再用该 `childId` 调服务。
  - `FamilyGoalAppService_Tests.Progress_Sums_Stars_...` + Phase 2 `FamilyGoalProgress_Tests`：进度收窄后只算"本家庭孩子"的星星——这些用例除了给 goal 传 `parentId`，还必须**为造分的 gege/didi 建 `ChildProfile`（`ParentId = 该 goal 的 parentId`）**，否则它们的 `DailyScore` 不归本家庭、聚合收窄为 0，断言失败。
  跑 `dotnet test`（Domain + EFCore 两工程）→ 全绿（新隔离用例 + 修好的既有用例）。
- [ ] **Step 5: 提交** — `feat(app): per-parent ownership on templates/tasks/goals (TDD)`。

---

## Chunk 2: 注册 + 角色 + 种子

### Task 2.1: `Parent` 默认角色 + 授权播种

**Files:** Modify `src/Homework.Domain/Data/ChildrenDataSeedContributor.cs`（或拆一个 RolesSeed）；Modify `src/Homework.Application/Data/ParentPermissionDataSeedContributor.cs`。

- [ ] **Step 1: 建 Parent 默认角色** — 播种里：若无 `Parent` 角色则建 `new IdentityRole(guid, HomeworkRoles.Parent) { IsDefault = true }`（`IsDefault` 使自助注册的新用户自动获得它）。幂等。
- [ ] **Step 2: 授 ParentAdmin 给 Parent + admin** — `ParentPermissionDataSeedContributor` 改为对 **`Parent` 和 `admin` 两个角色** 各 `SeedAsync(RolePermissionValueProvider.ProviderName, roleName, new[]{ ParentAdmin }, context.TenantId)`。
- [ ] **Step 3: 编译** → 成功。提交随 Task 2.3。

### Task 2.2: 启用自助注册 + 同意勾选

**Files:** Modify `src/Homework.Web/HomeworkWebModule.cs`（设置）/ 注册页扩展。

- [ ] **Step 1: 确认/启用自助注册** — ABP `Account.IsSelfRegistrationEnabled` 默认通常为 true（`/Account/Register` 可达）。若需强制开，在设置里配（实现时确认 10.5 的确切设置键/`AbpAccountOptions`）。冒烟以 `/Account/Register` 能打开为准。
- [ ] **Step 2: 同意勾选** — 在注册页加"我已阅读并同意《儿童隐私/家长同意声明》"必勾复选框。落地方式（实现时择一，`@abp82`）：覆盖 `Account/Register` 页（ABP UI 覆盖）追加一个 `required` checkbox；或最小化——先加一段静态声明 + 前端必勾校验。**此步以跑起来目视为准，不写脆弱框架单测。**
- [ ] **Step 3: 提交（随 2.3）**。

### Task 2.3: 种子数据迁移到示例家庭

**Files:** Modify `src/Homework.Domain/Data/ChildrenDataSeedContributor.cs`。

- [ ] **Step 1: 重写播种** — 不再建 `gege/didi` 登录账号；改为：确保一个**示例家长** IdentityUser（`demo@homework.today`，用户名 `demo`，给初始密码，加 `Parent` 角色）存在；在其名下建 2 个 `ChildProfile`（哥哥/3、弟弟/1，`ParentId = demo.Id`）。幂等。保留/另配 `admin` 超管。`Child` 角色本阶段可留可删——**保留**（Phase 5 再定），但不再给谁分配。
- [ ] **Step 2: 应用 + 核对** — Run（各自项目目录，见 `abp-postgres-stack`）：`cd src/Homework.DbMigrator && dotnet run` → 成功；进 PG 核对 `AppChildProfiles.ParentId` 指向 demo、无 gege/didi 登录用户（或用一句 SQL 核对）。
- [ ] **Step 3: 提交** — `feat(accounts): Parent default role + self-registration + demo-family seed`。

---

## Chunk 3: 家长后台"加/删孩子" UI

> 沿用 Phase 3 `Pages/ParentAdmin/Children/` 范式（Index + Modal）。

**Files:** Modify `Pages/ParentAdmin/Children/Index.cshtml`(+`index.js`)；Create `CreateModal.cshtml(.cs)`；本地化。

- [ ] **Step 1: Index 加"新建" + 删除行操作** — Index 头部加 `<abp-button id="NewChildButton" text="@L["CreateChild"].Value" .../>`；`index.js` 的 `rowAction.items` 加一项 `Delete`（confirm 后 `homework.children.childProfile.delete(id).then(reload)`）；加 `createModal` 打开逻辑。
- [ ] **Step 2: CreateModal** — 绑 `CreateChildDto Input`；字段 DisplayName / Grade(number) / AvatarKey；`OnPostAsync` 调 `_service.CreateAsync(Input)`。
- [ ] **Step 3: 本地化** — 加 `CreateChild`(新建孩子/New Child)、`DeleteConfirm`（若无）。两文件同步、无空值。
- [ ] **Step 4: build + 提交** — `dotnet build Homework.slnx` → 成功；`feat(web): add/delete child in 家长后台`。

---

## Chunk 4: 收尾与验收

### Task 4.1: 全量测试 + build
- [ ] Run: `dotnet test test/Homework.Domain.Tests/Homework.Domain.Tests.csproj` 然后 `dotnet test test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj` → 全绿（含新隔离用例 + 调整后的既有用例）。
- [ ] Run: `dotnet build Homework.slnx` → 0 error。

### Task 4.2: 端到端冒烟（`@run`）
- [ ] **全新库**（重要）：重播**不会删**已存在的 `gege/didi` `IdentityUser`——要验收"旧孩子登录账号已移除"，先**丢库重建**（本项目开发库数据可丢）：`DROP DATABASE "Homework";`（PG，localhost:5433，postgres/postgres）后再跑 DbMigrator 建库。
- [ ] `cd src/Homework.DbMigrator && dotnet run`（建库 + 迁移 + 示例家庭 + 角色/授权）。
- [ ] `cd src/Homework.Web && dotnet run`；浏览器：
  - `/Account/Register` **自助注册**一个新家长（勾同意）→ 登录 → 进家长后台。
  - 后台**加 2 个孩子**、排模板、复核——**只看得到自己刚加的娃**（看不到 demo 家庭的哥哥/弟弟）。
  - 用 demo 家长登录，验证反之亦然（各看各的）。
- [ ] 任一异常回对应 Chunk 修复。

### Task 4.3: 上线前安全清单 + 完成
- [ ] 在 `RUN.md`（或新 `DEPLOY.md`）落一份"**公网上线前必做**"清单：HTTPS/正式证书、`appsettings` 明文密钥移出（user-secrets/env）、注册限流/验证码、邮箱验证、错误页不泄信息。**本阶段不实现，仅记录。**
- [ ] 勾选 spec 验收标准；`chore: Phase 4 (accounts + self-registration) complete`。

---

## Phase 4 完成的产出
家长能自助注册成号、在后台加/删/管**自己的**孩子并排计划；孩子是家庭名下档案（非登录账号）；全局单实例里各家庭数据**互不可见**（集成测试护航），为孩子游戏端（Phase 5）、全球榜/PK、变现打好账号地基。

## 暂不含（后续阶段）
孩子游戏端（Phase 5）、运营数据看板、官网、真正支付/订阅、PK 玩法、邮箱验证/防刷深加固。

## Open items to confirm at implementation
- ABP 10.5 自助注册的确切开关（`Account.IsSelfRegistrationEnabled` 设置键 / `AbpAccountOptions`）与 `IdentityRole.IsDefault` 自动分配行为。
- 注册页"同意勾选"落地（覆盖 Register 页 vs 最小静态声明 + 前端必勾）。
- EF 迁移把 `IdentityUserId→ParentId` 识别为改列 vs 删+加列（开发库数据可丢，均可）。
- Phase 2 `FamilyGoalProgress_Tests` / Phase 3 既有测试因 `FamilyGoal` 加 `parentId` 参数、进度收窄需同步调整——实现时按红灯逐个改绿。
