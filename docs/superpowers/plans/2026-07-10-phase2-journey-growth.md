# Phase 2 — 旅程 + 成长闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `FamilyGoal` 重塑为按孩子的 `Journey` 聚合，任务体系重挂到旅程下，落地「完成任务→获奖励道具→喂养宠物→五阶进化→满级发勋章入收藏」的完整闭环。

**Architecture:** 新增 `Journey` 聚合根（含 `JourneyPetStage` 阈值快照 + `JourneyBackpackItem` 背包两个 owned 子集合），业务不变量（喂养/进化/完成/单旅程约束）集中在聚合与 `JourneyManager`。删除整套 `FamilyGoal`。`WeeklyTaskTemplateItem`→`JourneyTaskTemplateItem`（+JourneyId+奖励配置），`DailyTask` 加 `JourneyId/RewardItemId/RewardGranted`，`DailyTaskGenerator` 改为旅程域内生成 + 奖励解析；`DailyScore`/星数/连击保留为观感统计。本期孩子侧操作沿用**家长鉴权 + 传 ChildId**（不做孩子独立登录）。

**Tech Stack:** ABP 10.5.0 / .NET 10 / EF Core (PostgreSQL 生产, SQLite in-memory 测试) / Mapperly / xUnit + Shouldly。消费第一期图鉴（`IPetSpeciesAppService`/`RewardItem`/`Medal`）。

**Spec:** `docs/superpowers/specs/2026-07-10-child-journey-pet-backend-design.md`（本计划覆盖其 §3.2 / §4 / §5 / §9 / §10）。

## Global Constraints

以下为项目级约定，每个任务隐式适用：

- ABP 10.5.0 / `net10.0` / `<Nullable>enable</Nullable>`；无隐式 using，显式 `using`。
- 聚合根继承 `Volo.Abp.Domain.Entities.Auditing.FullAuditedAggregateRoot<Guid>`；私有 setter；字符串校验 `Check.NotNullOrWhiteSpace(v, nameof(v), maxLength: N)`；非法入参抛 `ArgumentException`，业务不变量违背抛 `Volo.Abp.BusinessException(errorCode)`；`Set*` 返回 `this` 走 fluent。
- 子实体用非泛型 `Volo.Abp.Domain.Entities.Entity` + 复合键 + `override object[] GetKeys()`（对标第一期 `PetForm`）。owned 集合用私有 `List<T> _xxx` 字段 + `IReadOnlyCollection<T>` 只读暴露，DbContext 用 `HasMany(x=>x.Xxx).WithOne().HasForeignKey(...).OnDelete(Cascade)` + 子实体 `HasKey(new{...})`。
- 表名 `HomeworkConsts.DbTablePrefix + "<Name>"`（前缀 `App`），schema `null`；每个实体配置调 `b.ConfigureByConvention()`。
- 映射用 Mapperly：`[Mapper] public partial class XxxMapper : MapperBase<TEntity, TDto>`，写在 `backend/src/Homework.Application/HomeworkApplicationMappers.cs`。需 resolver/手工计算的字段用 `[MapperIgnoreTarget(nameof(...))]`。**RMG020（审计字段/未映射源字段未映射）是既有可接受模式，勿加逐字段忽略去消除。**
- App Service 继承 `HomeworkAppService`；本期新服务一律 `[Authorize(HomeworkPermissions.ParentAdmin)]`；对孩子/子实体的访问用 `ChildProfileManager.EnsureChildOwnedAsync(childId)` 做归属校验（对标既有 `WeeklyTaskTemplateAppService`/`DailyTaskAppService`）。自动 API 路由 `/api/app/<kebab>`。
- 领域纯逻辑测试放 `backend/test/Homework.Domain.Tests`（xUnit + Shouldly，无 fixture）。DB 相关测试放 `backend/test/Homework.EntityFrameworkCore.Tests`：`[Collection(HomeworkTestConsts.CollectionDefinitionName)]`、继承 `HomeworkEntityFrameworkCoreTestBase`、`GetRequiredService<T>()`、`ICurrentPrincipalAccessor.Change(Parent(id))`、`WithUnitOfWorkAsync(...)`。测试库 SQLite in-memory 从模型 `CreateTables()` 建表——**新实体进了 `OnModelCreating` 即自动建表，测试无需迁移**。
- 生产迁移从 `backend/` 执行：`dotnet ef migrations add <Name> --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore`（离线构建模型，无需实库）。
- 时间：领域方法需要"现在"时传 `DateTime now` 入参，不在领域内调 Clock；App Service 用注入的 `Clock.Now`（ABP `IClock`）传入。
- 随机：奖励随机解析用注入的抽象随机源（可测试替身），不直接 `Random`（脚本环境/可复现）。
- 提交：conventional commits，中文主题；结尾 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。分支：先从 `main` 切 `feature/journey-growth`（`git checkout -b feature/journey-growth`）再做第一个任务。
- 决策提醒：孩子侧操作=家长鉴权+ChildId（无孩子登录）；旅程 Active 期间持续生成每日任务（即使过 EndDate）；一份计划一次执行。

---

## File Structure

**新增（Domain）**：`Journeys/JourneyStatus.cs`(Domain.Shared)、`Journeys/Journey.cs`、`Journeys/JourneyPetStage.cs`、`Journeys/JourneyBackpackItem.cs`、`Journeys/JourneyFeedResult.cs`、`Journeys/JourneyManager.cs`、`Tasks/JourneyTaskTemplateItem.cs`、`Tasks/RewardResolver.cs`(+`IRandomPicker.cs`)。
**修改（Domain）**：`Tasks/DailyTask.cs`(+字段/方法)、`Tasks/DailyTaskGenerator.cs`(旅程域内生成+奖励解析)、`Children/ChildProfile.cs`(删 ActivePetId)、`HomeworkDomainErrorCodes.cs`(+错误码)。
**删除（Domain/Scoring）**：`Scoring/FamilyGoal.cs`、`Scoring/FamilyGoalProgressService.cs`。
**新增（Application.Contracts）**：`Journeys/**`(DTO+接口：`IJourneyAppService`、`IJourneyPlayAppService`)、`Tasks/Dtos/JourneyTaskTemplateItemDto.cs` 等。
**修改/删除（Application）**：删 `Scoring/FamilyGoalAppService.cs`；新增 `Journeys/JourneyAppService.cs`、`Journeys/JourneyPlayAppService.cs`；改 `Tasks/DailyTaskAppService.cs`、`Tasks/WeeklyTaskTemplateAppService.cs`→`Tasks/JourneyTaskTemplateAppService.cs`；`HomeworkApplicationMappers.cs`(+/- 映射)。
**删除（Application.Contracts）**：`Scoring/**`(FamilyGoal DTO+接口)、`Tasks/*WeeklyTaskTemplate*`。
**修改（EFCore）**：`HomeworkDbContext.cs`(DbSet/config)、新迁移。
**修改（本地化）**：`en.json`/`zh-Hans.json`(删 FamilyGoal 键，加 Journey 键)。
**测试**：删 `FamilyGoalAppService_Tests`/`FamilyGoalProgress_Tests`；改 `OwnershipIsolation_Tests`(去 goal 引用)、`WeeklyTaskTemplateAppService_Tests`→journey 版、`DailyTaskGenerator_Tests`/`DailyTaskAppService_Tests`(旅程域)；新增 Journey 领域与集成测试。

---

## Task 1: Journey 聚合核心（领域）

`JourneyStatus` 枚举 + `Journey` 聚合根（按孩子）+ 两个 owned 子实体 + Draft 态设值 + `Start`（写入所选宠物 + 阈值快照）。纯领域逻辑。

**Files:**
- Create: `backend/src/Homework.Domain.Shared/Journeys/JourneyStatus.cs`
- Create: `backend/src/Homework.Domain/Journeys/JourneyPetStage.cs`
- Create: `backend/src/Homework.Domain/Journeys/JourneyBackpackItem.cs`
- Create: `backend/src/Homework.Domain/Journeys/Journey.cs`
- Modify: `backend/src/Homework.Domain.Shared/HomeworkDomainErrorCodes.cs`
- Test: `backend/test/Homework.Domain.Tests/Journeys/Journey_Tests.cs`

**Interfaces:**
- Produces:
  - `enum JourneyStatus : byte { Draft=0, Active=1, Completed=2 }`
  - `JourneyPetStage : Entity`（复合键 `JourneyId+Level`）：`Level`、`GrowthToNext?`；ctor `(Guid journeyId, int level, int? growthToNext)`；`GetKeys()=>{JourneyId,Level}`。
  - `JourneyBackpackItem : Entity`（复合键 `JourneyId+RewardItemId`）：`RewardItemId`、`Quantity`；ctor `(Guid journeyId, Guid rewardItemId, int quantity)`；`Increment(int)`/`Decrement(int)`；`GetKeys()=>{JourneyId,RewardItemId}`。
  - `Journey : FullAuditedAggregateRoot<Guid>`：字段 `ParentId, ChildId, Title, Description?, StartDate, EndDate, MedalId, Status, PetSpeciesId?, CurrentLevel, GrowthPoints, CompletedTime?`；只读集合 `Stages`、`Backpack`；ctor `(Guid id, Guid parentId, Guid childId, string title, DateOnly startDate, DateOnly endDate, Guid medalId)`（Draft、CurrentLevel=1、GrowthPoints=0）；`SetTitle/SetDescription`(返回 this)、`SetPeriod(start,end)`、`SetMedal(Guid)`；`Start(Guid petSpeciesId, IEnumerable<(int level,int? growthToNext)> stages)`。
- 错误码：`HomeworkDomainErrorCodes.JourneyNotDraft="Homework:Journey.NotDraft"`、`JourneyAlreadyHasActive="Homework:Journey.AlreadyHasActive"`、`JourneyNotActive="Homework:Journey.NotActive"`、`JourneyBackpackEmpty="Homework:Journey.BackpackEmpty"`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.Domain.Tests/Journeys/Journey_Tests.cs`:

```csharp
using System;
using System.Linq;
using Homework.Journeys;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Homework.Journeys;

public class Journey_Tests
{
    private static Journey NewDraft() => new(
        Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "2026年暑假",
        new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), Guid.NewGuid());

    [Fact]
    public void Creates_As_Draft_Level1()
    {
        var j = NewDraft();
        j.Status.ShouldBe(JourneyStatus.Draft);
        j.CurrentLevel.ShouldBe(1);
        j.GrowthPoints.ShouldBe(0);
        j.PetSpeciesId.ShouldBeNull();
        j.Stages.ShouldBeEmpty();
        j.Backpack.ShouldBeEmpty();
    }

    [Fact]
    public void Rejects_Blank_Title()
    {
        Should.Throw<ArgumentException>(() => new Journey(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), " ",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), Guid.NewGuid()));
    }

    [Fact]
    public void Rejects_End_Before_Start()
    {
        Should.Throw<ArgumentException>(() => new Journey(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "x",
            new DateOnly(2026, 8, 31), new DateOnly(2026, 7, 1), Guid.NewGuid()));
    }

    [Fact]
    public void Start_Sets_Active_Species_And_Stage_Snapshot()
    {
        var j = NewDraft();
        var species = Guid.NewGuid();
        j.Start(species, new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });

        j.Status.ShouldBe(JourneyStatus.Active);
        j.PetSpeciesId.ShouldBe(species);
        j.CurrentLevel.ShouldBe(1);
        j.Stages.Count.ShouldBe(5);
        j.Stages.Single(s => s.Level == 2).GrowthToNext.ShouldBe(40);
        j.Stages.Single(s => s.Level == 5).GrowthToNext.ShouldBeNull();
    }

    [Fact]
    public void Start_Twice_Rejected()
    {
        var j = NewDraft();
        j.Start(Guid.NewGuid(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
        Should.Throw<BusinessException>(() =>
            j.Start(Guid.NewGuid(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) }));
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~Journey_Tests`
Expected: 编译失败 —— 类型不存在。

- [ ] **Step 3: 加错误码**

Modify `backend/src/Homework.Domain.Shared/HomeworkDomainErrorCodes.cs` — 在类体内加（第一期已加了 `PetSpeciesIncomplete`，追加）：

```csharp
    public const string JourneyNotDraft = "Homework:Journey.NotDraft";
    public const string JourneyAlreadyHasActive = "Homework:Journey.AlreadyHasActive";
    public const string JourneyNotActive = "Homework:Journey.NotActive";
    public const string JourneyBackpackEmpty = "Homework:Journey.BackpackEmpty";
```

- [ ] **Step 4: 写 JourneyStatus**

Create `backend/src/Homework.Domain.Shared/Journeys/JourneyStatus.cs`:

```csharp
namespace Homework.Journeys;

public enum JourneyStatus : byte
{
    Draft = 0,
    Active = 1,
    Completed = 2,
}
```

- [ ] **Step 5: 写子实体 JourneyPetStage / JourneyBackpackItem**

Create `backend/src/Homework.Domain/Journeys/JourneyPetStage.cs`:

```csharp
using System;
using Volo.Abp.Domain.Entities;

namespace Homework.Journeys;

/// <summary>旅程开始时对某宠物某阶「进化到下一阶所需阈值」的快照（复合键 JourneyId+Level）。</summary>
public class JourneyPetStage : Entity
{
    public Guid JourneyId { get; private set; }
    public int Level { get; private set; }
    public int? GrowthToNext { get; private set; }

    protected JourneyPetStage() { }

    public JourneyPetStage(Guid journeyId, int level, int? growthToNext)
    {
        JourneyId = journeyId;
        Level = level;
        GrowthToNext = growthToNext;
    }

    public override object[] GetKeys() => new object[] { JourneyId, Level };
}
```

Create `backend/src/Homework.Domain/Journeys/JourneyBackpackItem.cs`:

```csharp
using System;
using Volo.Abp.Domain.Entities;

namespace Homework.Journeys;

/// <summary>旅程背包里某道具的持有数量（已获得未喂养；复合键 JourneyId+RewardItemId）。</summary>
public class JourneyBackpackItem : Entity
{
    public Guid JourneyId { get; private set; }
    public Guid RewardItemId { get; private set; }
    public int Quantity { get; private set; }

    protected JourneyBackpackItem() { }

    public JourneyBackpackItem(Guid journeyId, Guid rewardItemId, int quantity)
    {
        JourneyId = journeyId;
        RewardItemId = rewardItemId;
        Quantity = quantity;
    }

    public void Increment(int by) => Quantity += by;

    public void Decrement(int by) => Quantity -= by;

    public override object[] GetKeys() => new object[] { JourneyId, RewardItemId };
}
```

- [ ] **Step 6: 写 Journey（本任务只含核心 + Start；成长方法在 Task 2 追加）**

Create `backend/src/Homework.Domain/Journeys/Journey.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Journeys;

/// <summary>一段旅程：按孩子维度，绑定一个宠物实例与一枚勋章；喂养驱动五阶进化，满级即完成。</summary>
public class Journey : FullAuditedAggregateRoot<Guid>
{
    public const int MaxLevel = 5;

    public Guid ParentId { get; private set; }
    public Guid ChildId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public Guid MedalId { get; private set; }
    public JourneyStatus Status { get; private set; }
    public Guid? PetSpeciesId { get; private set; }
    public int CurrentLevel { get; private set; }
    public int GrowthPoints { get; private set; }
    public DateTime? CompletedTime { get; private set; }

    private readonly List<JourneyPetStage> _stages = new();
    public IReadOnlyCollection<JourneyPetStage> Stages => _stages.AsReadOnly();

    private readonly List<JourneyBackpackItem> _backpack = new();
    public IReadOnlyCollection<JourneyBackpackItem> Backpack => _backpack.AsReadOnly();

    protected Journey() { }

    public Journey(Guid id, Guid parentId, Guid childId, [NotNull] string title,
        DateOnly startDate, DateOnly endDate, Guid medalId) : base(id)
    {
        ParentId = parentId;
        ChildId = childId;
        SetTitle(title);
        SetPeriod(startDate, endDate);
        MedalId = medalId;
        Status = JourneyStatus.Draft;
        CurrentLevel = 1;
        GrowthPoints = 0;
    }

    public Journey SetTitle([NotNull] string title)
    {
        Title = Check.NotNullOrWhiteSpace(title, nameof(title), maxLength: 128);
        return this;
    }

    public Journey SetDescription(string? description)
    {
        Description = description;
        return this;
    }

    public Journey SetPeriod(DateOnly startDate, DateOnly endDate)
    {
        if (endDate < startDate)
        {
            throw new ArgumentException("endDate must be >= startDate", nameof(endDate));
        }

        StartDate = startDate;
        EndDate = endDate;
        return this;
    }

    public Journey SetMedal(Guid medalId)
    {
        MedalId = medalId;
        return this;
    }

    /// <summary>孩子开始旅程：选定宠物 + 快照 5 阶阈值；仅 Draft 可开始。</summary>
    public void Start(Guid petSpeciesId, IEnumerable<(int Level, int? GrowthToNext)> stages)
    {
        if (Status != JourneyStatus.Draft)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.JourneyNotDraft);
        }

        PetSpeciesId = petSpeciesId;
        _stages.Clear();
        foreach (var (level, growthToNext) in stages.OrderBy(s => s.Level))
        {
            _stages.Add(new JourneyPetStage(Id, level, growthToNext));
        }

        Status = JourneyStatus.Active;
        CurrentLevel = 1;
        GrowthPoints = 0;
    }

    internal JourneyPetStage? CurrentStage() => _stages.FirstOrDefault(s => s.Level == CurrentLevel);
}
```

- [ ] **Step 7: 运行确认通过**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~Journey_Tests`
Expected: PASS（5 个用例）。

- [ ] **Step 8: 提交**

```bash
git add backend/src/Homework.Domain.Shared/Journeys backend/src/Homework.Domain/Journeys backend/src/Homework.Domain.Shared/HomeworkDomainErrorCodes.cs backend/test/Homework.Domain.Tests/Journeys/Journey_Tests.cs
git commit -m "feat(journey): Journey 聚合核心 + 阈值快照/背包子实体 + Start

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Journey 成长机制（喂养/进化/完成）

在 `Journey` 上加 `GrantReward`/`RevokeReward`/`Feed`；`Feed` 触发单级进化（进位保留余数），满级置 Completed。纯领域逻辑。

**Files:**
- Create: `backend/src/Homework.Domain/Journeys/JourneyFeedResult.cs`
- Modify: `backend/src/Homework.Domain/Journeys/Journey.cs`
- Test: `backend/test/Homework.Domain.Tests/Journeys/JourneyGrowth_Tests.cs`

**Interfaces:**
- Consumes: Task 1 的 `Journey`。
- Produces:
  - `readonly record struct JourneyFeedResult(bool Evolved, int NewLevel, bool Completed)`。
  - `Journey.GrantReward(Guid rewardItemId)`（Active 下背包 +1；否则抛 `JourneyNotActive`）。
  - `Journey.RevokeReward(Guid rewardItemId)`（背包该道具 >0 则 -1，否则 no-op）。
  - `Journey.Feed(Guid rewardItemId, int growthValue, DateTime now) : JourneyFeedResult`（Active 且背包有该道具；-1 背包、`GrowthPoints += growthValue`、单级进化检查；满级→Completed。空背包抛 `JourneyBackpackEmpty`，非 Active/已完成抛 `JourneyNotActive`）。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.Domain.Tests/Journeys/JourneyGrowth_Tests.cs`:

```csharp
using System;
using System.Linq;
using Homework.Journeys;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Homework.Journeys;

public class JourneyGrowth_Tests
{
    private static readonly DateTime Now = new(2026, 7, 10, 12, 0, 0, DateTimeKind.Utc);

    private static Journey Started()
    {
        var j = new Journey(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "旅程",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), Guid.NewGuid());
        // 阶阈值：到2阶需20，到3阶需40，到4阶需60，到5阶需80，5阶无
        j.Start(Guid.NewGuid(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
        return j;
    }

    [Fact]
    public void GrantReward_Adds_To_Backpack()
    {
        var j = Started();
        var item = Guid.NewGuid();
        j.GrantReward(item);
        j.GrantReward(item);
        j.Backpack.Single(b => b.RewardItemId == item).Quantity.ShouldBe(2);
    }

    [Fact]
    public void Feed_Empty_Backpack_Throws()
    {
        var j = Started();
        Should.Throw<BusinessException>(() => j.Feed(Guid.NewGuid(), 12, Now));
    }

    [Fact]
    public void Feed_Below_Threshold_Accumulates_No_Evolve()
    {
        var j = Started();
        var item = Guid.NewGuid();
        j.GrantReward(item);
        var r = j.Feed(item, 12, Now);
        r.Evolved.ShouldBeFalse();
        j.CurrentLevel.ShouldBe(1);
        j.GrowthPoints.ShouldBe(12);
        j.Backpack.Any(b => b.RewardItemId == item).ShouldBeFalse(); // qty 0 → removed
    }

    [Fact]
    public void Feed_Reaching_Threshold_Evolves_One_Level_Carrying_Remainder()
    {
        var j = Started();
        var item = Guid.NewGuid();
        j.GrantReward(item); j.GrantReward(item);
        j.Feed(item, 12, Now);            // growth 12
        var r = j.Feed(item, 12, Now);    // growth 24 >= 20 → evolve to L2, carry 4
        r.Evolved.ShouldBeTrue();
        r.NewLevel.ShouldBe(2);
        r.Completed.ShouldBeFalse();
        j.CurrentLevel.ShouldBe(2);
        j.GrowthPoints.ShouldBe(4);
    }

    [Fact]
    public void Feeding_To_Level5_Completes_Journey()
    {
        var j = Started();
        var item = Guid.NewGuid();
        // 逐级喂到满：每次喂足以跨过当前阶阈值（单级进化，余数清空后继续）
        int[] thresholds = { 20, 40, 60, 80 };
        foreach (var t in thresholds)
        {
            j.GrantReward(item);
            j.Feed(item, t, Now); // 恰好达阈值 → 进化一级，余0
        }
        j.CurrentLevel.ShouldBe(5);
        j.Status.ShouldBe(JourneyStatus.Completed);
        j.CompletedTime.ShouldBe(Now);

        // 完成后再喂被拒
        j.GrantReward(item);
        Should.Throw<BusinessException>(() => j.Feed(item, 10, Now));
    }

    [Fact]
    public void RevokeReward_Decrements_Unfed_Unit()
    {
        var j = Started();
        var item = Guid.NewGuid();
        j.GrantReward(item);
        j.RevokeReward(item);
        j.Backpack.Any(b => b.RewardItemId == item).ShouldBeFalse();
        // 再撤销无副作用
        Should.NotThrow(() => j.RevokeReward(item));
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~JourneyGrowth_Tests`
Expected: 编译失败 —— `GrantReward`/`Feed`/`JourneyFeedResult` 不存在。

- [ ] **Step 3: 写 JourneyFeedResult**

Create `backend/src/Homework.Domain/Journeys/JourneyFeedResult.cs`:

```csharp
namespace Homework.Journeys;

/// <summary>一次喂养的领域结果（美术资源由 App 层按新阶查图鉴补全）。</summary>
public readonly record struct JourneyFeedResult(bool Evolved, int NewLevel, bool Completed);
```

- [ ] **Step 4: 在 Journey 追加成长方法**

Modify `backend/src/Homework.Domain/Journeys/Journey.cs` — 在 `CurrentStage()` 方法之前（`Deactivate` 位置无）追加以下方法（放在 `Start` 之后）：

```csharp
    public void GrantReward(Guid rewardItemId)
    {
        EnsureActive();
        var entry = _backpack.FirstOrDefault(b => b.RewardItemId == rewardItemId);
        if (entry == null)
        {
            _backpack.Add(new JourneyBackpackItem(Id, rewardItemId, 1));
        }
        else
        {
            entry.Increment(1);
        }
    }

    public void RevokeReward(Guid rewardItemId)
    {
        var entry = _backpack.FirstOrDefault(b => b.RewardItemId == rewardItemId);
        if (entry == null || entry.Quantity <= 0)
        {
            return; // 尽力回收：无未喂养单位则 no-op
        }

        entry.Decrement(1);
        if (entry.Quantity <= 0)
        {
            _backpack.Remove(entry);
        }
    }

    public JourneyFeedResult Feed(Guid rewardItemId, int growthValue, DateTime now)
    {
        EnsureActive();

        var entry = _backpack.FirstOrDefault(b => b.RewardItemId == rewardItemId && b.Quantity > 0);
        if (entry == null)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.JourneyBackpackEmpty);
        }

        entry.Decrement(1);
        if (entry.Quantity <= 0)
        {
            _backpack.Remove(entry);
        }

        GrowthPoints += growthValue;

        var evolved = false;
        var stage = CurrentStage();
        if (CurrentLevel < MaxLevel && stage?.GrowthToNext is int threshold && GrowthPoints >= threshold)
        {
            GrowthPoints -= threshold;      // 进位保留余数
            CurrentLevel++;
            evolved = true;
            if (CurrentLevel >= MaxLevel)
            {
                Status = JourneyStatus.Completed;
                CompletedTime = now;
            }
        }

        return new JourneyFeedResult(evolved, CurrentLevel, Status == JourneyStatus.Completed);
    }

    private void EnsureActive()
    {
        if (Status != JourneyStatus.Active)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.JourneyNotActive);
        }
    }
```

- [ ] **Step 5: 运行确认通过**

Run: `dotnet test test/Homework.Domain.Tests --filter FullyQualifiedName~JourneyGrowth_Tests`
Expected: PASS（6 个用例）。

- [ ] **Step 6: 提交**

```bash
git add backend/src/Homework.Domain/Journeys/JourneyFeedResult.cs backend/src/Homework.Domain/Journeys/Journey.cs backend/test/Homework.Domain.Tests/Journeys/JourneyGrowth_Tests.cs
git commit -m "feat(journey): Journey 喂养/进化/完成 成长机制

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 删除 FamilyGoal 整套

`Journey` 取代 `FamilyGoal`（D1）。删实体/服务/DTO/进度服务/DbSet/配置/本地化/测试。本任务不生成迁移——Task 4 的迁移一次性捕获「删 FamilyGoal + 加 Journey」。

**Files:**
- Delete: `backend/src/Homework.Domain/Scoring/FamilyGoal.cs`
- Delete: `backend/src/Homework.Domain/Scoring/FamilyGoalProgressService.cs`
- Delete: `backend/src/Homework.Application/Scoring/FamilyGoalAppService.cs`
- Delete: `backend/src/Homework.Application.Contracts/Scoring/IFamilyGoalAppService.cs`
- Delete: `backend/src/Homework.Application.Contracts/Scoring/Dtos/FamilyGoalDto.cs`
- Delete: `backend/src/Homework.Application.Contracts/Scoring/Dtos/CreateUpdateFamilyGoalDto.cs`
- Delete: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Scoring/FamilyGoalAppService_Tests.cs`
- Delete: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Scoring/FamilyGoalProgress_Tests.cs`
- Modify: `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`
- Modify: `backend/src/Homework.Domain.Shared/Localization/Homework/en.json`
- Modify: `backend/src/Homework.Domain.Shared/Localization/Homework/zh-Hans.json`
- Modify: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Accounts/OwnershipIsolation_Tests.cs`

**Interfaces:** 无新增。此任务的验收 = 解决方案编译通过 + 现有测试套（去掉已删的）全绿。

- [ ] **Step 1: 删除 6 个源文件 + 2 个测试文件**

```bash
cd backend
git rm src/Homework.Domain/Scoring/FamilyGoal.cs \
       src/Homework.Domain/Scoring/FamilyGoalProgressService.cs \
       src/Homework.Application/Scoring/FamilyGoalAppService.cs \
       src/Homework.Application.Contracts/Scoring/IFamilyGoalAppService.cs \
       src/Homework.Application.Contracts/Scoring/Dtos/FamilyGoalDto.cs \
       src/Homework.Application.Contracts/Scoring/Dtos/CreateUpdateFamilyGoalDto.cs \
       test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Scoring/FamilyGoalAppService_Tests.cs \
       test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Scoring/FamilyGoalProgress_Tests.cs
```

- [ ] **Step 2: 从 DbContext 移除 FamilyGoal**

Modify `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`:
- 删除 DbSet 行：`public DbSet<FamilyGoal> FamilyGoals { get; set; }`
- 删除整个 `builder.Entity<FamilyGoal>(b => { ... });` 配置块（含 `ToTable("...FamilyGoals")`、Title/RewardText 属性配置）。
- `using Homework.Scoring;` **保留**（`DailyScore` 同命名空间仍被引用）。

- [ ] **Step 3: 移除 FamilyGoal 本地化键**

Modify `en.json` 与 `zh-Hans.json`（`backend/src/Homework.Domain.Shared/Localization/Homework/`）—— 删除这些键：`Menu:FamilyGoals`、`TargetStars`、`CurrentStars`、`Progress`、`Achieved`、`RewardText`、`CreateGoal`。**保留 `StartDate`、`EndDate`**（Journey 复用）。删除后确保 JSON 合法（逗号正确、无尾逗号）。

- [ ] **Step 4: 从 OwnershipIsolation_Tests 去除 FamilyGoal 引用**

Modify `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Accounts/OwnershipIsolation_Tests.cs`:
- 删 `using Homework.Scoring;` 与 `using Homework.Scoring.Dtos;`（若仅 FamilyGoal 用到）。
- 删字段 `private readonly IFamilyGoalAppService _goals;` 与构造函数里 `_goals = GetRequiredService<IFamilyGoalAppService>();`。
- 在 `Parent_B_Cannot_Touch_Parent_A_Data` 内：删 `goalOfA` 变量（声明与创建 `goalOfA = (await _goals.CreateAsync(...)).Id;`）以及 `_principal.Change(Parent(pB))` 块内两行 `_goals.GetAsync(goalOfA)` / `_goals.UpdateAsync(goalOfA, ...)` 断言。child/template/task 隔离断言保持不变。

- [ ] **Step 5: 编译 + 全量测试**

Run: `dotnet build` 然后 `dotnet test`
Expected: Build succeeded；测试全绿（比之前少 7 个 FamilyGoal 用例；Domain 44、EFCore 45）。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "refactor(journey): 删除 FamilyGoal 整套(实体/服务/DTO/进度/测试/本地化)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Journey 持久化 + 重塑迁移

DbContext 配置 Journey + 两个 owned 集合；删除 `ChildProfile.ActivePetId`；生成一次迁移（drop AppFamilyGoals + ActivePetId 列，add AppJourneys/AppJourneyPetStages/AppJourneyBackpackItems）。

**Files:**
- Modify: `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`
- Modify: `backend/src/Homework.Domain/Children/ChildProfile.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyPersistence_Tests.cs`

**Interfaces:**
- Consumes: Task 1/2 的 `Journey`/子实体。
- Produces: `IRepository<Journey, Guid>` 可用；`WithDetailsAsync(x => x.Stages, x => x.Backpack)` 能加载子集合。`ChildProfile` 不再有 `ActivePetId`/`SetActivePet`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyPersistence_Tests.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Journeys;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyPersistence_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IRepository<Journey, Guid> _repo;
    private readonly IGuidGenerator _guid;

    public JourneyPersistence_Tests()
    {
        _repo = GetRequiredService<IRepository<Journey, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    [Fact]
    public async Task Persists_And_Reloads_Journey_With_Stages_And_Backpack()
    {
        var now = new DateTime(2026, 7, 10, 0, 0, 0, DateTimeKind.Utc);
        var id = _guid.Create();
        var item = _guid.Create();

        await WithUnitOfWorkAsync(async () =>
        {
            var j = new Journey(id, _guid.Create(), _guid.Create(), "旅程",
                new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), _guid.Create());
            j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
            j.GrantReward(item);
            j.Feed(item, 12, now); // growth 12, no evolve
            await _repo.InsertAsync(j, autoSave: true);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var q = await _repo.WithDetailsAsync(x => x.Stages, x => x.Backpack);
            var j = q.Single(x => x.Id == id);
            j.Status.ShouldBe(JourneyStatus.Active);
            j.Stages.Count.ShouldBe(5);
            j.CurrentLevel.ShouldBe(1);
            j.GrowthPoints.ShouldBe(12);
            j.Backpack.ShouldBeEmpty(); // fed the only item
        });
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~JourneyPersistence_Tests`
Expected: 失败 —— Journey 未注册（无表/无 DbSet）。

- [ ] **Step 3: DbContext 注册 Journey + owned 集合**

Modify `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`:
- 顶部加 `using Homework.Journeys;`。
- DbSet 组加：`public DbSet<Journey> Journeys { get; set; }`
- `OnModelCreating` 里加：

```csharp
        builder.Entity<Journey>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "Journeys", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Title).IsRequired().HasMaxLength(128);
            b.Property(x => x.Description).HasMaxLength(512);
            b.HasIndex(x => new { x.ChildId, x.Status });
            b.HasMany(x => x.Stages).WithOne()
                .HasForeignKey(s => s.JourneyId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(x => x.Backpack).WithOne()
                .HasForeignKey(bp => bp.JourneyId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<JourneyPetStage>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "JourneyPetStages", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.HasKey(x => new { x.JourneyId, x.Level });
        });

        builder.Entity<JourneyBackpackItem>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "JourneyBackpackItems", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.HasKey(x => new { x.JourneyId, x.RewardItemId });
        });
```

- [ ] **Step 4: 删除 ChildProfile.ActivePetId**

Modify `backend/src/Homework.Domain/Children/ChildProfile.cs`:
- 删属性行 `public Guid? ActivePetId { get; private set; }`
- 删方法行 `public void SetActivePet(Guid? petId) => ActivePetId = petId;`
（全库仅领域定义 + 迁移引用它，无服务/测试引用。）

- [ ] **Step 5: 运行确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~JourneyPersistence_Tests`
Expected: PASS。再跑 `dotnet test` 确认无回归。

- [ ] **Step 6: 生成重塑迁移**

Run: `dotnet ef migrations add Reshaped_FamilyGoal_To_Journey --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore`
Expected: 迁移含 drop `AppFamilyGoals`、drop column `AppChildProfiles.ActivePetId`、create `AppJourneys` + `AppJourneyPetStages`(复合PK) + `AppJourneyBackpackItems`(复合PK) + 级联FK；snapshot 更新。

- [ ] **Step 7: 提交**

```bash
git add backend/src/Homework.EntityFrameworkCore backend/src/Homework.Domain/Children/ChildProfile.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys
git commit -m "feat(journey): Journey 持久化 + 删 ActivePetId + 重塑迁移

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: RewardResolver（指定/加权随机 + 空池兜底）

奖励解析：模板项指定具体道具则用之；否则在启用道具上按 `RandomWeight` 加权随机；空池返回 null（无奖励，spec §12）。`IRandomPicker` 抽象便于测试。纯新增，不动现有引擎。

**Files:**
- Create: `backend/src/Homework.Domain/Tasks/IRandomPicker.cs`
- Create: `backend/src/Homework.Domain/Tasks/RewardResolver.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/RewardResolver_Tests.cs`

**Interfaces:**
- Consumes: 第一期 `RewardItem`（`IsActive`/`RandomWeight`）。
- Produces:
  - `interface IRandomPicker { int PickWeighted(IReadOnlyList<int> weights); }`（`DefaultRandomPicker` 实现，`Random.Shared` 加权）。
  - `RewardResolver : DomainService`，`Task<Guid?> ResolveAsync(Guid? specificRewardItemId, bool isRandom)`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/RewardResolver_Tests.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Tasks;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class RewardResolver_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly RewardResolver _resolver;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IGuidGenerator _guid;

    public RewardResolver_Tests()
    {
        _resolver = GetRequiredService<RewardResolver>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    [Fact]
    public async Task Specific_Returns_That_Id()
    {
        var id = _guid.Create();
        (await _resolver.ResolveAsync(id, isRandom: false)).ShouldBe(id);
    }

    [Fact]
    public async Task Random_Empty_Pool_Returns_Null()
    {
        // no active reward items seeded in a fresh scope
        (await _resolver.ResolveAsync(null, isRandom: true)).ShouldBeNull();
    }

    [Fact]
    public async Task Random_Picks_An_Active_Item()
    {
        RewardItem active = null!;
        await WithUnitOfWorkAsync(async () =>
        {
            active = new RewardItem(_guid.Create(), "闪光浆果", 12, 1);
            active.Activate();
            await _rewardRepo.InsertAsync(active, autoSave: true);
            var inactive = new RewardItem(_guid.Create(), "隐藏道具", 12, 1); // not activated
            await _rewardRepo.InsertAsync(inactive, autoSave: true);
        });

        var picked = await _resolver.ResolveAsync(null, isRandom: true);
        picked.ShouldBe(active.Id); // only one active → must pick it
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~RewardResolver_Tests`
Expected: 编译失败 —— `RewardResolver`/`IRandomPicker` 不存在。

- [ ] **Step 3: 写 IRandomPicker + 默认实现**

Create `backend/src/Homework.Domain/Tasks/IRandomPicker.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using Volo.Abp.DependencyInjection;

namespace Homework.Tasks;

/// <summary>加权随机选择（抽象出来便于测试替身）。</summary>
public interface IRandomPicker
{
    /// <summary>按权重选一个下标；总权重 &lt;=0 时返回 0。</summary>
    int PickWeighted(IReadOnlyList<int> weights);
}

public class DefaultRandomPicker : IRandomPicker, ITransientDependency
{
    public int PickWeighted(IReadOnlyList<int> weights)
    {
        var total = weights.Sum();
        if (total <= 0)
        {
            return 0;
        }

        var roll = Random.Shared.Next(total);
        var acc = 0;
        for (var i = 0; i < weights.Count; i++)
        {
            acc += weights[i];
            if (roll < acc)
            {
                return i;
            }
        }

        return weights.Count - 1;
    }
}
```

- [ ] **Step 4: 写 RewardResolver**

Create `backend/src/Homework.Domain/Tasks/RewardResolver.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Homework.Tasks;

/// <summary>为每日任务解析实际奖励道具：指定优先，否则在启用道具上加权随机；空池返回 null。</summary>
public class RewardResolver : DomainService
{
    private readonly IRepository<RewardItem, Guid> _rewardRepository;
    private readonly IRandomPicker _picker;

    public RewardResolver(IRepository<RewardItem, Guid> rewardRepository, IRandomPicker picker)
    {
        _rewardRepository = rewardRepository;
        _picker = picker;
    }

    public async Task<Guid?> ResolveAsync(Guid? specificRewardItemId, bool isRandom)
    {
        if (!isRandom)
        {
            return specificRewardItemId;
        }

        var items = await _rewardRepository.GetListAsync(x => x.IsActive);
        if (items.Count == 0)
        {
            Logger.LogWarning("RewardResolver: no active RewardItem to draw from; task gets no reward.");
            return null;
        }

        var ordered = items.OrderBy(x => x.Id).ToList();
        var index = _picker.PickWeighted(ordered.Select(x => Math.Max(0, x.RandomWeight)).ToList());
        return ordered[index].Id;
    }
}
```

- [ ] **Step 5: 运行确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~RewardResolver_Tests`
Expected: PASS（3 个用例）。

- [ ] **Step 6: 提交**

```bash
git add backend/src/Homework.Domain/Tasks/IRandomPicker.cs backend/src/Homework.Domain/Tasks/RewardResolver.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/RewardResolver_Tests.cs
git commit -m "feat(journey): RewardResolver 奖励解析(指定/加权随机/空池兜底)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: JourneyTaskTemplateItem 聚合 + 家长 CRUD（新增，不删 Weekly）

新增按旅程的任务模板（自有聚合，含奖励配置），与旧 `WeeklyTaskTemplateItem` **并存**（Task 8 才删旧的）——保证每步 build 绿。

**Files:**
- Create: `backend/src/Homework.Domain/Tasks/JourneyTaskTemplateItem.cs`
- Create: `backend/src/Homework.Application.Contracts/Tasks/Dtos/JourneyTaskTemplateItemDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Tasks/Dtos/CreateJourneyTaskTemplateItemDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Tasks/Dtos/UpdateJourneyTaskTemplateItemDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Tasks/Dtos/GetJourneyTemplateInput.cs`
- Create: `backend/src/Homework.Application.Contracts/Tasks/IJourneyTaskTemplateAppService.cs`
- Create: `backend/src/Homework.Application/Tasks/JourneyTaskTemplateAppService.cs`
- Modify: `backend/src/Homework.Application/HomeworkApplicationMappers.cs`
- Modify: `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/JourneyTaskTemplateAppService_Tests.cs`

**Interfaces:**
- Consumes: Task 1 的 `Journey`（用 `ChildId` 走归属校验）。
- Produces:
  - `JourneyTaskTemplateItem : FullAuditedAggregateRoot<Guid>`：`JourneyId, DayOfWeek, Title, Subject?, Order, EstimatedMinutes?, IsActive, RewardItemId?, RewardIsRandom`；ctor `(Guid id, Guid journeyId, DayOfWeek dow, string title, string? subject=null, int order=0, int? estimatedMinutes=null)`（IsActive=true、RewardIsRandom=true）；`SetTitle/SetOrder`(返回 this)、`SetSubject/SetEstimatedMinutes/Activate/Deactivate`、`SetReward(Guid? rewardItemId, bool isRandom)`。
  - `IJourneyTaskTemplateAppService`：`GetListAsync(GetJourneyTemplateInput)`、`CreateAsync(CreateJourneyTaskTemplateItemDto)`、`UpdateAsync(Guid, UpdateJourneyTaskTemplateItemDto)`、`DeleteAsync(Guid)`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/JourneyTaskTemplateAppService_Tests.cs`:

```csharp
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Journeys;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyTaskTemplateAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IJourneyTaskTemplateAppService _service;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public JourneyTaskTemplateAppService_Tests()
    {
        _service = GetRequiredService<IJourneyTaskTemplateAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(
        new[] { new Claim(AbpClaimTypes.UserId, id.ToString()) }, "test"));

    private async Task<Guid> SeedJourneyAsync(Guid parentId, Guid childId)
    {
        var journeyId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, "娃", 3));
            await _journeyRepo.InsertAsync(new Journey(journeyId, parentId, childId, "旅程",
                new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), _guid.Create()));
        });
        return journeyId;
    }

    [Fact]
    public async Task Create_List_Update_Delete_With_Reward_Config()
    {
        var pid = _guid.Create();
        var childId = _guid.Create();
        var journeyId = await SeedJourneyAsync(pid, childId);
        var rewardItemId = _guid.Create();

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new CreateJourneyTaskTemplateItemDto
            {
                JourneyId = journeyId, DayOfWeek = DayOfWeek.Monday, Title = "口算", Order = 0,
                RewardItemId = rewardItemId, RewardIsRandom = false
            });
            created.RewardIsRandom.ShouldBeFalse();
            created.RewardItemId.ShouldBe(rewardItemId);

            var list = await _service.GetListAsync(new GetJourneyTemplateInput { JourneyId = journeyId });
            list.Items.Count.ShouldBe(1);

            var updated = await _service.UpdateAsync(created.Id, new UpdateJourneyTaskTemplateItemDto
            {
                Title = "口算20分钟", Order = 0, IsActive = false, RewardItemId = null, RewardIsRandom = true
            });
            updated.Title.ShouldBe("口算20分钟");
            updated.IsActive.ShouldBeFalse();
            updated.RewardIsRandom.ShouldBeTrue();
            updated.RewardItemId.ShouldBeNull();

            await _service.DeleteAsync(created.Id);
            (await _service.GetListAsync(new GetJourneyTemplateInput { JourneyId = journeyId })).Items.Count.ShouldBe(0);
        }
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~JourneyTaskTemplateAppService_Tests`
Expected: 编译失败。

- [ ] **Step 3: 写实体 JourneyTaskTemplateItem**

Create `backend/src/Homework.Domain/Tasks/JourneyTaskTemplateItem.cs`:

```csharp
using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Tasks;

/// <summary>旅程的周任务模板项（含奖励配置：指定道具或系统随机）。</summary>
public class JourneyTaskTemplateItem : FullAuditedAggregateRoot<Guid>
{
    public Guid JourneyId { get; private set; }
    public DayOfWeek DayOfWeek { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Subject { get; private set; }
    public int Order { get; private set; }
    public int? EstimatedMinutes { get; private set; }
    public bool IsActive { get; private set; }
    public Guid? RewardItemId { get; private set; }
    public bool RewardIsRandom { get; private set; }

    protected JourneyTaskTemplateItem() { }

    public JourneyTaskTemplateItem(Guid id, Guid journeyId, DayOfWeek dayOfWeek, [NotNull] string title,
        string? subject = null, int order = 0, int? estimatedMinutes = null) : base(id)
    {
        JourneyId = journeyId;
        DayOfWeek = dayOfWeek;
        SetTitle(title);
        Subject = subject;
        SetOrder(order);
        EstimatedMinutes = estimatedMinutes;
        IsActive = true;
        RewardIsRandom = true;
        RewardItemId = null;
    }

    public JourneyTaskTemplateItem SetTitle([NotNull] string title)
    {
        Title = Check.NotNullOrWhiteSpace(title, nameof(title), maxLength: 128);
        return this;
    }

    public JourneyTaskTemplateItem SetOrder(int order)
    {
        if (order < 0)
        {
            throw new ArgumentException("order must be >= 0", nameof(order));
        }

        Order = order;
        return this;
    }

    public void SetSubject(string? subject) => Subject = subject;

    public void SetEstimatedMinutes(int? minutes) => EstimatedMinutes = minutes;

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;

    /// <summary>配置奖励：随机则忽略指定道具；否则记录指定道具。</summary>
    public void SetReward(Guid? rewardItemId, bool isRandom)
    {
        RewardIsRandom = isRandom;
        RewardItemId = isRandom ? null : rewardItemId;
    }
}
```

- [ ] **Step 4: 建 DTO + 接口**

Create `backend/src/Homework.Application.Contracts/Tasks/Dtos/JourneyTaskTemplateItemDto.cs`:

```csharp
using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Tasks.Dtos;

public class JourneyTaskTemplateItemDto : EntityDto<Guid>
{
    public Guid JourneyId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public int Order { get; set; }
    public int? EstimatedMinutes { get; set; }
    public bool IsActive { get; set; }
    public Guid? RewardItemId { get; set; }
    public bool RewardIsRandom { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Tasks/Dtos/CreateJourneyTaskTemplateItemDto.cs`:

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Tasks.Dtos;

public class CreateJourneyTaskTemplateItemDto
{
    [Required] public Guid JourneyId { get; set; }
    [Required] public DayOfWeek DayOfWeek { get; set; }
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(64)] public string? Subject { get; set; }
    [Range(0, int.MaxValue)] public int Order { get; set; }
    [Range(1, 600)] public int? EstimatedMinutes { get; set; }
    public Guid? RewardItemId { get; set; }
    public bool RewardIsRandom { get; set; } = true;
}
```

Create `backend/src/Homework.Application.Contracts/Tasks/Dtos/UpdateJourneyTaskTemplateItemDto.cs`:

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Tasks.Dtos;

public class UpdateJourneyTaskTemplateItemDto
{
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(64)] public string? Subject { get; set; }
    [Range(0, int.MaxValue)] public int Order { get; set; }
    [Range(1, 600)] public int? EstimatedMinutes { get; set; }
    public bool IsActive { get; set; }
    public Guid? RewardItemId { get; set; }
    public bool RewardIsRandom { get; set; } = true;
}
```

Create `backend/src/Homework.Application.Contracts/Tasks/Dtos/GetJourneyTemplateInput.cs`:

```csharp
using System;

namespace Homework.Tasks.Dtos;

public class GetJourneyTemplateInput
{
    public Guid JourneyId { get; set; }
    public DayOfWeek? DayOfWeek { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Tasks/IJourneyTaskTemplateAppService.cs`:

```csharp
using System;
using System.Threading.Tasks;
using Homework.Tasks.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Tasks;

public interface IJourneyTaskTemplateAppService : IApplicationService
{
    Task<ListResultDto<JourneyTaskTemplateItemDto>> GetListAsync(GetJourneyTemplateInput input);
    Task<JourneyTaskTemplateItemDto> CreateAsync(CreateJourneyTaskTemplateItemDto input);
    Task<JourneyTaskTemplateItemDto> UpdateAsync(Guid id, UpdateJourneyTaskTemplateItemDto input);
    Task DeleteAsync(Guid id);
}
```

- [ ] **Step 5: 加 Mapperly 映射**

Modify `backend/src/Homework.Application/HomeworkApplicationMappers.cs` — 末尾加：

```csharp
[Mapper]
public partial class JourneyTaskTemplateItemMapper : MapperBase<JourneyTaskTemplateItem, JourneyTaskTemplateItemDto>
{
    public override partial JourneyTaskTemplateItemDto Map(JourneyTaskTemplateItem source);
    public override partial void Map(JourneyTaskTemplateItem source, JourneyTaskTemplateItemDto destination);
}
```

（`Homework.Tasks` / `Homework.Tasks.Dtos` 命名空间已在文件顶部 using。）

- [ ] **Step 6: 建 App Service**

Create `backend/src/Homework.Application/Tasks/JourneyTaskTemplateAppService.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Journeys;
using Homework.Permissions;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace Homework.Tasks;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class JourneyTaskTemplateAppService : HomeworkAppService, IJourneyTaskTemplateAppService
{
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _repository;
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly ChildProfileManager _childManager;

    public JourneyTaskTemplateAppService(
        IRepository<JourneyTaskTemplateItem, Guid> repository,
        IRepository<Journey, Guid> journeyRepository,
        ChildProfileManager childManager)
    {
        _repository = repository;
        _journeyRepository = journeyRepository;
        _childManager = childManager;
    }

    public async Task<ListResultDto<JourneyTaskTemplateItemDto>> GetListAsync(GetJourneyTemplateInput input)
    {
        await EnsureJourneyOwnedAsync(input.JourneyId);
        var journeyId = input.JourneyId;
        var dow = input.DayOfWeek;
        var items = await _repository.GetListAsync(t => t.JourneyId == journeyId && (dow == null || t.DayOfWeek == dow));
        var dtos = items.OrderBy(t => t.DayOfWeek).ThenBy(t => t.Order)
            .Select(t => ObjectMapper.Map<JourneyTaskTemplateItem, JourneyTaskTemplateItemDto>(t)).ToList();
        return new ListResultDto<JourneyTaskTemplateItemDto>(dtos);
    }

    public async Task<JourneyTaskTemplateItemDto> CreateAsync(CreateJourneyTaskTemplateItemDto input)
    {
        await EnsureJourneyOwnedAsync(input.JourneyId);
        var item = new JourneyTaskTemplateItem(GuidGenerator.Create(), input.JourneyId, input.DayOfWeek,
            input.Title, input.Subject, input.Order, input.EstimatedMinutes);
        item.SetReward(input.RewardItemId, input.RewardIsRandom);
        await _repository.InsertAsync(item, autoSave: true);
        return ObjectMapper.Map<JourneyTaskTemplateItem, JourneyTaskTemplateItemDto>(item);
    }

    public async Task<JourneyTaskTemplateItemDto> UpdateAsync(Guid id, UpdateJourneyTaskTemplateItemDto input)
    {
        var item = await _repository.GetAsync(id);
        await EnsureJourneyOwnedAsync(item.JourneyId);
        item.SetTitle(input.Title);
        item.SetSubject(input.Subject);
        item.SetOrder(input.Order);
        item.SetEstimatedMinutes(input.EstimatedMinutes);
        if (input.IsActive) { item.Activate(); } else { item.Deactivate(); }
        item.SetReward(input.RewardItemId, input.RewardIsRandom);
        await _repository.UpdateAsync(item, autoSave: true);
        return ObjectMapper.Map<JourneyTaskTemplateItem, JourneyTaskTemplateItemDto>(item);
    }

    public async Task DeleteAsync(Guid id)
    {
        var item = await _repository.GetAsync(id);
        await EnsureJourneyOwnedAsync(item.JourneyId);
        await _repository.DeleteAsync(item);
    }

    private async Task EnsureJourneyOwnedAsync(Guid journeyId)
    {
        var journey = await _journeyRepository.GetAsync(journeyId);
        await _childManager.EnsureChildOwnedAsync(journey.ChildId);
    }
}
```

- [ ] **Step 7: DbContext 注册**

Modify `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`:
- DbSet 组加：`public DbSet<JourneyTaskTemplateItem> JourneyTaskTemplateItems { get; set; }`
- `OnModelCreating` 加：

```csharp
        builder.Entity<JourneyTaskTemplateItem>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "JourneyTaskTemplateItems", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Title).IsRequired().HasMaxLength(128);
            b.Property(x => x.Subject).HasMaxLength(64);
            b.HasIndex(x => new { x.JourneyId, x.DayOfWeek });
        });
```

- [ ] **Step 8: 运行确认通过 + 迁移**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~JourneyTaskTemplateAppService_Tests`（PASS），再 `dotnet test`（无回归）。
Run: `dotnet ef migrations add Added_JourneyTaskTemplateItem --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore`
Expected: 迁移含 create `AppJourneyTaskTemplateItems`。

- [ ] **Step 9: 提交**

```bash
git add backend/src/Homework.Domain/Tasks/JourneyTaskTemplateItem.cs backend/src/Homework.Application.Contracts/Tasks backend/src/Homework.Application/Tasks/JourneyTaskTemplateAppService.cs backend/src/Homework.Application/HomeworkApplicationMappers.cs backend/src/Homework.EntityFrameworkCore backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/JourneyTaskTemplateAppService_Tests.cs
git commit -m "feat(journey): JourneyTaskTemplateItem 聚合 + 家长 CRUD + 迁移

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: DailyTask 扩展 + DailyTaskGenerator 旅程域内改造

`DailyTask` 加 `JourneyId/RewardItemId/RewardGranted`；`DailyTaskGenerator` 改为按孩子的 Active 旅程 + 其模板生成、解析奖励；`DailyTaskAppService.CreateAsync`(临时任务)挂到 Active 旅程。旧 `WeeklyTaskTemplateItem` 仍在但生成器不再用它（Task 8 删）。

**Files:**
- Modify: `backend/src/Homework.Domain/Tasks/DailyTask.cs`
- Modify: `backend/src/Homework.Domain/Tasks/DailyTaskGenerator.cs`
- Modify: `backend/src/Homework.Application/Tasks/DailyTaskAppService.cs`
- Modify: `backend/src/Homework.Application.Contracts/Tasks/Dtos/DailyTaskDto.cs`
- Modify: `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`
- Modify: `backend/test/Homework.Domain.Tests/Tasks/DailyTask_Tests.cs`
- Modify: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskGenerator_Tests.cs`
- Modify: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskAppService_Tests.cs`

**Interfaces:**
- Consumes: Task 1 `Journey`（Active 判定 + StartDate 窗口）、Task 6 `JourneyTaskTemplateItem`、Task 5 `RewardResolver`。
- Produces:
  - `DailyTask` 新增 `Guid JourneyId`、`Guid? RewardItemId`、`bool RewardGranted`；ctor 变为 `(Guid id, Guid childId, Guid journeyId, DateOnly date, string title, string? subject=null, int order=0, Guid? sourceTemplateItemId=null, Guid? rewardItemId=null)`；方法 `MarkRewardGranted()`、`ClearRewardGranted()`。
  - `DailyTaskGenerator.EnsureDayAsync(childId, date)`：找该孩子 `Status==Active` 旅程，`date >= journey.StartDate` 才生成；从该旅程 `IsActive` 模板按 DayOfWeek 生成，逐项 `RewardResolver.ResolveAsync` 写入 `RewardItemId`。无 Active 旅程或未到 StartDate → 不生成。`SettleDay/SettlePastDays` 逻辑不变。

- [ ] **Step 1: 改测试（RED）——DailyTask 领域 + 生成器旅程域**

Modify `backend/test/Homework.Domain.Tests/Tasks/DailyTask_Tests.cs` —— 更新构造调用为新签名（加 `journeyId`）。示例把每处 `new DailyTask(id, childId, date, title, ...)` 改为 `new DailyTask(id, childId, journeyId, date, title, ...)`（`journeyId` 用 `Guid.NewGuid()`）。并加一条奖励标记测试：

```csharp
    [Fact]
    public void Reward_Granted_Flag_Toggles()
    {
        var t = new DailyTask(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 7, 6), "语文");
        t.RewardGranted.ShouldBeFalse();
        t.MarkRewardGranted();
        t.RewardGranted.ShouldBeTrue();
        t.ClearRewardGranted();
        t.RewardGranted.ShouldBeFalse();
    }
```

Modify `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskGenerator_Tests.cs` —— 重写为「先建并 Start 一个 Active 旅程 + 加 JourneyTaskTemplateItem，再 EnsureDay」。核心用例改写示意（保留 idempotent / rest-day / settle 覆盖，全部改成旅程域）：

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Tasks;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class DailyTaskGenerator_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly DailyTaskGenerator _generator;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<DailyTask, Guid> _dailyRepo;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IGuidGenerator _guid;

    public DailyTaskGenerator_Tests()
    {
        _generator = GetRequiredService<DailyTaskGenerator>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        _dailyRepo = GetRequiredService<IRepository<DailyTask, Guid>>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    private async Task<(Guid childId, Guid journeyId)> SeedActiveJourneyAsync(DateOnly start)
    {
        var childId = _guid.Create();
        var journeyId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var reward = new RewardItem(_guid.Create(), "能量果实", 12, 1); reward.Activate();
            await _rewardRepo.InsertAsync(reward, autoSave: true);
            var j = new Journey(journeyId, _guid.Create(), childId, "旅程", start, start.AddDays(60), _guid.Create());
            j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });
        return (childId, journeyId);
    }

    [Fact]
    public async Task EnsureDay_Generates_From_Active_Journey_Templates_With_Resolved_Reward()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
        {
            var t = new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0);
            // RewardIsRandom = true by default → resolver picks the one active RewardItem
            await _templateRepo.InsertAsync(t, autoSave: true);
        });

        var tasks = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));
        tasks.Count.ShouldBe(1);
        tasks[0].JourneyId.ShouldBe(journeyId);
        tasks[0].RewardItemId.ShouldNotBeNull();
    }

    [Fact]
    public async Task EnsureDay_No_Active_Journey_Generates_Nothing()
    {
        var childId = _guid.Create();
        var tasks = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, new DateOnly(2026, 7, 6)));
        tasks.ShouldBeEmpty();
    }

    [Fact]
    public async Task EnsureDay_Is_Idempotent()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文"), autoSave: true));
        await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));
        await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));
        var count = await WithUnitOfWorkAsync(async () => (await _dailyRepo.GetListAsync(x => x.ChildId == childId && x.Date == monday)).Count);
        count.ShouldBe(1);
    }
}
```

Modify `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskAppService_Tests.cs` —— 其现有用例依赖旧的 per-child weekly template 生成。改为先 SeedActiveJourney + JourneyTaskTemplateItem（同上 helper 思路），`GetBoardAsync` 仍验证生成+结算，`Revoke_Recomputes_DailyScore_Down` 等改在旅程域下建立数据。保留断言意图（board 生成、撤销降分、临时任务破满）。

- [ ] **Step 2: 运行确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~DailyTaskGenerator_Tests`
Expected: 编译失败/断言失败（新签名与旅程域逻辑未实现）。

- [ ] **Step 3: 扩展 DailyTask 实体**

Modify `backend/src/Homework.Domain/Tasks/DailyTask.cs`:
- 加属性（放在 `SourceTemplateItemId` 附近）：

```csharp
    public Guid JourneyId { get; private set; }
    public Guid? RewardItemId { get; private set; }
    public bool RewardGranted { get; private set; }
```

- 改构造函数签名为（在 `childId` 后加 `journeyId`，末尾加 `rewardItemId`）：

```csharp
    public DailyTask(
        Guid id, Guid childId, Guid journeyId, DateOnly date, [NotNull] string title,
        string? subject = null, int order = 0, Guid? sourceTemplateItemId = null, Guid? rewardItemId = null)
        : base(id)
    {
        ChildId = childId;
        JourneyId = journeyId;
        Date = date;
        SetTitle(title);
        SetSubject(subject);
        SetOrder(order);
        SourceTemplateItemId = sourceTemplateItemId;
        RewardItemId = rewardItemId;
        RewardGranted = false;
    }
```

- 加方法（在 `Restore()` 附近）：

```csharp
    public void MarkRewardGranted() => RewardGranted = true;

    public void ClearRewardGranted() => RewardGranted = false;
```

- [ ] **Step 4: DailyTaskDto 加字段**

Modify `backend/src/Homework.Application.Contracts/Tasks/Dtos/DailyTaskDto.cs` — 加：

```csharp
    public Guid JourneyId { get; set; }
    public Guid? RewardItemId { get; set; }
    public bool RewardGranted { get; set; }
```

- [ ] **Step 5: 改造 DailyTaskGenerator（旅程域内生成 + 奖励解析）**

Modify `backend/src/Homework.Domain/Tasks/DailyTaskGenerator.cs` —— 替换整个类为：

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Journeys;
using Homework.Scoring;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Homework.Tasks;

/// <summary>按孩子的 Active 旅程惰性生成每日任务并结算分数（幂等）。</summary>
public class DailyTaskGenerator : DomainService
{
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepository;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepository;
    private readonly IRepository<DailyScore, Guid> _dailyScoreRepository;
    private readonly RewardResolver _rewardResolver;

    public DailyTaskGenerator(
        IRepository<Journey, Guid> journeyRepository,
        IRepository<JourneyTaskTemplateItem, Guid> templateRepository,
        IRepository<DailyTask, Guid> dailyTaskRepository,
        IRepository<DailyScore, Guid> dailyScoreRepository,
        RewardResolver rewardResolver)
    {
        _journeyRepository = journeyRepository;
        _templateRepository = templateRepository;
        _dailyTaskRepository = dailyTaskRepository;
        _dailyScoreRepository = dailyScoreRepository;
        _rewardResolver = rewardResolver;
    }

    public async Task<List<DailyTask>> EnsureDayAsync(Guid childId, DateOnly date)
    {
        var existing = await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == date);
        if (existing.Count > 0)
        {
            return existing.OrderBy(t => t.Order).ToList();
        }

        var journey = await GetActiveJourneyAsync(childId, date);
        if (journey == null)
        {
            return new List<DailyTask>();
        }

        var dow = date.DayOfWeek;
        var journeyId = journey.Id;
        var templates = (await _templateRepository.GetListAsync(
                t => t.JourneyId == journeyId && t.DayOfWeek == dow && t.IsActive))
            .OrderBy(t => t.Order).ToList();

        var created = new List<DailyTask>();
        foreach (var t in templates)
        {
            var rewardItemId = await _rewardResolver.ResolveAsync(t.RewardItemId, t.RewardIsRandom);
            var task = new DailyTask(GuidGenerator.Create(), childId, journeyId, date, t.Title,
                t.Subject, t.Order, t.Id, rewardItemId);
            await _dailyTaskRepository.InsertAsync(task, autoSave: true);
            created.Add(task);
        }

        return created;
    }

    public async Task SettleDayAsync(Guid childId, DateOnly date)
    {
        var (total, completed) = await ResolveDayTotalsAsync(childId, date);
        var score = await _dailyScoreRepository.FirstOrDefaultAsync(s => s.ChildId == childId && s.Date == date);
        if (score == null)
        {
            score = new DailyScore(GuidGenerator.Create(), childId, date);
            score.Settle(total, completed);
            await _dailyScoreRepository.InsertAsync(score, autoSave: true);
        }
        else
        {
            score.Settle(total, completed);
            await _dailyScoreRepository.UpdateAsync(score, autoSave: true);
        }
    }

    public async Task SettlePastDaysAsync(Guid childId, DateOnly fromDate, DateOnly toDate)
    {
        for (var date = fromDate; date <= toDate; date = date.AddDays(1))
        {
            await SettleDayAsync(childId, date);
        }
    }

    private async Task<(int Total, int Completed)> ResolveDayTotalsAsync(Guid childId, DateOnly date)
    {
        var tasks = await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == date);
        if (tasks.Count > 0)
        {
            return (tasks.Count, tasks.Count(t => t.CountsAsCompleted));
        }

        var journey = await GetActiveJourneyAsync(childId, date);
        if (journey == null)
        {
            return (0, 0);
        }

        var dow = date.DayOfWeek;
        var journeyId = journey.Id;
        var templateCount = await _templateRepository.CountAsync(
            t => t.JourneyId == journeyId && t.DayOfWeek == dow && t.IsActive);
        return (templateCount, 0);
    }

    /// <summary>该孩子当前 Active 旅程，且 date 已进入其 StartDate（Active 期间即使过 EndDate 也持续生成）。</summary>
    private async Task<Journey?> GetActiveJourneyAsync(Guid childId, DateOnly date)
    {
        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.ChildId == childId && j.Status == JourneyStatus.Active);
        if (journey == null || date < journey.StartDate)
        {
            return null;
        }

        return journey;
    }
}
```

- [ ] **Step 6: 修 DailyTaskAppService 的 ctor 调用（临时任务挂到 Active 旅程）**

Modify `backend/src/Homework.Application/Tasks/DailyTaskAppService.cs`:
- 注入 `IRepository<Journey, Guid> _journeyRepository`（构造函数加参数并赋值；顶部 `using Homework.Journeys;`）。
- `CreateAsync` 里创建 `DailyTask` 处：先取该孩子 Active 旅程，用其 `Id` 作为 `journeyId`；无 Active 旅程则抛 `BusinessException(HomeworkDomainErrorCodes.JourneyNotActive)`。改为：

```csharp
        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.ChildId == input.ChildId && j.Status == JourneyStatus.Active)
            ?? throw new Volo.Abp.BusinessException(HomeworkDomainErrorCodes.JourneyNotActive);
        var task = new DailyTask(GuidGenerator.Create(), input.ChildId, journey.Id, input.Date, input.Title, input.Subject, input.Order);
```

（其余 GetBoard/Update/Delete/Revoke/Restore 逻辑不变；结算调用保留。）

- [ ] **Step 7: DailyTask DbContext 索引（可选增列已随属性）**

Modify `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs` — 在 `DailyTask` 配置块加一行索引（新增列自动随属性建）：

```csharp
            b.HasIndex(x => new { x.JourneyId, x.Date });
```

- [ ] **Step 8: 运行确认通过 + 迁移**

Run: `dotnet test test/Homework.Domain.Tests` 与 `dotnet test test/Homework.EntityFrameworkCore.Tests`，全绿。
Run: `dotnet ef migrations add Added_DailyTask_Journey_Reward --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore`
Expected: 迁移含 `AppDailyTasks` 加列 `JourneyId`/`RewardItemId`/`RewardGranted` + 新索引。

- [ ] **Step 9: 提交**

```bash
git add backend/src backend/test
git commit -m "feat(journey): DailyTask 加旅程/奖励 + 生成器旅程域内生成与奖励解析

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 删除 WeeklyTaskTemplateItem（旧模板系统）

生成器已改用 JourneyTaskTemplateItem，旧的 per-child weekly 模板不再被引用，删净。

**Files:**
- Delete: `backend/src/Homework.Domain/Tasks/WeeklyTaskTemplateItem.cs`
- Delete: `backend/src/Homework.Application.Contracts/Tasks/IWeeklyTaskTemplateAppService.cs`
- Delete: `backend/src/Homework.Application/Tasks/WeeklyTaskTemplateAppService.cs`
- Delete: `backend/src/Homework.Application.Contracts/Tasks/Dtos/WeeklyTaskTemplateItemDto.cs`
- Delete: `backend/src/Homework.Application.Contracts/Tasks/Dtos/CreateWeeklyTaskTemplateItemDto.cs`
- Delete: `backend/src/Homework.Application.Contracts/Tasks/Dtos/UpdateWeeklyTaskTemplateItemDto.cs`
- Delete: `backend/src/Homework.Application.Contracts/Tasks/Dtos/GetWeeklyTemplateInput.cs`
- Delete: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/WeeklyTaskTemplateAppService_Tests.cs`
- Modify: `backend/src/Homework.Application/HomeworkApplicationMappers.cs`（删 `WeeklyTaskTemplateItemMapper`）
- Modify: `backend/src/Homework.EntityFrameworkCore/EntityFrameworkCore/HomeworkDbContext.cs`（删 DbSet + config）
- Modify: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Accounts/OwnershipIsolation_Tests.cs`（去 weekly 引用）

**Interfaces:** 无新增。验收 = 编译 + 测试全绿。

- [ ] **Step 1: 删文件**

```bash
cd backend
git rm src/Homework.Domain/Tasks/WeeklyTaskTemplateItem.cs \
       src/Homework.Application.Contracts/Tasks/IWeeklyTaskTemplateAppService.cs \
       src/Homework.Application/Tasks/WeeklyTaskTemplateAppService.cs \
       src/Homework.Application.Contracts/Tasks/Dtos/WeeklyTaskTemplateItemDto.cs \
       src/Homework.Application.Contracts/Tasks/Dtos/CreateWeeklyTaskTemplateItemDto.cs \
       src/Homework.Application.Contracts/Tasks/Dtos/UpdateWeeklyTaskTemplateItemDto.cs \
       src/Homework.Application.Contracts/Tasks/Dtos/GetWeeklyTemplateInput.cs \
       test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/WeeklyTaskTemplateAppService_Tests.cs
```

- [ ] **Step 2: 删 Mapperly + DbContext**

Modify `HomeworkApplicationMappers.cs` — 删整个 `WeeklyTaskTemplateItemMapper` 类块。
Modify `HomeworkDbContext.cs` — 删 `public DbSet<WeeklyTaskTemplateItem> WeeklyTaskTemplateItems { get; set; }` 与 `builder.Entity<WeeklyTaskTemplateItem>(...)` 配置块。

- [ ] **Step 3: 去 OwnershipIsolation_Tests 的 weekly 引用**

Modify `OwnershipIsolation_Tests.cs` — 删 `IWeeklyTaskTemplateAppService _templates` 字段/初始化，及 `_templates.CreateAsync/GetListAsync/UpdateAsync` 相关行（`templateOfA` 变量与断言）。保留 child/dailyTask 隔离断言（dailyTask 断言若依赖 template 生成，改为依赖已 SeedActiveJourney + JourneyTaskTemplateItem —— 若过于耦合，此文件只保留 child 与 journey/template 的隔离断言即可）。

- [ ] **Step 4: 编译 + 测试 + 迁移**

Run: `dotnet build` 与 `dotnet test`，全绿。
Run: `dotnet ef migrations add Removed_WeeklyTaskTemplateItem --project src/Homework.EntityFrameworkCore --startup-project src/Homework.EntityFrameworkCore`
Expected: 迁移 drop table `AppWeeklyTaskTemplateItems`。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "refactor(journey): 删除旧 WeeklyTaskTemplateItem 模板系统 + 迁移

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: JourneyManager + 家长 JourneyAppService（旅程管理）

`JourneyManager` 负责「开始旅程」（单旅程约束 + 从图鉴快照阈值）。`JourneyAppService` 让家长 CRUD 草稿旅程、设勋章。

**Files:**
- Create: `backend/src/Homework.Domain/Journeys/JourneyManager.cs`
- Create: `backend/src/Homework.Application.Contracts/Journeys/Dtos/JourneyDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Journeys/Dtos/CreateJourneyDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Journeys/Dtos/UpdateJourneyDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Journeys/Dtos/GetJourneyListInput.cs`
- Create: `backend/src/Homework.Application.Contracts/Journeys/IJourneyAppService.cs`
- Create: `backend/src/Homework.Application/Journeys/JourneyAppService.cs`
- Modify: `backend/src/Homework.Application/HomeworkApplicationMappers.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyManager_Tests.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyAppService_Tests.cs`

**Interfaces:**
- Consumes: Task 1 `Journey`；第一期 `PetSpecies`（`Forms` 的 Level/GrowthToNext）。
- Produces:
  - `JourneyManager : DomainService`，`Task StartAsync(Journey journey, Guid petSpeciesId)`（单旅程约束 + 从 species.Forms 快照阈值 + `journey.Start`）。
  - `IJourneyAppService`：`GetListAsync(GetJourneyListInput{ChildId})`、`GetAsync(Guid)`、`CreateAsync(CreateJourneyDto)`、`UpdateAsync(Guid, UpdateJourneyDto)`、`DeleteAsync(Guid)`。
  - `JourneyDto : EntityDto<Guid>`：`ChildId, Title, Description?, StartDate, EndDate, MedalId, Status, PetSpeciesId?, CurrentLevel, GrowthPoints, CompletedTime?`。

- [ ] **Step 1: 写失败测试（Manager 单旅程约束 + 从图鉴快照）**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyManager_Tests.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Journeys;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyManager_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly JourneyManager _manager;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly IGuidGenerator _guid;

    public JourneyManager_Tests()
    {
        _manager = GetRequiredService<JourneyManager>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _speciesRepo = GetRequiredService<IRepository<PetSpecies, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    private async Task<Guid> SeedSpeciesAsync()
    {
        var id = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var s = new PetSpecies(id, "火龙", $"dragon-{id:N}");
            s.SetCover("pets/x/cover.png");
            for (var lvl = 1; lvl <= 4; lvl++)
            {
                s.SetForm(lvl, $"阶{lvl}", null, lvl * 20, 1m);
                s.SetFormSprite(lvl, $"pets/x/form-{lvl}.png");
                s.SetFormEvolveVideo(lvl, $"pets/x/evolve-{lvl}-{lvl + 1}.mp4");
            }
            s.SetForm(5, "满阶", "首次喷火", null, 1.6m);
            s.SetFormSprite(5, "pets/x/form-5.png");
            s.Activate();
            await _speciesRepo.InsertAsync(s, autoSave: true);
        });
        return id;
    }

    private Journey NewDraft(Guid childId) => new(_guid.Create(), _guid.Create(), childId, "旅程",
        new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), _guid.Create());

    [Fact]
    public async Task Start_Snapshots_Species_Stage_Thresholds()
    {
        var speciesId = await SeedSpeciesAsync();
        var childId = _guid.Create();
        var journey = NewDraft(childId);

        await WithUnitOfWorkAsync(async () =>
        {
            await _journeyRepo.InsertAsync(journey, autoSave: true);
            await _manager.StartAsync(journey, speciesId);
            await _journeyRepo.UpdateAsync(journey, autoSave: true);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var q = await _journeyRepo.WithDetailsAsync(x => x.Stages);
            var reloaded = q.Single(x => x.Id == journey.Id);
            reloaded.Status.ShouldBe(JourneyStatus.Active);
            reloaded.Stages.Single(s => s.Level == 2).GrowthToNext.ShouldBe(40);
            reloaded.Stages.Single(s => s.Level == 5).GrowthToNext.ShouldBeNull();
        });
    }

    [Fact]
    public async Task Start_Second_Active_Journey_For_Same_Child_Rejected()
    {
        var speciesId = await SeedSpeciesAsync();
        var childId = _guid.Create();
        var first = NewDraft(childId);
        var second = NewDraft(childId);

        await WithUnitOfWorkAsync(async () =>
        {
            await _journeyRepo.InsertAsync(first, autoSave: true);
            await _manager.StartAsync(first, speciesId);
            await _journeyRepo.UpdateAsync(first, autoSave: true);
            await _journeyRepo.InsertAsync(second, autoSave: true);
        });

        await Should.ThrowAsync<BusinessException>(async () =>
            await WithUnitOfWorkAsync(async () => await _manager.StartAsync(second, speciesId)));
    }
}
```

- [ ] **Step 2: 运行确认失败** — `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~JourneyManager_Tests`（编译失败）。

- [ ] **Step 3: 写 JourneyManager**

Create `backend/src/Homework.Domain/Journeys/JourneyManager.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Homework.Journeys;

public class JourneyManager : DomainService
{
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<PetSpecies, Guid> _petSpeciesRepository;

    public JourneyManager(
        IRepository<Journey, Guid> journeyRepository,
        IRepository<PetSpecies, Guid> petSpeciesRepository)
    {
        _journeyRepository = journeyRepository;
        _petSpeciesRepository = petSpeciesRepository;
    }

    /// <summary>开始旅程：单旅程约束 + 从图鉴宠物快照 5 阶阈值 + Journey.Start。</summary>
    public async Task StartAsync(Journey journey, Guid petSpeciesId)
    {
        var hasOtherActive = await _journeyRepository.AnyAsync(
            j => j.ChildId == journey.ChildId && j.Status == JourneyStatus.Active && j.Id != journey.Id);
        if (hasOtherActive)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.JourneyAlreadyHasActive);
        }

        var q = await _petSpeciesRepository.WithDetailsAsync(x => x.Forms);
        var species = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == petSpeciesId))
            ?? throw new EntityNotFoundException(typeof(PetSpecies), petSpeciesId);

        var stages = species.Forms.OrderBy(f => f.Level).Select(f => (f.Level, f.GrowthToNext));
        journey.Start(petSpeciesId, stages);
    }
}
```

- [ ] **Step 4: 建 DTO + 接口**

Create `backend/src/Homework.Application.Contracts/Journeys/Dtos/JourneyDto.cs`:

```csharp
using System;
using Homework.Journeys;
using Volo.Abp.Application.Dtos;

namespace Homework.Journeys.Dtos;

public class JourneyDto : EntityDto<Guid>
{
    public Guid ChildId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public Guid MedalId { get; set; }
    public JourneyStatus Status { get; set; }
    public Guid? PetSpeciesId { get; set; }
    public int CurrentLevel { get; set; }
    public int GrowthPoints { get; set; }
    public DateTime? CompletedTime { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Journeys/Dtos/CreateJourneyDto.cs`:

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Journeys.Dtos;

public class CreateJourneyDto
{
    [Required] public Guid ChildId { get; set; }
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(512)] public string? Description { get; set; }
    [Required] public DateOnly StartDate { get; set; }
    [Required] public DateOnly EndDate { get; set; }
    [Required] public Guid MedalId { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Journeys/Dtos/UpdateJourneyDto.cs`:

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Journeys.Dtos;

public class UpdateJourneyDto
{
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(512)] public string? Description { get; set; }
    [Required] public DateOnly StartDate { get; set; }
    [Required] public DateOnly EndDate { get; set; }
    [Required] public Guid MedalId { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Journeys/Dtos/GetJourneyListInput.cs`:

```csharp
using System;

namespace Homework.Journeys.Dtos;

public class GetJourneyListInput
{
    public Guid ChildId { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Journeys/IJourneyAppService.cs`:

```csharp
using System;
using System.Threading.Tasks;
using Homework.Journeys.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Journeys;

public interface IJourneyAppService : IApplicationService
{
    Task<ListResultDto<JourneyDto>> GetListAsync(GetJourneyListInput input);
    Task<JourneyDto> GetAsync(Guid id);
    Task<JourneyDto> CreateAsync(CreateJourneyDto input);
    Task<JourneyDto> UpdateAsync(Guid id, UpdateJourneyDto input);
    Task DeleteAsync(Guid id);
}
```

- [ ] **Step 5: Mapperly 映射（JourneyDto）**

Modify `HomeworkApplicationMappers.cs` — 顶部加 `using Homework.Journeys;` + `using Homework.Journeys.Dtos;`；末尾加：

```csharp
[Mapper]
public partial class JourneyMapper : MapperBase<Journey, JourneyDto>
{
    public override partial JourneyDto Map(Journey source);
    public override partial void Map(Journey source, JourneyDto destination);
}
```

- [ ] **Step 6: 写 JourneyAppService（家长管理）**

Create `backend/src/Homework.Application/Journeys/JourneyAppService.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Journeys.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace Homework.Journeys;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class JourneyAppService : HomeworkAppService, IJourneyAppService
{
    private readonly IRepository<Journey, Guid> _repository;
    private readonly ChildProfileManager _childManager;

    public JourneyAppService(IRepository<Journey, Guid> repository, ChildProfileManager childManager)
    {
        _repository = repository;
        _childManager = childManager;
    }

    public async Task<ListResultDto<JourneyDto>> GetListAsync(GetJourneyListInput input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        var childId = input.ChildId;
        var items = await _repository.GetListAsync(j => j.ChildId == childId);
        var dtos = items.OrderByDescending(j => j.StartDate)
            .Select(j => ObjectMapper.Map<Journey, JourneyDto>(j)).ToList();
        return new ListResultDto<JourneyDto>(dtos);
    }

    public async Task<JourneyDto> GetAsync(Guid id) => ObjectMapper.Map<Journey, JourneyDto>(await GetOwnedAsync(id));

    public async Task<JourneyDto> CreateAsync(CreateJourneyDto input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        var journey = new Journey(GuidGenerator.Create(), CurrentUser.GetId(), input.ChildId,
            input.Title, input.StartDate, input.EndDate, input.MedalId);
        journey.SetDescription(input.Description);
        await _repository.InsertAsync(journey, autoSave: true);
        return ObjectMapper.Map<Journey, JourneyDto>(journey);
    }

    public async Task<JourneyDto> UpdateAsync(Guid id, UpdateJourneyDto input)
    {
        var journey = await GetOwnedAsync(id);
        journey.SetTitle(input.Title);
        journey.SetDescription(input.Description);
        journey.SetPeriod(input.StartDate, input.EndDate);
        journey.SetMedal(input.MedalId);
        await _repository.UpdateAsync(journey, autoSave: true);
        return ObjectMapper.Map<Journey, JourneyDto>(journey);
    }

    public async Task DeleteAsync(Guid id)
    {
        var journey = await GetOwnedAsync(id);
        await _repository.DeleteAsync(journey);
    }

    private async Task<Journey> GetOwnedAsync(Guid id)
    {
        var journey = await _repository.GetAsync(id);
        await _childManager.EnsureChildOwnedAsync(journey.ChildId);
        return journey;
    }
}
```

- [ ] **Step 7: 写 JourneyAppService 集成测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyAppService_Tests.cs` —— 建 ChildProfile + 用 `_principal.Change(Parent(pid))` 走 Create/Get/Update/Delete；断言 Draft、字段往返、逾期（EndDate<StartDate）Create 抛 `ArgumentException`、跨家长访问抛 `EntityNotFoundException`（对标 `WeeklyTaskTemplateAppService_Tests` 结构 + 上一步 `SeedJourney` 思路）。至少 3 个用例：Create_Then_Get、Update_Changes_Fields、CrossParent_Get_Throws。

- [ ] **Step 8: 运行 + 提交**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~JourneyManager_Tests|FullyQualifiedName~JourneyAppService_Tests"`（PASS），再 `dotnet test`（无回归）。

```bash
git add backend/src/Homework.Domain/Journeys/JourneyManager.cs backend/src/Homework.Application.Contracts/Journeys backend/src/Homework.Application/Journeys/JourneyAppService.cs backend/src/Homework.Application/HomeworkApplicationMappers.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyManager_Tests.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyAppService_Tests.cs
git commit -m "feat(journey): JourneyManager(单旅程约束+阈值快照) + 家长 JourneyAppService

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: JourneyPlayAppService — 开始/看板/背包/收藏（读 + 开始）

孩子侧运行时（家长鉴权 + ChildId）：查当前 Active 旅程、开始旅程（选宠）、每日看板、背包、收藏。喂养/完成留 Task 11。

**Files:**
- Create: `backend/src/Homework.Application.Contracts/Journeys/Dtos/StartJourneyDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Journeys/Dtos/BackpackItemDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Journeys/Dtos/CollectionEntryDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Journeys/IJourneyPlayAppService.cs`
- Create: `backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyPlay_Tests.cs`

**Interfaces:**
- Consumes: Task 9 `JourneyManager`；Task 7 `DailyTaskGenerator`；第一期 `IAssetUrlResolver`、`RewardItem`、`Medal`、`PetSpecies`。既有 `DailyBoardDto`/`GetDailyBoardInput`（Homework.Tasks.Dtos）。
- Produces（本任务实现这些方法；`CompleteTask/UncompleteTask/Feed` 声明但 Task 11 实现）：
  - `IJourneyPlayAppService.GetActiveAsync(Guid childId) : Task<JourneyDto?>`
  - `StartAsync(StartJourneyDto) : Task<JourneyDto>`（`{ChildId, JourneyId, PetSpeciesId}`）
  - `GetDailyBoardAsync(GetDailyBoardInput) : Task<DailyBoardDto>`
  - `GetBackpackAsync(Guid childId, Guid journeyId) : Task<ListResultDto<BackpackItemDto>>`
  - `GetCollectionAsync(Guid childId) : Task<ListResultDto<CollectionEntryDto>>`
  - `BackpackItemDto{RewardItemId,Name,IconUrl,Glyph,Quantity,GrowthValue}`；`CollectionEntryDto{JourneyId,Title,PetSpeciesId,PetName,PetFinalSpriteUrl,MedalId,MedalName,MedalImageUrl,CompletedTime}`；`StartJourneyDto{ChildId,JourneyId,PetSpeciesId}`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyPlay_Tests.cs` —— 覆盖：`Start_Then_GetActive_Returns_It`（建 child + draft journey + active species，Start，GetActive 返回该旅程 Status=Active、PetSpeciesId 正确）；`GetDailyBoard_Generates_From_Journey_Templates`（加模板 → GetDailyBoard 返回任务）。用 `_principal.Change(Parent(pid))`。（结构参照 JourneyManager_Tests 的 SeedSpecies + Journey；断言 board.Tasks.Count>0、board.Tasks[0].RewardItemId 非空。）

- [ ] **Step 2: 运行确认失败**（编译失败）。

- [ ] **Step 3: 建 DTO**

Create `backend/src/Homework.Application.Contracts/Journeys/Dtos/StartJourneyDto.cs`:

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Journeys.Dtos;

public class StartJourneyDto
{
    [Required] public Guid ChildId { get; set; }
    [Required] public Guid JourneyId { get; set; }
    [Required] public Guid PetSpeciesId { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Journeys/Dtos/BackpackItemDto.cs`:

```csharp
using System;

namespace Homework.Journeys.Dtos;

public class BackpackItemDto
{
    public Guid RewardItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IconUrl { get; set; }
    public string? Glyph { get; set; }
    public int Quantity { get; set; }
    public int GrowthValue { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Journeys/Dtos/CollectionEntryDto.cs`:

```csharp
using System;

namespace Homework.Journeys.Dtos;

public class CollectionEntryDto
{
    public Guid JourneyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public Guid PetSpeciesId { get; set; }
    public string PetName { get; set; } = string.Empty;
    public string? PetFinalSpriteUrl { get; set; }
    public Guid MedalId { get; set; }
    public string MedalName { get; set; } = string.Empty;
    public string? MedalImageUrl { get; set; }
    public DateTime CompletedTime { get; set; }
}
```

- [ ] **Step 4: 建接口**

Create `backend/src/Homework.Application.Contracts/Journeys/IJourneyPlayAppService.cs`:

```csharp
using System;
using System.Threading.Tasks;
using Homework.Journeys.Dtos;
using Homework.Tasks.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Journeys;

public interface IJourneyPlayAppService : IApplicationService
{
    Task<JourneyDto?> GetActiveAsync(Guid childId);
    Task<JourneyDto> StartAsync(StartJourneyDto input);
    Task<DailyBoardDto> GetDailyBoardAsync(GetDailyBoardInput input);
    Task<ListResultDto<BackpackItemDto>> GetBackpackAsync(Guid childId, Guid journeyId);
    Task<ListResultDto<CollectionEntryDto>> GetCollectionAsync(Guid childId);

    // 由 Task 11 实现：
    Task<DailyTaskDto> CompleteTaskAsync(Guid childId, Guid taskId);
    Task<DailyTaskDto> UncompleteTaskAsync(Guid childId, Guid taskId);
    Task<FeedResultDto> FeedAsync(FeedDto input);
}
```

> 注：`FeedResultDto`/`FeedDto` 在 Task 11 建；本任务先只声明上面 5 个读/开始方法，Task 11 追加末尾 3 个 + 两个 DTO。为保持本任务编译，接口里**先不写**末尾 3 行与其 using，改由 Task 11 加。（即本任务的接口仅含前 5 个方法。）

- [ ] **Step 5: 写 JourneyPlayAppService（前 5 个方法）**

Create `backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys.Dtos;
using Homework.Permissions;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;
using StarCalc = Homework.Scoring.StarCalculator;

namespace Homework.Journeys;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class JourneyPlayAppService : HomeworkAppService, IJourneyPlayAppService
{
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepository;
    private readonly IRepository<RewardItem, Guid> _rewardRepository;
    private readonly IRepository<Medal, Guid> _medalRepository;
    private readonly IRepository<PetSpecies, Guid> _speciesRepository;
    private readonly JourneyManager _journeyManager;
    private readonly DailyTaskGenerator _generator;
    private readonly ChildProfileManager _childManager;
    private readonly IAssetUrlResolver _urls;

    public JourneyPlayAppService(
        IRepository<Journey, Guid> journeyRepository,
        IRepository<DailyTask, Guid> dailyTaskRepository,
        IRepository<RewardItem, Guid> rewardRepository,
        IRepository<Medal, Guid> medalRepository,
        IRepository<PetSpecies, Guid> speciesRepository,
        JourneyManager journeyManager,
        DailyTaskGenerator generator,
        ChildProfileManager childManager,
        IAssetUrlResolver urls)
    {
        _journeyRepository = journeyRepository;
        _dailyTaskRepository = dailyTaskRepository;
        _rewardRepository = rewardRepository;
        _medalRepository = medalRepository;
        _speciesRepository = speciesRepository;
        _journeyManager = journeyManager;
        _generator = generator;
        _childManager = childManager;
        _urls = urls;
    }

    public async Task<JourneyDto?> GetActiveAsync(Guid childId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.ChildId == childId && j.Status == JourneyStatus.Active);
        return journey == null ? null : ObjectMapper.Map<Journey, JourneyDto>(journey);
    }

    public async Task<JourneyDto> StartAsync(StartJourneyDto input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        var journey = await _journeyRepository.GetAsync(input.JourneyId);
        if (journey.ChildId != input.ChildId)
        {
            throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(Journey), input.JourneyId);
        }

        await _journeyManager.StartAsync(journey, input.PetSpeciesId);
        await _journeyRepository.UpdateAsync(journey, autoSave: true);
        return ObjectMapper.Map<Journey, JourneyDto>(journey);
    }

    public async Task<DailyBoardDto> GetDailyBoardAsync(GetDailyBoardInput input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        await _generator.EnsureDayAsync(input.ChildId, input.Date);
        await _generator.SettleDayAsync(input.ChildId, input.Date);

        var childId = input.ChildId;
        var date = input.Date;
        var tasks = (await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == date))
            .OrderBy(t => t.Order).ToList();
        var total = tasks.Count;
        var completed = tasks.Count(t => t.CountsAsCompleted);

        return new DailyBoardDto
        {
            ChildId = childId,
            Date = date,
            Tasks = tasks.Select(t => ObjectMapper.Map<DailyTask, DailyTaskDto>(t)).ToList(),
            TasksTotal = total,
            TasksCompleted = completed,
            Stars = StarCalc.CalculateStars(total, completed),
            IsFull = total > 0 && completed == total,
            IsRestDay = total == 0,
        };
    }

    public async Task<ListResultDto<BackpackItemDto>> GetBackpackAsync(Guid childId, Guid journeyId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack);
        var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == journeyId && x.ChildId == childId))
            ?? throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(Journey), journeyId);

        var ids = journey.Backpack.Select(b => b.RewardItemId).ToList();
        var items = await _rewardRepository.GetListAsync(r => ids.Contains(r.Id));
        var byId = items.ToDictionary(r => r.Id);

        var dtos = journey.Backpack
            .Where(b => byId.ContainsKey(b.RewardItemId) && b.Quantity > 0)
            .Select(b =>
            {
                var r = byId[b.RewardItemId];
                return new BackpackItemDto
                {
                    RewardItemId = r.Id, Name = r.Name, Glyph = r.Glyph,
                    IconUrl = _urls.ToUrl(r.IconObjectKey), Quantity = b.Quantity, GrowthValue = r.GrowthValue,
                };
            }).ToList();
        return new ListResultDto<BackpackItemDto>(dtos);
    }

    public async Task<ListResultDto<CollectionEntryDto>> GetCollectionAsync(Guid childId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var completed = (await _journeyRepository.GetListAsync(
                j => j.ChildId == childId && j.Status == JourneyStatus.Completed))
            .OrderByDescending(j => j.CompletedTime).ToList();

        var speciesIds = completed.Where(j => j.PetSpeciesId != null).Select(j => j.PetSpeciesId!.Value).Distinct().ToList();
        var medalIds = completed.Select(j => j.MedalId).Distinct().ToList();
        var speciesQ = await _speciesRepository.WithDetailsAsync(x => x.Forms);
        var speciesList = await AsyncExecuter.ToListAsync(speciesQ.Where(x => speciesIds.Contains(x.Id)));
        var speciesById = speciesList.ToDictionary(s => s.Id);
        var medals = await _medalRepository.GetListAsync(m => medalIds.Contains(m.Id));
        var medalById = medals.ToDictionary(m => m.Id);

        var dtos = new List<CollectionEntryDto>();
        foreach (var j in completed)
        {
            var species = j.PetSpeciesId != null && speciesById.TryGetValue(j.PetSpeciesId.Value, out var s) ? s : null;
            var finalForm = species?.Forms.FirstOrDefault(f => f.Level == PetSpecies.FormCount);
            var medal = medalById.TryGetValue(j.MedalId, out var m) ? m : null;
            dtos.Add(new CollectionEntryDto
            {
                JourneyId = j.Id, Title = j.Title,
                PetSpeciesId = j.PetSpeciesId ?? Guid.Empty,
                PetName = species?.Name ?? string.Empty,
                PetFinalSpriteUrl = _urls.ToUrl(finalForm?.SpriteObjectKey),
                MedalId = j.MedalId, MedalName = medal?.Name ?? string.Empty,
                MedalImageUrl = _urls.ToUrl(medal?.ImageObjectKey),
                CompletedTime = j.CompletedTime ?? default,
            });
        }
        return new ListResultDto<CollectionEntryDto>(dtos);
    }
}
```

> 说明：`GetDailyBoardAsync` 复用生成器（生成+结算），board 组装与既有 `DailyTaskAppService.GetBoardAsync` 逻辑一致（可接受的小重复；如需 DRY，后续把 board 组装抽到共享 helper）。本任务实现接口的前 5 个方法；`CompleteTask/UncompleteTask/Feed` 在 Task 11 加到接口与本类。

- [ ] **Step 5b: 接口本任务只含前 5 个方法**

将 Step 4 接口文件调整为**仅含前 5 个方法**（删掉 `// 由 Task 11 实现` 及其下 3 行与 `FeedResultDto/FeedDto` 相关 using），保证本任务编译。Task 11 再追加。

- [ ] **Step 6: 运行 + 提交**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~JourneyPlay_Tests`（PASS），再 `dotnet test`。

```bash
git add backend/src/Homework.Application.Contracts/Journeys backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyPlay_Tests.cs
git commit -m "feat(journey): JourneyPlayAppService 开始/看板/背包/收藏

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 完成任务/喂养/进化闭环 + 撤销回收 + 全链路回归

给 `JourneyPlayAppService` 加 `CompleteTask`/`UncompleteTask`/`Feed`（奖励入包/回收 + 喂养进化 + 完成）；给 `DailyTaskAppService` 的家长复核 `Revoke`/`Restore` 挂上奖励回收/补发。全链路集成测试。

**Files:**
- Create: `backend/src/Homework.Application.Contracts/Journeys/Dtos/FeedDto.cs`
- Create: `backend/src/Homework.Application.Contracts/Journeys/Dtos/FeedResultDto.cs`
- Modify: `backend/src/Homework.Application.Contracts/Journeys/IJourneyPlayAppService.cs`
- Modify: `backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs`
- Modify: `backend/src/Homework.Application/Tasks/DailyTaskAppService.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyLoop_Tests.cs`

**Interfaces:**
- Consumes: Task 10 `JourneyPlayAppService`；Task 1/2 `Journey.GrantReward/RevokeReward/Feed`；第一期 `PetSpecies`(Forms 的 RevealText/EvolveVideoObjectKey)、`IAssetUrlResolver`。
- Produces:
  - `FeedDto{ChildId, JourneyId, RewardItemId}`；`FeedResultDto{Evolved, NewLevel, RevealText?, EvolveVideoUrl?, Completed, CurrentLevel, GrowthPoints}`。
  - `CompleteTaskAsync(childId, taskId)`（Complete + 若有奖励且未入包 → journey.GrantReward + task.MarkRewardGranted + 结算）。
  - `UncompleteTaskAsync(childId, taskId)`（Uncomplete + 若已入包 → journey.RevokeReward + task.ClearRewardGranted + 结算）。
  - `FeedAsync(FeedDto)`（journey.Feed(itemId, item.GrowthValue, now) → 补图鉴 RevealText/EvolveVideoUrl → FeedResultDto）。

- [ ] **Step 1: 写全链路失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyLoop_Tests.cs` —— 端到端：建 child + medal + active PetSpecies(5 阶阈值 20/40/60/80) + active RewardItem(GrowthValue 大到一次跨阶，如 20) + draft journey；Start（选宠）；加 Monday 模板(指定该 reward)；GetDailyBoard(Monday) 生成 1 任务；CompleteTask → 背包 +1；Feed 一次 → Evolved=true、NewLevel=2；（循环喂到 L5）→ Completed=true；GetCollection 返回 1 条含该宠物/勋章。关键断言：

```csharp
    // ... 省略 Seed，见 JourneyManager_Tests / JourneyPlay_Tests 的 SeedSpecies 思路 ...
    // Feed 首次：
    var r = await _play.FeedAsync(new FeedDto { ChildId = childId, JourneyId = journeyId, RewardItemId = rewardId });
    r.Evolved.ShouldBeTrue();
    r.NewLevel.ShouldBe(2);
    r.EvolveVideoUrl.ShouldNotBeNull();      // 图鉴 form1 的进化视频 URL
    // 喂到满级后：
    // finalResult.Completed.ShouldBeTrue();
    // (await _play.GetCollectionAsync(childId)).Items.Count.ShouldBe(1);
```

（完整用例：至少 `Complete_Grants_Reward_To_Backpack`、`Feed_Evolves_And_Completes_And_Enters_Collection`、`Revoke_Claws_Back_Unfed_Reward`。）

- [ ] **Step 2: 运行确认失败**（编译失败）。

- [ ] **Step 3: 建 Feed DTO**

Create `backend/src/Homework.Application.Contracts/Journeys/Dtos/FeedDto.cs`:

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Journeys.Dtos;

public class FeedDto
{
    [Required] public Guid ChildId { get; set; }
    [Required] public Guid JourneyId { get; set; }
    [Required] public Guid RewardItemId { get; set; }
}
```

Create `backend/src/Homework.Application.Contracts/Journeys/Dtos/FeedResultDto.cs`:

```csharp
namespace Homework.Journeys.Dtos;

public class FeedResultDto
{
    public bool Evolved { get; set; }
    public int NewLevel { get; set; }
    public string? RevealText { get; set; }
    public string? EvolveVideoUrl { get; set; }
    public bool Completed { get; set; }
    public int CurrentLevel { get; set; }
    public int GrowthPoints { get; set; }
}
```

- [ ] **Step 4: 接口追加 3 个方法**

Modify `backend/src/Homework.Application.Contracts/Journeys/IJourneyPlayAppService.cs` — 加 `using Homework.Tasks.Dtos;`（若无）并在接口内加：

```csharp
    Task<DailyTaskDto> CompleteTaskAsync(Guid childId, Guid taskId);
    Task<DailyTaskDto> UncompleteTaskAsync(Guid childId, Guid taskId);
    Task<FeedResultDto> FeedAsync(FeedDto input);
```

- [ ] **Step 5: 实现 CompleteTask/UncompleteTask/Feed**

Modify `backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs`:
- 构造函数注入 `IClock` 与 `DailyTaskGenerator`（generator 已注入）。加 `using Volo.Abp.Timing;`。加字段 `private readonly IClock _clock;` 并在构造赋值（在参数列表加 `IClock clock`）。
- 追加方法：

```csharp
    public async Task<DailyTaskDto> CompleteTaskAsync(Guid childId, Guid taskId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var task = await _dailyTaskRepository.GetAsync(taskId);
        if (task.ChildId != childId)
        {
            throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(DailyTask), taskId);
        }

        task.Complete(_clock.Now);
        await _dailyTaskRepository.UpdateAsync(task, autoSave: true);
        await GrantRewardIfNeededAsync(task);
        await _dailyTaskRepository.UpdateAsync(task, autoSave: true); // persist RewardGranted flag
        await _generator.SettleDayAsync(childId, task.Date);
        return ObjectMapper.Map<DailyTask, DailyTaskDto>(task);
    }

    public async Task<DailyTaskDto> UncompleteTaskAsync(Guid childId, Guid taskId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var task = await _dailyTaskRepository.GetAsync(taskId);
        if (task.ChildId != childId)
        {
            throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(DailyTask), taskId);
        }

        task.Uncomplete();
        await ClawBackRewardIfNeededAsync(task);
        await _dailyTaskRepository.UpdateAsync(task, autoSave: true);
        await _generator.SettleDayAsync(childId, task.Date);
        return ObjectMapper.Map<DailyTask, DailyTaskDto>(task);
    }

    public async Task<FeedResultDto> FeedAsync(FeedDto input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack, x => x.Stages);
        var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == input.JourneyId && x.ChildId == input.ChildId))
            ?? throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(Journey), input.JourneyId);

        var reward = await _rewardRepository.GetAsync(input.RewardItemId);
        var result = journey.Feed(input.RewardItemId, reward.GrowthValue, _clock.Now);
        await _journeyRepository.UpdateAsync(journey, autoSave: true);

        var dto = new FeedResultDto
        {
            Evolved = result.Evolved, NewLevel = result.NewLevel, Completed = result.Completed,
            CurrentLevel = journey.CurrentLevel, GrowthPoints = journey.GrowthPoints,
        };

        if (result.Evolved && journey.PetSpeciesId is Guid speciesId)
        {
            var sq = await _speciesRepository.WithDetailsAsync(x => x.Forms);
            var species = await AsyncExecuter.FirstOrDefaultAsync(sq.Where(x => x.Id == speciesId));
            var arriving = species?.Forms.FirstOrDefault(f => f.Level == result.NewLevel);
            var leaving = species?.Forms.FirstOrDefault(f => f.Level == result.NewLevel - 1);
            dto.RevealText = arriving?.RevealText;
            dto.EvolveVideoUrl = _urls.ToUrl(leaving?.EvolveVideoObjectKey);
        }

        return dto;
    }

    private async Task GrantRewardIfNeededAsync(DailyTask task)
    {
        if (task.RewardItemId is not Guid rewardItemId || task.RewardGranted || !task.CountsAsCompleted)
        {
            return;
        }

        var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack);
        var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == task.JourneyId));
        if (journey == null || journey.Status != JourneyStatus.Active)
        {
            return;
        }

        journey.GrantReward(rewardItemId);
        await _journeyRepository.UpdateAsync(journey, autoSave: true);
        task.MarkRewardGranted();
    }

    private async Task ClawBackRewardIfNeededAsync(DailyTask task)
    {
        if (task.RewardItemId is not Guid rewardItemId || !task.RewardGranted)
        {
            return;
        }

        var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack);
        var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == task.JourneyId));
        if (journey != null)
        {
            journey.RevokeReward(rewardItemId);
            await _journeyRepository.UpdateAsync(journey, autoSave: true);
        }

        task.ClearRewardGranted();
    }
```

- [ ] **Step 6: 家长复核 Revoke/Restore 挂奖励回收/补发**

Modify `backend/src/Homework.Application/Tasks/DailyTaskAppService.cs`：
- 注入 `IRepository<Journey, Guid> _journeyRepository`（Task 7 已注入，可复用）。
- 在 `ReviewAsync`（`Revoke`/`Restore` 私有实现）里：`Revoke()` 后若 `task.RewardGranted` → 加载 journey（WithDetails Backpack）→ `RevokeReward(task.RewardItemId)` → `task.ClearRewardGranted()`；`Restore()` 后若任务 `CountsAsCompleted` 且有 `RewardItemId` 且未 granted → `GrantReward` + `MarkRewardGranted`。落库后照旧 `SettleDayAsync`。（逻辑与 Play 服务的 grant/clawback 一致；可将其抽到一个共享 `IRewardLedger` 领域服务避免重复——见收尾遗留。）

- [ ] **Step 7: 运行全链路 + 全量回归**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter FullyQualifiedName~JourneyLoop_Tests`（PASS）。
Run: `dotnet test`（全量绿：Domain + EFCore 全部通过，含既有回归）。

- [ ] **Step 8: 提交**

```bash
git add backend/src backend/test
git commit -m "feat(journey): 完成/喂养/进化闭环 + 撤销回收 + 全链路测试

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 收尾校验（全部任务完成后）

- [ ] `dotnet build` 整个解决方案通过。
- [ ] `dotnet test` 全绿。
- [ ] `dotnet ef migrations list ...` 显示本期 4 个迁移（Reshaped_FamilyGoal_To_Journey / Added_JourneyTaskTemplateItem / Added_DailyTask_Journey_Reward / Removed_WeeklyTaskTemplateItem）。
- [ ] （可选，需本地 PostgreSQL）`dotnet run --project src/Homework.DbMigrator` 应用迁移无误。
- [ ] 交付：家长建 Draft 旅程配任务(指定/随机奖励)与勋章 → 孩子(家长鉴权+ChildId)开始并选宠 → 每日看板生成 → 完成任务得道具入包 → 喂养成长 → 五阶进化 → 满级发勋章、入收藏；逾期不惩罚；同孩子第二个 Active 旅程被拒。

## 遗留（Phase 3 / 后续）

- 奖励 grant/clawback 逻辑在 Play 服务与 DailyTaskAppService 复核路径各有一份 → 抽到共享 `IRewardLedger` 领域服务去重。
- `GetDailyBoard` 的 board 组装在 Play 与 DailyTaskAppService 各一份 → 抽共享 helper。
- 成长经济标定（GrowthValue vs 阶阈值 vs 任务量）需按真实数据迭代；随机空池已兜底为无奖励+告警。
- 孩子独立登录（PIN/OpenIddict）—— 本期用家长鉴权+ChildId 代偿，第三期再定。
- 第一期遗留技术债（Scale numeric 精度、孤儿 OSS 对象 GC、pet GetActiveList 过滤测试）见 `NEXT-STEPS.md`。
