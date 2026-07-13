import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllPetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', isActive: false, displayOrder: 0, coverUrl: null,
      forms: [{ level: 1, name: '龙蛋', spriteUrl: 'u' }, { level: 2, name: '幼龙', spriteUrl: null }] },
  ]),
  createPetSpecies: vi.fn(), updatePetSpecies: vi.fn(), deletePetSpecies: vi.fn(),
  setPetForm: vi.fn(), uploadPetCover: vi.fn(), uploadPetFormSprite: vi.fn(), uploadPetFormEvolveVideo: vi.fn(),
  activatePetSpecies: vi.fn(), deactivatePetSpecies: vi.fn(),
}))
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { PetSpeciesPanel } from './PetSpeciesPanel'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><ConfirmProvider>{node}</ConfirmProvider></MemoryRouter></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('PetSpeciesPanel', () => {
  it('lists species with sprite completeness and opens create dialog', async () => {
    ui(<PetSpeciesPanel />)
    await waitFor(() => expect(screen.getByText('火龙')).toBeInTheDocument())
    expect(screen.getByTestId('pet-completeness-p1')).toHaveTextContent('1/5')
    fireEvent.click(screen.getByTestId('pet-create'))
    expect(screen.getByTestId('pet-name-input')).toBeInTheDocument()
  })
})
