import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllRewardItems: vi.fn().mockResolvedValue([
    { id: 'r1', name: '星火书签', glyph: '✦', growthValue: 12, randomWeight: 2, isActive: true, displayOrder: 0 },
  ]),
  createRewardItem: vi.fn(), updateRewardItem: vi.fn(), deleteRewardItem: vi.fn(), uploadRewardItemIcon: vi.fn(),
}))
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { RewardItemsPanel } from './RewardItemsPanel'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><ConfirmProvider>{node}</ConfirmProvider></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('RewardItemsPanel', () => {
  it('lists items and opens the create dialog', async () => {
    ui(<RewardItemsPanel />)
    await waitFor(() => expect(screen.getByText('星火书签')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('reward-create'))
    expect(screen.getByTestId('reward-name-input')).toBeInTheDocument()
  })
})
