import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listChildren: vi.fn().mockResolvedValue([{ id: 'c1', displayName: '哥哥', grade: 3, hasPin: false }]),
  listJourneys: vi.fn().mockResolvedValue([
    { id: 'j1', childId: 'c1', title: '暑假之旅', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1', status: 1, currentLevel: 2, growthPoints: 30 },
  ]),
  getDailyBoard: vi.fn().mockResolvedValue({ childId: 'c1', date: 'x', tasks: [], tasksTotal: 3, tasksCompleted: 1, stars: 2, isFull: false, isRestDay: false }),
}))
import { HomePage } from './HomePage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('HomePage', () => {
  it('shows the active journey summary for each child', async () => {
    ui(<HomePage />)
    await waitFor(() => expect(screen.getByText('暑假之旅')).toBeInTheDocument())
    expect(screen.getByText('哥哥')).toBeInTheDocument()
  })
})
