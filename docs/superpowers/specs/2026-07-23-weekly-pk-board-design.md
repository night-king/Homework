# 本周 PK 榜（Weekly PK Board）设计文档

- 日期：2026-07-23
- 状态：设计定稿，待评审
- 阶段：**Phase 1**（周榜）。共享旅程（挑战 Challenge）为 **Phase 2**，本文档不含。

## 1. 背景与目标

孩子游戏端已有完整的旅程/宠物/记分玩法。现在要加 **PK 模式**：把某个账号（家长，或将来"老师"）名下的孩子摆在一起比拼，用名次激发好胜心。

产品最终有两个维度（用户确认）：
1. **同一挑战榜**（同一份共享计划下所有孩子）—— 需要"共享旅程"概念，属 **Phase 2**。
2. **本周榜（B）** —— 只看本周完成度，跨旅程即可，**完全跑在现有数据上**。

**先做 Phase 1（本周榜）**：不动核心聚合、不加新表、不加定时任务，最快看到效果并验证玩法。

### 目标（Phase 1）
- 账号名下**正在跑旅程**的孩子，按**本周完成度**排名，展示为定稿的卡片榜。
- 孩子端、家长端各有入口。
- 名次清晰、突出冠军，激发好胜心。

### 非目标（留给后续）
- 共享旅程 / 挑战 / 加入（Phase 2）。
- 跨账号 / 全局排行。
- 历史周榜归档、赛季、发奖结算。
- 鼓励/安抚式文案（用户明确不要：要区别对待）。

## 2. 设计原则：公平地激发好胜心

排名指标用**本周完成度%（比例）**，而非"量"（食物数/任务绝对数）。原因：现有星星体系刻意做成"各自完成自己的计划就满分、与任务多少无关"。若用量排名，任务多的大娃永远赢，任务少的小娃结构性垫底——好胜心变成打击。用完成度比例，则**认真的小娃能压过偷懒的大娃**，竞争公平且更有激励意义。宠物形态、道具数量等"量"只作卡片展示，不参与排序。

## 3. 数据来源（全部复用现有，无新增实体）

| 卡片信息 | 来源 |
|---|---|
| 谁上榜（归属过滤） | `ChildProfile.ParentId` == 当前家长；经 `ChildProfileManager`（`GetOwnedChildIdsAsync`） |
| 是否上榜 | 该孩子有 **Active** `Journey`（无则不显示） |
| 宠物形态 + 等级 | 该 Active `Journey` 的 `PetSpeciesId` + `CurrentLevel` → `PetForm`（对应 Level 的 `SpriteObjectKey`）|
| 🎒 道具 × 数量 | 该 Active `Journey.Backpack`（`RewardItemId` + `Quantity`）→ `RewardItem`（名字/字形/图标）|
| 本周完成度 | `DailyTaskGenerator.ReadRangeAsync(childId, 本周一, min(今天,本周日))` 纯读推导，逐日 `(TasksTotal, TasksCompleted)` 求和 |
| 连击（并列兜底） | 由 `ReadRangeAsync` 快照 + `StreakCalculator.CalculateCurrentStreak(IEnumerable<DailyScoreSnapshot>, today)` **现算**（`JourneyPlayAppService.CalculateStreakAsync` 是 `private`、不能直接调；照它的 90 天下限逻辑复制约 15 行，或抽成共享 helper，见 §8）|
| 本周星星（并列兜底） | 逐日 `StarCalculator.CalculateStars(total, completed)` 求和 |
| 孩子名/头像 | `ChildProfile.DisplayName` / `AvatarKey` |

> 关键：用 `ReadRangeAsync`（纯读、绝不生成任务，见其 §103 约束）计算本周数据，**不触发惰性生成、不写库**。周榜是只读聚合。

## 4. 本周完成度定义

- **本周** = 以 `Clock.Now` 所在自然周，周一为起点、周日为终点；窗口取 `[本周一, min(今天, 本周日)]`（不把未来日算进分母）。
- 逐日取 `(total, completed)`：
  - `休息日（total==0）` 不计入分子分母。
  - `completionPercent = round( Σcompleted / Σtotal × 100 )`；若 `Σtotal==0`（本周到今天全是休息日）→ 完成度 0、排在有分母的孩子之后。
- **排名**：`completionPercent` 降序 → `streak` 降序 → `weeklyStars` 降序 → `DisplayName` 升序（稳定、无并列歧义）。名次 1..N，前 3 金银铜。

## 5. 后端接口

新增只读应用服务（建议独立 `PkAppService`，权限 `HomeworkPermissions.ParentAdmin`，归属过滤当前家长）：

```
GET /api/app/pk/weekly   → WeeklyPkResultDto
```

```csharp
WeeklyPkResultDto {
  DateOnly WeekStart;              // 本周一
  DateOnly Through;                // 计入到哪天（min(今天,周日)）
  List<PkEntryDto> Entries;        // 已按名次排好序
}

PkEntryDto {
  int Rank;                        // 1..N
  Guid ChildId;
  string DisplayName;
  string? AvatarKey;
  Guid PetSpeciesId;
  string PetName;
  int PetLevel;
  string? PetSpriteUrl;            // 当前形态精灵图（经 IAssetUrlResolver）
  int CompletionPercent;           // 本周完成度（排名主键）
  int CompletedTasks;              // 本周完成数（展示/透明度）
  int TotalTasks;                  // 本周应完成数
  int Streak;                      // 连击（兜底键，也可展示）
  int WeeklyStars;                 // 本周星星（兜底键）
  List<PkItemDto> Items;           // 背包道具
}

PkItemDto { Guid RewardItemId; string Name; string? Glyph; string? IconUrl; int Quantity; }
```

- 服务内：取当前家长名下 childIds → 过滤出有 Active 旅程者 → 每人算本周数据 + 取旅程宠物/背包 → 组装 → 排序 → 赋 `Rank`。
- 复用 `ChildProfileManager` 做归属，杜绝越权看到别家孩子。
- N 通常很小（家庭 2–3，班级几十），单次组装即可；无分页。

**映射注意**：
- `Journey.PetSpeciesId` 是 `Guid?`（Draft 才为 null）。只有 **Active** 旅程上榜、`Start()` 必然已设物种，故映射时 `journey.PetSpeciesId!.Value` 安全，但需显式解引用、别吃 nullable 警告。
- `PetName` 取 `PetSpecies.Name`（物种名，稳定；与 `CollectionEntryDto.PetName` 一致），不是 `PetForm.Name`。
- `PetSpriteUrl` = 当前等级对应形态：`Forms.FirstOrDefault(f => f.Level == CurrentLevel)?.SpriteObjectKey` 经 `IAssetUrlResolver.ToUrl(...)`（现有取图鉴的写法，见 `PetSpeciesAppService`/`GetCollectionAsync`）。

## 6. 前端

**共享卡片组件**（定稿视觉）：固定宽高卡（约 180×290），容器 `grid-template-columns: repeat(auto-fill, <固定>)` 自适应换行；卡内自上而下：名次条（金/银/铜/数字，冠军 👑 + 金色高亮）→ 宠物精灵（主视觉）→ 名字 · 等级 → 🎒 道具×数量（2×3 网格）→ 底部本周完成度进度条 + 百分比。放在 `frontend/parent-web/src/features/pk/`（或 `play` 内新目录），供两端复用。

**孩子端入口**：`KidPickChildPage`（选择孩子页）顶部加「🏆 本周 PK」按钮 → 路由 `/play/pk` → 渲染榜。路由注册在现有 `KidLayout` 组内（继承孩子端外壳/鉴权）；react-router v7 静态段优先，`/play/pk` 与 `/play/:childId` 共存、无需排序技巧。

**家长端入口**：控制台加一处「🏆 本周 PK」入口（导航或首页卡）→ 页面复用同组件。

数据经 TanStack Query 拉 `GET /api/app/pk/weekly`（家长端走现有 `/api` 代理与鉴权；孩子端在家长设备的同一前端内，已登录）。名次锋利、突出冠军，不加安抚文案。

## 7. 测试

- **后端**（xUnit + SQLite 内存，`Homework.EntityFrameworkCore.Tests`）：`PkAppService_Tests`
  - 排名顺序：三个娃不同完成度 → Rank 正确。
  - 并列兜底：完成度相同 → 按连击/星星决出顺序。
  - 归属隔离：另一个家长的孩子不出现（`ICurrentPrincipalAccessor.Change`）。
  - 排除规则：无 Active 旅程的孩子不上榜。
  - 完成度算法：含休息日不计入分母；未来日不计入。
- **前端**（Vitest）：卡片组件按 entries 渲染、名次/冠军高亮、道具网格、进度条宽度；UI 不做 TDD，逻辑/排序做单测。

## 8. 风险与备注

- **惰性生成一致性**：必须用 `ReadRangeAsync` 而非 `EnsureDay`，避免打开榜就把未来任务生成出来。
- **连击是 private，需现算**：`JourneyPlayAppService.CalculateStreakAsync` 私有不可复用。`PkAppService` 里照其逻辑用 `ReadRangeAsync(childId, max(StartDate,今天-90), 今天)` 取 `DailyScoreSnapshot`、喂 `StreakCalculator.CalculateCurrentStreak`。首选把这段抽成共享 helper（domain service 或静态方法），两处都调，避免复制粘贴漂移。
- **性能 / 避免 N+1**：每个孩子要 `ReadRange`(本周) + `ReadRange`(连击窗) + 取物种形态 + 取背包道具名。物种/道具应**按 speciesId、rewardItemId 批量一次性载入**（`WithDetailsAsync(x => x.Forms)` 一把捞齐上榜孩子的物种；背包道具同理批量），别每个孩子各查一次。N 小可接受，但按批量写省得后面班级大了要返工。
- **只读、无迁移、无定时任务**：部署仅重发后端 + 两端前端。
- **Phase 2 衔接**：`PkEntryDto`/卡片组件将来可直接复用于"同一挑战榜"，只是把"谁上榜"从"账号名下"换成"同一 ChallengeId"，并可加"宠物等级/进化进度"作可比排名（同挑战计划相同 → 可比）。
