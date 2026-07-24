import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listActiveRewardItems: vi.fn().mockResolvedValue([]),
  listActiveMedals: vi.fn().mockResolvedValue([]),
}))
vi.mock('./wizard/submitJourney', () => ({ publishNewJourney: vi.fn() }))
import { JourneyNewPage } from './JourneyNewPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/journeys/new']}>
        <Routes>
          <Route path="/journeys/new" element={node} />
          <Route path="/journeys" element={<div>journeys-list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('JourneyNewPage', () => {
  it('renders the wizard for a new shared journey', () => {
    ui(<JourneyNewPage />)
    expect(screen.getByTestId('wiz-title')).toBeInTheDocument()
  })
})
