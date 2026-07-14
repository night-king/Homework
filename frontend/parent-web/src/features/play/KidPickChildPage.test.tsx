import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listChildren: vi.fn().mockResolvedValue([
    { id: 'c1', displayName: '哥哥', grade: 3, hasPin: false, avatarKey: '🦁' },
    { id: 'c2', displayName: '弟弟', grade: 1, hasPin: false },
  ]),
}))
import { KidPickChildPage } from './KidPickChildPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/play']}>
        <Routes>
          <Route path="/play" element={node} />
          <Route path="/play/:childId" element={<div>playground</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('KidPickChildPage', () => {
  it('lists children and enters playground on pick', async () => {
    ui(<KidPickChildPage />)
    await waitFor(() => expect(screen.getByText('哥哥')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('pick-child-c2'))
    expect(screen.getByText('playground')).toBeInTheDocument()
  })
})
