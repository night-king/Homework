import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ConfirmProvider } from '@/components/ConfirmDialog'

vi.mock('@/services/homeworkService', () => ({
  listSharedJourneys: vi.fn().mockResolvedValue([
    { id: 's1', parentId: 'p1', title: '暑假之旅', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 0 },
    { id: 's2', parentId: 'p1', title: '进行中之旅', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 1 },
  ]),
  listActiveMedals: vi.fn().mockResolvedValue([{ id: 'm1', name: '毕业勋章', isActive: true, displayOrder: 0 }]),
  deleteSharedJourney: vi.fn(),
}))
import { JourneysPage } from './JourneysPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ConfirmProvider>{node}</ConfirmProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('JourneysPage', () => {
  it('lists the parent shared journeys with a status badge', async () => {
    ui(<JourneysPage />)
    await waitFor(() => expect(screen.getByText('暑假之旅')).toBeInTheDocument())
    expect(screen.getByTestId('journey-status-s1')).toBeInTheDocument()
  })
  it('edit shows for draft + active; delete only for draft', async () => {
    ui(<JourneysPage />)
    await waitFor(() => expect(screen.getByText('暑假之旅')).toBeInTheDocument())
    // draft s1: edit + delete
    expect(screen.getByTestId('edit-journey-s1')).toBeInTheDocument()
    expect(screen.getByTestId('delete-journey-s1')).toBeInTheDocument()
    // active s2: edit yes, delete no
    expect(screen.getByTestId('edit-journey-s2')).toBeInTheDocument()
    expect(screen.queryByTestId('delete-journey-s2')).not.toBeInTheDocument()
  })
})
