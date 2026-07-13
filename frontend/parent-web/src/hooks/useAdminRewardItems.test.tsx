import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllRewardItems: vi.fn(), createRewardItem: vi.fn(), updateRewardItem: vi.fn(),
  deleteRewardItem: vi.fn(), uploadRewardItemIcon: vi.fn(),
}))
import { listAllRewardItems } from '@/services/homeworkService'
import { useAdminRewardItems } from './useAdminRewardItems'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('useAdminRewardItems', () => {
  it('fetches the full reward-item list', async () => {
    ;(listAllRewardItems as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'r1' }])
    const { result } = renderHook(() => useAdminRewardItems(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'r1' }])
  })
})
