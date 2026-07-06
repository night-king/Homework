# Phase 3 — 家长后台 UI · Design Spec

- **日期**：2026-07-04
- **状态**：设计中 → 待评审（brainstorming 结论已确认，进入实现计划前）
- **依据**：`docs/superpowers/specs/2026-07-04-kids-homework-pet-game-design.md`（§3 角色、§4 运营模型、§5 激励、§7 架构、§9 范围、§11 成功标准）
- **前置**：Phase 1（地基 / 账号）✅、Phase 2（任务引擎与记分账本）✅
- **Stack**：ABP 10.5 · .NET 10 · PostgreSQL/Npgsql · MVC + Razor Pages · LeptonX-Lite 主题 · xUnit/Shouldly（SQLite in-memory 集成测试）

---

## Goal

在 Phase 2 领域引擎之上，构建**家长后台（parent admin）**的完整应用服务与 UI，让家长在 5 分钟内完成"排一周任务 / 临时调整当天 / 复核撤销打卡 / 设家庭大目标 / 管理孩子档案"（spec §9 v1 家长后台闭环、§11 成功标准）。**不含**孩子游戏端（Phase 4）。

## Locked decisions（brainstorming 结论）

1. **一次性交付全部五项能力**：孩子档案（+PIN）、每周任务模板、当日任务临时增删改、复核 / 撤销打卡、家庭大目标。
2. **UI 中文优先**：默认区域文化 `zh-Hans`，英文兜底。
3. **应用服务按能力拆分**（每能力一个 AppService），非单一 god-service。
4. **单一权限** `Homework.ParentAdmin` 门禁整个后台（单家庭单管理员，YAGNI；后续可拆细）。
5. **重结算复用 Phase 2**：抽出 `SettleDayAsync(childId, date)` 单日结算原语，各服务改动后调用。

---

## Architecture

### Domain（`Homework.Domain`）—— 单日重结算 + 两个小 mutator

- 在既有 `DailyTaskGenerator` 上公开 `Task SettleDayAsync(Guid childId, DateOnly date)`：按当日现有 `DailyTask` 重算该天 `DailyScore`（复用现有 `ResolveDayTotalsAsync` + `DailyScore.Settle`；无 DailyTask 时退回模板数 = 漏做，与 Phase 2 一致）。
- 重构 `SettlePastDaysAsync` 改为**循环调用 `SettleDayAsync`**（行为不变，Phase 2 现有 5 个测试仍须绿）。
- 给 `DailyTask` 补两个公有 mutator `SetSubject(string?)` / `SetOrder(int)`（当前 `Subject`/`Order` 为 `private set`，实体仅有 `SetTitle`），供 `DailyTaskAppService.UpdateAsync` 用；`SetOrder` 与 `WeeklyTaskTemplateItem.SetOrder` 保持一致——负值抛 `ArgumentException`（DTO 层已 `Order≥0`，二者兼容）。
- **不新增实体**（仅上述方法级改动）。宠物 / 成长值 / 鼓励语均属后续阶段。

### Application layer（`Homework.Application(.Contracts)`）—— 四个按能力拆分的服务

约定：所有服务标注 `[Authorize(HomeworkPermissions.ParentAdmin)]`；接口 + DTO 在 `Application.Contracts`，实现于 `Application`；DTO↔实体映射用模板既有的 **Mapperly**（`HomeworkApplicationMappers`：`[Mapper] partial class` + `Riok.Mapperly`，source-gen，非 AutoMapper），按需加 `partial` 映射方法。返回列表用 ABP `ListResultDto<T>`（v1 数据量极小，暂不分页）。

**1) `IChildProfileAppService`** —— 孩子档案（无 create/delete，两娃已播种）
- `Task<ListResultDto<ChildProfileDto>> GetListAsync()`
- `Task<ChildProfileDto> GetAsync(Guid id)`
- `Task<ChildProfileDto> UpdateAsync(Guid id, UpdateChildProfileDto input)` —— DisplayName / Grade / AvatarKey
- `Task SetPinAsync(Guid id, SetChildPinDto input)` —— 设 / 清 4 位 PIN（`ChildProfile.SetPin`）
- DTOs：
  - `ChildProfileDto { Id, DisplayName, Grade, AvatarKey?, HasPin, IdentityUserId }`（**不外泄 PIN 明文**，只给 `HasPin`）
  - `UpdateChildProfileDto { DisplayName(req,≤32), Grade(1..12), AvatarKey?(≤64) }`
  - `SetChildPinDto { Pin?(4 位数字；null/空 = 清除) }`

**2) `IWeeklyTaskTemplateAppService`** —— 每周模板 full CRUD
- `Task<ListResultDto<WeeklyTaskTemplateItemDto>> GetListAsync(GetWeeklyTemplateInput input)` —— 按 `ChildId`（必填）+ `DayOfWeek?`（可选筛选）；按 DayOfWeek、Order 排序
- `Task<WeeklyTaskTemplateItemDto> CreateAsync(CreateWeeklyTaskTemplateItemDto input)`
- `Task<WeeklyTaskTemplateItemDto> UpdateAsync(Guid id, UpdateWeeklyTaskTemplateItemDto input)`
- `Task DeleteAsync(Guid id)`
- DTOs：
  - `WeeklyTaskTemplateItemDto { Id, ChildId, DayOfWeek, Title, Subject?, Order, EstimatedMinutes?, IsActive }`
  - `CreateWeeklyTaskTemplateItemDto { ChildId, DayOfWeek, Title(req,≤128), Subject?(≤64), Order(≥0), EstimatedMinutes? }`
  - `UpdateWeeklyTaskTemplateItemDto { Title(req,≤128), Subject?, Order(≥0), EstimatedMinutes?, IsActive }`

**3) `IDailyTaskAppService`** —— 当日任务 + 复核 / 撤销（**含重结算**，最重）
- `Task<DailyBoardDto> GetBoardAsync(GetDailyBoardInput input)` —— 按 `ChildId` + `Date`；**读取即结算**：先 `EnsureDayAsync` 惰性生成，再 `SettleDayAsync(ChildId, Date)` 结算 / 刷新该天 `DailyScore`（含"今天"——`SettlePastDaysAsync` 只补到昨天，故 board 读取路径显式结算所请求日，符合 spec §7.7"访问时结算"），据其返回当天任务 + 当日汇总（Stars/IsFull/IsRestDay 与任务一致）
- `Task<DailyTaskDto> CreateAsync(CreateDailyTaskDto input)` —— 家长临时加任务 → 后置 `SettleDayAsync`
- `Task<DailyTaskDto> UpdateAsync(Guid id, UpdateDailyTaskDto input)` —— 改 Title/Subject/Order → `SettleDayAsync`（不变式统一维护）
- `Task DeleteAsync(Guid id)` —— 删任务 → `SettleDayAsync`
- `Task RevokeAsync(Guid id)` —— `DailyTask.Revoke()`（保留痕迹）→ `SettleDayAsync`（完成度↓、星星重算）
- `Task RestoreAsync(Guid id)` —— `DailyTask.Restore()` → `SettleDayAsync`
- DTOs：
  - `DailyTaskDto { Id, ChildId, Date, Title, Subject?, Order, IsCompleted, CompletedTime?, ReviewState, CountsAsCompleted, SourceTemplateItemId? }`
  - `DailyBoardDto { ChildId, Date, Tasks: List<DailyTaskDto>, TasksTotal, TasksCompleted, Stars, IsFull, IsRestDay }`
  - `CreateDailyTaskDto { ChildId, Date, Title(req,≤128), Subject?(≤64), Order(≥0) }`
  - `UpdateDailyTaskDto { Title(req,≤128), Subject?, Order(≥0) }`
- 所有 mutation 与其 `SettleDayAsync` 在**同一 UoW** 内完成。

**4) `IFamilyGoalAppService`** —— 家庭大目标 CRUD + 进度
- `Task<ListResultDto<FamilyGoalDto>> GetListAsync()` —— 含实时进度（`FamilyGoalProgressService.CalculateStarsAsync`），并顺带 `RefreshAchievementAsync` 落 `AchievedTime`
- `Task<FamilyGoalDto> GetAsync(Guid id)`
- `Task<FamilyGoalDto> CreateAsync(CreateFamilyGoalDto input)`
- `Task<FamilyGoalDto> UpdateAsync(Guid id, UpdateFamilyGoalDto input)`
- `Task DeleteAsync(Guid id)`
- DTOs：
  - `FamilyGoalDto { Id, Title, TargetStars, RewardText?, StartDate, EndDate, AchievedTime?, CurrentStars, IsAchieved, ProgressPercent }`
  - `CreateFamilyGoalDto / UpdateFamilyGoalDto { Title(req,≤128), TargetStars(>0), RewardText?(≤256), StartDate, EndDate(≥StartDate) }`

### Permissions（`Application.Contracts`）

- `HomeworkPermissions.ParentAdmin = "Homework.ParentAdmin"`，在 `HomeworkPermissionDefinitionProvider` 的 `Homework` group 下定义（本地化显示名）。
- **数据播种把 `ParentAdmin` 授予 `admin` 角色**（permission data seeder），家长开箱即用。
- 集成测试用 ABP always-allow 授权；另加一条"无权限 → 拒绝"用例验证门禁。

### Web（`Homework.Web`）—— stock LeptonX Razor Pages

- 新增菜单组 **家长后台**（`requiredPermissionName = ParentAdmin`），4 子项：孩子档案 / 每周任务模板 / 当日任务 / 家庭大目标。
- 每能力一个 Pages 文件夹：`Index.cshtml`（DataTables 列表）+ `CreateModal` / `EditModal`（ABP `abp.ModalManager` + 自动生成的 JS proxy 或手写 fetch）。
- **孩子切换器**：每周模板、当日任务两页顶部下拉（哥哥 / 弟弟，querystring `childId`）。
- **当日任务页**：额外含日期选择（date input），并显示该日 ★ / 吃饱 汇总卡片。
- 移动端：LeptonX 自带响应式即可（spec §7.5：家长后台用自带主题，孩子端 Style A 是 Phase 4）。

### Localization & culture

- 全部后台 UI key 写入 `zh-Hans.json`（**主**）+ `en.json`（兜底），命名风格与既有 key 一致（避免混用空格 / camelCase，参见 abp-localization-fix 经验）。
- **默认区域文化设为 `zh-Hans`**（ABP 本地化默认语言配置 + RequestLocalization 默认）；LeptonX 语言切换保留。

### Testing

- **TDD 应用服务集成测试**，置于 `Homework.EntityFrameworkCore.Tests`（唯一挂了 SQLite in-memory、且已引入应用层的测试工程；`Application.Tests` 未挂 DB，不承载需库用例），跑在 SQLite in-memory ABP host（与 Phase 2 集成测试同套）。
- 重点覆盖不变式：
  - **mutation → 重结算**：`RevokeAsync` 使 `CountsAsCompleted`↓ → `DailyScore.Stars` 重算、`IsFull` 可能转 false；`CreateAsync` ad-hoc 任务使 `TasksTotal`↑、可能跌破吃饱。
  - `GetBoardAsync` 惰性生成（空当天按模板生成）。
  - `FamilyGoalAppService` 进度聚合 = 区间内全家星星和；达标落 `AchievedTime`。
  - 授权：无 `ParentAdmin` 权限调用被拒。
- 页面由**跑起来冒烟**验证（`/run`，中文界面逐页点通），不写重型 UI 自动化。

---

## Data flow —— 撤销 / 修改的重结算（spec §4.2）

家长在「当日任务」页 Revoke 一条打卡 → `DailyTaskAppService.RevokeAsync(id)` → 加载 `DailyTask` → `Revoke()`（`ReviewState=Revoked`，痕迹保留、审计留痕）→ `SettleDayAsync(childId, date)` 重算当天 `DailyScore`（`CountsAsCompleted` 减少 → `TasksCompleted`↓ → `Stars` 重算、`IsFull` 可能转 false）→ 同 UoW 提交。日榜 / 总榜 / 连击 / 大目标进度均由 `DailyScore` **派生**，下次读取自动一致，**无需额外级联**。唯一不回退量：宠物 `GrowthPoints`（Phase 4，本阶段不涉及）。

---

## Out of scope（Phase 3 不做）

- 孩子游戏端、孩子登录 / PIN **输入校验**（Phase 4；本阶段只做家长**设置** PIN）。
- 宠物系统、成长值、每日心情 / 饱食。
- 家长自定义鼓励语 CRUD（v2）。
- Settings 管理页（星星上限 / 里程碑阈值等；Phase 2 已决定 Settings 化留后，v1 用常量 `ScoringConsts.MaxDailyStars`）。
- 排行榜页面（属展示 / 孩子端，Phase 4）。

---

## Acceptance criteria

- `admin` 登录后可见「家长后台」菜单四项。
- 能编辑两娃档案（改名 / 年级 / 头像 / 设 / 清 PIN）。
- 能为某娃某星期几增删改模板项；当日任务页据模板惰性生成当天任务。
- 能对某娃某天增删改任务、Revoke / Restore 打卡，页面即时显示重算后的 ★ / 吃饱。
- 能创建 / 编辑 / 删除家庭大目标并看到实时进度条与达标状态。
- 应用服务集成测试全绿；应用可跑、四页可用（中文界面）。
- 家长后台整套受 `ParentAdmin` 权限门禁。

---

## Implementation chunking（informative；实施计划另由 writing-plans 产出）

0. 权限 `ParentAdmin` + 授予 admin 播种 + 菜单壳 + `zh-Hans` 默认文化 + `SettleDayAsync` 抽取重构（TDD，保持 Phase 2 测试绿）。
1. **ChildProfile**：contracts → TDD service → page + 本地化。
2. **WeeklyTaskTemplate**：同上。
3. **DailyTask**（+ `DailyTask.SetSubject` / `SetOrder` mutator + 重结算 / 复核，最重）：同上。
4. **FamilyGoal**：同上。
5. 端到端冒烟（跑应用逐页验证）+ Phase 3 验收。

---

## Open items to confirm at implementation

**评审后已查证 / 定案：**
- **Mapper = Mapperly**（source-gen `HomeworkApplicationMappers`：`[Mapper] partial class` + `Riok.Mapperly`）——非 AutoMapper，按需加 `partial` 映射方法。✅
- **需库的应用服务测试置于 `Homework.EntityFrameworkCore.Tests`**（`Application.Tests` 未挂 SQLite；EFCore.Tests 已含应用层 + SQLite）。✅
- **当前 `HomeworkResource` 默认文化 = `en`**（`HomeworkDomainSharedModule` 的 `options.Resources.Add<HomeworkResource>("en")`），`zh-Hans.json` 已存在；改默认为中文的确切配置点（`RequestLocalizationOptions.DefaultRequestCulture` / ABP 默认语言设置 / Web 模块支持语言列表）实现时定。

**仍待实现时定：**
- ParentAdmin 授予 `admin` 的落地方式（permission data seeder：`IPermissionDataSeeder` / `IPermissionManager`）。
