import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const getActiveJourney = vi.fn()
const listJourneys = vi.fn()
vi.mock('@/services/playService', () => ({ getActiveJourney: (...a: unknown[]) => getActiveJourney(...a) }))
vi.mock('@/services/homeworkService', () => ({ listJourneys: (...a: unknown[]) => listJourneys(...a) }))
// 子屏占位，隔离 shell 逻辑
vi.mock('./DailyBoard', () => ({ DailyBoard: () => <div>daily-board</div> }))
vi.mock('./PickPet', () => ({ PickPet: () => <div>pick-pet</div> }))
vi.mock('./ChooseAdventure', () => ({ ChooseAdventure: () => <div>choose-adventure</div> }))
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
beforeEach(() => { vi.clearAllMocks(); listJourneys.mockResolvedValue([]) })

describe('KidGameShell 状态机', () => {
  it('active journey → DailyBoard', async () => {
    getActiveJourney.mockResolvedValue({ id: 'j1', childId: 'c1', status: 1, currentLevel: 2, growthPoints: 10 })
    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByText('daily-board')).toBeInTheDocument())
  })
  it('no active + exactly 1 draft → PickPet', async () => {
    getActiveJourney.mockResolvedValue(null)
    listJourneys.mockResolvedValue([{ id: 'd1', childId: 'c1', status: 0 }])
    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByText('pick-pet')).toBeInTheDocument())
  })
  it('no active + 2 drafts → ChooseAdventure', async () => {
    getActiveJourney.mockResolvedValue(null)
    listJourneys.mockResolvedValue([{ id: 'd1', status: 0 }, { id: 'd2', status: 0 }])
    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByText('choose-adventure')).toBeInTheDocument())
  })
  it('nothing → empty state', async () => {
    getActiveJourney.mockResolvedValue(null)
    listJourneys.mockResolvedValue([])
    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByTestId('play-empty')).toBeInTheDocument())
  })

  // 满级后永远不再有 active 旅程 → 看板不再出现，而收藏墙链接原本只挂在看板上。
  // 空态必须留一条通往勋章的持久入口，否则孩子拿到的勋章再也看不到。
  it('空态保留去收藏墙的入口', async () => {
    getActiveJourney.mockResolvedValue(null)
    listJourneys.mockResolvedValue([])
    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByTestId('play-empty')).toBeInTheDocument())
    expect(screen.getByTestId('empty-see-collection')).toHaveAttribute('href', '/play/c1/collection')
  })
})
