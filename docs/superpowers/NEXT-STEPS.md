# 服务端「旅程 · 宠物 · 道具」改造 — 后续工作清单

> 活文档（living doc）。总设计规格见 `specs/2026-07-10-child-journey-pet-backend-design.md`；
> 第一期计划 `plans/2026-07-10-phase1-catalog-oss.md`；第二期计划 `plans/2026-07-10-phase2-journey-growth.md`。
> 最近更新：2026-07-15（**真机 smoke 已跑**：终审 Critical 修复获实锤验证；抓到并修复「满级庆祝不可达」；新发现记入 §2.3b）。
> Slice A 设计/计划 `specs/2026-07-11-phase3a-parent-journey-ux-design.md`、`plans/2026-07-11-phase3a-parent-journey-ux.md`；
> Slice C 设计/计划 `specs/2026-07-13-phase3c-catalog-admin-design.md`、`plans/2026-07-13-phase3c-catalog-admin.md`；
> Slice B 设计/计划 `specs/2026-07-14-phase3b-child-play-wiring-design.md`、`plans/2026-07-14-phase3b-child-play-wiring.md`。

---

## 现状快照

- **第一期（图鉴 + OSS）✅ 已完成**，已合入本地 `main`。三套全局图鉴 + Aliyun OSS + `IAssetUrlResolver` + 3 迁移。
- **第二期（旅程 + 成长闭环）✅ 已完成**，已 fast-forward 合入**本地 `main`**（HEAD `b28a094`，**尚未 push**）。交付：`Journey` 聚合(重塑 FamilyGoal，含阈值快照+背包)、喂养/单级进化/满级完成、`JourneyManager` 单旅程约束、`RewardResolver`(指定/加权随机/空池兜底)、任务引擎重挂旅程(`JourneyTaskTemplateItem` + `DailyTask` 加 JourneyId/Reward + 生成器旅程域内生成)、家长 `JourneyAppService` + 运行时 `JourneyPlayAppService`(开始/看板/背包/收藏/完成/喂养)、4 个 EF 迁移。经 opus 整分支终审：重复发奖漏洞已修复+回归测试。
- **第三期 Slice A（家长端旅程体验）✅ 已完成**，fast-forward 合入本地 `main`。经 opus 终审 2 项 Important（删除旅程时孤儿模板、指定奖励路径缺测试）已修复。
- **第三期 Slice C（图鉴管理后台）✅ 已完成**，fast-forward 合入**本地 `main`**（HEAD `b65611c`，**尚未 push**）。`parent-web` 内 admin 权限门控的道具/勋章/宠物 CRUD + 上传 + 启停；两段式宠物编辑（5 形态 + 封面 + 精灵图 + 进化视频 + 完整度门控）。**后端未改**。经 opus 终审：权限门控响应式化（避免刷新时管理员被踢）+ 宠物基础信息不被刷新覆盖 已修复。
- **第三期 Slice B（孩子端接线）✅ 已完成**，fast-forward 合入**本地 `main`**（HEAD `ad9fcc8`，**尚未 push**）。`parent-web` 内嵌全屏「孩子模式」（`/play`、`/play/:childId`、`/play/:childId/collection`，`KidLayout` 自守卫）消费真实 `JourneyPlayAppService`：选宠开始 / 每日看板 / 完成→奖励入背包 / 喂养→进化过场/满级庆祝 / 收藏勋章墙；后端仅加 Development 便利（`/blob/{**key}` 静态端点 + `PlayDemoSeeder` 种火龙/光之英雄 2 物种 + demo Draft 旅程）。经 opus 整分支终审修复 1 Critical（`active`/`collection` 走 ABP 路径参数避免真机 404）。
- **真机 smoke（2026-07-15）✅ 已跑**，并在其中发现+修复「满级庆祝不可达」（分支 `fix/kid-completion-celebration`，HEAD `a61771a`）。真浏览器 + 真 ABP + 真 blob 验证：终审那个 Critical 的修复实锤有效（`active/{childId}`→204，旧写法→404）；选宠→任务生成→完成发奖→背包→喂养→3 次进化过场（视频真播）→满级庆祝→完成屏→收藏墙 全通，0 console 错误 / 0 4xx。新发现见 §2.3b。
- 测试：前端 vitest **113**（+8：满级完成回归、连点守卫、空态入口、完成屏冷启动）、`npm run build` / `typecheck` / `lint` 全绿；后端 Domain 56 + EFCore **63**（+2：删旅程级联删任务）。

---

## 0. 上线前置 / 部署 TODO（第一期真正可用前）

- [ ] **配置真实 Aliyun 凭证**：`Aliyun:AccessKeyId` / `AccessKeySecret`（走 user-secrets 或环境变量，勿提交明文）、`Aliyun:Oss:Endpoint`、`Aliyun:Oss:BucketName`。
- [ ] **创建公有读 Bucket + 接 CDN**（运维预先建桶，应用 `CreateContainerIfNotExists=false`）。
- [ ] **设定 `App:AssetCdnBaseUrl`**：必须对齐 OSS 实际对象路径。host 模式（多租户禁用）下前缀为 `host/`，`catalog` 是 **Bucket 名**而非路径段。**先上传一个资产、在 OSS 控制台核对真实对象路径，再据此设 base**，否则资产 URL 会 404。（详见 spec §6 部署要点。）
- [ ] **应用迁移到 Postgres**：`dotnet run --project backend/src/Homework.DbMigrator`（建 `AppRewardItems` / `AppMedals` / `AppPetSpecies` / `AppPetForms`）。
- [ ] **上传体积上限**：进化 mp4 可能数 MB，配置请求体大小上限与超时。
- [ ] **修 Swagger/OpenAPI 500**：`Homework.HttpApi.Host.csproj` 显式钉了 `Microsoft.OpenApi 3.7.0`，与 `Volo.Abp.Swashbuckle 10.5.0` 不兼容 → `/swagger/v1/swagger.json` 返回 500（Slice C Task 1 发现）。前端不依赖 Swagger，但开发调试与 API 文档需要，建议移除该显式版本钉或对齐兼容版本。
- [ ] （可选）想同步到 GitHub：`git push origin main`（第一、二、三期 A/C 均只在本地 `main`，未 push）。

---

## 1. 第二期：旅程 + 成长闭环（后端）✅ 已完成（HEAD b28a094，本地 main，未 push）

> 已按 `plans/2026-07-10-phase2-journey-growth.md` 全部实现并通过评审。以下为原始 backlog（保留作追溯）。

**1.1 `FamilyGoal` → `Journey` 聚合（按孩子维度）**
- [ ] 新字段：`ChildId`、`Status`(Draft→Active→Completed)、`MedalId`、`PetSpeciesId?`、`CurrentLevel`、`GrowthPoints`、`Stages`(阈值快照子实体)、`Backpack`(`{RewardItemId,Quantity}` 子实体)、`CompletedTime?`。退役 `TargetStars/AchievedTime` 的达标即成就逻辑（完成改由宠物满级驱动）。
- [ ] 迁移：drop `AppFamilyGoals` 重建 `AppJourneys` + `AppJourneyPetStages` + `AppJourneyBackpackItems`（D10：无生产数据，允许干净重建）。
- [ ] 删除 `ChildProfile.ActivePetId` 列（改由查询当前 Active 旅程）。

**1.2 任务体系重挂旅程下**
- [ ] `WeeklyTaskTemplateItem` → `JourneyTaskTemplateItem`：加 `JourneyId` + 奖励配置 `RewardItemId?` / `RewardIsRandom`(默认 true，互斥)。
- [ ] `DailyTask` 加列：`JourneyId`、`RewardItemId`(生成时解析、供前端提前展示)、`RewardGranted`(幂等防重复入包)。
- [ ] `DailyTaskGenerator`：定位孩子的 Active 旅程 → 按 DayOfWeek 从旅程模板生成每日任务 → 逐项解析奖励。`DailyScore`/星数/连击保留为观感统计。

**1.3 奖励解析（家长「指定或随机」）**
- [ ] 解析时机 = 每日任务生成；随机 = 在 `IsActive` 道具上按 `RandomWeight` 加权抽取。
- [ ] **空池兜底**：无任何启用道具时的策略（建议无奖励 + 记录告警）。

**1.4 成长闭环（业务不变量集中在 `Journey` 聚合根）**
- [ ] `Start(petSpeciesId, stagesSnapshot)`：Draft→Active，快照 5 阶 `GrowthToNext`（换图无副作用，只有阈值走快照）。
- [ ] `GrantReward` / `RevokeReward`（尽力回收未喂养单位，已喂养不回滚成长 — spec §4.4 显式取舍）。
- [ ] `Feed(rewardItemId, growthValue)` → `TryEvolve()`：达阈值进化、进位保留余数、Lv5 → Completed；满级/已完成后拒绝喂养。
- [ ] **单旅程约束**：`JourneyManager.StartAsync` 校验同孩子无其它 Active 旅程，否则抛 `Homework:Journey.AlreadyHasActive`。

**1.5 应用层接口**
- [ ] `JourneyAppService`(家长，`Homework.ParentAdmin`)：Create(Draft)/Update/Delete、GetListByChild/Get、模板项 CRUD(含奖励配置)、审核 RevokeTask/RestoreTask。
- [ ] `ChildJourneyAppService`(孩子)：GetActive、Start(选宠)、GetDailyBoard(date)、Complete/UncompleteTask、`Feed` → `FeedResultDto{Evolved,NewLevel,RevealText,EvolveVideoUrl,Completed}`、GetBackpack、GetCollection(= Completed 旅程 = 满级宠物 + 勋章)。
- [ ] 完成时授予 `Medal` + 入收藏（收藏即 Completed 旅程集合，无独立聚合）。

**验收**：家长建 Draft 旅程配任务与勋章 → 孩子开始并选宠 → 完成任务得道具 → 喂养成长 → 五阶进化 → 满级发勋章、入收藏；逾期不惩罚；同孩子第二个 Active 旅程被拒。

---

## 2. 第三期（前端）

> 设计 `specs/2026-07-11-phase3a-parent-journey-ux-design.md`；计划 `plans/2026-07-11-phase3a-parent-journey-ux.md`（15 任务，子代理流水线执行 + opus 终审）。

### 2.1 Slice A —— 家长端旅程体验 ✅ 已完成（本地 `main`，HEAD `cd976e2`，未 push）

- [x] 家长端「创建旅程」4 步全页向导（基本信息 → 周任务计划[每项奖励指定/随机] → 选勋章 → 预览发布；部分失败落草稿 → 跳编辑页补齐）。（诉求 5）
- [x] IA 归一为「旅程」区（Journeys 取代 Schedule+Goals）；JourneysPage / New / Edit（草稿复用向导，Active/Completed 只读）/ 首页改旅程为中心。
- [x] 只读消费图鉴（`reward-item`/`medal`/`pet-species` 的 `active-list`）。
- [x] 后端 `CatalogSampleDataSeedContributor`（空表才插样例道具/勋章，幂等）——上线前开发便利。
- [x] 删除被 Phase 2 打断的 family-goal / weekly-template 前端遗留代码与文案；i18n zh-CN + en 同步。
- [x] 终审修复：删除旅程时一并删其任务模板（避免孤儿，`JourneyAppService.DeleteAsync`）；补 StepTasks 指定奖励道具选择测试。

### 2.2 Slice A 遗留 / 上线前（来自 opus 终审，非阻塞）

- [ ] **端到端集成 smoke**：创建旅程 → 读回，验证 `DateOnly` 走 `"YYYY-MM-DD"` 序列化契约（默认 System.Text.Json 判为低风险，尚未跑真实后端验证）。
- [ ] **种子环境开关**：`CatalogSampleDataSeedContributor`（连同既有 `ChildrenDataSeedContributor` 的 demo 账号 + 硬编码密码 `1q2w3E*`）考虑仅 `Development` 播种；上线前确认不把样例数据 / demo 账号带入正式库。
- [ ] 向导部分失败时**失败的任务草稿未回填**编辑页（已持久化工作不丢、无孤儿草稿，仅失败项需家长重录）——可改进为把失败草稿带过去。
- [ ] 测试基建备忘：`src/test-setup.ts` 全局 `vi.mock('@/i18n/config')`（避 react-i18next suspense 在 jsdom 挂起）；全局图鉴种子使每个 EFCore 测试图鉴表非空（断言空池的测试需先清表）；locales.test 只保证双语键**一致**，不保证「代码用到的键都存在」。
- [ ] 若干 inert 小项：`GetJourneyListInput` 未用导出、`JourneysPage` 死 `disabled={!activeChild}`、`updateDtoFrom`/`toCreateTemplateDto` DRY 片段、新 zh-CN 半角标点（vs 全角）、`HomePage`/`saveJourneyEdits` 覆盖偏薄、首页去掉 `isRestDay` 指示。

### 2.3 Slice B —— 孩子端接线 ✅ 已完成（本地 `main`，HEAD `ad9fcc8`，未 push）

- [x] **不再编辑 `child-web-prototype` 原型**（那是纯 HTML 设计蓝本）；改为在 `parent-web` 内**新建全屏「孩子模式」React 区**（`features/play/*`），消费真实 `JourneyPlayAppService`。
- [x] 入口两处：孩子管理页每卡「进入乐园」+ 全局 nav「孩子模式」→ 头像选择屏；`KidLayout` 自带鉴权守卫（`/play*` 在 `AppLayout` 外）。
- [x] `KidGameShell` 状态机：`GetActive` → 有 Active 进看板 / 无 Active 有 ≥2 Draft 选择冒险 / 恰 1 Draft 选宠 / 空态。
- [x] 每日看板（今日为主，宠物舞台+成长条+星星/进度+任务）、完成/取消（奖励入真实背包）、持久背包、喂养（一次一个 `Feed`）、进化过场（视频优先+CSS 兜底+reveal）、满级庆祝、收藏/勋章墙。
- [x] 成长经济全服务端（客户端只反映 `growthPoints ÷ form.growthToNext`，无本地计算）；`playService`（8 接口）+ `usePlay` hooks（复用 `useCatalog`/`useJourneys` 避免缓存分裂）+ `play.*` 双语。
- [x] 后端仅 Development 便利：`/blob/{**key}` 静态端点（用 `CatalogBlobContainer` 流式返回资产）+ `PlayDemoSeeder`（Host 启动、`Seed:PlayDemo` 门控，种火龙/光之英雄 2 物种含原型美术 + 哥哥 Draft 旅程）；`appsettings.Development.json` 设 `AssetCdnBaseUrl=https://localhost:44394/blob`。**未碰 play 领域/契约**。
- [x] opus 整分支终审修复 1 **Critical**：`getActiveJourney`/`getCollection` 原用 query，但 ABP 对**单 `*Id` 参数**提升为路径段 → 改 `active/{childId}`、`collection/{childId}`（否则真机 404，核心闭环断）。双 `*Id`（backpack/complete/uncomplete）留 query 正确。

**2.3a Slice B 遗留（来自终审三诊，非阻塞，fast-follow）**
- [x] **[真机 smoke]** 已跑（2026-07-15，DbMigrator + Dev 种子 + 真浏览器 Playwright）。**终审 Critical 修复实锤有效**：`active/{childId}`→204、旧写法 `active?childId=`→404；`/blob` + `AssetCdnBaseUrl` 出图（封面/精灵 1024²、进化视频 1280×720）；闭环全通（选宠→任务生成→完成发奖→背包→喂养→3 次进化过场→收藏墙），0 console 错误 / 0 4xx。**并抓到 1 个 mock 测试结构上看不见的真 bug（见下条）+ 2 个新发现（§2.3b）。**
- [x] **满级庆祝不可达（此前记为「引导缺失」，实际严重得多）** — 已修，commit `a61771a`。真相：满级时 `feed` 的 `onSuccess` → `invalidateActive` → `GetActive` 返 204 → shell 切走看板 → **庆祝 state 挂在 DailyBoard 里，随组件一起被卸载**，孩子只看到「还没有冒险」。修法：庆祝提升到 `KidGameShell`（分支之外渲染）+ 新增一次性 `JourneyCompleted`（满级形象 + 勋章 + 去收藏墙）+ 空态补收藏入口（满级后看板永不再现，这是通往勋章的唯一持久入口）+ `feed` 补 `invalidateCollection`。漏网之因：`DailyBoard.feed.test` 直接渲染看板不经 shell（卸载物理上不可能发生），`KidGameShell.test` 又把 DailyBoard 换成假占位 —— 两边各自绿，缝隙漏掉真 bug；回归测试须用闸门控住 refetch 时机，否则 `waitFor` 会抓到一闪而过的过场而假绿。
- [x] **喂养连点丢庆祝（opus 评审实测复现，commit `c6b8091`）** — 满级时 60ms 连点：第二次 `mutate` 换掉 `MutationObserver` 的 `#mutateOptions`，**第一次喂养的 scoped `onSuccess` 永不触发** → 没有庆祝；而 mutation 级 `invalidateActive` 照跑 → 204 → 空态；第二次喂养撞 `EnsureActive()` → 错误 toast。症状与原 bug 一字不差。**背包按钮是孩子端唯一没有 pending 守卫的入口**（`PickPet`/任务开关都有）→ 已补 `disabled={feed.isPending}`。教训：真机 smoke 是「成年人点一次」，结构上看不见连点，两类验证都需要。
- [ ] **完成旅程后 `useChildJourneys` 未失效**：同会话内旅程完成后 drafts 缓存陈旧，状态机可能给已完成旅程再开 PickPet（`StartAsync` 会抛）；`staleTime:0` 重挂载自愈，边缘。可让 `feed`/完成路径也失效 `['journeys',childId]`。
- [ ] **背包卡未显 `growthValue`**（spec §5 要求「图标/glyph + 数量 + 成长值」）→ 加 `+{growthValue}` 一行 + 断言。
- [ ] 完成任务 toast `t('play.rewardEarned',{name:t('play.feed')})` 渲染「获得 喂养！」（动词当道具名）；`DailyTaskDto` 只带 `rewardItemId` 无名 → 需 id→name 查表才能正确显示，低优先。
- [ ] KidPickChildPage 无「零孩子」空态；`Backpack.test` 未覆盖 `iconUrl<img>`/loading 分支；`usePlay` 测试偏薄；`usePlay` 手写 `['play','board',childId]` 前缀字面量（可复用 `playBoardKey` 前缀）。
- [ ] `PlayDemoSeeder` catch 文案只提「DB 未迁移」但也吞 FileNotFound/BusinessException（`ex` 已 log，仅文案窄）；medal `GetListAsync` 全量再排序取一（dev 量级无碍）。
- [ ] 孩子端 hooks 有意不发 success toast（孩子端 UX，非缺陷）；`/blob` 端点无 Content-Length/Range（dev shim，生产走真 CDN，均**不修**）。

**2.3b 真机 smoke 新发现（2026-07-15，均非本次修复范围）**
- [x] **删旅程遗留孤儿 `DailyTask`（真机复现）** — 已修，commit `cd615c7`。`JourneyAppService.DeleteAsync` 原先只级联删任务**模板**（Slice A 终审所加），已生成的 `DailyTask` 行留库。实测：删掉旅程 A 后新建旅程 B，孩子看板仍返回 **journeyId 指向已删除 A** 的任务，且这些遗留占住了那些日期 → **B 的任务再也生成不出来**。触发路径：家长删掉一个已跑起来的旅程再建新的。修法：`DeleteAsync` 一并 `DeleteAsync(t => t.JourneyId == id)`；补 2 个测试（清空自己的任务 / 不误伤其它旅程），EFCore 61 → 63。真机复验：A 生成任务 → 删 A → 建 B → 看板任务全部归属 B。
- [ ] **删旅程后 `DailyScore` 残留陈旧数据（opus 评审实测）**：`DailyScore` 按 `childId + date` 存、**不带 `journeyId`**，级联谓词够不着 → 已删旅程挣的星星/满勤仍留在账上（实测：删除前后 `total=1 completed=1 isFull=True stars=5` 不变）。**目前潜伏**：`DailyScore` 尚无任何仓储读取方（`StreakCalculator` 只被单测引用），且读取时 `ResolveDayTotalsAsync` 会重算 → 一旦把统计/连击接线就会腐化。修法：删任务后按旅程日期区间重新结算（`SettlePastDaysAsync(childId, journey.StartDate, journey.EndDate)`）。与刚关掉的孤儿 `DailyTask` 是**同一类** bug：残留物按不带 `journeyId` 的键存。
- [ ] **删除契约前后端不一致（产品决策，待定）**：前端只允许删草稿（`JourneysPage.tsx:83` 用 `j.status === 0` 同时门控编辑与删除，确认文案也写「移除该**草稿**旅程」），但后端 `JourneyAppService.DeleteAsync` **无任何状态守卫**（评审实测：对 Active 旅程调用 → 放行）。两条契约互相矛盾。需定夺：(a) 后端补 draft-only 守卫对齐 UI（级联删任务降为纵深防御），或 (b) 承认允许删非草稿 —— 那就要一并重新结算 `DailyScore`，并注意**删除 Completed 旅程会静默抹掉孩子收藏墙上的勋章与满级宠物**，而当前确认弹窗完全没有提示。
- [ ] **孤儿 `JourneyPetStage`/`Backpack` 子行（既有，非本次引入，无害）**：`HomeworkDbContext.cs:176-179` 配了 `OnDelete(Cascade)`，但 Journey 走**软删除**（UPDATE 而非 DELETE）→ DB 级联永不触发，子行也未被加载 → EF 追踪器也不级联（实测残留 5 行 `JourneyPetStage`）。仅占存储，不可见（只能经被过滤的 Journey 到达）。
- [ ] **`GetActive` 无旅程时返 204 而非 `200 + null`**：axios 把空响应体给成 `''`，`KidGameShell` 的 `if (active.data)` 因空串 falsy 而**恰好**走对分支 —— 能用，但属于撞对的，契约上应显式返回 null 或让 service 层归一。
- [ ] i18n 语言由浏览器 locale 决定（`fallbackLng: zh-CN` + `detection: ['localStorage','navigator']`）：en-US 设备上孩子端为英文。**当前配置的正确行为**，仅记录；如需孩子端锁中文另议。

### 2.4 Slice C —— 图鉴管理后台 ✅ 已完成（本地 `main`，HEAD `b65611c`，未 push）

- [x] `parent-web` 内 admin 权限门控（`Homework.Catalog.*`，`authStore.hasPermission`）的「图鉴管理」区：道具/勋章/宠物 CRUD + 上传 + 启停。**后端未改**（第一期已全备）。
- [x] 两段式宠物编辑：创建 dialog（基础字段）→ `/catalog/pets/:id` 详情页（5 形态元数据 + 封面/精灵图/进化视频上传 + 完整度门控 + 启用/停用）。
- [x] 共享 `FileUploadField`（multipart：字段名 `file`、`Content-Type` 置 `undefined` 让浏览器带 boundary、宠物 `level` 走 query）。上传契约经 Task 1 用路由探测确认。
- [x] 权限门控响应式化（select `permissions` slice + `permissionsLoaded` 守卫，避免刷新时管理员被踢/导航缺失）;宠物基础信息 seed 仅按 `species.id` 一次（不被上传后 refetch 覆盖）。落地后 Slice A 开发种子从「必需」降为「新库便利」。

**2.4a Slice C 遗留（来自 opus 终审，非阻塞，fast-follow）**
- [ ] **管理端 toast 文案 i18n**：`已创建/已保存/…` 等成功提示为硬编码中文（**全应用既有惯例**，非本 slice 独有）→ 建议做一次全应用 toast i18n 收口，勿只改 catalog 造成不一致。
- [ ] 各图鉴 create dialog 的必填校验错误直接显示字段标签（如「名称」「代码」）而非「请填写」类提示；宠物创建仅缺 name 时也显示 code 标签 → 加 `catalog.*Required` 文案。
- [ ] 宠物详情页基础信息**保存无必填校验**（靠后端拒绝 + 错误 toast）;`usePetSpecies` 出错时无 error 态（无限 loading）→ 加 `isError` 分支。
- [ ] `FileUploadField` 的 `onUpload` 拒绝未在组件内 `catch`（mutation `onError` 仍会 toast，仅控制台 unhandled rejection）;视频分支 + 上传中禁用态无测试;视频「已上传」标记复用 `catalog.evolveVideo`（通用视频场景语义不贴）。
- [ ] 未用 i18n 键 `catalog.noPermission`/`delete`/`missingCover`/`missingSprite`;上传 service 参数 `level: number` 可收紧为 `PetFormLevel`;表单 `<Label>` 未 `htmlFor` 关联;部分面板/弹窗测试偏薄（edit 预填/删除确认/上传接线未测）。

### 2.5 孩子端每日看板原型全量移植 —— 进行中（分支 `feat/child-board-prototype-port`，未合并）

**起因**：创始人打开孩子端，「和我的原型相去甚远」。核查属实——Phase 3B（§2.3）做了行为，**没做信息架构和视觉**：`kid.css` 76 行 vs 原型 `<style>` 3096 行；周条 / 投掷动画 / 伙伴图鉴 grep 全零命中；`kid.css` 第一行注释白纸黑字写着「视觉细节**可对照**原型」——留了句「回头照着看」然后没照着做。违反的是 3B 自己的规格 §103 / §143。设计规格 `specs/2026-07-16-child-board-prototype-port-design.md`，分三份计划执行（后端 / 设计系统+结构 / 动效+图鉴）。

**Plan 1/3 —— 后端数据缺口 ✅ 已完成（分支 HEAD `16c06fc`，terminal 终审 READY TO MERGE，Domain 56 + EFCore 75 全绿）**
- [x] **时长补上「模板→每日任务」那一跳**：`EstimatedMinutes` 一直在模板上、家长 wizard 也在填，但 `DailyTaskGenerator.EnsureDayAsync` 建 `DailyTask` 时**没传**，值到孩子端就蒸发。已补字段 + 构造函数末位可选参数 + 生成器传参 + DTO + EF 迁移（`20260716065740`，仅一列 nullable int）。存量任务为 null，不补数据。
- [x] **奖励名进 `DailyTaskDto`**（`RewardName`/`RewardGlyph`/`RewardIconUrl`）：看板按 id **不过滤 IsActive** 批量 join（下架奖励仍显示名字；与 `BackpackItemDto` 同款反范式化）。**这不修复 §106 的「获得 喂养！」toast**——见下方新增遗留。
- [x] **周条端点 `GetWeekStripAsync`**（7 天状态 + streak）：**绝不生成任务**（规格 §103 不变量），全走新的 `DailyTaskGenerator.ReadRangeAsync`（把私有逐天的 `ResolveDayTotalsAsync` 提成公开批量、两条查询覆盖整个区间、原方法委托回去保持规则单一来源）。测试直接断言调用后未来日 `DailyTask` 行数仍为 0。
- [x] **连续完成接上 `StreakCalculator`**（此前完整实现+单测但**零调用**的死代码）：**有意绕开 `DailyScore` 账本**——账本无补档（`SettlePastDaysAsync` 实现了但生产零调用，孩子几天没开 app 就是几个洞，会被当休息日桥接、天数照涨）且删旅程后会变脏（见 §2.3b）。改由 `ReadRangeAsync` 从「模板+真实任务」当场合成无洞快照，`max(StartDate, today-90) … today` 封顶。
- **与 §2.3b 的关系**：本 Plan **绕开**了 `DailyScore`，所以那条「删旅程后账本残留 → 接线后腐化」的隐患**仍潜伏、但不再在 streak 的读取路径上**。§2.3b 那条依然该修，只是不再被本功能逼到台前。

**2.5a Plan 1 终审遗留（opus 整分支终审，非阻塞）**
- [ ] **`DailyTaskDto` 奖励字段只有 `GetDailyBoardAsync` 填**，`CompleteTaskAsync`/`UncompleteTaskAsync` 及家长端 `DailyTaskAppService` 返回的同型 DTO 这三个字段**恒为 null**（已加 XML 注释警示）。**这正好是 §106「获得 喂养！」toast 的坑**：想当然地在 `complete.mutate` 的 `onSuccess` 里读 `dto.rewardName` 会拿到空。**Plan 2 必须**从 board 缓存读奖励名，**不要** `setQueryData`/乐观更新那三个字段。要么就把这几处产出方也填上（一次奖励查询，路径本来就有 3-4 次写）。
- [ ] **后端 `today` 用服务器本地时区**（`_clock.Now`，未配 `AbpClockOptions` → `Kind=Unspecified` → 服务器本地时间）。本分支是**第一处**用时钟推导「日期」做业务判定（此前 `_clock.Now` 只戳 `CompletedTime`）。UTC 部署 + UTC+8 家庭，在当地 00:00–08:00 之间后端的 `today` 是家庭的「昨天」→ streak 会给昨天「今天进行中不断裂」的宽限而非断裂，08:00 自愈。上线前：服务器时区对齐家庭，或让端点收客户端日期。
- [ ] **streak 每次调用扫最多 90 天**（两条查询，非按天 N+1）。当前规模无虞；旅程若拉长到数百天，与规格 §8 的缓存风险一起考虑。
- [ ] Minor（won't-fix / 记录）：`DailyTask.SetEstimatedMinutes` 无调用方（为与模板对称而加）；`DailyTaskAppService.CreateAsync`（家长手动加任务）不收 `EstimatedMinutes`（模板外任务，无产品需求）；`SeedStartedJourneyAsync` 测试助手直接 `j.Start()` 绕过 `JourneyManager`（对看板/奖励断言安全，**不可**拿去撑喂养/进化测试）。

**Plan 2/3 —— 设计系统 + 结构移植 ✅ 已完成（分支 HEAD `b8ea005`，创始人视觉验收通过）**
- [x] 数据层接 Plan 1（`WeekStripDto`/`useWeekStrip` + `DailyTaskDto` 加 `rewardName`/`estimatedMinutes`；勾任务失效 weekStrip）。
- [x] `DailyBoard` 从 112 行单体拆成编排 + 8 部件：`KidTopBar`（头像 + 周条 + 三 stat-pill）、`DayStrip`（未来日锁/过去日补做）、`dayStatus` 纯函数（七态）、`PetStage`（氛围层 + LV 横幅）、`GrowthPanel`（%/成长值/「差 N 到 XX」/图鉴入口/Lv 徽章）、`QuestPanel`+`TaskCard`（学科色标签/时长/奖励名/大按钮）、`SupplyPanel`（由 Backpack 改造 + 显 growthValue）。
- [x] 21 令牌搬上 `.kid-shell`（变量名不改）；各部件从原型对应 CSS 段整段搬（`kid/*.css`）；背景奶油渐入淡蓝；旧屏（PickPet/过场/收藏/完成）重刷令牌；补齐全部 i18n 键（zh+en）。
- [x] 收藏墙入口（Phase 3B 加的，原型无）做成金色奖杯胶囊（创始人反馈「离太近、没样式」后修，`b8ea005`）。
- [x] 前端 141 测试 + typecheck + build 全绿；后端 Domain 56 / EFCore 75。真机截图对比原型验收通过。
- **本轮抓修的关键坑**（jsdom 结构上看不见，评审用无头 Chromium 渲染才发现）：CSS 层叠 bug（旧橙背景在 import 后仍赢 / 旧 `.kid-board{max-width:640px}` 把两栏挤成 640px）；终审用**完整组装渲染**抓到 stage/quest/supply 三面板 `padding=0`（单任务隔离渲染看不见,内容贴 30px 圆角边框）；Windows `PetStage.tsx` vs `petStage.ts` 大小写孪生解析陷阱；`.mini-badge` 漏搬第二条覆盖规则。
- **本轮遗留（Plan 3 或后续）**：`childName` 显旅程标题非孩子真名（需 children query）；`.kid-feed-button` 死 CSS（Plan 3 加喂按钮）；点道具即喂 vs 原型选道具+喂按钮（产品定）；「获得 喂养！」toast 文案（base 就有，非本轮）；死 legacy CSS 清扫。

**Plan 3/3 —— 投掷动画 + 伙伴图鉴 ✅ 已完成（分支 HEAD `5b7d6c1`，opus 终审 READY FOR SCREENSHOT）**
- [x] **喂养投掷动画**：`feedProjectile.ts` 真几何飞行——取源道具卡 rect + 宠物落点 rect（`PetStage` 转发 `petRef` 到 `.kid-pet-core`），克隆 `.kid-flying-drop` 挂 `document.body`，两帧后切 `is-flying` 触发 CSS transition，~780ms 清理。瞄准点 56%/34% 对齐原型。喂养请求**并行不阻塞**（`onFeed` 先 `launchFeedProjectile`(try/catch) 再照常 `feed.mutate`）。CSS 逐字搬原型 `.flying-drop`(1644-1668)。真机渲染核对：点道具产出飞行体、`--fly-x:441.6px`。
- [x] **伙伴图鉴 `PetCodex` modal**：`GrowthPanel` 的 `open-codex` 接上，`DailyBoard` 建 `codexOpen` 状态渲染。从当前物种 `forms[]` 渲染五阶卡，**按等级门控锁态**（`level<=currentLevel` 显真身，`>` 显未揭示态锁+???）——原型 rail 其实没做锁态（尽管文案说"未解锁保持神秘"），这里**复活 purpose-built 但没接线的死 CSS**（`.evolution-card`/`state`/`lock`）补齐 spec §110 意图。modal 外壳逐字搬原型 1670-1743 + 2290-2320。真机渲染核对：五阶 rail、锁阶显 ?、当前阶高亮。
- [x] i18n 13 键（zh+en）；全量 153 测试 + typecheck + build 全绿；四红线（满级 hoist / feed 三失效目标 / 连点守卫 / onFeedResult）终审 git diff 确认全 HOLD。
- **终审登记的跟进项（非阻塞）**：投掷体 `z-index:80`（挂 body）会画在进化过场 `.kid-evo`（`z-index:40`，在 `.kid-shell` 栈上下文内）之上——仅"喂养触发进化/满级"那一次、瞬态 780ms、`pointer-events:none`，正常截图时已飞走。修法需调 z-index 栈架构（把飞行体挂进 `.kid-shell` 并给低于过场的 z，或抬高过场 z）。`childName` 显旅程标题非孩子真名（需 children query，Plan 2 起就挂着）。`.kid-feed-button` 死 CSS + 点道具即喂 vs 原型选道具+喂按钮（产品定）。

---

### 2.6 三份计划全部完成 —— 孩子端看板照原型全量移植收官

`feat/child-board-prototype-port` 分支含 Plan 1（后端数据缺口）+ Plan 2（设计系统+结构移植）+ Plan 3（投掷动画+伙伴图鉴），共 40+ 提交,已推 origin，**未合并 main**（待创始人定）。三份计划各自 opus 终审通过。后端 Domain 56 / EFCore 75，前端 153 测试全绿。创始人已对 Plan 2 的看板视觉验收通过（並反馈修了收藏墙入口）。Plan 3 待创始人看投掷 + 图鉴。

---

## 3. 第一期遗留技术债（Minor，建议并入第二期一起收）

来自逐任务评审 + 整分支 opus 评审的非阻塞项：
- [ ] `PetSpecies.Scale` 持久化为无界 `numeric` → 加 `HasPrecision(4,2)` / `HasColumnType("numeric(4,2)")`。
- [ ] 换扩展名重传时旧 OSS 对象成孤儿（object key 含扩展名）→ 需要清理/GC 策略。
- [ ] `PetSpecies.GetActiveListAsync` 缺过滤/排序的应用层测试（RewardItem/Medal 已有，pet 是漏网）；缺 cover 缺失的启用失败断言（领域测试已覆盖不变量）。
- [ ] 三处上传方法的扩展名取值风格不统一（`?? string.Empty` vs 直接插值，均安全）→ 可统一。
- [ ] `PetForm.Set/SetSprite/SetEvolveVideo` 目前 `public`（可经只读 `Forms` 触达）→ 收紧为 `internal` 更贴聚合封装。
- [ ] 长远：让 `AssetCdnBaseUrl` 不必手工编码 OSS 前缀（改为从 provider 推导），降低配置出错面。

## 3b. 第二期遗留技术债（来自 opus 整分支终审，非阻塞）

- [ ] **抽 `IRewardLedger` 共享领域服务**：奖励 grant/clawback 逻辑在 `JourneyPlayAppService` 与 `DailyTaskAppService` 复核路径各一份；每日看板组装也在两处重复。改动奖励逻辑前先用共享测试冻结两处等价行为，再抽取，防止漂移。
- [ ] `ClawBackRewardIfNeededAsync` 的 journey==null 边界：目前 `RewardGranted` 永不清（journey 被删的极端情况）。低风险，评估是否需处理。
- [ ] `GetDailyBoard*` 按 `(ChildId,Date)` 而非 `JourneyId` 取任务：当前安全（每(child,date)只生成一次 + 单旅程约束）。若未来允许同孩子多旅程日期重叠，需给 board 契约加 `JourneyId`。
- [ ] 领域小护栏 / 测试断言补全：`JourneyBackpackItem.Decrement` 无负值下限；`Journey.Start` 未 null-check `stages`；若干 `BusinessException` throw 测试未断言 `.Code`。
- [ ] 部署核对：`Reshaped/Added_DailyTask` 迁移把 `DailyTask.JourneyId` 对既有行回填 `Guid.Empty`。本项目 greenfield 无数据，但上线前确认目标库无遗留 `DailyTask` 行（否则会与任何旅程脱钩）。

---

## 4. 参考

- 总设计规格：`docs/superpowers/specs/2026-07-10-child-journey-pet-backend-design.md`（§2 决策表 D1–D11、§12 风险与未决）。
- 第一期计划：`docs/superpowers/plans/2026-07-10-phase1-catalog-oss.md`。
- 第二期计划：`docs/superpowers/plans/2026-07-10-phase2-journey-growth.md`。
- 子代理执行流水记录（可跨会话恢复）：`.superpowers/sdd/progress.md`。
