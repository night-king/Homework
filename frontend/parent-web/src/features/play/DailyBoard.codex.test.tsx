import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { JourneyDto } from '@/types/homework'

vi.mock('@/services/playService')
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', isActive: true, displayOrder: 0, forms: [
      { level: 1, name: '龙蛋', spriteUrl: 'http://x/1.png', growthToNext: 36 },
      { level: 2, name: '破壳萌龙', spriteUrl: 'http://x/2.png', growthToNext: 80 },
    ] },
  ]),
}))
import * as svc from '@/services/playService'
import { DailyBoard } from './DailyBoard'

const journey: JourneyDto = {
  id: 'j1', childId: 'c1', title: '旅程', startDate: '2026-07-01', endDate: '2026-08-31',
  medalId: 'm1', status: 1, petSpeciesId: 'p1', currentLevel: 1, growthPoints: 0,
}

function renderBoard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><DailyBoard childId="c1" journey={journey} onFeedResult={() => {}} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DailyBoard 图鉴开关', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(svc.getPlayDailyBoard).mockResolvedValue({
      childId: 'c1', date: '2026-07-16', tasks: [], tasksTotal: 0, tasksCompleted: 0,
      stars: 0, isFull: false, isRestDay: true,
    })
    vi.mocked(svc.getWeekStrip).mockResolvedValue({ streak: 0, days: [] })
    vi.mocked(svc.getBackpack).mockResolvedValue([])
  })

  it('默认不显示图鉴;点 open-codex 打开;关闭移除', async () => {
    renderBoard()
    expect(screen.queryByTestId('pet-codex')).toBeNull()
    fireEvent.click(await screen.findByTestId('open-codex'))
    expect(screen.getByTestId('pet-codex')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('codex-close'))
    expect(screen.queryByTestId('pet-codex')).toBeNull()
  })
})
