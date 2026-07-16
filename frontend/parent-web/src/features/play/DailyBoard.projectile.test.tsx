import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { JourneyDto } from '@/types/homework'

vi.mock('@/services/playService')
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', forms: [{ level: 1, name: '龙蛋', spriteUrl: 'http://x/1.png', growthToNext: 36 }] },
  ]),
}))
// 监视投掷是否被调用
const launchSpy = vi.fn()
vi.mock('./feedProjectile', () => ({ launchFeedProjectile: (...a: unknown[]) => launchSpy(...a) }))

import * as svc from '@/services/playService'
import { DailyBoard } from './DailyBoard'

const journey: JourneyDto = {
  id: 'j1', childId: 'c1', title: '旅程', startDate: '2026-07-01', endDate: '2026-08-31',
  medalId: 'm1', status: 1, petSpeciesId: 'p1', currentLevel: 1, growthPoints: 0,
}

function renderBoard(onFeedResult = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><DailyBoard childId="c1" journey={journey} onFeedResult={onFeedResult} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DailyBoard 投掷接线', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(svc.getPlayDailyBoard).mockResolvedValue({
      childId: 'c1', date: '2026-07-16', tasks: [], tasksTotal: 0, tasksCompleted: 0,
      stars: 0, isFull: false, isRestDay: true,
    })
    vi.mocked(svc.getWeekStrip).mockResolvedValue({ streak: 0, days: [] })
    vi.mocked(svc.getBackpack).mockResolvedValue([
      { rewardItemId: 'r1', name: '饭团', glyph: '🍙', iconUrl: null, quantity: 2, growthValue: 12 },
    ])
    vi.mocked(svc.feed).mockResolvedValue({ evolved: false, completed: false, newLevel: 1, currentLevel: 1, growthPoints: 12 } as never)
  })

  it('点道具:启动投掷 + 照常 feed(onFeedResult 仍被调用)', async () => {
    const onFeedResult = vi.fn()
    renderBoard(onFeedResult)
    const item = await screen.findByTestId('backpack-item-r1')
    fireEvent.click(item)
    // 投掷被调用(源元素 + 落点 + 视觉)
    expect(launchSpy).toHaveBeenCalledTimes(1)
    // 喂养照常:onFeedResult 收到结果(红线:庆祝链路不断)
    await waitFor(() => expect(onFeedResult).toHaveBeenCalled())
  })
})
