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
import { useWeekStrip, usePlayMutations } from '@/hooks/usePlay'

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
