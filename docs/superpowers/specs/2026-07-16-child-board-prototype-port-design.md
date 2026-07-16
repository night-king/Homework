# 孩子端每日看板 — 原型全量移植设计

- 日期：2026-07-16
- 状态：已定稿（待用户复核）
- 前置：Phase 3B（孩子端接线）已完成并合入 `main`（HEAD `7825195`，已 push）。本设计是对 3B **未兑现部分**的补课。
- 移植源：`frontend/child-web-prototype/child-homepage.html`（4,925 行单文件原型）
- 被违反的规格：`specs/2026-07-14-phase3b-child-play-wiring-design.md` §103、§143

---

## 1. 背景：这是一次补课，不是新功能

创始人打开孩子端后的原话是"和我的原型相去甚远"。核查属实，且根因不是审美偏差，是 **Phase 3B 没有执行自己写下的规格**：

- §103 要求「每日看板（**原型 topbar + day strip + task panel**）…**周条今日高亮；过去日可点；未来日锁定**」
- §143 要求「**移植原型的 CSS 设计系统**到 KidLayout 作用域…进化/投掷动画保真」

实际交付：`kid.css` **76 行**（原型 `<style>` 为 **3,096 行**）；`grep` 周条相关标识符（daystrip/weekstrip/dayOfWeek）在孩子端代码**零命中**；投掷动画、伙伴图鉴**零命中**。

现场证据是 `kid.css` 的第一行注释：

```css
/* 孩子端全屏沉浸底座；视觉细节可对照 child-web-prototype/child-homepage.html 的 :root/.app-shell */
```

"**可对照**"——当时留了一句"回头照着看"，然后就没照着做。**做的是行为，没做的是信息架构和视觉。**

为什么没被发现：113 个前端测试全绿。它们没撒谎，行为确实对——但**没有一个测试关心结构**。这决定了本设计 §7 的测试策略。

### 与实现的差距（截图逐项核对）

| 原型 | 3B 交付 |
|---|---|
| 顶栏：头像 + `ADVENTURE BASE` + 孩子名 + 副标题 | 无，只有「交还家长」药丸 |
| 周条：周一~周日 + 日期 + 状态 + TODAY 高亮 | **完全没有** |
| 三个 stat-pill：今日星星 / 连续完成 / 今日进度 | 一行纯文字，`连续完成` 缺失 |
| 舞台：纸感面板 + 日期角标 + `LV n` 横幅 + 形态名 | 精灵图裸浮在背景上 |
| 成长面板：标题 + 百分比 + `n/m` + 「差 N 到 XX」+ 图鉴入口 + 等级徽章 | 一条无标题细条 + `成长值 0/36` |
| 「今日委托」面板标题 | 无 |
| 任务卡：学科标签 + 时长 + 奖励名 + 整条橙色按钮 | 标题 + 生英文 key（`math`）+ 小橙字链接 |
| 「补给台」：道具卡 + 文案 + 喂养按钮 | 一句灰字「背包空空的」 |
| 喂养投掷动画 | 无（瞬间生效） |
| 伙伴图鉴（五阶 rail） | 无 |

---

## 2. 范围

### 做

- **后端四处**（§4）：时长补上模板→任务那一跳；奖励名进 DTO；周条端点；连续完成接线。
- **设计系统移植**（§6）：21 个 `:root` 令牌 → `.kid-shell` CSS 变量；各部件从原型**整段搬** CSS；用到的 keyframes 一起搬。
- **新部件**：KidTopBar、DayStrip、PetStage（含光环/底盘/能量环/彩带氛围层）、GrowthPanel、QuestPanel/TaskCard、SupplyPanel、PetCodex、投掷动画。

**「伙伴图鉴」与现有「收藏墙」是两样东西，别混。** 图鉴 = 当前物种的**五阶形态阶梯**（未达成的形态显示为未揭示态），入口在 GrowthPanel，**modal 弹层**；收藏墙 = 跨旅程的**已完成勋章 + 满级宠物**，已实现，路由 `/play/:childId/collection`，本轮只重刷视觉。
- **旧部件重刷**：选宠 / 进化过场 / 收藏墙重刷到同一套令牌（否则新旧同屏视觉撕裂）。
- **响应式**：桌面 `main-grid` + `aside.side-stack` 两栏；手机堆叠。`--content-width: 1280px`。

### 不做（与已定后端模型冲突，**有意砍掉**）

原型这两处是**前端假数据撑起来的演示**，3B 落地时是**故意**改掉的，不是漏做。硬补会破防「服务端独占成长经济」：

- **`evolveButton`（点击进化）**：规格 B7 定「**服务端独占**进化判定，删掉原型的 `growth += 12` 与本地阈值」。进化仍由喂养后服务端返回 `evolved` 自动触发。这个按钮在真实模型里没有位置。
- **聊天 / 午睡 / 心情气泡**（`petTalkButton` / `petNapButton` / `petSpeechBubble` / `petMoodTag`）：后端**完全没有**对应概念。要做等于现场发明产品行为（宠物说什么？心情怎么算？午睡有什么用？），那是新功能设计，应单开一轮。

**氛围层（光环/底盘/能量环/彩带）保留**——纯视觉，不涉及行为。

### 已定的产品决策

| 决策 | 选择 | 代价（已知并接受） |
|---|---|---|
| 后端动不动 | **动**（四处） | 摊子从「前端移植」变成前后端一起 |
| 过去日语义 | **可补做**：点开能勾昨天漏的，奖励补发 | 「连续完成」含义变软（随时可补）。**奖励刷不了**：`GrantRewardIfNeededAsync` 有 `RewardGranted` 幂等门，`ClawBackRewardIfNeededAsync` 取消时收回 |
| 投掷动画 / 伙伴图鉴 | **都进这一轮** | spec 偏大；图鉴本可单开一轮 |

---

## 3. 组件与文件边界

`DailyBoard.tsx` 现为 112 行、什么都自己干。移植后只当**布局编排**：

```
features/play/
  DailyBoard.tsx        编排：选中日期状态 + 两栏/堆叠布局
  KidTopBar.tsx         profile + DayStrip + 三个 stat-pill
  DayStrip.tsx          7 个日期按钮
  dayStatus.ts          纯函数：(day, today) → 休息/未开/待战/待开始/进行中/已攻克/已完成
  PetStage.tsx          光环/底盘/能量环/彩带/等级横幅/精灵图 + 投掷落点
  GrowthPanel.tsx       成长条/百分比/成长值/「差 N 到 XX」/图鉴入口/等级徽章
  QuestPanel.tsx        今日委托容器
  TaskCard.tsx          学科标签 + 时长 + 奖励名 + 去完成
  SupplyPanel.tsx       补给台（由现有 Backpack.tsx 改造，testid 沿用）
  PetCodex.tsx          伙伴图鉴弹层（五阶 rail）——modal，不是路由
  feedProjectile.ts     投掷动画
  kid/*.css             tokens / topbar / stage / tasks / supply / codex（由 kid.css 汇总 @import）
```

两个约定：

- **`dayStatus.ts` 拆成纯函数**：原型那套状态机是本轮最易错的逻辑，拆出来直接单测，不用渲染整棵树。
- **CSS 按部件分文件**：移植进来 1,500+ 行，堆一个 `kid.css` 没法读也没法改。`kid.css` 只留 shell + `@import`。

保留全部现有 `data-testid`，现有测试不用重接。

---

## 4. 后端改动（四处）

### ① 时长补上那一跳

`DailyTaskGenerator.EnsureDayAsync` 第 59 行是确凿的丢失点：

```csharp
var task = new DailyTask(GuidGenerator.Create(), childId, journeyId, date, t.Title,
    t.Subject, t.Order, t.Id, rewardItemId);   // ← t.EstimatedMinutes 没传
```

模板有 `EstimatedMinutes`（家长端 wizard `StepTasks.tsx` 确实在填），生成任务时整个字段被丢掉。

- `DailyTask` 加 `int? EstimatedMinutes`（private set），构造函数收；生成器传 `t.EstimatedMinutes`；`DailyTaskDto` 暴露。
- 需要一个 EF 迁移。
- **存量任务为 null，不补数据**——UI 见 null 隐藏 chip。

### ② 奖励名进 DTO

`DailyTaskDto` 加 `RewardName` / `RewardGlyph` / `RewardIconUrl`，看板查询 join 出来。

不走「前端拿 `reward-item/active-list` 自己配」的两个理由：`GetActiveListAsync` **只返回 active 项**，奖励一旦下架孩子任务卡上名字就空了；且 `BackpackItemDto` **早已这么反范式化**（有 name/icon/glyph），任务卡走同一套才一致。

### ③ 周条端点

`GetWeekStripAsync(childId, weekStart)` → `{ Streak, Days[7] }`，每天 `{ Date, IsRestDay, TasksTotal, TasksCompleted, IsFull }`。

**`weekStart` 一律为周一**（原型周条以周一起头）。前端按本地日期算出当周周一传入；后端不猜、不纠正，收到什么就以它为第 0 天连排 7 天。

**孩子无 active 旅程时**：7 天全部 `IsRestDay=true`、计数为 0，`Streak=0`。周条正常渲染（全是「休息」），不报错、不空白——空态由上层 `KidGameShell` 决定，本端点不参与。

**绝对不能调 `EnsureDayAsync`**——那正是 §103 禁止的「提前生成未来任务」。改为从**模板**推：

| 情形 | 判定 | 周条显示 |
|---|---|---|
| 那天 `DayOfWeek` 无 active 模板条目 | `IsRestDay` | 休息 |
| 有模板、任务已生成 | 用真实任务计数 | 已攻克 / 进行中 / 待开始 / 已完成 |
| 有模板、任务未生成、过去日 | `TasksTotal`=模板数，completed=0 | 未开 |
| 有模板、任务未生成、未来日 | 同上 | 待战 |

七天状态全对，**一行任务都不会被提前生成**。

**这套规则不用新写——已经存在。** `DailyTaskGenerator.ResolveDayTotalsAsync(childId, date)`（private）正是「有任务用任务计数、否则回退模板数」，且 `IsRestDay = total == 0` 与 `GetDailyBoardAsync` 现有语义一致。本轮只需把它**改成按区间批量查**（一次取区间内全部 `DailyTask` + 一次取该旅程模板，内存里分组），对外暴露：

```csharp
public async Task<List<DayStatus>> ReadRangeAsync(Guid childId, DateOnly from, DateOnly to)
public readonly record struct DayStatus(DateOnly Date, int TasksTotal, int TasksCompleted)
{
    public bool IsRestDay => TasksTotal == 0;
    public bool IsFull => TasksTotal > 0 && TasksCompleted == TasksTotal;
}
```

并让现有的 `ResolveDayTotalsAsync(childId, date)` 委托给 `ReadRangeAsync(childId, date, date)`，**保持规则单一来源**（`SettleDayAsync` 的单天成本不变）。

**必须批量，不能逐天循环**：streak 要扫 90 天，逐天两条查询就是 180 次往返。

### ④ 连续完成

复用现成的 `StreakCalculator`（`Homework.Domain/Scoring/`，完整实现、带 §5.3 注释和休息日桥接逻辑，但**全仓库零调用**——死代码）。

**关键决策：不喂 `DailyScore` 账本，改喂当场从「模板 + 真实任务」合成的快照。**

那个账本有两个毛病：

1. **补档实现了，但没有任何生产代码调用它**。`DailyTaskGenerator.SettlePastDaysAsync(childId, from, to)` 确实存在、也有测试——但 `grep` 全仓库，调用点**只在测试文件里**（`DailyTaskGenerator_Tests.cs:118/157/158`）。生产路径只有 `GetDailyBoardAsync` → `SettleDayAsync(单天)`，所以「那天被拉取过」才有记录，孩子三天没开 app 就是三个洞。而 `StreakCalculator` 的注释明确要求「覆盖到 today 的**无缺口**账本（§7.7 的补档保证）」。洞会被当成休息日桥接过去，**连续天数照涨**。直接读账本接上去，数字是错的。
2. **删旅程后会变脏**（NEXT-STEPS §2.3b 登记在案）。

**为什么不直接调 `SettlePastDaysAsync` 补档后再读账本**（即 §7.7 的原意）：它**逐天循环，每天一次查询 + 一次写库**。挂在 weekStrip 这种读端点上，一次调用就是 60+ 次往返**写操作**。且补完档账本照样会被删旅程弄脏。

而「模板 + 任务」是源头真相，当场算**天然无洞**：那天该有任务却没有任务记录 → 就是没做 → 断。数据来源就是 §4③ 的 `ReadRangeAsync`（**两条查询覆盖整个区间**，纯读不写），`DayStatus` → `DailyScoreSnapshot(Date, IsFull, IsRestDay)` 喂给现成的 `StreakCalculator`。

`StreakCalculator_Tests.cs` 已存在（覆盖空账本 / 连续三天 / 休息日桥接 / 漏做日断裂）——**计算器本身有实现有测试，缺的只是调用者**。

**扫描区间明确为 `max(journey.StartDate, today-90) … today`**（含两端）。取 90 天下限是防止超长旅程把这条查询拖垮；连续天数超过 90 天的场景不存在于当前产品，真出现了按 90 封顶也不算错答案。无 active 旅程 → `Streak=0`，不扫。

**顺带的好处**：`DailyScore` 的脏数据问题**继续维持潜伏**，不会因本轮改动被暴露成「孩子看得见的错数字」。它该修，但不在这一轮。

---

## 5. 数据流

选中日期由 `DailyBoard` 持有，默认今天。三条查询：

```
useWeekStrip(childId, weekStart)    → 顶栏三个 pill + 7 个日期按钮      ← 不生成任务
usePlayBoard(childId, selectedDate) → 舞台日期角标 + 今日委托列表        ← 会生成任务（EnsureDay）
useBackpack(childId, journeyId)     → 补给台                           ← 现有
```

- **点过去日 = 补做入口**：`usePlayBoard(那天)` 触发 `EnsureDayAsync` 当场生成 → 可勾。后端不用改，补做走现有 `CompleteTask` 路径。
- **未来日按钮 `disabled`，不发请求**。UI 不给点 + 端点不生成 = §103 不变量的双保险。

### 失效关系（本轮最易漏）

| 动作 | 失效目标 | 现状 |
|---|---|---|
| 完成/取消任务 | board(那天) + **weekStrip** + backpack | 现失效 board + backpack，**需加 weekStrip** |
| 喂养 | active(journey) + backpack + collection | 已是三个，**不要动** |

`weekStrip` 是本轮**唯一新增**的失效目标。现有 `usePlay.ts` 的 `complete/uncomplete` 只失效 board 和 backpack——**漏掉 weekStrip，勾完任务顶栏进度和日期状态会僵住**。这类「数据变了 UI 不跟」与本轮起因的 bug 同族，故写进设计而非靠实现时想起。

**喂养那行的三个失效目标是 2026-07-16 修 bug 时刚补齐的，不要"优化"掉。** `collection` 看着与喂养无关，但满级会即时写收藏墙；按「只在满级时失效」去改，就会退回那个 bug——而满级路径**恰恰是 mock 测试的结构性盲区**（`DailyBoard` 会被卸载）。

### 投掷动画时序

**同时发，动画不阻塞请求**：动画约 600ms，请求通常更快，让动画等请求会显得卡。请求失败则动画照飞完、随后 toast 报错并回滚。连点守卫 `disabled={feed.isPending}` 保持不变，不会有两发同时在飞。

---

## 6. 视觉层

**调色板根本不是一回事，不只是缺组件：**

| | 原型 | 现在 |
|---|---|---|
| 背景 | `--bg-top #fff5d7` → `--bg-bottom #f4f8ff`，**奶油渐入淡蓝** | `#ffe8c7 → #ffd59e → #ffbe76`，**一路橙到底** |
| 卡片 | `--paper rgba(255,251,241,.88)` 纸感面板 + `--shadow-lg` | **没有面板**，内容直接浮在橙色上 |
| 文字 | `--ink #2c221d` / `--muted #6f6256` | `#7a4a1e` |
| 强调色 | brand 橙 + `--gold`/`--sky`/`--teal`/`--mint`/`--success` 一整套 | 只有橙 |
| 圆角 | `--radius-xl 30px` / `lg 22px` / `md 16px` | 散落硬编码 |

截图里「内容裸奔在橙色背景上」的观感，根因是**纸感面板层压根不存在** + 背景少了向淡蓝的过渡。

**做法**：

- 21 个 `:root` 令牌搬到 **`.kid-shell` 上**当 CSS 变量（**不放 `:root`**，避免泄漏进家长端 shadcn）。
- 各部件从原型对应 CSS 段**整段搬**，只改选择器前缀 + 硬编码色值换令牌。**搬不编**——「翻译即丢失」正是本轮返工的成因。
- 28 段 keyframes 按用到的搬（投掷 / 进化 / 彩带 / 能量环）。
- 现有选宠 / 进化过场 / 收藏墙**一起重刷到这套令牌**。

---

## 7. 测试策略

**本轮教训**：113 个测试全绿而界面相去甚远。测试没撒谎——行为确实对——但**没有一个测试关心结构**。故测试按「能不能抓住这次的失败」设计。

### 能自动测的

| 测什么 | 怎么测 | 抓什么 |
|---|---|---|
| `dayStatus` 七种状态 | 纯函数单测 | 本轮最绕的逻辑 |
| **周条端点不生成任务** | 后端集成测：调 `GetWeekStrip` 后断言未来日 `DailyTask` 行数**仍为 0** | §103 不变量。本轮最想要的一个测试 |
| 连续完成遇「漏做日」会断 | 后端测，**走真实生成路径** | §4④ 的全部意义 |
| 时长从模板流到任务 | 后端测 | §4① |
| 勾任务后 weekStrip 被失效 | 前端测 | §5 点名的漏网之鱼 |
| 顶栏/周条/委托/补给台**节点存在** | 前端结构测 | 直接针对本轮失败模式 |

**测试必须走真实生成路径。** 2026-07-16 的级联删除修复中，测试手工造了「Draft 旅程 + 手插 DailyTask」——生产永远造不出的状态——导致**假绿**：加一个 draft-only 守卫（足以让修复失效）后 3 个测试仍全绿。本轮不重犯。

### 自动测试测不到的（必须承认）

「像不像原型」**没有任何自动化手段能判定**。结构测试只能证明「顶栏这个节点在」，证明不了「它长得对」。截图对比在渐变/动画满天飞的页面上脆得没法维护。

故验收必须有人眼一环。2026-07-16 的满级庆祝 bug 就是 14 轮任务评审 + opus 终审全放过、真机一跑就现原形。

### 完成定义

1. 后端测 + 前端结构测全绿
2. `npm run typecheck && npm run build` 绿（注：`npx tsc --noEmit` 在本仓库是 **no-op**，根 `tsconfig.json` 为 `{"files": [], "references": [...]}`）
3. 真机起服务，截图（手机 + 桌面两栏）交创始人
4. **创始人说「像了」才算完**

---

## 8. 已知风险

| 风险 | 说明 |
|---|---|
| spec 偏大 | 图鉴本可单开一轮（原 §110 标为「可选、低优先」），创始人选择并入。实施计划需分阶段，避免一个巨型 PR |
| 存量任务无时长 | 生产/演示库里已生成的任务 `EstimatedMinutes` 为 null，chip 不显示。重新播种可恢复演示效果 |
| 连续完成扫描成本 | 每次 weekStrip 调用扫旅程区间（~60 天）。当前规模无虞；旅程若拉长到数百天需加缓存 |
| 旧部件重刷的回归面 | 选宠/过场/收藏墙重刷令牌会碰到已跑通的代码，需靠现有 113 个行为测试兜底 |
| `DailyScore` 仍脏 | 本轮有意不依赖、不修复（§4④）。NEXT-STEPS §2.3b 继续挂着 |

---

## 9. 参考

- 移植源：`frontend/child-web-prototype/child-homepage.html`
- 被违反的规格：`specs/2026-07-14-phase3b-child-play-wiring-design.md` §103 / §143 / B7 / §110
- 总设计规格：`specs/2026-07-10-child-journey-pet-backend-design.md`（§5.3 连续打卡、§7.7 补档保证、§186 任务卡显示奖励名）
- 遗留登记：`docs/superpowers/NEXT-STEPS.md` §2.3b
