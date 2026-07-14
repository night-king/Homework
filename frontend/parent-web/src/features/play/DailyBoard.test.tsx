import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const getPlayDailyBoard = vi.fn()
vi.mock('@/services/playService', () => ({ getPlayDailyBoard: (...a: unknown[]) => getPlayDailyBoard(...a) }))
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', forms: [{ level: 2, name: '破壳萌龙', spriteUrl: 'http://x/2.png', growthToNext: 60, scale: 0.72 }] },
  ]),
}))
import { DailyBoard } from './DailyBoard'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
const journey = { id: 'j1', childId: 'c1', status: 1, petSpeciesId: 'p1', currentLevel: 2, growthPoints: 30 } as never
beforeEach(() => {
  vi.clearAllMocks()
  getPlayDailyBoard.mockResolvedValue({
    childId: 'c1', date: '2026-07-14',
    tasks: [{ id: 't1', title: '口算 20 分钟', subject: 'math', order: 0, isCompleted: false, countsAsCompleted: false, rewardItemId: 'r1' }],
    tasksTotal: 1, tasksCompleted: 0, stars: 0, isFull: false, isRestDay: false,
  })
})

describe('DailyBoard', () => {
  it('renders pet sprite, growth bar and today tasks', async () => {
    ui(<DailyBoard childId="c1" journey={journey} />)
    await waitFor(() => expect(screen.getByTestId('task-t1')).toBeInTheDocument())
    expect(screen.getByTestId('pet-sprite')).toBeInTheDocument()
    expect(screen.getByTestId('growth-bar')).toBeInTheDocument()
    expect(screen.getByText('口算 20 分钟')).toBeInTheDocument()
  })
})
