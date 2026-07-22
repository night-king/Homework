import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { KidChildBadge } from './KidChildBadge'
import type { ChildProfileDto } from '@/types/homework'

const child: ChildProfileDto = { id: 'c1', displayName: '哥哥', grade: 3, avatarKey: '🐯', hasPin: false }

// 直接把列表塞进 query 缓存，useChildren 同步命中，无需桩 service。
function renderBadge(childId: string, children: ChildProfileDto[]) {
  const qc = new QueryClient()
  qc.setQueryData(['children'], children)
  return render(
    <QueryClientProvider client={qc}>
      <KidChildBadge childId={childId} />
    </QueryClientProvider>,
  )
}

describe('KidChildBadge', () => {
  it('命中孩子时显示头像/名字/年级', () => {
    renderBadge('c1', [child])
    expect(screen.getByTestId('kid-child-badge')).toBeInTheDocument()
    expect(screen.getByText('哥哥')).toBeInTheDocument()
    expect(screen.getByText('🐯')).toBeInTheDocument()
    expect(screen.getByTestId('kid-child-badge-grade')).toBeInTheDocument()
  })

  it('缺 avatarKey 时退化为默认 emoji', () => {
    renderBadge('c1', [{ ...child, avatarKey: null }])
    expect(screen.getByText('🐼')).toBeInTheDocument()
  })

  it('找不到孩子时整块不渲染', () => {
    renderBadge('nope', [child])
    expect(screen.queryByTestId('kid-child-badge')).not.toBeInTheDocument()
  })
})
