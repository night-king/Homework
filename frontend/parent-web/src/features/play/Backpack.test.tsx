import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const getBackpack = vi.fn()
vi.mock('@/services/playService', () => ({ getBackpack: (...a: unknown[]) => getBackpack(...a) }))
import { Backpack } from './Backpack'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('Backpack', () => {
  it('renders items and calls onFeed on click', async () => {
    getBackpack.mockResolvedValue([{ rewardItemId: 'r1', name: '能量果实', glyph: '🍎', quantity: 3, growthValue: 15 }])
    const onFeed = vi.fn()
    ui(<Backpack childId="c1" journeyId="j1" onFeed={onFeed} />)
    await waitFor(() => expect(screen.getByTestId('backpack-item-r1')).toBeInTheDocument())
    expect(screen.getByText('能量果实')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('backpack-item-r1'))
    expect(onFeed).toHaveBeenCalledWith(expect.objectContaining({ rewardItemId: 'r1' }))
  })
  it('shows empty state', async () => {
    getBackpack.mockResolvedValue([])
    ui(<Backpack childId="c1" journeyId="j1" />)
    await waitFor(() => expect(screen.getByTestId('backpack-empty')).toBeInTheDocument())
  })
})
