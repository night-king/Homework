import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { WeeklyPkResultDto } from '@/types/homework'

const getWeeklyPk = vi.fn()
vi.mock('@/services/homeworkService', () => ({ getWeeklyPk: (...a: unknown[]) => getWeeklyPk(...a) }))
import { PkBoard } from './PkBoard'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

const result: WeeklyPkResultDto = {
  weekStart: '2026-07-20',
  through: '2026-07-23',
  entries: [
    {
      rank: 1, childId: 'a', displayName: '全勤娃', avatarKey: null,
      petSpeciesId: 'p1', petName: '火龙', petLevel: 4, petSpriteUrl: null,
      completionPercent: 100, completedTasks: 8, totalTasks: 8, streak: 12, weeklyStars: 28,
      items: [{ rewardItemId: 'r1', name: '留存果实', glyph: '🍎', iconUrl: null, quantity: 20 }],
    },
    {
      rank: 2, childId: 'b', displayName: '一半娃', avatarKey: null,
      petSpeciesId: 'p1', petName: '火龙', petLevel: 2, petSpriteUrl: null,
      completionPercent: 50, completedTasks: 4, totalTasks: 8, streak: 2, weeklyStars: 12,
      items: [],
    },
  ],
}

describe('PkBoard', () => {
  it('renders ranked cards with champion and completion', async () => {
    getWeeklyPk.mockResolvedValue(result)
    ui(<PkBoard />)
    await waitFor(() => expect(screen.getByTestId('pk-card-a')).toBeInTheDocument())
    // 冠军皇冠 + 第 1 名
    expect(screen.getByText('👑')).toBeInTheDocument()
    expect(screen.getByText('🥇 第1名')).toBeInTheDocument()
    // 完成度百分比
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    // 第二名卡片也在
    expect(screen.getByTestId('pk-card-b')).toBeInTheDocument()
    // 道具数量
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('shows empty state when nobody is on a journey', async () => {
    getWeeklyPk.mockResolvedValue({ weekStart: '2026-07-20', through: '2026-07-23', entries: [] })
    ui(<PkBoard />)
    await waitFor(() => expect(screen.getByText(/还没有正在闯关/)).toBeInTheDocument())
  })
})
