import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// 满级完成的回归测试：喂养让旅程满级后，服务端 GetActive 返回空，shell 会切走看板。
// 承载庆祝过场的组件若挂在看板下，就会被一起卸载 —— 孩子永远看不到庆祝。
// 故意不 mock DailyBoard：这条 bug 只在「真看板 + 真 shell」的组合里出现。
const getActiveJourney = vi.fn()
const feed = vi.fn()
const getBackpack = vi.fn()
const getPlayDailyBoard = vi.fn()
const getCollection = vi.fn()
const listJourneys = vi.fn()
vi.mock('@/services/playService', () => ({
  getActiveJourney: (...a: unknown[]) => getActiveJourney(...a),
  feed: (...a: unknown[]) => feed(...a),
  getBackpack: (...a: unknown[]) => getBackpack(...a),
  getPlayDailyBoard: (...a: unknown[]) => getPlayDailyBoard(...a),
  getCollection: (...a: unknown[]) => getCollection(...a),
  completeTask: vi.fn(),
  uncompleteTask: vi.fn(),
  startJourney: vi.fn(),
}))
vi.mock('@/services/homeworkService', () => ({
  listJourneys: (...a: unknown[]) => listJourneys(...a),
  listActivePetSpecies: vi.fn().mockResolvedValue([]),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { KidGameShell } from './KidGameShell'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/play/c1']}>
        <Routes><Route path="/play/:childId" element={node} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const journey = { id: 'j1', childId: 'c1', title: '暑假成长大冒险', status: 1, petSpeciesId: 'p1', currentLevel: 4, growthPoints: 90 }
const entry = {
  journeyId: 'j1', title: '暑假成长大冒险', petSpeciesId: 'p1', petName: '火龙',
  petFinalSpriteUrl: 'https://cdn/form-5.png', medalId: 'm1', medalName: '暑期毕业勋章',
  medalImageUrl: null, completedTime: '2026-07-15T10:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  listJourneys.mockResolvedValue([])
  getCollection.mockResolvedValue([entry])
  getBackpack.mockResolvedValue([{ rewardItemId: 'r1', name: '留存果实', glyph: '🍎', quantity: 1 }])
  getPlayDailyBoard.mockResolvedValue({
    childId: 'c1', date: '2026-07-15', tasks: [], tasksTotal: 0, tasksCompleted: 0,
    stars: 0, isFull: false, isRestDay: true,
  })
})

describe('KidGameShell 满级完成', () => {
  it('旅程满级后 active 变空，庆祝过场依然留在屏幕上', async () => {
    // 喂养后的 refetch 卡在闸门上，由测试决定何时「服务端不再有 active 旅程」，
    // 否则 waitFor 会抢在卸载前抓到一闪而过的过场，测试就假绿了。
    let flipToNoActive!: () => void
    const gate = new Promise<void>((r) => { flipToNoActive = r })
    let calls = 0
    getActiveJourney.mockImplementation(async () => {
      calls += 1
      if (calls === 1) return journey
      await gate
      return null
    })
    feed.mockResolvedValue({
      evolved: true, newLevel: 5, completed: true, currentLevel: 5, growthPoints: 0,
      revealText: '烈焰冲天', evolveVideoUrl: null,
    })

    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByTestId('backpack-item-r1')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('backpack-item-r1'))
    await waitFor(() => expect(screen.getByTestId('evo-completed')).toBeInTheDocument())

    // 服务端此刻起不再有 active 旅程（旧代码正是在这一步把庆祝连同看板一起卸载）
    flipToNoActive()
    await waitFor(() => expect(getActiveJourney).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByTestId('pet-sprite')).not.toBeInTheDocument())

    // 真正的断言：看板走了，庆祝不能跟着走
    expect(screen.getByTestId('evo-completed')).toBeInTheDocument()
  })

  it('关掉庆祝后落到旅程完成屏，可以去收藏墙', async () => {
    getActiveJourney.mockResolvedValueOnce(journey).mockResolvedValue(null)
    feed.mockResolvedValue({
      evolved: true, newLevel: 5, completed: true, currentLevel: 5, growthPoints: 0,
      revealText: '烈焰冲天', evolveVideoUrl: null,
    })

    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByTestId('backpack-item-r1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('backpack-item-r1'))
    await waitFor(() => expect(screen.getByTestId('evo-completed')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('evo-close'))

    await waitFor(() => expect(screen.getByTestId('journey-completed')).toBeInTheDocument())
    expect(screen.getByText('暑期毕业勋章')).toBeInTheDocument()
    expect(screen.getByTestId('completed-see-collection')).toHaveAttribute('href', '/play/c1/collection')
    // 不能停在「还没有冒险」
    expect(screen.queryByTestId('play-empty')).not.toBeInTheDocument()
  })

  it('庆祝屏是一次性的：关掉后回到常规分支', async () => {
    getActiveJourney.mockResolvedValueOnce(journey).mockResolvedValue(null)
    feed.mockResolvedValue({
      evolved: true, newLevel: 5, completed: true, currentLevel: 5, growthPoints: 0,
      revealText: '烈焰冲天', evolveVideoUrl: null,
    })

    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByTestId('backpack-item-r1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('backpack-item-r1'))
    await waitFor(() => expect(screen.getByTestId('evo-completed')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('evo-close'))
    await waitFor(() => expect(screen.getByTestId('journey-completed')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('completed-dismiss'))
    await waitFor(() => expect(screen.getByTestId('play-empty')).toBeInTheDocument())
  })
})
