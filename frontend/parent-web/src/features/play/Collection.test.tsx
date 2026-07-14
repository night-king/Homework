import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const getCollection = vi.fn()
vi.mock('@/services/playService', () => ({ getCollection: (...a: unknown[]) => getCollection(...a) }))
import { Collection } from './Collection'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/play/c1/collection']}>
        <Routes><Route path="/play/:childId/collection" element={node} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('Collection', () => {
  it('renders completed entries', async () => {
    getCollection.mockResolvedValue([{ journeyId: 'j1', title: '暑假之旅', petSpeciesId: 'p1', petName: '火龙', petFinalSpriteUrl: 'http://x/5.png', medalId: 'm1', medalName: '毕业勋章', medalImageUrl: null, completedTime: '2026-08-31T00:00:00Z' }])
    ui(<Collection />)
    await waitFor(() => expect(screen.getByTestId('collection-entry-j1')).toBeInTheDocument())
    expect(screen.getByText('毕业勋章')).toBeInTheDocument()
  })
  it('shows empty state', async () => {
    getCollection.mockResolvedValue([])
    ui(<Collection />)
    await waitFor(() => expect(screen.getByTestId('collection-empty')).toBeInTheDocument())
  })
})
