import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const startJourney = vi.fn().mockResolvedValue({ id: 'j1' })
vi.mock('@/services/playService', () => ({ startJourney: (...a: unknown[]) => startJourney(...a) }))
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', coverUrl: 'http://x/d.png', forms: [] },
    { id: 'p2', name: '光之英雄', code: 'hero', coverUrl: null, forms: [] },
  ]),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { PickPet } from './PickPet'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('PickPet', () => {
  it('picks a species and starts the journey', async () => {
    ui(<PickPet childId="c1" journey={{ id: 'j1', childId: 'c1', status: 0 } as never} />)
    await waitFor(() => expect(screen.getByText('火龙')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('pick-pet-p1'))
    await waitFor(() =>
      expect(startJourney).toHaveBeenCalledWith({ childId: 'c1', journeyId: 'j1', petSpeciesId: 'p1' }),
    )
  })
})
