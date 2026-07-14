# Phase 3B — 孩子端接线（沉浸式养成）设计

- 日期：2026-07-14
- 状态：已定稿（待用户复核）
- 前置：Phase 1（图鉴 + OSS）、Phase 2（旅程 + 成长闭环，含运行时 `JourneyPlayAppService`）、Phase 3A（家长端旅程体验）、Phase 3C（图鉴管理后台）均已完成并合入本地 `main`（HEAD `7c6ef3a`，已 push）。
- 技术栈（前端）：React 19 / Vite 6 / react-router 7 / @tanstack/react-query 5 / zustand 5 / axios / Radix + shadcn 风格 / Tailwind 4 / i18next / vitest。后端 ABP 10.5 / .NET 10（**本 slice 仅加 dev 便利，不碰 play 领域/契约**）。
- 总设计规格：`specs/2026-07-10-child-journey-pet-backend-design.md`（本 slice 是其第三期的 Slice B）。

---

## 1. 背景与范围

第二期已交付完整的孩子侧**运行时后端** `JourneyPlayAppService`（选宠开始 / 每日看板 / 完成 / 喂养进化 / 背包 / 收藏），第三期 Slice A/C 交付了家长端与图鉴后台。但**孩子端至今只是一个原型**：`frontend/child-web-prototype/child-homepage.html` 是单个 4,925 行的纯 HTML 文件（内联 CSS + 原生 JS），全是硬编码 mock（`weekData` / `SPECIES` / `state`），**无 React 工程、无构建、无 fetch、无 auth、无「当前孩子」概念**，只有一个写死的孩子"乐乐"。README 明确写它"是原型，不是正式 React 工程"。

**本 slice（Phase 3B）范围：** 把孩子端**重建为真正的 React 前端**（照 parent-web 技术栈），内嵌进 `parent-web` 作为全屏「孩子模式」，消费真实 `JourneyPlayAppService`，把原型的屏幕 / 交互 / 视觉移植成组件，并补齐原型缺的两块（持久背包、收藏/勋章墙）。同时加**仅 Development 的后端便利**（本地静态 blob 端点 + demo 种子），让整条链路开箱可跑、纯走真实 API。

原型的数据形状与后端 DTO **几乎 1:1**（`SPECIES.stages` ↔ `PetFormDto`、`weekData` ↔ `DailyBoardDto`、`growth/level/species` ↔ `JourneyDto`），且原型已实现好**进化过场（视频优先 + CSS 兜底）、喂养投掷动画、选宠 overlay、进化图鉴**——是极好的移植蓝本。

**非目标（YAGNI）：**
- **不做独立孩子登录 / PIN 校验**：沿用第二期「家长会话 + `childId`」。后端 `JourneyPlayAppService` 是 `[Authorize(ParentAdmin)]`，孩子跑在家长 token 下。`ChildProfile.HasPin` 存在但**无 verify 端点**，本期不做 PIN 门。
- **不碰 play 领域 / 契约**（第二期已全备）；后端仅加 Development 便利（§6）。
- **不新建独立 `child-web` SPA**：内嵌 parent-web，复用其 auth/token/axios/react-query/i18n/vitest 全套管线，单一部署。
- **不做 dino 物种**：原型美术不全（无 PNG/MP4）→ dev 种子只种火龙 + 光之英雄。
- **不做周历/历史深挖**：今日为主，未来日锁定。

---

## 2. 已定的关键决策

| # | 决策点 | 结论 |
|---|---|---|
| B1 | 交付形态 | **parent-web 内嵌全屏「孩子模式」**（独立 `KidLayout`，无侧边栏）。复用 parent-web 全套会话管线，单一部署。 |
| B2 | 入口 | **两个**：① 孩子管理页每个孩子卡片「进入乐园」→ `/play/:childId`；② 全局「孩子模式」→ `/play` 儿童化头像选择屏。 |
| B3 | 会话/鉴权 | 无独立孩子登录；`/play*` 要求家长已登录（play 接口 `ParentAdmin` 鉴权，家长 token 直接够用）。 |
| B4 | 进入编排 | 选中孩子 → `GetActive(childId)`：**有 Active** 进看板 / **有 Draft** 走选宠开始 / **空** 引导态。 |
| B5 | 多 Draft | 多个 Draft 时先出儿童化**「选择冒险」屏**（旅程卡）；恰一个 Draft 则跳过直接选宠。 |
| B6 | 选宠 | 从 `listActivePetSpecies` 选宠 → `Start({childId, journeyId, petSpeciesId})`。 |
| B7 | 成长经济 | **服务端独占** `growthValue`/`growthToNext`/`level`/进化判定；客户端只调 `Feed` 并对返回反应（删原型的 `growth += 12` 与本地阈值）。 |
| B8 | 美术来源 | 本地开发靠 **dev 种子 + 本地静态 blob 端点**（§6），美术纯走后端 URL；孩子端**不再 bundle 本地图**。生产走真 CDN。 |
| B9 | 新建屏 | 持久**背包** + **收藏/勋章墙**（后端有、原型无 UI）。进化图鉴为可选、低优先。 |
| B10 | 退出 | 低调「交还家长」控件回 parent-web；**不做 PIN 门**。 |
| B11 | 范围 | **一个 spec 覆盖完整体验**；plan 内部按波次编排（~15–20 任务）。 |

---

## 3. 后端接口面（现有，孩子端消费）

`JourneyPlayAppService` — `[Authorize(HomeworkPermissions.ParentAdmin)]`，ABP 约定控制器 → `/api/app/journey-play/*`。**精确路由与参数绑定（query vs body）在计划/实现期用运行 host 的 ABP 代理探测确认**（同 Slice C Task 1 做法）；下表为预期形态：

| 能力 | 方法 | 预期路由 | 返回 |
|---|---|---|---|
| 当前旅程 | `GetActiveAsync(childId)` | `GET journey-play/active?childId=` | `JourneyDto?`（null=无 Active） |
| 选宠开始 | `StartAsync(StartJourneyDto)` | `POST journey-play/start`（body） | `JourneyDto` |
| 每日看板 | `GetDailyBoardAsync(GetDailyBoardInput)` | `GET journey-play/daily-board?childId=&date=` | `DailyBoardDto` |
| 背包 | `GetBackpackAsync(childId, journeyId)` | `GET journey-play/backpack?childId=&journeyId=` | `ListResult<BackpackItemDto>` |
| 收藏 | `GetCollectionAsync(childId)` | `GET journey-play/collection?childId=` | `ListResult<CollectionEntryDto>` |
| 完成任务 | `CompleteTaskAsync(childId, taskId)` | `POST journey-play/complete-task?childId=&taskId=` | `DailyTaskDto` |
| 取消完成 | `UncompleteTaskAsync(childId, taskId)` | `POST journey-play/uncomplete-task?...` | `DailyTaskDto` |
| 喂养 | `FeedAsync(FeedDto)` | `POST journey-play/feed`（body） | `FeedResultDto` |

**关键 DTO 契约（已存在，不改）：**
- `JourneyDto`：`{ id, childId, title, description?, startDate, endDate, medalId, status, petSpeciesId?, currentLevel, growthPoints, completedTime? }`。`status ∈ {Draft, Active, Completed}`。
- `DailyBoardDto`：`{ childId, date, tasks[], tasksTotal, tasksCompleted, stars, isFull, isRestDay }`。`GetDailyBoard` **顺带懒生成+结算当日任务**。
- `DailyTaskDto`：`{ id, childId, date, title, subject?, order, isCompleted, completedTime?, reviewState, countsAsCompleted, journeyId, rewardItemId?, rewardGranted }`。
- `BackpackItemDto`：`{ rewardItemId, name, iconUrl?, glyph?, quantity, growthValue }`。
- `FeedResultDto`：`{ evolved, newLevel, revealText?, evolveVideoUrl?, completed, currentLevel, growthPoints }`。喂养**一次一个道具单位**。`evolveVideoUrl` 是**离开形态**（`newLevel-1`）的进化视频；`revealText` 是**到达形态**（`newLevel`）的揭示文案。
- `CollectionEntryDto`：`{ journeyId, title, petSpeciesId, petName, petFinalSpriteUrl?, medalId, medalName, medalImageUrl?, completedTime }`（=已完成旅程=满级宠物+勋章）。
- 图鉴只读（家长会话即可，`class [Authorize]` 仅要求已登录）：`listActivePetSpecies` / `listActiveRewardItems` / `listActiveMedals`（`/api/app/{pet-species|reward-item|medal}/active-list`）。`PetSpeciesDto.forms[]`：`{ level, name, spriteUrl?, revealText?, growthToNext?, evolveVideoUrl?, scale }`。

**旅程发现（`GetActive` 之外）：** play 服务只暴露 `GetActive`。要发现某孩子的 **Draft** 旅程（供选宠开始）与 Completed（收藏由 `GetCollection` 走），复用家长 `listJourneys(childId)`（`GET /api/app/journey?childId=`，返回该孩子全部状态旅程），前端按 `status` 过滤。孩子模式在 `ParentAdmin` 会话下，调用合法。

---

## 4. 路由、布局与鉴权（parent-web 内嵌）

**新增路由（挂在 `AppLayout` 之外，用 `KidLayout`）：**
```
/play              → KidPickChildPage   （全局入口：儿童化头像选择屏）
/play/:childId     → KidGameShell        （某孩子的乐园；内部按旅程状态编排子视图）
```
- `KidLayout`：全屏、full-bleed、儿童化视觉（移植原型设计系统），**无 parent-web 侧边栏/顶栏**。含一个低调「交还家长 ↩」控件（回 `/children` 或上一页）。
- **鉴权守卫**：`KidLayout` 复用 parent-web 现有 auth 守卫思路（`authStore.isAuthenticated` + `isInitializing` 处理；未登录 → `/login`）。play 接口需 `ParentAdmin`，家长登录即具备。
- **入口①**（孩子卡片）：在现有 `features/children/ChildrenPage` 每张孩子卡片加「进入乐园」按钮 → `navigate('/play/'+id)`。
- **入口②**（全局）：`AppLayout` nav 加「孩子模式」项 → `/play`；`KidPickChildPage` 用 `listChildren()` 渲染大号头像卡，点选 → `/play/:childId`。

**`KidGameShell` 内部状态机**（`/play/:childId`）：
```
loading（拉 GetActive + 必要时 listJourneys）
  ├─ 有 Active 旅程            → <DailyBoard>        （游戏主界面）
  ├─ 无 Active，有 ≥2 Draft   → <ChooseAdventure>   → 选定 → <PickPet> → Start → DailyBoard
  ├─ 无 Active，恰 1 Draft     → <PickPet>           → Start → DailyBoard
  └─ 无任何旅程                → <EmptyState>        （"让爸爸妈妈先创建一个旅程 ✨"）
```

---

## 5. 屏幕清单与流程

移植原型交互（原型对应位置见 `child-homepage.html`），接真实 API：

1. **选宠开始 `PickPet`**（原型 `openPetSelect/choosePet` overlay）：`listActivePetSpecies` 渲染宠物卡（火龙/光之英雄），选中 → `Start({childId, journeyId, petSpeciesId})` → 成功进看板。旅程 id 来自 §4 状态机（单 Draft 或 ChooseAdventure 选定）。
2. **选择冒险 `ChooseAdventure`**（新，B5）：多 Draft 时的儿童化旅程卡（标题 + 目标勋章图），点选定一个 → 进 `PickPet`。
3. **每日看板 `DailyBoard`**（原型 topbar + day strip + task panel）：`GetDailyBoard(childId, today)` 为主界面。周条今日高亮；**过去日**可点（按需拉对应 board）；**未来日锁定**（不拉、不预生成，避免 `EnsureDayAsync` 提前生成未来任务）。展示：任务卡、今日星星（`stars`）、进度（`tasksCompleted/tasksTotal`）、满勤（`isFull`）、休息日（`isRestDay`）、宠物舞台（当前形态精灵图 + 成长条）。
4. **完成/取消 `TaskCard`**（原型 `completeTask`）：`CompleteTask/UncompleteTask` → 乐观更新 + invalidate board & backpack。完成即**奖励入真实背包**（后端幂等 `rewardGranted`）；展示"获得 XX"反馈。
5. **背包 `Backpack`**（**新建**，原型只有临时 `rewardQueue`）：`GetBackpack(childId, journeyId)` → 道具卡（图标/glyph + 数量 + 成长值）。是喂养的道具来源。
6. **喂养 `FeedPet`**（原型 `feedPet/launchFeedProjectile`）：在背包点道具 → `Feed({childId, journeyId, rewardItemId})`（**一次一个**）→ 投掷动画 → 用返回 `growthPoints/currentLevel` 更新成长条；`evolved` → 进化过场；`completed` → 满级庆祝。invalidate backpack & journey。
7. **进化过场 `EvolutionCutscene`**（原型 `playEvolution*`）：`evolved` 时用 `FeedResult.evolveVideoUrl`（离开形态视频）优先播放，无则 CSS 四拍兜底（移植原型），随后 reveal 横幅（到达形态 `name` + `revealText`）。
8. **满级完成**：`Feed` 返回 `completed=true` → 满级庆祝 → 后端已发勋章 + 入收藏 → 引导去收藏墙。
9. **收藏/勋章墙 `Collection`**（**新建**）：`GetCollection(childId)` → 已完成旅程卡（满级宠物终态精灵图 + 勋章图 + 完成时间）。
10. **（可选，低优先）进化图鉴 `PetCodex`**（原型「伙伴图鉴」）：从当前物种 `forms[]` 渲染 5 形态阶梯（精灵图 + 名 + reveal 揭示态）。

**宠物形态渲染的数据来源：** 当前形态的**精灵图 / scale / growthToNext / revealText** 均取自 `listActivePetSpecies` 里匹配 `journey.petSpeciesId` 的那条的 `forms[currentLevel]`（成长条 = `journey.growthPoints / forms[currentLevel].growthToNext`）。见 §9 已知取舍（快照 vs 现值 / 停用边界）。

---

## 6. 后端 Development 便利（不碰 play 领域）

### 6a. 本地静态 blob 端点
- `AssetUrlResolver.ToUrl(key)` = `{App:AssetCdnBaseUrl}/{key}`（直白拼接）。本地不接真 CDN 时资产 404。
- 加端点 **`GET /blob/{**key}`**：用 `IBlobContainer<CatalogBlobContainer>.GetOrNullAsync(key)` 按 key 流式返回，按扩展名给 `Content-Type`（png/jpg/mp4…），**`[AllowAnonymous]`**（资产设计即"公有读"，`<img>/<video>` 不带 bearer）。**provider 无关**（现走文件系统 fallback，将来指回真 CDN 则本端点闲置）。
- dev 配置：`appsettings.Development.json` 设 `App:AssetCdnBaseUrl = "https://localhost:44394/blob"`（对齐 `SelfUrl`）。往返：DTO URL = `https://localhost:44394/blob/pets/{id}/form-1.png` → 端点收 `key=pets/{id}/form-1.png` → 从 `CatalogBlobContainer` 取回。
- 端点**仅在 Development 注册**（避免任何生产读面），生产用真 CDN。注册方式（minimal API `app.MapGet` vs 轻量 controller）留计划期定。

### 6b. Demo 种子 `ChildPlayDemoSeedContributor`（仅 Development，幂等）
让孩子流程开箱可跑：
- **2 个 active 物种**：火龙（code `dragon`）、光之英雄（code `hero`），各 5 形态（`level/name/revealText/growthToNext/scale` 取原型 `SPECIES` 数据），把原型现有美术（5 PNG + 4 进化 MP4 / 物种）**灌进 `CatalogBlobContainer`**（沿用应用同款 key：`pets/{id:N}/form-{level}.png`、`pets/{id:N}/evolve-{level}-{level+1}.mp4`），并 `Activate()`。
- **道具 + 勋章**：复用已有 `CatalogSampleDataSeedContributor`（空表插样例）——demo 旅程引用其中的道具/勋章。
- **demo Draft 旅程**：给已有 demo 孩子（`ChildrenDataSeedContributor` 造的）建一个 **Draft** `Journey` + 周任务模板项（几门科目/几天，每项奖励指定或随机）+ 绑定一枚勋章。Status=Draft → 孩子可选宠开始。
- **美术源**：读原型 `frontend/child-web-prototype/assets/pets/`（从 ContentRoot 向上定位含 `frontend/` 的仓库根解析），**不复制二进制进后端仓库**。若相对路径不稳，退化为可配 `Seed:PetArtPath`（计划期定）。种子在 Host 启动与 `DbMigrator` 均会跑，二者均 Development/从源码运行，路径可解析。
- **幂等**：按物种 `code` 存在即跳过；旅程按 demo 孩子已存在 Draft 即跳过。
- **门控**：`IWebHostEnvironment.IsDevelopment()`（或配置开关）为真才播种；生产不带 demo 数据。

---

## 7. 前端结构与约定

- **目录**：`frontend/parent-web/src/features/play/*`（屏幕组件 + 子组件），`src/services/playService.ts`（journey-play 8 方法 + 复用 `listActive*` / `listJourneys` / `listChildren`），`src/features/play/hooks.ts`（react-query）。
- **类型**：复用 `src/types/homework.ts` 现有 DTO 类型；缺的（`DailyBoardDto`/`BackpackItemDto`/`FeedResultDto`/`CollectionEntryDto`/`StartJourneyDto`/`FeedDto`）补齐。
- **状态**：`/play/:childId` 的 childId 走 URL param；旅程/看板/背包走 react-query 缓存 + invalidation；无需新 zustand（复用 `authStore`）。
- **数据流**：完成/喂养用 mutation + `queryClient.invalidateQueries`（board、backpack、active-journey）。乐观更新可选。
- **美术**：精灵图/进化视频/勋章图**只走后端 URL**（dev 种子已喂进后端）。进化视频用原生 `<video>`；无 URL 时 CSS 兜底（移植原型逻辑，但不再 bundle 本地资产）。
- **i18n**：新增 `play.*` 键，**zh-CN + en 双语**（en 可占位/直译，仅为过 `locales.test.ts` 双语一致断言；孩子端实际以 zh 为主）。
- **视觉**：移植原型的 CSS 设计系统到 `KidLayout` 作用域（Tailwind + 少量自定义 CSS/keyframes；进化/投掷动画保真）。与 parent-web 的 shadcn 后台视觉隔离。

---

## 8. 测试（vitest）

沿用 parent-web 测试基建（`test-setup.ts` 全局 `vi.mock('@/i18n/config')`；`environment:jsdom`；`@`→`src`）。覆盖关键流程与分支：
- `KidGameShell` 状态机四分支：Active→看板、单 Draft→选宠、多 Draft→选择冒险、空→引导态。
- 选宠 → `Start` 调用参数正确 → 进看板。
- 完成任务 → `CompleteTask` + board/backpack invalidate；取消 → `Uncomplete`。
- 喂养 → `Feed` 调用（一次一个）；返回 `evolved` → 触发进化过场；`completed` → 满级流程。
- 背包渲染（数量/成长值）、收藏墙渲染（满级宠物+勋章）。
- 入口：孩子卡片「进入乐园」跳 `/play/:id`；`/play` 头像选择跳 `/play/:id`。
- 边界：无美术 URL 时的兜底不崩、休息日（`isRestDay`）、未来日锁定不发请求。
- `npm run build` / `typecheck` / `locales.test` 全绿。

---

## 9. 已知取舍与风险（供计划期决策）

1. **成长阈值：快照 vs 现值。** 旅程 `Start` 时快照了各阶 `growthToNext`（`JourneyPetStage`），但 `JourneyDto` **未暴露** stages。MVP 用 `listActivePetSpecies` 的**现值** `forms[].growthToNext` 渲染成长条（与精灵图同源）。风险：admin 若在旅程进行中改阈值，进度条与后端判定可能轻微不一致（后端仍以快照为准，进化时机正确，仅前端条不精确）。若不可接受，计划期可给 `JourneyDto` 加 `stages` 字段（小改）。
2. **物种停用边界。** 当前形态数据靠 `active-list` 里按 `petSpeciesId` 匹配。若某物种旅程进行中被 admin 停用，孩子端将取不到其 forms（精灵图/文案空）。MVP 接受（seeded 物种保持 active）；必要时计划期加 play 只读方法返回旅程宠物 forms。
3. **play 路由/参数绑定精确形态**（query vs body，尤其 `CompleteTask/UncompleteTask` 的两个 Guid 参数）需用运行 host 探测确认（同 Slice C）。
4. **周条数据成本。** 今日为主；过去日按需拉。不做整周预取（避免多请求 + 未来日预生成）。
5. **demo 美术路径稳健性**（§6b）：跨 Host/DbMigrator 的仓库根解析可能因运行目录不同而脆弱 → 退化为可配路径。
6. **`GetDailyBoard` 副作用**：懒生成 + 结算当日。只对 `date ≤ today` 调用，杜绝提前生成。
7. **原型美术仅 dragon/hero 全**（dino 无图）→ dev 只种这两个；`ChildrenDataSeedContributor` 现有 demo 孩子数量/是否已有旅程需核对，避免种子冲突。

---

## 10. 上线相关（非本 slice，登记至 NEXT-STEPS）

- §6 的 dev 便利**仅 Development**；生产需按 NEXT-STEPS §0 配真 Aliyun/CDN + `AssetCdnBaseUrl`，`/blob` 端点生产不注册。
- 孩子独立登录 / PIN verify 端点：未来若要「孩子自己设备上玩」再做（届时可考虑拆独立 `child-web` SPA）。
- demo 种子（本 slice）与既有 `ChildrenDataSeedContributor`/`CatalogSampleDataSeedContributor` 一并，上线前确认不入正式库（Development 门控）。

---

## 11. 交付定义（验收）

家长登录 parent-web → 从孩子卡片或「孩子模式」入口进入某孩子乐园 → （若有 Draft）选择冒险/选宠开始 → 每日看板做任务、完成得道具入背包 → 背包喂养宠物、成长进化播过场 → 五阶满级发勋章、进收藏墙；全程**纯走真实 `JourneyPlayAppService`**，本地 dev 靠种子 + `/blob` 端点美术真实显示；逾期不惩罚；同孩子单 Active 约束由后端保证。前端 vitest + build + typecheck + locales 全绿。
