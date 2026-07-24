# 共享旅程（SharedJourney）重构 设计文档

- 日期：2026-07-24
- 状态：设计定稿，待评审
- 关系：为「同一挑战榜」(PK Phase 2) 打底。本次**只做共享旅程模型+加入+迁移+两端 UI**；挑战榜是下一阶段（落地后 PK 按 `SharedJourneyId` 聚合即可，卡片组件已现成，见 `2026-07-23-weekly-pk-board-design.md`）。

## 1. 背景与目标

现状：`Journey` 是核心聚合，**一条旅程绑定一个孩子**（`ChildId`），承载计划元数据（标题/日期/勋章）+ 玩法状态（宠物/成长/等级/阶段阈值/背包/状态）；周任务模板 `JourneyTaskTemplateItem` 按 `JourneyId` 挂；每日任务 `DailyTask` 按 childId+journeyId+date 惰性生成。

目标：让家长（或将来老师）建**一份共享的计划**，**勾选名下多个孩子加入**，每个孩子在同一份计划下**各养各的宠物、各自完成度**。这样后续能做"同一挑战同场竞技"的榜。

**关键约束（用户已定）**：
- 架构 **B**：共享的是"计划"，每个孩子仍有**自己的一条 Journey**（现有实体尽量不动），靠 `SharedJourneyId` 关联。**不**把 Journey 改成挂多孩子（那是推倒核心聚合）。
- **统一**：所有旅程都归属一个 SharedJourney（含迁移现有数据），无遗留分叉。
- 模板**真共享**（挂 SharedJourney、改一次全员生效），不是每人拷一份。
- 加入 = **家长勾选**参加的孩子；孩子照旧**自己选宠物、开始**。
- 宠物**各选各的**（沿用现有选宠物流程）。

### 非目标
- 同一挑战榜（下一阶段）。
- 孩子端自助浏览/报名挑战（家长指派即可）。
- "可选宠物集合"限定（各选各的）。
- 跨账号/公开挑战。

## 2. 模型

### 新增 `SharedJourney`（聚合根，＝共享计划）
```
Id, ParentId, Title, Description?, StartDate, EndDate, MedalId, Status(Draft|Active)
```
- **拥有周任务计划**：`JourneyTaskTemplateItem` 挂到它下面。
- 归属：`ParentId`＝创建者（家长/老师）。
- Status：`Draft`（刚建、可编辑计划/加人）、`Active`（已有孩子开始）。不强制"全员完成"的终态（见 §5）。

### `JourneyTaskTemplateItem`（改键）
- `JourneyId` → **`SharedJourneyId`**。模板从属共享计划 → 一处改、所有参与孩子生效。

### `Journey`（现有实体，语义变为"某孩子在某共享旅程下的参与/养成实例"）
- **新增** `SharedJourneyId`（外键，迁移后必填）。
- **保留**：`ChildId, ParentId, PetSpeciesId, CurrentLevel, GrowthPoints, Stages, Backpack, Status(Draft|Active|Completed)`。
- **计划元数据以 SharedJourney 为准**，但 Journey 上**保留去规范化副本** `Title, Description, StartDate, EndDate, MedalId`：
  - 理由：生成器/进化缩放/连击/PK 等**热路径大量读 `journey.StartDate` 等**；留副本可**少改十几处读点、少破坏现有 80+ 测试**，是对活跃产品更稳的取舍。
  - 副本在**加入时**从 SharedJourney 拷入；家长**编辑 SharedJourney**（改日期/标题/勋章）时**同步刷新**所有参与 Journey 的副本（参与者少，成本可忽略）。
  - **唯一不可去规范化**的是模板（那是"共享"的本体）→ 只挂 SharedJourney。

## 3. 模板改键涉及的全部查询点（共 5 处）

`JourneyTaskTemplateItem` 的键 `JourneyId` → `SharedJourneyId`。凡按模板 key 查/删的地方都要改（经 `journey.SharedJourneyId`）：

**生成/缩放逻辑（核心）：**
1. `DailyTaskGenerator.EnsureDayAsync`：`t.JourneyId==journeyId` → `t.SharedJourneyId==journey.SharedJourneyId`。
2. `DailyTaskGenerator.ReadRangeAsync`：同上（它先取孩子 Active 旅程，再按其 SharedJourneyId 取模板）。
3. `JourneyManager.ComputeExpectedFoodCountAsync`（进化缩放预算）：按 `SharedJourneyId` 取模板。

**CRUD（见 §6，随应用服务重构一并改）：**
4. `JourneyTaskTemplateAppService.GetListAsync`：`input.JourneyId`/`t.JourneyId` → `SharedJourneyId`。
5. `JourneyAppService.DeleteAsync`：`_templateRepository.DeleteAsync(t => t.JourneyId==id)` —— 删共享旅程时改成按 `SharedJourneyId` 删（且删除动作迁到 `SharedJourneyAppService`，见 §6）。

**明确不动的 `JourneyId`（易误伤，务必保留原样）**：`DailyTask.JourneyId`、`JourneyPetStage.JourneyId`、`JourneyBackpackItem.JourneyId` —— 这些天然属于"每孩子的 Journey"，**不改键**。只有 `JourneyTaskTemplateItem.JourneyId` 移到 SharedJourney。

其余**不动**：每个孩子仍各自惰性生成各自的 `DailyTask`、各养各的宠物、各自 `Stages`/`Backpack`/完成度。**今日看板对账、PK 周榜、收藏**自动沿用（按 childId/journey 读，不关心模板挂哪）。

## 4. 流程

1. 家长在家长端建 **共享旅程**：标题/描述/起止/勋章 + 排**周计划**（模板，挂 SharedJourneyId）。
2. 家长 **勾选名下哪些孩子参加** → 每个被选中的孩子生成一条 **Draft `Journey`**（`SharedJourneyId` 填好、计划副本拷入；宠物未选、未开始）。
3. 孩子在孩子端 **照旧选宠物 → 开始**（`JourneyPlayAppService.StartAsync` → `JourneyManager.StartAsync`，宠物阈值按共享计划缩放）→ 该娃 Journey `Active`，SharedJourney 转 `Active`。
4. 各娃各自玩：每日任务、喂养进化、完成度。满级 → 自己的 Journey `Completed` → 进**各自收藏**。

## 5. 小决定（默认值）

- **单孩子同时只能一个进行中旅程**：沿用现有 `JourneyManager` 约束。一个娃可被拉进多个共享旅程（各一条 Draft），但只能 `Start` 其中一个；已有 Active 时 Start 另一个报错。
- **完成**：每娃独立满级 → 各自 Journey `Completed` → 各自收藏。SharedJourney 不因某娃完成而结束，保持 `Active`。
- **删除共享旅程**：纯 Draft（无人 Start）可删——连带删其 Draft 参与 Journey + 模板；**只要有孩子已 `Active`/`Completed` 就拦截**（保护进度），提示先各自处理。因只允许删纯 Draft，而 **Draft 旅程不会生成 `DailyTask`**（惰性生成仅对 Active 旅程），故删除路径**无每孩子 DailyTask 需清**。（对照：现有 `JourneyAppService.DeleteAsync` 会按 `t.JourneyId` 删 DailyTask+模板——迁移后此清理由"删纯 Draft 无任务"取代；**若将来加"强删"，必须对每条参与 Journey 各清其 DailyTask**。）
- **移除单个参与者**：该娃 Journey 仍是 Draft（没开始、无任务）→ 可移除（删这条 Draft）；已开始 → 拦截。
- **编辑计划**：改模板/日期/标题/勋章 → 同步刷新所有参与 Journey 的去规范化副本；模板天然共享。生效范围遵循**冻结语义**（与 `EnsureDayAsync` "过去日冻结" 一致）：
  - **未开始(Draft)的娃**：Start 时按最新日期/模板正确缩放阈值、正常生成任务。
  - **已开始(Active)的娃**：其 5 阶进化阈值在 Start 时已按当时计划**快照冻结**，事后改日期/模板**不重算**这些阈值（避免"日期说一套、阈值算的是另一套"）；但**未来日的每日任务**会按新模板生成、**今天**靠 `EnsureDayAsync` 对账补齐。
  - 即：编辑影响"接下来生成什么任务"，不回溯改"已冻结的进化难度"。实现时**不要**给已 Active 的娃接重算阈值的逻辑。

## 6. 后端结构

- **领域**：新增 `SharedJourney` 聚合 + `SharedJourneyManager`（建计划、加/移参与者=建/删 Draft `Journey`、归属校验、删除保护、编辑同步副本）。`Journey` 加 `SharedJourneyId` + 构造参数；`JourneyTaskTemplateItem` 改键。
- **应用**：
  - 新增 `SharedJourneyAppService`：CRUD（建/改/删/列/取）+ `AddParticipantsAsync(sharedJourneyId, childIds[])` / `RemoveParticipantAsync`。权限 `ParentAdmin`。**归属判定**：`SharedJourney` 归 `ParentId`（空 Draft 没有孩子可挂靠）→ 用 `sj.ParentId == CurrentUser.Id`（新增在 `SharedJourneyManager`，不能复用 `ChildProfileManager` 的按 childId 判定）；加参与者时再用 `ChildProfileManager.EnsureChildOwnedAsync` 校验每个 childId 属于当前家长。
  - `JourneyTaskTemplateAppService`：input/查询 `JourneyId` → `SharedJourneyId`（含归属校验从"按 journey.ChildId"改成"按 sharedJourney.ParentId"）。
  - `JourneyAppService`（现有 per-child CRUD）：**收缩**——`CreateAsync`（当前是**公开 API、家长端在用**）移除或改为内部：建 Journey 改由 `AddParticipantsAsync` 内部完成。**这是破坏性变更 → 家长端必须同 PR 一起改**（建旅程入口换成建共享旅程+加参与者）。保留按 child 列/取（孩子端、看板用）。
  - `JourneyPlayAppService.StartAsync`、`DailyTaskGenerator`、`JourneyManager`：按 §3 调整。
- **EFCore**：`SharedJourney` 配置 + `Journey.SharedJourneyId` FK + 模板改键；新迁移。

## 7. 迁移现有数据（**本次必须跑 DbMigrator**）

分成"schema 迁移(EF) + C# 回填(可测) + 清理迁移"三步——**不用 raw SQL 做数据变换**（测试用 `CreateTables()` 从 EF 模型建 SQLite 库、根本不跑迁移，且 PG 的 raw SQL 在 SQLite 跑不了；回填放 C# 仓储层既可测又跨库）：

1. **Schema 迁移 A**：建 `SharedJourney` 表；`Journey` 加 `SharedJourneyId`（先**可空**）；`JourneyTaskTemplateItem` 加 `SharedJourneyId`（可空），**暂留** `JourneyId` 列。
2. **C# 回填步骤**（幂等，随 DbMigrator 的数据种子阶段跑一次；仓储式，**可在 SQLite 测试**）：遍历 `SharedJourneyId==null` 的 `Journey` → 各建一个"单人共享旅程"（拷 Title/Description/StartDate/EndDate/MedalId/ParentId，Status 依 Journey）→ 回填 `Journey.SharedJourneyId` → 把该 Journey 的模板（经暂留的 `JourneyId`）逐条 `SharedJourneyId` 指向新共享旅程。幂等：已回填的跳过。全新库无旧数据 → 空跑。
3. **清理迁移 B**：回填完成后，模型去掉 `JourneyTaskTemplateItem.JourneyId`，迁移 drop 该列；`Journey.SharedJourneyId` 收紧为**必填**（domain 层始终赋值）。

- **上线顺序**：**先备份库** → 传 DbMigrator + Host 新产物 → **跑 DbMigrator**（执行迁移 A、回填、迁移 B）→ restart Host。
- 回填是 C# 步骤（可考虑独立 `SharedJourneyBackfillContributor : IDataSeedContributor` 或 DbMigrator 内一步），与 §9 的回填测试同一份逻辑。

## 8. 前端

- **家长端**：`journeys` 相关页重构为**共享旅程**管理：
  - 列表/新建/编辑共享旅程（标题/日期/勋章 + 周计划模板编辑，模板按 `sharedJourneyId`）。
  - **参与者管理**：勾选名下孩子加入/移除（新 UI）。
  - 类型/service：新增 SharedJourney DTO + 参与者端点；**模板 3 个 DTO 改键** `JourneyId`→`SharedJourneyId`：`CreateJourneyTaskTemplateItemDto`（`[Required]`）、`JourneyTaskTemplateItemDto`、`GetJourneyTemplateInput`；前端 `frontend/parent-web/src/types/homework.ts` + `frontend/parent-web/src/services/homeworkService.ts` 对应改（就是 parent-web，无 `console/` 目录）。
  - **建旅程入口切换**：家长端原"新建旅程(选孩子)"改为"新建共享旅程 + 加参与者"（配合 §6 `JourneyAppService.CreateAsync` 移除，同 PR）。
- **孩子端**：**几乎不变**（家长已建好 Draft，孩子选宠物、开始）。核对选人页/游戏壳里对 journey 的读取不受影响（Journey 仍是每孩子一条）。

## 9. 测试

- **后端（TDD，SQLite 内存）**：
  - **回填步骤正确性**（C# 仓储式、可在 SQLite 测）：种入无 `SharedJourneyId` 的旧式 `Journey`+模板 → 跑回填 → 断言各建"单人共享旅程"、模板 `SharedJourneyId` 改指无丢失、**幂等**（重复跑不重复建）、空库空跑。
  - 生成器/缩放按 `SharedJourneyId` 取模板（多娃共享一份计划、各生成各的任务）。
  - 加入参与者建 Draft、开始受单活约束、删除/移除保护。
  - 编辑计划同步副本 + 今日对账；**已 Active 娃阈值不被重算**（冻结语义，见 §5）。
  - 归属隔离（别家账号不可见/不可加）。
  - 既有后端测试：更新所有直接构造点补 `SharedJourneyId`（规模见 §10），保持全绿。
  - **注**：schema 迁移本身（建表/改列的 PG DDL）测试库不执行 → 由**真实 PG 副本上手动/预发验证**（上线前备份步骤的一部分）；C# 回填逻辑才是自动化测的部分。
- **前端**：共享旅程 CRUD + 参与者 UI 的逻辑单测；`tsc`/`eslint`/`vitest`/`build` 门禁。

## 10. 影响面与风险

- **大面**：横跨领域/应用/EFCore/迁移 + 两端。核心*逻辑*改动其实**很小**（模板改键 5 处 + 新 SharedJourney 聚合与流程）；大头是**新增面**和**构造签名的机械扫改**。
- **构造签名影响半径（实测）**：`Journey` 加 `SharedJourneyId` 构造参数 + `JourneyTaskTemplateItem` 改键，会波及——**`new Journey(...)` 18 处/11 个测试文件**、**`new JourneyTaskTemplateItem(...)` 27 处/6 个测试文件**、**`.Start(...)` 11 处**，且**无公共工厂 helper**（各文件各有 `NewDraft/SeedActiveJourneyAsync/Started` 或内联）。另有**生产调用** `PlayDemoSeeder.cs`（`new Journey` 1 处 + `new JourneyTaskTemplateItem` 2 处）也要补。合计**约 13 个测试文件 / 45+ 构造点的机械扫改**——量大但机械。建议实现时**先加一个共享测试工厂**（建 SharedJourney+Journey+模板，并含一个 `StartedJourney` builder 封装 `.Start(...)` 的阈值快照），把散落构造 + `.Start()` 收敛过去，减少下次再改的成本、也让"冻结语义"测试不必手推阈值。
- **迁移风险**：动线上数据——数据量极小、1:1 映射、上线前备份可控。
- **单元边界**：`SharedJourney`(计划)、`Journey`(每孩子养成)、模板(共享)、生成器(按共享键)、参与者管理——各自职责清晰、可独立测试。
- **回滚**：迁移前备份；schema 迁移可保留 `down`。
