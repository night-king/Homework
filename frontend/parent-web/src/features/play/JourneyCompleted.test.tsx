import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const getCollection = vi.fn()
vi.mock('@/services/playService', () => ({ getCollection: (...a: unknown[]) => getCollection(...a) }))
import { JourneyCompleted } from './JourneyCompleted'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}
const entry = {
  journeyId: 'j1', title: '暑假成长大冒险', petSpeciesId: 'p1', petName: '火龙',
  petFinalSpriteUrl: 'https://cdn/form-5.png', medalId: 'm1', medalName: '暑期毕业勋章',
  medalImageUrl: null, completedTime: '2026-07-15T10:00:00Z',
}
beforeEach(() => vi.clearAllMocks())

describe('JourneyCompleted', () => {
  it('取到收藏记录 → 展示满级形象与勋章', async () => {
    getCollection.mockResolvedValue([entry])
    ui(<JourneyCompleted childId="c1" journeyId="j1" onDismiss={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('暑期毕业勋章')).toBeInTheDocument())
    expect(screen.getByAltText('火龙')).toHaveAttribute('src', 'https://cdn/form-5.png')
  })

  // 这屏是冷启动 useCollection（孩子端别处不挂它）：加载中不能露出空白勋章名
  it('收藏还在加载 → 显示加载中，不露空白勋章', async () => {
    getCollection.mockImplementation(() => new Promise(() => {}))
    ui(<JourneyCompleted childId="c1" journeyId="j1" onDismiss={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('play.loading')).toBeInTheDocument())
    expect(screen.queryByTestId('journey-completed')).not.toBeInTheDocument()
  })

  // getCollection 失败时原本静默留下空勋章名，永久降级
  it('收藏取不到 → 仍给出满级文案与收藏墙入口，不是空白', async () => {
    getCollection.mockRejectedValue(new Error('boom'))
    ui(<JourneyCompleted childId="c1" journeyId="j1" onDismiss={vi.fn()} />)
    await waitFor(() => expect(screen.getByTestId('journey-completed')).toBeInTheDocument())
    expect(screen.getByText('play.completedBody')).toBeInTheDocument()
    expect(screen.getByTestId('completed-see-collection')).toHaveAttribute('href', '/play/c1/collection')
  })
})
