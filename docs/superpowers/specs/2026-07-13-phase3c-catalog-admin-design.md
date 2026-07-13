# Phase 3C — 图鉴管理后台设计

- 日期：2026-07-13
- 状态：已定稿（待用户复核）
- 前置：Phase 1（图鉴 + OSS，后端 CRUD/上传/权限全备）、Phase 2（旅程 + 成长闭环）、Phase 3A（家长端旅程体验）均已完成并合入本地 `main`（HEAD `7443470`）。
- 技术栈（前端）：React 19 / Vite 6 / react-router 7 / @tanstack/react-query 5 / zustand 5 / axios / Radix + shadcn 风格 / Tailwind 4 / i18next / vitest。后端 ABP 10.5 / .NET 10（**本 slice 不改后端**）。
- 总设计规格：`specs/2026-07-10-child-journey-pet-backend-design.md`（本 slice 是其 §11 第三期的 Slice C）。

---

## 1. 背景与范围

第一期已交付三套**全局图鉴**（宠物 `PetSpecies` + 5 形态 / 奖励道具 `RewardItem` / 勋章 `Medal`）的后端：完整 CRUD、OSS 上传、启停、`Homework.Catalog.*` 权限（授予内置 `admin` 角色）。Slice A 让家长端**只读**消费启用项（`active-list`）并用开发种子 `CatalogSampleDataSeedContributor` 兜底。但至今**没有任何可视化界面**让管理员维护图鉴——要加真实道具/勋章/宠物只能改种子或手调 API。

**本 slice（Phase 3C）范围：**
1. 在 `parent-web` 内新增 **admin 权限门控的「图鉴管理」后台**。
2. 三套图鉴的**全量** CRUD + 上传 + 启停接线（后端已存在，本 slice 是前端 + 少量接线）。
3. 宠物走**两段式**编辑（先建物种 → 详情页填 5 形态 + 上传封面/精灵图/进化视频 → 完整度校验 → 启用）。
4. 落地后取代 Slice A 开发种子的地位（种子**保留**，因"仅空表插入"不与真实数据冲突）。

**非目标（YAGNI）：**
- 不改后端（除非计划阶段发现上传 HTTP 绑定需微调，见 §12）。
- 不做宠物进化动画播放器（详情页只展示上传的视频文件名/封面缩略，不内嵌播放特效）。
- 不做批量导入/导出。
- 不拆独立 admin 应用（家长与管理员暂共用 `parent-web`，靠权限门控隔离；未来可拆，非本期）。

---

## 2. 已定的关键决策

| # | 决策点 | 结论 |
|---|---|---|
| G1 | 后台位置 | 在 `parent-web` 内，**admin 权限门控**;家长永不可见。后端不改。 |
| G2 | 范围拆分 | **一个 slice 三套一起**（道具 + 勋章 + 宠物）。 |
| G3 | 门控机制 | `authStore` 登录后取 ABP `grantedPolicies`,`hasPermission()` 驱动 nav/tab 显隐;后端 `[Authorize(具体权限)]` 强制。 |
| G4 | IA | nav 增「图鉴管理」→ `/catalog`（按权限的 `道具 \| 勋章 \| 宠物` tab 页）;宠物详情编辑独立路由 `/catalog/pets/:id`。 |
| G5 | 道具/勋章编辑 | 单弹窗 CRUD（字段 + `IsActive` 勾选）;图标/图片上传在**编辑态**（上传需 id）。 |
| G6 | 宠物编辑 | **两段式**:创建 dialog（基础字段）→ 详情页（5 形态 + 上传 + 完整度 + 启停）。 |
| G7 | 种子 | **保留** `CatalogSampleDataSeedContributor`（仅空表插入);上线前评估 Development-only(见 §10)。 |
| G8 | 上传 | `multipart/form-data` 单文件;选文件即传;成功刷新实体显示新资源。 |

---

## 3. 鉴权与门控

**现有资产**：`authService.getApplicationConfiguration()` 已存在（`GET /api/abp/application-configuration` → `data.auth.grantedPolicies`，形如 `{ "Homework.Catalog.Pets": true, ... }`）。当前 `authStore` **尚未**调用它。

**本 slice 加：**
- `authStore` 在 `initialize()` 与登录成功后调 `getApplicationConfiguration()`,把 `grantedPolicies` 存入 store;登出清空。失败（如网络）时视为无权限（空对象），不阻断家长功能。
- store 暴露 `hasPermission(name: string): boolean`（`grantedPolicies[name] === true`）。
- 权限常量集中一处（`src/lib/permissions.ts` 或 `types`）：
  ```ts
  export const CatalogPermissions = {
    Pets: 'Homework.Catalog.Pets',
    RewardItems: 'Homework.Catalog.RewardItems',
    Medals: 'Homework.Catalog.Medals',
  } as const
  ```
- `hasAnyCatalog = hasPermission(Pets) || hasPermission(RewardItems) || hasPermission(Medals)`。
- **门控只是 UX**（隐藏/禁用不可用项）;真正强制在后端。前端调到无权限接口会 403 → `getErrorMessage` 友好提示（不应发生，因已门控）。

---

## 4. 后端契约参考（本 slice 消费,不改）

权限（`HomeworkPermissions.Catalog`,授予 `admin` 角色）：`Homework.Catalog.Pets` / `.RewardItems` / `.Medals`。类均 `[Authorize]`,写操作与全量列表方法额外 `[Authorize(具体权限)]`;`active-list` 仅需登录。

**奖励道具** `RewardItemAppService` → `/api/app/reward-item`

| 方法 | HTTP | 路径 | Body | 权限 |
|---|---|---|---|---|
| GetList | GET | `/api/app/reward-item` | — | RewardItems |
| GetActiveList | GET | `/api/app/reward-item/active-list` | — | 登录 |
| Get | GET | `/api/app/reward-item/{id}` | — | RewardItems |
| Create | POST | `/api/app/reward-item` | `CreateUpdateRewardItemDto` | RewardItems |
| Update | PUT | `/api/app/reward-item/{id}` | `CreateUpdateRewardItemDto` | RewardItems |
| Delete | DELETE | `/api/app/reward-item/{id}` | — | RewardItems |
| UploadIcon | POST | `/api/app/reward-item/{id}/upload-icon` | multipart 单文件 | RewardItems |

**勋章** `MedalAppService` → `/api/app/medal`：同构（`CreateUpdateMedalDto`;上传 `POST /api/app/medal/{id}/upload-image`;权限 `Medals`）。

**宠物** `PetSpeciesAppService` → `/api/app/pet-species`（权限 `Pets`）

| 方法 | HTTP | 路径（推断,§12 待核实） | Body/参数 |
|---|---|---|---|
| GetList | GET | `/api/app/pet-species` | — |
| GetActiveList | GET | `/api/app/pet-species/active-list` | — |
| Get | GET | `/api/app/pet-species/{id}` | — |
| Create | POST | `/api/app/pet-species` | `CreateUpdatePetSpeciesDto` |
| Update | PUT | `/api/app/pet-species/{id}` | `CreateUpdatePetSpeciesDto` |
| Delete | DELETE | `/api/app/pet-species/{id}` | — |
| SetForm | POST | `/api/app/pet-species/{id}/set-form` | `SetPetFormDto` |
| UploadCover | POST | `/api/app/pet-species/{id}/upload-cover` | multipart 单文件 |
| UploadFormSprite | POST | `/api/app/pet-species/{id}/upload-form-sprite?level={n}` | multipart 单文件 |
| UploadFormEvolveVideo | POST | `/api/app/pet-species/{id}/upload-form-evolve-video?level={n}` | multipart 单文件 |
| Activate | POST | `/api/app/pet-species/{id}/activate` | — |
| Deactivate | POST | `/api/app/pet-species/{id}/deactivate` | — |

**写入 DTO（后端定义,前端镜像为 TS）：**
- `CreateUpdateRewardItemDto { Name(≤64,必填); Glyph?(≤8); GrowthValue(≥1,默认12); RandomWeight(≥0,默认1); DisplayOrder; IsActive }`
- `CreateUpdateMedalDto { Name(≤64,必填); Description?(≤512); DisplayOrder; IsActive }`
- `CreateUpdatePetSpeciesDto { Name(≤64,必填); Code(≤64,必填); AccentColor?(≤16); Description?(≤512); DisplayOrder }`（注意：Create 不含 IsActive,宠物启停走独立接口）
- `SetPetFormDto { Level(1..5); Name(≤64,必填); RevealText?(≤128); GrowthToNext?; Scale? }`

**领域不变量（前端需配合）：** `PetSpecies.Activate()` 要求封面 + 5 形态齐全（每形态有精灵图）才允许启用,否则抛业务异常。`RewardItem`/`Medal` 的 `IsActive` 直接由 Create/Update DTO 设定（无独立启停接口）。

---

## 5. parent-web —— 服务层与类型

沿用现有 `homeworkService.ts` + `types/homework.ts` + `use*.ts` 模式。

**新增写入 DTO 类型（`types/homework.ts`）：**
```ts
export interface CreateUpdateRewardItemDto { name: string; glyph?: string | null; growthValue: number; randomWeight: number; displayOrder: number; isActive: boolean }
export interface CreateUpdateMedalDto { name: string; description?: string | null; displayOrder: number; isActive: boolean }
export interface CreateUpdatePetSpeciesDto { name: string; code: string; accentColor?: string | null; description?: string | null; displayOrder: number }
export type PetFormLevel = 1 | 2 | 3 | 4 | 5
export interface SetPetFormDto { level: PetFormLevel; name: string; revealText?: string | null; growthToNext?: number | null; scale?: number | null }
```
（复用已有只读 `RewardItemDto` / `MedalDto` / `PetSpeciesDto` / `PetFormDto`。）

**新增 service 方法（`homeworkService.ts`）：**
- 道具：`listAllRewardItems()`（`GET /reward-item`,全量）、`createRewardItem` / `updateRewardItem` / `deleteRewardItem` / `uploadRewardItemIcon(id, file)`。
- 勋章：`listAllMedals()`、`createMedal` / `updateMedal` / `deleteMedal` / `uploadMedalImage(id, file)`。
- 宠物：`listAllPetSpecies()`、`getPetSpecies(id)`、`createPetSpecies` / `updatePetSpecies` / `deletePetSpecies` / `setPetForm(id, dto)` / `uploadPetCover(id, file)` / `uploadPetFormSprite(id, level, file)` / `uploadPetFormEvolveVideo(id, level, file)` / `activatePetSpecies(id)` / `deactivatePetSpecies(id)`。
- 门控：`getApplicationConfiguration()` 已在 `authService`,复用。

**上传编排（关键 gotcha）：** 共享一个 `uploadFile(url, file)` 帮手，用 `FormData` 单文件字段（字段名 `file`,§12 待核实）。**现有 `api` 实例默认头 `Content-Type: application/json` 会破坏 multipart**;上传调用必须让浏览器自带 boundary：
```ts
function uploadFile<T>(url: string, file: File): Promise<T> {
  const fd = new FormData(); fd.append('file', file)
  return api.post<T>(url, fd, { headers: { 'Content-Type': undefined as unknown as string } }).then((r) => r.data)
}
```
（把 `Content-Type` 置 `undefined`,axios + 浏览器会设 `multipart/form-data; boundary=…`。）

**Hooks（`use*.ts`）：** `useAdminRewardItems()` / `useAdminMedals()` / `useAdminPetSpecies()` + 各自 mutations（含上传）;`usePetSpecies(id)`（详情）;失效刷新对应列表/详情 key。均沿用 `getErrorMessage` + `sonner`。

---

## 6. parent-web —— 信息架构与页面

**导航（`AppLayout`）：** 在现有 4 项后追加 `图鉴管理`（图标 `Boxes`/`Package`,`key: nav.catalog`,`to: /catalog`),**仅 `hasAnyCatalog` 为真时渲染**。

**路由（`App.tsx`）：** 新增 `/catalog`（tab 页）、`/catalog/pets/:id`（宠物详情）。保留其余。可加一个 `<RequireCatalog>` 包装（无权限 → 重定向 `/home`),防手输 URL。

**CatalogPage（`/catalog`）：** 顶部 tab `道具 | 勋章 | 宠物`,**只渲染有权限的 tab**;默认选第一个可用 tab。

**道具 Tab（`RewardItemsPanel`）：**
- 全量列表（表格或卡片）：Glyph/图标、名称、成长值、随机权重、排序、启用徽章。
- 「新建」→ 创建 dialog（名称 / Glyph / 成长值 / 随机权重 / 排序 / 启用勾选）→ `createRewardItem`。
- 行「编辑」→ 编辑 dialog（同字段 + **图标上传区**,因 id 已存在）→ `updateRewardItem` / `uploadRewardItemIcon`。
- 行「删除」→ `useConfirm` → `deleteRewardItem`。

**勋章 Tab（`MedalsPanel`）：** 同构（名称 / 描述 / 排序 / 启用;编辑态可传图片）。

**宠物 Tab（`PetSpeciesPanel`）：**
- 全量列表：封面缩略、名称、Code、排序、**完整度**（如 `3/5 形态`）、启用徽章。
- 「新建」→ 创建 dialog（名称 / Code / 强调色 / 描述 / 排序）→ `createPetSpecies` → 成功后跳 `/catalog/pets/{id}`。
- 行「编辑」→ 跳 `/catalog/pets/{id}`;行「启用/停用」（启用按钮在未完整时禁用 + 提示);行「删除」。

**PetSpeciesEditPage（`/catalog/pets/:id`）：**
- **基础信息卡**：名称 / Code / 强调色 / 描述 / 排序 → `updatePetSpecies`;封面上传区（预览）。
- **5 个形态区（Level 1–5）**，每区：
  - 元数据表单：名称 / 揭示文案 / 成长阈值 `GrowthToNext` / 缩放 `Scale` → `setPetForm`。
  - 精灵图上传（预览缩略）→ `uploadPetFormSprite(level)`。
  - 进化视频上传（Level 1–4，展示"进化到 Lv{n+1}"的视频文件名/状态）→ `uploadPetFormEvolveVideo(level)`。
- **完整度指示条**：封面 ✓/✗ + 每形态精灵 ✓/✗;列出缺失项。
- **启用/停用按钮**：完整时启用可点 → `activatePetSpecies`;不完整时禁用 + tooltip「需封面 + 5 形态精灵图」;后端不变量兜底（若仍失败,`getErrorMessage` 展示）。

**i18n**：新增 `nav.catalog` + `catalog.*`（tab 名、字段标签、上传、完整度、启用提示、删除确认等）两套 `zh-CN` + `en`,键集一致。

---

## 7. 上传 UX

- 每个上传区：`<input type="file">`（图片 `accept="image/*"`,视频 `accept="video/*"`)+ 「上传」或选中即传。
- 上传中：按钮/区禁用 + spinner + 文件名;成功后刷新该实体 query,显示新封面/精灵**图片预览**或视频**文件名 + ✓**。
- 失败：`getErrorMessage` toast（含体积超限等）。
- 大视频提示：区旁小字「进化视频建议 < N MB」（N 与后端上限对齐,见 §12 / NEXT-STEPS §0）。

---

## 8. 宠物完整度与激活

- 完整度 = 封面已传 && 每个 Level 1–5 都有精灵图（由详情 DTO 的 `coverUrl` 与各 `forms[].spriteUrl` 判定;进化视频**不计入**启用前提,与后端不变量一致）。
- 「启用」按钮：完整才 enabled;禁用态 tooltip 说明缺什么。
- 点击 → `activatePetSpecies(id)`;若后端仍抛（竞态/校验差异）→ toast 错误、不改本地状态。
- 「停用」始终可点 → `deactivatePetSpecies(id)`。

---

## 9. 鉴权 / 错误 / 测试

- **鉴权**：家长 Bearer + `grantedPolicies` 门控;后端各接口 `[Authorize(具体权限)]`。
- **错误**：`getErrorMessage` + `sonner`;dialog 内联校验（必填、数值范围对齐 DTO 注解）。
- **测试（vitest）**：
  - 服务层：mock `api`,断言每方法路径 + DTO 形状;上传断言 `FormData` + `Content-Type` 覆盖。
  - Hooks：列表/详情 loading/error/data + mutation 失效刷新。
  - 门控：`hasPermission` 逻辑;`AppLayout` nav 与 `CatalogPage` tab 按权限显隐（mock store 三种权限组合）。
  - 道具/勋章 Panel：创建/编辑校验、上传编排、删除确认。
  - 宠物详情页：完整度计算 → 启用按钮禁用/可点;`setPetForm`/各上传调用参数（level 走 query）。
- **i18n 键一致性**：复用 Slice A 的 `locales.test.ts`（新键纳入,双语同步）。

---

## 10. 种子处理

`CatalogSampleDataSeedContributor`（Slice A 加）**保留**：仅当图鉴表为空时插入,管理员用本后台建了真实数据后不再触发,不覆盖。**上线正式环境前**评估是否收紧为 `Development`-only（连同既有 `ChildrenDataSeedContributor` 的 demo 账号 + 硬编码密码）—— 记入 NEXT-STEPS，非本 slice 阻塞项。

---

## 11. 非目标（重申）

- 后端不改（除 §12 上传绑定若需微调）。
- 无宠物进化动画播放器、无批量导入、不拆独立 admin 应用。

---

## 12. 风险与未决

1. **上传 HTTP 契约（最高优先,计划阶段先核实）**：ABP 把 `UploadIconAsync(Guid id, IRemoteStreamContent file)` 映射的**确切**路径、multipart **字段名**（推断 `file`）、`level` int 参数走 query 还是 route，需用 **Swagger（`https://localhost:44394/swagger`,admin 登录）实测**后再敲定 `homeworkService` 的 URL 与 `FormData` 键;若 ABP 绑定不接受纯 `IRemoteStreamContent`,可能需后端加一个显式 upload input 包装（小改,列为待评估）。
2. **请求体大小上限**：进化 mp4 可能数 MB,后端需配置 `MaxRequestBodySize`/超时（NEXT-STEPS §0 已记）;前端上传失败给友好提示。
3. **部分权限管理员**：只授某一两个 `Catalog.*` 的 admin,tab 与操作按具体权限裁剪（`hasAnyCatalog` 决定 nav,单权限决定 tab）。
4. **孤儿 OSS 对象**：换扩展名重传时旧对象成孤儿（第一期已记技术债);本 slice 不处理。
5. **admin 账号**：ABP 默认 `admin` / `1q2w3E*` 已有 Catalog 权限;正式上线前改密（部署项）。

---

## 13. 后续

- Slice B（孩子端接线）仍未做,与本 slice 独立,见 NEXT-STEPS §2.3。
- 本 slice 落地后，Slice A 开发种子从"必需"降为"新库便利"，可按 §10 评估收紧。
