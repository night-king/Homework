import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { JourneyDto } from '@/types/homework'

// 桩法照现有 DailyBoard.test.tsx:playService 工厂 + homeworkService 供 species。
// 本任务 DailyBoard 还没接 KidTopBar(Task 5 才接),所以不需要 getWeekStrip。
vi.mock('@/services/playService')
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([{ id: 'p1', name: '火龙', code: 'dragon', forms: [] }]),
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
      <MemoryRouter>
        <DailyBoard childId="c1" journey={journey} onFeedResult={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DailyBoard 两栏外壳', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(svc.getPlayDailyBoard).mockResolvedValue({
      childId: 'c1', date: '2026-07-15', tasks: [], tasksTotal: 0, tasksCompleted: 0,
      stars: 0, isFull: false, isRestDay: true,
    })
    vi.mocked(svc.getBackpack).mockResolvedValue([])
  })

  it('渲染主栏与侧栏两个结构容器', () => {
    renderBoard()
    expect(screen.getByTestId('kid-main')).toBeInTheDocument()
    expect(screen.getByTestId('kid-side')).toBeInTheDocument()
  })
})
