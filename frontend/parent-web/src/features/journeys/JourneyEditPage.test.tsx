import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  getJourney: vi.fn(),
  listJourneyTemplates: vi.fn().mockResolvedValue([]),
  listActiveRewardItems: vi.fn().mockResolvedValue([]),
  listActiveMedals: vi.fn().mockResolvedValue([]),
}))
import { getJourney } from '@/services/homeworkService'
import { JourneyEditPage } from './JourneyEditPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/journeys/j1/edit']}>
        <Routes><Route path="/journeys/:id/edit" element={node} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>
beforeEach(() => vi.clearAllMocks())

describe('JourneyEditPage', () => {
  it('shows the wizard prefilled for a Draft journey', async () => {
    mock(getJourney).mockResolvedValue({ id: 'j1', childId: 'c1', title: '暑假之旅', description: '', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 0, currentLevel: 1, growthPoints: 0 })
    ui(<JourneyEditPage />)
    await waitFor(() => expect(screen.getByTestId('wiz-title')).toHaveValue('暑假之旅'))
  })
  it('lets you edit an Active journey in place (wizard prefilled)', async () => {
    mock(getJourney).mockResolvedValue({ id: 'j1', childId: 'c1', title: 'A', description: '', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 1, currentLevel: 2, growthPoints: 10 })
    ui(<JourneyEditPage />)
    await waitFor(() => expect(screen.getByTestId('wiz-title')).toHaveValue('A'))
    expect(screen.queryByTestId('journey-readonly')).not.toBeInTheDocument()
  })
  it('shows read-only notice for a Completed journey', async () => {
    mock(getJourney).mockResolvedValue({ id: 'j1', childId: 'c1', title: 'A', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 2, currentLevel: 5, growthPoints: 0 })
    ui(<JourneyEditPage />)
    await waitFor(() => expect(screen.getByTestId('journey-readonly')).toBeInTheDocument())
  })
})
