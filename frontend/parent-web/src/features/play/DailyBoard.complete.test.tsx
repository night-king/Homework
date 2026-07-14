import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const completeTask = vi.fn().mockResolvedValue({ id: 't1', countsAsCompleted: true })
const uncompleteTask = vi.fn().mockResolvedValue({ id: 't1', countsAsCompleted: false })
const getPlayDailyBoard = vi.fn()
vi.mock('@/services/playService', () => ({
  getPlayDailyBoard: (...a: unknown[]) => getPlayDailyBoard(...a),
  completeTask: (...a: unknown[]) => completeTask(...a),
  uncompleteTask: (...a: unknown[]) => uncompleteTask(...a),
}))
vi.mock('@/services/homeworkService', () => ({ listActivePetSpecies: vi.fn().mockResolvedValue([]) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { DailyBoard } from './DailyBoard'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
const journey = { id: 'j1', childId: 'c1', status: 1, petSpeciesId: null, currentLevel: 1, growthPoints: 0 } as never
beforeEach(() => {
  vi.clearAllMocks()
  getPlayDailyBoard.mockResolvedValue({
    childId: 'c1', date: '2026-07-14',
    tasks: [{ id: 't1', title: '口算', order: 0, isCompleted: false, countsAsCompleted: false, rewardItemId: 'r1' }],
    tasksTotal: 1, tasksCompleted: 0, stars: 0, isFull: false, isRestDay: false,
  })
})

describe('DailyBoard complete', () => {
  it('completing a task calls completeTask', async () => {
    ui(<DailyBoard childId="c1" journey={journey} />)
    await waitFor(() => expect(screen.getByTestId('task-toggle-t1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('task-toggle-t1'))
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith('c1', 't1'))
  })
})
