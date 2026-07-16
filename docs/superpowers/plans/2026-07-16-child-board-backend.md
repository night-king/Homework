# 孩子端看板 · 后端数据缺口 实施计划（Plan 1/3）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐孩子端每日看板所需的四项后端数据（任务时长、任务卡奖励名、周条七天状态、连续完成天数），使前端移植（Plan 2）能照真实 DTO 开工。

**Architecture:** 核心是把 `DailyTaskGenerator` 里已存在但私有、且逐天查询的 `ResolveDayTotalsAsync`（「有任务用任务计数，否则回退模板数」）提成**按区间批量读**的 `ReadRangeAsync`，成为周条与连续完成的**共同数据源**——纯读不写、不生成任务。其余三项是补字段与反范式化 join。

**Tech Stack:** ABP 10.5 / .NET 10 / EF Core 10.0.7 / Npgsql / Mapperly / xUnit + Shouldly

**Spec:** `docs/superpowers/specs/2026-07-16-child-board-prototype-port-design.md`（§4 全部）

## Global Constraints

- **分支：** `feat/child-board-prototype-port`（已存在，spec 在 `e4b813f` / `3d3a405`）
- **Mapperly，不是 AutoMapper。** `HomeworkApplicationMappers.cs` 用 `[Mapper]` 源生成器。给 DTO 加**没有同名源字段**的属性会导致**编译失败**，必须加 `[MapperIgnoreTarget(nameof(...))]`——见该文件里 `RewardItemDto.IconUrl` / `MedalDto.ImageUrl` 的现成先例。
- **迁移命令必须在 `backend/src/Homework.EntityFrameworkCore` 目录下跑。** 设计时工厂 `HomeworkDbContextFactory` 有 `.SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../Homework.DbMigrator/"))`，换目录会读不到连接串。（已验证：该目录下 `dotnet ef migrations list` 正常输出 6 条历史迁移；全局工具 9.0.3 能带项目里的 EF 10.0.7。）
- **数据库：** Postgres 本机服务 `postgresql-x64-18`，**端口 5433**（不是 5432）。连接串在 `src/Homework.HttpApi.Host/appsettings.json`。
- **ABP 约定路由陷阱：** action 上**单个** `*Id` 参数会被提升成路径段；**两个及以上**则全部走 query。新端点一律用 Input DTO 参数（照 `GetDailyBoardAsync(GetDailyBoardInput)`）规避此坑。
- **测试必须走真实生成路径。** 手工插入生产造不出的状态会**假绿**——2026-07-16 的级联删除修复就栽在这：测试造了「Draft 旅程 + 手插 DailyTask」，加一个足以让修复失效的守卫后 3 个测试仍全绿。
- **提交信息结尾必须是：** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **测试命令一律从 `backend/` 目录跑。**

---

### Task 1: `ReadRangeAsync` —— 周条与连续完成的共同数据源

把「有任务用任务计数、否则回退模板数」的规则从**私有 + 逐天**提成**公开 + 批量**，并让原方法委托过去，保持规则单一来源。

**Files:**
- Create: `backend/src/Homework.Domain/Tasks/DayStatus.cs`
- Modify: `backend/src/Homework.Domain/Tasks/DailyTaskGenerator.cs:93-125`（`ResolveDayTotalsAsync` + `GetActiveJourneyAsync`）
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskGenerator_Tests.cs`

**Interfaces:**
- Produces: `Homework.Tasks.DayStatus`（record struct，见下）；`DailyTaskGenerator.ReadRangeAsync(Guid childId, DateOnly from, DateOnly to) → Task<List<DayStatus>>`。Task 4 和 Task 5 都依赖它。
- Consumes: 无（本计划第一个任务）

- [ ] **Step 1: 写失败的测试**

追加到 `DailyTaskGenerator_Tests.cs`（类内，沿用现有 `SeedActiveJourneyAsync` 助手）：

```csharp
    [Fact]
    public async Task ReadRange_Reports_Template_Count_For_Ungenerated_Days_And_Never_Generates()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
        {
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0), autoSave: true);
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "数学", order: 1), autoSave: true);
            // 周二无模板 → 休息日
        });

        var days = await WithUnitOfWorkAsync(async () =>
            await _generator.ReadRangeAsync(childId, monday, monday.AddDays(1)));

        days.Count.ShouldBe(2);
        days[0].Date.ShouldBe(monday);
        days[0].TasksTotal.ShouldBe(2);       // 来自模板，任务尚未生成
        days[0].TasksCompleted.ShouldBe(0);
        days[0].IsRestDay.ShouldBeFalse();
        days[0].IsFull.ShouldBeFalse();
        days[1].IsRestDay.ShouldBeTrue();     // 周二没有模板

        // 最要紧的一条：读区间不许生成任何任务
        var generated = await WithUnitOfWorkAsync(async () =>
            await _dailyRepo.CountAsync(t => t.ChildId == childId));
        generated.ShouldBe(0);
    }

    [Fact]
    public async Task ReadRange_Uses_Real_Task_Counts_Once_Generated()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
        {
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0), autoSave: true);
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "数学", order: 1), autoSave: true);
        });

        // 走真实生成路径
        var tasks = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));
        await WithUnitOfWorkAsync(async () =>
        {
            var t = await _dailyRepo.GetAsync(tasks[0].Id);
            t.Complete(new DateTime(2026, 7, 6, 20, 0, 0, DateTimeKind.Utc));
            await _dailyRepo.UpdateAsync(t, autoSave: true);
        });

        var days = await WithUnitOfWorkAsync(async () => await _generator.ReadRangeAsync(childId, monday, monday));
        days[0].TasksTotal.ShouldBe(2);
        days[0].TasksCompleted.ShouldBe(1);
        days[0].IsFull.ShouldBeFalse();
    }

    [Fact]
    public async Task ReadRange_No_Active_Journey_Is_All_Rest_Days()
    {
        var childId = _guid.Create();
        var monday = new DateOnly(2026, 7, 6);

        var days = await WithUnitOfWorkAsync(async () =>
            await _generator.ReadRangeAsync(childId, monday, monday.AddDays(6)));

        days.Count.ShouldBe(7);
        days.ShouldAllBe(d => d.IsRestDay);
    }

    [Fact]
    public async Task ReadRange_Days_Before_Journey_Start_Are_Rest_Days()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0), autoSave: true));

        // 旅程开始前的那个周一：有模板、有 DayOfWeek 匹配，但不该算数
        var earlier = monday.AddDays(-7);
        var days = await WithUnitOfWorkAsync(async () => await _generator.ReadRangeAsync(childId, earlier, earlier));
        days[0].IsRestDay.ShouldBeTrue();
    }
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~DailyTaskGenerator_Tests.ReadRange"`
Expected: **编译失败**，`'DailyTaskGenerator' does not contain a definition for 'ReadRangeAsync'`

- [ ] **Step 3: 建 `DayStatus`**

Create `backend/src/Homework.Domain/Tasks/DayStatus.cs`：

```csharp
using System;

namespace Homework.Tasks;

/// <summary>
/// 某孩子某天的任务态势，纯读推导（不生成任务）：
/// 已生成 → 用真实任务计数；未生成 → 回退当天 DayOfWeek 的 active 模板条目数。
/// IsRestDay 语义与 <see cref="DailyTaskGenerator"/>/GetDailyBoardAsync 一致：总数为 0 即休息日。
/// </summary>
public readonly record struct DayStatus(DateOnly Date, int TasksTotal, int TasksCompleted)
{
    public bool IsRestDay => TasksTotal == 0;
    public bool IsFull => TasksTotal > 0 && TasksCompleted == TasksTotal;
}
```

- [ ] **Step 4: 实现 `ReadRangeAsync`,并让 `ResolveDayTotalsAsync` 委托过去**

在 `DailyTaskGenerator.cs` 中，把现有的 `ResolveDayTotalsAsync`（93-111 行）整段替换为：

```csharp
    /// <summary>
    /// 批量读区间内每天的任务态势。<b>纯读，绝不生成任务</b>——周条要靠它显示未来日状态，
    /// 一旦调 EnsureDay 就会提前把未来任务生成出来（spec §103 明令禁止）。
    /// 整个区间只发两条查询（区间内全部任务 + 该旅程全部 active 模板），
    /// 连续完成要扫 90 天，逐天查询会变成 180 次往返。
    /// </summary>
    public async Task<List<DayStatus>> ReadRangeAsync(Guid childId, DateOnly from, DateOnly to)
    {
        var result = new List<DayStatus>();
        if (to < from)
        {
            return result;
        }

        var tasks = await _dailyTaskRepository.GetListAsync(
            t => t.ChildId == childId && t.Date >= from && t.Date <= to);
        var byDate = tasks.GroupBy(t => t.Date).ToDictionary(
            g => g.Key,
            g => (Total: g.Count(), Completed: g.Count(x => x.CountsAsCompleted)));

        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.ChildId == childId && j.Status == JourneyStatus.Active);

        var templateCountByDow = new Dictionary<DayOfWeek, int>();
        if (journey != null)
        {
            var journeyId = journey.Id;
            var templates = await _templateRepository.GetListAsync(
                t => t.JourneyId == journeyId && t.IsActive);
            templateCountByDow = templates.GroupBy(t => t.DayOfWeek)
                .ToDictionary(g => g.Key, g => g.Count());
        }

        for (var date = from; date <= to; date = date.AddDays(1))
        {
            if (byDate.TryGetValue(date, out var counts))
            {
                result.Add(new DayStatus(date, counts.Total, counts.Completed));
                continue;
            }

            var total = 0;
            // 与 GetActiveJourneyAsync 同一条件：Active 且 date 已进入 StartDate
            if (journey != null && date >= journey.StartDate
                && templateCountByDow.TryGetValue(date.DayOfWeek, out var templateCount))
            {
                total = templateCount;
            }

            result.Add(new DayStatus(date, total, 0));
        }

        return result;
    }

    private async Task<(int Total, int Completed)> ResolveDayTotalsAsync(Guid childId, DateOnly date)
    {
        var day = (await ReadRangeAsync(childId, date, date))[0];
        return (day.TasksTotal, day.TasksCompleted);
    }
```

`GetActiveJourneyAsync`（113-125 行）保持不动——`EnsureDayAsync` 仍在用它。

- [ ] **Step 5: 跑测试确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~DailyTaskGenerator_Tests"`
Expected: PASS，且**原有的 `SettleDay*` 测试一并全绿**（`ResolveDayTotalsAsync` 换了实现，靠它们证明行为等价）

- [ ] **Step 6: 提交**

```bash
git add backend/src/Homework.Domain/Tasks/DayStatus.cs backend/src/Homework.Domain/Tasks/DailyTaskGenerator.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskGenerator_Tests.cs
git commit -m "$(cat <<'EOF'
feat(tasks): ReadRangeAsync —— 按区间批量读每天任务态势(纯读不生成)

周条和连续完成的共同数据源。规则不是新写的:ResolveDayTotalsAsync
早就在做「有任务用任务计数、否则回退模板数」,只是私有且逐天查询。
本次提成公开 + 批量(整个区间两条查询),原方法委托过去以保持规则
单一来源。

必须批量:连续完成要扫 90 天,逐天两条查询就是 180 次往返。
必须纯读:周条要显示未来日状态,一旦 EnsureDay 就把未来任务提前
生成了(spec §103 明令禁止)。测试里直接断言读完区间后任务行数仍为 0。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 任务时长补上「模板 → 每日任务」那一跳

`JourneyTaskTemplateItem.EstimatedMinutes` 存在、家长端 wizard 也在填，但 `EnsureDayAsync` 建 `DailyTask` 时**没传这个字段**，值到孩子端就蒸发了。

**Files:**
- Modify: `backend/src/Homework.Domain/Tasks/DailyTask.cs`（加属性 + 构造函数参数）
- Modify: `backend/src/Homework.Domain/Tasks/DailyTaskGenerator.cs:59`（传参）
- Modify: `backend/src/Homework.Application.Contracts/Tasks/Dtos/DailyTaskDto.cs`
- Create: `backend/src/Homework.EntityFrameworkCore/Migrations/*_Added_DailyTask_EstimatedMinutes.cs`（由 `dotnet ef` 生成）
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskGenerator_Tests.cs`

**Interfaces:**
- Consumes: 无
- Produces: `DailyTask.EstimatedMinutes`（`int?`）；`DailyTaskDto.EstimatedMinutes`（`int?`）。Plan 2 的 `TaskCard` 消费后者。

- [ ] **Step 1: 写失败的测试**

追加到 `DailyTaskGenerator_Tests.cs`：

```csharp
    [Fact]
    public async Task EnsureDay_Copies_EstimatedMinutes_From_Template()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
        {
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                _guid.Create(), journeyId, DayOfWeek.Monday, "数学作业本",
                subject: "math", order: 0, estimatedMinutes: 25), autoSave: true);
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                _guid.Create(), journeyId, DayOfWeek.Monday, "朗读课文",
                subject: "chinese", order: 1), autoSave: true);   // 不填时长
        });

        var tasks = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));

        tasks.Count.ShouldBe(2);
        tasks[0].EstimatedMinutes.ShouldBe(25);
        tasks[1].EstimatedMinutes.ShouldBeNull();   // 模板没填 → 保持 null,不许兜底成 0
    }
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~EnsureDay_Copies_EstimatedMinutes_From_Template"`
Expected: **编译失败**，`'DailyTask' does not contain a definition for 'EstimatedMinutes'`

- [ ] **Step 3: 给实体加字段**

`DailyTask.cs`——在 `public string? Subject { get; private set; }` 下一行加属性：

```csharp
    public int? EstimatedMinutes { get; private set; }
```

构造函数**在末尾追加可选参数**（放末尾是为了不破坏现有调用方）：

```csharp
    public DailyTask(
        Guid id, Guid childId, Guid journeyId, DateOnly date, [NotNull] string title,
        string? subject = null, int order = 0, Guid? sourceTemplateItemId = null, Guid? rewardItemId = null,
        int? estimatedMinutes = null)
        : base(id)
    {
        ChildId = childId;
        JourneyId = journeyId;
        Date = date;
        SetTitle(title);
        SetSubject(subject);
        Order = order < 0 ? 0 : order;
        SourceTemplateItemId = sourceTemplateItemId;
        RewardItemId = rewardItemId;
        EstimatedMinutes = estimatedMinutes;
        RewardGranted = false;
        IsCompleted = false;
        ReviewState = TaskReviewState.Normal;
    }
```

并在 `SetOrder` 之后加 setter（照 `JourneyTaskTemplateItem.SetEstimatedMinutes` 的先例）：

```csharp
    public DailyTask SetEstimatedMinutes(int? minutes)
    {
        EstimatedMinutes = minutes;
        return this;
    }
```

- [ ] **Step 4: 生成器传参**

`DailyTaskGenerator.cs` 第 59 行附近，把建 `DailyTask` 那句改成：

```csharp
            var task = new DailyTask(GuidGenerator.Create(), childId, journeyId, date, t.Title,
                t.Subject, t.Order, t.Id, rewardItemId, t.EstimatedMinutes);
```

- [ ] **Step 5: DTO 加字段**

`DailyTaskDto.cs`——在 `public string? Subject { get; set; }` 下一行加：

```csharp
    public int? EstimatedMinutes { get; set; }
```

**不需要动 Mapperly**：`DailyTask.EstimatedMinutes` 与 `DailyTaskDto.EstimatedMinutes` 同名同类型，源生成器自动映射。

- [ ] **Step 6: 生成迁移**

```bash
cd backend/src/Homework.EntityFrameworkCore
dotnet ef migrations add Added_DailyTask_EstimatedMinutes
```

Expected: 新增 `Migrations/<timestamp>_Added_DailyTask_EstimatedMinutes.cs`，`Up()` 里是 `migrationBuilder.AddColumn<int>(name: "EstimatedMinutes", table: "AppDailyTasks", nullable: true)`。

**打开生成的文件肉眼确认它只加了这一列。** 若 `Up()` 里出现其他表/列的改动，说明模型快照与数据库有历史漂移——停下来报告，不要硬着头皮往下走。

- [ ] **Step 7: 跑测试确认通过**

```bash
cd backend
dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~DailyTaskGenerator_Tests"
```
Expected: PASS（含新用例）

- [ ] **Step 8: 提交**

```bash
git add backend/src/Homework.Domain/Tasks/DailyTask.cs backend/src/Homework.Domain/Tasks/DailyTaskGenerator.cs backend/src/Homework.Application.Contracts/Tasks/Dtos/DailyTaskDto.cs backend/src/Homework.EntityFrameworkCore/Migrations/ backend/test/
git commit -m "$(cat <<'EOF'
fix(tasks): 任务时长补上「模板→每日任务」那一跳

JourneyTaskTemplateItem.EstimatedMinutes 一直存在,家长端 wizard
(StepTasks.tsx)也确实在填,但 EnsureDayAsync 建 DailyTask 时没传
这个参数,值到孩子端就蒸发了。原型任务卡上的「25 分钟」因此永远
显示不出来。

存量任务为 null,不补数据——UI 见 null 隐藏 chip。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 奖励名进 `DailyTaskDto`

任务卡要显示「奖励 冲锋饭团」，但 DTO 只有 `RewardItemId`。照 `BackpackItemDto` 已有的反范式化先例，在看板查询里 join 出来。

**Files:**
- Modify: `backend/src/Homework.Application.Contracts/Tasks/Dtos/DailyTaskDto.cs`
- Modify: `backend/src/Homework.Application/HomeworkApplicationMappers.cs:24-29`（`DailyTaskMapper`）
- Modify: `backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs:80-104`（`GetDailyBoardAsync`）
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyPlay_Tests.cs`

**Interfaces:**
- Consumes: 无
- Produces: `DailyTaskDto.RewardName` / `.RewardGlyph` / `.RewardIconUrl`（均可空）；测试助手 `SeedStartedJourneyAsync`（Task 4、5 复用）。Plan 2 的 `TaskCard` 消费 DTO 字段。

- [ ] **Step 1: 给 `JourneyPlay_Tests` 加一个共用种子助手**

该文件**没有**现成的「建旅程 + 模板」助手，两个既有用例各自内联了一份。Task 3/4/5 都要用，先提一个出来。

注意字段名：该文件的服务字段叫 **`_service`**（不是 `_play`），已有 `SeedChildAsync(pid)` / `SeedSpeciesAsync()` / `Parent(id)` / `_principal` / `_guid` / `_journeyRepo` / `_templateRepo` / `_rewardRepo`。

加到 `SeedChildAsync` 之后（`[Fact]` 之前）：

```csharp
    /// <summary>
    /// 建 active 旅程 + 一个 active 奖励项 + 指定星期的模板。
    /// 走真实路径：Journey.Start 正是 StartAsync 内部调的领域方法，
    /// 产出的状态生产环境造得出来（对比：手插 DailyTask 造不出，会假绿）。
    /// </summary>
    private async Task<Guid> SeedStartedJourneyAsync(Guid pid, Guid childId, DateOnly start,
        params (DayOfWeek Dow, string Title, string? Subject, int? Minutes)[] templates)
    {
        var journeyId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var reward = new RewardItem(_guid.Create(), "能量果实", 12, 1);
            reward.Activate();
            await _rewardRepo.InsertAsync(reward, autoSave: true);

            var j = new Journey(journeyId, pid, childId, "旅程", start, start.AddDays(60), _guid.Create());
            j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
            await _journeyRepo.InsertAsync(j, autoSave: true);

            var order = 0;
            foreach (var t in templates)
            {
                await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                    _guid.Create(), journeyId, t.Dow, t.Title, t.Subject, order++, t.Minutes), autoSave: true);
            }
        });
        return journeyId;
    }
```

- [ ] **Step 2: 写失败的测试**

追加到 `JourneyPlay_Tests.cs`：

```csharp
    [Fact]
    public async Task DailyBoard_Carries_Reward_Name_On_Each_Task()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var monday = new DateOnly(2026, 7, 6);
        await SeedStartedJourneyAsync(pid, childId, monday, (DayOfWeek.Monday, "数学作业本", "math", 25));

        using (_principal.Change(Parent(pid)))
        {
            var board = await _service.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = childId, Date = monday });

            board.Tasks.Count.ShouldBeGreaterThan(0);
            var withReward = board.Tasks.Where(t => t.RewardItemId != null).ToList();
            withReward.ShouldNotBeEmpty();
            // 奖励名必须随 DTO 一起下来,不能只给 id 让前端自己去配
            withReward.ShouldAllBe(t => !string.IsNullOrWhiteSpace(t.RewardName));
            // 顺带验 Task 2 的时长确实流到了 DTO
            board.Tasks[0].EstimatedMinutes.ShouldBe(25);
        }
    }
```

- [ ] **Step 3: 跑测试确认它失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~DailyBoard_Carries_Reward_Name_On_Each_Task"`
Expected: **编译失败**，`'DailyTaskDto' does not contain a definition for 'RewardName'`

- [ ] **Step 4: DTO 加三个字段**

`DailyTaskDto.cs`——在 `public bool RewardGranted { get; set; }` 下方加：

```csharp
    public string? RewardName { get; set; }
    public string? RewardGlyph { get; set; }
    public string? RewardIconUrl { get; set; }
```

- [ ] **Step 5: 让 Mapperly 忽略这三个目标字段**

**不做这步会直接编译失败**——Mapperly 发现目标属性在源实体上没有对应字段就报诊断。`HomeworkApplicationMappers.cs` 的 `DailyTaskMapper` 改为（照同文件 `RewardItemMapper` 的先例）：

```csharp
[Mapper]
public partial class DailyTaskMapper : MapperBase<DailyTask, DailyTaskDto>
{
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardName))]
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardGlyph))]
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardIconUrl))]
    public override partial DailyTaskDto Map(DailyTask source);

    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardName))]
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardGlyph))]
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardIconUrl))]
    public override partial void Map(DailyTask source, DailyTaskDto destination);
}
```

- [ ] **Step 6: 看板里 join 奖励**

`JourneyPlayAppService.GetDailyBoardAsync`——把现有的 `Tasks = tasks.Select(...)` 那行拆开，在 `return` 之前插入 join（照 `GetBackpackAsync:113-127` 的现成写法）：

```csharp
        var dtos = tasks.Select(t => ObjectMapper.Map<DailyTask, DailyTaskDto>(t)).ToList();

        // 奖励名随 DTO 一起下发。故意不走前端查 reward-item/active-list：
        // 那个端点只返回 active 项,奖励一旦下架孩子任务卡上的名字就空了。
        // 这里按 id 直查,下架与否都拿得到——与 BackpackItemDto 同款反范式化。
        var rewardIds = dtos.Where(d => d.RewardItemId.HasValue)
            .Select(d => d.RewardItemId!.Value).Distinct().ToList();
        if (rewardIds.Count > 0)
        {
            var rewards = await _rewardRepository.GetListAsync(r => rewardIds.Contains(r.Id));
            var byId = rewards.ToDictionary(r => r.Id);
            foreach (var d in dtos)
            {
                if (d.RewardItemId.HasValue && byId.TryGetValue(d.RewardItemId.Value, out var r))
                {
                    d.RewardName = r.Name;
                    d.RewardGlyph = r.Glyph;
                    d.RewardIconUrl = _urls.ToUrl(r.IconObjectKey);
                }
            }
        }

        return new DailyBoardDto
        {
            ChildId = childId,
            Date = date,
            Tasks = dtos,
            TasksTotal = total,
            TasksCompleted = completed,
            Stars = StarCalc.CalculateStars(total, completed),
            IsFull = total > 0 && completed == total,
            IsRestDay = total == 0,
        };
```

`_rewardRepository` 和 `_urls` 该服务已注入，无需改构造函数。

- [ ] **Step 7: 跑测试确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~JourneyPlay_Tests"`
Expected: PASS（含新用例，且原有用例不回归）

- [ ] **Step 8: 提交**

```bash
git add backend/src/Homework.Application.Contracts/Tasks/Dtos/DailyTaskDto.cs backend/src/Homework.Application/HomeworkApplicationMappers.cs backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs backend/test/
git commit -m "$(cat <<'EOF'
feat(play): 每日看板下发奖励名/图标,任务卡不用再去配 id

原型任务卡上有「奖励 冲锋饭团」,而 DailyTaskDto 只有 RewardItemId。

故意不让前端查 reward-item/active-list 自己配:那个端点只返回 active
项,奖励一旦下架孩子任务卡上的名字就空了。这里按 id 直查,下架与否
都拿得到——与 BackpackItemDto 已有的反范式化同款。

Mapperly 需要 MapperIgnoreTarget,否则新目标字段无同名源字段会编译
失败(照同文件 RewardItemMapper.IconUrl 的先例)。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 周条端点（七天状态，绝不生成任务）

**Files:**
- Create: `backend/src/Homework.Application.Contracts/Tasks/Dtos/GetWeekStripInput.cs`
- Create: `backend/src/Homework.Application.Contracts/Tasks/Dtos/WeekStripDto.cs`
- Modify: `backend/src/Homework.Application.Contracts/Journeys/IJourneyPlayAppService.cs`
- Modify: `backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyPlay_Tests.cs`

**Interfaces:**
- Consumes: `DailyTaskGenerator.ReadRangeAsync`（Task 1）
- Produces: `IJourneyPlayAppService.GetWeekStripAsync(GetWeekStripInput) → Task<WeekStripDto>`；`WeekStripDto.Days`（7 条 `WeekDayDto`）。Task 5 往同一个 DTO 加 `Streak`；Plan 2 的 `DayStrip` 消费。

- [ ] **Step 1: 写失败的测试**

追加到 `JourneyPlay_Tests.cs`：

```csharp
    [Fact]
    public async Task WeekStrip_Reports_Seven_Days_And_Generates_Nothing_For_Future()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var monday = new DateOnly(2026, 7, 6);
        await SeedStartedJourneyAsync(pid, childId, monday, (DayOfWeek.Monday, "语文", null, null));

        using (_principal.Change(Parent(pid)))
        {
            var strip = await _service.GetWeekStripAsync(new GetWeekStripInput { ChildId = childId, WeekStart = monday });

            strip.Days.Count.ShouldBe(7);
            strip.Days[0].Date.ShouldBe(monday);
            strip.Days[6].Date.ShouldBe(monday.AddDays(6));
            strip.Days[0].IsRestDay.ShouldBeFalse();      // 周一有模板
            strip.Days[0].TasksTotal.ShouldBe(1);
            strip.Days[1].IsRestDay.ShouldBeTrue();       // 只种了周一模板
        }

        // spec §103 的不变量:看了周条,一行未来任务都不许被生成出来
        var taskRepo = GetRequiredService<IRepository<DailyTask, Guid>>();
        var generated = await WithUnitOfWorkAsync(async () => await taskRepo.CountAsync(t => t.ChildId == childId));
        generated.ShouldBe(0);
    }
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~WeekStrip_Reports_Seven_Days"`
Expected: **编译失败**，`'IJourneyPlayAppService' does not contain a definition for 'GetWeekStripAsync'`

- [ ] **Step 3: 建 Input DTO**

Create `backend/src/Homework.Application.Contracts/Tasks/Dtos/GetWeekStripInput.cs`：

```csharp
using System;

namespace Homework.Tasks.Dtos;

/// <summary>
/// 用 Input DTO 而非两个裸参数：ABP 约定路由里单个 *Id 参数会被提升成路径段，
/// 两个及以上才全走 query——用对象参数把这个坑绕开（照 GetDailyBoardInput）。
/// </summary>
public class GetWeekStripInput
{
    public Guid ChildId { get; set; }

    /// <summary>一律为周一（原型周条以周一起头）。后端不猜、不纠正，以它为第 0 天连排 7 天。</summary>
    public DateOnly WeekStart { get; set; }
}
```

- [ ] **Step 4: 建输出 DTO**

Create `backend/src/Homework.Application.Contracts/Tasks/Dtos/WeekStripDto.cs`：

```csharp
using System;
using System.Collections.Generic;

namespace Homework.Tasks.Dtos;

public class WeekStripDto
{
    public List<WeekDayDto> Days { get; set; } = new();
}

public class WeekDayDto
{
    public DateOnly Date { get; set; }
    public bool IsRestDay { get; set; }
    public int TasksTotal { get; set; }
    public int TasksCompleted { get; set; }
    public bool IsFull { get; set; }
}
```

- [ ] **Step 5: 接口加方法**

`IJourneyPlayAppService.cs`——在 `GetDailyBoardAsync` 下一行加：

```csharp
    Task<WeekStripDto> GetWeekStripAsync(GetWeekStripInput input);
```

- [ ] **Step 6: 实现**

`JourneyPlayAppService.cs`——在 `GetDailyBoardAsync` 方法之后加：

```csharp
    /// <summary>
    /// 周条七天状态。<b>刻意不调 EnsureDayAsync/SettleDayAsync</b>——那会把未来日的任务
    /// 提前生成出来（spec §103 明令禁止）。数据全部由 ReadRangeAsync 纯读推导。
    /// </summary>
    public async Task<WeekStripDto> GetWeekStripAsync(GetWeekStripInput input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);

        var days = await _generator.ReadRangeAsync(input.ChildId, input.WeekStart, input.WeekStart.AddDays(6));

        return new WeekStripDto
        {
            Days = days.Select(d => new WeekDayDto
            {
                Date = d.Date,
                IsRestDay = d.IsRestDay,
                TasksTotal = d.TasksTotal,
                TasksCompleted = d.TasksCompleted,
                IsFull = d.IsFull,
            }).ToList(),
        };
    }
```

- [ ] **Step 7: 跑测试确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~JourneyPlay_Tests"`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add backend/src/Homework.Application.Contracts/ backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs backend/test/
git commit -m "$(cat <<'EOF'
feat(play): 周条端点 GetWeekStrip —— 七天状态,纯读不生成

孩子端周条要显示周一~周日的状态(休息/未开/待战/进行中/已攻克)。
不能拿 GetDailyBoard 拉七次:它会 EnsureDay,等于把未来七天的任务
提前生成掉——正是 spec §103 明令禁止的。

改由 ReadRangeAsync 从「模板 + 已生成任务」纯读推导。测试直接断言
调完周条后该孩子的 DailyTask 行数仍为 0。

用 Input DTO 而非两个裸参数,绕开 ABP 约定路由的 *Id 提升规则。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 连续完成接上 `StreakCalculator`

`StreakCalculator` 实现完整、`StreakCalculator_Tests.cs` 也在（覆盖空账本/连续三天/休息日桥接/漏做日断裂），但**全仓库零调用**——缺的只是调用者。

**Files:**
- Modify: `backend/src/Homework.Application.Contracts/Tasks/Dtos/WeekStripDto.cs`（加 `Streak`）
- Modify: `backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs`（`GetWeekStripAsync`）
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Journeys/JourneyPlay_Tests.cs`

**Interfaces:**
- Consumes: `DailyTaskGenerator.ReadRangeAsync`（Task 1）；`Homework.Scoring.StreakCalculator.CalculateCurrentStreak(IEnumerable<DailyScoreSnapshot>, DateOnly)`；`Homework.Scoring.DailyScoreSnapshot(DateOnly Date, bool IsFull, bool IsRestDay)`
- Produces: `WeekStripDto.Streak`（`int`）。Plan 2 的顶栏 stat-pill 消费。

- [ ] **Step 1: 写失败的测试**

追加到 `JourneyPlay_Tests.cs`。**注意：这个测试的全部价值在于「漏做日必须断」——那正是直接读 `DailyScore` 账本会算错的场景**（账本没有补档，漏做日根本没有记录，会被当休息日桥接过去、天数照涨）：

```csharp
    [Fact]
    public async Task Streak_Breaks_On_A_Missed_Day()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var start = new DateOnly(2026, 7, 6);            // 周一
        // 周一到周三每天都有模板 → 「没做」才与「休息日」可区分
        await SeedStartedJourneyAsync(pid, childId, start,
            (DayOfWeek.Monday, "口算", null, null),
            (DayOfWeek.Tuesday, "口算", null, null),
            (DayOfWeek.Wednesday, "口算", null, null));

        // 周一:生成并全做完。周二:模板有,但从没打开过 → 漏做,任务根本没生成。
        using (_principal.Change(Parent(pid)))
        {
            var mon = await _service.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = childId, Date = start });
            foreach (var t in mon.Tasks)
            {
                await _service.CompleteTaskAsync(childId, t.Id);
            }
        }

        // today = 周三。周二被跳过 → 连续必须断在周二,不许把周一算进来。
        // 这正是直接读 DailyScore 账本会算错的场景:周二没记录 → 被当休息日桥接 → 会错答成 1。
        var wednesday = start.AddDays(2);
        var days = await WithUnitOfWorkAsync(async () =>
            await GetRequiredService<DailyTaskGenerator>().ReadRangeAsync(childId, start, wednesday));

        var snapshots = days.Select(d => new DailyScoreSnapshot(d.Date, d.IsFull, d.IsRestDay));
        StreakCalculator.CalculateCurrentStreak(snapshots, wednesday).ShouldBe(0);
    }

    [Fact]
    public async Task WeekStrip_Exposes_Streak()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var monday = new DateOnly(2026, 7, 6);
        await SeedStartedJourneyAsync(pid, childId, monday, (DayOfWeek.Monday, "语文", null, null));

        using (_principal.Change(Parent(pid)))
        {
            var strip = await _service.GetWeekStripAsync(new GetWeekStripInput { ChildId = childId, WeekStart = monday });
            strip.Streak.ShouldBeGreaterThanOrEqualTo(0);   // 字段存在且已接线
        }
    }
```

`JourneyPlay_Tests.cs` 顶部需补 using：

```csharp
using Homework.Scoring;   // DailyScoreSnapshot, StreakCalculator
using Homework.Tasks;     // DailyTaskGenerator, DailyTask
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~WeekStrip_Exposes_Streak"`
Expected: **编译失败**，`'WeekStripDto' does not contain a definition for 'Streak'`

- [ ] **Step 3: DTO 加字段**

`WeekStripDto.cs`——在 `Days` 上方加：

```csharp
    /// <summary>连续完成天数（spec §5.3）。由「模板 + 真实任务」当场推导，不读 DailyScore 账本。</summary>
    public int Streak { get; set; }
```

- [ ] **Step 4: 实现连续完成**

`JourneyPlayAppService.cs`——把 Task 4 写的 `GetWeekStripAsync` 改为：

```csharp
    public async Task<WeekStripDto> GetWeekStripAsync(GetWeekStripInput input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);

        var days = await _generator.ReadRangeAsync(input.ChildId, input.WeekStart, input.WeekStart.AddDays(6));

        return new WeekStripDto
        {
            Streak = await CalculateStreakAsync(input.ChildId),
            Days = days.Select(d => new WeekDayDto
            {
                Date = d.Date,
                IsRestDay = d.IsRestDay,
                TasksTotal = d.TasksTotal,
                TasksCompleted = d.TasksCompleted,
                IsFull = d.IsFull,
            }).ToList(),
        };
    }

    /// <summary>
    /// 连续完成天数。<b>刻意不读 DailyScore 账本</b>：SettlePastDaysAsync 虽然实现了，
    /// 但生产代码零调用（调用点全在测试里），所以账本只有「被拉取过的日子」有记录——
    /// 孩子几天没开 app 就是几个洞，而 StreakCalculator 要求无缺口账本，
    /// 洞会被当休息日桥接过去、天数照涨。且账本删旅程后会变脏（NEXT-STEPS §2.3b）。
    /// 改由 ReadRangeAsync 从源头真相（模板 + 真实任务）当场合成无洞快照。
    /// </summary>
    private async Task<int> CalculateStreakAsync(Guid childId)
    {
        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.ChildId == childId && j.Status == JourneyStatus.Active);
        if (journey == null)
        {
            return 0;
        }

        var today = DateOnly.FromDateTime(_clock.Now);
        // 90 天下限防止超长旅程拖垮查询；连续超过 90 天的场景当前产品不存在
        var from = journey.StartDate > today.AddDays(-90) ? journey.StartDate : today.AddDays(-90);
        if (from > today)
        {
            return 0;
        }

        var days = await _generator.ReadRangeAsync(childId, from, today);
        var snapshots = days.Select(d => new Homework.Scoring.DailyScoreSnapshot(d.Date, d.IsFull, d.IsRestDay));
        return Homework.Scoring.StreakCalculator.CalculateCurrentStreak(snapshots, today);
    }
```

- [ ] **Step 5: 跑测试确认通过**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~JourneyPlay_Tests"`
Expected: PASS

- [ ] **Step 6: 跑全量后端测试**

```bash
cd backend
dotnet test
```
Expected: 全绿。基线为 Domain 56 + EFCore 63（**开工前先跑一次 `dotnet test` 记下真实基线，别信这两个数**）。本计划新增 9 个用例：Task1×4、Task2×1、Task3×1、Task4×1、Task5×2 → EFCore 应为 72。

**若有任何原有用例转红，停下来报告——不要改测试去迁就实现。** Task 1 换掉了 `ResolveDayTotalsAsync` 的实现，原有的 `SettleDay*` 测试就是它的行为等价性证明。

- [ ] **Step 7: 提交**

```bash
git add backend/src/Homework.Application.Contracts/Tasks/Dtos/WeekStripDto.cs backend/src/Homework.Application/Journeys/JourneyPlayAppService.cs backend/test/
git commit -m "$(cat <<'EOF'
feat(play): 连续完成接上 StreakCalculator(绕开 DailyScore 账本)

StreakCalculator 实现完整、StreakCalculator_Tests 也在(覆盖空账本/
连续三天/休息日桥接/漏做日断裂),但全仓库零调用——缺的只是调用者。

刻意不读 DailyScore 账本:SettlePastDaysAsync 虽然实现了,但生产代码
零调用(调用点全在 DailyTaskGenerator_Tests),所以账本只有「被拉取过
的日子」有记录。孩子几天没开 app 就是几个洞,而计算器要求无缺口账本,
洞会被当休息日桥接过去、连续天数照涨。且账本删旅程后会变脏(§2.3b)。

改由 ReadRangeAsync 从源头真相(模板 + 真实任务)当场合成无洞快照,
两条查询覆盖整个区间,纯读不写。90 天封顶防超长旅程拖垮查询。

关键测试 Streak_Breaks_On_A_Missed_Day 走真实生成路径(周一做完、
周二压根没打开过),断言必须断在周二——那正是直接读账本会错答成 1
的场景。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 完成定义（Plan 1）

1. `cd backend && dotnet test` 全绿
2. 新端点在真机可调通：起 Host 后
   `GET /api/app/journey-play/week-strip?childId=<id>&weekStart=2026-07-13` 返回 7 天 + streak
3. `GET /api/app/journey-play/daily-board?childId=<id>&date=<today>` 的任务里带 `rewardName` 与 `estimatedMinutes`
4. **调完 week-strip 后，数据库里该孩子的未来日 `AppDailyTasks` 行数没有增加**（真机复核 §103 不变量）

Plan 2（前端设计系统 + 结构移植）照本计划产出的真实 DTO 开工。

---

## 自查记录

- **Spec 覆盖**：§4① → Task 2；§4② → Task 3；§4③ → Task 1 + Task 4；§4④ → Task 1 + Task 5。§4 全覆盖。
- **类型一致性**：`DayStatus`（Task 1 定义）被 Task 4/5 消费，字段名 `TasksTotal`/`TasksCompleted`/`IsRestDay`/`IsFull` 全程一致；`WeekStripDto` 由 Task 4 建、Task 5 加 `Streak`，无签名冲突；`DailyScoreSnapshot(Date, IsFull, IsRestDay)` 参数序与 `Homework.Domain/Scoring/DailyScoreSnapshot.cs` 一致。
- **已知留白**：`DailyTaskAppService`（家长侧）也映射 `DailyTask → DailyTaskDto`，其返回的 `RewardName`/`EstimatedMinutes` 会是 null/未 join。家长端目前不显示这两项，**故意不动**；若 Plan 2 之后家长端也要显示，再单独提。
