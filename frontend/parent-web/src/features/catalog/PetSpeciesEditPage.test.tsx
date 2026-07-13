import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  getPetSpecies: vi.fn(), updatePetSpecies: vi.fn(), deletePetSpecies: vi.fn(),
  setPetForm: vi.fn(), uploadPetCover: vi.fn(), uploadPetFormSprite: vi.fn(), uploadPetFormEvolveVideo: vi.fn(),
  activatePetSpecies: vi.fn(), deactivatePetSpecies: vi.fn(), listAllPetSpecies: vi.fn().mockResolvedValue([]),
}))
import { getPetSpecies } from '@/services/homeworkService'
import { PetSpeciesEditPage } from './PetSpeciesEditPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/catalog/pets/p1']}>
        <Routes><Route path="/catalog/pets/:id" element={node} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>
beforeEach(() => vi.clearAllMocks())

describe('PetSpeciesEditPage', () => {
  it('prefills base info and disables activate when incomplete', async () => {
    mock(getPetSpecies).mockResolvedValue({
      id: 'p1', name: '火龙', code: 'dragon', accentColor: null, description: '', isActive: false, displayOrder: 0, coverUrl: null,
      forms: [{ level: 1, name: '龙蛋', spriteUrl: 'u', revealText: null, growthToNext: null, evolveVideoUrl: null, scale: null }],
    })
    ui(<PetSpeciesEditPage />)
    await waitFor(() => expect(screen.getByTestId('pet-base-name')).toHaveValue('火龙'))
    expect(screen.getByTestId('pet-activate')).toBeDisabled() // cover missing + only 1/5 sprites
    expect(screen.getByTestId('pet-completeness')).toHaveTextContent('1/5')
  })
})
