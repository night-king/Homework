# 孩子端看板 · 设计系统 + 结构移植 实施计划（Plan 2/3）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把孩子端每日看板从「行为对、样子不对」的现状，照原型 `child-homepage.html` 全量移植成顶栏 + 周条 + 纸感面板舞台 + 成长槽 + 今日委托 + 补给台的两栏布局，视觉忠实原型。

**Architecture:** 把当前 112 行的单体 `DailyBoard.tsx` 拆成布局编排 + 八个聚焦部件；原型 21 个 `:root` 令牌搬到 `.kid-shell`（自定义属性向下继承，`var(--x)` 引用一字不改），各部件从原型对应 CSS 段**整段搬**（声明逐字复制，只把选择器改名为 `kid-*` 并收进 `.kid-shell` 作用域）。数据照 Plan 1 已落地的真实端点（`week-strip` + `daily-board` 带 `rewardName`/`estimatedMinutes`）。

**Tech Stack:** React 19 / Vite 6 / react-router 7 / @tanstack/react-query 5 / i18next / vitest 3（jsdom）。CSS 为普通 `.css` 文件，经 `KidLayout.tsx` 的 `import './kid.css'` 全局引入。

**Spec:** `docs/superpowers/specs/2026-07-16-child-board-prototype-port-design.md`（§3 组件边界 / §5 数据流 / §6 视觉层 / §7 测试）
**移植源:** `frontend/child-web-prototype/child-homepage.html`（4925 行；`<style>` 8–3102，DOM 3104+，CSS 行号见下方各任务）

## Global Constraints

**分支：** `feat/child-board-prototype-port`（已存在，Plan 1 已合入，HEAD `af609bf`）。不新建分支。

**工作目录：** 所有前端命令从 `frontend/parent-web` 跑。**测试命令 `npm test`（= `vitest run`）也在此目录**——从仓库根跑会选到另一个 vitest 版本、且解析不了 `@` 别名。

**类型检查真命令：** `npm run typecheck`（`tsc -b --noEmit`）。**`npx tsc --noEmit` 在本仓库是 no-op**（根 `tsconfig.json` 为 `{"files":[],"references":[...]}`）。`tsconfig.app.json` 的 `include:["src"]` 覆盖测试文件，所以测试文件也会被类型检查。

**测试基建：** `src/test-setup.ts` 全局 `vi.mock('@/i18n/config')`，所以组件里 `t('play.foo')` 在测试中**返回键名字符串 `play.foo`**（不是译文）。断言按键名。渲染任何用了 query 的组件需包一层 `QueryClientProvider`；service 函数用 `vi.mock('@/services/playService')` 打桩。

**CSS 移植铁律（本计划的成败所在）：**
1. **声明块逐字复制**——属性、值、渐变、阴影、`@keyframes` 内容原样搬。**「翻译即丢失」正是本轮返工的成因**，不要凭记忆重写、不要「优化」数值。
2. **选择器改名 + 收进作用域**：原型的 `.foo` → `.kid-shell .kid-foo`（每个任务给改名表）。JSX 用 `className="kid-foo"`。
3. **CSS 自定义属性名不改**：`var(--bg-top)` 等原样保留，从 `.kid-shell` 上的令牌解析（Task 3 建）。
4. **只搬列出的 `@keyframes`**，跳过原型标注的死代码（pet-dex / evolution-avatar / 聊天午睡 / evolveButton / cutscene / pet-select-overlay）。

**红线（改了就是把已修的 bug 改回去）：**
- **满级庆祝的 hoist 不许动。** 庆祝 state（`cutscene`/`completedJourneyId`）挂在 `KidGameShell`、作为 `screen()` 之外的兄弟渲染。`DailyBoard` 被拆碎后更容易手滑把它挪回来——**不许**。
- **`feed` 的三个失效目标（active + backpack + collection）一个不动。** 它们是 2026-07-16 修满级庆祝时刚补齐的；`collection` 看着与喂养无关但满级即时写收藏墙，按「只满级时失效」去改就会退回那个 bug，而满级路径恰是 mock 测试的结构盲区。
- **勾/取消任务要失效 `weekStrip`**（本计划新增目标）——漏了则顶栏进度和周条日期状态勾完不动。
- **奖励三字段（`rewardName`/`rewardGlyph`/`rewardIconUrl`）只有 `GetDailyBoard` 填。** `completeTask`/`uncompleteTask` 返回的 DTO 这三个字段恒为 null。**不许**用 `complete.mutate` 的 `onSuccess` 回包 `setQueryData`/乐观更新这几个字段——会把奖励名刷空。要奖励名就从 board 缓存读。

**保留全部现有 `data-testid`**（拆分不得改变测试面）：`pet-sprite`、`growth-bar`、`open-collection`、`task-${id}`、`task-toggle-${id}`、`backpack-empty`、`backpack-item-${id}`、`play-empty`、`empty-see-collection`，以及各旧屏的 testid。

**i18n：** 新键必须**同时**加进 `public/locales/zh-CN/translation.json` 和 `public/locales/en/translation.json`，否则 `src/i18n/locales.test.ts` 的键对齐断言会红。

**提交信息结尾必须是：** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

### Task 1: 数据层 —— 前端类型 + 周条 service + `useWeekStrip` + 失效接线

前端还不知道 Plan 1 的后端改动。补齐类型、service、hook，并把 `weekStrip` 加进勾/取消任务的失效集。

**Files:**
- Modify: `frontend/parent-web/src/types/homework.ts`
- Modify: `frontend/parent-web/src/services/playService.ts`
- Modify: `frontend/parent-web/src/hooks/usePlay.ts`
- Test: `frontend/parent-web/src/hooks/usePlay.weekstrip.test.tsx`（新建）

**Interfaces:**
- Consumes: 无
- Produces: 类型 `WeekStripDto`/`WeekDayDto`；`DailyTaskDto` 增 `rewardName?`/`rewardGlyph?`/`rewardIconUrl?`/`estimatedMinutes?`；`getWeekStrip(childId, weekStart) → Promise<WeekStripDto>`；`weekStripKey(childId, weekStart)`；`useWeekStrip(childId, weekStart)`。Task 4/5/8 消费。

- [ ] **Step 1: 写失败的测试**

Create `frontend/parent-web/src/hooks/usePlay.weekstrip.test.tsx`：

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'

vi.mock('@/services/playService', () => ({
  getWeekStrip: vi.fn(),
  completeTask: vi.fn(),
  uncompleteTask: vi.fn(),
  getActiveJourney: vi.fn(), startJourney: vi.fn(), getPlayDailyBoard: vi.fn(),
  getBackpack: vi.fn(), getCollection: vi.fn(), feed: vi.fn(),
}))

import * as svc from '@/services/playService'
import { useWeekStrip, usePlayMutations, weekStripKey } from '@/hooks/usePlay'

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useWeekStrip', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches the week strip for the given monday', async () => {
    vi.mocked(svc.getWeekStrip).mockResolvedValue({
      streak: 3,
      days: [{ date: '2026-07-13', isRestDay: false, tasksTotal: 2, tasksCompleted: 2, isFull: true }],
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useWeekStrip('c1', '2026-07-13'), { wrapper: wrapper(qc) })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(svc.getWeekStrip).toHaveBeenCalledWith('c1', '2026-07-13')
    expect(result.current.data!.streak).toBe(3)
  })

  it('complete invalidates the week strip key (顶栏进度/连续/日期状态要跟着变)', async () => {
    vi.mocked(svc.completeTask).mockResolvedValue({} as never)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => usePlayMutations('c1', 'j1'), { wrapper: wrapper(qc) })
    await result.current.complete.mutateAsync('t1')
    const invalidated = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey))
    expect(invalidated).toContain(JSON.stringify(['play', 'weekstrip', 'c1']))
  })

  it('uncomplete also invalidates the week strip key', async () => {
    vi.mocked(svc.uncompleteTask).mockResolvedValue({} as never)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => usePlayMutations('c1', 'j1'), { wrapper: wrapper(qc) })
    await result.current.uncomplete.mutateAsync('t1')
    const invalidated = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey))
    expect(invalidated).toContain(JSON.stringify(['play', 'weekstrip', 'c1']))
  })

  it('feed does NOT gain a weekstrip invalidation (三个目标不许动)', async () => {
    vi.mocked(svc.feed).mockResolvedValue({ evolved: false, completed: false } as never)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => usePlayMutations('c1', 'j1'), { wrapper: wrapper(qc) })
    await result.current.feed.mutateAsync({ childId: 'c1', journeyId: 'j1', rewardItemId: 'r1' })
    const invalidated = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey))
    expect(invalidated).toContain(JSON.stringify(['play', 'active', 'c1']))
    expect(invalidated).toContain(JSON.stringify(['play', 'backpack', 'c1']))
    expect(invalidated).toContain(JSON.stringify(['play', 'collection', 'c1']))
    expect(invalidated).not.toContain(JSON.stringify(['play', 'weekstrip', 'c1']))
  })
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run（从 `frontend/parent-web`）: `npm test -- usePlay.weekstrip`
Expected: FAIL —— `useWeekStrip`/`weekStripKey` 未导出、`getWeekStrip` 不存在。

- [ ] **Step 3: 加类型**

`src/types/homework.ts`——给 `DailyTaskDto` 接口**追加**四个可空字段（放在 `rewardGranted` 之后）：

```ts
  rewardName?: string | null
  rewardGlyph?: string | null
  rewardIconUrl?: string | null
  estimatedMinutes?: number | null
```

并在文件末尾（其它 DTO 附近）新增：

```ts
export interface WeekDayDto {
  date: string
  isRestDay: boolean
  tasksTotal: number
  tasksCompleted: number
  isFull: boolean
}

export interface WeekStripDto {
  streak: number
  days: WeekDayDto[]
}
```

- [ ] **Step 4: 加 service 函数**

`src/services/playService.ts`——`WeekStripDto` 加进 import，并在 `getPlayDailyBoard` 之后加：

```ts
export const getWeekStrip = (childId: string, weekStart: string) =>
  api.get<WeekStripDto>(`${base}/week-strip`, { params: { childId, weekStart } }).then((r) => r.data)
```

（端点：`GET /api/app/journey-play/week-strip?childId=…&weekStart=…`。`GetWeekStripInput` 两个字段走 query，正因如此后端才用 Input 对象绕开 ABP 单 `*Id` 提升为路径段的坑。）

- [ ] **Step 5: 加 hook + 失效接线**

`src/hooks/usePlay.ts`：
1. import 里加 `getWeekStrip`。
2. 加 key 构造器（与其它并列）：
```ts
export const weekStripKey = (childId: string, weekStart: string) => ['play', 'weekstrip', childId, weekStart]
```
3. 加查询 hook：
```ts
export function useWeekStrip(childId: string, weekStart: string) {
  return useQuery({
    queryKey: weekStripKey(childId, weekStart),
    queryFn: () => getWeekStrip(childId, weekStart),
    enabled: !!childId && !!weekStart,
  })
}
```
4. `usePlayMutations` 内新增失效助手（与现有并列，用**前缀**匹配，跟 `invalidateBoard` 同款）：
```ts
const invalidateWeekStrip = () => qc.invalidateQueries({ queryKey: ['play', 'weekstrip', childId] })
```
5. 把 `complete` 和 `uncomplete` 的 `onSuccess` 各加一句 `void invalidateWeekStrip()`（两者当前是 `void invalidateBoard(); void invalidateBackpack()` → 变成三句）。
6. **`feed` 的 onSuccess 一字不动**（保持 `invalidateActive/invalidateBackpack/invalidateCollection`）。

- [ ] **Step 6: 跑测试确认通过 + 类型检查**

Run: `npm test -- usePlay.weekstrip` → PASS（4/4）
Run: `npm run typecheck` → 净（无错误）

- [ ] **Step 7: 提交**

```bash
git add frontend/parent-web/src/types/homework.ts frontend/parent-web/src/services/playService.ts frontend/parent-web/src/hooks/usePlay.ts frontend/parent-web/src/hooks/usePlay.weekstrip.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): 数据层接 Plan 1 —— WeekStripDto 类型/service/useWeekStrip + 勾任务失效 weekStrip

前端补齐 Plan 1 的后端改动:DailyTaskDto 增 rewardName/glyph/iconUrl/
estimatedMinutes;新增 WeekStripDto/WeekDayDto + getWeekStrip + useWeekStrip。
勾/取消任务的失效集加上 weekstrip(否则顶栏进度和周条日期状态勾完不动)。
feed 的三个失效目标一字不动(红线:collection 看着无关但满级即时写收藏墙)。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `dayStatus.ts` —— 周条状态纯函数

原型 `getDayStatusMeta(day, index)`（`child-homepage.html:4328–4346`）是本轮最绕的逻辑。拆成纯函数，直接单测，不渲染。

**Files:**
- Create: `frontend/parent-web/src/features/play/dayStatus.ts`
- Test: `frontend/parent-web/src/features/play/dayStatus.test.ts`

**Interfaces:**
- Consumes: `WeekDayDto`（Task 1）
- Produces: `type DayTone = 'rest' | 'complete' | 'active' | 'pending' | 'future' | 'locked'`；`dayStatus(day: WeekDayDto, today: string) → { tone: DayTone; labelKey: string }`。Task 4 的 `DayStrip` 消费。

- [ ] **Step 1: 写失败的测试**

Create `dayStatus.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { dayStatus } from './dayStatus'
import type { WeekDayDto } from '@/types/homework'

const day = (over: Partial<WeekDayDto>): WeekDayDto => ({
  date: '2026-07-15', isRestDay: false, tasksTotal: 3, tasksCompleted: 0, isFull: false, ...over,
})
const TODAY = '2026-07-15'

describe('dayStatus', () => {
  it('休息日 → rest', () => {
    expect(dayStatus(day({ isRestDay: true, tasksTotal: 0 }), TODAY).tone).toBe('rest')
  })
  it('今天·全做完 → complete', () => {
    expect(dayStatus(day({ tasksCompleted: 3, isFull: true }), TODAY)).toEqual({ tone: 'complete', labelKey: 'play.dayDone' })
  })
  it('今天·做了一部分 → active', () => {
    expect(dayStatus(day({ tasksCompleted: 1 }), TODAY).tone).toBe('active')
  })
  it('今天·一个没做 → pending', () => {
    expect(dayStatus(day({ tasksCompleted: 0 }), TODAY)).toEqual({ tone: 'pending', labelKey: 'play.dayPending' })
  })
  it('过去·一个没做 → locked 未开', () => {
    expect(dayStatus(day({ date: '2026-07-13', tasksCompleted: 0 }), TODAY)).toEqual({ tone: 'locked', labelKey: 'play.dayLocked' })
  })
  it('过去·全做完 → complete 已攻克', () => {
    expect(dayStatus(day({ date: '2026-07-13', tasksCompleted: 3, isFull: true }), TODAY).tone).toBe('complete')
  })
  it('过去·做了一部分 → active', () => {
    expect(dayStatus(day({ date: '2026-07-13', tasksCompleted: 1 }), TODAY).tone).toBe('active')
  })
  it('未来·一个没做 → future 待战', () => {
    expect(dayStatus(day({ date: '2026-07-17', tasksCompleted: 0 }), TODAY)).toEqual({ tone: 'future', labelKey: 'play.dayFuture' })
  })
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- dayStatus`
Expected: FAIL —— `./dayStatus` 无此模块。

- [ ] **Step 3: 实现（照原型 4328–4346 的分支，逐条对应）**

Create `dayStatus.ts`：

```ts
import type { WeekDayDto } from '@/types/homework'

export type DayTone = 'rest' | 'complete' | 'active' | 'pending' | 'future' | 'locked'

/**
 * 移植自原型 getDayStatusMeta（child-homepage.html:4328–4346）。
 * 用 date 与 today 的比较代替原型的 index<todayIndex；labelKey 交 i18n。
 */
export function dayStatus(day: WeekDayDto, today: string): { tone: DayTone; labelKey: string } {
  if (day.isRestDay) return { tone: 'rest', labelKey: 'play.dayRest' }

  const done = day.tasksCompleted
  const total = day.tasksTotal

  if (day.date === today) {
    if (day.isFull) return { tone: 'complete', labelKey: 'play.dayDone' }
    return done > 0
      ? { tone: 'active', labelKey: 'play.dayActive' }
      : { tone: 'pending', labelKey: 'play.dayPending' }
  }

  if (done === 0) {
    return day.date < today
      ? { tone: 'locked', labelKey: 'play.dayLocked' }
      : { tone: 'future', labelKey: 'play.dayFuture' }
  }
  if (done === total) return { tone: 'complete', labelKey: 'play.dayConquered' }
  return { tone: 'active', labelKey: 'play.dayActive' }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- dayStatus` → PASS（8/8）

- [ ] **Step 5: 提交**

```bash
git add frontend/parent-web/src/features/play/dayStatus.ts frontend/parent-web/src/features/play/dayStatus.test.ts
git commit -m "$(cat <<'EOF'
feat(play-fe): dayStatus 纯函数 —— 周条七态,移植原型 getDayStatusMeta

休息/未开/待战/待开始/进行中/已攻克/已完成七态,用 date vs today 比较
代替原型的 index<todayIndex。纯函数直接单测,不渲染。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 设计令牌 + 布局外壳 CSS + DailyBoard 两栏重构 + 选中日期

铺底：把 21 个令牌搬上 `.kid-shell`、修背景渐变、建纸感面板与两栏栅格、给 `DailyBoard` 换上两栏外壳并引入 `selectedDate` 状态。此后各部件往这个壳里填。

**Files:**
- Create: `frontend/parent-web/src/features/play/kid/tokens.css`
- Create: `frontend/parent-web/src/features/play/kid/shell.css`
- Modify: `frontend/parent-web/src/features/play/kid.css`（顶部加 `@import`）
- Modify: `frontend/parent-web/src/features/play/DailyBoard.tsx`
- Test: `frontend/parent-web/src/features/play/DailyBoard.layout.test.tsx`（新建）

**Interfaces:**
- Consumes: `usePlayBoard`（现有）
- Produces: `.kid-shell` 上的 21 个令牌（Task 4–9 的 `var(--x)` 从这里解析）；DailyBoard 内的 `selectedDate` 状态 + `mondayOf(date)` 辅助 + 结构容器 `.kid-topbar-slot` / `.main-grid` / `.side-stack`（testid `kid-main` / `kid-side`）。

- [ ] **Step 1: 写失败的测试**

Create `DailyBoard.layout.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { JourneyDto } from '@/types/homework'

// 桩法照现有 DailyBoard.test.tsx:playService 工厂 + homeworkService 供 species。
// 本任务 DailyBoard 还没接 KidTopBar(Task 5 才接),所以不需要 getWeekStrip。
vi.mock('@/services/playService')
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([{ id: 'p1', name: '火龙', code: 'dragon', forms: [] }]),
}))

import * as svc from '@/services/playService'
import { DailyBoard } from './DailyBoard'

const journey: JourneyDto = {
  id: 'j1', childId: 'c1', title: '旅程', startDate: '2026-07-01', endDate: '2026-08-31',
  medalId: 'm1', status: 1, petSpeciesId: 'p1', currentLevel: 1, growthPoints: 0,
}

function renderBoard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DailyBoard childId="c1" journey={journey} onFeedResult={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DailyBoard 两栏外壳', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(svc.getPlayDailyBoard).mockResolvedValue({
      childId: 'c1', date: '2026-07-15', tasks: [], tasksTotal: 0, tasksCompleted: 0,
      stars: 0, isFull: false, isRestDay: true,
    })
    vi.mocked(svc.getBackpack).mockResolvedValue([])
  })

  it('渲染主栏与侧栏两个结构容器', () => {
    renderBoard()
    expect(screen.getByTestId('kid-main')).toBeInTheDocument()
    expect(screen.getByTestId('kid-side')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- DailyBoard.layout`
Expected: FAIL —— 找不到 `kid-main` / `kid-side`。

- [ ] **Step 3: 建令牌文件**

Create `kid/tokens.css`——把原型 `:root`（`child-homepage.html:8–32`）的 **21 个令牌逐字**搬到 `.kid-shell`：

```css
/* 原型 child-homepage.html:8–32 的 :root 令牌,原样搬到 .kid-shell(不放 :root,避免泄漏进家长端 shadcn)。
   变量名不改,各部件 var(--x) 从这里解析。 */
.kid-shell {
  --bg-top: #fff5d7;
  --bg-bottom: #f4f8ff;
  --paper: rgba(255, 251, 241, 0.88);
  --paper-strong: rgba(255, 248, 230, 0.96);
  --line: rgba(78, 53, 28, 0.12);
  --ink: #2c221d;
  --muted: #6f6256;
  --brand: #ff7a37;
  --brand-deep: #de5416;
  --gold: #ffc54d;
  --sky: #3da6ff;
  --teal: #1fbead;
  --mint: #dcfff4;
  --success: #2eb769;
  --danger: #ff825b;
  --shadow-lg: 0 28px 60px rgba(163, 93, 13, 0.16);
  --shadow-md: 0 16px 30px rgba(77, 58, 24, 0.12);
  --radius-xl: 30px;
  --radius-lg: 22px;
  --radius-md: 16px;
  --content-width: 1280px;
}
```

- [ ] **Step 4: 建外壳布局文件 + 改背景渐变**

Create `kid/shell.css`——移植原型 `.app-shell`(62–67)、`.panel`(69–75)、`.main-grid`(285–290)、`.side-stack`(1257–1261) 及两处断点（1100px：`.main-grid` 塌成单列 2349–2351；760px：`.panel` 圆角 2402–2404）。选择器改名 + 收进 `.kid-shell`：

| 原型 | 目标 |
|---|---|
| `.app-shell` | `.kid-board` |
| `.main-grid` | `.kid-main-grid` |
| `.side-stack` | `.kid-side-stack` |
| `.panel` | `.kid-panel` |

**以下值已从原型逐行核对，照抄（勿凭记忆改数值）：**

```css
.kid-shell .kid-board {
  width: min(var(--content-width), calc(100vw - 32px));
  margin: 24px auto 40px;
  display: grid;
  gap: 18px;
}
.kid-shell .kid-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background: var(--paper);
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow-md);
}
.kid-shell .kid-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(340px, 420px);
  gap: 18px;
  align-items: stretch;
}
.kid-shell .kid-side-stack {
  display: grid;
  gap: 18px;
  align-content: start;
}
@media (max-width: 1100px) {
  /* 原型 2349–2351:塌成单列 */
  .kid-shell .kid-main-grid { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  /* 原型 2402–2404 */
  .kid-shell .kid-panel { border-radius: var(--radius-lg); }
}
```

**注意 `.kid-panel` 原型里没有 padding**——原型的 padding 由各面板类型单独给（`.quest-panel/.reward-panel/.growth-panel{padding:18px}` 等）。所以每个部件的 CSS（Task 5–9）各自设自己的 padding，`.kid-panel` 只管边框/圆角/底色/模糊/阴影。核对原型对应面板类型的 padding 值后在各任务里给。

并**改 `.kid-shell` 背景渐变**：现状是一路橙到底，原型是奶油渐入淡蓝。这一步单独在 `shell.css` 顶部覆盖：

```css
/* 原型 body 背景(child-homepage.html:46):奶油渐入淡蓝,不是一路橙到底 */
.kid-shell {
  background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
}
```

- [ ] **Step 5: `kid.css` 顶部加 import**

`kid.css` 最顶端加（`@import` 必须在所有规则之前）：

```css
@import './kid/tokens.css';
@import './kid/shell.css';
```

保留 `kid.css` 现有全部规则不动（旧屏还在用；后续任务逐个迁移出去）。

- [ ] **Step 6: DailyBoard 换两栏外壳 + 引入 selectedDate**

**重要：本仓库 `tsconfig.app.json` 开了 `noUnusedLocals` + `noUnusedParameters`。** 任何本任务定义却没用到的局部变量/函数（`mondayOf`、`weekStart`、未使用的 `setSelectedDate`）都会让 `npm run build` 报错。所以本任务**只引入 `selectedDate`（无 setter）**，`mondayOf`/`weekStart`/setter 全部推到 Task 5 真正接 DayStrip 时再加。

`DailyBoard.tsx`——组件体内把 `const date = useMemo(todayStr, [])` 改为：
```ts
const today = useMemo(todayStr, [])
const [selectedDate] = useState(today) // Task 5 接 DayStrip 时改为带 setter
const board = usePlayBoard(childId, selectedDate)
```
（import 补 `useState`。）**保留** pet-stage/stats/collection-link/tasks/backpack 的现有 JSX 和 testid **暂不拆**，只是塞进新容器。只做两件事：
1. `date` → `selectedDate`（值仍是 today，行为不变）。
2. 最外层重排为两栏骨架，把现有五个区块塞进去：

```tsx
return (
  <div className="kid-board">
    <div className="kid-topbar-slot">{/* Task 5 放 KidTopBar；本任务留空占位 */}</div>
    <div className="kid-main-grid">
      <section className="kid-panel kid-stage-panel" data-testid="kid-main">
        {/* 现有 pet-stage + stats + collection-link 原样搬进来 */}
      </section>
      <aside className="kid-side-stack" data-testid="kid-side">
        {/* 现有 tasks section + backpack 原样搬进来 */}
      </aside>
    </div>
  </div>
)
```
把原有的 `<section className="kid-stage">…`、`<section className="kid-stats">…`、collection `<Link>` 移进 `kid-main`；把 `<section className="kid-tasks">…` 和 `<Backpack…/>` 移进 `kid-side`。**所有现有 testid/className 保持不变**，只是父容器变了。

- [ ] **Step 7: 跑测试 + 类型检查 + 全量**

Run: `npm test -- DailyBoard` → 新 layout 测试 PASS，且现有 `DailyBoard.*.test.tsx`（complete/feed/test）**全绿不回归**。
Run: `npm run typecheck` → 净。

- [ ] **Step 8: 提交**

```bash
git add frontend/parent-web/src/features/play/kid/ frontend/parent-web/src/features/play/kid.css frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/DailyBoard.layout.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): 设计令牌 + 两栏外壳 + DailyBoard 结构骨架

21 个原型令牌搬上 .kid-shell(变量名不改,var(--x) 从这里解析);
背景渐变从一路橙到底改回原型的奶油渐入淡蓝;建纸感面板 .kid-panel
+ 两栏栅格(main-grid + side-stack)含 1100/760 断点。DailyBoard 外层
换成两栏骨架,现有五区块原样塞进主/侧栏(testid 不变),引入 selectedDate。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `DayStrip` 组件 —— 七日按钮 + 选中/未来锁定

**Files:**
- Create: `frontend/parent-web/src/features/play/DayStrip.tsx`
- Create: `frontend/parent-web/src/features/play/kid/daystrip.css`
- Modify: `frontend/parent-web/src/features/play/kid.css`（加 `@import './kid/daystrip.css'`）
- Test: `frontend/parent-web/src/features/play/DayStrip.test.tsx`

**Interfaces:**
- Consumes: `WeekDayDto`（Task 1）、`dayStatus`（Task 2）
- Produces: `DayStrip` 组件，props `{ days: WeekDayDto[]; today: string; selectedDate: string; onSelectDate: (d: string) => void }`；testid `day-chip-${date}`。Task 5 的 `KidTopBar` 渲染它。

- [ ] **Step 1: 写失败的测试**

Create `DayStrip.test.tsx`：

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DayStrip } from './DayStrip'
import type { WeekDayDto } from '@/types/homework'

const days: WeekDayDto[] = [
  { date: '2026-07-13', isRestDay: false, tasksTotal: 2, tasksCompleted: 2, isFull: true },  // 过去·已攻克
  { date: '2026-07-15', isRestDay: false, tasksTotal: 3, tasksCompleted: 1, isFull: false }, // 今天·进行中
  { date: '2026-07-17', isRestDay: false, tasksTotal: 3, tasksCompleted: 0, isFull: false }, // 未来·待战
]
const TODAY = '2026-07-15'

it('渲染每天一个按钮,选中日带 is-selected', () => {
  render(<DayStrip days={days} today={TODAY} selectedDate={TODAY} onSelectDate={() => {}} />)
  expect(screen.getByTestId('day-chip-2026-07-13')).toBeInTheDocument()
  expect(screen.getByTestId('day-chip-2026-07-15').className).toContain('is-selected')
})

it('未来日按钮 disabled,点了不触发 onSelectDate', () => {
  const onSelect = vi.fn()
  render(<DayStrip days={days} today={TODAY} selectedDate={TODAY} onSelectDate={onSelect} />)
  const future = screen.getByTestId('day-chip-2026-07-17')
  expect(future).toBeDisabled()
  fireEvent.click(future)
  expect(onSelect).not.toHaveBeenCalled()
})

it('点过去日触发 onSelectDate(补做入口)', () => {
  const onSelect = vi.fn()
  render(<DayStrip days={days} today={TODAY} selectedDate={TODAY} onSelectDate={onSelect} />)
  fireEvent.click(screen.getByTestId('day-chip-2026-07-13'))
  expect(onSelect).toHaveBeenCalledWith('2026-07-13')
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- DayStrip`
Expected: FAIL —— `./DayStrip` 无此模块。

- [ ] **Step 3: 实现组件**

Create `DayStrip.tsx`：

```tsx
import { useTranslation } from 'react-i18next'
import { dayStatus } from './dayStatus'
import type { WeekDayDto } from '@/types/homework'

const WEEK_NAMES = ['play.sun', 'play.mon', 'play.tue', 'play.wed', 'play.thu', 'play.fri', 'play.sat']

export function DayStrip({ days, today, selectedDate, onSelectDate }: {
  days: WeekDayDto[]
  today: string
  selectedDate: string
  onSelectDate: (date: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="kid-day-strip">
      {days.map((day) => {
        const { tone, labelKey } = dayStatus(day, today)
        const isFuture = day.date > today
        const isSelected = day.date === selectedDate
        const dow = new Date(day.date + 'T00:00:00').getDay()
        const dd = day.date.slice(5) // MM-DD
        return (
          <button
            key={day.date}
            type="button"
            data-testid={`day-chip-${day.date}`}
            className={`kid-day-chip${isSelected ? ' is-selected' : ''}`}
            disabled={isFuture}
            onClick={() => onSelectDate(day.date)}
          >
            <span className="kid-day-top-slot">
              {day.date === today && <span className="kid-day-today-tag">{t('play.today')}</span>}
            </span>
            <span className="kid-day-name">{t(WEEK_NAMES[dow])}</span>
            <span className="kid-day-date">{dd}</span>
            <span className={`kid-day-state is-${tone}`}>{t(labelKey)}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 移植 CSS**

Create `kid/daystrip.css`——移植原型 `.day-strip`(160–165)、`.day-chip`(166–194 含 hover/is-selected)、`.day-top-slot`(196–205)、`.day-today-tag`(207–228)、`.day-name`(230–233)、`.day-date`(235–238)、`.day-state`(240–283 含六个 `.is-*` 色调)、断点 760px（7→4 列 2410–2412）。改名表：

| 原型 | 目标 |
|---|---|
| `.day-strip` | `.kid-day-strip` |
| `.day-chip` / `.day-chip.is-selected` / `:hover` | `.kid-day-chip` … |
| `.day-top-slot` | `.kid-day-top-slot` |
| `.day-today-tag` | `.kid-day-today-tag` |
| `.day-name` | `.kid-day-name` |
| `.day-date` | `.kid-day-date` |
| `.day-state` + `.is-pending/.is-active/.is-complete/.is-future/.is-locked/.is-rest` | `.kid-day-state` + 同名 `.is-*` |

全部收进 `.kid-shell` 作用域，声明逐字搬（六个状态色调是硬编码色，原样保留）。`@import './kid/daystrip.css'` 加进 `kid.css`。

- [ ] **Step 5: 跑测试确认通过**

Run: `npm test -- DayStrip` → PASS（3/3）
Run: `npm run typecheck` → 净

- [ ] **Step 6: 提交**

```bash
git add frontend/parent-web/src/features/play/DayStrip.tsx frontend/parent-web/src/features/play/kid/daystrip.css frontend/parent-web/src/features/play/kid.css frontend/parent-web/src/features/play/DayStrip.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): DayStrip 周条组件 —— 七日按钮,未来日锁定,过去日补做入口

消费 dayStatus + WeekDayDto。未来日 disabled(点不动),过去日可点(补做),
选中日 is-selected。CSS 整段移植原型 .day-strip/.day-chip/.day-state
(六态色调),改名 kid-* 收进 .kid-shell。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `KidTopBar` —— 顶栏(头像/名字 + 周条 + 三个 stat-pill)+ 接 DailyBoard 选中日期

**Files:**
- Create: `frontend/parent-web/src/features/play/KidTopBar.tsx`
- Create: `frontend/parent-web/src/features/play/kid/topbar.css`
- Modify: `frontend/parent-web/src/features/play/kid.css`（加 import）
- Modify: `frontend/parent-web/src/features/play/DailyBoard.tsx`（放入 KidTopBar，接通 selectedDate/onSelectDate + weekStart）
- Test: `frontend/parent-web/src/features/play/KidTopBar.test.tsx`

**Interfaces:**
- Consumes: `useWeekStrip`（Task 1）、`DayStrip`（Task 4）、`DailyBoardDto`（现有）
- Produces: `KidTopBar` props `{ childName: string; weekStrip?: WeekStripDto; board?: DailyBoardDto; today: string; selectedDate: string; onSelectDate: (d: string) => void }`；testid `topbar-stars`/`topbar-streak`/`topbar-progress`。

- [ ] **Step 1: 写失败的测试**

Create `KidTopBar.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KidTopBar } from './KidTopBar'
import type { WeekStripDto, DailyBoardDto } from '@/types/homework'

const weekStrip: WeekStripDto = {
  streak: 4,
  days: [{ date: '2026-07-15', isRestDay: false, tasksTotal: 3, tasksCompleted: 1, isFull: false }],
}
const board: DailyBoardDto = {
  childId: 'c1', date: '2026-07-15', tasks: [], tasksTotal: 4, tasksCompleted: 2,
  stars: 3, isFull: false, isRestDay: false,
}

it('三个 stat-pill 显示星星/连续/进度', () => {
  render(<KidTopBar childName="乐乐" weekStrip={weekStrip} board={board}
    today="2026-07-15" selectedDate="2026-07-15" onSelectDate={() => {}} />)
  expect(screen.getByTestId('topbar-stars')).toHaveTextContent('3')
  expect(screen.getByTestId('topbar-streak')).toHaveTextContent('4')
  expect(screen.getByTestId('topbar-progress')).toHaveTextContent('2/4')
})

it('缺数据时 pill 退化为 0/破折号,不崩', () => {
  render(<KidTopBar childName="乐乐" today="2026-07-15" selectedDate="2026-07-15" onSelectDate={() => {}} />)
  expect(screen.getByTestId('topbar-streak')).toHaveTextContent('0')
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- KidTopBar`
Expected: FAIL —— 无此模块。

- [ ] **Step 3: 实现组件**

Create `KidTopBar.tsx`（照原型 DOM 3645–3671：profile + dayStrip + top-stats）：

```tsx
import { useTranslation } from 'react-i18next'
import { DayStrip } from './DayStrip'
import type { WeekStripDto, DailyBoardDto } from '@/types/homework'

export function KidTopBar({ childName, weekStrip, board, today, selectedDate, onSelectDate }: {
  childName: string
  weekStrip?: WeekStripDto
  board?: DailyBoardDto
  today: string
  selectedDate: string
  onSelectDate: (date: string) => void
}) {
  const { t } = useTranslation()
  const initial = childName.slice(0, 1) || '?'
  return (
    <section className="kid-panel kid-topbar">
      <div className="kid-profile">
        <div className="kid-avatar">{initial}</div>
        <div className="kid-profile-label">
          <div className="kid-overline">ADVENTURE BASE</div>
          <h1 className="kid-hero-name">{childName}</h1>
        </div>
      </div>
      <DayStrip days={weekStrip?.days ?? []} today={today} selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <div className="kid-top-stats">
        <div className="kid-stat-pill">
          <span className="kid-overline">{t('play.stars')}</span>
          <strong className="kid-stat-value" data-testid="topbar-stars">{board?.stars ?? 0}</strong>
        </div>
        <div className="kid-stat-pill">
          <span className="kid-overline">{t('play.streak')}</span>
          <strong className="kid-stat-value" data-testid="topbar-streak">{weekStrip?.streak ?? 0}</strong>
        </div>
        <div className="kid-stat-pill">
          <span className="kid-overline">{t('play.progress')}</span>
          <strong className="kid-stat-value" data-testid="topbar-progress">
            {board?.tasksCompleted ?? 0}/{board?.tasksTotal ?? 0}
          </strong>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 移植 CSS**

Create `kid/topbar.css`——移植原型 `.topbar`(77–83)、`.profile`(85–89)、`.avatar`(91–104)、`.profile-label`(106–109)、`.overline`(111–117)、`.hero-name`(119–124)、`.top-stats`(136–141)、`.stat-pill`(143–153)、`.stat-value`(155–158)、断点（1100px `.topbar`/`​.top-stats` 2341–2347；760px 2406–2409）。改名：`.topbar→.kid-topbar`、`.profile→.kid-profile`、`.avatar→.kid-avatar`、`.profile-label→.kid-profile-label`、`.overline→.kid-overline`、`.hero-name→.kid-hero-name`、`.top-stats→.kid-top-stats`、`.stat-pill→.kid-stat-pill`、`.stat-value→.kid-stat-value`。收进 `.kid-shell`，声明逐字。`@import` 加进 `kid.css`。

- [ ] **Step 5: 接进 DailyBoard**

`DailyBoard.tsx`：
1. import `KidTopBar` + `useWeekStrip`；`selectedDate` 改为带 setter：`const [selectedDate, setSelectedDate] = useState(today)`；在 `todayStr` 之后加 `mondayOf` 辅助（下方），建 `const weekStart = useMemo(() => mondayOf(today), [today])`；`const weekStrip = useWeekStrip(childId, weekStart)`。

`mondayOf` 辅助（放 `todayStr` 之后——本任务才首次用到，Task 3 定义会因 `noUnusedLocals` 报错，故留到这里）：
```ts
// 本地日期所在周的周一(原型周条以周一起头)
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay() // 0=周日
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
```
2. 把 `kid-topbar-slot` 占位替换为：
```tsx
<KidTopBar
  childName={journey.title}
  weekStrip={weekStrip.data}
  board={board.data}
  today={today}
  selectedDate={selectedDate}
  onSelectDate={setSelectedDate}
/>
```
（`childName` 暂用 `journey.title` 直接当顶栏标题——孩子名当前不在 `JourneyDto` 里；这是刻意取舍，真名接入留待后续。）
3. **删掉旧的 `<section className="kid-stats">`**（星星/进度已进顶栏）。pet-stage、collection-link、tasks、backpack 保持不变。

- [ ] **Step 6: 跑测试 + 类型 + 全量回归**

Run: `npm test -- KidTopBar` → PASS
Run: `npm test -- DailyBoard` → layout + 现有测试全绿（现有 `DailyBoard.test.tsx` 不断言星星/进度文本，删 `kid-stats` 不影响它；若某处确有断言则同步改为顶栏 testid，属预期变更）
Run: `npm run typecheck` → 净

- [ ] **Step 7: 提交**

```bash
git add frontend/parent-web/src/features/play/KidTopBar.tsx frontend/parent-web/src/features/play/kid/topbar.css frontend/parent-web/src/features/play/kid.css frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/KidTopBar.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): KidTopBar 顶栏 —— 头像/训练营名 + 周条 + 三 stat-pill,接进 DailyBoard

顶栏含 profile + DayStrip + 星星/连续/进度三 pill(星星/进度来自选中日 board,
连续来自 weekStrip)。接进 DailyBoard:selectedDate 带 setter,useWeekStrip
按本周周一拉,旧 kid-stats 行删除。CSS 整段移植原型 topbar 段。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `PetStage` —— 宠物舞台(精灵图 + 等级横幅 + 氛围层)

把 `DailyBoard` 里裸浮的精灵图 + 细成长条，换成原型的纸感舞台：光环/底盘/能量环/彩带 + `LV n` 横幅 + 形态名。**不含投掷落点**（那是 Plan 3）。成长条移到 Task 7 的 GrowthPanel——本任务舞台只留精灵图与氛围。

**Files:**
- Create: `frontend/parent-web/src/features/play/PetStage.tsx`
- Create: `frontend/parent-web/src/features/play/kid/stage.css`
- Modify: `kid.css`（import）+ `DailyBoard.tsx`（换入 PetStage）
- Test: `frontend/parent-web/src/features/play/PetStage.test.tsx`

**Interfaces:**
- Consumes: `PetFormDto`（现有）、`petStage.ts` 的 `currentForm`（现有）
- Produces: `PetStage` props `{ form?: PetFormDto; level: number }`；保留 testid `pet-sprite`。

- [ ] **Step 1: 写失败的测试**

Create `PetStage.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PetStage } from './PetStage'
import type { PetFormDto } from '@/types/homework'

const form: PetFormDto = { level: 2, name: '幼龙', spriteUrl: 'http://x/s.png', growthToNext: 40, scale: 1.1 }

it('有精灵图 → img,带等级横幅与形态名', () => {
  render(<PetStage form={form} level={2} />)
  const sprite = screen.getByTestId('pet-sprite')
  expect(sprite.tagName).toBe('IMG')
  expect(screen.getByText('LV 2')).toBeInTheDocument()
  expect(screen.getByText('幼龙')).toBeInTheDocument()
})

it('无精灵图 → 蛋兜底', () => {
  render(<PetStage form={undefined} level={1} />)
  const sprite = screen.getByTestId('pet-sprite')
  expect(sprite.tagName).not.toBe('IMG')
  expect(sprite).toHaveTextContent('🥚')
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- PetStage` → FAIL（无模块）

- [ ] **Step 3: 实现组件**

Create `PetStage.tsx`（照原型 DOM 3681–3710 的氛围层顺序：aura/disc/energy-ring 为兄弟，core 内含 sprite mount；banner 在上；confetti 四 span）：

```tsx
import type { PetFormDto } from '@/types/homework'

export function PetStage({ form, level }: { form?: PetFormDto; level: number }) {
  return (
    <div className="kid-pet-stage">
      <div className="kid-pet-wrap">
        <div className="kid-pet-stage-banner">
          <span className="kid-pet-stage-level">LV {level}</span>
          {form?.name && <strong className="kid-pet-stage-hero-name">{form.name}</strong>}
        </div>
        <div className="kid-pet-aura" />
        <div className="kid-pet-disc" />
        <div className="kid-pet-energy-ring" />
        <div className="kid-pet-core">
          <div className="kid-pet-stage-mount">
            {form?.spriteUrl ? (
              <img
                data-testid="pet-sprite"
                className="kid-pet-sprite"
                src={form.spriteUrl}
                alt={form.name}
                style={{ transform: `scale(${form.scale ?? 1})` }}
              />
            ) : (
              <div data-testid="pet-sprite" className="kid-pet-fallback">🥚</div>
            )}
          </div>
        </div>
        <div className="kid-pet-confetti">
          <span /><span /><span /><span />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 移植 CSS（氛围层 + 舞台，跳过聊天/午睡/说话气泡/evolveButton）**

Create `kid/stage.css`——移植：
- `.pet-stage`(340–347)、`.pet-wrap`(349–381 含局部 `--element-*` 变量；这些变量原型里由 JS 按宠物色注入，**本轮先用原型默认值**，视觉即火龙暖色) → `.kid-pet-stage`/`.kid-pet-wrap`
- 氛围层 `.pet-aura`(383–393)、`.pet-disc`(395–403)、`.pet-energy-ring`(405–418)、`.pet-confetti`(474–515) → `.kid-pet-aura`/`.kid-pet-disc`/`.kid-pet-energy-ring`/`.kid-pet-confetti`
- core/mount `.pet-core`(2473–2482)、`.pet-3d-stage`(可略——本轮无 3d 变换需求，直接用 `.pet-stage-mount` 2539–2547)、`.pet-stage-mount`(2539–2547) → `.kid-pet-core`/`.kid-pet-stage-mount`
- 横幅 `.pet-stage-banner`(2739–2755)、`.pet-stage-level`(2757–2771)、`.pet-stage-hero-name`(2773–2778) → `.kid-pet-stage-banner`/`-level`/`-hero-name`
- keyframes：`aura-pulse`(999–1009)、`ring-spin`(1125–1135)、`confetti-rise`(1152–1164) 逐字搬（keyframe 名保持不变即可，全局唯一）。
- 精灵图 `.kid-pet-sprite` 用一个新的简单规则（`max-width:100%; height:auto`）+ 兜底 `.kid-pet-fallback`（大 emoji，可参考现 `kid.css` 的 `.kid-pet-fallback`）。

**跳过**：`.pet-side-button`、`.pet-speech-bubble`、`.pet-stage-tag`(mood)、`.pet-evolution-shell/-card`、`.evolve-button`、`.pet-feedback`、所有 `evo-*` overlay、`.pet-action-row`——本轮不做这些。氛围层的 mode 驱动动画（`.pet-wrap[data-mode=…]` 519–602）也跳过（我们不设 data-mode，用静态氛围）。`@import` 加进 `kid.css`。

- [ ] **Step 5: 接进 DailyBoard**

`DailyBoard.tsx`：import `PetStage`；把 `kid-main` 里原有的 `<section className="kid-stage">…精灵图+成长条…</section>` 替换为 `<PetStage form={form} level={journey.currentLevel} />`。**成长条（`growth-bar` label）暂时保留在 kid-main 里 PetStage 之后**（Task 7 会把它抽进 GrowthPanel）。`form` 已有（`currentForm(mySpecies, journey.currentLevel)`）。

- [ ] **Step 6: 跑测试 + 类型 + 回归**

Run: `npm test -- PetStage` → PASS
Run: `npm test -- DailyBoard` → 全绿（`pet-sprite` testid 仍在，feed/complete 测试不回归）
Run: `npm run typecheck` → 净

- [ ] **Step 7: 提交**

```bash
git add frontend/parent-web/src/features/play/PetStage.tsx frontend/parent-web/src/features/play/kid/stage.css frontend/parent-web/src/features/play/kid.css frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/PetStage.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): PetStage 宠物舞台 —— 光环/底盘/能量环/彩带 + LV 横幅 + 形态名

裸浮精灵图换成原型纸感舞台:氛围层(aura/disc/energy-ring/confetti)+
LV n 横幅 + 形态名,保留 pet-sprite testid 与蛋兜底。CSS 整段移植原型
氛围层 + banner + aura-pulse/ring-spin/confetti-rise 三段 keyframe。
跳过聊天/午睡/气泡/evolveButton/mode 驱动动画(不在本轮)。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `GrowthPanel` —— 成长槽(标题/百分比/成长值/「差 N 到 XX」/图鉴入口/等级徽章)

**Files:**
- Create: `frontend/parent-web/src/features/play/GrowthPanel.tsx`
- Create: `frontend/parent-web/src/features/play/kid/growth.css`
- Modify: `kid.css`（import）+ `DailyBoard.tsx`（换入 GrowthPanel）
- Test: `frontend/parent-web/src/features/play/GrowthPanel.test.tsx`

**Interfaces:**
- Consumes: `JourneyDto`、`PetFormDto`、`petStage.ts` 的 `growthRatio`（现有）
- Produces: `GrowthPanel` props `{ growthPoints: number; form?: PetFormDto; nextForm?: PetFormDto }`；保留 testid `growth-bar`；「伙伴图鉴」入口 testid `open-codex`（Plan 3 接图鉴，本轮为占位按钮，点击暂无动作）。

- [ ] **Step 1: 写失败的测试**

Create `GrowthPanel.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GrowthPanel } from './GrowthPanel'
import type { PetFormDto } from '@/types/homework'

const form: PetFormDto = { level: 2, name: '幼龙', growthToNext: 100 }
const next: PetFormDto = { level: 3, name: '成龙', growthToNext: 200 }

it('成长条按比例填充,显示百分比与成长值', () => {
  render(<GrowthPanel growthPoints={58} form={form} nextForm={next} />)
  const bar = screen.getByTestId('growth-bar')
  expect(bar).toHaveStyle({ width: '58%' })
  expect(screen.getByText('58%')).toBeInTheDocument()
  expect(screen.getByText(/58 \/ 100/)).toBeInTheDocument()
})

it('渲染伙伴图鉴入口', () => {
  render(<GrowthPanel growthPoints={0} form={form} nextForm={next} />)
  expect(screen.getByTestId('open-codex')).toBeInTheDocument()
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- GrowthPanel` → FAIL

- [ ] **Step 3: 实现组件**

Create `GrowthPanel.tsx`（照原型 DOM 3731–3755）：

```tsx
import { useTranslation } from 'react-i18next'
import { growthRatio } from './petStage'
import type { PetFormDto } from '@/types/homework'

export function GrowthPanel({ growthPoints, form, nextForm }: {
  growthPoints: number
  form?: PetFormDto
  nextForm?: PetFormDto
}) {
  const { t } = useTranslation()
  const ratio = growthRatio({ growthPoints }, form)
  const pct = Math.round(ratio * 100)
  const toNext = form?.growthToNext
  const left = toNext ? Math.max(0, toNext - growthPoints) : 0
  return (
    <section className="kid-panel kid-growth-panel">
      <div className="kid-growth-main">
        <div className="kid-growth-head">
          <span className="kid-growth-title">{t('play.growthTitle')}</span>
        </div>
        <div className="kid-growth-track">
          <div data-testid="growth-bar" className="kid-growth-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="kid-growth-stats">
          <span>{pct}%</span>
          <span>{t('play.growth')} {growthPoints}{toNext ? ` / ${toNext}` : ''}</span>
        </div>
        <p className="kid-growth-copy">
          {nextForm && toNext
            ? t('play.growthHint', { left, name: nextForm.name })
            : t('play.growthMaxed')}
        </p>
      </div>
      <div className="kid-growth-side">
        <button type="button" data-testid="open-codex" className="kid-growth-gallery-link">
          {t('play.codexTitle')}
        </button>
        <div className="kid-mini-badges">
          <span className="kid-mini-badge">
            <span className="kid-mini-badge-label">Lv</span>
            <strong className="kid-mini-badge-value">{form?.level ?? 1}</strong>
          </span>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 移植 CSS**

Create `kid/growth.css`——移植原型 `.bottom-growth-panel`(897–934)、`.bottom-growth-main`(936–941)、`.pet-growth-head`(943–948)、`.pet-growth-title`(950–956)、`.bottom-growth-copy`(964–969)、`.bottom-growth-side`(1613–1620)、`.growth-track`(1543–1567)、`.growth-fill`(1569–1595)、`.growth-stats`(1597–1605)、`.mini-badges`(1607–1611)、`.mini-badge`(1622–1629，**注意原型有第二处 2322–2330 覆盖，以 1622–1629 为准**)、`.mini-badge-label`(1630–1636)、`.mini-badge-value`(1637–1642)、`.growth-gallery-link`(806–836)、断点 760px（2426–2433）。改名统一 `kid-*`（`.bottom-growth-panel→.kid-growth-panel`、`.bottom-growth-main→.kid-growth-main`、`.pet-growth-head→.kid-growth-head`、`.pet-growth-title→.kid-growth-title`、`.bottom-growth-copy→.kid-growth-copy`、`.bottom-growth-side→.kid-growth-side`、`.growth-track→.kid-growth-track`、`.growth-fill→.kid-growth-fill`、`.growth-stats→.kid-growth-stats`、`.mini-badges→.kid-mini-badges`、`.mini-badge*→.kid-mini-badge*`、`.growth-gallery-link→.kid-growth-gallery-link`）。收进 `.kid-shell`，声明逐字。`@import` 加进 `kid.css`。

**注意**：现有 `kid.css` 里有旧的 `.kid-growth-fill`/`.kid-growth`/`.kid-growth-label`——本任务的新规则更具体（`.kid-shell .kid-growth-fill`），但为避免冲突，把旧的三条从 `kid.css` 删掉（它们只被即将替换的 DailyBoard 内联成长条用）。

- [ ] **Step 5: 接进 DailyBoard**

`DailyBoard.tsx`：import `GrowthPanel`；把 Task 6 之后暂留在 `kid-main` 的旧成长条（`kid-growth` / `growth-bar` / `kid-growth-label`）**替换**为：
```tsx
<GrowthPanel growthPoints={journey.growthPoints} form={form} nextForm={nextForm} />
```
其中 `nextForm` 新增：`const nextForm = currentForm(mySpecies, journey.currentLevel + 1)`。`growth-bar` testid 从旧位置移到 GrowthPanel（保持存在）。

- [ ] **Step 6: 跑测试 + 类型 + 回归**

Run: `npm test -- GrowthPanel` → PASS
Run: `npm test -- DailyBoard` → 全绿（`growth-bar` 仍在）
Run: `npm run typecheck` → 净

- [ ] **Step 7: 提交**

```bash
git add frontend/parent-web/src/features/play/GrowthPanel.tsx frontend/parent-web/src/features/play/kid/growth.css frontend/parent-web/src/features/play/kid.css frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/GrowthPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): GrowthPanel 成长槽 —— 百分比/成长值/差N到XX/图鉴入口/等级徽章

无标题细条换成原型成长面板:标题 + 百分比 + n/m + 「差N到XX」+ 伙伴图鉴
入口(open-codex,Plan 3 接图鉴)+ Lv 徽章。保留 growth-bar testid。CSS
整段移植原型 growth 段 + rail-pulse。删掉 kid.css 里被替换的旧成长条规则。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `TaskCard` + `QuestPanel` —— 今日委托(学科标签 + 时长 + 奖励名 + 大按钮)

**Files:**
- Create: `frontend/parent-web/src/features/play/TaskCard.tsx`
- Create: `frontend/parent-web/src/features/play/QuestPanel.tsx`
- Create: `frontend/parent-web/src/features/play/kid/tasks.css`
- Modify: `kid.css`（import）+ `DailyBoard.tsx`（换入 QuestPanel）
- Test: `frontend/parent-web/src/features/play/TaskCard.test.tsx`

**Interfaces:**
- Consumes: `DailyTaskDto`（Task 1 已加 `rewardName`/`estimatedMinutes`）
- Produces: `TaskCard` props `{ task: DailyTaskDto; disabled: boolean; onToggle: (taskId: string, done: boolean) => void }`；`QuestPanel` props `{ board?: DailyBoardDto; loading: boolean; disabled: boolean; onToggle: (taskId, done) => void }`；保留 testid `task-${id}`、`task-toggle-${id}`。

- [ ] **Step 1: 写失败的测试**

Create `TaskCard.test.tsx`：

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TaskCard } from './TaskCard'
import type { DailyTaskDto } from '@/types/homework'

const base: DailyTaskDto = {
  id: 't1', childId: 'c1', date: '2026-07-15', title: '数学作业本', subject: 'math',
  order: 0, isCompleted: false, reviewState: 0, countsAsCompleted: false, journeyId: 'j1',
  rewardGranted: false, rewardName: '冲锋饭团', estimatedMinutes: 25,
}

it('显示学科标签/时长/奖励名/去完成', () => {
  render(<TaskCard task={base} disabled={false} onToggle={() => {}} />)
  expect(screen.getByText('数学作业本')).toBeInTheDocument()
  expect(screen.getByText(/25/)).toBeInTheDocument()          // 时长 chip
  expect(screen.getByText(/冲锋饭团/)).toBeInTheDocument()      // 奖励名
  expect(screen.getByTestId('task-toggle-t1')).toHaveTextContent('play.goComplete')
})

it('时长为 null 时不显示时长 chip', () => {
  render(<TaskCard task={{ ...base, estimatedMinutes: null }} disabled={false} onToggle={() => {}} />)
  expect(screen.queryByText(/分钟|min/i)).toBeNull()
})

it('奖励名为 null 时不显示奖励行', () => {
  const { container } = render(<TaskCard task={{ ...base, rewardName: null }} disabled={false} onToggle={() => {}} />)
  expect(container.querySelector('.kid-task-reward')).toBeNull()
})

it('已完成显示已攻克,点击回调带 done=true', () => {
  const onToggle = vi.fn()
  render(<TaskCard task={{ ...base, countsAsCompleted: true }} disabled={false} onToggle={onToggle} />)
  expect(screen.getByTestId('task-toggle-t1')).toHaveTextContent('play.done')
  fireEvent.click(screen.getByTestId('task-toggle-t1'))
  expect(onToggle).toHaveBeenCalledWith('t1', true)
})

it('disabled 时按钮禁用', () => {
  render(<TaskCard task={base} disabled onToggle={() => {}} />)
  expect(screen.getByTestId('task-toggle-t1')).toBeDisabled()
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- TaskCard` → FAIL

- [ ] **Step 3: 实现 TaskCard + QuestPanel**

Create `TaskCard.tsx`（照原型任务卡 DOM 4411–4429）：

```tsx
import { useTranslation } from 'react-i18next'
import type { DailyTaskDto } from '@/types/homework'

const SUBJECT_CLASS: Record<string, string> = {
  math: 'math', chinese: 'chinese', english: 'english', reading: 'reading',
}

export function TaskCard({ task, disabled, onToggle }: {
  task: DailyTaskDto
  disabled: boolean
  onToggle: (taskId: string, done: boolean) => void
}) {
  const { t } = useTranslation()
  const done = task.countsAsCompleted
  const subjectClass = task.subject ? SUBJECT_CLASS[task.subject] ?? '' : ''
  return (
    <div data-testid={`task-${task.id}`} className={`kid-task-card${done ? ' is-done' : ''}`}>
      <div className="kid-task-meta">
        {task.subject && (
          <span className={`kid-subject-badge ${subjectClass}`}>{t(`play.subject.${task.subject}`, task.subject)}</span>
        )}
        {task.estimatedMinutes != null && (
          <span className="kid-task-time">{t('play.minutes', { n: task.estimatedMinutes })}</span>
        )}
      </div>
      <div className="kid-task-title">{task.title}</div>
      <div className="kid-task-foot">
        {task.rewardName && (
          <span className="kid-task-reward">{t('play.rewardLabel', { name: task.rewardName })}</span>
        )}
        <button
          type="button"
          data-testid={`task-toggle-${task.id}`}
          className="kid-task-button"
          disabled={disabled}
          onClick={() => onToggle(task.id, done)}
        >
          {done ? t('play.done') : t('play.goComplete')}
        </button>
      </div>
    </div>
  )
}
```

Create `QuestPanel.tsx`（照原型 3759–3766 + rest-day 卡 4392–4403）：

```tsx
import { useTranslation } from 'react-i18next'
import { TaskCard } from './TaskCard'
import type { DailyBoardDto } from '@/types/homework'

export function QuestPanel({ board, loading, disabled, onToggle }: {
  board?: DailyBoardDto
  loading: boolean
  disabled: boolean
  onToggle: (taskId: string, done: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <section className="kid-panel kid-quest-panel">
      <div className="kid-panel-head"><h3>{t('play.questTitle')}</h3></div>
      <div className="kid-task-list">
        {loading ? (
          <div className="kid-center">{t('play.loading')}</div>
        ) : board?.isRestDay ? (
          <div className="kid-rest">{t('play.restDay')}</div>
        ) : (
          board?.tasks.map((task) => (
            <TaskCard key={task.id} task={task} disabled={disabled} onToggle={onToggle} />
          ))
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 移植 CSS**

Create `kid/tasks.css`——移植原型 `.panel-head`(1269–1281)、`.task-list`(1283–1286)、`.task-card`(1288–1306 含 `.is-done`/hover)、`.task-meta`(1308–1314)、`.subject-badge`(1316–1345 含 `.math`/`.chinese`/`.english`/`.reading` 四色)、`.task-time`(1347–1351)、`.task-title`(1353–1358)、`.task-foot`(1364–1370)、`.task-reward`(1372–1376)、`.task-button`(共享 base 1378–1387 + own 1389–1416)、断点 760px（`.task-foot` 2421–2424、`.task-button` 2458–2461）。改名 `kid-*`（`.quest-panel→.kid-quest-panel`、`.panel-head→.kid-panel-head`、`.task-list→.kid-task-list`、`.task-card→.kid-task-card`、`.task-meta→.kid-task-meta`、`.subject-badge→.kid-subject-badge`（四个学科修饰类 `.math` 等保持不变，作为 `.kid-subject-badge.math`）、`.task-time→.kid-task-time`、`.task-title→.kid-task-title`、`.task-foot→.kid-task-foot`、`.task-reward→.kid-task-reward`、`.task-button→.kid-task-button`）。收进 `.kid-shell`，声明逐字（`.task-reward` 用 `var(--brand-deep)` 保持不变）。`@import` 加进 `kid.css`。

- [ ] **Step 5: 接进 DailyBoard**

`DailyBoard.tsx`：import `QuestPanel`；把 `kid-side` 里旧的 `<section className="kid-tasks">…</section>` 替换为：
```tsx
<QuestPanel
  board={board.data}
  loading={board.isLoading}
  disabled={complete.isPending || uncomplete.isPending}
  onToggle={toggleTask}
/>
```
`toggleTask` 保持不变（含 `complete.mutate` 的 scoped toast）。**注意红线**：奖励名来自 `board` 缓存的 `task.rewardName`（Task 1 已让 board DTO 带上），toast 那句 `t('play.rewardEarned',{name:t('play.feed')})` 本任务不改（Task 10 处理文案）——**不许**用 mutation 回包填奖励名。

- [ ] **Step 6: 跑测试 + 类型 + 回归**

Run: `npm test -- TaskCard` → PASS（5/5）
Run: `npm test -- DailyBoard` → 全绿（`task-${id}`/`task-toggle-${id}` testid 仍在，complete 测试不回归）
Run: `npm run typecheck` → 净

- [ ] **Step 7: 提交**

```bash
git add frontend/parent-web/src/features/play/TaskCard.tsx frontend/parent-web/src/features/play/QuestPanel.tsx frontend/parent-web/src/features/play/kid/tasks.css frontend/parent-web/src/features/play/kid.css frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/TaskCard.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): TaskCard + QuestPanel 今日委托 —— 学科标签/时长/奖励名/大按钮

标题+生英文key 换成原型任务卡:学科色标签 + 时长chip(null隐藏)+ 奖励名
(null隐藏,来自 board DTO 的 rewardName)+ 整条大按钮。奖励名走 board 缓存,
不用 mutation 回包(红线)。CSS 整段移植原型 task-card + 四学科色。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `SupplyPanel` —— 补给台(由 Backpack 改造)

把 `Backpack.tsx` 改造成原型的补给台：纸感面板 + 道具卡 + 「喂给伙伴」按钮。

**Files:**
- Rename/rework: `frontend/parent-web/src/features/play/Backpack.tsx` → `SupplyPanel.tsx`（新建 SupplyPanel，删 Backpack）
- Create: `frontend/parent-web/src/features/play/kid/supply.css`
- Modify: `kid.css`（import）+ `DailyBoard.tsx`（引用改名）+ `Backpack.test.tsx` → `SupplyPanel.test.tsx`
- Test: `frontend/parent-web/src/features/play/SupplyPanel.test.tsx`

**Interfaces:**
- Consumes: `useBackpack`（现有）、`BackpackItemDto`
- Produces: `SupplyPanel` props `{ childId: string; journeyId: string; onFeed?: (item: BackpackItemDto) => void; disabled?: boolean }`；保留 testid `backpack-empty`、`backpack-item-${rewardItemId}`。

- [ ] **Step 1: 写失败的测试**

Create `SupplyPanel.test.tsx`（照现有 Backpack.test 的桩法，若无则新建）：

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import type { BackpackItemDto } from '@/types/homework'

vi.mock('@/services/playService')
import * as svc from '@/services/playService'
import { SupplyPanel } from './SupplyPanel'

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
const item: BackpackItemDto = { rewardItemId: 'r1', name: '冲锋饭团', glyph: '🍙', quantity: 3, growthValue: 12, iconUrl: null }

describe('SupplyPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('空背包显示空态', async () => {
    vi.mocked(svc.getBackpack).mockResolvedValue([])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<SupplyPanel childId="c1" journeyId="j1" />, { wrapper: wrap(qc) })
    expect(await screen.findByTestId('backpack-empty')).toBeInTheDocument()
  })

  it('有道具时渲染道具卡,点击触发 onFeed', async () => {
    vi.mocked(svc.getBackpack).mockResolvedValue([item])
    const onFeed = vi.fn()
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<SupplyPanel childId="c1" journeyId="j1" onFeed={onFeed} />, { wrapper: wrap(qc) })
    const btn = await screen.findByTestId('backpack-item-r1')
    fireEvent.click(btn)
    expect(onFeed).toHaveBeenCalledWith(item)
  })

  it('disabled 时道具按钮禁用(连点守卫)', async () => {
    vi.mocked(svc.getBackpack).mockResolvedValue([item])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<SupplyPanel childId="c1" journeyId="j1" disabled />, { wrapper: wrap(qc) })
    expect(await screen.findByTestId('backpack-item-r1')).toBeDisabled()
  })
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- SupplyPanel` → FAIL（无模块）

- [ ] **Step 3: 建 SupplyPanel（保留 Backpack 逻辑 + 换原型结构）**

Create `SupplyPanel.tsx`（照原型 3768–3784）：

```tsx
import { useTranslation } from 'react-i18next'
import { useBackpack } from '@/hooks/usePlay'
import type { BackpackItemDto } from '@/types/homework'

export function SupplyPanel({ childId, journeyId, onFeed, disabled }: {
  childId: string
  journeyId: string
  onFeed?: (item: BackpackItemDto) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { data: items = [], isLoading } = useBackpack(childId, journeyId)

  return (
    <section className="kid-panel kid-supply-panel">
      <div className="kid-panel-head"><h3>{t('play.supplyTitle')}</h3></div>
      {isLoading ? (
        <div className="kid-center">{t('play.loading')}</div>
      ) : items.length === 0 ? (
        <div data-testid="backpack-empty" className="kid-reward-copy">{t('play.backpackEmpty')}</div>
      ) : (
        <div className="kid-reward-drop-list">
          {items.map((it) => (
            <button
              key={it.rewardItemId}
              type="button"
              data-testid={`backpack-item-${it.rewardItemId}`}
              className="kid-reward-drop"
              disabled={disabled}
              onClick={() => onFeed?.(it)}
            >
              {it.iconUrl ? (
                <img className="kid-reward-drop-icon" src={it.iconUrl} alt={it.name} />
              ) : (
                <span className="kid-reward-drop-icon kid-reward-drop-glyph">{it.glyph ?? '🎁'}</span>
              )}
              <span className="kid-reward-drop-copy">
                {it.name}
                <small>×{it.quantity} · +{it.growthValue}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
```
（顺带修 NEXT-STEPS §2.3a 记的「背包卡未显 growthValue」——`+{growthValue}` 已加进 `<small>`。）

删除 `Backpack.tsx` 和 `Backpack.test.tsx`（若存在）。

- [ ] **Step 4: 移植 CSS**

Create `kid/supply.css`——移植原型 `.reward-panel`(1418–1422)、`.reward-banner`(1424–1439)、`.reward-drop-list`(1441–1452)、`.reward-drop`(1454–1477)、`.reward-drop-icon`(1479–1488)、`.reward-drop-copy`(1490–1501)、`.reward-copy`(1516–1520)、`.reward-action`(1526–1529)、`.feed-button`(base 1378–1387 + own 1531–1536 + disabled 1403–1409)、断点 760px（2458–2465）。改名 `kid-*`（`.reward-panel→.kid-supply-panel`、`.reward-drop-list→.kid-reward-drop-list`、`.reward-drop→.kid-reward-drop`、`.reward-drop-icon→.kid-reward-drop-icon`、`.reward-drop-copy→.kid-reward-drop-copy`、`.reward-copy→.kid-reward-copy`、`.feed-button→.kid-feed-button`）。**跳过** `.is-feeding`/`tray-launch`（投掷动画属 Plan 3）。收进 `.kid-shell`，声明逐字。`@import` 加进 `kid.css`。删掉 `kid.css` 里旧的 `.kid-backpack*` 规则（被替换）。

- [ ] **Step 5: 接进 DailyBoard**

`DailyBoard.tsx`：把 `import { Backpack }` 改为 `import { SupplyPanel }`；`kid-side` 里 `<Backpack …/>` 改为 `<SupplyPanel childId={childId} journeyId={journey.id} onFeed={onFeed} disabled={feed.isPending} />`。**`disabled={feed.isPending}` 连点守卫保持**（红线）。

- [ ] **Step 6: 跑测试 + 类型 + 回归 + 全量**

Run: `npm test -- SupplyPanel` → PASS（3/3）
Run: `npm test`（全量）→ 全绿，无残留引用 `Backpack`
Run: `npm run typecheck` → 净

- [ ] **Step 7: 提交**

```bash
git add -A frontend/parent-web/src/features/play/
git commit -m "$(cat <<'EOF'
feat(play-fe): SupplyPanel 补给台(由 Backpack 改造)+ 显示 growthValue

Backpack 换成原型补给台:纸感面板 + 道具卡(icon/glyph + ×数量 + +成长值)
+ 「喂给伙伴」按钮。连点守卫 disabled={feed.isPending} 保持(红线)。顺带补
NEXT-STEPS §2.3a 记的背包卡缺 growthValue。CSS 整段移植原型 reward-panel,
跳过 tray-launch 投掷动画(Plan 3)。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: 旧屏重刷令牌 + i18n 键补齐

把选宠/进化过场/收藏墙/完成屏重刷到同一套令牌（否则新旧同屏视觉撕裂），并补齐本计划新增的全部 i18n 键（zh + en 双写）。

**Files:**
- Modify: `frontend/parent-web/src/features/play/kid.css`（旧屏规则改用令牌）
- Modify: `frontend/parent-web/public/locales/zh-CN/translation.json`
- Modify: `frontend/parent-web/public/locales/en/translation.json`
- Test: `frontend/parent-web/src/i18n/locales.test.ts`（现有，跑通即可）+ 全量

**Interfaces:**
- Consumes: 前序所有任务用到的 `play.*` 键
- Produces: 无新导出

- [ ] **Step 1: 清点本计划新增的全部 i18n 键**

前序任务引入的键（在 zh + en 都要加）：

```
play.today            今天 / Today            （已存在，勿重复；DayStrip 的 TODAY 标签用）
play.stars            今日星星 / Stars         （已存在）
play.progress         今日进度 / Progress      （已存在）
play.streak           连续完成 / Streak
play.mon..sun         一/二/…/日 / Mon..Sun    （7 个：play.mon play.tue play.wed play.thu play.fri play.sat play.sun）
play.dayRest          休息 / Rest
play.dayDone          已完成 / Done
play.dayConquered     已攻克 / Cleared
play.dayActive        进行中 / Active
play.dayPending       待开始 / Pending
play.dayLocked        未开 / Missed
play.dayFuture        待战 / Upcoming
play.growthTitle      成长槽 / Growth
play.growthHint       差 {{left}} 成长值到「{{name}}」 / {{left}} to "{{name}}"
play.growthMaxed      已满级 / Maxed
play.codexTitle       伙伴图鉴 → / Pet Codex →
play.questTitle       今日委托 / Today's Quests
play.supplyTitle      补给台 / Supply
play.minutes          {{n}} 分钟 / {{n}} min
play.rewardLabel      奖励 {{name}} / Reward: {{name}}
play.subject.math     数学 / Math   （以及 chinese/english/reading，共 4 个；用嵌套对象 play.subject.{key}）
```

- [ ] **Step 2: 写进 zh-CN**

`public/locales/zh-CN/translation.json` 的 `play` 对象里加上上述键（`play.subject` 用嵌套对象 `"subject": { "math": "数学", "chinese": "语文", "english": "英语", "reading": "阅读" }`）。保持 JSON 紧凑格式与文件现有风格一致。

- [ ] **Step 3: 写进 en（键必须与 zh 完全一致）**

`public/locales/en/translation.json` 的 `play` 对象加同名键，值为英文。

- [ ] **Step 4: 跑 locale 对齐测试**

Run: `npm test -- locales`
Expected: PASS —— zh 与 en 键集完全一致。若红，按报错补齐缺失键。

- [ ] **Step 5: 旧屏重刷令牌**

`kid.css` 里现存的旧屏规则（`.kid-pick*` 选宠、`.kid-evo*` 进化过场、`.kid-collection*` 收藏墙、`.kid-completed*` 完成屏）——把其中硬编码的棕橙色值（如 `#7a4a1e`、`#ff…` 等）**替换为对应令牌**（文字用 `var(--ink)`/`var(--muted)`，面板用 `var(--paper)` + `var(--line)` + `var(--shadow-md)`，圆角用 `var(--radius-*)`，强调用 `var(--brand)`/`var(--brand-deep)`）。目标是新旧同屏色调一致。**不改结构、不改 testid**，只换色值/圆角/阴影为令牌。逐条对照 `tokens.css` 的值确认视觉不跳。

- [ ] **Step 6: 全量测试 + 类型 + 构建**

Run: `npm test` → 全绿
Run: `npm run typecheck` → 净
Run: `npm run build` → 成功（`tsc -b && vite build`，最终把关）

- [ ] **Step 7: 提交**

```bash
git add frontend/parent-web/src/features/play/kid.css frontend/parent-web/public/locales/
git commit -m "$(cat <<'EOF'
feat(play-fe): 旧屏重刷令牌 + 补齐 i18n 键(zh+en 双写)

选宠/进化过场/收藏墙/完成屏的硬编码棕橙色值换成 .kid-shell 令牌,消除
新旧同屏视觉撕裂。补齐本计划新增的全部 play.* 键(周条七态/训练营/学科/
成长提示/补给台等),zh 与 en 双写,locale 键对齐测试通过。npm run build 净。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 完成定义（Plan 2）

1. `npm test` 全绿；`npm run typecheck` 净；`npm run build` 成功
2. 真机起服务，用真实孩子（哥哥走完整流程）截图（手机 430px + 桌面两栏 1280px）
3. **创始人对比原型确认「像了」**——这是 spec §7 定的验收，自动化测不了「像不像」
4. 满级庆祝仍可达（hoist 未被破坏）；勾任务后顶栏进度/周条日期状态即时更新

Plan 3（投掷动画 + 伙伴图鉴）在此之后。

---

## 自查记录

- **Spec 覆盖**：§3 组件边界 → Task 3–9 逐个建；§5 数据流（selectedDate/useWeekStrip/失效 weekStrip/未来日锁定/奖励名只 board）→ Task 1/3/4/5/8；§6 视觉层（21 令牌/背景渐变/整段搬/旧屏重刷）→ Task 3/各任务/Task 10；§7 测试（dayStatus 单测/结构测/人眼验收）→ Task 2/各任务/完成定义。**不含**投掷动画与图鉴（明确划归 Plan 3，GrowthPanel 的 `open-codex` 为占位）。
- **红线落位**：满级 hoist 在 KidGameShell 不被本计划触及（DailyBoard 拆分不动 onFeedResult 上行）；feed 三失效目标在 Task 1 显式断言「不加 weekStrip」；勾任务加 weekStrip 在 Task 1；奖励名只 board 在 Task 8 接线说明 + 不用 mutation 回包。
- **类型一致性**：`WeekStripDto`/`WeekDayDto`（Task 1 定义）→ Task 4/5 消费，字段名一致；`dayStatus` 的 `DayTone` 六值 → DayStrip 的 `is-${tone}` 与 CSS 六个 `.is-*` 对齐；testid 全程沿用（`pet-sprite`/`growth-bar`/`task-${id}`/`task-toggle-${id}`/`backpack-*`）。
- **已知取舍**：`childName` 暂用 `journey.title`（孩子名不在 JourneyDto，真名接入后续）；氛围层 `--element-*` 用原型默认（火龙暖色），按宠物色注入留待 Plan 3；`open-codex` 占位。
