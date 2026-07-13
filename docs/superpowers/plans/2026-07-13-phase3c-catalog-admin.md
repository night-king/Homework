# Phase 3C — 图鉴管理后台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `parent-web` 内新增 admin 权限门控的「图鉴管理」后台,把已存在的后端道具/勋章/宠物 CRUD + 上传 + 启停接线成可视化界面。

**Architecture:** 纯前端 + 接线,后端不改。沿用既有分层(axios `api` → `homeworkService` → TanStack Query `use*` hooks → 页面/组件)。门控复用 `authStore` 已有的 `permissions` / `hasPermission`(ABP `grantedPolicies`)。宠物走两段式(创建 dialog → `/catalog/pets/:id` 详情页:5 形态 + 上传 + 完整度 + 启用)。共享一个 `FileUploadField` 处理所有上传(multipart)。

**Tech Stack:** React 19 / Vite 6 / react-router-dom 7 / @tanstack/react-query 5 / zustand 5 / axios / Radix + shadcn `src/components/ui/*` / Tailwind 4 / i18next / vitest 3 + @testing-library/react 16(`globals: true`, `environment: jsdom`, alias `@`→`src`)。

## Global Constraints

- **提交规范**:Conventional Commits,前端 scope `parent-web`。每个 commit message 末尾追加一行(空行后):
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **分支**:在新分支 `feature/catalog-admin` 上实现(不要直接提交 `main`)。
- **后端不改**:除非 Task 1 的 Swagger 核实发现上传绑定与文档契约不符;那属于计划外,需向 controller 上报而非自行改后端。
- **上传 multipart gotcha**:现有 `api` 实例默认头 `Content-Type: application/json` 会破坏 multipart。所有文件上传必须经 `uploadFile()` 帮手,把 `Content-Type` 置 `undefined`,让浏览器自带 boundary。
- **上传 HTTP 契约(Task 1 核实后锁定)**:约定 multipart 文件字段名 `file`;宠物 `level` 走 query(`?level={n}`)。路径见 spec §4。若 Task 1 发现不同,以核实结果为准并在 Task 2 采用。
- **权限门控是 UX 层**:`hasPermission('Homework.Catalog.{Pets,RewardItems,Medals}')` 驱动 nav/tab/操作显隐;真正强制在后端 `[Authorize]`。常量集中在 `src/lib/permissions.ts`。
- **测试策略**:i18n 在 jsdom 返回 key(`src/test-setup.ts` 全局 `vi.mock('@/i18n/config')` 已存在),断言用 `data-testid` + 动态内容/mock 调用参数,不依赖译文。含 JSX 的测试用 `.test.tsx`。
- **DateOnly/数值契约**:DTO 数值字段对齐后端注解(道具 `growthValue≥1`、`randomWeight≥0`;宠物 `code` 必填;表单 `level 1..5`)。
- **不破坏既有绿**:当前 `main`(HEAD `7443470`)后端 Domain 56 + EFCore 61、前端 vitest 52 全绿。每个任务结束 `npm test` 相关项 + `npm run typecheck` 必须干净。

---

## File Structure

**新增**
- `frontend/parent-web/src/lib/permissions.ts` — `CatalogPermissions` 常量 + `hasAnyCatalog(has)` 纯函数。
- `frontend/parent-web/src/hooks/useAdminRewardItems.ts` / `useAdminMedals.ts` / `useAdminPetSpecies.ts` — 管理端查询 + mutations。
- `frontend/parent-web/src/features/catalog/CatalogPage.tsx` — tab 壳(权限门控)。
- `frontend/parent-web/src/features/catalog/FileUploadField.tsx` — 共享上传字段(图片/视频)。
- `frontend/parent-web/src/features/catalog/RewardItemsPanel.tsx` + `RewardItemDialog.tsx`。
- `frontend/parent-web/src/features/catalog/MedalsPanel.tsx` + `MedalDialog.tsx`。
- `frontend/parent-web/src/features/catalog/PetSpeciesPanel.tsx` + `PetSpeciesCreateDialog.tsx`。
- `frontend/parent-web/src/features/catalog/PetFormSection.tsx` — 单形态编辑(元数据 + 精灵图 + 进化视频)。
- `frontend/parent-web/src/features/catalog/PetSpeciesEditPage.tsx` — 宠物详情编辑页。
- 各自 `*.test.tsx`。

**修改**
- `src/types/homework.ts` — 增写入 DTO 类型。
- `src/services/homeworkService.ts` — 增管理端方法 + `uploadFile` 帮手。
- `src/components/layout/AppLayout.tsx` — nav 增权限门控的「图鉴管理」。
- `src/App.tsx` — 增 `/catalog`、`/catalog/pets/:id` 路由。
- `public/locales/{zh-CN,en}/translation.json` — 增 `nav.catalog` + `catalog.*`。

**不改**:`authStore.ts`(已有 `permissions`/`hasPermission`/`loadPermissions`,登录/初始化已调用)、后端全部。

---

## Task 1: Swagger 核实上传 HTTP 契约(spike,先做)

**Files:** 无代码改动。产出:把核实结论写入 `.superpowers/sdd/task-1-report.md`(或口头回报),供 Task 2 锁定 URL/字段名。

**Interfaces:**
- Consumes:后端 `Homework.HttpApi.Host`。
- Produces:确认(或修正)三条约定 —— (a) 上传 multipart 文件字段名(约定 `file`);(b) 宠物 `level` 参数位置(约定 query `?level={n}`);(c) 上传路径 kebab 形式(`upload-icon`/`upload-image`/`upload-cover`/`upload-form-sprite`/`upload-form-evolve-video`)与 `set-form`。

- [ ] **Step 1: 启动后端 Host**

Run: `dotnet run --project backend/src/Homework.HttpApi.Host`
Expected: 监听 `https://localhost:44394`。(生成 Swagger 定义**不需要** DB;即使 Postgres 未起,`/swagger` 仍可看端点结构。若 Host 因环境无法启动,跳到 Step 4 走兜底。)

- [ ] **Step 2: 打开 Swagger,核对三处**

浏览器开 `https://localhost:44394/swagger`(自签证书,接受风险)。在 `RewardItem` / `Medal` / `PetSpecies` 控制器下核对:
- `POST /api/app/reward-item/{id}/upload-icon` 的 requestBody 是 `multipart/form-data`,文件属性名是否为 `file`。
- `POST /api/app/pet-species/{id}/upload-form-sprite` 是否有 `level`(integer)**query** 参数 + multipart `file`。
- `POST /api/app/pet-species/{id}/set-form` body 是否为 `SetPetFormDto`(JSON)。
- 其余上传/启停路径与 spec §4 表一致。

- [ ] **Step 3: 记录结论**

把「字段名 = ___;level 位置 = ___;各路径确认/修正」写入报告。**若与约定一致**(预期如此,ABP 惯例:`IRemoteStreamContent` 参数名即字段名 `file`,primitive `level` 走 query)→ Task 2 按约定实现。**若不同** → 记下差异,Task 2 采用实测值。

- [ ] **Step 4(兜底):Host 无法启动时**

若环境无法运行 Host:采用 spec §4 记录的 ABP 惯例契约(字段名 `file`、`level` 走 query、路径如表),在报告中标注「未经 Swagger 实测,按 ABP 惯例」,继续 Task 2。后续任一上传若真机 415/400,再回头修 `uploadFile` 字段名。

- [ ] **Step 5: 停止 Host**

结束 `dotnet run`(Ctrl+C / 关闭后台进程)。无 commit。

---

## Task 2: 写入 DTO 类型 + 管理端 service 方法 + `uploadFile`

**Files:**
- Modify: `frontend/parent-web/src/types/homework.ts`(追加)
- Modify: `frontend/parent-web/src/services/homeworkService.ts`(追加)
- Test: `frontend/parent-web/src/services/homeworkService.test.ts`(追加用例)

**Interfaces:**
- Consumes:既有 `api`、`ListResult<T>`、只读 DTO `RewardItemDto`/`MedalDto`/`PetSpeciesDto`/`PetFormDto`;Task 1 的上传契约。
- Produces:类型 `CreateUpdateRewardItemDto`/`CreateUpdateMedalDto`/`CreateUpdatePetSpeciesDto`/`PetFormLevel`/`SetPetFormDto`;service 函数(见下)+ `uploadFile` 内部帮手。

- [ ] **Step 1: 写失败测试(追加到 `homeworkService.test.ts`)**

顶部 import 追加新函数,并加用例:

```ts
import {
  listAllRewardItems, createRewardItem, updateRewardItem, deleteRewardItem, uploadRewardItemIcon,
  listAllMedals, createMedal, uploadMedalImage,
  listAllPetSpecies, getPetSpecies, createPetSpecies, setPetForm,
  uploadPetCover, uploadPetFormSprite, uploadPetFormEvolveVideo, activatePetSpecies, deactivatePetSpecies,
} from './homeworkService'
```

```ts
  it('listAllRewardItems GETs full list and unwraps items', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [{ id: 'r1' }] } })
    expect(await listAllRewardItems()).toEqual([{ id: 'r1' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/reward-item')
  })
  it('createRewardItem POSTs dto', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'r1' } })
    const dto = { name: '书签', glyph: '✦', growthValue: 12, randomWeight: 1, displayOrder: 0, isActive: true }
    await createRewardItem(dto)
    expect(api.post).toHaveBeenCalledWith('/api/app/reward-item', dto)
  })
  it('updateRewardItem PUTs and deleteRewardItem DELETEs', async () => {
    ;(api.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })
    await updateRewardItem('r1', { name: 'x', growthValue: 12, randomWeight: 1, displayOrder: 0, isActive: false })
    expect(api.put).toHaveBeenCalledWith('/api/app/reward-item/r1', expect.objectContaining({ name: 'x' }))
    await deleteRewardItem('r1'); expect(api.delete).toHaveBeenCalledWith('/api/app/reward-item/r1')
  })
  it('uploadRewardItemIcon posts FormData with file field and undefined Content-Type', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'r1' } })
    const file = new File(['x'], 'i.png', { type: 'image/png' })
    await uploadRewardItemIcon('r1', file)
    const call = (api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)!
    expect(call[0]).toBe('/api/app/reward-item/r1/upload-icon')
    expect(call[1]).toBeInstanceOf(FormData)
    expect((call[1] as FormData).get('file')).toBe(file)
    expect(call[2].headers['Content-Type']).toBeUndefined()
  })
  it('uploadMedalImage targets /upload-image', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })
    await uploadMedalImage('m1', new File(['x'], 'm.png'))
    expect((api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toBe('/api/app/medal/m1/upload-image')
  })
  it('pet-species admin: list/get/create/setForm/uploads/activate paths', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [], id: 'p1' } })
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'p1' } })
    await listAllPetSpecies(); expect(api.get).toHaveBeenCalledWith('/api/app/pet-species')
    await getPetSpecies('p1'); expect(api.get).toHaveBeenCalledWith('/api/app/pet-species/p1')
    await createPetSpecies({ name: '火龙', code: 'dragon', displayOrder: 0 })
    expect(api.post).toHaveBeenCalledWith('/api/app/pet-species', expect.objectContaining({ code: 'dragon' }))
    await setPetForm('p1', { level: 2, name: '幼龙' })
    expect(api.post).toHaveBeenCalledWith('/api/app/pet-species/p1/set-form', expect.objectContaining({ level: 2 }))
    await uploadPetFormSprite('p1', 3, new File(['x'], 's.png'))
    expect((api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toBe('/api/app/pet-species/p1/upload-form-sprite?level=3')
    await uploadPetFormEvolveVideo('p1', 1, new File(['x'], 'v.mp4'))
    expect((api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toBe('/api/app/pet-species/p1/upload-form-evolve-video?level=1')
    await uploadPetCover('p1', new File(['x'], 'c.png'))
    expect((api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toBe('/api/app/pet-species/p1/upload-cover')
    await activatePetSpecies('p1'); expect(api.post).toHaveBeenCalledWith('/api/app/pet-species/p1/activate')
    await deactivatePetSpecies('p1'); expect(api.post).toHaveBeenCalledWith('/api/app/pet-species/p1/deactivate')
  })
```

- [ ] **Step 2: 运行确认失败**

Run(在 `frontend/parent-web`): `npm test -- homeworkService`
Expected: FAIL —— 新导出未定义。

- [ ] **Step 3: 追加类型(`src/types/homework.ts`)**

在 `// ---- Catalog (read-only) ----` 段之后追加:

```ts
// ---- Catalog (admin write) ----
export interface CreateUpdateRewardItemDto { name: string; glyph?: string | null; growthValue: number; randomWeight: number; displayOrder: number; isActive: boolean }
export interface CreateUpdateMedalDto { name: string; description?: string | null; displayOrder: number; isActive: boolean }
export interface CreateUpdatePetSpeciesDto { name: string; code: string; accentColor?: string | null; description?: string | null; displayOrder: number }
export type PetFormLevel = 1 | 2 | 3 | 4 | 5
export interface SetPetFormDto { level: PetFormLevel; name: string; revealText?: string | null; growthToNext?: number | null; scale?: number | null }
```

- [ ] **Step 4: 追加 service 方法(`src/services/homeworkService.ts`)**

顶部 import 追加类型 `CreateUpdateRewardItemDto, CreateUpdateMedalDto, CreateUpdatePetSpeciesDto, SetPetFormDto`。文件末尾追加:

```ts
// ---- upload helper (multipart; override the api instance's default application/json) ----
function uploadFile<T>(url: string, file: File): Promise<T> {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<T>(url, fd, { headers: { 'Content-Type': undefined as unknown as string } }).then((r) => r.data)
}

// ---- reward-item (admin) ----
export const listAllRewardItems = () => api.get<ListResult<RewardItemDto>>('/api/app/reward-item').then((r) => r.data.items)
export const createRewardItem = (dto: CreateUpdateRewardItemDto) => api.post<RewardItemDto>('/api/app/reward-item', dto).then((r) => r.data)
export const updateRewardItem = (id: string, dto: CreateUpdateRewardItemDto) => api.put<RewardItemDto>(`/api/app/reward-item/${id}`, dto).then((r) => r.data)
export const deleteRewardItem = (id: string) => api.delete(`/api/app/reward-item/${id}`)
export const uploadRewardItemIcon = (id: string, file: File) => uploadFile<RewardItemDto>(`/api/app/reward-item/${id}/upload-icon`, file)

// ---- medal (admin) ----
export const listAllMedals = () => api.get<ListResult<MedalDto>>('/api/app/medal').then((r) => r.data.items)
export const createMedal = (dto: CreateUpdateMedalDto) => api.post<MedalDto>('/api/app/medal', dto).then((r) => r.data)
export const updateMedal = (id: string, dto: CreateUpdateMedalDto) => api.put<MedalDto>(`/api/app/medal/${id}`, dto).then((r) => r.data)
export const deleteMedal = (id: string) => api.delete(`/api/app/medal/${id}`)
export const uploadMedalImage = (id: string, file: File) => uploadFile<MedalDto>(`/api/app/medal/${id}/upload-image`, file)

// ---- pet-species (admin) ----
export const listAllPetSpecies = () => api.get<ListResult<PetSpeciesDto>>('/api/app/pet-species').then((r) => r.data.items)
export const getPetSpecies = (id: string) => api.get<PetSpeciesDto>(`/api/app/pet-species/${id}`).then((r) => r.data)
export const createPetSpecies = (dto: CreateUpdatePetSpeciesDto) => api.post<PetSpeciesDto>('/api/app/pet-species', dto).then((r) => r.data)
export const updatePetSpecies = (id: string, dto: CreateUpdatePetSpeciesDto) => api.put<PetSpeciesDto>(`/api/app/pet-species/${id}`, dto).then((r) => r.data)
export const deletePetSpecies = (id: string) => api.delete(`/api/app/pet-species/${id}`)
export const setPetForm = (id: string, dto: SetPetFormDto) => api.post<PetSpeciesDto>(`/api/app/pet-species/${id}/set-form`, dto).then((r) => r.data)
export const uploadPetCover = (id: string, file: File) => uploadFile<PetSpeciesDto>(`/api/app/pet-species/${id}/upload-cover`, file)
export const uploadPetFormSprite = (id: string, level: number, file: File) => uploadFile<PetSpeciesDto>(`/api/app/pet-species/${id}/upload-form-sprite?level=${level}`, file)
export const uploadPetFormEvolveVideo = (id: string, level: number, file: File) => uploadFile<PetSpeciesDto>(`/api/app/pet-species/${id}/upload-form-evolve-video?level=${level}`, file)
export const activatePetSpecies = (id: string) => api.post<PetSpeciesDto>(`/api/app/pet-species/${id}/activate`).then((r) => r.data)
export const deactivatePetSpecies = (id: string) => api.post<PetSpeciesDto>(`/api/app/pet-species/${id}/deactivate`).then((r) => r.data)
```

> 若 Task 1 核实出字段名非 `file` 或 level 非 query,改 `uploadFile` 的 `fd.append(...)` 键 / 上传 URL。

- [ ] **Step 5: 运行确认通过 + typecheck**

Run: `npm test -- homeworkService`  → PASS。
Run: `npm run typecheck` → 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/types/homework.ts src/services/homeworkService.ts src/services/homeworkService.test.ts
git commit -m "$(cat <<'EOF'
feat(parent-web): 图鉴管理端 service 方法 + 写入 DTO 类型 + multipart 上传帮手

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 管理端 hooks

**Files:**
- Create: `frontend/parent-web/src/hooks/useAdminRewardItems.ts`
- Create: `frontend/parent-web/src/hooks/useAdminMedals.ts`
- Create: `frontend/parent-web/src/hooks/useAdminPetSpecies.ts`
- Test: `frontend/parent-web/src/hooks/useAdminRewardItems.test.tsx`

**Interfaces:**
- Consumes:Task 2 service 函数;`getErrorMessage`、`sonner` toast。
- Produces:
  - `adminRewardItemsKey`、`useAdminRewardItems()`、`useRewardItemMutations()`(`.create/.update/.remove/.uploadIcon`)。
  - `adminMedalsKey`、`useAdminMedals()`、`useMedalMutations()`(`.create/.update/.remove/.uploadImage`)。
  - `adminPetSpeciesKey`、`petSpeciesKey(id)`、`useAdminPetSpecies()`、`usePetSpecies(id)`、`usePetSpeciesMutations()`(`.create/.update/.remove/.setForm/.uploadCover/.uploadSprite/.uploadEvolveVideo/.activate/.deactivate`)。

- [ ] **Step 1: 写失败测试 `useAdminRewardItems.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllRewardItems: vi.fn(), createRewardItem: vi.fn(), updateRewardItem: vi.fn(),
  deleteRewardItem: vi.fn(), uploadRewardItemIcon: vi.fn(),
}))
import { listAllRewardItems } from '@/services/homeworkService'
import { useAdminRewardItems } from './useAdminRewardItems'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('useAdminRewardItems', () => {
  it('fetches the full reward-item list', async () => {
    ;(listAllRewardItems as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'r1' }])
    const { result } = renderHook(() => useAdminRewardItems(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'r1' }])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- useAdminRewardItems` → FAIL(模块不存在)。

- [ ] **Step 3: 实现 `useAdminRewardItems.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listAllRewardItems, createRewardItem, updateRewardItem, deleteRewardItem, uploadRewardItemIcon } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateUpdateRewardItemDto } from '@/types/homework'

export const adminRewardItemsKey = ['admin', 'reward-items']
export const useAdminRewardItems = () => useQuery({ queryKey: adminRewardItemsKey, queryFn: listAllRewardItems })

export function useRewardItemMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: adminRewardItemsKey })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateUpdateRewardItemDto) => createRewardItem(d), onSuccess: () => { void invalidate(); toast.success('已创建') }, onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: CreateUpdateRewardItemDto }) => updateRewardItem(a.id, a.dto), onSuccess: () => { void invalidate(); toast.success('已保存') }, onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteRewardItem(id), onSuccess: () => { void invalidate(); toast.success('已删除') }, onError: onErr }),
    uploadIcon: useMutation({ mutationFn: (a: { id: string; file: File }) => uploadRewardItemIcon(a.id, a.file), onSuccess: () => { void invalidate(); toast.success('已上传') }, onError: onErr }),
  }
}
```

- [ ] **Step 4: 实现 `useAdminMedals.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listAllMedals, createMedal, updateMedal, deleteMedal, uploadMedalImage } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateUpdateMedalDto } from '@/types/homework'

export const adminMedalsKey = ['admin', 'medals']
export const useAdminMedals = () => useQuery({ queryKey: adminMedalsKey, queryFn: listAllMedals })

export function useMedalMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: adminMedalsKey })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateUpdateMedalDto) => createMedal(d), onSuccess: () => { void invalidate(); toast.success('已创建') }, onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: CreateUpdateMedalDto }) => updateMedal(a.id, a.dto), onSuccess: () => { void invalidate(); toast.success('已保存') }, onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteMedal(id), onSuccess: () => { void invalidate(); toast.success('已删除') }, onError: onErr }),
    uploadImage: useMutation({ mutationFn: (a: { id: string; file: File }) => uploadMedalImage(a.id, a.file), onSuccess: () => { void invalidate(); toast.success('已上传') }, onError: onErr }),
  }
}
```

- [ ] **Step 5: 实现 `useAdminPetSpecies.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listAllPetSpecies, getPetSpecies, createPetSpecies, updatePetSpecies, deletePetSpecies,
  setPetForm, uploadPetCover, uploadPetFormSprite, uploadPetFormEvolveVideo, activatePetSpecies, deactivatePetSpecies,
} from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateUpdatePetSpeciesDto, SetPetFormDto } from '@/types/homework'

export const adminPetSpeciesKey = ['admin', 'pet-species']
export const petSpeciesKey = (id: string) => ['admin', 'pet-species', id]

export const useAdminPetSpecies = () => useQuery({ queryKey: adminPetSpeciesKey, queryFn: listAllPetSpecies })
export const usePetSpecies = (id: string) => useQuery({ queryKey: petSpeciesKey(id), queryFn: () => getPetSpecies(id), enabled: !!id })

export function usePetSpeciesMutations(id?: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: adminPetSpeciesKey })
    if (id) void qc.invalidateQueries({ queryKey: petSpeciesKey(id) })
  }
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  const ok = (msg: string) => () => { invalidate(); toast.success(msg) }
  return {
    create: useMutation({ mutationFn: (d: CreateUpdatePetSpeciesDto) => createPetSpecies(d), onSuccess: ok('已创建'), onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: CreateUpdatePetSpeciesDto }) => updatePetSpecies(a.id, a.dto), onSuccess: ok('已保存'), onError: onErr }),
    remove: useMutation({ mutationFn: (rid: string) => deletePetSpecies(rid), onSuccess: ok('已删除'), onError: onErr }),
    setForm: useMutation({ mutationFn: (a: { id: string; dto: SetPetFormDto }) => setPetForm(a.id, a.dto), onSuccess: ok('形态已保存'), onError: onErr }),
    uploadCover: useMutation({ mutationFn: (a: { id: string; file: File }) => uploadPetCover(a.id, a.file), onSuccess: ok('封面已上传'), onError: onErr }),
    uploadSprite: useMutation({ mutationFn: (a: { id: string; level: number; file: File }) => uploadPetFormSprite(a.id, a.level, a.file), onSuccess: ok('精灵图已上传'), onError: onErr }),
    uploadEvolveVideo: useMutation({ mutationFn: (a: { id: string; level: number; file: File }) => uploadPetFormEvolveVideo(a.id, a.level, a.file), onSuccess: ok('进化视频已上传'), onError: onErr }),
    activate: useMutation({ mutationFn: (rid: string) => activatePetSpecies(rid), onSuccess: ok('已启用'), onError: onErr }),
    deactivate: useMutation({ mutationFn: (rid: string) => deactivatePetSpecies(rid), onSuccess: ok('已停用'), onError: onErr }),
  }
}
```

- [ ] **Step 6: 运行确认通过 + typecheck**

Run: `npm test -- useAdminRewardItems` → PASS。
Run: `npm run typecheck` → 无错误。

- [ ] **Step 7: 提交**

```bash
git add src/hooks/useAdminRewardItems.ts src/hooks/useAdminMedals.ts src/hooks/useAdminPetSpecies.ts src/hooks/useAdminRewardItems.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 图鉴管理端 hooks(道具/勋章/宠物 查询 + mutations)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 权限常量 + i18n(nav.catalog + catalog.*)

**Files:**
- Create: `frontend/parent-web/src/lib/permissions.ts`
- Test: `frontend/parent-web/src/lib/permissions.test.ts`
- Modify: `public/locales/zh-CN/translation.json` + `public/locales/en/translation.json`

**Interfaces:**
- Produces:`CatalogPermissions`(`.Pets`/`.RewardItems`/`.Medals`)、`hasAnyCatalog(has: (name: string) => boolean): boolean`;两套 locale 新增 `nav.catalog` + `catalog.*` 命名空间(键集一致)。

- [ ] **Step 1: 写失败测试 `permissions.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { CatalogPermissions, hasAnyCatalog } from './permissions'

describe('permissions', () => {
  it('exposes the three catalog permission names', () => {
    expect(CatalogPermissions.Pets).toBe('Homework.Catalog.Pets')
    expect(CatalogPermissions.RewardItems).toBe('Homework.Catalog.RewardItems')
    expect(CatalogPermissions.Medals).toBe('Homework.Catalog.Medals')
  })
  it('hasAnyCatalog true if any catalog permission granted', () => {
    expect(hasAnyCatalog(() => false)).toBe(false)
    expect(hasAnyCatalog((n) => n === CatalogPermissions.Medals)).toBe(true)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- permissions` → FAIL。

- [ ] **Step 3: 实现 `permissions.ts`**

```ts
export const CatalogPermissions = {
  Pets: 'Homework.Catalog.Pets',
  RewardItems: 'Homework.Catalog.RewardItems',
  Medals: 'Homework.Catalog.Medals',
} as const

export function hasAnyCatalog(has: (name: string) => boolean): boolean {
  return has(CatalogPermissions.Pets) || has(CatalogPermissions.RewardItems) || has(CatalogPermissions.Medals)
}
```

- [ ] **Step 4: 追加 i18n(两套,键集一致)**

`zh-CN`:`nav` 加 `"catalog": "图鉴管理"`;在 `board` 段后插入:

```json
  "catalog": {
    "title": "图鉴管理",
    "tabRewardItems": "奖励道具",
    "tabMedals": "勋章",
    "tabPets": "宠物",
    "noPermission": "你没有图鉴管理权限",
    "create": "新建",
    "edit": "编辑",
    "delete": "删除",
    "active": "启用",
    "inactive": "未启用",
    "deleteConfirmTitle": "删除该项?",
    "deleteConfirmBody": "此操作不可恢复。",
    "name": "名称",
    "glyph": "图标字符(emoji)",
    "growthValue": "成长值",
    "randomWeight": "随机权重",
    "displayOrder": "排序",
    "description": "描述",
    "code": "代码(唯一)",
    "accentColor": "强调色",
    "icon": "图标",
    "image": "图片",
    "cover": "封面",
    "sprite": "精灵图",
    "evolveVideo": "进化视频",
    "upload": "上传",
    "uploading": "上传中…",
    "replace": "更换",
    "form": "形态",
    "revealText": "揭示文案",
    "growthToNext": "升级所需成长",
    "scale": "缩放",
    "completeness": "完整度",
    "missingCover": "缺封面",
    "missingSprite": "缺精灵图",
    "activateHint": "需封面 + 5 形态精灵图齐全才能启用",
    "videoSizeHint": "进化视频建议较小体积",
    "saveForm": "保存形态",
    "backToList": "返回列表"
  },
```

`en`:`nav` 加 `"catalog": "Catalog"`;在 `board` 段后插入(键集与 zh-CN 完全相同,仅值英文):

```json
  "catalog": {
    "title": "Catalog Admin",
    "tabRewardItems": "Reward Items",
    "tabMedals": "Medals",
    "tabPets": "Pets",
    "noPermission": "You don't have catalog permissions",
    "create": "New",
    "edit": "Edit",
    "delete": "Delete",
    "active": "Active",
    "inactive": "Inactive",
    "deleteConfirmTitle": "Delete this item?",
    "deleteConfirmBody": "This action cannot be undone.",
    "name": "Name",
    "glyph": "Glyph (emoji)",
    "growthValue": "Growth value",
    "randomWeight": "Random weight",
    "displayOrder": "Order",
    "description": "Description",
    "code": "Code (unique)",
    "accentColor": "Accent color",
    "icon": "Icon",
    "image": "Image",
    "cover": "Cover",
    "sprite": "Sprite",
    "evolveVideo": "Evolve video",
    "upload": "Upload",
    "uploading": "Uploading…",
    "replace": "Replace",
    "form": "Form",
    "revealText": "Reveal text",
    "growthToNext": "Growth to next",
    "scale": "Scale",
    "completeness": "Completeness",
    "missingCover": "Missing cover",
    "missingSprite": "Missing sprite",
    "activateHint": "Needs cover + all 5 form sprites to activate",
    "videoSizeHint": "Keep evolve videos small",
    "saveForm": "Save form",
    "backToList": "Back to list"
  },
```

**两文件 `catalog` 的键集必须完全相同**(`locales.test.ts` parity 强制),仅 `nav.catalog` + `catalog.*` 的值不同语言。

- [ ] **Step 5: 运行确认通过**

Run: `npm test -- permissions locales` → PASS(含 Slice A 的 `locales.test.ts` parity)。
Run: `npm run typecheck` → 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/lib/permissions.ts src/lib/permissions.test.ts public/locales/zh-CN/translation.json public/locales/en/translation.json
git commit -m "$(cat <<'EOF'
feat(parent-web): 图鉴权限常量 + nav.catalog/catalog.* 双语文案

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `FileUploadField` 共享上传组件

**Files:**
- Create: `frontend/parent-web/src/features/catalog/FileUploadField.tsx`
- Test: `frontend/parent-web/src/features/catalog/FileUploadField.test.tsx`

**Interfaces:**
- Consumes:`useTranslation`;`ui/button`。
- Produces:`FileUploadField({ testId, label, accept, kind, currentUrl, disabled, onUpload })`,其中 `kind: 'image' | 'video'`、`onUpload: (file: File) => Promise<void>`。选文件即调 `onUpload`,期间禁用并显示上传中;图片有预览,视频显示文件名/已上传标记。

- [ ] **Step 1: 写失败测试 `FileUploadField.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileUploadField } from './FileUploadField'

describe('FileUploadField', () => {
  it('calls onUpload with the chosen file', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined)
    render(<FileUploadField testId="cover" label="封面" accept="image/*" kind="image" onUpload={onUpload} />)
    const input = screen.getByTestId('cover-input') as HTMLInputElement
    const file = new File(['x'], 'c.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file))
  })
  it('shows current image preview when currentUrl set (image kind)', () => {
    render(<FileUploadField testId="cover" label="封面" accept="image/*" kind="image" currentUrl="http://x/c.png" onUpload={vi.fn()} />)
    expect(screen.getByTestId('cover-preview')).toHaveAttribute('src', 'http://x/c.png')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- FileUploadField` → FAIL。

- [ ] **Step 3: 实现 `FileUploadField.tsx`**

```tsx
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  testId: string
  label: string
  accept: string
  kind: 'image' | 'video'
  currentUrl?: string | null
  disabled?: boolean
  onUpload: (file: File) => Promise<void>
}

export function FileUploadField({ testId, label, accept, kind, currentUrl, disabled, onUpload }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUpload(file)
      setUploadedName(file.name)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="flex items-center gap-3">
        {kind === 'image' && currentUrl && (
          <img data-testid={`${testId}-preview`} src={currentUrl} alt={label}
            className="h-14 w-14 rounded-lg border border-ink/10 object-cover" />
        )}
        {kind === 'video' && (currentUrl || uploadedName) && (
          <span className="inline-flex items-center gap-1 text-sm text-success-500">
            <Check className="h-4 w-4" /> {uploadedName ?? t('catalog.evolveVideo')}
          </span>
        )}
        <Button type="button" size="sm" variant="outline" disabled={disabled || uploading}
          data-testid={`${testId}-btn`} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" /> {uploading ? t('catalog.uploading') : (currentUrl ? t('catalog.replace') : t('catalog.upload'))}
        </Button>
        <input ref={inputRef} data-testid={`${testId}-input`} type="file" accept={accept}
          className="hidden" onChange={onChange} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- FileUploadField` → PASS。

- [ ] **Step 5: 提交**

```bash
git add src/features/catalog/FileUploadField.tsx src/features/catalog/FileUploadField.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): FileUploadField 共享上传组件(图片预览/视频标记/上传态)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 奖励道具面板 + 弹窗(`RewardItemsPanel` / `RewardItemDialog`)

**Files:**
- Create: `frontend/parent-web/src/features/catalog/RewardItemDialog.tsx`
- Create: `frontend/parent-web/src/features/catalog/RewardItemsPanel.tsx`
- Test: `frontend/parent-web/src/features/catalog/RewardItemsPanel.test.tsx`

**Interfaces:**
- Consumes:`useAdminRewardItems`/`useRewardItemMutations`(Task 3)、`FileUploadField`(Task 5)、`useConfirm`、`ui/{dialog,input,label,button,switch,card,badge}`、`RewardItemDto`/`CreateUpdateRewardItemDto`。
- Produces:`RewardItemsPanel`(default 导出:列表 + 新建/编辑/删除 + 图标上传);`RewardItemDialog`(受控表单)。

- [ ] **Step 1: 写失败测试 `RewardItemsPanel.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllRewardItems: vi.fn().mockResolvedValue([
    { id: 'r1', name: '星火书签', glyph: '✦', growthValue: 12, randomWeight: 2, isActive: true, displayOrder: 0 },
  ]),
  createRewardItem: vi.fn(), updateRewardItem: vi.fn(), deleteRewardItem: vi.fn(), uploadRewardItemIcon: vi.fn(),
}))
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { RewardItemsPanel } from './RewardItemsPanel'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><ConfirmProvider>{node}</ConfirmProvider></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('RewardItemsPanel', () => {
  it('lists items and opens the create dialog', async () => {
    ui(<RewardItemsPanel />)
    await waitFor(() => expect(screen.getByText('星火书签')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('reward-create'))
    expect(screen.getByTestId('reward-name-input')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- RewardItemsPanel` → FAIL。

- [ ] **Step 3: 实现 `RewardItemDialog.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FileUploadField } from './FileUploadField'
import type { RewardItemDto, CreateUpdateRewardItemDto } from '@/types/homework'

interface Props {
  open: boolean
  onClose: () => void
  item: RewardItemDto | null
  onSubmit: (dto: CreateUpdateRewardItemDto) => void
  onUploadIcon?: (file: File) => Promise<void>
  isPending: boolean
}

export function RewardItemDialog({ open, onClose, item, onSubmit, onUploadIcon, isPending }: Props) {
  const { t } = useTranslation()
  const isEdit = !!item
  const [name, setName] = useState(item?.name ?? '')
  const [glyph, setGlyph] = useState(item?.glyph ?? '')
  const [growthValue, setGrowthValue] = useState(item?.growthValue ?? 12)
  const [randomWeight, setRandomWeight] = useState(item?.randomWeight ?? 1)
  const [displayOrder, setDisplayOrder] = useState(item?.displayOrder ?? 0)
  const [isActive, setIsActive] = useState(item?.isActive ?? false)
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErr(t('catalog.name')); return }
    onSubmit({ name: name.trim(), glyph: glyph.trim() || null, growthValue, randomWeight, displayOrder, isActive })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? t('catalog.edit') : t('catalog.create')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t('catalog.name')} <span className="text-error-500">*</span></Label>
            <Input data-testid="reward-name-input" value={name} maxLength={64} onChange={(e) => { setName(e.target.value); setErr('') }} />
            {err && <p className="text-xs text-error-500">{err}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{t('catalog.glyph')}</Label>
              <Input data-testid="reward-glyph-input" value={glyph} maxLength={8} onChange={(e) => setGlyph(e.target.value)} /></div>
            <div className="space-y-1"><Label>{t('catalog.displayOrder')}</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
            <div className="space-y-1"><Label>{t('catalog.growthValue')}</Label>
              <Input type="number" min={1} value={growthValue} onChange={(e) => setGrowthValue(Number(e.target.value))} /></div>
            <div className="space-y-1"><Label>{t('catalog.randomWeight')}</Label>
              <Input type="number" min={0} value={randomWeight} onChange={(e) => setRandomWeight(Number(e.target.value))} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="reward-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="reward-active">{t('catalog.active')}</Label>
          </div>
          {isEdit && onUploadIcon && (
            <FileUploadField testId="reward-icon" label={t('catalog.icon')} accept="image/*" kind="image"
              currentUrl={item?.iconUrl} onUpload={onUploadIcon} />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isPending}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: 实现 `RewardItemsPanel.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAdminRewardItems, useRewardItemMutations } from '@/hooks/useAdminRewardItems'
import { useConfirm } from '@/components/ConfirmDialog'
import { RewardItemDialog } from './RewardItemDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RewardItemDto, CreateUpdateRewardItemDto } from '@/types/homework'

export function RewardItemsPanel() {
  const { t } = useTranslation()
  const { data: items = [], isLoading } = useAdminRewardItems()
  const m = useRewardItemMutations()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RewardItemDto | null>(null)

  const openForm = (it: RewardItemDto | null) => { setEditing(it); setOpen(true) }
  const close = () => { setOpen(false); setEditing(null) }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button data-testid="reward-create" onClick={() => openForm(null)}><Plus className="h-4 w-4" /> {t('catalog.create')}</Button>
      </div>
      {isLoading ? <div className="py-8 text-center text-muted">{t('common.loading')}</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it.id}><CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{it.glyph ?? (it.iconUrl ? '🖼️' : '🎁')}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{it.name}</span>
                <Badge variant={it.isActive ? 'success' : 'secondary'} className="text-xs">{it.isActive ? t('catalog.active') : t('catalog.inactive')}</Badge>
              </div>
              <div className="text-sm text-muted">{t('catalog.growthValue')} {it.growthValue} · {t('catalog.randomWeight')} {it.randomWeight}</div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" data-testid={`reward-edit-${it.id}`} onClick={() => openForm(it)}><Pencil className="h-3.5 w-3.5" /> {t('catalog.edit')}</Button>
                <Button size="sm" variant="ghost" className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                  data-testid={`reward-delete-${it.id}`}
                  onClick={async () => { if (await confirm(t('catalog.deleteConfirmTitle'), t('catalog.deleteConfirmBody'))) m.remove.mutate(it.id) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {open && (
        <RewardItemDialog key={editing?.id ?? 'new'} open onClose={close} item={editing}
          isPending={m.create.isPending || m.update.isPending}
          onUploadIcon={editing ? (file) => m.uploadIcon.mutateAsync({ id: editing.id, file }).then(() => undefined) : undefined}
          onSubmit={(dto: CreateUpdateRewardItemDto) => {
            if (editing) m.update.mutate({ id: editing.id, dto }, { onSuccess: close })
            else m.create.mutate(dto, { onSuccess: close })
          }} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: 运行确认通过 + typecheck**

Run: `npm test -- RewardItemsPanel` → PASS。
Run: `npm run typecheck` → 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/features/catalog/RewardItemDialog.tsx src/features/catalog/RewardItemsPanel.tsx src/features/catalog/RewardItemsPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 奖励道具管理面板 + 弹窗(CRUD + 图标上传)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 勋章面板 + 弹窗(`MedalsPanel` / `MedalDialog`)

**Files:**
- Create: `frontend/parent-web/src/features/catalog/MedalDialog.tsx`
- Create: `frontend/parent-web/src/features/catalog/MedalsPanel.tsx`
- Test: `frontend/parent-web/src/features/catalog/MedalsPanel.test.tsx`

**Interfaces:**
- Consumes:`useAdminMedals`/`useMedalMutations`、`FileUploadField`、`useConfirm`、`ui/*`、`MedalDto`/`CreateUpdateMedalDto`。
- Produces:`MedalsPanel`(default)、`MedalDialog`。字段:名称 / 描述 / 排序 / 启用;编辑态可传图片。

- [ ] **Step 1: 写失败测试 `MedalsPanel.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllMedals: vi.fn().mockResolvedValue([{ id: 'm1', name: '暑期毕业勋章', description: '荣誉', isActive: true, displayOrder: 0 }]),
  createMedal: vi.fn(), updateMedal: vi.fn(), deleteMedal: vi.fn(), uploadMedalImage: vi.fn(),
}))
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { MedalsPanel } from './MedalsPanel'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><ConfirmProvider>{node}</ConfirmProvider></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('MedalsPanel', () => {
  it('lists medals and opens the create dialog', async () => {
    ui(<MedalsPanel />)
    await waitFor(() => expect(screen.getByText('暑期毕业勋章')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('medal-create'))
    expect(screen.getByTestId('medal-name-input')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- MedalsPanel` → FAIL。

- [ ] **Step 3: 实现 `MedalDialog.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { FileUploadField } from './FileUploadField'
import type { MedalDto, CreateUpdateMedalDto } from '@/types/homework'

interface Props {
  open: boolean
  onClose: () => void
  medal: MedalDto | null
  onSubmit: (dto: CreateUpdateMedalDto) => void
  onUploadImage?: (file: File) => Promise<void>
  isPending: boolean
}

export function MedalDialog({ open, onClose, medal, onSubmit, onUploadImage, isPending }: Props) {
  const { t } = useTranslation()
  const isEdit = !!medal
  const [name, setName] = useState(medal?.name ?? '')
  const [description, setDescription] = useState(medal?.description ?? '')
  const [displayOrder, setDisplayOrder] = useState(medal?.displayOrder ?? 0)
  const [isActive, setIsActive] = useState(medal?.isActive ?? false)
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErr(t('catalog.name')); return }
    onSubmit({ name: name.trim(), description: description.trim() || null, displayOrder, isActive })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? t('catalog.edit') : t('catalog.create')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t('catalog.name')} <span className="text-error-500">*</span></Label>
            <Input data-testid="medal-name-input" value={name} maxLength={64} onChange={(e) => { setName(e.target.value); setErr('') }} />
            {err && <p className="text-xs text-error-500">{err}</p>}
          </div>
          <div className="space-y-1">
            <Label>{t('catalog.description')}</Label>
            <Textarea value={description} maxLength={512} rows={3} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1"><Label>{t('catalog.displayOrder')}</Label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
          <div className="flex items-center gap-2">
            <Switch id="medal-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="medal-active">{t('catalog.active')}</Label>
          </div>
          {isEdit && onUploadImage && (
            <FileUploadField testId="medal-image" label={t('catalog.image')} accept="image/*" kind="image"
              currentUrl={medal?.imageUrl} onUpload={onUploadImage} />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isPending}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: 实现 `MedalsPanel.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Award } from 'lucide-react'
import { useAdminMedals, useMedalMutations } from '@/hooks/useAdminMedals'
import { useConfirm } from '@/components/ConfirmDialog'
import { MedalDialog } from './MedalDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MedalDto, CreateUpdateMedalDto } from '@/types/homework'

export function MedalsPanel() {
  const { t } = useTranslation()
  const { data: medals = [], isLoading } = useAdminMedals()
  const m = useMedalMutations()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MedalDto | null>(null)
  const openForm = (md: MedalDto | null) => { setEditing(md); setOpen(true) }
  const close = () => { setOpen(false); setEditing(null) }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button data-testid="medal-create" onClick={() => openForm(null)}><Plus className="h-4 w-4" /> {t('catalog.create')}</Button>
      </div>
      {isLoading ? <div className="py-8 text-center text-muted">{t('common.loading')}</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {medals.map((md) => (
            <Card key={md.id}><CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                {md.imageUrl ? <img src={md.imageUrl} alt={md.name} className="h-7 w-7 rounded object-cover" /> : <Award className="h-6 w-6 text-muted" />}
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{md.name}</span>
                <Badge variant={md.isActive ? 'success' : 'secondary'} className="text-xs">{md.isActive ? t('catalog.active') : t('catalog.inactive')}</Badge>
              </div>
              {md.description && <div className="text-sm text-muted line-clamp-2">{md.description}</div>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" data-testid={`medal-edit-${md.id}`} onClick={() => openForm(md)}><Pencil className="h-3.5 w-3.5" /> {t('catalog.edit')}</Button>
                <Button size="sm" variant="ghost" className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                  data-testid={`medal-delete-${md.id}`}
                  onClick={async () => { if (await confirm(t('catalog.deleteConfirmTitle'), t('catalog.deleteConfirmBody'))) m.remove.mutate(md.id) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {open && (
        <MedalDialog key={editing?.id ?? 'new'} open onClose={close} medal={editing}
          isPending={m.create.isPending || m.update.isPending}
          onUploadImage={editing ? (file) => m.uploadImage.mutateAsync({ id: editing.id, file }).then(() => undefined) : undefined}
          onSubmit={(dto: CreateUpdateMedalDto) => {
            if (editing) m.update.mutate({ id: editing.id, dto }, { onSuccess: close })
            else m.create.mutate(dto, { onSuccess: close })
          }} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: 运行确认通过 + typecheck**

Run: `npm test -- MedalsPanel` → PASS。 `npm run typecheck` → 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/features/catalog/MedalDialog.tsx src/features/catalog/MedalsPanel.tsx src/features/catalog/MedalsPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 勋章管理面板 + 弹窗(CRUD + 图片上传)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 宠物面板 + 创建弹窗(`PetSpeciesPanel` / `PetSpeciesCreateDialog`)

**Files:**
- Create: `frontend/parent-web/src/features/catalog/PetSpeciesCreateDialog.tsx`
- Create: `frontend/parent-web/src/features/catalog/PetSpeciesPanel.tsx`
- Test: `frontend/parent-web/src/features/catalog/PetSpeciesPanel.test.tsx`

**Interfaces:**
- Consumes:`useAdminPetSpecies`/`usePetSpeciesMutations`、`useConfirm`、`react-router` `useNavigate`、`ui/*`、`PetSpeciesDto`/`CreateUpdatePetSpeciesDto`。
- Produces:`PetSpeciesPanel`(列表 + 创建→跳详情 + 启停 + 删除)、`PetSpeciesCreateDialog`(基础字段)。列表显示完整度 `已传精灵/5`。

- [ ] **Step 1: 写失败测试 `PetSpeciesPanel.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllPetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', isActive: false, displayOrder: 0, coverUrl: null,
      forms: [{ level: 1, name: '龙蛋', spriteUrl: 'u' }, { level: 2, name: '幼龙', spriteUrl: null }] },
  ]),
  createPetSpecies: vi.fn(), updatePetSpecies: vi.fn(), deletePetSpecies: vi.fn(),
  setPetForm: vi.fn(), uploadPetCover: vi.fn(), uploadPetFormSprite: vi.fn(), uploadPetFormEvolveVideo: vi.fn(),
  activatePetSpecies: vi.fn(), deactivatePetSpecies: vi.fn(),
}))
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { PetSpeciesPanel } from './PetSpeciesPanel'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><ConfirmProvider>{node}</ConfirmProvider></MemoryRouter></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('PetSpeciesPanel', () => {
  it('lists species with sprite completeness and opens create dialog', async () => {
    ui(<PetSpeciesPanel />)
    await waitFor(() => expect(screen.getByText('火龙')).toBeInTheDocument())
    expect(screen.getByTestId('pet-completeness-p1')).toHaveTextContent('1/5')
    fireEvent.click(screen.getByTestId('pet-create'))
    expect(screen.getByTestId('pet-name-input')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- PetSpeciesPanel` → FAIL。

- [ ] **Step 3: 实现 `PetSpeciesCreateDialog.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CreateUpdatePetSpeciesDto } from '@/types/homework'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (dto: CreateUpdatePetSpeciesDto) => void
  isPending: boolean
}

export function PetSpeciesCreateDialog({ open, onClose, onSubmit, isPending }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [accentColor, setAccentColor] = useState('')
  const [description, setDescription] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) { setErr(t('catalog.code')); return }
    onSubmit({ name: name.trim(), code: code.trim(), accentColor: accentColor.trim() || null, description: description.trim() || null, displayOrder })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('catalog.create')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label>{t('catalog.name')} <span className="text-error-500">*</span></Label>
            <Input data-testid="pet-name-input" value={name} maxLength={64} onChange={(e) => { setName(e.target.value); setErr('') }} /></div>
          <div className="space-y-1"><Label>{t('catalog.code')} <span className="text-error-500">*</span></Label>
            <Input data-testid="pet-code-input" value={code} maxLength={64} onChange={(e) => { setCode(e.target.value); setErr('') }} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{t('catalog.accentColor')}</Label>
              <Input value={accentColor} maxLength={16} placeholder="#FF6B35" onChange={(e) => setAccentColor(e.target.value)} /></div>
            <div className="space-y-1"><Label>{t('catalog.displayOrder')}</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
          </div>
          <div className="space-y-1"><Label>{t('catalog.description')}</Label>
            <Textarea value={description} maxLength={512} rows={2} onChange={(e) => setDescription(e.target.value)} /></div>
          {err && <p className="text-xs text-error-500">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isPending}>{t('common.create')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: 实现 `PetSpeciesPanel.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Power } from 'lucide-react'
import { useAdminPetSpecies, usePetSpeciesMutations } from '@/hooks/useAdminPetSpecies'
import { useConfirm } from '@/components/ConfirmDialog'
import { PetSpeciesCreateDialog } from './PetSpeciesCreateDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PetSpeciesDto } from '@/types/homework'

const spriteCount = (p: PetSpeciesDto) => p.forms.filter((f) => f.spriteUrl).length

export function PetSpeciesPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: species = [], isLoading } = useAdminPetSpecies()
  const m = usePetSpeciesMutations()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button data-testid="pet-create" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('catalog.create')}</Button>
      </div>
      {isLoading ? <div className="py-8 text-center text-muted">{t('common.loading')}</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {species.map((p) => (
            <Card key={p.id}><CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                {p.coverUrl ? <img src={p.coverUrl} alt={p.name} className="h-10 w-10 rounded-lg object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink/5 text-lg">🐣</div>}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{p.name}</div>
                  <div className="text-xs text-muted">{p.code}</div>
                </div>
                <Badge variant={p.isActive ? 'success' : 'secondary'} className="text-xs">{p.isActive ? t('catalog.active') : t('catalog.inactive')}</Badge>
              </div>
              <div className="text-sm text-muted">{t('catalog.sprite')} <span data-testid={`pet-completeness-${p.id}`}>{spriteCount(p)}/5</span></div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" data-testid={`pet-edit-${p.id}`} onClick={() => navigate(`/catalog/pets/${p.id}`)}><Pencil className="h-3.5 w-3.5" /> {t('catalog.edit')}</Button>
                <Button size="sm" variant="outline" data-testid={`pet-toggle-${p.id}`}
                  onClick={() => (p.isActive ? m.deactivate.mutate(p.id) : m.activate.mutate(p.id))}>
                  <Power className="h-3.5 w-3.5" /> {p.isActive ? t('catalog.inactive') : t('catalog.active')}
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                  data-testid={`pet-delete-${p.id}`}
                  onClick={async () => { if (await confirm(t('catalog.deleteConfirmTitle'), t('catalog.deleteConfirmBody'))) m.remove.mutate(p.id) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {open && (
        <PetSpeciesCreateDialog open onClose={() => setOpen(false)} isPending={m.create.isPending}
          onSubmit={(dto) => m.create.mutate(dto, { onSuccess: (created) => { setOpen(false); navigate(`/catalog/pets/${created.id}`) } })} />
      )}
    </div>
  )
}
```

> 说明:列表页的「启停」直接调 activate/deactivate,后端不变量会拒绝未完整的启用(toast 报错);详情页有更明确的完整度门控(Task 10)。

- [ ] **Step 5: 运行确认通过 + typecheck**

Run: `npm test -- PetSpeciesPanel` → PASS。 `npm run typecheck` → 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/features/catalog/PetSpeciesCreateDialog.tsx src/features/catalog/PetSpeciesPanel.tsx src/features/catalog/PetSpeciesPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 宠物管理面板 + 创建弹窗(列表/完整度/创建跳详情/启停/删除)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 单形态编辑组件(`PetFormSection`)

**Files:**
- Create: `frontend/parent-web/src/features/catalog/PetFormSection.tsx`
- Test: `frontend/parent-web/src/features/catalog/PetFormSection.test.tsx`

**Interfaces:**
- Consumes:`FileUploadField`、`ui/{input,label,button}`、`useTranslation`、`PetSpeciesDto`/`PetFormDto`/`SetPetFormDto`/`PetFormLevel`。
- Produces:`PetFormSection({ species, level, onSaveMeta, onUploadSprite, onUploadEvolveVideo })`,其中 `onSaveMeta: (dto: SetPetFormDto) => void`、`onUploadSprite: (file: File) => Promise<void>`、`onUploadEvolveVideo: (file: File) => Promise<void>`。Level 5 不显示进化视频。

- [ ] **Step 1: 写失败测试 `PetFormSection.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PetFormSection } from './PetFormSection'
import type { PetSpeciesDto } from '@/types/homework'

const species = {
  id: 'p1', name: '火龙', code: 'dragon', isActive: false, displayOrder: 0, coverUrl: null,
  forms: [{ level: 1, name: '龙蛋', spriteUrl: 'u1', revealText: null, growthToNext: 30, evolveVideoUrl: null, scale: null }],
} as unknown as PetSpeciesDto

describe('PetFormSection', () => {
  it('prefills the form meta and saves via onSaveMeta', () => {
    const onSaveMeta = vi.fn()
    render(<PetFormSection species={species} level={1} onSaveMeta={onSaveMeta} onUploadSprite={vi.fn()} onUploadEvolveVideo={vi.fn()} />)
    expect(screen.getByTestId('form-name-1')).toHaveValue('龙蛋')
    fireEvent.change(screen.getByTestId('form-name-1'), { target: { value: '龙蛋X' } })
    fireEvent.click(screen.getByTestId('form-save-1'))
    expect(onSaveMeta).toHaveBeenCalledWith(expect.objectContaining({ level: 1, name: '龙蛋X' }))
  })
  it('hides evolve-video upload at level 5', () => {
    render(<PetFormSection species={species} level={5} onSaveMeta={vi.fn()} onUploadSprite={vi.fn()} onUploadEvolveVideo={vi.fn()} />)
    expect(screen.queryByTestId('form-evolve-5-btn')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- PetFormSection` → FAIL。

- [ ] **Step 3: 实现 `PetFormSection.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FileUploadField } from './FileUploadField'
import type { PetSpeciesDto, SetPetFormDto, PetFormLevel } from '@/types/homework'

interface Props {
  species: PetSpeciesDto
  level: PetFormLevel
  onSaveMeta: (dto: SetPetFormDto) => void
  onUploadSprite: (file: File) => Promise<void>
  onUploadEvolveVideo: (file: File) => Promise<void>
}

export function PetFormSection({ species, level, onSaveMeta, onUploadSprite, onUploadEvolveVideo }: Props) {
  const { t } = useTranslation()
  const form = species.forms.find((f) => f.level === level)
  const [name, setName] = useState(form?.name ?? '')
  const [revealText, setRevealText] = useState(form?.revealText ?? '')
  const [growthToNext, setGrowthToNext] = useState<string>(form?.growthToNext != null ? String(form.growthToNext) : '')
  const [scale, setScale] = useState<string>(form?.scale != null ? String(form.scale) : '')

  const save = () => onSaveMeta({
    level, name: name.trim(),
    revealText: revealText.trim() || null,
    growthToNext: growthToNext ? Number(growthToNext) : null,
    scale: scale ? Number(scale) : null,
  })

  return (
    <div className="space-y-3 rounded-xl border border-ink/10 p-4">
      <div className="font-semibold text-ink">{t('catalog.form')} {level}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label>{t('catalog.name')}</Label>
          <Input data-testid={`form-name-${level}`} value={name} maxLength={64} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1"><Label>{t('catalog.revealText')}</Label>
          <Input data-testid={`form-reveal-${level}`} value={revealText} maxLength={128} onChange={(e) => setRevealText(e.target.value)} /></div>
        <div className="space-y-1"><Label>{t('catalog.growthToNext')}</Label>
          <Input type="number" data-testid={`form-growth-${level}`} value={growthToNext} onChange={(e) => setGrowthToNext(e.target.value)} /></div>
        <div className="space-y-1"><Label>{t('catalog.scale')}</Label>
          <Input type="number" step="0.01" data-testid={`form-scale-${level}`} value={scale} onChange={(e) => setScale(e.target.value)} /></div>
      </div>
      <Button size="sm" variant="outline" data-testid={`form-save-${level}`} onClick={save}>{t('catalog.saveForm')}</Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <FileUploadField testId={`form-sprite-${level}`} label={t('catalog.sprite')} accept="image/*" kind="image"
          currentUrl={form?.spriteUrl} onUpload={onUploadSprite} />
        {level < 5 && (
          <FileUploadField testId={`form-evolve-${level}`} label={`${t('catalog.evolveVideo')} → Lv${level + 1}`} accept="video/*" kind="video"
            currentUrl={form?.evolveVideoUrl} onUpload={onUploadEvolveVideo} />
        )}
      </div>
      {level < 5 && <p className="text-xs text-muted">{t('catalog.videoSizeHint')}</p>}
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过 + typecheck**

Run: `npm test -- PetFormSection` → PASS。 `npm run typecheck` → 无错误。

- [ ] **Step 5: 提交**

```bash
git add src/features/catalog/PetFormSection.tsx src/features/catalog/PetFormSection.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 宠物单形态编辑组件(元数据 + 精灵图 + 进化视频)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 宠物详情编辑页(`PetSpeciesEditPage`)+ 路由

**Files:**
- Create: `frontend/parent-web/src/features/catalog/PetSpeciesEditPage.tsx`
- Modify: `frontend/parent-web/src/App.tsx`(加 `/catalog/pets/:id` 路由 + import)
- Test: `frontend/parent-web/src/features/catalog/PetSpeciesEditPage.test.tsx`

**Interfaces:**
- Consumes:`usePetSpecies(id)`/`usePetSpeciesMutations(id)`、`PetFormSection`、`FileUploadField`、`react-router` `useParams`/`useNavigate`、`ui/*`、`PetSpeciesDto`。
- Produces:`PetSpeciesEditPage`。基础信息编辑 + 封面上传 + 5 个 `PetFormSection` + 完整度指示 + 启用/停用(未完整禁用启用)。路由 `/catalog/pets/:id`。

- [ ] **Step 1: 写失败测试 `PetSpeciesEditPage.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  getPetSpecies: vi.fn(), updatePetSpecies: vi.fn(), deletePetSpecies: vi.fn(),
  setPetForm: vi.fn(), uploadPetCover: vi.fn(), uploadPetFormSprite: vi.fn(), uploadPetFormEvolveVideo: vi.fn(),
  activatePetSpecies: vi.fn(), deactivatePetSpecies: vi.fn(), listAllPetSpecies: vi.fn().mockResolvedValue([]),
}))
import { getPetSpecies } from '@/services/homeworkService'
import { PetSpeciesEditPage } from './PetSpeciesEditPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/catalog/pets/p1']}>
        <Routes><Route path="/catalog/pets/:id" element={node} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>
beforeEach(() => vi.clearAllMocks())

describe('PetSpeciesEditPage', () => {
  it('prefills base info and disables activate when incomplete', async () => {
    mock(getPetSpecies).mockResolvedValue({
      id: 'p1', name: '火龙', code: 'dragon', accentColor: null, description: '', isActive: false, displayOrder: 0, coverUrl: null,
      forms: [{ level: 1, name: '龙蛋', spriteUrl: 'u', revealText: null, growthToNext: null, evolveVideoUrl: null, scale: null }],
    })
    ui(<PetSpeciesEditPage />)
    await waitFor(() => expect(screen.getByTestId('pet-base-name')).toHaveValue('火龙'))
    expect(screen.getByTestId('pet-activate')).toBeDisabled() // cover missing + only 1/5 sprites
    expect(screen.getByTestId('pet-completeness')).toHaveTextContent('1/5')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- PetSpeciesEditPage` → FAIL。

- [ ] **Step 3: 实现 `PetSpeciesEditPage.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { usePetSpecies, usePetSpeciesMutations } from '@/hooks/useAdminPetSpecies'
import { PetFormSection } from './PetFormSection'
import { FileUploadField } from './FileUploadField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import type { PetFormLevel } from '@/types/homework'

const LEVELS: PetFormLevel[] = [1, 2, 3, 4, 5]

export function PetSpeciesEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: species, isLoading } = usePetSpecies(id)
  const m = usePetSpeciesMutations(id)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [accentColor, setAccentColor] = useState('')
  const [description, setDescription] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)

  useEffect(() => {
    if (species) {
      setName(species.name); setCode(species.code); setAccentColor(species.accentColor ?? '')
      setDescription(species.description ?? ''); setDisplayOrder(species.displayOrder)
    }
  }, [species])

  if (isLoading || !species) return <div className="py-12 text-center text-muted">{t('common.loading')}</div>

  const spriteCount = species.forms.filter((f) => f.spriteUrl).length
  const complete = !!species.coverUrl && spriteCount === 5
  const saveBase = () => m.update.mutate({ id, dto: { name: name.trim(), code: code.trim(), accentColor: accentColor.trim() || null, description: description.trim() || null, displayOrder } })

  return (
    <div className="space-y-6">
      <button type="button" className="flex items-center gap-1 text-sm text-muted hover:text-ink" onClick={() => navigate('/catalog')}>
        <ArrowLeft className="h-4 w-4" /> {t('catalog.backToList')}
      </button>
      <h1 className="text-2xl font-bold text-ink">{species.name}</h1>

      <Card><CardContent className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>{t('catalog.name')}</Label>
            <Input data-testid="pet-base-name" value={name} maxLength={64} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>{t('catalog.code')}</Label>
            <Input value={code} maxLength={64} onChange={(e) => setCode(e.target.value)} /></div>
          <div className="space-y-1"><Label>{t('catalog.accentColor')}</Label>
            <Input value={accentColor} maxLength={16} onChange={(e) => setAccentColor(e.target.value)} /></div>
          <div className="space-y-1"><Label>{t('catalog.displayOrder')}</Label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
        </div>
        <div className="space-y-1"><Label>{t('catalog.description')}</Label>
          <Textarea value={description} maxLength={512} rows={2} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" data-testid="pet-base-save" onClick={saveBase} disabled={m.update.isPending}>{t('common.save')}</Button>
          <FileUploadField testId="pet-cover" label={t('catalog.cover')} accept="image/*" kind="image" currentUrl={species.coverUrl}
            onUpload={(file) => m.uploadCover.mutateAsync({ id, file }).then(() => undefined)} />
        </div>
      </CardContent></Card>

      <div className="space-y-4">
        {LEVELS.map((level) => (
          <PetFormSection key={level} species={species} level={level}
            onSaveMeta={(dto) => m.setForm.mutate({ id, dto })}
            onUploadSprite={(file) => m.uploadSprite.mutateAsync({ id, level, file }).then(() => undefined)}
            onUploadEvolveVideo={(file) => m.uploadEvolveVideo.mutateAsync({ id, level, file }).then(() => undefined)} />
        ))}
      </div>

      <Card><CardContent className="flex items-center justify-between p-5">
        <div className="text-sm text-muted">
          {t('catalog.completeness')}: {t('catalog.cover')} {species.coverUrl ? '✓' : '✗'} · {t('catalog.sprite')} <span data-testid="pet-completeness">{spriteCount}/5</span>
          {!complete && <span className="ml-2 text-error-500">{t('catalog.activateHint')}</span>}
        </div>
        {species.isActive ? (
          <Button variant="outline" data-testid="pet-deactivate" onClick={() => m.deactivate.mutate(id)}>{t('catalog.inactive')}</Button>
        ) : (
          <Button data-testid="pet-activate" disabled={!complete} onClick={() => m.activate.mutate(id)}>{t('catalog.active')}</Button>
        )}
      </CardContent></Card>
    </div>
  )
}
```

- [ ] **Step 4: 加路由到 `App.tsx`**

import 加 `import { PetSpeciesEditPage } from '@/features/catalog/PetSpeciesEditPage'`;在 `AppLayout` 的 `<Route element={<AppLayout />}>` 内加:

```tsx
          <Route path="/catalog/pets/:id" element={<PetSpeciesEditPage />} />
```

- [ ] **Step 5: 运行确认通过 + typecheck**

Run: `npm test -- PetSpeciesEditPage` → PASS。 `npm run typecheck` → 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/features/catalog/PetSpeciesEditPage.tsx src/App.tsx src/features/catalog/PetSpeciesEditPage.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 宠物详情编辑页(基础/封面/5 形态/完整度/启停)+ 路由

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: 图鉴 tab 页 + 导航门控(`CatalogPage` + `AppLayout` + 路由)

**Files:**
- Create: `frontend/parent-web/src/features/catalog/CatalogPage.tsx`
- Modify: `frontend/parent-web/src/App.tsx`(加 `/catalog` 路由 + import)
- Modify: `frontend/parent-web/src/components/layout/AppLayout.tsx`(nav 加权限门控的「图鉴管理」)
- Test: `frontend/parent-web/src/features/catalog/CatalogPage.test.tsx`

**Interfaces:**
- Consumes:`useAuthStore`(`hasPermission`)、`CatalogPermissions`/`hasAnyCatalog`、`RewardItemsPanel`/`MedalsPanel`/`PetSpeciesPanel`、`useTranslation`、`Navigate`。
- Produces:`CatalogPage`(按权限渲染 tab,默认选第一个可用);`AppLayout` nav 增 `图鉴管理`(仅 `hasAnyCatalog`);路由 `/catalog`。

- [ ] **Step 1: 写失败测试 `CatalogPage.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllRewardItems: vi.fn().mockResolvedValue([]), listAllMedals: vi.fn().mockResolvedValue([]), listAllPetSpecies: vi.fn().mockResolvedValue([]),
  createRewardItem: vi.fn(), updateRewardItem: vi.fn(), deleteRewardItem: vi.fn(), uploadRewardItemIcon: vi.fn(),
  createMedal: vi.fn(), updateMedal: vi.fn(), deleteMedal: vi.fn(), uploadMedalImage: vi.fn(),
  createPetSpecies: vi.fn(), updatePetSpecies: vi.fn(), deletePetSpecies: vi.fn(), setPetForm: vi.fn(),
  uploadPetCover: vi.fn(), uploadPetFormSprite: vi.fn(), uploadPetFormEvolveVideo: vi.fn(), activatePetSpecies: vi.fn(), deactivatePetSpecies: vi.fn(),
}))
import { useAuthStore } from '@/stores/authStore'
import { CatalogPage } from './CatalogPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('CatalogPage', () => {
  it('shows only permitted tabs (medals only)', () => {
    useAuthStore.setState({ permissions: { 'Homework.Catalog.Medals': true } })
    ui(<CatalogPage />)
    expect(screen.getByTestId('tab-medals')).toBeInTheDocument()
    expect(screen.queryByTestId('tab-reward-items')).toBeNull()
    expect(screen.queryByTestId('tab-pets')).toBeNull()
  })
  it('redirects when no catalog permission', () => {
    useAuthStore.setState({ permissions: {} })
    ui(<CatalogPage />)
    expect(screen.queryByTestId('tab-medals')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- CatalogPage` → FAIL。

- [ ] **Step 3: 实现 `CatalogPage.tsx`**

```tsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { CatalogPermissions, hasAnyCatalog } from '@/lib/permissions'
import { RewardItemsPanel } from './RewardItemsPanel'
import { MedalsPanel } from './MedalsPanel'
import { PetSpeciesPanel } from './PetSpeciesPanel'

type TabKey = 'reward-items' | 'medals' | 'pets'

export function CatalogPage() {
  const { t } = useTranslation()
  const has = useAuthStore((s) => s.hasPermission)

  const tabs: { key: TabKey; testId: string; label: string; perm: string }[] = [
    { key: 'reward-items', testId: 'tab-reward-items', label: t('catalog.tabRewardItems'), perm: CatalogPermissions.RewardItems },
    { key: 'medals', testId: 'tab-medals', label: t('catalog.tabMedals'), perm: CatalogPermissions.Medals },
    { key: 'pets', testId: 'tab-pets', label: t('catalog.tabPets'), perm: CatalogPermissions.Pets },
  ].filter((tab) => has(tab.perm))

  const [active, setActive] = useState<TabKey | null>(tabs[0]?.key ?? null)

  if (!hasAnyCatalog(has)) return <Navigate to="/home" replace />
  const current = active && tabs.some((tab) => tab.key === active) ? active : tabs[0]?.key ?? null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t('catalog.title')}</h1>
      <div className="flex gap-2 border-b border-ink/10">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" data-testid={tab.testId} onClick={() => setActive(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${current === tab.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-muted hover:text-ink'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {current === 'reward-items' && <RewardItemsPanel />}
      {current === 'medals' && <MedalsPanel />}
      {current === 'pets' && <PetSpeciesPanel />}
    </div>
  )
}
```

- [ ] **Step 4: 加路由到 `App.tsx`**

import 加 `import { CatalogPage } from '@/features/catalog/CatalogPage'`;在 `/catalog/pets/:id`(Task 10 已加)之前加:

```tsx
          <Route path="/catalog" element={<CatalogPage />} />
```

- [ ] **Step 5: `AppLayout.tsx` nav 加权限门控项**

改 icon import 增 `Boxes`:`import { Home, Users, ClipboardCheck, Map, Boxes } from 'lucide-react'`。
在组件内(现有 `nav` 数组下方)按权限拼接:

```tsx
import { useAuthStore } from '@/stores/authStore'
import { hasAnyCatalog } from '@/lib/permissions'
```
在 `AppLayout` 函数体内、`return` 前:
```tsx
  const has = useAuthStore((s) => s.hasPermission)
  const navItems = [...nav, ...(hasAnyCatalog(has) ? [{ to: '/catalog', icon: Boxes, key: 'nav.catalog' }] : [])]
```
把渲染循环从 `nav.map(...)` 改为 `navItems.map(...)`。

- [ ] **Step 6: 运行确认通过 + 全量 + typecheck**

Run: `npm test -- CatalogPage` → PASS。
Run: `npm test` → 全绿。
Run: `npm run typecheck` → 无错误。
Run: `npm run build` → 成功。

- [ ] **Step 7: 提交**

```bash
git add src/features/catalog/CatalogPage.tsx src/App.tsx src/components/layout/AppLayout.tsx src/features/catalog/CatalogPage.test.tsx
git commit -m "$(cat <<'EOF'
feat(parent-web): 图鉴 tab 页(按权限)+ 导航门控 + /catalog 路由

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 最终验收

全部任务完成后：

- 前端(在 `frontend/parent-web`):`npm run build && npm test && npm run typecheck` → 构建成功、vitest 全绿、无类型错误。
- 手动冒烟(需后端跑起来 + admin 登录):侧栏出现「图鉴管理」→ 三 tab → 建/改/删道具与勋章 + 传图 → 建宠物 → 详情页填 5 形态 + 传封面/精灵图/进化视频 → 完整后「启用」可点 → 家长端创建旅程向导能选到新建的道具/勋章。
- 后端未改,无需跑后端测试(仍应为 Domain 56 + EFCore 61)。

**功能覆盖回溯(spec §1–§9):**
- §3 门控 → Task 4(常量)+ Task 11(nav/tab 门控);authStore 已有权限支持,无需新任务。
- §4/§5 服务与类型 → Task 2(含上传 gotcha)+ Task 1(契约核实)。
- §5 hooks → Task 3。
- §6 IA/页面 → Task 6(道具)/7(勋章)/8+9+10(宠物)/11(tab 壳 + nav + 路由)。
- §7 上传 UX → Task 5(`FileUploadField`)贯穿各上传点。
- §8 宠物完整度/激活 → Task 10。
- §9 测试 → 各任务 vitest;§9 i18n 一致性复用 `locales.test.ts`(Task 4 纳入新键)。

**部署/遗留(承 spec §10/§12,记入 NEXT-STEPS,非本 slice 阻塞):** 种子保留(仅空表);上线前评估 Development-only 种子 + 改 admin 默认密码;大视频请求体上限(NEXT-STEPS §0);上传契约以 Task 1 实测为准;换扩展名重传的孤儿 OSS 对象(第一期技术债)。
