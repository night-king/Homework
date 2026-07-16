# 孩子端看板 · 投掷动画 + 伙伴图鉴 实施计划（Plan 3/3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给已经"长得像原型"的孩子端看板补上两处交互:喂养时道具从补给台飞向宠物的**投掷动画**,以及点「伙伴图鉴 →」弹出的**五阶形态图鉴 modal**(按当前等级门控锁态)。

**Architecture:** 投掷是真几何飞行——`feedProjectile.ts` 取源道具卡 rect + 宠物落点 rect,克隆一个 `.kid-flying-drop` 挂 `document.body`(position:fixed),两帧后切 class 触发 CSS transition,~780ms 清理;喂养请求同时发、不被动画阻塞。图鉴是 `PetCodex` modal,从当前物种 `forms[]` 渲染五阶卡:`level <= currentLevel` 显真身(精灵图+名+revealText),`level > currentLevel` 显未揭示态(锁+???)。

**Tech Stack:** React 19 / Vite 6 / @tanstack/react-query 5 / i18next / vitest 3(jsdom)。CSS 普通文件经 `kid.css` 的 `@import` 引入。

**Spec:** `docs/superpowers/specs/2026-07-16-child-board-prototype-port-design.md`(§143 投掷动画保真 / §110 伙伴图鉴五阶 rail modal)
**移植源:** `frontend/child-web-prototype/child-homepage.html`

## Global Constraints

**分支:** `feat/child-board-prototype-port`(Plan 1+2 已合入,HEAD `1aab46a`,已推 origin)。不新建分支。

**工作目录:** 所有前端命令从 `frontend/parent-web` 跑。测试 `npm test`(=`vitest run`);类型 `npm run typecheck`(`tsc -b --noEmit`,**不是** `npx tsc --noEmit` no-op);构建 `npm run build`。

**`tsconfig.app.json` 开 `noUnusedLocals` + `noUnusedParameters`**——任何未用局部/参数会让 typecheck/build 报错。

**测试基建:** `src/test-setup.ts` 全局 `vi.mock('@/i18n/config')`,组件里 `t('play.foo')` 在测试中**返回键名字符串**。渲染带 query 的组件包 `QueryClientProvider`;service 打桩 `vi.mock('@/services/playService')`。当前全量基线 **141 测试全绿**。

**CSS 移植铁律(同 Plan 2):** 从原型对应行段**声明逐字复制**(值/渐变/阴影/transition 原样),只改选择器名 + 收进作用域。**搬不编**。

**CSS 层叠 bug 只有实际渲染能看见**——jsdom 测不出。凡新增 CSS 影响视觉的任务,评审必须用 **Playwright 无头 Chromium 实际渲染核对**(Plan 2 靠这个抓到背景没变、两栏被挤成 640px、三面板 padding=0)。

**红线(改了就是把已修的 bug 改回去):**
- **满级庆祝的 hoist 不许动。** 庆祝 state 挂在 `KidGameShell`,`DailyBoard` 的 `onFeedResult` 上行链路不动。本计划不碰 `KidGameShell.tsx`。
- **`feed` 的三个失效目标(active + backpack + collection)一字不动**,`onFeedResult` 回调不动。投掷动画**与请求并行、不阻塞**:点道具同时(a)启动飞行动画(b)照常 `feed.mutate`。动画失败/请求失败互不影响,请求失败仍走现有 `onErr` toast。
- **连点守卫 `disabled={feed.isPending}` 不动。** SupplyPanel 道具按钮的 disabled 保持。
- **奖励名/图标只从 board 与 backpack 来**,不引入新的 setQueryData。

**保留全部现有 `data-testid`:** `pet-sprite`、`growth-bar`、`open-codex`、`task-*`、`backpack-item-*`、`backpack-empty` 等。

**i18n:** 新键**同时**加 zh-CN + en(`src/i18n/locales.test.ts` 强制键对齐),放最后一个任务批量加。

**提交信息结尾必须是:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

### Task 1: `feedProjectile.ts` —— 投掷飞行模块 + CSS

真几何飞行的独立模块。不接线,先做能单测的核心。

**Files:**
- Create: `frontend/parent-web/src/features/play/feedProjectile.ts`
- Create: `frontend/parent-web/src/features/play/kid/projectile.css`
- Modify: `frontend/parent-web/src/features/play/kid.css`(加 `@import`)
- Test: `frontend/parent-web/src/features/play/feedProjectile.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `launchFeedProjectile(source: HTMLElement, target: HTMLElement | null, visual: { iconUrl?: string | null; glyph?: string | null }): void`。Task 2 调用。

- [ ] **Step 1: 写失败的测试**

Create `feedProjectile.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { launchFeedProjectile } from './feedProjectile'

function el(): HTMLElement {
  const e = document.createElement('div')
  document.body.appendChild(e)
  return e
}

describe('launchFeedProjectile', () => {
  beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = '' })
  afterEach(() => { vi.useRealTimers() })

  it('挂一个 .kid-flying-drop 到 body,带 glyph,~780ms 后清理', () => {
    const src = el(); const tgt = el()
    launchFeedProjectile(src, tgt, { glyph: '🍙' })
    const fly = document.querySelector('.kid-flying-drop')
    expect(fly).not.toBeNull()
    expect(fly!.textContent).toBe('🍙')
    vi.advanceTimersByTime(800)
    expect(document.querySelector('.kid-flying-drop')).toBeNull()
  })

  it('有 iconUrl 时飞行体是 img', () => {
    const src = el(); const tgt = el()
    launchFeedProjectile(src, tgt, { iconUrl: 'http://x/i.png', glyph: '🍙' })
    const img = document.querySelector('.kid-flying-drop img') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img!.src).toContain('http://x/i.png')
  })

  it('target 为 null → 不飞、不挂元素(容错)', () => {
    const src = el()
    launchFeedProjectile(src, null, { glyph: '🍙' })
    expect(document.querySelector('.kid-flying-drop')).toBeNull()
  })

  it('把源与落点的位移写进 --fly-x/--fly-y', () => {
    const src = el(); const tgt = el()
    // jsdom 的 getBoundingClientRect 恒为 0,这里只验属性被设置(不验具体像素)
    launchFeedProjectile(src, tgt, { glyph: '🍙' })
    const fly = document.querySelector('.kid-flying-drop') as HTMLElement
    expect(fly.style.getPropertyValue('--fly-x')).not.toBe('')
    expect(fly.style.getPropertyValue('--fly-y')).not.toBe('')
  })
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- feedProjectile`
Expected: FAIL —— `./feedProjectile` 无此模块。

- [ ] **Step 3: 实现模块**

Create `feedProjectile.ts`:

```ts
// 喂养投掷:道具从补给台源卡飞向宠物落点。真几何——取两个 rect,克隆 .kid-flying-drop 挂 body
// (position:fixed,视口坐标),两帧后加 is-flying 触发 CSS transition,~780ms 清理。
// 移植自原型 launchFeedProjectile(child-homepage.html:4225-4249)。
export function launchFeedProjectile(
  source: HTMLElement,
  target: HTMLElement | null,
  visual: { iconUrl?: string | null; glyph?: string | null },
): void {
  if (!target) return // 落点未挂载则不飞(容错,不影响喂养请求)
  const s = source.getBoundingClientRect()
  const t = target.getBoundingClientRect()

  const fly = document.createElement('div')
  fly.className = 'kid-flying-drop'
  if (visual.iconUrl) {
    const img = document.createElement('img')
    img.src = visual.iconUrl
    img.alt = ''
    fly.appendChild(img)
  } else {
    fly.textContent = visual.glyph ?? '🎁'
  }

  const sx = s.left + s.width / 2
  const sy = s.top + s.height / 2
  // 瞄准落点内 50%/42% 的点(略偏上,贴近宠物"嘴")——与原型一致
  const dx = t.left + t.width * 0.5 - sx
  const dy = t.top + t.height * 0.42 - sy
  fly.style.left = `${sx}px`
  fly.style.top = `${sy}px`
  fly.style.setProperty('--fly-x', `${dx}px`)
  fly.style.setProperty('--fly-y', `${dy}px`)

  document.body.appendChild(fly)
  // 两帧:先让浏览器应用 base 态,再加 is-flying 让 transition 真正跑
  requestAnimationFrame(() => {
    requestAnimationFrame(() => fly.classList.add('is-flying'))
  })
  window.setTimeout(() => fly.remove(), 780)
}
```

- [ ] **Step 4: 移植 CSS(全局,不收进 .kid-shell——飞行体挂在 body 上)**

Create `kid/projectile.css`——照原型 `.flying-drop`(1644-1663)+ `.flying-drop.is-flying`(1665-1668)**逐字搬**,改名 `.kid-flying-drop`。**不加 `.kid-shell` 前缀**(飞行体挂 document.body,不在 .kid-shell 内);原型这段用的是字面 rgba 值、无 var() 依赖,直接搬:

```css
/* 喂养投掷飞行体——挂 document.body,故不收进 .kid-shell 作用域。值逐字搬自原型 1644-1668。 */
.kid-flying-drop {
  position: fixed;
  left: 0;
  top: 0;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 248, 221, 0.98), rgba(255, 222, 163, 0.94));
  box-shadow: 0 16px 28px rgba(165, 91, 18, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.88);
  font-size: 1.2rem;
  z-index: 80;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0.86);
  transition: transform 760ms cubic-bezier(0.2, 0.76, 0.2, 1), opacity 760ms ease;
}
.kid-flying-drop img { width: 30px; height: 30px; object-fit: contain; }
.kid-flying-drop.is-flying {
  opacity: 1;
  transform: translate(calc(-50% + var(--fly-x)), calc(-50% + var(--fly-y))) scale(0.62) rotate(-18deg);
}
@media (prefers-reduced-motion: reduce) {
  .kid-flying-drop { transition: opacity 200ms ease; }
}
```

`@import './kid/projectile.css';` 加进 `kid.css`(与其它 import 并列)。

- [ ] **Step 5: 跑测试确认通过 + 类型**

Run: `npm test -- feedProjectile` → PASS(4/4)
Run: `npm run typecheck` → 净

- [ ] **Step 6: 提交**

```bash
git add frontend/parent-web/src/features/play/feedProjectile.ts frontend/parent-web/src/features/play/kid/projectile.css frontend/parent-web/src/features/play/kid.css frontend/parent-web/src/features/play/feedProjectile.test.ts
git commit -m "$(cat <<'EOF'
feat(play-fe): feedProjectile 投掷飞行模块 —— 真几何,克隆挂 body

取源道具卡 rect + 宠物落点 rect,克隆 .kid-flying-drop 挂 document.body
(position:fixed 视口坐标),两帧后加 is-flying 触发 CSS transition,~780ms
清理。target 为 null 容错不飞。CSS 逐字搬自原型 .flying-drop 1644-1668
(字面值无 var 依赖,全局不收进 .kid-shell)。含 prefers-reduced-motion。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 接线投掷 —— PetStage 落点 ref + SupplyPanel 源元素 + DailyBoard 触发

**Files:**
- Modify: `frontend/parent-web/src/features/play/PetStage.tsx`
- Modify: `frontend/parent-web/src/features/play/SupplyPanel.tsx`
- Modify: `frontend/parent-web/src/features/play/DailyBoard.tsx`
- Test: `frontend/parent-web/src/features/play/DailyBoard.projectile.test.tsx`(新建)

**Interfaces:**
- Consumes: `launchFeedProjectile`(Task 1)
- Produces: 无(接线任务)

- [ ] **Step 1: 写失败的测试**

Create `DailyBoard.projectile.test.tsx`——验点道具**同时**启动投掷 + 照常喂养(红线):

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { JourneyDto } from '@/types/homework'

vi.mock('@/services/playService')
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', forms: [{ level: 1, name: '龙蛋', spriteUrl: 'http://x/1.png', growthToNext: 36 }] },
  ]),
}))
// 监视投掷是否被调用
const launchSpy = vi.fn()
vi.mock('./feedProjectile', () => ({ launchFeedProjectile: (...a: unknown[]) => launchSpy(...a) }))

import * as svc from '@/services/playService'
import { DailyBoard } from './DailyBoard'

const journey: JourneyDto = {
  id: 'j1', childId: 'c1', title: '旅程', startDate: '2026-07-01', endDate: '2026-08-31',
  medalId: 'm1', status: 1, petSpeciesId: 'p1', currentLevel: 1, growthPoints: 0,
}

function renderBoard(onFeedResult = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><DailyBoard childId="c1" journey={journey} onFeedResult={onFeedResult} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DailyBoard 投掷接线', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(svc.getPlayDailyBoard).mockResolvedValue({
      childId: 'c1', date: '2026-07-16', tasks: [], tasksTotal: 0, tasksCompleted: 0,
      stars: 0, isFull: false, isRestDay: true,
    })
    vi.mocked(svc.getWeekStrip).mockResolvedValue({ streak: 0, days: [] })
    vi.mocked(svc.getBackpack).mockResolvedValue([
      { rewardItemId: 'r1', name: '饭团', glyph: '🍙', iconUrl: null, quantity: 2, growthValue: 12 },
    ])
    vi.mocked(svc.feed).mockResolvedValue({ evolved: false, completed: false, newLevel: 1, currentLevel: 1, growthPoints: 12 } as never)
  })

  it('点道具:启动投掷 + 照常 feed(onFeedResult 仍被调用)', async () => {
    const onFeedResult = vi.fn()
    renderBoard(onFeedResult)
    const item = await screen.findByTestId('backpack-item-r1')
    fireEvent.click(item)
    // 投掷被调用(源元素 + 落点 + 视觉)
    expect(launchSpy).toHaveBeenCalledTimes(1)
    // 喂养照常:onFeedResult 收到结果(红线:庆祝链路不断)
    await waitFor(() => expect(onFeedResult).toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- DailyBoard.projectile`
Expected: FAIL —— `launchSpy` 未被调用(接线还没做)。

- [ ] **Step 3: PetStage 转发落点 ref**

`PetStage.tsx`——props 加 `petRef`,挂到 `.kid-pet-core`:

```tsx
import type { PetFormDto } from '@/types/homework'
import type { RefObject } from 'react'

export function PetStage({ form, level, petRef }: {
  form?: PetFormDto
  level: number
  petRef?: RefObject<HTMLDivElement | null>
}) {
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
        <div className="kid-pet-core" ref={petRef}>
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

- [ ] **Step 4: SupplyPanel 的 onFeed 带上源元素**

`SupplyPanel.tsx`——`onFeed` 签名加第二参 `sourceEl`,点击传 `e.currentTarget`:

```tsx
export function SupplyPanel({ childId, journeyId, onFeed, disabled }: {
  childId: string
  journeyId: string
  onFeed?: (item: BackpackItemDto, sourceEl: HTMLElement) => void
  disabled?: boolean
}) {
  // ...(useTranslation / useBackpack 不变)
```
把道具按钮的 onClick 改为:
```tsx
              onClick={(e) => onFeed?.(it, e.currentTarget)}
```
其余不变。**`disabled={disabled}` 连点守卫保持**(红线)。

- [ ] **Step 5: DailyBoard 建 petRef + onFeed 触发投掷**

`DailyBoard.tsx`:
1. import:`import { useRef } from 'react'`(与现有 `useMemo, useState` 并列)+ `import { launchFeedProjectile } from './feedProjectile'`。
2. 组件体内建 ref:`const petRef = useRef<HTMLDivElement>(null)`。
3. `onFeed` 改为收源元素、先启动投掷再照常喂养(**feed.mutate 与 onFeedResult 一字不动**):
```tsx
  const onFeed = (item: BackpackItemDto, sourceEl: HTMLElement) => {
    launchFeedProjectile(sourceEl, petRef.current, { iconUrl: item.iconUrl, glyph: item.glyph })
    feed.mutate(
      { childId, journeyId: journey.id, rewardItemId: item.rewardItemId },
      { onSuccess: (r) => onFeedResult(r, journey.id) },
    )
  }
```
4. 把 `<PetStage form={form} level={journey.currentLevel} />` 改为 `<PetStage form={form} level={journey.currentLevel} petRef={petRef} />`。
   `<SupplyPanel ... onFeed={onFeed} ... />` 不用改(onFeed 签名变了,DailyBoard 侧已适配)。

- [ ] **Step 6: 跑测试 + 类型 + 回归**

Run: `npm test -- DailyBoard.projectile` → PASS
Run: `npm test -- DailyBoard` → 现有 feed/complete/layout 测试全绿(注意:现有 `DailyBoard.feed.test` 若断言 onFeed 调用签名可能需同步——若红,按新签名调整,属预期)
Run: `npm run typecheck` → 净

- [ ] **Step 7: 渲染核对(jsdom 看不见飞行)**

写一个 Playwright 无头 Chromium 脚本放 scratchpad,起点真机(或用已存在的开发服务器 5173)登录 demo,进一个有背包道具的孩子看板,点一个道具,在 ~200ms 内截图或查询 `document.querySelector('.kid-flying-drop')` 是否存在且有非零 `--fly-x`。确认飞行体真的出现在源与落点之间。把结果记进报告。(飞行是瞬态,能证明"点击→飞行体出现"即可。)

- [ ] **Step 8: 提交**

```bash
git add frontend/parent-web/src/features/play/PetStage.tsx frontend/parent-web/src/features/play/SupplyPanel.tsx frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/DailyBoard.projectile.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): 接线投掷 —— 点道具飞向宠物,喂养请求并行不阻塞

PetStage 转发 petRef 到 .kid-pet-core 做落点;SupplyPanel 的 onFeed 带上
点击的源按钮元素;DailyBoard onFeed 先 launchFeedProjectile(源→落点)再照常
feed.mutate。红线:feed 三失效目标/onFeedResult/连点守卫一字不动,投掷失败
与请求互不影响。测试验点击同时启动投掷 + onFeedResult 仍被调用。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `PetCodex` —— 五阶图鉴 modal(按等级门控锁态)

独立 modal 组件。原型的 rail 是单张 SVG size-staircase,但我们有真实 `PetFormDto.spriteUrl`,所以改成**卡片式 rail**——复活原型里 purpose-built 但没接线的 `.evolution-card`/`.evolution-state`/`.evolution-lock` 死 CSS,用真实数据 + 等级门控接上锁态(原型的 rail 其实没做锁态,尽管文案说"未解锁保持神秘"——这里补齐 spec §110 的意图)。

**Files:**
- Create: `frontend/parent-web/src/features/play/PetCodex.tsx`
- Create: `frontend/parent-web/src/features/play/kid/codex.css`
- Modify: `frontend/parent-web/src/features/play/kid.css`(加 `@import`)
- Test: `frontend/parent-web/src/features/play/PetCodex.test.tsx`

**Interfaces:**
- Consumes: `PetSpeciesDto`/`PetFormDto`(现有)
- Produces: `PetCodex` 组件,props `{ species?: PetSpeciesDto; currentLevel: number; onClose: () => void }`;testid `pet-codex`、`codex-stage-${level}`、`codex-close`。Task 4 渲染它。

- [ ] **Step 1: 写失败的测试**

Create `PetCodex.test.tsx`:

```tsx
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PetCodex } from './PetCodex'
import type { PetSpeciesDto } from '@/types/homework'

const species: PetSpeciesDto = {
  id: 'p1', name: '火龙', code: 'dragon', isActive: true, displayOrder: 0,
  forms: [
    { level: 1, name: '龙蛋', spriteUrl: 'http://x/1.png', growthToNext: 36 },
    { level: 2, name: '破壳萌龙', spriteUrl: 'http://x/2.png', revealText: '第一次睁眼', growthToNext: 80 },
    { level: 3, name: '少年龙', spriteUrl: 'http://x/3.png', growthToNext: 140 },
    { level: 4, name: '烈焰龙', spriteUrl: 'http://x/4.png', growthToNext: 220 },
    { level: 5, name: '龙王', spriteUrl: 'http://x/5.png', revealText: '首次喷火' },
  ],
}

it('渲染五阶卡', () => {
  render(<PetCodex species={species} currentLevel={2} onClose={() => {}} />)
  for (const lvl of [1, 2, 3, 4, 5]) {
    expect(screen.getByTestId(`codex-stage-${lvl}`)).toBeInTheDocument()
  }
})

it('已达成阶显真身(名+精灵图),当前阶带 is-current', () => {
  render(<PetCodex species={species} currentLevel={2} onClose={() => {}} />)
  const cur = screen.getByTestId('codex-stage-2')
  // 当前形态名在阶卡与摘要卡都会出现,用 within 限定在卡内断言(避免 getByText 多匹配报错)
  expect(within(cur).getByText('破壳萌龙')).toBeInTheDocument()
  expect(cur.className).toContain('is-current')
  const past = screen.getByTestId('codex-stage-1')
  expect(within(past).getByText('龙蛋')).toBeInTheDocument()           // 已解锁阶名
  expect(past.className).toContain('is-unlocked')
})

it('未达成阶显未揭示态(无真名,带 is-locked)', () => {
  render(<PetCodex species={species} currentLevel={2} onClose={() => {}} />)
  const locked = screen.getByTestId('codex-stage-4')
  expect(locked.className).toContain('is-locked')
  expect(locked.textContent).not.toContain('烈焰龙')   // 真名藏起来
  // 3/4/5 阶都不该出现真名
  expect(screen.queryByText('烈焰龙')).toBeNull()
  expect(screen.queryByText('龙王')).toBeNull()
})

it('关闭按钮触发 onClose', () => {
  const onClose = vi.fn()
  render(<PetCodex species={species} currentLevel={2} onClose={onClose} />)
  fireEvent.click(screen.getByTestId('codex-close'))
  expect(onClose).toHaveBeenCalled()
})

it('species 未加载时不崩(空态)', () => {
  render(<PetCodex species={undefined} currentLevel={1} onClose={() => {}} />)
  expect(screen.getByTestId('pet-codex')).toBeInTheDocument()
})
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- PetCodex` → FAIL(无模块)

- [ ] **Step 3: 实现组件**

Create `PetCodex.tsx`(对照原型 modal DOM 3808-3834,rail 改卡片式):

```tsx
import { useTranslation } from 'react-i18next'
import type { PetSpeciesDto, PetFormDto } from '@/types/homework'

export function PetCodex({ species, currentLevel, onClose }: {
  species?: PetSpeciesDto
  currentLevel: number
  onClose: () => void
}) {
  const { t } = useTranslation()
  const forms = [...(species?.forms ?? [])].sort((a, b) => a.level - b.level)
  const current = forms.find((f) => f.level === currentLevel)
  const next = forms.find((f) => f.level === currentLevel + 1)

  const stageState = (f: PetFormDto) =>
    f.level === currentLevel ? 'is-current' : f.level < currentLevel ? 'is-unlocked' : 'is-locked'
  const stateLabel = (f: PetFormDto) =>
    f.level === currentLevel ? t('play.codexStateCurrent')
      : f.level < currentLevel ? t('play.codexStateUnlocked') : t('play.codexStateLocked')

  return (
    <div className="kid-codex-modal is-open" data-testid="pet-codex"
         role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="kid-codex-panel">
        <div className="kid-codex-top">
          <div>
            <div className="kid-overline">CODEX</div>
            <h3>{t('play.codexTitle')}</h3>
            <p className="kid-codex-copy">{t('play.codexModalCopy')}</p>
          </div>
          <button type="button" data-testid="codex-close" className="kid-codex-close"
                  aria-label={t('play.close')} onClick={onClose}>✕</button>
        </div>

        <div className="kid-codex-rail">
          {forms.map((f) => {
            const st = stageState(f)
            const unlocked = f.level <= currentLevel
            return (
              <div key={f.level} data-testid={`codex-stage-${f.level}`} className={`kid-codex-stage ${st}`}>
                <span className="kid-codex-state">{stateLabel(f)}</span>
                {unlocked && f.spriteUrl ? (
                  <img className="kid-codex-sprite" src={f.spriteUrl} alt={f.name} />
                ) : (
                  <div className="kid-codex-lock">?</div>
                )}
                <h4>{unlocked ? f.name : t('play.codexLockedName')}</h4>
                <p>{unlocked ? (f.revealText ?? '') : ''}</p>
              </div>
            )
          })}
        </div>

        <div className="kid-codex-summary">
          <div className="kid-codex-summary-card">
            <div className="kid-overline">{t('play.codexCurrent')}</div>
            <strong>{current?.name ?? '—'}</strong>
            <p>{t('play.codexUnlockedN', { level: currentLevel })}</p>
          </div>
          <div className="kid-codex-goal-card">
            <div className="kid-overline">{t('play.codexGoal')}</div>
            <strong>{next ? next.name : t('play.codexMaxed')}</strong>
            <p>{next ? t('play.codexNext', { name: next.name }) : t('play.codexMaxedCopy')}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: 移植 CSS**

Create `kid/codex.css`——两部分,全部收进 `.kid-shell` 作用域:

1. **modal 外壳**(原型 1670-1743 + 2290-2320,改名):`.evolution-modal→.kid-codex-modal`、`.evolution-modal-panel→.kid-codex-panel`、`.evolution-modal-top→.kid-codex-top`、`.evolution-modal-copy→.kid-codex-copy`、`.modal-close→.kid-codex-close`、`.evolution-rail→.kid-codex-rail`(但 rail 改成卡片横排,见下)、`.evolution-modal-summary→.kid-codex-summary`、`.evolution-summary-card→.kid-codex-summary-card`、`.evolution-goal-card→.kid-codex-goal-card`。声明逐字搬(用到 `var(--muted)`/`var(--ink)` 的保留,scope 在 .kid-shell 下能解析)。
2. **卡片式 rail + 阶卡**(复活原型死 CSS 1749-1798 + 2253-2288,改名):`.evolution-card→.kid-codex-stage`(+`.is-current`/`.is-unlocked`/`.is-locked` 同名保留)、`.evolution-state→.kid-codex-state`、`.evolution-lock→.kid-codex-lock`、`.evolution-card h4→.kid-codex-stage h4`、`.evolution-card p→.kid-codex-stage p`。**新增** `.kid-codex-rail` 的横排容器规则(原型的 rail 是 SVG,这里改卡片,需要自己写容器):

```css
.kid-shell .kid-codex-rail {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.kid-shell .kid-codex-sprite {
  width: 118px; height: 118px; object-fit: contain; margin: 0 auto;
}
@media (max-width: 760px) {
  .kid-shell .kid-codex-rail { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```
其余(modal 外壳 + 阶卡 + 锁)逐字搬。**跳过** `.evolution-avatar*`/`.pet-dex-node`/`.evolution-rail::before`(死代码)。`@import './kid/codex.css';` 加进 `kid.css`。

- [ ] **Step 5: 跑测试 + 类型**

Run: `npm test -- PetCodex` → PASS(5/5)
Run: `npm run typecheck` → 净(注:本任务用了新 i18n 键,测试里 `t()` 返回键名,不依赖 locale——真键 Task 5 加)

- [ ] **Step 6: 提交**

```bash
git add frontend/parent-web/src/features/play/PetCodex.tsx frontend/parent-web/src/features/play/kid/codex.css frontend/parent-web/src/features/play/kid.css frontend/parent-web/src/features/play/PetCodex.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): PetCodex 五阶图鉴 modal —— 按等级门控锁态

从当前物种 forms[] 渲染五阶卡:level<=currentLevel 显真身(精灵图+名+
revealText),level>currentLevel 显未揭示态(锁+???)。当前阶 is-current、
已过 is-unlocked、未达 is-locked。原型 rail 是单 SVG 且没做锁态(尽管文案
说"未解锁保持神秘"),这里改卡片式 + 复活 purpose-built 的死 CSS
(.evolution-card/state/lock)接上锁态,补齐 spec §110 意图。modal 外壳
逐字搬原型 1670-1743 + 2290-2320,收进 .kid-shell。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 接线图鉴 —— GrowthPanel 入口 + DailyBoard 开关

**Files:**
- Modify: `frontend/parent-web/src/features/play/GrowthPanel.tsx`
- Modify: `frontend/parent-web/src/features/play/DailyBoard.tsx`
- Test: `frontend/parent-web/src/features/play/DailyBoard.codex.test.tsx`(新建)+ `GrowthPanel.test.tsx`(补一条)

**Interfaces:**
- Consumes: `PetCodex`(Task 3)
- Produces: 无

- [ ] **Step 1: 写失败的测试**

Create `DailyBoard.codex.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { JourneyDto } from '@/types/homework'

vi.mock('@/services/playService')
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', isActive: true, displayOrder: 0, forms: [
      { level: 1, name: '龙蛋', spriteUrl: 'http://x/1.png', growthToNext: 36 },
      { level: 2, name: '破壳萌龙', spriteUrl: 'http://x/2.png', growthToNext: 80 },
    ] },
  ]),
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
      <MemoryRouter><DailyBoard childId="c1" journey={journey} onFeedResult={() => {}} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DailyBoard 图鉴开关', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(svc.getPlayDailyBoard).mockResolvedValue({
      childId: 'c1', date: '2026-07-16', tasks: [], tasksTotal: 0, tasksCompleted: 0,
      stars: 0, isFull: false, isRestDay: true,
    })
    vi.mocked(svc.getWeekStrip).mockResolvedValue({ streak: 0, days: [] })
    vi.mocked(svc.getBackpack).mockResolvedValue([])
  })

  it('默认不显示图鉴;点 open-codex 打开;关闭移除', async () => {
    renderBoard()
    expect(screen.queryByTestId('pet-codex')).toBeNull()
    fireEvent.click(await screen.findByTestId('open-codex'))
    expect(screen.getByTestId('pet-codex')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('codex-close'))
    expect(screen.queryByTestId('pet-codex')).toBeNull()
  })
})
```

补一条到 `GrowthPanel.test.tsx`(open-codex 触发回调):

```tsx
it('点伙伴图鉴入口触发 onOpenCodex', () => {
  const onOpen = vi.fn()
  render(<GrowthPanel growthPoints={0} form={form} nextForm={next} onOpenCodex={onOpen} />)
  fireEvent.click(screen.getByTestId('open-codex'))
  expect(onOpen).toHaveBeenCalled()
})
```
(该测试文件顶部需 import `fireEvent`——若未 import 则补。)

- [ ] **Step 2: 跑测试确认它失败**

Run: `npm test -- DailyBoard.codex` → FAIL(点 open-codex 无反应,pet-codex 不出现)

- [ ] **Step 3: GrowthPanel 加 onOpenCodex**

`GrowthPanel.tsx`——props 加可选 `onOpenCodex`,接到 open-codex 按钮:

```tsx
export function GrowthPanel({ growthPoints, form, nextForm, onOpenCodex }: {
  growthPoints: number
  form?: PetFormDto
  nextForm?: PetFormDto
  onOpenCodex?: () => void
}) {
```
把 open-codex 按钮改为:
```tsx
        <button type="button" data-testid="open-codex" className="kid-growth-gallery-link" onClick={onOpenCodex}>
          {t('play.codexTitle')}
        </button>
```
其余不变。

- [ ] **Step 4: DailyBoard 开关 + 渲染 PetCodex**

`DailyBoard.tsx`:
1. import `PetCodex`:`import { PetCodex } from './PetCodex'`。
2. 建状态:`const [codexOpen, setCodexOpen] = useState(false)`(与现有 useState 并列)。
3. `<GrowthPanel .../>` 加 `onOpenCodex={() => setCodexOpen(true)}`。
4. 在最外层 `<div className="kid-board">` 末尾(`.kid-main-grid` 之后)条件渲染:
```tsx
      {codexOpen && (
        <PetCodex species={mySpecies} currentLevel={journey.currentLevel} onClose={() => setCodexOpen(false)} />
      )}
```
（`mySpecies` 已在组件里算好。PetCodex 是 `position:fixed` 覆盖层,渲染在 DailyBoard 内不影响布局,也不碰 KidGameShell 的庆祝 hoist。)

- [ ] **Step 5: 跑测试 + 类型 + 全量回归**

Run: `npm test -- DailyBoard.codex` → PASS
Run: `npm test -- GrowthPanel` → PASS(含新用例)
Run: `npm test` → 全量全绿
Run: `npm run typecheck` → 净

- [ ] **Step 6: 渲染核对(modal 视觉)**

Playwright 无头 Chromium:进有物种的孩子看板(用开发服务器 5173),点「伙伴图鉴 →」,截图 modal。确认:五阶卡横排、已达成阶显精灵图+名、未达成阶显锁+???、当前阶高亮(is-current 上浮)、遮罩 + 居中面板。把截图值(如 rail 列数、locked 卡是否无真名)记进报告。

- [ ] **Step 7: 提交**

```bash
git add frontend/parent-web/src/features/play/GrowthPanel.tsx frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/DailyBoard.codex.test.tsx frontend/parent-web/src/features/play/GrowthPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(play-fe): 接线图鉴 —— GrowthPanel 入口打开 PetCodex modal

GrowthPanel 的 open-codex 占位按钮接上 onOpenCodex;DailyBoard 建 codexOpen
状态,点入口打开、点关闭/遮罩收起,渲染 PetCodex(position:fixed 覆盖,不碰
KidGameShell 庆祝 hoist)。测试验开→显示→关→移除。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: i18n 键 + 收尾(全量 + 构建)

**Files:**
- Modify: `frontend/parent-web/public/locales/zh-CN/translation.json`
- Modify: `frontend/parent-web/public/locales/en/translation.json`
- Test: `frontend/parent-web/src/i18n/locales.test.ts`(现有,跑通)+ 全量

**Interfaces:**
- Consumes: 前序任务用到的 `play.codex*` / `play.close` 键
- Produces: 无

- [ ] **Step 1: 加全部新键(zh + en 双写)**

在 `public/locales/zh-CN/translation.json` 和 `public/locales/en/translation.json` 的 `play` 对象里加(键必须两边完全一致,`locales.test.ts` 强制):

```
play.codexModalCopy   已解锁的形态显示真身，未解锁的保持神秘 / Unlocked forms show their true shape; locked ones stay a mystery
play.codexCurrent     当前形态 / Current form
play.codexGoal        下一目标 / Next goal
play.codexUnlockedN   已解锁 {{level}} 阶 / {{level}} forms unlocked
play.codexNext        再成长即可进化到「{{name}}」 / Grow more to evolve into {{name}}
play.codexMaxed       已满级 / Maxed out
play.codexMaxedCopy   已是最终形态,图鉴全满 / Final form reached — codex complete
play.codexLockedName  ？？？ / ???
play.codexStateCurrent 当前 / Current
play.codexStateUnlocked 已解锁 / Unlocked
play.codexStateLocked 未解锁 / Locked
play.close            关闭 / Close
```

`play.codexTitle`(伙伴图鉴 →)已存在(Plan 2 加),勿重复。保持 JSON 紧凑格式,surgical 编辑,勿整文件重排。

- [ ] **Step 2: 跑 locale 对齐 + 全量 + 类型 + 构建**

Run: `npm test -- locales` → PASS(zh/en 键集一致)
Run: `npm test` → 全量全绿
Run: `npm run typecheck` → 净
Run: `npm run build` → 成功(最终把关)

- [ ] **Step 3: 提交**

```bash
git add frontend/parent-web/public/locales/
git commit -m "$(cat <<'EOF'
feat(play-fe): 补齐图鉴 i18n 键(zh+en 双写)

PetCodex 用到的 play.codex*/play.close 键补全,zh 与 en 双写,locale 键
对齐测试通过。npm run build 净。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 完成定义(Plan 3)

1. `npm test` 全绿;`npm run typecheck` 净;`npm run build` 成功
2. 真机:点道具能看到飞行体从补给台飞向宠物(渲染核对);点「伙伴图鉴 →」弹出五阶 modal,未达成阶显锁态
3. 满级庆祝仍可达(hoist 未破坏);喂养三失效目标未动;连点守卫在

三份计划(后端 / 设计系统+结构 / 动效+图鉴)至此全部完成。

---

## 自查记录

- **Spec 覆盖:** §143 投掷动画保真 → Task 1+2(真几何飞行,逐字搬 CSS);§110 伙伴图鉴五阶 rail modal → Task 3+4(卡片式 rail + 等级门控锁态,补齐原型没做的"未揭示态")。
- **红线落位:** 不碰 KidGameShell(Task 2/4 均不在文件清单);feed 三失效目标 + onFeedResult 在 Task 2 明确"一字不动";连点守卫 disabled 在 Task 2 保持;投掷与请求并行不阻塞(Task 2 onFeed 先 launch 再 mutate,互不 await)。
- **类型一致性:** `launchFeedProjectile(source, target, visual)`(Task 1 定义)→ Task 2 调用签名一致;`PetCodex` props `{species, currentLevel, onClose}`(Task 3)→ Task 4 渲染一致;`onFeed(item, sourceEl)`(Task 2 SupplyPanel)→ DailyBoard onFeed 适配;testid `pet-codex`/`codex-stage-${level}`/`codex-close`/`open-codex` 全程一致。
- **已知取舍:** 原型的 tray-launch(源道具在原地缩)未做——SupplyPanel 喂后会 invalidate 背包重渲染,源卡瞬态类难挂稳,且飞行体已是主效果;记为可选后续。锁态是对原型"未做锁态"的**有意补齐**(spec §110 意图),非 verbatim。投掷飞行体挂 document.body(非 .kid-shell),故其 CSS 全局、用字面值(原型该段无 var 依赖)。
