import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ConfirmProvider } from '@/components/ConfirmDialog'

vi.mock('@/services/homeworkService', () => ({
  getSharedJourney: vi.fn(),
  listJourneyTemplates: vi.fn().mockResolvedValue([]),
  listChildren: vi.fn().mockResolvedValue([{ id: 'c1', displayName: '哥哥', grade: 3, hasPin: false }]),
  listActiveRewardItems: vi.fn().mockResolvedValue([]),
  listActiveMedals: vi.fn().mockResolvedValue([]),
  addParticipants: vi.fn(),
  removeParticipant: vi.fn(),
}))
import { getSharedJourney } from '@/services/homeworkService'
import { JourneyEditPage } from './JourneyEditPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/journeys/s1/edit']}>
        <ConfirmProvider>
          <Routes><Route path="/journeys/:id/edit" element={node} /></Routes>
        </ConfirmProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>
beforeEach(() => vi.clearAllMocks())

describe('JourneyEditPage', () => {
  it('shows the wizard prefilled for a shared journey', async () => {
    mock(getSharedJourney).mockResolvedValue({ id: 's1', parentId: 'p1', title: '暑假之旅', description: '', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 0 })
    ui(<JourneyEditPage />)
    await waitFor(() => expect(screen.getByTestId('wiz-title')).toHaveValue('暑假之旅'))
  })
  it('renders the participant panel with the account children', async () => {
    mock(getSharedJourney).mockResolvedValue({ id: 's1', parentId: 'p1', title: 'A', description: '', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 1 })
    ui(<JourneyEditPage />)
    await waitFor(() => expect(screen.getByTestId('participant-toggle-c1')).toBeInTheDocument())
    expect(screen.getByTestId('participants-add')).toBeInTheDocument()
  })
})
