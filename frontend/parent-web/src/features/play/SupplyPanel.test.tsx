import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import type { BackpackItemDto } from '@/types/homework'

vi.mock('@/services/playService')
import * as svc from '@/services/playService'
import { SupplyPanel } from './SupplyPanel'

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
const item: BackpackItemDto = { rewardItemId: 'r1', name: '冲锋饭团', glyph: '🍙', quantity: 3, growthValue: 12, iconUrl: null }

describe('SupplyPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('空背包显示空态', async () => {
    vi.mocked(svc.getBackpack).mockResolvedValue([])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<SupplyPanel childId="c1" journeyId="j1" />, { wrapper: wrap(qc) })
    expect(await screen.findByTestId('backpack-empty')).toBeInTheDocument()
  })

  it('有道具时渲染道具卡,点击触发 onFeed', async () => {
    vi.mocked(svc.getBackpack).mockResolvedValue([item])
    const onFeed = vi.fn()
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<SupplyPanel childId="c1" journeyId="j1" onFeed={onFeed} />, { wrapper: wrap(qc) })
    const btn = await screen.findByTestId('backpack-item-r1')
    fireEvent.click(btn)
    expect(onFeed).toHaveBeenCalledWith(item)
  })

  it('disabled 时道具按钮禁用(连点守卫)', async () => {
    vi.mocked(svc.getBackpack).mockResolvedValue([item])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<SupplyPanel childId="c1" journeyId="j1" disabled />, { wrapper: wrap(qc) })
    expect(await screen.findByTestId('backpack-item-r1')).toBeDisabled()
  })
})
