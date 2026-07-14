import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ConfirmProvider } from '@/components/ConfirmDialog'

vi.mock('@/services/homeworkService', () => ({
  listChildren: vi.fn().mockResolvedValue([{ id: 'c1', displayName: '哥哥', grade: 3, hasPin: false }]),
  createChild: vi.fn(), updateChild: vi.fn(), deleteChild: vi.fn(), setChildPin: vi.fn(),
}))
import { ChildrenPage } from './ChildrenPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/children']}>
        <ConfirmProvider>
          <Routes>
            <Route path="/children" element={node} />
            <Route path="/play/:childId" element={<div>playground</div>} />
          </Routes>
        </ConfirmProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('ChildrenPage 进入乐园', () => {
  it('per-child button navigates to /play/:childId', async () => {
    ui(<ChildrenPage />)
    await waitFor(() => expect(screen.getByText('哥哥')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('enter-play-c1'))
    expect(screen.getByText('playground')).toBeInTheDocument()
  })
})
