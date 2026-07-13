import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactNode } from 'react'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn() } }))
vi.mock('./wizard/JourneyWizard', () => ({
  JourneyWizard: ({ onDone }: { onDone: (r: { journeyId: string; failedTasks: number }) => void }) => (
    <div>
      <button data-testid="finish-success" onClick={() => onDone({ journeyId: 'j1', failedTasks: 0 })}>ok</button>
      <button data-testid="finish-partial" onClick={() => onDone({ journeyId: 'j1', failedTasks: 2 })}>partial</button>
    </div>
  ),
}))
import { toast } from 'sonner'
import { JourneyNewPage } from './JourneyNewPage'

function ui(node: ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/journeys/new?childId=c1']}>
      <Routes>
        <Route path="/journeys/new" element={node} />
        <Route path="/journeys" element={<div>journeys-list</div>} />
        <Route path="/journeys/:id/edit" element={<div>journey-edit</div>} />
      </Routes>
    </MemoryRouter>,
  )
}
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>
beforeEach(() => vi.clearAllMocks())

describe('JourneyNewPage onDone routing', () => {
  it('full success → toast.success + navigate to /journeys', () => {
    ui(<JourneyNewPage />)
    fireEvent.click(screen.getByTestId('finish-success'))
    expect(screen.getByText('journeys-list')).toBeInTheDocument()
    expect(mock(toast.success)).toHaveBeenCalled()
  })
  it('partial failure → toast.warning + navigate to /journeys/:id/edit', () => {
    ui(<JourneyNewPage />)
    fireEvent.click(screen.getByTestId('finish-partial'))
    expect(screen.getByText('journey-edit')).toBeInTheDocument()
    expect(mock(toast.warning)).toHaveBeenCalled()
  })
})
