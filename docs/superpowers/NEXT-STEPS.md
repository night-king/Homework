# 服务端「旅程 · 宠物 · 道具」改造 — 后续工作清单

> 活文档（living doc）。总设计规格见 `specs/2026-07-10-child-journey-pet-backend-design.md`；
> 第一期实施计划见 `plans/2026-07-10-phase1-catalog-oss.md`。
> 最近更新：2026-07-10。

---

## 现状快照

- **第一期（图鉴 + OSS）✅ 已完成**，已 fast-forward 合入**本地 `main`**（HEAD `29f7e16`，领先 `origin/main` 15 个 commit，**尚未 push**）。
- 已交付：三套全局图鉴 `PetSpecies`(5 形态 + 封面 + 4 进化视频) / `RewardItem` / `Medal` 的实体·持久化·CRUD·文件上传；`Homework.Catalog.*` 权限组 + 授权 admin；Aliyun OSS 接线 + `IAssetUrlResolver`(公有读 + CDN)；3 个 EF 迁移。
- 测试：Domain 44 + EFCore 52 全绿。
- 第二期、第三期**尚未开始**（各自需要 brainstorm → spec/plan）。

---

## 0. 上线前置 / 部署 TODO（第一期真正可用前）

- [ ] **配置真实 Aliyun 凭证**：`Aliyun:AccessKeyId` / `AccessKeySecret`（走 user-secrets 或环境变量，勿提交明文）、`Aliyun:Oss:Endpoint`、`Aliyun:Oss:BucketName`。
- [ ] **创建公有读 Bucket + 接 CDN**（运维预先建桶，应用 `CreateContainerIfNotExists=false`）。
- [ ] **设定 `App:AssetCdnBaseUrl`**：必须对齐 OSS 实际对象路径。host 模式（多租户禁用）下前缀为 `host/`，`catalog` 是 **Bucket 名**而非路径段。**先上传一个资产、在 OSS 控制台核对真实对象路径，再据此设 base**，否则资产 URL 会 404。（详见 spec §6 部署要点。）
- [ ] **应用迁移到 Postgres**：`dotnet run --project backend/src/Homework.DbMigrator`（建 `AppRewardItems` / `AppMedals` / `AppPetSpecies` / `AppPetForms`）。
- [ ] **上传体积上限**：进化 mp4 可能数 MB，配置请求体大小上限与超时。
- [ ] （可选）想同步到 GitHub：`git push origin main`。

---

## 1. 第二期：旅程 + 成长闭环（后端）

> 依赖第一期图鉴。建议先 brainstorm → 写 spec 章节落地 → 出 `plans/…-phase2-journey-growth.md`，再走同样的子代理流水线。
> 对应总规格 §3.2 / §4 / §5 / §9 / §10。

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

## 2. 第三期：家长创建旅程 UX + 孩子端接线（前端）

- [ ] **家长端「创建旅程」向导**：命名 → 起止日期 → 周任务计划(每项奖励指定/随机) → 选勋章 → 预览发布。（诉求 5：体验要做好。）
- [ ] **孩子端原型接真实 API**：`frontend/child-web-prototype` 由硬编码切换为消费真实接口（选宠、每日看板、完成、喂养、进化过场、收藏/勋章墙）。

---

## 3. 第一期遗留技术债（Minor，建议并入第二期一起收）

来自逐任务评审 + 整分支 opus 评审的非阻塞项：
- [ ] `PetSpecies.Scale` 持久化为无界 `numeric` → 加 `HasPrecision(4,2)` / `HasColumnType("numeric(4,2)")`。
- [ ] 换扩展名重传时旧 OSS 对象成孤儿（object key 含扩展名）→ 需要清理/GC 策略。
- [ ] `PetSpecies.GetActiveListAsync` 缺过滤/排序的应用层测试（RewardItem/Medal 已有，pet 是漏网）；缺 cover 缺失的启用失败断言（领域测试已覆盖不变量）。
- [ ] 三处上传方法的扩展名取值风格不统一（`?? string.Empty` vs 直接插值，均安全）→ 可统一。
- [ ] `PetForm.Set/SetSprite/SetEvolveVideo` 目前 `public`（可经只读 `Forms` 触达）→ 收紧为 `internal` 更贴聚合封装。
- [ ] 长远：让 `AssetCdnBaseUrl` 不必手工编码 OSS 前缀（改为从 provider 推导），降低配置出错面。

---

## 4. 参考

- 总设计规格：`docs/superpowers/specs/2026-07-10-child-journey-pet-backend-design.md`（§2 决策表 D1–D11、§12 风险与未决）。
- 第一期计划：`docs/superpowers/plans/2026-07-10-phase1-catalog-oss.md`。
- 子代理执行流水记录（可跨会话恢复）：`.superpowers/sdd/progress.md`。
