import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ConfirmProvider } from '@/components/ConfirmDialog'

vi.mock('@/services/homeworkService', () => ({
  listChildren: vi.fn().mockResolvedValue([{ id: 'c1', displayName: '哥哥', grade: 3, hasPin: false }]),
  listJourneys: vi.fn().mockResolvedValue([
    { id: 'j1', childId: 'c1', title: '暑假之旅', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 0, currentLevel: 1, growthPoints: 0 },
    { id: 'j2', childId: 'c1', title: '进行中之旅', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 1, petSpeciesId: 'p1', currentLevel: 2, growthPoints: 10 },
  ]),
  listActivePetSpecies: vi.fn().mockResolvedValue([]),
  listActiveMedals: vi.fn().mockResolvedValue([{ id: 'm1', name: '毕业勋章', isActive: true, displayOrder: 0 }]),
  deleteJourney: vi.fn(),
  createJourney: vi.fn(), updateJourney: vi.fn(),
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
  it('lists the selected child journeys with a draft badge', async () => {
    ui(<JourneysPage />)
    await waitFor(() => expect(screen.getByText('暑假之旅')).toBeInTheDocument())
    expect(screen.getByTestId('journey-status-j1')).toBeInTheDocument()
  })
  it('edit shows for draft + active; delete only for draft', async () => {
    ui(<JourneysPage />)
    await waitFor(() => expect(screen.getByText('暑假之旅')).toBeInTheDocument())
    // draft j1: edit + delete
    expect(screen.getByTestId('edit-journey-j1')).toBeInTheDocument()
    expect(screen.getByTestId('delete-journey-j1')).toBeInTheDocument()
    // active j2: edit yes, delete no
    expect(screen.getByTestId('edit-journey-j2')).toBeInTheDocument()
    expect(screen.queryByTestId('delete-journey-j2')).not.toBeInTheDocument()
  })
})
