# Phase 3A — 家长端旅程体验（修复 + 创建旅程）设计

- 日期：2026-07-11
- 状态：已定稿（待用户复核）
- 前置：Phase 1（图鉴 + OSS）、Phase 2（旅程 + 成长闭环）均已完成并合入本地 `main`。
- 技术栈（前端）：React 19 / Vite 6 / react-router 7 / @tanstack/react-query 5 / zustand 5 / axios / Radix + shadcn 风格 / Tailwind 4 / i18next / vitest。后端沿用 ABP 10.5 / .NET 10。
- 总设计规格：`specs/2026-07-10-child-journey-pet-backend-design.md`（本 slice 是其 §11 第三期的第一块）。

---

## 1. 背景与范围

`frontend/parent-web` 已是一个成熟的家长端 React SPA（登录/注册/找回密码、孩子档案、每日看板、账户资料均可用）。但 Phase 2 重塑了后端：`FamilyGoal` → `Journey`（按孩子、更丰富），`WeeklyTaskTemplateItem` → `JourneyTaskTemplateItem`（按旅程、含奖励配置），并新增宠物/道具/勋章图鉴。因此家长端的 **Goals（家庭目标）/ Schedule（周模板）/ Home** 三处调用了已删除的后端端点，**当前已打断**；且家长端**完全不知道**新的图鉴/旅程。

**本 slice（Phase 3A）范围：**
1. 把 `parent-web` 被 Phase 2 打断的功能接到新后端。
2. 信息架构归一为「旅程」区（`Journeys` 取代 `Schedule` + `Goals`）。
3. 新建「创建旅程」多步全页向导（诉求 5：体验要做好）。
4. 家长端只读消费图鉴（奖励道具、勋章、宠物）。
5. 后端加一个小的**开发数据种子**，让向导在无图鉴 admin UI 的情况下也立即可用。

**非目标（留给后续 slice）：**
- **Slice B（孩子端）**：孩子选宠、每日看板游玩、喂养/进化、收藏/勋章墙 —— 接 `JourneyPlayAppService`。
- **Slice C（图鉴管理后台）**：平台管理员创建宠物/道具/勋章（含 OSS 上传）。上线后取代本 slice 的开发种子。

---

## 2. 已定的关键决策

| # | 决策点 | 结论 |
|---|---|---|
| E1 | 本期目标 | 家长端：修复被打断的功能 + 创建旅程向导 + 只读消费图鉴。 |
| E2 | 信息架构 | **归一为「旅程」区**：`Journeys` 取代 `Schedule` + `Goals`；保留 `Children` + `Board`；`Home` 改为旅程为中心。 |
| E3 | 向导形式 | **多步全页向导**（route `/journeys/new`）：基本信息 → 周任务计划 → 选勋章 → 预览发布。 |
| E4 | 图鉴数据 | **加开发种子**：后端 seed 几条启用奖励道具（用 `Glyph` emoji，无需传图）+ 几枚勋章（仅名称），仅在图鉴为空时插入（幂等）。真实美术 + OSS 上传留给 Slice C。 |
| E5 | 选宠归属 | 向导**不**选宠物（spec D6：孩子在开始旅程时自选）。家长只规划任务 + 奖励 + 勋章。旅程列表在孩子开始后才展示宠物/等级。 |
| E6 | 旧页面 | 直接删除 `FamilyGoalsPage`/`GoalFormDialog`/`WeeklyTemplatePage`/`TemplateItemDialog` 及其 hook，不保留休眠。 |
| E7 | 孩子鉴权 | 沿用 Phase 2 决策：本期不做孩子登录；家长端一切走家长 Bearer + `ChildId`。 |

---

## 3. 后端 —— 开发数据种子

新增 `CatalogSampleDataSeedContributor : IDataSeedContributor, ITransientDependency`（`backend/src/Homework.Domain/Data/`）：

- **仅当对应图鉴为空**时插入（`RewardItem` 表为空 → 插样例道具；`Medal` 表为空 → 插样例勋章）。幂等，可重复运行。
- **奖励道具**（≥5 条，均 `IsActive=true`，用 `Glyph` emoji，`IconObjectKey=null`）：如「星火书签 ✦」「共鸣号角 ✦」「留存果实 🍎」「能量果实 🍎」「速算金币 💎」，`GrowthValue`/`RandomWeight` 取合理默认（12 / 1）。
- **勋章**（≥3 枚，`IsActive=true`，`ImageObjectKey=null`，仅 `Name`/`Description`）：如「暑期毕业勋章」「坚持之星」「探索者徽章」。
- **宠物不种**（家长向导不需要；孩子选宠是 Slice B）。
- 通过 `DbMigrator` 与测试的 `IDataSeeder.SeedAsync()` 生效（对标既有 `ParentPermissionDataSeedContributor`/`CatalogPermissionDataSeedContributor`）。
- 定位为**上线前开发便利**：Slice C 图鉴后台落地后可移除或保留（因「仅空时插入」不会覆盖真实数据）。
- 测试：`Homework.EntityFrameworkCore.Tests` 加一条集成测试——种子运行后 `RewardItem`/`Medal` 各有 ≥N 条 `IsActive`，再次运行不重复。

> 后端本 slice 只加这一个种子 + 其测试，不改动 Phase 2 的任何领域/应用代码。

---

## 4. parent-web —— 服务层与类型

沿用现有 `src/services/homeworkService.ts` + `src/types/homework.ts` + `src/hooks/use*.ts` 的模式（axios `api` 封装、`ListResult<T>` 解包、TanStack Query hooks、vitest 服务测试）。

**删除**：`family-goal` 与 `weekly-task-template` 的 service 方法、`FamilyGoalDto`/`CreateUpdateFamilyGoalDto`/`WeeklyTaskTemplateItemDto`/`Create/Update/GetWeeklyTemplateInput` 类型、`useGoals.ts`/`useWeeklyTemplates.ts`。

**新增端点与类型**（DateOnly 后端序列化为 `"YYYY-MM-DD"` 字符串）：

**Journey（`JourneyAppService` → `/api/app/journey`）**
| 方法 | HTTP | 路径 | 入参 | 出参 |
|---|---|---|---|---|
| `listJourneys(childId)` | GET | `/api/app/journey?ChildId={id}` | — | `JourneyDto[]` |
| `getJourney(id)` | GET | `/api/app/journey/{id}` | — | `JourneyDto` |
| `createJourney(dto)` | POST | `/api/app/journey` | `CreateJourneyDto` | `JourneyDto` |
| `updateJourney(id,dto)` | PUT | `/api/app/journey/{id}` | `UpdateJourneyDto` | `JourneyDto` |
| `deleteJourney(id)` | DELETE | `/api/app/journey/{id}` | — | — |

```ts
type JourneyStatus = 0 | 1 | 2 // Draft | Active | Completed
interface JourneyDto {
  id: string; childId: string; title: string; description?: string;
  startDate: string; endDate: string; medalId: string;
  status: JourneyStatus; petSpeciesId?: string | null;
  currentLevel: number; growthPoints: number; completedTime?: string | null;
}
interface CreateJourneyDto { childId: string; title: string; description?: string; startDate: string; endDate: string; medalId: string }
interface UpdateJourneyDto { title: string; description?: string; startDate: string; endDate: string; medalId: string }
```

**Journey 模板（`JourneyTaskTemplateAppService` → `/api/app/journey-task-template`）**
| 方法 | HTTP | 路径 | 入参 | 出参 |
|---|---|---|---|---|
| `listJourneyTemplates(input)` | GET | `/api/app/journey-task-template?JourneyId={id}[&DayOfWeek=n]` | `GetJourneyTemplateInput` | `JourneyTaskTemplateItemDto[]` |
| `createJourneyTemplate(dto)` | POST | `/api/app/journey-task-template` | `CreateJourneyTaskTemplateItemDto` | `JourneyTaskTemplateItemDto` |
| `updateJourneyTemplate(id,dto)` | PUT | `/api/app/journey-task-template/{id}` | `UpdateJourneyTaskTemplateItemDto` | `JourneyTaskTemplateItemDto` |
| `deleteJourneyTemplate(id)` | DELETE | `/api/app/journey-task-template/{id}` | — | — |

```ts
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Sun..Sat
interface JourneyTaskTemplateItemDto {
  id: string; journeyId: string; dayOfWeek: DayOfWeek; title: string;
  subject?: string; order: number; estimatedMinutes?: number | null;
  isActive: boolean; rewardItemId?: string | null; rewardIsRandom: boolean;
}
interface CreateJourneyTaskTemplateItemDto { journeyId: string; dayOfWeek: DayOfWeek; title: string; subject?: string; order: number; estimatedMinutes?: number | null; rewardItemId?: string | null; rewardIsRandom: boolean }
interface UpdateJourneyTaskTemplateItemDto { title: string; subject?: string; order: number; estimatedMinutes?: number | null; isActive: boolean; rewardItemId?: string | null; rewardIsRandom: boolean }
interface GetJourneyTemplateInput { journeyId: string; dayOfWeek?: DayOfWeek }
```

**图鉴只读（active-list）**
| 方法 | HTTP | 路径 | 出参 |
|---|---|---|---|
| `listActiveRewardItems()` | GET | `/api/app/reward-item/active-list` | `RewardItemDto[]` |
| `listActiveMedals()` | GET | `/api/app/medal/active-list` | `MedalDto[]` |
| `listActivePetSpecies()` | GET | `/api/app/pet-species/active-list` | `PetSpeciesDto[]` |

```ts
interface RewardItemDto { id: string; name: string; iconUrl?: string | null; glyph?: string | null; growthValue: number; randomWeight: number; isActive: boolean; displayOrder: number }
interface MedalDto { id: string; name: string; description?: string | null; imageUrl?: string | null; isActive: boolean; displayOrder: number }
interface PetFormDto { level: number; name: string; spriteUrl?: string | null; revealText?: string | null; growthToNext?: number | null; evolveVideoUrl?: string | null; scale?: number | null }
interface PetSpeciesDto { id: string; name: string; code: string; coverUrl?: string | null; accentColor?: string | null; description?: string | null; isActive: boolean; displayOrder: number; forms: PetFormDto[] }
```

`DailyTaskDto` 补 3 字段（Phase 2 已加）：`journeyId`、`rewardItemId?`、`rewardGranted`。`daily-task/board` 端点不变、仍可用。

**Hooks**（TanStack Query，对标现有）：`useJourneys(childId)` + `useJourneyMutations()`；`useJourneyTemplates(journeyId)` + `useJourneyTemplateMutations()`；`useActiveRewardItems()`/`useActiveMedals()`/`useActivePetSpecies()`（长缓存的只读查询）。删除 `useGoals`/`useWeeklyTemplates`。

---

## 5. parent-web —— 信息架构与页面

**导航（`AppLayout` nav）**：`Home · Children · Board · Journeys`（`Journeys` 取代 `Schedule` + `Goals`）。

**路由（`App.tsx`）**：删除 `/schedule`、`/goals`；新增 `/journeys`（列表）、`/journeys/new`（向导）、`/journeys/:id/edit`（编辑草稿，可复用向导）。保留 `/home`、`/children`、`/board`。

**JourneysPage（`/journeys`）**
- 顶部孩子选择器（复用 `useChildren`）。
- 列出所选孩子的旅程，按 `status` 分组/加徽章：
  - `Draft`：可编辑/删除；「宠物待孩子选择」。
  - `Active`：展示所选宠物（读 `petSpeciesId` → `pet-species/active-list` 取 name/coverUrl）+ `Lv{currentLevel}` + 成长值；旅程期限。
  - `Completed`：展示勋章（`medalId` → medal 名/图）+ 完成时间 + 满级宠物。
- 「创建旅程」按钮 → `/journeys/new?childId={selected}`。

**JourneyWizard（`/journeys/new`，多步全页）** —— 客户端收集，末步一次提交（详见 §6）。
1. **基本信息**：`title`、`description`、`startDate`/`endDate`（校验 `endDate >= startDate`）。
2. **周任务计划**：7 天布局（Tabs 或按日分区）；每天可加多条任务：`title`、`subject`、`estimatedMinutes`、`order`；每条任务配**奖励**——单选「指定道具」（从 `useActiveRewardItems` 选一个，展示 glyph/icon + 名称）或「随机」（`rewardIsRandom=true`，默认）。
3. **选勋章**：从 `useActiveMedals` 选一枚（**必填**——后端 `CreateJourneyDto.medalId` 必填）。
4. **预览发布**：汇总（名称/期限/各天任务与奖励/勋章）→ 提交。

**JourneyEditPage（`/journeys/:id/edit`）**：对 `Draft` 旅程**复用同一个向导组件**（预填已有基本信息/模板/勋章；提交走 `updateJourney` + 模板端点的增删改，而非新建）。`Active`/`Completed` 旅程为**只读详情**（不进向导）。

**HomePage**：改为旅程为中心——按孩子展示其 `Active` 旅程摘要（宠物/等级/成长）+ 今日看板要点（读 `daily-task/board`）；无 `Active` 旅程则提示「去创建旅程」。移除家庭目标聚合。

**Board（`/board`）**：改动最小——继续用 `daily-task` 端点；可选：任务卡上展示奖励 glyph（读 `DailyTaskDto.rewardItemId` → 道具）。

**删除**：`features/goals/**`、`features/schedule/**`、对应 hook 与 i18n 键（同时补「旅程」相关新文案，en + zh-CN 两套 `public/locales`）。

---

## 6. 向导提交编排

末步「发布」时（收集在客户端 state，避免中途产生半成品）：
1. `POST /journey`（`CreateJourneyDto`，含 `medalId`）→ 得到 `journeyId`（`status=Draft`）。
2. 对第 2 步规划的每条任务：`POST /journey-task-template`（`journeyId` + `dayOfWeek` + 任务字段 + 奖励配置）。
3. 全部成功 → toast 成功、跳回 `/journeys`。
4. **部分失败**（模板 POST 报错）：旅程已作为 `Draft` 存在，路由到 `/journeys/:id/edit` 让家长补齐重试（不丢工作）。
5. 无「发布」独立状态：向导产出的是一个 `Draft` 旅程；孩子之后在 Slice B 里开始它（选宠）使其变 `Active`。

---

## 7. 鉴权 / 错误 / 测试

- **鉴权**：家长 Bearer（现有 `api.ts` 拦截器 + refresh）。`journey`/`journey-task-template` 走 `[Authorize(ParentAdmin)]`；catalog `active-list` 仅需登录。无需改动 auth。
- **错误处理**：沿用 `getErrorMessage` + `sonner` toast + 表单内联校验；向导每步「下一步」做本地校验。
- **测试（vitest）**：
  - 服务层：mock `api`，断言每个新方法的路径 + DTO 形状（对标 `homeworkService.test.ts`）。
  - Hooks：TanStack Query hook 的 loading/error/data + mutation 失效刷新。
  - 向导：各步校验（日期、必填勋章、随机/指定奖励切换）、提交编排（journey 先建、模板后建、部分失败路由）。
  - 后端：种子集成测试（§3）。

---

## 8. 后续 slice（不在本 slice 内）

- **Slice B（孩子端）**：`child-web-prototype` 接真实 API——选宠开始旅程、每日看板游玩、完成任务、喂养/进化过场、背包、收藏/勋章墙（`JourneyPlayAppService`）。孩子无独立登录 → 跑在家长会话下选定孩子。
- **Slice C（图鉴管理后台）**：平台管理员 CRUD 宠物（5 形态 + 封面 + 4 进化视频）/ 奖励道具 / 勋章，含 OSS 上传；取代本 slice 的开发种子。

---

## 9. 风险与未决

- **DateOnly 序列化**：确认 ABP 把 `DateOnly` 序列化为 `"YYYY-MM-DD"`；前端日期用 string，提交时按此格式发送（现有 FamilyGoal 已如此处理，沿用）。
- **旅程列表展示宠物**：`Active` 旅程的宠物信息需 `pet-species/active-list` join；若该 species 被管理员停用/删除，做优雅兜底（显示占位）。
- **种子与生产**：`CatalogSampleDataSeedContributor` 仅空表时插入；Slice C 上线后可移除。上线前需确认不会把样例道具/勋章带入正式环境（或加环境开关）。
- **i18n**：删旧「家庭目标/周模板」文案、加「旅程/创建旅程/奖励/勋章/宠物」文案，en 与 zh-CN 两套同步。
