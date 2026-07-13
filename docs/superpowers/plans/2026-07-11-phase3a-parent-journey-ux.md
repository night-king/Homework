# Phase 3A — 家长端旅程体验(修复 + 创建旅程)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `frontend/parent-web` 接上 Phase 2 重塑后的后端——归一「旅程」区、提供多步创建旅程向导、只读消费图鉴——并加一个开发数据种子让向导即刻可用。

**Architecture:** 后端只加一个幂等 `IDataSeedContributor`(空表才插样例道具/勋章),不动 Phase 2 领域/应用代码。前端沿用既有分层(axios `api` 封装 → `homeworkService` → TanStack Query `use*` hooks → 页面/组件),先**增量**加入新服务/类型/hook/页面,再切换导航与首页,**最后**统一删除被 Phase 2 打断的 Goals/Schedule 代码,保证每步 build 绿。向导为纯展示步骤组件 + 一个编排器 + 一个可单测的提交模块(create / edit-diff / 部分失败)。

**Tech Stack:** 后端 ABP 10.5 / .NET 10 / EF Core(测试 SQLite in-memory)/ xUnit + Shouldly。前端 React 19 / Vite 6 / react-router-dom 7 / @tanstack/react-query 5 / axios / Tailwind 4 / i18next / vitest 3 + @testing-library/react 16(`globals: true`, `environment: jsdom`, alias `@` → `src`)。

## Global Constraints

- **提交规范**:Conventional Commits;后端 scope 用 `catalog`,前端用 `parent-web`。每个 commit message 末尾追加一行(空行后):
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **分支**:在新分支 `feature/parent-journey-ux` 上实现(不要直接提交 `main`)。
- **DateOnly 契约**:后端把 `DateOnly` 序列化为 `"YYYY-MM-DD"` 字符串;前端日期一律用该格式的 `string`,提交时原样发送(与既有 FamilyGoal 处理一致)。字符串按字典序比较即等价于日期比较。
- **查询参数**:ABP 模型绑定大小写不敏感;沿用既有风格传小写驼峰(`{ childId }`、`{ journeyId, dayOfWeek }`),与 `getDailyBoard` 一致。
- **图鉴只读**:家长端**只**消费 `active-list`,不做图鉴写操作(留 Slice C)。
- **鉴权**:不改动 auth;`journey`/`journey-task-template` 走家长 Bearer,catalog `active-list` 仅需登录。既有 `api.ts` 拦截器 + refresh 已足够。
- **测试文件命名**:含 JSX 的测试用 `.test.tsx`,纯逻辑用 `.test.ts`。
- **不破坏既有绿**:后端当前 Domain 56 + EFCore 58 全绿;前端既有 vitest 全绿。每个任务结束时对应测试必须绿,且不得引入 `tsc -b` 编译错误。

---

## File Structure

**后端(新增 2 个文件)**
- `backend/src/Homework.Domain/Data/CatalogSampleDataSeedContributor.cs` — 幂等图鉴种子。
- `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/CatalogSampleDataSeed_Tests.cs` — 种子集成测试。

**前端 parent-web**
- `src/types/homework.ts` — 增 Journey / JourneyTaskTemplate / Catalog 类型,扩 `DailyTaskDto`;末期删旧类型。
- `src/services/homeworkService.ts` — 增 journey / journey-task-template / catalog active-list 方法;末期删旧方法。
- `src/services/homeworkService.test.ts` — 增新方法用例。
- `src/hooks/useJourneys.ts`、`src/hooks/useJourneyTemplates.ts`、`src/hooks/useCatalog.ts`(新增);末期删 `useGoals.ts`、`useWeeklyTemplates.ts`。
- `src/hooks/useJourneys.test.tsx`(新增,代表性 hook 测试)。
- `src/features/journeys/JourneysPage.tsx`、`JourneyNewPage.tsx`、`JourneyEditPage.tsx`(新增)。
- `src/features/journeys/wizard/wizardTypes.ts`、`submitJourney.ts`、`JourneyWizard.tsx`、`StepBasics.tsx`、`StepTasks.tsx`、`StepMedal.tsx`、`StepReview.tsx`(新增)+ 各自测试。
- `src/features/home/HomePage.tsx` — 改为旅程为中心。
- `src/App.tsx`、`src/components/layout/AppLayout.tsx` — 路由与导航切换。
- `public/locales/zh-CN/translation.json`、`public/locales/en/translation.json` — 增旅程/向导文案;末期删旧键。
- `src/i18n/locales.test.ts`(新增,双语键一致性)。
- **删除**:`src/features/goals/**`、`src/features/schedule/**`、`src/hooks/useGoals.ts`、`src/hooks/useWeeklyTemplates.ts`。

---

## Task 1: 后端图鉴开发种子(`CatalogSampleDataSeedContributor`)

**Files:**
- Create: `backend/src/Homework.Domain/Data/CatalogSampleDataSeedContributor.cs`
- Test: `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/CatalogSampleDataSeed_Tests.cs`

**Interfaces:**
- Consumes:`RewardItem(Guid id, string name, int growthValue=12, int randomWeight=1)` + `.SetGlyph(string?)` / `.SetDisplayOrder(int)` / `.Activate()`;`Medal(Guid id, string name)` + `.SetDescription(string?)` / `.SetDisplayOrder(int)` / `.Activate()`;`IRepository<T,Guid>.GetCountAsync()` / `.InsertAsync(entity, autoSave:true)` / `.GetListAsync()`。
- Produces:一个自动被 ABP 发现的 `IDataSeedContributor`(`ITransientDependency`);可用 `GetRequiredService<CatalogSampleDataSeedContributor>()` 解析并 `SeedAsync(new DataSeedContext())`。

- [ ] **Step 1: 写失败测试**

Create `backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/CatalogSampleDataSeed_Tests.cs`:

```csharp
using System;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Data;
using Shouldly;
using Volo.Abp.Data;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class CatalogSampleDataSeed_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly CatalogSampleDataSeedContributor _seeder;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IRepository<Medal, Guid> _medalRepo;

    public CatalogSampleDataSeed_Tests()
    {
        _seeder = GetRequiredService<CatalogSampleDataSeedContributor>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
        _medalRepo = GetRequiredService<IRepository<Medal, Guid>>();
    }

    [Fact]
    public async Task Seeds_Active_Rewards_And_Medals_Idempotently()
    {
        await WithUnitOfWorkAsync(() => _seeder.SeedAsync(new DataSeedContext()));

        long rewardCount = 0, medalCount = 0;
        await WithUnitOfWorkAsync(async () =>
        {
            rewardCount = await _rewardRepo.GetCountAsync();
            medalCount = await _medalRepo.GetCountAsync();
        });
        rewardCount.ShouldBeGreaterThanOrEqualTo(5);
        medalCount.ShouldBeGreaterThanOrEqualTo(3);

        // 再次运行不得重复插入
        await WithUnitOfWorkAsync(() => _seeder.SeedAsync(new DataSeedContext()));
        long rewardCount2 = 0, medalCount2 = 0;
        await WithUnitOfWorkAsync(async () =>
        {
            rewardCount2 = await _rewardRepo.GetCountAsync();
            medalCount2 = await _medalRepo.GetCountAsync();
        });
        rewardCount2.ShouldBe(rewardCount);
        medalCount2.ShouldBe(medalCount);
    }

    [Fact]
    public async Task Seeded_Rewards_Are_Active_With_Glyph()
    {
        await WithUnitOfWorkAsync(() => _seeder.SeedAsync(new DataSeedContext()));
        await WithUnitOfWorkAsync(async () =>
        {
            var items = await _rewardRepo.GetListAsync();
            items.ShouldAllBe(i => i.IsActive);
            items.ShouldContain(i => i.Glyph != null);
        });
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `dotnet test backend/test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~CatalogSampleDataSeed"`
Expected: 编译失败 / FAIL —— `CatalogSampleDataSeedContributor` 不存在。

- [ ] **Step 3: 写最小实现**

Create `backend/src/Homework.Domain/Data/CatalogSampleDataSeedContributor.cs`:

```csharp
using System;
using System.Threading.Tasks;
using Homework.Catalog;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;

namespace Homework.Data;

/// <summary>
/// 开发数据种子:仅当图鉴为空时插入样例奖励道具 + 勋章(幂等,可重复运行)。
/// 让家长「创建旅程」向导在无图鉴管理后台(Slice C)时也能立即选择道具/勋章。
/// 因「仅空表才插」,上线后不会覆盖真实图鉴数据。
/// </summary>
public class CatalogSampleDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IRepository<RewardItem, Guid> _rewardRepository;
    private readonly IRepository<Medal, Guid> _medalRepository;
    private readonly IGuidGenerator _guidGenerator;

    public CatalogSampleDataSeedContributor(
        IRepository<RewardItem, Guid> rewardRepository,
        IRepository<Medal, Guid> medalRepository,
        IGuidGenerator guidGenerator)
    {
        _rewardRepository = rewardRepository;
        _medalRepository = medalRepository;
        _guidGenerator = guidGenerator;
    }

    public async Task SeedAsync(DataSeedContext context)
    {
        await SeedRewardItemsAsync();
        await SeedMedalsAsync();
    }

    private async Task SeedRewardItemsAsync()
    {
        if (await _rewardRepository.GetCountAsync() > 0)
        {
            return;
        }

        var samples = new[]
        {
            ("星火书签", "✦", 12, 2),
            ("共鸣号角", "📯", 12, 2),
            ("留存果实", "🍎", 15, 3),
            ("能量宝石", "💎", 20, 1),
            ("速算金币", "🪙", 10, 3),
        };

        var order = 0;
        foreach (var (name, glyph, growth, weight) in samples)
        {
            var item = new RewardItem(_guidGenerator.Create(), name, growth, weight);
            item.SetGlyph(glyph);
            item.SetDisplayOrder(order++);
            item.Activate();
            await _rewardRepository.InsertAsync(item, autoSave: true);
        }
    }

    private async Task SeedMedalsAsync()
    {
        if (await _medalRepository.GetCountAsync() > 0)
        {
            return;
        }

        var samples = new[]
        {
            ("暑期毕业勋章", "完成整个暑假旅程的荣誉"),
            ("坚持之星", "连续坚持完成任务"),
            ("探索者徽章", "勇于尝试新挑战"),
        };

        var order = 0;
        foreach (var (name, desc) in samples)
        {
            var medal = new Medal(_guidGenerator.Create(), name);
            medal.SetDescription(desc);
            medal.SetDisplayOrder(order++);
            medal.Activate();
            await _medalRepository.InsertAsync(medal, autoSave: true);
        }
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `dotnet test backend/test/Homework.EntityFrameworkCore.Tests --filter "FullyQualifiedName~CatalogSampleDataSeed"`
Expected: PASS(2 passed)。

- [ ] **Step 5: 回归 + 提交**

Run: `dotnet test backend/test/Homework.EntityFrameworkCore.Tests`(确认既有 EFCore 测试仍全绿)

```bash
git add backend/src/Homework.Domain/Data/CatalogSampleDataSeedContributor.cs backend/test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Catalog/CatalogSampleDataSeed_Tests.cs
git commit -m "$(cat <<'EOF'
feat(catalog): 加图鉴开发数据种子(空表才插样例道具/勋章,幂等)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 前端服务层与类型(新增,保留旧)

**Files:**
- Modify: `frontend/parent-web/src/types/homework.ts`(追加,不删)
- Modify: `frontend/parent-web/src/services/homeworkService.ts`(追加,不删)
- Test: `frontend/parent-web/src/services/homeworkService.test.ts`(追加用例)

**Interfaces:**
- Consumes:既有 `api`(axios 实例)、`ListResult<T>`、`DayOfWeek`。
- Produces:
  - 类型 `JourneyStatus`、`JourneyDto`、`CreateJourneyDto`、`UpdateJourneyDto`、`GetJourneyListInput`、`JourneyTaskTemplateItemDto`、`CreateJourneyTaskTemplateItemDto`、`UpdateJourneyTaskTemplateItemDto`、`GetJourneyTemplateInput`、`RewardItemDto`、`MedalDto`、`PetFormDto`、`PetSpeciesDto`;`DailyTaskDto` 增 `journeyId/rewardItemId/rewardGranted`。
  - 服务函数 `listJourneys/getJourney/createJourney/updateJourney/deleteJourney`;`listJourneyTemplates/createJourneyTemplate/updateJourneyTemplate/deleteJourneyTemplate`;`listActiveRewardItems/listActiveMedals/listActivePetSpecies`。

- [ ] **Step 1: 写失败测试(追加到 `homeworkService.test.ts`)**

在 `describe('homeworkService', …)` 内追加用例,并扩展顶部 import:

```ts
// 顶部 import 改为:
import {
  listChildren, createChild, getDailyBoard, revokeDailyTask,
  listJourneys, createJourney, updateJourney, deleteJourney,
  listJourneyTemplates, createJourneyTemplate,
  listActiveRewardItems, listActiveMedals, listActivePetSpecies,
} from './homeworkService'
```

```ts
  it('listJourneys GETs /journey with childId query and unwraps items', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [{ id: 'j1' }] } })
    expect(await listJourneys('c1')).toEqual([{ id: 'j1' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/journey', { params: { childId: 'c1' } })
  })
  it('createJourney POSTs dto and unwraps data', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'j1' } })
    const dto = { childId: 'c1', title: '暑假', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1' }
    expect(await createJourney(dto)).toEqual({ id: 'j1' })
    expect(api.post).toHaveBeenCalledWith('/api/app/journey', dto)
  })
  it('updateJourney PUTs to /journey/{id}', async () => {
    ;(api.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'j1' } })
    await updateJourney('j1', { title: 't', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1' })
    expect(api.put).toHaveBeenCalledWith('/api/app/journey/j1', { title: 't', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1' })
  })
  it('deleteJourney DELETEs /journey/{id}', async () => {
    await deleteJourney('j1'); expect(api.delete).toHaveBeenCalledWith('/api/app/journey/j1')
  })
  it('listJourneyTemplates GETs with input as params', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [] } })
    await listJourneyTemplates({ journeyId: 'j1' })
    expect(api.get).toHaveBeenCalledWith('/api/app/journey-task-template', { params: { journeyId: 'j1' } })
  })
  it('createJourneyTemplate POSTs dto', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'tt1' } })
    const dto = { journeyId: 'j1', dayOfWeek: 1 as const, title: '背单词', order: 0, rewardIsRandom: true }
    await createJourneyTemplate(dto)
    expect(api.post).toHaveBeenCalledWith('/api/app/journey-task-template', dto)
  })
  it('catalog active-lists GET the right paths and unwrap items', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [{ id: 'x' }] } })
    expect(await listActiveRewardItems()).toEqual([{ id: 'x' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/reward-item/active-list')
    await listActiveMedals(); expect(api.get).toHaveBeenCalledWith('/api/app/medal/active-list')
    await listActivePetSpecies(); expect(api.get).toHaveBeenCalledWith('/api/app/pet-species/active-list')
  })
```

- [ ] **Step 2: 运行确认失败**

Run(在 `frontend/parent-web` 下): `npm test -- homeworkService`
Expected: FAIL —— 新导出未定义。

- [ ] **Step 3: 追加类型(`src/types/homework.ts`)**

在 `// ---- Family goal ----` 之上、或文件末尾 Auth 之前追加:

```ts
// ---- Journey ----
export type JourneyStatus = 0 | 1 | 2 // Draft | Active | Completed
export interface JourneyDto {
  id: string; childId: string; title: string; description?: string | null;
  startDate: string; endDate: string; medalId: string;
  status: JourneyStatus; petSpeciesId?: string | null;
  currentLevel: number; growthPoints: number; completedTime?: string | null;
}
export interface CreateJourneyDto { childId: string; title: string; description?: string | null; startDate: string; endDate: string; medalId: string }
export interface UpdateJourneyDto { title: string; description?: string | null; startDate: string; endDate: string; medalId: string }
export interface GetJourneyListInput { childId: string }

// ---- Journey task template ----
export interface JourneyTaskTemplateItemDto {
  id: string; journeyId: string; dayOfWeek: DayOfWeek; title: string;
  subject?: string | null; order: number; estimatedMinutes?: number | null;
  isActive: boolean; rewardItemId?: string | null; rewardIsRandom: boolean;
}
export interface CreateJourneyTaskTemplateItemDto { journeyId: string; dayOfWeek: DayOfWeek; title: string; subject?: string | null; order: number; estimatedMinutes?: number | null; rewardItemId?: string | null; rewardIsRandom: boolean }
export interface UpdateJourneyTaskTemplateItemDto { title: string; subject?: string | null; order: number; estimatedMinutes?: number | null; isActive: boolean; rewardItemId?: string | null; rewardIsRandom: boolean }
export interface GetJourneyTemplateInput { journeyId: string; dayOfWeek?: DayOfWeek }

// ---- Catalog (read-only) ----
export interface RewardItemDto { id: string; name: string; iconUrl?: string | null; glyph?: string | null; growthValue: number; randomWeight: number; isActive: boolean; displayOrder: number }
export interface MedalDto { id: string; name: string; description?: string | null; imageUrl?: string | null; isActive: boolean; displayOrder: number }
export interface PetFormDto { level: number; name: string; spriteUrl?: string | null; revealText?: string | null; growthToNext?: number | null; evolveVideoUrl?: string | null; scale?: number | null }
export interface PetSpeciesDto { id: string; name: string; code: string; coverUrl?: string | null; accentColor?: string | null; description?: string | null; isActive: boolean; displayOrder: number; forms: PetFormDto[] }
```

并把 `DailyTaskDto` 那一行(第 18 行)扩为(追加 3 个字段):

```ts
export interface DailyTaskDto { id: string; childId: string; date: string; title: string; subject?: string | null; order: number; isCompleted: boolean; completedTime?: string | null; reviewState: TaskReviewState; countsAsCompleted: boolean; sourceTemplateItemId?: string | null; journeyId: string; rewardItemId?: string | null; rewardGranted: boolean }
```

- [ ] **Step 4: 追加服务方法(`src/services/homeworkService.ts`)**

先扩展顶部 import 的类型清单,追加:

```ts
  JourneyDto, CreateJourneyDto, UpdateJourneyDto,
  JourneyTaskTemplateItemDto, CreateJourneyTaskTemplateItemDto, UpdateJourneyTaskTemplateItemDto, GetJourneyTemplateInput,
  RewardItemDto, MedalDto, PetSpeciesDto,
```

在文件末尾(`family-goal` 段之后)追加:

```ts
// ---- journey ----
export const listJourneys = (childId: string) =>
  api.get<ListResult<JourneyDto>>('/api/app/journey', { params: { childId } }).then((r) => r.data.items)
export const getJourney = (id: string) => api.get<JourneyDto>(`/api/app/journey/${id}`).then((r) => r.data)
export const createJourney = (dto: CreateJourneyDto) => api.post<JourneyDto>('/api/app/journey', dto).then((r) => r.data)
export const updateJourney = (id: string, dto: UpdateJourneyDto) => api.put<JourneyDto>(`/api/app/journey/${id}`, dto).then((r) => r.data)
export const deleteJourney = (id: string) => api.delete(`/api/app/journey/${id}`)

// ---- journey-task-template ----
export const listJourneyTemplates = (input: GetJourneyTemplateInput) =>
  api.get<ListResult<JourneyTaskTemplateItemDto>>('/api/app/journey-task-template', { params: input }).then((r) => r.data.items)
export const createJourneyTemplate = (dto: CreateJourneyTaskTemplateItemDto) => api.post<JourneyTaskTemplateItemDto>('/api/app/journey-task-template', dto).then((r) => r.data)
export const updateJourneyTemplate = (id: string, dto: UpdateJourneyTaskTemplateItemDto) => api.put<JourneyTaskTemplateItemDto>(`/api/app/journey-task-template/${id}`, dto).then((r) => r.data)
export const deleteJourneyTemplate = (id: string) => api.delete(`/api/app/journey-task-template/${id}`)

// ---- catalog (read-only active lists) ----
export const listActiveRewardItems = () => api.get<ListResult<RewardItemDto>>('/api/app/reward-item/active-list').then((r) => r.data.items)
export const listActiveMedals = () => api.get<ListResult<MedalDto>>('/api/app/medal/active-list').then((r) => r.data.items)
export const listActivePetSpecies = () => api.get<ListResult<PetSpeciesDto>>('/api/app/pet-species/active-list').then((r) => r.data.items)
```

- [ ] **Step 5: 运行确认通过 + typecheck**

Run: `npm test -- homeworkService`
Expected: PASS。
Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/types/homework.ts src/services/homeworkService.ts src/services/homeworkService.test.ts
git commit -m "$(cat <<'EOF'
feat(parent-web): 加旅程/模板/图鉴 服务方法与类型(扩 DailyTaskDto)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 查询 hooks(useJourneys / useJourneyTemplates / useCatalog)

**Files:**
- Create: `frontend/parent-web/src/hooks/useJourneys.ts`
- Create: `frontend/parent-web/src/hooks/useJourneyTemplates.ts`
- Create: `frontend/parent-web/src/hooks/useCatalog.ts`
- Test: `frontend/parent-web/src/hooks/useJourneys.test.tsx`

**Interfaces:**
- Consumes:Task 2 的服务函数与类型;既有 `getErrorMessage`、`sonner` toast。
- Produces:
  - `journeysKey(childId)`、`useJourneys(childId)`、`useJourney(id)`、`useJourneyMutations(childId)`(`.create/.update/.remove`)。
  - `journeyTemplatesKey(journeyId)`、`useJourneyTemplates(journeyId)`、`useJourneyTemplateMutations(journeyId)`(`.create/.update/.remove`)。
  - `useActiveRewardItems()`、`useActiveMedals()`、`useActivePetSpecies()`(staleTime 5min)。

- [ ] **Step 1: 写失败测试 `src/hooks/useJourneys.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listJourneys: vi.fn(),
  getJourney: vi.fn(),
  createJourney: vi.fn(),
  updateJourney: vi.fn(),
  deleteJourney: vi.fn(),
}))
import { listJourneys } from '@/services/homeworkService'
import { useJourneys } from './useJourneys'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useJourneys', () => {
  it('is disabled when childId is empty (no fetch)', () => {
    renderHook(() => useJourneys(''), { wrapper })
    expect(listJourneys).not.toHaveBeenCalled()
  })
  it('fetches journeys for a child', async () => {
    ;(listJourneys as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'j1' }])
    const { result } = renderHook(() => useJourneys('c1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'j1' }])
    expect(listJourneys).toHaveBeenCalledWith('c1')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- useJourneys`
Expected: FAIL —— `./useJourneys` 不存在。

- [ ] **Step 3: 实现 `src/hooks/useJourneys.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listJourneys, getJourney, createJourney, updateJourney, deleteJourney } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateJourneyDto, UpdateJourneyDto } from '@/types/homework'

export const journeysKey = (childId: string) => ['journeys', childId]

export const useJourneys = (childId: string) =>
  useQuery({ queryKey: journeysKey(childId), queryFn: () => listJourneys(childId), enabled: !!childId })

export const useJourney = (id: string) =>
  useQuery({ queryKey: ['journey', id], queryFn: () => getJourney(id), enabled: !!id })

export function useJourneyMutations(childId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: journeysKey(childId) })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateJourneyDto) => createJourney(d), onSuccess: () => { void invalidate(); toast.success('已创建') }, onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: UpdateJourneyDto }) => updateJourney(a.id, a.dto), onSuccess: () => { void invalidate(); toast.success('已保存') }, onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteJourney(id), onSuccess: () => { void invalidate(); toast.success('已删除') }, onError: onErr }),
  }
}
```

- [ ] **Step 4: 实现 `src/hooks/useJourneyTemplates.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listJourneyTemplates, createJourneyTemplate, updateJourneyTemplate, deleteJourneyTemplate } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateJourneyTaskTemplateItemDto, UpdateJourneyTaskTemplateItemDto } from '@/types/homework'

export const journeyTemplatesKey = (journeyId: string) => ['journey-templates', journeyId]

export const useJourneyTemplates = (journeyId: string) =>
  useQuery({ queryKey: journeyTemplatesKey(journeyId), queryFn: () => listJourneyTemplates({ journeyId }), enabled: !!journeyId })

export function useJourneyTemplateMutations(journeyId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: journeyTemplatesKey(journeyId) })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateJourneyTaskTemplateItemDto) => createJourneyTemplate(d), onSuccess: () => void invalidate(), onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: UpdateJourneyTaskTemplateItemDto }) => updateJourneyTemplate(a.id, a.dto), onSuccess: () => void invalidate(), onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteJourneyTemplate(id), onSuccess: () => void invalidate(), onError: onErr }),
  }
}
```

- [ ] **Step 5: 实现 `src/hooks/useCatalog.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { listActiveRewardItems, listActiveMedals, listActivePetSpecies } from '@/services/homeworkService'

const STALE = 5 * 60 * 1000

export const useActiveRewardItems = () =>
  useQuery({ queryKey: ['catalog', 'reward-items'], queryFn: listActiveRewardItems, staleTime: STALE })
export const useActiveMedals = () =>
  useQuery({ queryKey: ['catalog', 'medals'], queryFn: listActiveMedals, staleTime: STALE })
export const useActivePetSpecies = () =>
  useQuery({ queryKey: ['catalog', 'pet-species'], queryFn: listActivePetSpecies, staleTime: STALE })
```

- [ ] **Step 6: 运行确认通过 + typecheck**

Run: `npm test -- useJourneys`
Expected: PASS。
Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 7: 提交**

```bash
git add src/hooks/useJourneys.ts src/hooks/useJourneyTemplates.ts src/hooks/useCatalog.ts src/hooks/useJourneys.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 加 useJourneys/useJourneyTemplates/useCatalog 查询 hooks

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: i18n 文案(新增旅程/向导键,双语一致)

**Files:**
- Modify: `frontend/parent-web/public/locales/zh-CN/translation.json`
- Modify: `frontend/parent-web/public/locales/en/translation.json`
- Test: `frontend/parent-web/src/i18n/locales.test.ts`

**Interfaces:**
- Produces:两套 locale 各新增 `journeys.*`、`wizard.*`(含 `wizard.days.0..6`)命名空间,并给 `nav` 增 `journeys` 键。旧 `nav.schedule/nav.goals` + `schedule.*` + `goals.*` 暂留(Task 15 删)。

- [ ] **Step 1: 写失败测试 `src/i18n/locales.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import zh from '../../public/locales/zh-CN/translation.json'
import en from '../../public/locales/en/translation.json'

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`])
}

describe('locales', () => {
  it('both locales define the new journeys/wizard namespaces', () => {
    for (const loc of [zh, en] as Array<Record<string, unknown>>) {
      const flat = keys(loc)
      expect(flat).toContain('nav.journeys')
      expect(flat).toContain('journeys.title')
      expect(flat).toContain('journeys.create')
      expect(flat).toContain('wizard.stepBasics')
      expect(flat).toContain('wizard.publish')
      expect(flat).toContain('wizard.days.0')
      expect(flat).toContain('wizard.days.6')
    }
  })
  it('zh and en have identical key sets', () => {
    expect(keys(zh as Record<string, unknown>).sort()).toEqual(keys(en as Record<string, unknown>).sort())
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- locales`
Expected: FAIL —— 缺 `nav.journeys` 等键。

- [ ] **Step 3: 追加 zh-CN 文案**

在 `zh-CN/translation.json` 的 `nav` 对象加 `"journeys": "旅程"`(保留 schedule/goals),并在 `board` 段之后、`goals` 段之前插入两个命名空间:

```json
  "journeys": {
    "title": "旅程",
    "create": "创建旅程",
    "empty": "还没有旅程,创建一个吧",
    "noChildren": "请先在「孩子」页面添加孩子档案",
    "statusDraft": "草稿",
    "statusActive": "进行中",
    "statusCompleted": "已完成",
    "petPending": "宠物待孩子选择",
    "level": "等级",
    "period": "期限",
    "readOnlyActive": "旅程进行中,暂不可编辑",
    "deleteConfirmTitle": "删除旅程?",
    "deleteConfirmBody": "将移除该草稿旅程及其任务模板,无法恢复。"
  },
  "wizard": {
    "stepBasics": "基本信息",
    "stepTasks": "周任务计划",
    "stepMedal": "选择勋章",
    "stepReview": "预览发布",
    "title": "旅程名称",
    "description": "描述(可选)",
    "startDate": "开始日期",
    "endDate": "结束日期",
    "dateOrderError": "结束日期不能早于开始日期",
    "titleRequired": "请填写旅程名称",
    "next": "下一步",
    "back": "上一步",
    "cancel": "取消",
    "publish": "发布",
    "save": "保存",
    "addTask": "添加任务",
    "taskTitle": "任务名称",
    "subject": "科目",
    "minutes": "预计分钟",
    "reward": "奖励",
    "rewardRandom": "随机",
    "rewardSpecific": "指定道具",
    "noReward": "暂无可用道具",
    "selectMedalRequired": "请选择一枚勋章",
    "noMedal": "暂无可用勋章",
    "publishSuccess": "旅程已创建",
    "saveSuccess": "已保存",
    "publishPartial": "旅程已保存,部分任务未成功,请在编辑页补齐",
    "reviewTasks": "任务安排",
    "reviewNoTasks": "本旅程暂无任务(可稍后在编辑页添加)",
    "days": { "0": "周日", "1": "周一", "2": "周二", "3": "周三", "4": "周四", "5": "周五", "6": "周六" }
  },
```

- [ ] **Step 4: 追加 en 文案(键集必须与 zh 完全一致)**

在 `en/translation.json` 的 `nav` 加 `"journeys": "Journeys"`,并插入:

```json
  "journeys": {
    "title": "Journeys",
    "create": "Create journey",
    "empty": "No journeys yet. Create one.",
    "noChildren": "Please add a child first.",
    "statusDraft": "Draft",
    "statusActive": "Active",
    "statusCompleted": "Completed",
    "petPending": "Pet chosen by child at start",
    "level": "Level",
    "period": "Period",
    "readOnlyActive": "Active journey is read-only",
    "deleteConfirmTitle": "Delete journey?",
    "deleteConfirmBody": "This draft journey and its task templates will be removed permanently."
  },
  "wizard": {
    "stepBasics": "Basics",
    "stepTasks": "Weekly tasks",
    "stepMedal": "Choose medal",
    "stepReview": "Review",
    "title": "Journey title",
    "description": "Description (optional)",
    "startDate": "Start date",
    "endDate": "End date",
    "dateOrderError": "End date cannot be before start date",
    "titleRequired": "Please enter a journey title",
    "next": "Next",
    "back": "Back",
    "cancel": "Cancel",
    "publish": "Publish",
    "save": "Save",
    "addTask": "Add task",
    "taskTitle": "Task title",
    "subject": "Subject",
    "minutes": "Est. minutes",
    "reward": "Reward",
    "rewardRandom": "Random",
    "rewardSpecific": "Specific item",
    "noReward": "No reward items available",
    "selectMedalRequired": "Please choose a medal",
    "noMedal": "No medals available",
    "publishSuccess": "Journey created",
    "saveSuccess": "Saved",
    "publishPartial": "Journey saved; some tasks failed — finish them on the edit page",
    "reviewTasks": "Task schedule",
    "reviewNoTasks": "No tasks yet (you can add them later on the edit page)",
    "days": { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" }
  },
```

- [ ] **Step 5: 运行确认通过**

Run: `npm test -- locales`
Expected: PASS(2 passed)。

- [ ] **Step 6: 提交**

```bash
git add public/locales/zh-CN/translation.json public/locales/en/translation.json src/i18n/locales.test.ts
git commit -m "$(cat <<'EOF'
feat(parent-web): 加旅程/向导 i18n 文案(zh-CN + en)与键一致性测试

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 向导状态与校验(`wizardTypes.ts`,纯逻辑)

**Files:**
- Create: `frontend/parent-web/src/features/journeys/wizard/wizardTypes.ts`
- Test: `frontend/parent-web/src/features/journeys/wizard/wizardTypes.test.ts`

**Interfaces:**
- Consumes:`DayOfWeek`、`CreateJourneyTaskTemplateItemDto`、`JourneyTaskTemplateItemDto`。
- Produces:
  - 类型 `WizardTaskDraft { key; id?; dayOfWeek; title; subject; estimatedMinutes; order; rewardMode: 'random'|'specific'; rewardItemId }`、`WizardState { childId; title; description; startDate; endDate; medalId; tasks }`。
  - `emptyWizardState(childId)`、`newTaskDraft(dayOfWeek, order)`、`toCreateTemplateDto(journeyId, t)`、`draftFromTemplate(t)`(把服务端模板项转回草稿),校验器 `validateBasics(s)`、`validateTasks(s)`、`validateMedal(s)`(返回 `null` 或错误码字符串)。

- [ ] **Step 1: 写失败测试 `wizardTypes.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  emptyWizardState, newTaskDraft, toCreateTemplateDto, draftFromTemplate,
  validateBasics, validateTasks, validateMedal,
} from './wizardTypes'

describe('wizardTypes', () => {
  it('emptyWizardState carries childId and empty fields', () => {
    const s = emptyWizardState('c1')
    expect(s.childId).toBe('c1')
    expect(s.tasks).toEqual([])
    expect(s.medalId).toBe('')
  })

  it('validateBasics: title + date presence + order', () => {
    const base = emptyWizardState('c1')
    expect(validateBasics(base)).toBe('title')
    expect(validateBasics({ ...base, title: 'x' })).toBe('dates')
    expect(validateBasics({ ...base, title: 'x', startDate: '2026-08-01', endDate: '2026-07-01' })).toBe('dateOrder')
    expect(validateBasics({ ...base, title: 'x', startDate: '2026-07-01', endDate: '2026-08-01' })).toBeNull()
  })

  it('validateMedal requires a medalId', () => {
    expect(validateMedal(emptyWizardState('c1'))).toBe('medal')
    expect(validateMedal({ ...emptyWizardState('c1'), medalId: 'm1' })).toBeNull()
  })

  it('validateTasks: every task needs a title, specific reward needs an item', () => {
    const s = emptyWizardState('c1')
    const t = newTaskDraft(1, 0)
    expect(validateTasks({ ...s, tasks: [{ ...t, title: '' }] })).toBe('taskTitle')
    expect(validateTasks({ ...s, tasks: [{ ...t, title: '背单词', rewardMode: 'specific', rewardItemId: null }] })).toBe('taskReward')
    expect(validateTasks({ ...s, tasks: [{ ...t, title: '背单词' }] })).toBeNull()
  })

  it('toCreateTemplateDto maps random vs specific reward and trims', () => {
    const t = { ...newTaskDraft(2, 3), title: ' 读书 ', subject: ' 语文 ', estimatedMinutes: 20, rewardMode: 'random' as const, rewardItemId: null }
    expect(toCreateTemplateDto('j1', t)).toEqual({
      journeyId: 'j1', dayOfWeek: 2, title: '读书', subject: '语文', order: 3,
      estimatedMinutes: 20, rewardItemId: null, rewardIsRandom: true,
    })
    const spec = { ...t, rewardMode: 'specific' as const, rewardItemId: 'r1' }
    expect(toCreateTemplateDto('j1', spec)).toMatchObject({ rewardItemId: 'r1', rewardIsRandom: false })
  })

  it('draftFromTemplate round-trips a server template item', () => {
    const d = draftFromTemplate({
      id: 'tt1', journeyId: 'j1', dayOfWeek: 4, title: '练字', subject: null,
      order: 1, estimatedMinutes: null, isActive: true, rewardItemId: 'r9', rewardIsRandom: false,
    })
    expect(d.id).toBe('tt1')
    expect(d.rewardMode).toBe('specific')
    expect(d.rewardItemId).toBe('r9')
    expect(d.subject).toBe('')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- wizardTypes`
Expected: FAIL —— 模块不存在。

- [ ] **Step 3: 实现 `wizardTypes.ts`**

```ts
import type { DayOfWeek, CreateJourneyTaskTemplateItemDto, JourneyTaskTemplateItemDto } from '@/types/homework'

export type RewardMode = 'random' | 'specific'

export interface WizardTaskDraft {
  key: string          // 稳定的客户端渲染 key
  id?: string          // 服务端模板项 id(编辑态才有;新任务为 undefined)
  dayOfWeek: DayOfWeek
  title: string
  subject: string
  estimatedMinutes: number | null
  order: number
  rewardMode: RewardMode
  rewardItemId: string | null
}

export interface WizardState {
  childId: string
  title: string
  description: string
  startDate: string    // YYYY-MM-DD
  endDate: string      // YYYY-MM-DD
  medalId: string
  tasks: WizardTaskDraft[]
}

export function emptyWizardState(childId: string): WizardState {
  return { childId, title: '', description: '', startDate: '', endDate: '', medalId: '', tasks: [] }
}

export function newTaskDraft(dayOfWeek: DayOfWeek, order: number): WizardTaskDraft {
  return {
    key: `t-${dayOfWeek}-${order}-${Math.random().toString(36).slice(2, 8)}`,
    dayOfWeek, title: '', subject: '', estimatedMinutes: null, order,
    rewardMode: 'random', rewardItemId: null,
  }
}

export function draftFromTemplate(t: JourneyTaskTemplateItemDto): WizardTaskDraft {
  return {
    key: t.id,
    id: t.id,
    dayOfWeek: t.dayOfWeek,
    title: t.title,
    subject: t.subject ?? '',
    estimatedMinutes: t.estimatedMinutes ?? null,
    order: t.order,
    rewardMode: t.rewardIsRandom ? 'random' : 'specific',
    rewardItemId: t.rewardItemId ?? null,
  }
}

export function toCreateTemplateDto(journeyId: string, t: WizardTaskDraft): CreateJourneyTaskTemplateItemDto {
  return {
    journeyId,
    dayOfWeek: t.dayOfWeek,
    title: t.title.trim(),
    subject: t.subject.trim() || null,
    order: t.order,
    estimatedMinutes: t.estimatedMinutes,
    rewardItemId: t.rewardMode === 'specific' ? t.rewardItemId : null,
    rewardIsRandom: t.rewardMode === 'random',
  }
}

export function validateBasics(s: WizardState): string | null {
  if (!s.title.trim()) return 'title'
  if (!s.startDate || !s.endDate) return 'dates'
  if (s.endDate < s.startDate) return 'dateOrder'
  return null
}

export function validateTasks(s: WizardState): string | null {
  for (const t of s.tasks) {
    if (!t.title.trim()) return 'taskTitle'
    if (t.rewardMode === 'specific' && !t.rewardItemId) return 'taskReward'
  }
  return null
}

export function validateMedal(s: WizardState): string | null {
  return s.medalId ? null : 'medal'
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- wizardTypes`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/features/journeys/wizard/wizardTypes.ts src/features/journeys/wizard/wizardTypes.test.ts
git commit -m "$(cat <<'EOF'
feat(parent-web): 向导状态模型与校验器(纯逻辑)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 向导提交编排(`submitJourney.ts`,create / edit-diff / 部分失败)

**Files:**
- Create: `frontend/parent-web/src/features/journeys/wizard/submitJourney.ts`
- Test: `frontend/parent-web/src/features/journeys/wizard/submitJourney.test.ts`

**Interfaces:**
- Consumes:服务函数 `createJourney/updateJourney/createJourneyTemplate/updateJourneyTemplate/deleteJourneyTemplate/listJourneyTemplates`;`WizardState`、`toCreateTemplateDto`。
- Produces:`PublishResult { journeyId: string; failedTasks: number }`;`publishNewJourney(state) → Promise<PublishResult>`;`saveJourneyEdits(journeyId, state) → Promise<PublishResult>`。语义:journey 主体失败则整体抛错;模板项失败只累加 `failedTasks` 不中断。

- [ ] **Step 1: 写失败测试 `submitJourney.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/homeworkService', () => ({
  createJourney: vi.fn(),
  updateJourney: vi.fn(),
  createJourneyTemplate: vi.fn(),
  updateJourneyTemplate: vi.fn(),
  deleteJourneyTemplate: vi.fn(),
  listJourneyTemplates: vi.fn(),
}))
import {
  createJourney, updateJourney, createJourneyTemplate, updateJourneyTemplate,
  deleteJourneyTemplate, listJourneyTemplates,
} from '@/services/homeworkService'
import { publishNewJourney, saveJourneyEdits } from './submitJourney'
import { emptyWizardState, newTaskDraft } from './wizardTypes'

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>
beforeEach(() => vi.clearAllMocks())

describe('publishNewJourney', () => {
  it('creates the journey then one template per task', async () => {
    mock(createJourney).mockResolvedValue({ id: 'j1' })
    mock(createJourneyTemplate).mockResolvedValue({ id: 'tt' })
    const state = { ...emptyWizardState('c1'), title: '暑假', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1',
      tasks: [{ ...newTaskDraft(1, 0), title: 'A' }, { ...newTaskDraft(2, 0), title: 'B' }] }
    const res = await publishNewJourney(state)
    expect(res).toEqual({ journeyId: 'j1', failedTasks: 0 })
    expect(createJourney).toHaveBeenCalledWith({ childId: 'c1', title: '暑假', description: null, startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1' })
    expect(createJourneyTemplate).toHaveBeenCalledTimes(2)
  })

  it('counts template failures without aborting, still returns journeyId', async () => {
    mock(createJourney).mockResolvedValue({ id: 'j1' })
    mock(createJourneyTemplate).mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ id: 'tt' })
    const state = { ...emptyWizardState('c1'), title: 'x', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1',
      tasks: [{ ...newTaskDraft(1, 0), title: 'A' }, { ...newTaskDraft(2, 0), title: 'B' }] }
    const res = await publishNewJourney(state)
    expect(res.journeyId).toBe('j1')
    expect(res.failedTasks).toBe(1)
  })

  it('propagates when journey creation fails (no templates attempted)', async () => {
    mock(createJourney).mockRejectedValue(new Error('nope'))
    const state = { ...emptyWizardState('c1'), title: 'x', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1', tasks: [{ ...newTaskDraft(1, 0), title: 'A' }] }
    await expect(publishNewJourney(state)).rejects.toThrow('nope')
    expect(createJourneyTemplate).not.toHaveBeenCalled()
  })
})

describe('saveJourneyEdits', () => {
  it('updates journey, deletes removed, updates existing, creates new', async () => {
    mock(updateJourney).mockResolvedValue({ id: 'j1' })
    mock(listJourneyTemplates).mockResolvedValue([
      { id: 'keep', journeyId: 'j1', dayOfWeek: 1, title: '旧', subject: null, order: 0, estimatedMinutes: null, isActive: true, rewardItemId: null, rewardIsRandom: true },
      { id: 'drop', journeyId: 'j1', dayOfWeek: 2, title: '删', subject: null, order: 0, estimatedMinutes: null, isActive: true, rewardItemId: null, rewardIsRandom: true },
    ])
    mock(updateJourneyTemplate).mockResolvedValue({ id: 'keep' })
    mock(deleteJourneyTemplate).mockResolvedValue(undefined)
    mock(createJourneyTemplate).mockResolvedValue({ id: 'new' })

    const state = { ...emptyWizardState('c1'), title: 'T', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1', tasks: [
      { ...newTaskDraft(1, 0), id: 'keep', key: 'keep', title: '改后' },
      { ...newTaskDraft(3, 0), title: '新任务' },
    ] }
    const res = await saveJourneyEdits('j1', state)
    expect(res.failedTasks).toBe(0)
    expect(deleteJourneyTemplate).toHaveBeenCalledWith('drop')
    expect(updateJourneyTemplate).toHaveBeenCalledWith('keep', expect.objectContaining({ title: '改后', isActive: true }))
    expect(createJourneyTemplate).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- submitJourney`
Expected: FAIL —— 模块不存在。

- [ ] **Step 3: 实现 `submitJourney.ts`**

```ts
import {
  createJourney, updateJourney, createJourneyTemplate, updateJourneyTemplate,
  deleteJourneyTemplate, listJourneyTemplates,
} from '@/services/homeworkService'
import type { WizardState, WizardTaskDraft } from './wizardTypes'
import { toCreateTemplateDto } from './wizardTypes'

export interface PublishResult {
  journeyId: string
  failedTasks: number
}

function updateDtoFrom(t: WizardTaskDraft) {
  return {
    title: t.title.trim(),
    subject: t.subject.trim() || null,
    order: t.order,
    estimatedMinutes: t.estimatedMinutes,
    isActive: true,
    rewardItemId: t.rewardMode === 'specific' ? t.rewardItemId : null,
    rewardIsRandom: t.rewardMode === 'random',
  }
}

export async function publishNewJourney(state: WizardState): Promise<PublishResult> {
  const journey = await createJourney({
    childId: state.childId,
    title: state.title.trim(),
    description: state.description.trim() || null,
    startDate: state.startDate,
    endDate: state.endDate,
    medalId: state.medalId,
  })

  let failedTasks = 0
  for (const t of state.tasks) {
    try {
      await createJourneyTemplate(toCreateTemplateDto(journey.id, t))
    } catch {
      failedTasks++
    }
  }
  return { journeyId: journey.id, failedTasks }
}

export async function saveJourneyEdits(journeyId: string, state: WizardState): Promise<PublishResult> {
  await updateJourney(journeyId, {
    title: state.title.trim(),
    description: state.description.trim() || null,
    startDate: state.startDate,
    endDate: state.endDate,
    medalId: state.medalId,
  })

  const existing = await listJourneyTemplates({ journeyId })
  const keptIds = new Set(state.tasks.filter((t) => t.id).map((t) => t.id as string))

  let failedTasks = 0
  for (const e of existing) {
    if (!keptIds.has(e.id)) {
      try {
        await deleteJourneyTemplate(e.id)
      } catch {
        failedTasks++
      }
    }
  }
  for (const t of state.tasks) {
    try {
      if (t.id) {
        await updateJourneyTemplate(t.id, updateDtoFrom(t))
      } else {
        await createJourneyTemplate(toCreateTemplateDto(journeyId, t))
      }
    } catch {
      failedTasks++
    }
  }
  return { journeyId, failedTasks }
}
```

- [ ] **Step 4: 运行确认通过 + typecheck**

Run: `npm test -- submitJourney`
Expected: PASS。
Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 5: 提交**

```bash
git add src/features/journeys/wizard/submitJourney.ts src/features/journeys/wizard/submitJourney.test.ts
git commit -m "$(cat <<'EOF'
feat(parent-web): 向导提交编排(新建/编辑差量/部分失败可测)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 向导步骤组件 —— 基本信息 / 勋章 / 预览(纯展示)

**Files:**
- Create: `frontend/parent-web/src/features/journeys/wizard/StepBasics.tsx`
- Create: `frontend/parent-web/src/features/journeys/wizard/StepMedal.tsx`
- Create: `frontend/parent-web/src/features/journeys/wizard/StepReview.tsx`
- Test: `frontend/parent-web/src/features/journeys/wizard/steps.test.tsx`

**Interfaces:**
- Consumes:`WizardState`、`MedalDto`、`RewardItemDto`;既有 `ui/input`、`ui/textarea`、`ui/label`。
- Produces:
  - `StepBasics({ state, patch }: { state: WizardState; patch: (p: Partial<WizardState>) => void })`。
  - `StepMedal({ state, patch, medals }: { state: WizardState; patch: (p: Partial<WizardState>) => void; medals: MedalDto[] })`。
  - `StepReview({ state, medals, rewardItems }: { state: WizardState; medals: MedalDto[]; rewardItems: RewardItemDto[] })`。
- 约定:所有交互元素带 `data-testid`,测试断言用 testid + 值,不依赖 i18n 译文。

- [ ] **Step 1: 写失败测试 `steps.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepBasics } from './StepBasics'
import { StepMedal } from './StepMedal'
import { StepReview } from './StepReview'
import { emptyWizardState, newTaskDraft } from './wizardTypes'

describe('StepBasics', () => {
  it('patches title and shows date-order error', () => {
    const patch = vi.fn()
    const state = { ...emptyWizardState('c1'), startDate: '2026-08-01', endDate: '2026-07-01' }
    render(<StepBasics state={state} patch={patch} />)
    fireEvent.change(screen.getByTestId('wiz-title'), { target: { value: '暑假之旅' } })
    expect(patch).toHaveBeenCalledWith({ title: '暑假之旅' })
    expect(screen.getByTestId('wiz-date-error')).toBeInTheDocument()
  })
})

describe('StepMedal', () => {
  it('selects a medal on click', () => {
    const patch = vi.fn()
    const medals = [{ id: 'm1', name: '毕业勋章', isActive: true, displayOrder: 0 }]
    render(<StepMedal state={emptyWizardState('c1')} patch={patch} medals={medals} />)
    fireEvent.click(screen.getByTestId('medal-m1'))
    expect(patch).toHaveBeenCalledWith({ medalId: 'm1' })
  })
  it('shows empty hint when no medals', () => {
    render(<StepMedal state={emptyWizardState('c1')} patch={vi.fn()} medals={[]} />)
    expect(screen.getByTestId('medal-empty')).toBeInTheDocument()
  })
})

describe('StepReview', () => {
  it('summarizes title, medal name and task count', () => {
    const state = { ...emptyWizardState('c1'), title: '暑假', medalId: 'm1', startDate: '2026-07-01', endDate: '2026-08-31',
      tasks: [{ ...newTaskDraft(1, 0), title: '背单词' }] }
    const medals = [{ id: 'm1', name: '毕业勋章', isActive: true, displayOrder: 0 }]
    render(<StepReview state={state} medals={medals} rewardItems={[]} />)
    expect(screen.getByTestId('review-title')).toHaveTextContent('暑假')
    expect(screen.getByTestId('review-medal')).toHaveTextContent('毕业勋章')
    expect(screen.getByTestId('review-task-count')).toHaveTextContent('1')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- steps`
Expected: FAIL —— 组件不存在。

- [ ] **Step 3: 实现 `StepBasics.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { WizardState } from './wizardTypes'

interface Props {
  state: WizardState
  patch: (p: Partial<WizardState>) => void
}

export function StepBasics({ state, patch }: Props) {
  const { t } = useTranslation()
  const dateOrderBad = !!state.startDate && !!state.endDate && state.endDate < state.startDate

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="wiz-title">{t('wizard.title')}</Label>
        <Input id="wiz-title" data-testid="wiz-title" value={state.title}
          onChange={(e) => patch({ title: e.target.value })} maxLength={128} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wiz-desc">{t('wizard.description')}</Label>
        <Textarea id="wiz-desc" data-testid="wiz-desc" value={state.description}
          onChange={(e) => patch({ description: e.target.value })} maxLength={512} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-start">{t('wizard.startDate')}</Label>
          <Input id="wiz-start" data-testid="wiz-start" type="date" value={state.startDate}
            onChange={(e) => patch({ startDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wiz-end">{t('wizard.endDate')}</Label>
          <Input id="wiz-end" data-testid="wiz-end" type="date" value={state.endDate}
            onChange={(e) => patch({ endDate: e.target.value })} />
        </div>
      </div>
      {dateOrderBad && (
        <p data-testid="wiz-date-error" className="text-sm text-error-500">{t('wizard.dateOrderError')}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 实现 `StepMedal.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { Award } from 'lucide-react'
import type { WizardState } from './wizardTypes'
import type { MedalDto } from '@/types/homework'

interface Props {
  state: WizardState
  patch: (p: Partial<WizardState>) => void
  medals: MedalDto[]
}

export function StepMedal({ state, patch, medals }: Props) {
  const { t } = useTranslation()
  if (medals.length === 0) {
    return <p data-testid="medal-empty" className="text-sm text-muted">{t('wizard.noMedal')}</p>
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {medals.map((m) => {
        const selected = state.medalId === m.id
        return (
          <button key={m.id} type="button" data-testid={`medal-${m.id}`}
            onClick={() => patch({ medalId: m.id })}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              selected ? 'border-brand-600 bg-brand-50' : 'border-ink/15 hover:bg-ink/5'}`}>
            <Award className={`h-6 w-6 shrink-0 ${selected ? 'text-brand-600' : 'text-muted'}`} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-ink">{m.name}</div>
              {m.description && <div className="text-sm text-muted line-clamp-2">{m.description}</div>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: 实现 `StepReview.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import type { WizardState } from './wizardTypes'
import type { MedalDto, RewardItemDto } from '@/types/homework'

interface Props {
  state: WizardState
  medals: MedalDto[]
  rewardItems: RewardItemDto[]
}

export function StepReview({ state, medals, rewardItems }: Props) {
  const { t } = useTranslation()
  const medalName = medals.find((m) => m.id === state.medalId)?.name ?? '—'
  const rewardLabel = (rewardItemId: string | null, mode: string) => {
    if (mode === 'random') return t('wizard.rewardRandom')
    const r = rewardItems.find((x) => x.id === rewardItemId)
    return r ? `${r.glyph ?? '🎁'} ${r.name}` : t('wizard.rewardSpecific')
  }
  const sorted = [...state.tasks].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.order - b.order)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink/10 p-4">
        <div data-testid="review-title" className="text-lg font-bold text-ink">{state.title || '—'}</div>
        {state.description && <div className="mt-1 text-sm text-muted">{state.description}</div>}
        <div className="mt-2 text-sm text-muted">{state.startDate} → {state.endDate}</div>
        <div className="mt-2 text-sm">
          {t('wizard.stepMedal')}: <span data-testid="review-medal" className="font-medium text-ink">{medalName}</span>
        </div>
      </div>
      <div className="rounded-xl border border-ink/10 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-ink">{t('wizard.reviewTasks')}</span>
          <span data-testid="review-task-count" className="text-sm text-muted">{state.tasks.length}</span>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">{t('wizard.reviewNoTasks')}</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {sorted.map((task) => (
              <li key={task.key} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-muted">{t(`wizard.days.${task.dayOfWeek}`)}</span>
                <span className="flex-1 truncate text-ink">{task.title}</span>
                <span className="shrink-0 text-muted">{rewardLabel(task.rewardItemId, task.rewardMode)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 运行确认通过**

Run: `npm test -- steps`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add src/features/journeys/wizard/StepBasics.tsx src/features/journeys/wizard/StepMedal.tsx src/features/journeys/wizard/StepReview.tsx src/features/journeys/wizard/steps.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 向导步骤 基本信息/勋章/预览(纯展示 + 测试)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 向导步骤 —— 周任务计划(`StepTasks`)

**Files:**
- Create: `frontend/parent-web/src/features/journeys/wizard/StepTasks.tsx`
- Test: `frontend/parent-web/src/features/journeys/wizard/StepTasks.test.tsx`

**Interfaces:**
- Consumes:`WizardState`、`WizardTaskDraft`、`newTaskDraft`、`RewardItemDto`、`DayOfWeek`;既有 `ui/input`、`ui/button`。
- Produces:`StepTasks({ state, setTasks, rewardItems }: { state: WizardState; setTasks: (tasks: WizardTaskDraft[]) => void; rewardItems: RewardItemDto[] })`。7 天分区,每天可加/删任务;每任务可编辑 title/subject/minutes 及奖励模式(随机 / 指定道具-chips)。

- [ ] **Step 1: 写失败测试 `StepTasks.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepTasks } from './StepTasks'
import { emptyWizardState, newTaskDraft } from './wizardTypes'
import type { WizardTaskDraft } from './wizardTypes'

const rewards = [
  { id: 'r1', name: '书签', glyph: '✦', growthValue: 12, randomWeight: 1, isActive: true, displayOrder: 0 },
]

describe('StepTasks', () => {
  it('adds a task to Monday', () => {
    const setTasks = vi.fn()
    render(<StepTasks state={emptyWizardState('c1')} setTasks={setTasks} rewardItems={rewards} />)
    fireEvent.click(screen.getByTestId('add-task-1'))
    const added = setTasks.mock.calls[0][0] as WizardTaskDraft[]
    expect(added).toHaveLength(1)
    expect(added[0].dayOfWeek).toBe(1)
  })

  it('edits a task title', () => {
    const setTasks = vi.fn()
    const task = { ...newTaskDraft(1, 0), key: 'k1' }
    render(<StepTasks state={{ ...emptyWizardState('c1'), tasks: [task] }} setTasks={setTasks} rewardItems={rewards} />)
    fireEvent.change(screen.getByTestId('task-title-k1'), { target: { value: '背单词' } })
    const next = setTasks.mock.calls[0][0] as WizardTaskDraft[]
    expect(next[0].title).toBe('背单词')
  })

  it('switches reward to specific and picks an item', () => {
    const setTasks = vi.fn()
    const task = { ...newTaskDraft(1, 0), key: 'k1' }
    render(<StepTasks state={{ ...emptyWizardState('c1'), tasks: [task] }} setTasks={setTasks} rewardItems={rewards} />)
    fireEvent.click(screen.getByTestId('reward-specific-k1'))
    expect((setTasks.mock.calls[0][0] as WizardTaskDraft[])[0].rewardMode).toBe('specific')
  })

  it('removes a task', () => {
    const setTasks = vi.fn()
    const task = { ...newTaskDraft(1, 0), key: 'k1' }
    render(<StepTasks state={{ ...emptyWizardState('c1'), tasks: [task] }} setTasks={setTasks} rewardItems={rewards} />)
    fireEvent.click(screen.getByTestId('remove-task-k1'))
    expect(setTasks.mock.calls[0][0]).toEqual([])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- StepTasks`
Expected: FAIL —— 组件不存在。

- [ ] **Step 3: 实现 `StepTasks.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { newTaskDraft } from './wizardTypes'
import type { WizardState, WizardTaskDraft } from './wizardTypes'
import type { DayOfWeek, RewardItemDto } from '@/types/homework'

interface Props {
  state: WizardState
  setTasks: (tasks: WizardTaskDraft[]) => void
  rewardItems: RewardItemDto[]
}

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0] // 周一..周日

export function StepTasks({ state, setTasks, rewardItems }: Props) {
  const { t } = useTranslation()

  const patchTask = (key: string, p: Partial<WizardTaskDraft>) =>
    setTasks(state.tasks.map((task) => (task.key === key ? { ...task, ...p } : task)))
  const addTask = (day: DayOfWeek) => {
    const order = state.tasks.filter((task) => task.dayOfWeek === day).length
    setTasks([...state.tasks, newTaskDraft(day, order)])
  }
  const removeTask = (key: string) => setTasks(state.tasks.filter((task) => task.key !== key))

  return (
    <div className="space-y-5">
      {DAYS.map((day) => {
        const dayTasks = state.tasks.filter((task) => task.dayOfWeek === day)
        return (
          <div key={day} className="rounded-xl border border-ink/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ink">{t(`wizard.days.${day}`)}</h3>
              <Button size="sm" variant="outline" data-testid={`add-task-${day}`} onClick={() => addTask(day)}>
                <Plus className="h-4 w-4" /> {t('wizard.addTask')}
              </Button>
            </div>
            {dayTasks.length === 0 ? (
              <p className="text-sm text-muted">—</p>
            ) : (
              <div className="space-y-3">
                {dayTasks.map((task) => (
                  <div key={task.key} className="space-y-2 rounded-lg bg-ink/[0.03] p-3">
                    <div className="flex gap-2">
                      <Input data-testid={`task-title-${task.key}`} placeholder={t('wizard.taskTitle')}
                        value={task.title} maxLength={128}
                        onChange={(e) => patchTask(task.key, { title: e.target.value })} />
                      <Button size="icon" variant="ghost" data-testid={`remove-task-${task.key}`}
                        className="shrink-0 text-error-500 hover:bg-error-500/10 hover:text-error-500"
                        onClick={() => removeTask(task.key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input data-testid={`task-subject-${task.key}`} placeholder={t('wizard.subject')}
                        value={task.subject} maxLength={64} className="flex-1"
                        onChange={(e) => patchTask(task.key, { subject: e.target.value })} />
                      <Input data-testid={`task-minutes-${task.key}`} type="number" min={1} max={600}
                        placeholder={t('wizard.minutes')} value={task.estimatedMinutes ?? ''} className="w-32"
                        onChange={(e) => patchTask(task.key, { estimatedMinutes: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted">{t('wizard.reward')}:</span>
                      <button type="button" data-testid={`reward-random-${task.key}`}
                        onClick={() => patchTask(task.key, { rewardMode: 'random', rewardItemId: null })}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          task.rewardMode === 'random' ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-ink/15 text-muted'}`}>
                        {t('wizard.rewardRandom')}
                      </button>
                      <button type="button" data-testid={`reward-specific-${task.key}`}
                        onClick={() => patchTask(task.key, { rewardMode: 'specific' })}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          task.rewardMode === 'specific' ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-ink/15 text-muted'}`}>
                        {t('wizard.rewardSpecific')}
                      </button>
                      {task.rewardMode === 'specific' && (
                        rewardItems.length === 0 ? (
                          <span className="text-sm text-error-500">{t('wizard.noReward')}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {rewardItems.map((r) => (
                              <button key={r.id} type="button" data-testid={`reward-item-${task.key}-${r.id}`}
                                onClick={() => patchTask(task.key, { rewardItemId: r.id })}
                                className={`rounded-full border px-2.5 py-1 text-sm ${
                                  task.rewardItemId === r.id ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-ink/15 text-ink hover:bg-ink/5'}`}>
                                {r.glyph ?? '🎁'} {r.name}
                              </button>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- StepTasks`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/features/journeys/wizard/StepTasks.tsx src/features/journeys/wizard/StepTasks.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 向导步骤 周任务计划(7 天/奖励指定或随机)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 向导编排器(`JourneyWizard`)

**Files:**
- Create: `frontend/parent-web/src/features/journeys/wizard/JourneyWizard.tsx`
- Test: `frontend/parent-web/src/features/journeys/wizard/JourneyWizard.test.tsx`

**Interfaces:**
- Consumes:全部 Step 组件、`WizardState`、校验器、`useActiveRewardItems`/`useActiveMedals`、`PublishResult`;既有 `ui/button`、`sonner` toast。
- Produces:`JourneyWizard({ initialState, submitLabelKey, onSubmit, onDone, onCancel })`,其中 `onSubmit: (s: WizardState) => Promise<PublishResult>`。内部管理步骤 0..3、Next/Back 校验、末步提交 → `onDone(result)`。

- [ ] **Step 1: 写失败测试 `JourneyWizard.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listActiveRewardItems: vi.fn().mockResolvedValue([]),
  listActiveMedals: vi.fn().mockResolvedValue([{ id: 'm1', name: '毕业勋章', isActive: true, displayOrder: 0 }]),
  listActivePetSpecies: vi.fn().mockResolvedValue([]),
}))
import { JourneyWizard } from './JourneyWizard'
import { emptyWizardState } from './wizardTypes'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('JourneyWizard', () => {
  it('blocks Next on basics until title + valid dates are set', async () => {
    const onSubmit = vi.fn()
    ui(<JourneyWizard initialState={emptyWizardState('c1')} submitLabelKey="wizard.publish"
      onSubmit={onSubmit} onDone={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByTestId('wiz-next'))
    // 仍在第 1 步(基本信息):title 输入仍在
    expect(screen.getByTestId('wiz-title')).toBeInTheDocument()
  })

  it('walks all steps and submits, then calls onDone', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ journeyId: 'j1', failedTasks: 0 })
    const onDone = vi.fn()
    ui(<JourneyWizard initialState={emptyWizardState('c1')} submitLabelKey="wizard.publish"
      onSubmit={onSubmit} onDone={onDone} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByTestId('wiz-title'), { target: { value: '暑假之旅' } })
    fireEvent.change(screen.getByTestId('wiz-start'), { target: { value: '2026-07-01' } })
    fireEvent.change(screen.getByTestId('wiz-end'), { target: { value: '2026-08-31' } })
    fireEvent.click(screen.getByTestId('wiz-next')) // → tasks
    fireEvent.click(screen.getByTestId('wiz-next')) // → medal
    await waitFor(() => expect(screen.getByTestId('medal-m1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('medal-m1'))
    fireEvent.click(screen.getByTestId('wiz-next')) // → review
    fireEvent.click(screen.getByTestId('wiz-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ journeyId: 'j1', failedTasks: 0 }))
    const submitted = onSubmit.mock.calls[0][0]
    expect(submitted.title).toBe('暑假之旅')
    expect(submitted.medalId).toBe('m1')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- JourneyWizard`
Expected: FAIL —— 组件不存在。

- [ ] **Step 3: 实现 `JourneyWizard.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useActiveRewardItems, useActiveMedals } from '@/hooks/useCatalog'
import { StepBasics } from './StepBasics'
import { StepTasks } from './StepTasks'
import { StepMedal } from './StepMedal'
import { StepReview } from './StepReview'
import { validateBasics, validateTasks, validateMedal } from './wizardTypes'
import type { WizardState, WizardTaskDraft } from './wizardTypes'
import type { PublishResult } from './submitJourney'

interface Props {
  initialState: WizardState
  submitLabelKey: string
  onSubmit: (state: WizardState) => Promise<PublishResult>
  onDone: (result: PublishResult) => void
  onCancel: () => void
}

const STEP_KEYS = ['wizard.stepBasics', 'wizard.stepTasks', 'wizard.stepMedal', 'wizard.stepReview']

export function JourneyWizard({ initialState, submitLabelKey, onSubmit, onDone, onCancel }: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<WizardState>(initialState)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { data: rewardItems = [] } = useActiveRewardItems()
  const { data: medals = [] } = useActiveMedals()

  const patch = (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p }))
  const setTasks = (tasks: WizardTaskDraft[]) => setState((s) => ({ ...s, tasks }))

  const errorForStep = (): string | null => {
    if (step === 0) return validateBasics(state)
    if (step === 1) return validateTasks(state)
    if (step === 2) return validateMedal(state)
    return null
  }
  const stepErrorMessage: Record<string, string> = {
    title: t('wizard.titleRequired'), dates: t('wizard.titleRequired'), dateOrder: t('wizard.dateOrderError'),
    taskTitle: t('wizard.taskTitle'), taskReward: t('wizard.rewardSpecific'), medal: t('wizard.selectMedalRequired'),
  }

  const goNext = () => {
    const err = errorForStep()
    if (err) { toast.error(stepErrorMessage[err] ?? err); return }
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1))
  }
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const submit = async () => {
    const err = validateBasics(state) ?? validateTasks(state) ?? validateMedal(state)
    if (err) { toast.error(stepErrorMessage[err] ?? err); return }
    setSubmitting(true)
    try {
      const result = await onSubmit(state)
      onDone(result)
    } catch {
      toast.error('出错了，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  const isLast = step === STEP_KEYS.length - 1

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ol className="flex items-center gap-2 text-sm">
        {STEP_KEYS.map((key, i) => (
          <li key={key} className={`flex items-center gap-2 ${i === step ? 'font-semibold text-brand-600' : 'text-muted'}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full border text-xs ${
              i === step ? 'border-brand-600 bg-brand-50' : 'border-ink/20'}`}>{i + 1}</span>
            <span className="hidden sm:inline">{t(key)}</span>
            {i < STEP_KEYS.length - 1 && <span className="mx-1 text-ink/20">›</span>}
          </li>
        ))}
      </ol>

      <div>
        {step === 0 && <StepBasics state={state} patch={patch} />}
        {step === 1 && <StepTasks state={state} setTasks={setTasks} rewardItems={rewardItems} />}
        {step === 2 && <StepMedal state={state} patch={patch} medals={medals} />}
        {step === 3 && <StepReview state={state} medals={medals} rewardItems={rewardItems} />}
      </div>

      <div className="flex items-center justify-between border-t border-ink/10 pt-4">
        <Button variant="ghost" onClick={onCancel}>{t('wizard.cancel')}</Button>
        <div className="flex gap-2">
          {step > 0 && <Button variant="outline" data-testid="wiz-back" onClick={goBack}>{t('wizard.back')}</Button>}
          {!isLast && <Button data-testid="wiz-next" onClick={goNext}>{t('wizard.next')}</Button>}
          {isLast && <Button data-testid="wiz-submit" disabled={submitting} onClick={submit}>{t(submitLabelKey)}</Button>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- JourneyWizard`
Expected: PASS。

- [ ] **Step 5: typecheck + 提交**

Run: `npm run typecheck`
Expected: 无错误。

```bash
git add src/features/journeys/wizard/JourneyWizard.tsx src/features/journeys/wizard/JourneyWizard.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 旅程创建向导编排器(分步校验 + 提交回调)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 旅程列表页(`JourneysPage`)+ 路由

**Files:**
- Create: `frontend/parent-web/src/features/journeys/JourneysPage.tsx`
- Modify: `frontend/parent-web/src/App.tsx`(加 `/journeys` 路由 + import)
- Test: `frontend/parent-web/src/features/journeys/JourneysPage.test.tsx`

**Interfaces:**
- Consumes:`useChildren`、`useJourneys`、`useJourneyMutations`、`useActivePetSpecies`、`useActiveMedals`;`useConfirm`;`JourneyDto`;react-router `useNavigate`。
- Produces:`JourneysPage` 组件(default 命名导出 `export function JourneysPage`)。路由 `/journeys` 渲染它。

- [ ] **Step 1: 写失败测试 `JourneysPage.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listChildren: vi.fn().mockResolvedValue([{ id: 'c1', displayName: '哥哥', grade: 3, hasPin: false }]),
  listJourneys: vi.fn().mockResolvedValue([
    { id: 'j1', childId: 'c1', title: '暑假之旅', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 0, currentLevel: 1, growthPoints: 0 },
  ]),
  listActivePetSpecies: vi.fn().mockResolvedValue([]),
  listActiveMedals: vi.fn().mockResolvedValue([{ id: 'm1', name: '毕业勋章', isActive: true, displayOrder: 0 }]),
  deleteJourney: vi.fn(),
  createJourney: vi.fn(), updateJourney: vi.fn(),
}))
import { JourneysPage } from './JourneysPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('JourneysPage', () => {
  it('lists the selected child journeys with a draft badge', async () => {
    ui(<JourneysPage />)
    await waitFor(() => expect(screen.getByText('暑假之旅')).toBeInTheDocument())
    expect(screen.getByTestId('journey-status-j1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- JourneysPage`
Expected: FAIL —— 组件不存在。

- [ ] **Step 3: 实现 `JourneysPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Map } from 'lucide-react'
import { useChildren } from '@/hooks/useChildren'
import { useJourneys, useJourneyMutations } from '@/hooks/useJourneys'
import { useActivePetSpecies, useActiveMedals } from '@/hooks/useCatalog'
import { useConfirm } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { JourneyDto } from '@/types/homework'

const STATUS_LABEL: Record<number, string> = { 0: 'journeys.statusDraft', 1: 'journeys.statusActive', 2: 'journeys.statusCompleted' }
const STATUS_VARIANT: Record<number, 'secondary' | 'success' | 'default'> = { 0: 'secondary', 1: 'default', 2: 'success' }

export function JourneysPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { data: children = [] } = useChildren()
  const [childId, setChildId] = useState('')
  const activeChild = childId || children[0]?.id || ''

  const { data: journeys = [], isLoading } = useJourneys(activeChild)
  const { data: species = [] } = useActivePetSpecies()
  const { data: medals = [] } = useActiveMedals()
  const m = useJourneyMutations(activeChild)

  const petName = (j: JourneyDto) => species.find((s) => s.id === j.petSpeciesId)?.name ?? t('journeys.petPending')
  const medalName = (j: JourneyDto) => medals.find((md) => md.id === j.medalId)?.name ?? '—'

  if (children.length === 0) {
    return <div className="rounded-xl border border-dashed border-ink/20 p-10 text-center text-muted">{t('journeys.noChildren')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{t('journeys.title')}</h1>
        <Button data-testid="create-journey" disabled={!activeChild}
          onClick={() => navigate(`/journeys/new?childId=${activeChild}`)}>
          <Plus className="h-4 w-4" /> {t('journeys.create')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {children.map((c) => (
          <button key={c.id} type="button" data-testid={`child-tab-${c.id}`}
            onClick={() => setChildId(c.id)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              activeChild === c.id ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-ink/15 text-ink hover:bg-ink/5'}`}>
            {c.displayName}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted">{t('common.loading')}</div>
      ) : journeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 p-12 text-center">
          <Map className="mx-auto mb-4 h-12 w-12 text-muted" />
          <p className="text-muted">{t('journeys.empty')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journeys.map((j) => (
            <Card key={j.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-semibold text-ink">{j.title}</h3>
                  <Badge data-testid={`journey-status-${j.id}`} variant={STATUS_VARIANT[j.status]} className="shrink-0 text-xs">
                    {t(STATUS_LABEL[j.status])}
                  </Badge>
                </div>
                <div className="text-sm text-muted">{j.startDate} → {j.endDate}</div>
                {j.status === 1 && (
                  <div className="text-sm text-ink">{petName(j)} · {t('journeys.level')} {j.currentLevel}</div>
                )}
                {j.status === 2 && (
                  <div className="text-sm text-ink">🏅 {medalName(j)}</div>
                )}
                {j.status === 0 && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" data-testid={`edit-journey-${j.id}`}
                      onClick={() => navigate(`/journeys/${j.id}/edit`)}>
                      <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="ghost" data-testid={`delete-journey-${j.id}`}
                      className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                      onClick={async () => {
                        if (await confirm(t('journeys.deleteConfirmTitle'), t('journeys.deleteConfirmBody'))) {
                          m.remove.mutate(j.id)
                        }
                      }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 加路由到 `App.tsx`**

在 import 区加 `import { JourneysPage } from '@/features/journeys/JourneysPage'`,并在 `AppLayout` 的 `<Route element={<AppLayout />}>` 内(`/board` 之后)加:

```tsx
          <Route path="/journeys" element={<JourneysPage />} />
```

- [ ] **Step 5: 运行确认通过 + typecheck**

Run: `npm test -- JourneysPage`
Expected: PASS。
Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/features/journeys/JourneysPage.tsx src/features/journeys/JourneysPage.test.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 旅程列表页(按孩子/状态徽章/删除草稿)+ 路由

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: 创建旅程页(`JourneyNewPage`)+ 路由

**Files:**
- Create: `frontend/parent-web/src/features/journeys/JourneyNewPage.tsx`
- Modify: `frontend/parent-web/src/App.tsx`(加 `/journeys/new` 路由 + import)
- Test: `frontend/parent-web/src/features/journeys/JourneyNewPage.test.tsx`

**Interfaces:**
- Consumes:`JourneyWizard`、`publishNewJourney`、`emptyWizardState`;react-router `useSearchParams`/`useNavigate`/`Navigate`;`sonner` toast。
- Produces:`JourneyNewPage`。读 `?childId=`;缺失则重定向 `/journeys`。向导 `onSubmit={publishNewJourney}`;`onDone`:`failedTasks>0` → toast 警告 + 跳编辑页;否则 toast 成功 + 回 `/journeys`。

- [ ] **Step 1: 写失败测试 `JourneyNewPage.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listActiveRewardItems: vi.fn().mockResolvedValue([]),
  listActiveMedals: vi.fn().mockResolvedValue([]),
}))
vi.mock('./wizard/submitJourney', () => ({ publishNewJourney: vi.fn() }))
import { JourneyNewPage } from './JourneyNewPage'

function ui(initialPath: string, node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/journeys/new" element={node} />
          <Route path="/journeys" element={<div>journeys-list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('JourneyNewPage', () => {
  it('redirects to /journeys when childId is missing', async () => {
    ui('/journeys/new', <JourneyNewPage />)
    await waitFor(() => expect(screen.getByText('journeys-list')).toBeInTheDocument())
  })
  it('renders the wizard when childId is present', () => {
    ui('/journeys/new?childId=c1', <JourneyNewPage />)
    expect(screen.getByTestId('wiz-title')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- JourneyNewPage`
Expected: FAIL。

- [ ] **Step 3: 实现 `JourneyNewPage.tsx`**

```tsx
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { JourneyWizard } from './wizard/JourneyWizard'
import { emptyWizardState } from './wizard/wizardTypes'
import { publishNewJourney } from './wizard/submitJourney'

export function JourneyNewPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const childId = params.get('childId') ?? ''
  if (!childId) return <Navigate to="/journeys" replace />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t('journeys.create')}</h1>
      <JourneyWizard
        initialState={emptyWizardState(childId)}
        submitLabelKey="wizard.publish"
        onSubmit={publishNewJourney}
        onCancel={() => navigate('/journeys')}
        onDone={(r) => {
          if (r.failedTasks > 0) {
            toast.warning(t('wizard.publishPartial'))
            navigate(`/journeys/${r.journeyId}/edit`)
          } else {
            toast.success(t('wizard.publishSuccess'))
            navigate('/journeys')
          }
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: 加路由到 `App.tsx`**

import 加 `import { JourneyNewPage } from '@/features/journeys/JourneyNewPage'`;在 `/journeys` 路由之后加:

```tsx
          <Route path="/journeys/new" element={<JourneyNewPage />} />
```

- [ ] **Step 5: 运行确认通过 + typecheck**

Run: `npm test -- JourneyNewPage`
Expected: PASS。
Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/features/journeys/JourneyNewPage.tsx src/features/journeys/JourneyNewPage.test.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 创建旅程页(向导 + 部分失败跳编辑)+ 路由

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: 编辑草稿旅程页(`JourneyEditPage`)+ 路由

**Files:**
- Create: `frontend/parent-web/src/features/journeys/JourneyEditPage.tsx`
- Modify: `frontend/parent-web/src/App.tsx`(加 `/journeys/:id/edit` 路由 + import)
- Test: `frontend/parent-web/src/features/journeys/JourneyEditPage.test.tsx`

**Interfaces:**
- Consumes:`useJourney`、`useJourneyTemplates`(读取现有);`JourneyWizard`、`saveJourneyEdits`、`draftFromTemplate`、`WizardState`;react-router `useParams`/`useNavigate`。
- Produces:`JourneyEditPage`。`status===0`(Draft)→ 用现有 journey + templates 构造 `initialState` 进向导(`onSubmit={(s)=>saveJourneyEdits(id, s)}`);`status!==0` → 只读提示 `journeys.readOnlyActive`。

- [ ] **Step 1: 写失败测试 `JourneyEditPage.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  getJourney: vi.fn(),
  listJourneyTemplates: vi.fn().mockResolvedValue([]),
  listActiveRewardItems: vi.fn().mockResolvedValue([]),
  listActiveMedals: vi.fn().mockResolvedValue([]),
}))
import { getJourney } from '@/services/homeworkService'
import { JourneyEditPage } from './JourneyEditPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/journeys/j1/edit']}>
        <Routes><Route path="/journeys/:id/edit" element={node} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>
beforeEach(() => vi.clearAllMocks())

describe('JourneyEditPage', () => {
  it('shows the wizard prefilled for a Draft journey', async () => {
    mock(getJourney).mockResolvedValue({ id: 'j1', childId: 'c1', title: '暑假之旅', description: '', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 0, currentLevel: 1, growthPoints: 0 })
    ui(<JourneyEditPage />)
    await waitFor(() => expect(screen.getByTestId('wiz-title')).toHaveValue('暑假之旅'))
  })
  it('shows read-only notice for an Active journey', async () => {
    mock(getJourney).mockResolvedValue({ id: 'j1', childId: 'c1', title: 'A', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 1, currentLevel: 2, growthPoints: 10 })
    ui(<JourneyEditPage />)
    await waitFor(() => expect(screen.getByTestId('journey-readonly')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- JourneyEditPage`
Expected: FAIL。

- [ ] **Step 3: 实现 `JourneyEditPage.tsx`**

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useJourney } from '@/hooks/useJourneys'
import { useJourneyTemplates } from '@/hooks/useJourneyTemplates'
import { JourneyWizard } from './wizard/JourneyWizard'
import { draftFromTemplate } from './wizard/wizardTypes'
import type { WizardState } from './wizard/wizardTypes'
import { saveJourneyEdits } from './wizard/submitJourney'

export function JourneyEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: journey, isLoading } = useJourney(id)
  const { data: templates, isLoading: tplLoading } = useJourneyTemplates(id)

  if (isLoading || !journey) {
    return <div className="py-12 text-center text-muted">{t('common.loading')}</div>
  }
  if (journey.status !== 0) {
    return (
      <div data-testid="journey-readonly" className="space-y-3">
        <h1 className="text-2xl font-bold text-ink">{journey.title}</h1>
        <div className="rounded-xl border border-dashed border-ink/20 p-8 text-center text-muted">
          {t('journeys.readOnlyActive')}
        </div>
      </div>
    )
  }
  if (tplLoading || !templates) {
    return <div className="py-12 text-center text-muted">{t('common.loading')}</div>
  }

  const initialState: WizardState = {
    childId: journey.childId,
    title: journey.title,
    description: journey.description ?? '',
    startDate: journey.startDate,
    endDate: journey.endDate,
    medalId: journey.medalId,
    tasks: templates.map(draftFromTemplate),
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{journey.title}</h1>
      <JourneyWizard
        initialState={initialState}
        submitLabelKey="wizard.save"
        onSubmit={(s) => saveJourneyEdits(id, s)}
        onCancel={() => navigate('/journeys')}
        onDone={(r) => {
          if (r.failedTasks > 0) {
            toast.warning(t('wizard.publishPartial'))
          } else {
            toast.success(t('wizard.saveSuccess'))
            navigate('/journeys')
          }
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: 加路由到 `App.tsx`**

import 加 `import { JourneyEditPage } from '@/features/journeys/JourneyEditPage'`;在 `/journeys/new` 之后加:

```tsx
          <Route path="/journeys/:id/edit" element={<JourneyEditPage />} />
```

- [ ] **Step 5: 运行确认通过 + typecheck**

Run: `npm test -- JourneyEditPage`
Expected: PASS。
Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/features/journeys/JourneyEditPage.tsx src/features/journeys/JourneyEditPage.test.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 编辑草稿旅程页(复用向导 + 只读态)+ 路由

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: 首页改为旅程为中心(`HomePage`)

**Files:**
- Modify: `frontend/parent-web/src/features/home/HomePage.tsx`(整体改写,移除 `useGoals` 依赖)
- Test: `frontend/parent-web/src/features/home/HomePage.test.tsx`

**Interfaces:**
- Consumes:`useChildren`、`useJourneys`、`useDailyBoard`;react-router `Link`;既有 `StarRating`、`ui/card`、`ui/button`。**不再** import `useGoals`。
- Produces:改写后的 `HomePage`。按孩子展示 Active 旅程摘要(宠物待定/等级/成长)+ 今日看板要点;无 Active 旅程 → 引导创建。

- [ ] **Step 1: 写失败测试 `HomePage.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listChildren: vi.fn().mockResolvedValue([{ id: 'c1', displayName: '哥哥', grade: 3, hasPin: false }]),
  listJourneys: vi.fn().mockResolvedValue([
    { id: 'j1', childId: 'c1', title: '暑假之旅', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 1, currentLevel: 2, growthPoints: 30 },
  ]),
  getDailyBoard: vi.fn().mockResolvedValue({ childId: 'c1', date: 'x', tasks: [], tasksTotal: 3, tasksCompleted: 1, stars: 2, isFull: false, isRestDay: false }),
}))
import { HomePage } from './HomePage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('HomePage', () => {
  it('shows the active journey summary for each child', async () => {
    ui(<HomePage />)
    await waitFor(() => expect(screen.getByText('暑假之旅')).toBeInTheDocument())
    expect(screen.getByText('哥哥')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- HomePage`
Expected: FAIL(当前 HomePage 依赖 `useGoals`,mock 未提供 `listGoals` → 且无旅程摘要)。

- [ ] **Step 3: 改写 `HomePage.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useChildren } from '@/hooks/useChildren'
import { useJourneys } from '@/hooks/useJourneys'
import { useDailyBoard } from '@/hooks/useDailyBoard'
import { StarRating } from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ChildProfileDto } from '@/types/homework'

const today = new Date().toISOString().slice(0, 10)

function ChildJourneyCard({ child }: { child: ChildProfileDto }) {
  const { t } = useTranslation()
  const { data: journeys = [] } = useJourneys(child.id)
  const { data: board } = useDailyBoard(child.id, today)
  const active = journeys.find((j) => j.status === 1)

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{child.avatarKey ?? '🐼'}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-ink">{child.displayName}</div>
            <div className="text-sm text-muted">{child.grade} {t('children.grade')}</div>
          </div>
        </div>

        {active ? (
          <>
            <div className="font-medium text-ink">{active.title}</div>
            <div className="text-sm text-muted">{t('journeys.level')} {active.currentLevel} · {active.startDate} → {active.endDate}</div>
            {board && (
              <>
                <StarRating stars={board.stars} />
                <div className="text-sm text-muted">
                  {board.tasksCompleted}/{board.tasksTotal}
                  {board.isFull && <span className="ml-2 font-semibold text-brand-600">{t('board.fullAttendance')}</span>}
                </div>
              </>
            )}
            <Link to="/board"><Button size="sm" variant="outline" className="w-full">{t('board.title')}</Button></Link>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('journeys.empty')}</p>
            <Link to={`/journeys/new?childId=${child.id}`}>
              <Button size="sm" className="w-full">{t('journeys.create')}</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  const { t } = useTranslation()
  const { data: children = [], isLoading } = useChildren()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t('nav.home')}</h1>
      {isLoading ? (
        <div className="py-8 text-center text-muted">{t('common.loading')}</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 p-10 text-center text-muted">
          {t('journeys.noChildren')}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <ChildJourneyCard key={child.id} child={child} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过 + typecheck**

Run: `npm test -- HomePage`
Expected: PASS。
Run: `npm run typecheck`
Expected: 无错误(此时 HomePage 不再 import `useGoals`)。

- [ ] **Step 5: 提交**

```bash
git add src/features/home/HomePage.tsx src/features/home/HomePage.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 首页改为旅程为中心(去除家庭目标聚合)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: 导航与路由切换(`AppLayout` + `App.tsx`)

**Files:**
- Modify: `frontend/parent-web/src/components/layout/AppLayout.tsx`(nav:`Journeys` 取代 `Schedule` + `Goals`)
- Modify: `frontend/parent-web/src/App.tsx`(删除 `/schedule`、`/goals` 路由与其 import)

**Interfaces:**
- Consumes:`nav.journeys` i18n 键(Task 4 已加)。
- Produces:侧边导航为 `Home · Children · Board · Journeys`;`/schedule`、`/goals` 路由移除。旧页面文件仍在磁盘(Task 15 删),但不再被引用。

- [ ] **Step 1: 改 `AppLayout.tsx` 的 nav**

把第 5 行 icon import 与 `nav` 数组改为:

```tsx
import { Home, Users, ClipboardCheck, Map } from 'lucide-react'
```

```tsx
const nav = [
  { to: '/home', icon: Home, key: 'nav.home' },
  { to: '/children', icon: Users, key: 'nav.children' },
  { to: '/board', icon: ClipboardCheck, key: 'nav.board' },
  { to: '/journeys', icon: Map, key: 'nav.journeys' },
]
```

- [ ] **Step 2: 改 `App.tsx` —— 删旧路由与 import**

删除这两行 import:

```tsx
import { WeeklyTemplatePage } from '@/features/schedule/WeeklyTemplatePage'
import { FamilyGoalsPage } from '@/features/goals/FamilyGoalsPage'
```

删除这两条 Route:

```tsx
          <Route path="/schedule" element={<WeeklyTemplatePage />} />
          <Route path="/goals" element={<FamilyGoalsPage />} />
```

- [ ] **Step 3: 构建确认整体绿**

Run: `npm run build`
Expected: `tsc -b` + vite build 成功(旧页面文件虽在但不再被 import;`useWeeklyTemplates`/`useGoals` 仅被将删的旧页面引用,构建仍绿)。
Run: `npm test`
Expected: 全部测试 PASS。

- [ ] **Step 4: 提交**

```bash
git add src/components/layout/AppLayout.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 导航归一为旅程(Journeys 取代 Schedule+Goals),移除旧路由

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: 清理 Phase 2 打断的遗留代码

**Files:**
- Delete: `frontend/parent-web/src/features/goals/`(整目录:`FamilyGoalsPage.tsx`、`GoalFormDialog.tsx`)
- Delete: `frontend/parent-web/src/features/schedule/`(整目录:`WeeklyTemplatePage.tsx`、`TemplateItemDialog.tsx`)
- Delete: `frontend/parent-web/src/hooks/useGoals.ts`、`frontend/parent-web/src/hooks/useWeeklyTemplates.ts`
- Modify: `frontend/parent-web/src/services/homeworkService.ts`(删 family-goal / weekly-task-template 方法 + 其类型 import)
- Modify: `frontend/parent-web/src/types/homework.ts`(删 `WeeklyTaskTemplateItemDto` 家族、`FamilyGoalDto` 家族)
- Modify: `public/locales/zh-CN/translation.json`、`public/locales/en/translation.json`(删 `nav.schedule`、`nav.goals`、`schedule.*`、`goals.*`)

**Interfaces:**
- Consumes:—(纯删除)。
- Produces:代码库不再有 family-goal / weekly-task-template 的任何引用。注意保留 `DayOfWeek` 类型(旅程模板仍在用)与 `board.*` i18n 键。

- [ ] **Step 1: 删除旧页面与 hook 文件**

```bash
git rm -r src/features/goals src/features/schedule
git rm src/hooks/useGoals.ts src/hooks/useWeeklyTemplates.ts
```

- [ ] **Step 2: 从 `homeworkService.ts` 删旧方法**

删除 `// ---- weekly-task-template ----` 段(4 个方法)与 `// ---- family-goal ----` 段(5 个方法);并把顶部 import 里已不再使用的类型移除:`WeeklyTaskTemplateItemDto, CreateWeeklyTaskTemplateItemDto, UpdateWeeklyTaskTemplateItemDto, GetWeeklyTemplateInput, FamilyGoalDto, CreateUpdateFamilyGoalDto`。**保留** `DailyTaskDto` 等仍用到的类型。

- [ ] **Step 3: 从 `types/homework.ts` 删旧类型**

删除 `// ---- Weekly template ----` 段里的 `WeeklyTaskTemplateItemDto` / `CreateWeeklyTaskTemplateItemDto` / `UpdateWeeklyTaskTemplateItemDto` / `GetWeeklyTemplateInput`(**保留** `export type DayOfWeek`,旅程模板在用),以及整个 `// ---- Family goal ----` 段(`FamilyGoalDto` / `CreateUpdateFamilyGoalDto`)。

- [ ] **Step 4: 删旧 i18n 键(两套 locale)**

从 `zh-CN` 与 `en` 的 `nav` 中删 `schedule`、`goals` 两键;删除顶层 `"schedule": {…}` 与 `"goals": {…}` 两个命名空间。保留 `board.*`。删除后重新跑键一致性测试。

- [ ] **Step 5: 全量构建 + 测试 + typecheck**

Run: `npm run typecheck`
Expected: 无错误(确认无残留引用 `useGoals`/`useWeeklyTemplates`/已删类型/已删服务方法)。
Run: `npm test`
Expected: 全部 PASS(含 `locales` 键一致性——两套仍相等)。
Run: `npm run build`
Expected: 成功。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(parent-web): 删除 Phase 2 打断的家庭目标/周模板遗留代码与文案

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 最终验收

全部任务完成后运行,确保端到端绿:

- 后端:`dotnet test backend/test/Homework.Domain.Tests backend/test/Homework.EntityFrameworkCore.Tests` → 全绿(EFCore 在既有 58 基础上 +2 种子测试)。
- 前端(在 `frontend/parent-web`):`npm run build && npm test` → 构建成功、vitest 全绿。
- 手动冒烟(可选,需后端跑起来 + `DbMigrator` 已种子):登录 demo → Journeys → 选孩子 → 创建旅程(4 步向导:基本信息 → 加周任务并配奖励 → 选勋章 → 预览发布)→ 列表出现 Draft 旅程 → 编辑草稿(增删任务)→ 保存。

**功能覆盖回溯(spec §1 范围):**
1. 修复被打断功能 → Task 2/3/13/14/15(服务/hook/首页/导航切换 + 删旧)。
2. 信息架构归一「旅程」区 → Task 10/14。
3. 创建旅程多步向导 → Task 5–9 + 11。
4. 只读消费图鉴 → Task 2/3(active-list 服务与 hook)+ 向导内 StepMedal/StepTasks。
5. 后端开发种子 → Task 1。
6. 编辑草稿(复用向导 + 差量提交)→ Task 6/12。

**部署提示(承 spec §9 + NEXT-STEPS §0):** 上线前确认 `CatalogSampleDataSeedContributor` 是否要保留(仅空表插入,不覆盖真实数据;Slice C 图鉴后台落地后可移除或加环境开关)。其余 Aliyun/CDN/DbMigrator 前置见 `NEXT-STEPS.md` §0。
