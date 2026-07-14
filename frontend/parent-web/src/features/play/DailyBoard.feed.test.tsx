import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const feed = vi.fn()
const getBackpack = vi.fn().mockResolvedValue([{ rewardItemId: 'r1', name: '果实', glyph: '🍎', quantity: 2, growthValue: 15 }])
const getPlayDailyBoard = vi.fn().mockResolvedValue({ childId: 'c1', date: '2026-07-14', tasks: [], tasksTotal: 0, tasksCompleted: 0, stars: 0, isFull: false, isRestDay: true })
vi.mock('@/services/playService', () => ({
  feed: (...a: unknown[]) => feed(...a),
  getBackpack: (...a: unknown[]) => getBackpack(...a),
  getPlayDailyBoard: (...a: unknown[]) => getPlayDailyBoard(...a),
}))
vi.mock('@/services/homeworkService', () => ({ listActivePetSpecies: vi.fn().mockResolvedValue([]) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { DailyBoard } from './DailyBoard'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
const journey = { id: 'j1', childId: 'c1', status: 1, petSpeciesId: 'p1', currentLevel: 1, growthPoints: 0 } as never
beforeEach(() => vi.clearAllMocks())

describe('DailyBoard feed', () => {
  it('feeding calls feed and shows cutscene on evolve', async () => {
    feed.mockResolvedValue({ evolved: true, newLevel: 2, completed: false, currentLevel: 2, growthPoints: 3, revealText: '裂壳', evolveVideoUrl: null })
    ui(<DailyBoard childId="c1" journey={journey} />)
    await waitFor(() => expect(screen.getByTestId('backpack-item-r1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('backpack-item-r1'))
    await waitFor(() => expect(feed).toHaveBeenCalledWith({ childId: 'c1', journeyId: 'j1', rewardItemId: 'r1' }))
    await waitFor(() => expect(screen.getByTestId('evo-css')).toBeInTheDocument())
  })
})
