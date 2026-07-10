# 孩子端「旅程 · 宠物 · 道具」服务端改造设计

- 日期：2026-07-10
- 状态：已定稿（待用户复核）
- 技术栈：ABP Framework 10.5.0 / .NET 10 / EF Core / Aliyun OSS
- 参照原型：`frontend/child-web-prototype/child-homepage.html` 及 `assets/pets/*`

---

## 1. 目标与背景

孩子端原型已经跑通了「养成 + 进化」的核心体验：孩子完成任务 → 获得奖励道具 → 喂养宠物 → 宠物成长 →
五阶进化。原型中的宠物形象、进化视频、道具、阶段文案全部是前端硬编码。本设计把这套体验**反向落到服务端**，
使其数据驱动、可由平台管理员配置、可由家长组织成一段段「旅程」。

四条产品诉求：

1. **旅程（Journey）**：家长可新建一段有名字、有起止日期的旅程（如「2026年暑假」）。孩子在旅程中养成一个宠物；
   养满即获得该宠物（永久收藏）+ 一枚勋章。
2. **宠物形象可定制**：平台管理员在后台创建宠物（名称 + 形象照），上传 5 张形态图 + 4 段进化动画，前端不再硬编码。
3. **开始即锁定**：孩子开始一段旅程时只能选择一个宠物，中途不能切换。
4. **奖励道具**：平台管理员在后台维护道具图鉴（星火书签 / 共鸣号角 / 留存果实 …）。家长设任务时可指定具体道具，
   或让系统随机（默认）。
5. **家长创建旅程的体验要做好**（前端，第三期）。

---

## 2. 已定的关键决策

| # | 决策点 | 结论 |
|---|---|---|
| D1 | 旅程与任务体系的关系 | **旅程拥有任务**：`FamilyGoal` 升级重塑为 `Journey` 聚合，任务（周模板 + 每日任务）归属旅程；旅程绑定一个宠物实例与一枚勋章。 |
| D2 | 宠物成长/进化的驱动 | **喂养驱动**：完成任务 → 获得道具 → 喂养 → 成长值累积 → 五阶进化。 |
| D3 | 图鉴归属 | **平台管理员全局图鉴**：宠物 / 道具 / 勋章三套图鉴均为全局数据（无 `ParentId`），由平台管理员维护，所有家庭共享、只读消费。 |
| D4 | 勋章模型 | 勋章也做成管理员图鉴，旅程创建时引用其一作为完成奖励。 |
| D5 | 完成判定 | **满阶即成功、逾期不惩罚**：宠物养到第 5 阶 = 旅程成功（随时发勋章 + 宠物入永久收藏）。`EndDate` 只是软目标，逾期未满级不惩罚、旅程保持可继续。 |
| D6 | 选宠范围 | 孩子从全局图鉴中所有启用的宠物里自选一个；家长创建旅程时不必圈定候选。 |
| D7 | 单旅程约束 | 同一孩子同一时刻只有一个 `Active` 旅程；可预建 `Draft`（未来）旅程、保留 `Completed`（历史）旅程。 |
| D8 | Blob 存储 | **Aliyun OSS**，使用官方 `Volo.Abp.BlobStoring.Aliyun` 提供程序；领域层只依赖 `IBlobContainer`，与具体 provider 解耦。 |
| D9 | 资产分发 | **公有读 Bucket + CDN**：实体存 OSS object key，DTO 通过 `IAssetUrlResolver` 返回稳定 CDN URL，不签名。 |
| D10 | 旧数据 | 无生产 `FamilyGoal` 数据需保留，直接干净重塑（drop 重建），不写数据迁移脚本。 |
| D11 | 规格范围 | 一份总规格覆盖三期；实施计划按三期拆分推进。 |

**YAGNI / 非目标（v1 明确不做）**：
- 道具不做差异化机制效果——所有道具默认按 `GrowthValue`（默认 12）给成长值，差异仅为观感（`GrowthValue` 仍保留为管理员可调旋钮）。
- 不做家长自建私有宠物/道具库；不做家长圈定候选宠物；不做旅程/宠物之外的独立「收藏」聚合（完成的旅程即收藏）。
- 不做任务模板库复用（模板随旅程定义）；不做星数目标作为完成条件（星数/连击保留为观感统计）。
- OSS 凭证轮转 / STS / RAM Role 为后续运维项，v1 用配置注入即可。

---

## 3. 领域模型

命名沿用 ABP 约定：领域标识用英文，展示文案用中文。所有聚合根继承 `FullAuditedAggregateRoot<Guid>`。

### 3.1 图鉴侧（全局，无 `ParentId`，受 `Homework.Catalog` 权限保护）

#### `PetSpecies`（聚合根）— 一只图鉴宠物
| 字段 | 类型 | 约束 / 说明 |
|---|---|---|
| Name | string | 必填，≤64，如「火龙」 |
| Code | string | 必填、全局唯一，稳定 slug（如 `dragon`），供前端映射 |
| CoverObjectKey | string | 形象照（封面）OSS key |
| AccentColor | string? | ≤16，UI 主题色（原型 `accent`） |
| Description | string? | ≤512 |
| IsActive | bool | 是否可被家庭选用，默认 false（草稿态，图与形态齐全后再启用） |
| DisplayOrder | int | 排序 |
| Forms | `PetForm[]` | **恰好 5 个**，owned 子实体 |

方法：`SetInfo(...)`、`Activate()`/`Deactivate()`（启用前校验 5 形态齐全 + 关键资源就绪）、`AddOrUpdateForm(level, ...)`。

#### `PetForm`（`PetSpecies` 的子实体，每个 species 恰好 5 个）
| 字段 | 类型 | 约束 / 说明 |
|---|---|---|
| Level | int | 1–5 |
| Name | string | 阶段名，如「龙蛋」「破壳萌龙」 |
| SpriteObjectKey | string | 该形态精灵图 OSS key |
| RevealText | string? | 进化过场文案（原型 `reveal`），可空 |
| GrowthToNext | int? | 进化到下一阶所需成长阈值；**Lv5 为 null** |
| EvolveVideoObjectKey | string? | 离开该形态时播放的进化动画 mp4；**Lv5 为 null** |
| Scale | decimal? | 前端渲染缩放提示（原型 `scale`） |

> 「4 段进化动画」= 形态 1–4 上的 `EvolveVideoObjectKey`，无需独立实体。

#### `RewardItem`（聚合根）— 奖励道具图鉴
| 字段 | 类型 | 约束 / 说明 |
|---|---|---|
| Name | string | 必填，≤64，如「星火书签」 |
| IconObjectKey | string? | 上传的道具图标 OSS key |
| Glyph | string? | ≤8，emoji 兜底（原型的 ✦💎🍎🍪） |
| GrowthValue | int | 喂养所给成长值，默认 12，必须 >0 |
| RandomWeight | int | 系统随机时的权重，默认 1，必须 ≥0 |
| IsActive | bool | 是否进入可选/随机池 |
| DisplayOrder | int | 排序 |

#### `Medal`（聚合根）— 勋章图鉴
| 字段 | 类型 | 约束 / 说明 |
|---|---|---|
| Name | string | 必填，≤64 |
| ImageObjectKey | string | 勋章图 OSS key |
| Description | string? | ≤512 |
| IsActive | bool | |
| DisplayOrder | int | |

### 3.2 家庭侧（`ParentId` 归属，消费图鉴）

#### `Journey`（聚合根，由 `FamilyGoal` 重塑）— **按孩子维度**
> 与旧 `FamilyGoal`（跨全部孩子汇总）的关键差异：Journey 收窄到**单个孩子**，因为它绑定该孩子养成的**一个**宠物。

| 字段 | 类型 | 约束 / 说明 |
|---|---|---|
| ParentId | Guid | 归属家长（私有 setter，所有权隔离） |
| ChildId | Guid | 该旅程属于哪个孩子 |
| Title | string | 必填，≤128，如「2026年暑假」 |
| Description | string? | ≤512 |
| StartDate / EndDate | DateOnly | `EndDate ≥ StartDate`；EndDate 为软目标 |
| MedalId | Guid | 完成时授予的勋章（引用图鉴） |
| Status | `JourneyStatus` | `Draft`(0) → `Active`(1) → `Completed`(2) |
| PetSpeciesId | Guid? | 孩子开始时所选宠物；`Draft` 阶段为 null |
| CurrentLevel | int | 1–5，内嵌宠物形态，默认 1 |
| GrowthPoints | int | 当前形态已累积成长值（朝 `GrowthToNext` 逼近） |
| Stages | `JourneyPetStage[]` | 开始时对 5 阶阈值的**快照**（见 §4.2） |
| Backpack | `JourneyBackpackItem[]` | 已获得未喂养的道具 `{RewardItemId, Quantity}` |
| CompletedTime | DateTime? | 进化到 Lv5 时置入 |

`JourneyPetStage`（子实体，快照）：`Level`、`GrowthToNext?`。
`JourneyBackpackItem`（子实体）：`RewardItemId`、`Quantity`。

聚合根方法（业务不变量集中在此）：
- `Start(petSpeciesId, IEnumerable<(int level,int? growthToNext)> stagesSnapshot)`：`Draft`→`Active`，写入所选 species + 阈值快照。
- `GrantReward(rewardItemId)`：`Active` 下背包对应道具 +1。
- `RevokeReward(rewardItemId)`：尽力回收——若该道具在背包中仍有未喂养单位则 -1；已喂养则不回滚成长（见 §4.4）。
- `Feed(rewardItemId, growthValue)`：`Active` 下背包对应道具 -1、`GrowthPoints += growthValue`，触发进化检查；返回 `FeedResult { Evolved, NewLevel, RevealText?, Completed }`。
- 内部 `TryEvolve()`：当 `GrowthPoints ≥ 当前阶.GrowthToNext` 且未满级 → `CurrentLevel++`、`GrowthPoints -= 阈值`（**进位保留余数**）；到 Lv5 → `Status=Completed`、`CompletedTime=now`。
- 满级/`Completed` 后 `Feed` 被拒（已完成不再喂养）。

#### 任务体系重挂到旅程下
- **`JourneyTaskTemplateItem`**（取代 child-global 的 `WeeklyTaskTemplateItem`）：
  `JourneyId, DayOfWeek, Title, Subject?, Order, EstimatedMinutes?, IsActive` **+ 奖励配置**：
  `RewardItemId?`（指定具体道具）**或** `RewardIsRandom`(bool，默认 true)。二者互斥：`RewardIsRandom=true` 时 `RewardItemId` 忽略。
- **`DailyTask`**（沿用并扩展）：新增 `JourneyId`、`RewardItemId`（**生成时解析**出的实际奖励，供前端提前展示）、
  `RewardGranted`(bool，防重复入包)。保留 `ChildId, Date, Title, Subject, Order, SourceTemplateItemId,
  IsCompleted, CompletedTime, ReviewState`。
- **`DailyScore` / 星数 / 连击**：保留为观感/参与度统计（现来源于旅程任务）。旧 `FamilyGoal.TargetStars/AchievedTime`
  的「达标即成就」逻辑**退役**——完成改由宠物满级驱动。

`ChildProfile.ActivePetId` 语义变更：重定义为「指向当前 `Active` 旅程所选 species 的冗余指针」，或直接删除、改由查询
当前 Active 旅程得到。倾向删除以避免双写不一致（迁移中处理）。

---

## 4. 成长循环（核心机制）

### 4.1 数据流

```
孩子完成 DailyTask ──▶ Journey.GrantReward(该任务 RewardItemId)  // 道具入背包，DailyTask.RewardGranted=true
孩子点「喂养」(选一个背包道具) ──▶ Journey.Feed(itemId, item.GrowthValue)
        GrowthPoints ≥ 当前阶.GrowthToNext ?
            └─ 是 ──▶ 进化：CurrentLevel++，GrowthPoints -= 阈值（保留余数），前端播放 EvolveVideo + RevealText
                          CurrentLevel == 5 ? ──▶ Status=Completed，授予 Medal + 宠物入永久收藏
```

### 4.2 阈值快照（为何需要）
旅程开始时把该 species 5 阶的 `GrowthToNext` 快照进 `Journey.Stages`。此后管理员即便调整图鉴阈值，也不会
回溯改写进行中宠物的经济曲线。**美术资源（图/视频）仍按 `PetSpeciesId` 实时读图鉴**（换图无副作用），只有阈值走快照。

### 4.3 完成与逾期（D5）
- 满级 = 成功，随时发勋章 + 宠物入收藏（收藏 = 该孩子的 `Completed` 旅程集合，每个含一只满级宠物 + 一枚勋章）。
- `EndDate` 过后仍未满级：旅程保持 `Active`、可继续，宠物停在当前阶，无惩罚、无自动关闭。

### 4.4 撤销与经济一致性（简化取舍）
奖励在任务 `Complete()` 时入背包（`RewardGranted` 幂等防重复）。家长 `Revoke()` 一个已完成任务时：
若对应奖励在背包中仍未喂养 → 回收 1 个；若已喂养 → **不回滚已产生的成长值**（保留审计友好、避免负数/降级复杂度）。
此简化在 spec 中显式记录为已知取舍。

### 4.5 单旅程约束（D7）
`JourneyManager.StartAsync` 校验该 `ChildId` 不存在其它 `Active` 旅程，否则抛领域异常（新错误码
`Homework:Journey.AlreadyHasActive`）。

---

## 5. 奖励解析（家长「指定或随机」）

- 家长在旅程模板项上二选一：指定 `RewardItemId`，或 `RewardIsRandom=true`（默认）。
- **解析时机 = 每日任务生成时**（孩子提前可见奖励，贴合原型任务卡上直接显示奖励名）。
- 随机 = 在所有 `IsActive` 的 `RewardItem` 上按 `RandomWeight` 加权抽取一个，写入该 `DailyTask.RewardItemId`。
- 随机需可复现性无要求；实现用注入的随机源，便于测试替身。

---

## 6. Blob 存储 / OSS / 资产分发

- 引入 `Volo.Abp.BlobStoring` + `Volo.Abp.BlobStoring.Aliyun`。配置项（appsettings/secrets）：
  `AccessKeyId`、`AccessKeySecret`、`Endpoint`、`Region`、`BucketName`。
- **容器（container）划分**：`pet-sprites`、`pet-videos`、`pet-covers`、`medal-images`、`reward-icons`。
- **上传**：管理员经 App Service 端点（ABP `IRemoteStreamContent` 模式）→ `IBlobContainer.SaveAsync` → 落 OSS；
  实体保存返回的 **object key**。上传校验类型/大小（图片、mp4）。
- **分发（D9 公有读 + CDN）**：Bucket 公有读并接 CDN。新增 `IAssetUrlResolver`：
  `string ToUrl(string container, string objectKey)` → 拼 `CDN_BaseUrl + / + container + / + objectKey`。
  所有对外 DTO 的图片/视频字段一律返回该 URL，**绝不返回裸 key**。分发策略（未来若改签名/代理）只动 resolver，
  实体、DTO、前端契约都不变。
- 领域层（`PetSpecies`/`Journey` 等）只知道 key 与 `IBlobContainer`，不知 OSS。
- **部署要点（AssetCdnBaseUrl）**：实体存的 object key 形如 `rewards/{id}.png`、`pets/{id}/cover.png`（不含前缀）。ABP BlobStoring 写入 OSS 时由 blob 名称计算器追加租户前缀——本项目多租户禁用（host 模式），前缀为 `host/`，故真实 OSS 对象路径为 `host/rewards/{id}.png`。ABP 逻辑容器名 `catalog` 被用作 **OSS Bucket 名**（`aliyun.ContainerName`），**不出现在对象路径中**。因此 `App:AssetCdnBaseUrl` 必须指向映射到 Bucket 根 + `host/` 的 CDN 源（例如 `https://<cdn>/host`），且**不要**包含 `/catalog`。上线前请先上传一个资产、在 OSS 控制台确认真实对象路径，再据此设定 base。

---

## 7. 权限与角色

- **新增权限组 `Homework.Catalog`**：`Homework.Catalog.Pets`、`Homework.Catalog.RewardItems`、`Homework.Catalog.Medals`
  （各含增删改）。授予平台管理员角色（可挂到 ABP 内置 `admin` 角色）。
- **家长**：旅程管理归于扩展后的 `Homework.ParentAdmin`（创建/编辑/删除 `Draft` 旅程、配置模板项与勋章、审核任务）。
- **孩子**：读取自己的 `Active` 旅程、开始旅程（选宠）、完成/取消任务、喂养、查看背包与收藏。沿用现有孩子端鉴权与
  `ParentId`/`ChildId` 所有权隔离（`ChildProfileManager` 既有模式）。
- 图鉴查询（家长/孩子选宠、看道具）走只读端点，不需 Catalog 管理权限。

---

## 8. 多租户

维持现状：图鉴 = 全局数据（无 `ParentId`，host/tenant-null），家庭数据 = `ParentId` 隔离。不引入实体级 `IMultiTenant`。

---

## 9. 应用层接口（App Services，概要）

**第一期（图鉴 + OSS）**
- `PetSpeciesAppService`（`Homework.Catalog.Pets`）：CRUD、`SetForm(level, …)`、`UploadCover/UploadSprite/UploadEvolveVideo`、`Activate/Deactivate`、只读 `GetActiveList`（供选宠）。
- `RewardItemAppService`（`Homework.Catalog.RewardItems`）：CRUD、`UploadIcon`、只读 `GetActiveList`。
- `MedalAppService`（`Homework.Catalog.Medals`）：CRUD、`UploadImage`、只读 `GetActiveList`。
- 所有返回 DTO 的资源字段经 `IAssetUrlResolver` 输出 URL。

**第二期（旅程 + 成长）**
- `JourneyAppService`（家长，`Homework.ParentAdmin`）：`Create(Draft)`、`Update`、`Delete`、`GetListByChild`、`Get`、
  模板项 CRUD（含奖励配置）、审核 `RevokeTask/RestoreTask`。
- `ChildJourneyAppService`（孩子）：`GetActive`、`Start(petSpeciesId)`、`GetDailyBoard(date)`、`CompleteTask/UncompleteTask`、
  `Feed(rewardItemId)`（返回 `FeedResultDto`：是否进化、新阶、`RevealText`、进化视频 URL、是否完成）、
  `GetBackpack`、`GetCollection`（`Completed` 旅程 = 满级宠物 + 勋章）。
- `DailyTaskGenerator` 调整：`EnsureDayAsync(childId, date)` 定位该孩子的 `Active` 旅程 → 按 `date.DayOfWeek` 取旅程模板项
  生成每日任务 → 逐项解析奖励（指定/加权随机）。`SettleDayAsync` 等结算逻辑沿用。

**第三期**：家长创建旅程前端 UX + 孩子端原型接真实 API（详见 §11）。

---

## 10. 迁移（D10：干净重塑）

- 新增图鉴表：`AppPetSpecies`、`AppPetForms`、`AppRewardItems`、`AppMedals`。
- `FamilyGoal` → `Journey`：drop 旧 `AppFamilyGoals` 重建为 `AppJourneys`（+ `AppJourneyPetStages`、`AppJourneyBackpackItems`）。
- `WeeklyTaskTemplateItem` → `JourneyTaskTemplateItem`：drop 重建 `AppJourneyTaskTemplateItems`（加 `JourneyId` + 奖励配置）。
- `DailyTask` 加列：`JourneyId`、`RewardItemId`、`RewardGranted`。
- `ChildProfile.ActivePetId`：删除列（改由查询 Active 旅程）。
- 索引：`Journey(ChildId, Status)`；`JourneyTaskTemplateItem(JourneyId, DayOfWeek)`；`DailyTask(JourneyId, Date)`；
  `PetSpecies.Code` 唯一；各图鉴 `(IsActive, DisplayOrder)`。
- 无生产数据保留需求，允许 drop 重建对应迁移。

---

## 11. 三期实施顺序（供 plan 拆分）

**第一期 — 图鉴 + OSS 基座**
- 接入 `Volo.Abp.BlobStoring.Aliyun` + `IAssetUrlResolver`。
- `PetSpecies/PetForm`、`RewardItem`、`Medal` 领域 + 迁移 + 管理端 App Service（含上传/下载 URL）+ 只读列表端点。
- 验收：管理员能创建一只宠物（封面 + 5 形态图 + 4 进化视频）并启用；能维护道具、勋章；只读端点返回可访问的 CDN URL。

**第二期 — 旅程 + 成长闭环**
- 重塑 `FamilyGoal`→`Journey`；重挂任务体系（`JourneyTaskTemplateItem` + `DailyTask.JourneyId`）；奖励解析（指定/随机）。
- `Journey.Start/Feed/GrantReward/TryEvolve/Complete` + `JourneyManager` 单旅程约束 + 阈值快照。
- `JourneyAppService`（家长）+ `ChildJourneyAppService`（孩子）。
- 验收：家长建 `Draft` 旅程并配任务与勋章 → 孩子开始并选宠 → 完成任务得道具 → 喂养成长 → 五阶进化 → 满级发勋章、入收藏；
  逾期不惩罚；同孩子第二个 `Active` 旅程被拒。

**第三期 — 家长创建旅程 UX + 孩子端接线**
- 家长端「创建旅程」向导式体验（命名 → 起止日期 → 周任务计划 + 每项奖励指定/随机 → 选勋章 → 预览发布）。
- 孩子端原型由硬编码切换为消费真实 API（选宠、每日看板、完成、喂养、进化过场、收藏/勋章墙）。
- 验收：家长可视化完成一次完整旅程创建；孩子端全流程走通真实数据。

---

## 12. 风险与未决

- **成长经济标定**：喂养 +GrowthValue 与各阶 `GrowthToNext` 阈值、旅程任务总量需匹配，否则出现「太快满级」或「养不满」。
  v1 将阈值/道具 GrowthValue 暴露为管理员旋钮，先跑通再按真实数据迭代标定。
- **随机奖励空池**：若无任何 `IsActive` 道具，随机解析需有兜底（跳过奖励或报错）——实现时定策略（建议：无奖励且记录告警）。
- **撤销经济一致性**：§4.4 的「已喂养不回滚」为显式简化，若后续要求严格一致再引入成长台账。
- **上传体积**：进化 mp4 可能数 MB，上传端点需配置合适的请求体大小上限与超时。
