# 服务端「旅程 · 宠物 · 道具」改造 — 后续工作清单

> 活文档（living doc）。总设计规格见 `specs/2026-07-10-child-journey-pet-backend-design.md`；
> 第一期计划 `plans/2026-07-10-phase1-catalog-oss.md`；第二期计划 `plans/2026-07-10-phase2-journey-growth.md`。
> 最近更新：2026-07-14（第三期 **Slice B 孩子端接线 完成** → 第三期全部完成）。
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
- 测试：前端 vitest **105**（+31）、`npm run build` / `typecheck` / `lint` 全绿；后端 Domain 56 + EFCore 61（未变，Slice B 未碰 play 领域/契约）。

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
- [ ] **[真机 smoke]** playService 路由修复后，跑一次真实 host（配好 DbMigrator + Dev 种子）验证整条闭环（spec §9.3）；前端测试全走 mock，未触真实 ABP 路由（正是 Critical 漏网之因）。
- [ ] **满级完成引导**：`completed=true` 关过场后 `active` 变 null → 落到空态，空态无收藏入口（`🏆 收藏墙` 链接只在看板上）→ 应在满级庆祝卡或空态加去收藏墙的入口（spec §5.8）。
- [ ] **完成旅程后 `useChildJourneys` 未失效**：同会话内旅程完成后 drafts 缓存陈旧，状态机可能给已完成旅程再开 PickPet（`StartAsync` 会抛）；`staleTime:0` 重挂载自愈，边缘。可让 `feed`/完成路径也失效 `['journeys',childId]`。
- [ ] **背包卡未显 `growthValue`**（spec §5 要求「图标/glyph + 数量 + 成长值」）→ 加 `+{growthValue}` 一行 + 断言。
- [ ] 完成任务 toast `t('play.rewardEarned',{name:t('play.feed')})` 渲染「获得 喂养！」（动词当道具名）；`DailyTaskDto` 只带 `rewardItemId` 无名 → 需 id→name 查表才能正确显示，低优先。
- [ ] KidPickChildPage 无「零孩子」空态；`Backpack.test` 未覆盖 `iconUrl<img>`/loading 分支；`usePlay` 测试偏薄；`usePlay` 手写 `['play','board',childId]` 前缀字面量（可复用 `playBoardKey` 前缀）。
- [ ] `PlayDemoSeeder` catch 文案只提「DB 未迁移」但也吞 FileNotFound/BusinessException（`ex` 已 log，仅文案窄）；medal `GetListAsync` 全量再排序取一（dev 量级无碍）。
- [ ] 孩子端 hooks 有意不发 success toast（孩子端 UX，非缺陷）；`/blob` 端点无 Content-Length/Range（dev shim，生产走真 CDN，均**不修**）。

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
