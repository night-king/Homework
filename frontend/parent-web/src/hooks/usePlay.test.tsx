import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/playService', () => ({
  getActiveJourney: vi.fn().mockResolvedValue({ id: 'j1', childId: 'c1', currentLevel: 1, growthPoints: 0, status: 1 }),
  startJourney: vi.fn().mockResolvedValue({ id: 'j1' }),
  completeTask: vi.fn().mockResolvedValue({ id: 't1' }),
  uncompleteTask: vi.fn().mockResolvedValue({ id: 't1' }),
  feed: vi.fn().mockResolvedValue({ evolved: false, completed: false, currentLevel: 1, growthPoints: 12, newLevel: 1 }),
  getPlayDailyBoard: vi.fn(), getBackpack: vi.fn(), getCollection: vi.fn(),
}))
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([]),
  listJourneys: vi.fn().mockResolvedValue([]),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useActiveJourney, usePlayMutations } from './usePlay'
import { feed as feedSvc } from '@/services/playService'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('usePlay', () => {
  it('useActiveJourney fetches active journey', async () => {
    const { result } = renderHook(() => useActiveJourney('c1'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.data?.id).toBe('j1'))
  })

  it('usePlayMutations.feed calls feed service', async () => {
    const { result } = renderHook(() => usePlayMutations('c1', 'j1'), { wrapper: wrapper() })
    await act(async () => { await result.current.feed.mutateAsync({ childId: 'c1', journeyId: 'j1', rewardItemId: 'r1' }) })
    expect(feedSvc).toHaveBeenCalledWith({ childId: 'c1', journeyId: 'j1', rewardItemId: 'r1' })
  })
})
