# Phase 2 — 任务引擎与记分账本 Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`). This chunk is **TDD-heavy** — the subtle fairness rules from the spec live here; write tests first.

**Goal:** 实现"每周模板 → 每日任务（惰性生成 + 过去日补档）→ 每日星星结算 → 连续打卡 → 家庭大目标"的纯领域引擎，全部有测试护航。不含 UI（Phase 3/4）。

**Architecture:** 领域实体 + 纯计算器/领域服务，尽量"从 `DailyScore` 账本推导"（spec §7.7）。计算器做成**纯函数**便于单测；生成/补档/连击做成领域服务，用 EFCore.Tests（SQLite in-memory）做集成测试。

**Spec:** `docs/superpowers/specs/2026-07-04-kids-homework-pet-game-design.md`（§4.1 惰性生成、§5.1 星星、§5.3 连击、§5.4 大目标、§6 领域模型、§7.7 派生状态）

**Stack:** ABP 10.5 · .NET 10 · PostgreSQL/Npgsql · xUnit/Shouldly。日期用 `DateOnly`（Npgsql 原生映射 `date`）。星期用 `System.DayOfWeek`。

---

## 领域模型（`src/Homework.Domain/`）

- **Tasks/WeeklyTaskTemplateItem.cs**（聚合根）：`Id, ChildId, DayOfWeek, Title, Subject?, Order, EstimatedMinutes?, IsActive`。孩子每周某星期几的一条任务模板。
- **Tasks/DailyTask.cs**（聚合根）：`Id, ChildId, Date(DateOnly), Title, Subject?, Order, SourceTemplateItemId?, IsCompleted, CompletedTime?, ReviewState(枚举 Normal/Revoked)`。方法：`Complete()`、`Revoke()`、`Restore()`。
- **Scoring/DailyScore.cs**（聚合根，记分账本）：`Id, ChildId, Date(DateOnly), TasksTotal, TasksCompleted, Stars, IsFull, IsRestDay`。由 `DailyScoreCalculator` 产出；`SettleFrom(total, completed)` 重算自身。
- **Scoring/FamilyGoal.cs**（聚合根）：`Id, Title, TargetStars, RewardText, StartDate(DateOnly), EndDate(DateOnly), AchievedTime?`。进度由聚合 `DailyScore` 得出（不持久化进度）。
- **枚举 Tasks/TaskReviewState.cs**：`Normal, Revoked`。
- **连击不建实体**：由 `StreakCalculator` 从 `DailyScore` 历史实时推导（spec §6：StreakInfo 是可重算投影；v1 直接算，数据量极小）。

**可调常量**（Domain.Shared，先用常量，Settings 化留后）：`ScoringConsts.MaxDailyStars = 5`。

---

## 领域服务 / 计算器（纯逻辑，重点 TDD）

- **Scoring/StarCalculator.cs**（静态纯函数）：`CalculateStars(int total, int completed) → int`。规则：`total==0 → 0`（休息日另判）；否则 `ceil(completed/total × Max)` 封顶 `Max=5`；`completed` 夹取到 `[0,total]`。
- **Scoring/DailyScoreCalculator.cs**（领域服务）：给定某孩子某天的 `DailyTask` 列表 → 产出/更新 `DailyScore`：`TasksTotal=N, TasksCompleted=C(IsCompleted且ReviewState=Normal), IsRestDay=(N==0), Stars=RestDay?0:StarCalculator, IsFull=(N>0 && C==N)`。
- **Tasks/DailyTaskGenerator.cs**（领域服务）：
  - `EnsureDayAsync(childId, date)`：若该天无 `DailyTask`，按该 `DayOfWeek` 的 `IsActive` 模板项生成。
  - `SettlePastDaysAsync(childId, fromDate, toDate)`：逐日补档 `DailyScore`——模板 `N=0`→休息日行；`N>0`→按当天已有完成情况（缺档=C=0=漏做）结算。使账本无缺口（spec §7.7）。
- **Scoring/StreakCalculator.cs**（领域服务）：`CalculateCurrentStreakAsync(childId, today)`：从 today 往前遍历 `DailyScore`，`IsFull` 连续 +1；`IsRestDay` 跳过（桥接）；遇到"有任务却没吃饱"（含缺档漏做日）停止。

---

## Chunk 1: 实体 + EF 映射 + 迁移

### Task 1: 建实体与枚举
- [ ] 建 `TaskReviewState`、`WeeklyTaskTemplateItem`、`DailyTask`、`DailyScore`、`FamilyGoal`、`ScoringConsts`（字段/方法见上）。构造函数做基本校验（Title 非空、Order≥0、TargetStars>0、Date 合理）。
- [ ] `DailyTask.Complete()` 置 `IsCompleted=true, CompletedTime=now, ReviewState=Normal`；`Revoke()` 置 `ReviewState=Revoked`（记分时视为未完成）。

### Task 2: DbContext + 迁移
- [ ] `HomeworkDbContext` 加 5 个 `DbSet` + `builder.Entity<>` 映射（`ToTable(App..)`, `ConfigureByConvention()`, 索引：`DailyTask (ChildId,Date)`、`DailyScore (ChildId,Date) 唯一`、`WeeklyTaskTemplateItem (ChildId,DayOfWeek)`）。
- [ ] `dotnet ef migrations add Added_TaskScoring -p src/Homework.EntityFrameworkCore -s src/Homework.EntityFrameworkCore`；`cd src/Homework.DbMigrator && dotnet run` 应用；核对表存在。

## Chunk 2: StarCalculator（纯函数，先 TDD）

### Task 3: 星星规则测试→实现
- [ ] 写失败测试 `test/Homework.Domain.Tests/Scoring/StarCalculator_Tests.cs`，覆盖：
  - `(0,0)→0`；`(4,0)→0`；`(4,4)→5`；`(7,7)→5`（公平：两娃都满星）
  - `(4,1)→2`(ceil 1.25)、`(4,2)→3`(ceil 2.5)、`(4,3)→4`(ceil 3.75)
  - `(7,1)→1`、`(7,4)→3`(ceil 2.86)、`(7,6)→5`(ceil 4.29)
  - 越界 `completed>total` 夹取、封顶不超过 5
- [ ] 跑红 → 实现 `StarCalculator.CalculateStars` → 跑绿 → 提交。

## Chunk 3: DailyScoreCalculator（结算，含休息日）

### Task 4: 结算规则测试→实现
- [ ] 测试：N>0 全完成→`Stars=5,IsFull=true,IsRestDay=false`；N>0 部分→星星按规则、`IsFull=false`；**N=0→`IsRestDay=true,Stars=0,IsFull=false`**；被 `Revoke` 的任务不计入 completed。
- [ ] 实现 `DailyScoreCalculator`（可先接受 `(total, completed)` 或 `IEnumerable<DailyTask>`）→ 绿 → 提交。

## Chunk 4: DailyTaskGenerator（惰性生成 + 过去日补档）

### Task 5: 生成 + 补档集成测试→实现
- [ ] 在 `EFCore.Tests`（SQLite in-memory）写测试：给某孩子建周模板（周一 2 项、周日 0 项）；`EnsureDayAsync` 某周一 → 生成 2 个 DailyTask；再调不重复生成（幂等）。
- [ ] 补档测试（关键）：孩子周一~周三吃饱、周四整天没做（不建 DailyTask）、周五做完；`SettlePastDaysAsync` 到周五后，周四得到 `N>0,C=0` 的漏做 `DailyScore`（非休息日）；周日(N=0)得到休息日行。
- [ ] 实现 `DailyTaskGenerator` → 绿 → 提交。

## Chunk 5: StreakCalculator（连击，桥接/断裂）

### Task 6: 连击测试→实现
- [ ] 测试（基于补齐的 `DailyScore`）：连续 3 天吃饱→streak=3；中间夹一个休息日(N=0)→**桥接**仍连续；夹一个漏做日→**断裂**归零重来；今天没吃饱→不含今天。
- [ ] 实现 `StreakCalculator` → 绿 → 提交。

## Chunk 6: FamilyGoal 进度聚合

### Task 7: 大目标进度测试→实现
- [ ] 测试：两个孩子在 `[start,end]` 内的 `DailyScore.Stars` 求和 = 进度；≥Target→达标（置 `AchievedTime`）。
- [ ] 实现聚合（领域服务或 FamilyGoal 方法 + 仓储查询）→ 绿 → 提交。

---

## Phase 2 完成的产出
一套有测试护航的领域引擎：周模板生成当日任务、打卡结算星星（公平封顶、休息日）、账本无缺口补档、连击推导、家庭大目标进度。**Phase 3（家长后台）/ Phase 4（孩子游戏端）在此之上做 UI 与 App 服务。**

## 暂不含（后续阶段）
- App 服务与 API（今日任务/打卡/排行榜接口）、家长 CRUD UI、孩子游戏端、宠物成长（GrowthPoints）、里程碑鼓励语、积分/里程碑 Settings 化。
