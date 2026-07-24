# 共享旅程（SharedJourney）重构 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让家长/老师建一份共享计划、勾选名下多个孩子加入，每个孩子在同一份计划下各养各的宠物、各自完成度（为「同一挑战榜」打底）。

**Architecture:** 新增 `SharedJourney` 聚合＝共享计划（标题/日期/勋章 + 周任务模板）。每个参与孩子仍是自己的 `Journey`（现有实体，几乎不动），靠 `SharedJourneyId` 关联。模板从 `JourneyId` 移到 `SharedJourneyId`（真共享、改一次全员生效）。现有数据用**可测的 C# 仓储式回填**统一。核心逻辑改动小（模板改键 5 处 + 新聚合与流程），大头是机械改造与迁移。

**Tech Stack:** ABP 10.5 / .NET 10 / EF Core / PostgreSQL；xUnit + Shouldly（SQLite 内存，`CreateTables()` 建库）；React 19 + Vite + TS + TanStack Query（`frontend/parent-web`）。

**Spec:** `docs/superpowers/specs/2026-07-24-shared-journeys-design.md`（先读它）。

**关键约束（勿违反）：**
- 只有 `JourneyTaskTemplateItem.JourneyId` 移到 `SharedJourneyId`；`DailyTask.JourneyId` / `JourneyPetStage.JourneyId` / `JourneyBackpackItem.JourneyId` **保持不变**。
- 开始后**不重算**已冻结的进化阈值（冻结语义）。
- 迁移期字段先可空、回填后收紧；backfill 是 C#（可测），schema DDL 在真实 PG 上手动验。

---

## 文件结构地图

**后端 · 新增**
- `backend/src/Homework.Domain/Journeys/SharedJourney.cs` — 共享计划聚合根
- `backend/src/Homework.Domain/Journeys/SharedJourneyStatus.cs` — 枚举 Draft/Active
- `backend/src/Homework.Domain/Journeys/SharedJourneyManager.cs` — 建计划/归属/加移参与者/删除保护/编辑同步
- `backend/src/Homework.Domain/Data/SharedJourneyBackfillContributor.cs` — 一次性 C# 回填
- `backend/src/Homework.Application.Contracts/Journeys/ISharedJourneyAppService.cs` + `Dtos/*`
- `backend/src/Homework.Application/Journeys/SharedJourneyAppService.cs`
- `backend/test/Homework.TestBase/JourneyTestFactory.cs` — 共享测试工厂（建 SharedJourney+Journey+模板 + `StartedJourney` builder）
- 迁移：EF 生成的 `Migrations/*_Added_SharedJourney.cs`（Chunk 1）、`*_Dropped_Template_JourneyId.cs`（Chunk 6）

**后端 · 修改**
- `Journey.cs`（加 `SharedJourneyId` + 构造参数）
- `JourneyTaskTemplateItem.cs`（加 `SharedJourneyId`，暂留 `JourneyId`）
- `DailyTaskGenerator.cs`（EnsureDay/ReadRange 模板查询改键）
- `JourneyManager.cs`（ComputeExpectedFoodCountAsync 改键）
- `Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`（DbSet + 映射）
- `Homework.Application/Journeys/JourneyAppService.cs`（移除 CreateAsync；Delete 迁走）
- `Homework.Application/Tasks/JourneyTaskTemplateAppService.cs`（改键 + 归属改按 ParentId）
- `Homework.Application.Contracts/.../Dtos`：`CreateJourneyTaskTemplateItemDto`、`JourneyTaskTemplateItemDto`、`GetJourneyTemplateInput`（`JourneyId`→`SharedJourneyId`）
- `Homework.HttpApi.Host/Dev/PlayDemoSeeder.cs`（构造补 SharedJourneyId）
- 全部直接 `new Journey` / `new JourneyTaskTemplateItem` / `.Start()` 的测试文件（~13 个，见 Chunk 2）

**前端 · 修改/新增**（Chunk 5，详见该章）

---

## Chunk 1: SharedJourney 领域实体 + EFCore + schema 迁移（纯新增，不破坏现有）

### Task 1.1: SharedJourneyStatus 枚举
**Files:** Create `backend/src/Homework.Domain/Journeys/SharedJourneyStatus.cs`

- [ ] **Step 1: 写枚举**
```csharp
namespace Homework.Journeys;

public enum SharedJourneyStatus
{
    Draft = 0,
    Active = 1,
}
```
- [ ] **Step 2: 编译**：`dotnet build backend/src/Homework.Domain/Homework.Domain.csproj`。预期 0 error。

### Task 1.2: SharedJourney 聚合（TDD）
**Files:**
- Create `backend/src/Homework.Domain/Journeys/SharedJourney.cs`
- Test `backend/test/Homework.Domain.Tests/Journeys/SharedJourney_Tests.cs`

- [ ] **Step 1: 写失败测试**
```csharp
using System;
using Homework.Journeys;
using Shouldly;
using Xunit;

namespace Homework.Domain.Tests.Journeys;

public class SharedJourney_Tests
{
    [Fact]
    public void New_SharedJourney_Is_Draft_With_Period()
    {
        var sj = new SharedJourney(Guid.NewGuid(), Guid.NewGuid(), "暑假挑战",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), Guid.NewGuid());
        sj.Status.ShouldBe(SharedJourneyStatus.Draft);
        sj.Title.ShouldBe("暑假挑战");
    }

    [Fact]
    public void SetPeriod_Rejects_End_Before_Start()
    {
        var sj = new SharedJourney(Guid.NewGuid(), Guid.NewGuid(), "x",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 1), Guid.NewGuid());
        Should.Throw<ArgumentException>(() => sj.SetPeriod(new DateOnly(2026, 8, 1), new DateOnly(2026, 7, 1)));
    }

    [Fact]
    public void Activate_Moves_Draft_To_Active_Idempotent()
    {
        var sj = new SharedJourney(Guid.NewGuid(), Guid.NewGuid(), "x",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 1), Guid.NewGuid());
        sj.Activate();
        sj.Status.ShouldBe(SharedJourneyStatus.Active);
        sj.Activate(); // 幂等，不抛
        sj.Status.ShouldBe(SharedJourneyStatus.Active);
    }
}
```
- [ ] **Step 2: 运行验证失败**：`dotnet test backend/test/Homework.Domain.Tests/Homework.Domain.Tests.csproj --filter "FullyQualifiedName~SharedJourney_Tests"`。预期编译失败（SharedJourney 不存在）。
- [ ] **Step 3: 写实体**（对照 `Journey.cs` 风格）
```csharp
using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Journeys;

/// <summary>共享计划：家长/老师建一份，多个孩子各建自己的 Journey 加入（挂 SharedJourneyId）。</summary>
public class SharedJourney : FullAuditedAggregateRoot<Guid>
{
    public Guid ParentId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public Guid MedalId { get; private set; }
    public SharedJourneyStatus Status { get; private set; }

    protected SharedJourney() { }

    public SharedJourney(Guid id, Guid parentId, [NotNull] string title,
        DateOnly startDate, DateOnly endDate, Guid medalId) : base(id)
    {
        ParentId = parentId;
        SetTitle(title);
        SetPeriod(startDate, endDate);
        MedalId = medalId;
        Status = SharedJourneyStatus.Draft;
    }

    public SharedJourney SetTitle([NotNull] string title)
    {
        Title = Check.NotNullOrWhiteSpace(title, nameof(title), maxLength: 128);
        return this;
    }

    public SharedJourney SetDescription(string? description) { Description = description; return this; }

    public SharedJourney SetPeriod(DateOnly startDate, DateOnly endDate)
    {
        if (endDate < startDate)
        {
            throw new ArgumentException("endDate must be >= startDate", nameof(endDate));
        }
        StartDate = startDate;
        EndDate = endDate;
        return this;
    }

    public SharedJourney SetMedal(Guid medalId) { MedalId = medalId; return this; }

    public void Activate() => Status = SharedJourneyStatus.Active;
}
```
- [ ] **Step 4: 运行验证通过**：同 Step 2 命令。预期 3 passed。
- [ ] **Step 5: Commit** — `git add`（本 chunk 结束时统一 commit，见 Task 1.4）。

### Task 1.3: EFCore 映射 + DbSet + schema 迁移 A
**Files:** Modify `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`

- [ ] **Step 1: 加 DbSet + 实体配置**（对照现有 `Journey` 的 `ConfigureJourneys`/`builder.Entity<Journey>` 写法）：
  - `public DbSet<SharedJourney> SharedJourneys { get; set; }`
  - 在 `OnModelCreating` 里配置：表名用 `HomeworkConsts.DbTablePrefix + "SharedJourneys"`（本仓库前缀是 **`App`** → `AppSharedJourneys`，对齐 `AppJourneys`/`AppJourneyTaskTemplateItems`；**不是 `Abp`**）、`Title` HasMaxLength(128)、`Description` HasMaxLength(512) 可空。
  - **同一步**：给 `Journey` 配置加 `b.Property(x => x.SharedJourneyId)`（下一 Task 加字段后）；给 `JourneyTaskTemplateItem` 加 `SharedJourneyId` 属性映射。→ **顺序**：先做 Task 1.2、再做 Task 2.1（Journey/模板加字段），最后回到这里一次性配全 + 生成迁移。为避免半截编译不过，**本 Task 实际在 Chunk 2 的字段加完后执行**；这里仅登记"要配 SharedJourney 表映射"。
- [ ] **Step 2:** 见 Chunk 2 Task 2.4（迁移在字段齐全后统一生成）。

> **说明**：schema 迁移 A（建 `AbpSharedJourneys` 表 + `Journey.SharedJourneyId` 可空列 + `JourneyTaskTemplateItem.SharedJourneyId` 可空列，**保留** `JourneyTaskTemplateItem.JourneyId`）在 Chunk 2 字段就位后由 `dotnet ef migrations add Added_SharedJourney` 生成。Chunk 1 只落地"实体 + 领域测试"。

### Task 1.4: SharedJourneyManager 骨架（建 + 归属）（TDD）
**Files:**
- Create `backend/src/Homework.Domain/Journeys/SharedJourneyManager.cs`
- Test `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/SharedJourneyManager_Tests.cs`（参与者相关测试在 Chunk 4 补；这里先测 create+归属）

- [ ] **Step 1: 写失败测试**（建一个 SharedJourney、按 ParentId 归属校验）—— 见 Chunk 4 完整版；本 chunk 先建最小 `CreateAsync` + `GetOwnedAsync(sharedJourneyId)`（`sj.ParentId == CurrentUser.Id` 否则 EntityNotFound）。
- [ ] **Step 2-4:** 实现 `SharedJourneyManager : DomainService`，注入 `IRepository<SharedJourney,Guid>` + `ICurrentUser`；`CreateAsync(title, desc, start, end, medalId)`、`GetOwnedAsync(id)`。参考 `ChildProfileManager` 的归属写法。
- [ ] **Step 5: Commit** 整个 Chunk 1：
```bash
git add backend/src/Homework.Domain/Journeys/SharedJourney*.cs backend/src/Homework.Domain/Journeys/SharedJourneyManager.cs backend/test/Homework.Domain.Tests/Journeys/SharedJourney_Tests.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/SharedJourneyManager_Tests.cs
git commit -m "feat(journeys): SharedJourney 聚合 + Manager 骨架（Chunk 1）"
```

**Chunk 1 验收**：`dotnet test Homework.Domain.Tests` 全绿；`dotnet build` 后端全绿。现有测试不受影响（纯新增）。

---

## Chunk 2: Journey/模板改键 + 5 处查询点 + DTO + 测试工厂 + 机械扫改

> 本 chunk 会一度让编译中断（改构造签名），必须一口气改到重新编译通过。建议**先建测试工厂**，再改实体，再用工厂扫掉所有构造点。

### Task 2.1: 共享测试工厂
**Files:** Create `backend/test/Homework.TestBase/JourneyTestFactory.cs`

- [ ] **Step 1: 写工厂**（封装建 SharedJourney + Journey(挂 SharedJourneyId) + 模板 + `StartedJourney`）。签名给默认值，返回构造好的实体，供各测试替换散落的 `new Journey(...)`。示例：
```csharp
using System;
using Homework.Journeys;
using Homework.Tasks;

namespace Homework;

public static class JourneyTestFactory
{
    public static SharedJourney NewSharedJourney(Guid parentId, Guid? id = null,
        DateOnly? start = null, DateOnly? end = null, Guid? medalId = null, string title = "旅程")
        => new(id ?? Guid.NewGuid(), parentId, title,
               start ?? new DateOnly(2026, 7, 1), end ?? new DateOnly(2026, 8, 31), medalId ?? Guid.NewGuid());

    // Draft Journey 挂到某 SharedJourney（计划副本从 sj 拷）
    public static Journey NewJourney(SharedJourney sj, Guid childId, Guid? id = null)
        => new(id ?? Guid.NewGuid(), sj.Id, sj.ParentId, childId, sj.Title, sj.StartDate, sj.EndDate, sj.MedalId);

    public static JourneyTaskTemplateItem NewTemplate(Guid sharedJourneyId, DayOfWeek dow,
        string title = "任务", int order = 0)
        => new(Guid.NewGuid(), sharedJourneyId, dow, title, order: order);
}
```
- [ ] **Step 2:** 编译会失败（Journey/模板签名还没改）——预期，下一步改实体。

### Task 2.2: Journey 加 SharedJourneyId
**Files:** Modify `backend/src/Homework.Domain/Journeys/Journey.cs`
- [ ] **Step 1:** 加属性 `public Guid SharedJourneyId { get; private set; }`（迁移期 EF 列可空、domain 视为已赋值）。
- [ ] **Step 2:** 构造函数加参数（放在 parentId 前或 childId 前，风格一致）：
  `public Journey(Guid id, Guid sharedJourneyId, Guid parentId, Guid childId, string title, DateOnly startDate, DateOnly endDate, Guid medalId)` → 体内 `SharedJourneyId = sharedJourneyId;`。
- [ ] **Step 3:** 编译 Domain（会牵连调用点，暂不管测试项目）。

### Task 2.3: JourneyTaskTemplateItem 改键（加 SharedJourneyId，暂留 JourneyId）
**Files:** Modify `backend/src/Homework.Domain/Tasks/JourneyTaskTemplateItem.cs`
- [ ] **Step 1:** 加 `public Guid SharedJourneyId { get; private set; }`；**保留** `public Guid JourneyId { get; private set; }`（回填要用，迁移期两列并存）。
- [ ] **Step 2:** 构造函数：把首要键换成 `sharedJourneyId`：
  `public JourneyTaskTemplateItem(Guid id, Guid sharedJourneyId, DayOfWeek dayOfWeek, string title, string? subject = null, int order = 0, int? estimatedMinutes = null)` → 体内 `SharedJourneyId = sharedJourneyId;`（`JourneyId` 不再由构造设，回填/旧数据用；新建即空）。
- [ ] **Step 3:** 编译 Domain。

### Task 2.4: EFCore 映射补齐 + 生成 schema 迁移 A
**Files:** Modify `HomeworkDbContext.cs`；生成 `Migrations/*_Added_SharedJourney.cs`
- [ ] **Step 1:** 配置 `SharedJourney`（表 `AppSharedJourneys`，用 `HomeworkConsts.DbTablePrefix`）、`Journey.SharedJourneyId`（可空列）、`JourneyTaskTemplateItem.SharedJourneyId`（可空列，保留 `JourneyId`）。
- [ ] **Step 2:** 生成迁移：
  `dotnet ef migrations add Added_SharedJourney --project backend/src/Homework.EntityFrameworkCore --startup-project backend/src/Homework.DbMigrator`
- [ ] **Step 3:** 人工核对迁移 `Up()`：仅建表 + 加两个可空列，**不**动 `JourneyTaskTemplateItem.JourneyId`。

### Task 2.5: 5 处模板查询点改键
**Files:** Modify（逐一改 `t.JourneyId == x` → `t.SharedJourneyId == journey.SharedJourneyId`；CRUD 两处见 Chunk 4，但查询谓词此处先改可编译版）：
- `backend/src/Homework.Domain/Tasks/DailyTaskGenerator.cs` — `EnsureDayAsync`（模板查询）、`ReadRangeAsync`（`hasGap` 分支的模板查询）。改成先有 `journey`（两处都已取到 active journey），用 `t.SharedJourneyId == journey.SharedJourneyId`。
- `backend/src/Homework.Domain/Journeys/JourneyManager.cs` — `ComputeExpectedFoodCountAsync(journey)`：`t.JourneyId == journeyId` → `t.SharedJourneyId == journey.SharedJourneyId`。
- [ ] **Step 1:** 改这三处逻辑查询点。
- [ ] **Step 2:** 编译 Domain 全绿。
- （另两处 CRUD 查询点 `JourneyTaskTemplateAppService.GetListAsync`、`JourneyAppService.DeleteAsync` 在 **Task 2.7** 处理——它们随构造签名变更被强制波及，必须在 Chunk 2 内解决，否则要么编译不过、要么"静默写错键"。）

### Task 2.6: 机械扫改所有构造点 + 用工厂
**Files:** 见 spec §10 清单——`new Journey(...)` 18 处/11 文件、`new JourneyTaskTemplateItem(...)` 27 处/6 文件、`.Start(...)` 11 处，+ 生产 `PlayDemoSeeder.cs`。
- [ ] **Step 1:** `PlayDemoSeeder.cs`：建 Journey 前先建一个 SharedJourney（拷标题/日期/勋章），Journey 构造补 `sharedJourney.Id`；模板构造第二参数改成 `sharedJourney.Id`。种子里也要 Insert SharedJourney。
- [ ] **Step 2:** 逐个测试文件：把散落 `new Journey(...)` 换成 `JourneyTestFactory.NewJourney(sj, childId)`（先在该测试建/取一个 `sj`）；`new JourneyTaskTemplateItem(..., journeyId, ...)` 换成 `JourneyTestFactory.NewTemplate(sj.Id, dow, ...)`。清单文件：`Journey_Tests`、`JourneyGrowth_Tests`、`JourneyTaskTemplateAppService_Tests`、`DailyTaskGenerator_Tests`、`DailyTaskAppService_Tests`、`PkAppService_Tests`、`JourneyLoop_Tests`、`OwnershipIsolation_Tests`、`JourneyPlay_Tests`、`JourneyManager_Tests`、`JourneyPersistence_Tests`（+ 用到模板的 `DailyTaskGenerator_Tests` 最重）。
  - 注意：测试里凡插入模板的，之前按 `journeyId` 现在按 `sharedJourneyId` —— 且这些测试的 journey 必须挂到同一个 `sj`，模板挂 `sj.Id`，生成器才取得到。**这是本 chunk 语义最容易错的点**：改完确认"模板 sharedJourneyId == journey.SharedJourneyId"。
### Task 2.7: 被签名变更强制波及的两个生产应用服务（**必须在 Chunk 2 内解决**）

改构造签名后，两个生产应用服务会出问题——不解决则 Chunk 2 无法"真正编译通过且语义正确"。**注意**：本次是一个大 PR、收尾统一提交、中途不部署，所以移除端点导致前端 `createJourney/updateJourney` 变"死调用"是可接受的（前端在 Chunk 5 改）。

- [ ] **Step 1: `JourneyAppService.CreateAsync`（硬编译中断）** —— 它 `new Journey(...)` 用旧签名，新的 `sharedJourneyId` 参数无从提供，且新模型下"建 Journey"应走加参与者。→ **在 Chunk 2 直接移除 `CreateAsync`**（连 `ISomethingAppService` 接口声明；建 Journey 归 Chunk 4 的 `AddParticipantsAsync`）。
- [ ] **Step 2: `JourneyAppService.UpdateAsync`（正确性）** —— 它直接改单个孩子的去规范化计划副本（Title/Period/Medal），新模型下计划归 `SharedJourney`、副本应从它刷新（spec §2）。→ **一并移除 `UpdateAsync`**（编辑计划改走 Chunk 4 的 `SharedJourneyAppService.UpdateAsync` 统一刷副本）。保留 `GetListAsync(childId)`/`GetAsync`（孩子端/看板读用）；`DeleteAsync` 的重塑留 Chunk 4（其 `t.JourneyId==id` 谓词在 Chunk 6 前仍能编译，但语义已失效——**别在 Chunk 2 依赖它删模板**）。
- [ ] **Step 3: `JourneyTaskTemplateAppService`（静默错误，最坑）** —— `CreateAsync` 里 `new JourneyTaskTemplateItem(GuidGenerator.Create(), input.JourneyId, ...)`：新旧第二参都是 `Guid`，**能编译但会把 `input.JourneyId` 写进 `SharedJourneyId` 槽**。→ **在 Chunk 2 就改**：`input.JourneyId` → `input.SharedJourneyId`；`GetListAsync` 谓词 `t.JourneyId==journeyId` → `t.SharedJourneyId==input.SharedJourneyId`；3 个 DTO（`CreateJourneyTaskTemplateItemDto`/`JourneyTaskTemplateItemDto`/`GetJourneyTemplateInput`）`JourneyId`→`SharedJourneyId`；归属校验从 `journey.ChildId` 改成 `SharedJourneyManager.GetOwnedAsync(input.SharedJourneyId)`（该 Manager 的 `GetOwnedAsync` 已在 Chunk 1 就位）。
- [ ] **Step 4:** 更新受影响的应用测试（`JourneyTaskTemplateAppService_Tests` 建模板改传 `sharedJourneyId`；引用 `JourneyAppService.Create/Update` 的测试改走"建 SharedJourney + AddParticipants"——若 AddParticipants 尚未实现，这些测试临时改用工厂直插 Draft Journey，Chunk 4 再切到真实端点）。
- [ ] **Step 5: 全后端测试跑通**：
  `dotnet test backend/test/Homework.EntityFrameworkCore.Tests/... ; dotnet test backend/test/Homework.Domain.Tests/...`。预期全绿（PK/看板/生成器/缩放等既有测试在新键下仍绿）。
- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "refactor(journeys): Journey 挂 SharedJourneyId + 模板改键 + 应用服务改键 + 测试工厂扫改（Chunk 2）"
```

**Chunk 2 验收**：后端全部测试绿；模板已按 SharedJourneyId 驱动生成/缩放**且 CRUD 也按 SharedJourneyId**（无静默写错键）；`JourneyAppService.Create/Update` 已移除；schema 迁移 A 就位；`JourneyTaskTemplateItem.JourneyId` 暂留（回填用）。

---

## Chunk 3: C# 回填（可测）

### Task 3.1: 回填逻辑 + 测试（TDD）
**Files:**
- Create `backend/src/Homework.Domain/Data/SharedJourneyBackfillContributor.cs`
- Test `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Data/SharedJourneyBackfill_Tests.cs`

- [ ] **Step 1: 写失败测试**（种入"旧式"数据：一条 `SharedJourneyId==Guid.Empty` 的 Journey + 一条 `JourneyId` 指向它、`SharedJourneyId==Guid.Empty` 的模板 → 跑回填 → 断言：建了一个 SharedJourney(拷字段)、Journey.SharedJourneyId 指向它、模板.SharedJourneyId 指向它；再跑一次不重复建（幂等）；空库空跑）。
  - 构造"旧式" Journey：`JourneyTestFactory` 目前要求 sj。这里需要一个"无 sj"的旧式构造入口——用一个测试内 helper 直接 `new Journey(id, Guid.Empty, parentId, childId, ...)` 模拟迁移前状态（SharedJourneyId 空）。
- [ ] **Step 2: 运行验证失败**。
- [ ] **Step 3: 写回填**（`ITransientDependency`，仓储式、幂等）：
```csharp
// 伪代码要点：
// var orphans = journeys where SharedJourneyId == Guid.Empty
// foreach: 建 SharedJourney(拷 Title/Description/StartDate/EndDate/MedalId/ParentId; Status: journey.Status==Draft?Draft:Active)
//          journey.SetSharedJourneyId(sj.Id)  // Journey 加一个 internal/公开 setter 供回填
//          该 journey 的模板(按暂留 JourneyId==journey.Id) 逐条 SetSharedJourneyId(sj.Id)
//          save
```
  - 需要给 `Journey` 加 `public Journey SetSharedJourneyId(Guid id)`（回填/参与者建时用）；给 `JourneyTaskTemplateItem` 加 `SetSharedJourneyId(Guid id)`。
- [ ] **Step 4: 运行验证通过**。
- [ ] **Step 5:** 接进 DbMigrator 的种子阶段（`HomeworkDbMigrationService` 或 DataSeeder 调用一次）——参考现有 seeder 挂载方式。跑一次是幂等的。
- [ ] **Step 6: Commit** `feat(journeys): SharedJourney 一次性回填（Chunk 3）`

**Chunk 3 验收**：回填测试绿（含幂等/空库）；DbMigrator 会在迁移后执行回填。

---

## Chunk 4: 应用服务（SharedJourney CRUD + 参与者；重塑 Journey/模板服务）

### Task 4.1: 契约 DTO + 接口
**Files:** Create `Homework.Application.Contracts/Journeys/ISharedJourneyAppService.cs` + `Dtos/{SharedJourneyDto,CreateUpdateSharedJourneyDto,AddParticipantsDto}.cs`
- [ ] 定义：`SharedJourneyDto`(含 participants 概览可选)、`CreateUpdateSharedJourneyDto`(Title/Description/StartDate/EndDate/MedalId)、`AddParticipantsDto`(SharedJourneyId, List<Guid> ChildIds)。接口：`CreateAsync/UpdateAsync/DeleteAsync/GetListAsync/GetAsync/AddParticipantsAsync/RemoveParticipantAsync`。

### Task 4.2: SharedJourneyManager 参与者/删除/编辑（TDD）
**Files:** Modify `SharedJourneyManager.cs`；Test `SharedJourneyManager_Tests.cs`
- [ ] **Step 1: 写失败测试**：`AddParticipantsAsync` 给每个 child 建 Draft Journey(挂 sjId、拷计划副本)；重复加同一 child 不重复建；`RemoveParticipant` 仅 Draft 可移除、Active 拦截；`Delete` 仅纯 Draft 可删（有 Active/Completed 参与者 → 抛）；编辑 SharedJourney 日期 → 同步刷新参与 Journey 的副本，但不重算已 Active 阈值。
- [ ] **Step 2-4:** 实现。用 `ChildProfileManager.EnsureChildOwnedAsync` 校验 childId 归属；建 Journey 用 `JourneyTestFactory` 同款构造（生产代码里直接 `new Journey(id, sjId, parentId, childId, sj.Title, sj.StartDate, sj.EndDate, sj.MedalId)`）。删除保护：查该 sjId 下是否有非 Draft 的 Journey。
- [ ] **Step 5: Commit**

### Task 4.3: SharedJourneyAppService
**Files:** Create `Homework.Application/Journeys/SharedJourneyAppService.cs`；Test `SharedJourneyAppService_Tests.cs`
- [ ] **Step 1: 写失败测试**（归属隔离、CRUD、加/移参与者端到端）。
- [ ] **Step 2-4:** 实现，`[Authorize(HomeworkPermissions.ParentAdmin)]`，委托 `SharedJourneyManager`；`ObjectMapper` 映射（Mapperly，见 [[abp-mapperly-mapperbase]]，每对类型一个 `MapperBase<S,D>`）。
- [ ] **Step 5: Commit**

### Task 4.4: 收尾 JourneyAppService 删除逻辑（模板改键/建改删已在 Chunk 2 Task 2.7 完成）
**Files:** Modify `JourneyAppService.cs`（`DeleteAsync`）、`SharedJourneyManager.cs`/`SharedJourneyAppService.cs`
> 说明：`JourneyAppService.Create/Update` 移除、`JourneyTaskTemplateAppService` 改键 + 3 DTO、模板 CRUD 归属改 `SharedJourneyManager.GetOwnedAsync` —— **都已在 Chunk 2 Task 2.7 做完**。本 Task 只补 Chunk 2 明确留下的删除路径。
- [ ] **Step 1:** 删除逻辑归位到 `SharedJourneyManager`/`SharedJourneyAppService`（Task 4.2/4.3 的 `DeleteAsync`）：删纯 Draft 共享旅程 → 连带删其 Draft `Journey` + 按 `SharedJourneyId` 删模板（Draft Journey 无 DailyTask，无需清任务，见 spec §5）。
- [ ] **Step 2:** `JourneyAppService.DeleteAsync`（旧的按 `t.JourneyId` 删模板/任务那套）——若仍保留删单条 Journey 的用途则改为**只删该 Journey 自身 + 其 DailyTask/Stages/Backpack**（按 Journey 的 JourneyId，这些是合法的每孩子键，**不删模板**，模板归共享旅程）；若无调用方则**移除**。按前端实际需要定（Chunk 5 若不再单独删 Journey 就移除）。
- [ ] **Step 3:** 全后端测试绿。**Commit** `feat(journeys): SharedJourney 应用服务 + 参与者 + 删除归位（Chunk 4）`

**Chunk 4 验收**：后端全绿；建旅程走"共享旅程 + 加参与者"；删除保护生效；模板 CRUD 按 SharedJourneyId + ParentId 归属（Chunk 2 已落地）。

---

## Chunk 5: 前端（家长端共享旅程管理 + 参与者；孩子端核对）

### Task 5.1: 类型 + service
**Files:** Modify `frontend/parent-web/src/types/homework.ts`、`src/services/homeworkService.ts`
- [ ] 新增 `SharedJourneyDto/CreateUpdateSharedJourneyDto/AddParticipantsDto` 类型；模板 3 DTO 的 `journeyId`→`sharedJourneyId`。service：新增 `sharedJourney` CRUD + `addParticipants/removeParticipant`（ABP 约定路由 `/api/app/shared-journey...`）；模板 service 改 `sharedJourneyId`；**移除 `createJourney` 和 `updateJourney`**（后端 `JourneyAppService.Create/Update` 已在 Chunk 2 移除；编辑计划改调 `sharedJourney` 的 update）。

### Task 5.2: 家长端共享旅程页
**Files:** 重构 `src/features/journeys/*`（`JourneysPage`/`JourneyNewPage`/`JourneyEditPage` → 共享旅程列表/新建/编辑；周模板编辑器改 `sharedJourneyId`）+ 新增参与者管理组件（勾选名下孩子加入/移除）。
- [ ] 逐页改造；沿用现有 CRUD 范式（`useX`+`useXMutations`+`XDialog`）。
- [ ] 门禁：`npx tsc -b --noEmit`、`npx vitest run`、`npx eslint .`、`npm run build` 全绿；locales 若加键两语言同步。

### Task 5.3: 孩子端核对
**Files:** 检查 `src/features/play/*`
- [ ] 确认孩子端读取的是每孩子的 Journey（不受共享化影响）；选宠物开始流程不变。补/改必要的组件测试。
- [ ] **Commit** `feat(pk): 家长端共享旅程管理 + 参与者 UI；孩子端核对（Chunk 5）`

**Chunk 5 验收**：前端门禁全绿；家长端能建共享旅程、排计划、勾选孩子加入；孩子端照旧选宠物开始。

---

## Chunk 6: 清理迁移 + 收尾验证 —— ⚠️ 延后到「回填跑过之后」的第二次发布

> **为什么延后**：DbMigrator 是**先跑完所有迁移、再跑数据种子(回填)**。Chunk 6 的迁移 B 会 drop 模板的 `JourneyId` 列，而 Chunk 3 回填恰恰要**读 `JourneyId`** 把旧模板关联到新共享旅程。若迁移 B 与回填在同一次发布，DbMigrator 会先 drop 列、再跑回填 → 回填失败。
> **正确顺序**（活数据迁移通则：别在填充替代列的同一次发布里删数据列）：
> 1. 先发 **Chunk 1–5b**（迁移 A 建列 + 回填 + 全部功能）→ 跑 DbMigrator → 核对回填日志/行数。
> 2. **确认线上回填成功后**，再单独发本 Chunk 6（迁移 B 删 `JourneyId` + `SetJourneyId` + 收紧 `SharedJourneyId` 必填）。
> `JourneyId` 列在此之前保留、闲置无害，功能不受影响。**本次交付不含 Chunk 6。**


### Task 6.1: 去掉模板 JourneyId + 收紧 SharedJourneyId
**Files:** Modify `JourneyTaskTemplateItem.cs`（删 `JourneyId`）、`Journey`/EF 映射（`SharedJourneyId` 非空）；生成迁移 B
- [ ] **Step 1:** 确认回填已在部署环境跑过（生产先跑 DbMigrator 再上此清理，或本地开发库已回填）。
- [ ] **Step 2:** 模型删 `JourneyTaskTemplateItem.JourneyId`；`Journey.SharedJourneyId` 映射改 `IsRequired()`。
- [ ] **Step 3:** `dotnet ef migrations add Dropped_Template_JourneyId ...`；核对 `Up()` drop 列 + alter not-null。
- [ ] **Step 4:** 全后端测试绿（工厂/测试已不依赖模板 JourneyId）。
- [ ] **Step 5: Commit** `chore(journeys): 清理模板 JourneyId、SharedJourneyId 收紧必填（Chunk 6）`

### Task 6.2: 全量验证 + 产物
- [ ] 后端：EFCore + Domain 全绿；Host `dotnet build` 绿。
- [ ] 前端：tsc/vitest/eslint/build 绿。
- [ ] `dotnet publish HttpApiHost` + `dotnet publish DbMigrator`（**本次要发 DbMigrator**）到 `output/`；`npm run build` 到 `dist/`。
- [ ] 更新记忆：共享旅程重构完成、可以做「同一挑战榜」。

**部署提醒（写进最终汇报，不在计划内执行）**：先备份 PG 库 → 传 DbMigrator+Host → **跑 DbMigrator**（迁移 A→回填→迁移 B）→ restart Host → 传前端 dist + Purge CF。

---

## 全局验收标准
- 现有 80+ 后端测试 + 新增测试全绿；前端门禁全绿。
- 家长建共享旅程、勾选孩子加入、孩子各选宠物开始、各养各的、PK/看板/收藏照常。
- 现有线上旅程经回填各归一个单人共享旅程、模板无丢失。
- `JourneyTaskTemplateItem` 仅按 `SharedJourneyId`；`DailyTask/JourneyPetStage/JourneyBackpackItem` 的 `JourneyId` 不变。
- 冻结语义：开始后改计划不重算已冻结阈值。
