import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listJourneys: vi.fn(),
  getJourney: vi.fn(),
  deleteJourney: vi.fn(),
  listSharedJourneys: vi.fn(),
  getSharedJourney: vi.fn(),
  createSharedJourney: vi.fn(),
  updateSharedJourney: vi.fn(),
  deleteSharedJourney: vi.fn(),
  addParticipants: vi.fn(),
  removeParticipant: vi.fn(),
}))
import { listJourneys, listSharedJourneys } from '@/services/homeworkService'
import { useJourneys, useSharedJourneys } from './useJourneys'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useJourneys (per-child, read-only)', () => {
  it('is disabled when childId is empty (no fetch)', () => {
    renderHook(() => useJourneys(''), { wrapper })
    expect(listJourneys).not.toHaveBeenCalled()
  })
  it('fetches journeys for a child', async () => {
    ;(listJourneys as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'j1' }])
    const { result } = renderHook(() => useJourneys('c1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'j1' }])
    expect(listJourneys).toHaveBeenCalledWith('c1')
  })
})

describe('useSharedJourneys', () => {
  it('fetches all shared journeys for the parent', async () => {
    ;(listSharedJourneys as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 's1' }])
    const { result } = renderHook(() => useSharedJourneys(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 's1' }])
    expect(listSharedJourneys).toHaveBeenCalled()
  })
})
