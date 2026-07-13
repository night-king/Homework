import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllRewardItems: vi.fn().mockResolvedValue([]), listAllMedals: vi.fn().mockResolvedValue([]), listAllPetSpecies: vi.fn().mockResolvedValue([]),
  createRewardItem: vi.fn(), updateRewardItem: vi.fn(), deleteRewardItem: vi.fn(), uploadRewardItemIcon: vi.fn(),
  createMedal: vi.fn(), updateMedal: vi.fn(), deleteMedal: vi.fn(), uploadMedalImage: vi.fn(),
  createPetSpecies: vi.fn(), updatePetSpecies: vi.fn(), deletePetSpecies: vi.fn(), setPetForm: vi.fn(),
  uploadPetCover: vi.fn(), uploadPetFormSprite: vi.fn(), uploadPetFormEvolveVideo: vi.fn(), activatePetSpecies: vi.fn(), deactivatePetSpecies: vi.fn(),
}))
import { useAuthStore } from '@/stores/authStore'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { CatalogPage } from './CatalogPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><ConfirmProvider>{node}</ConfirmProvider></MemoryRouter></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('CatalogPage', () => {
  it('shows only permitted tabs (medals only)', () => {
    useAuthStore.setState({ permissions: { 'Homework.Catalog.Medals': true } })
    ui(<CatalogPage />)
    expect(screen.getByTestId('tab-medals')).toBeInTheDocument()
    expect(screen.queryByTestId('tab-reward-items')).toBeNull()
    expect(screen.queryByTestId('tab-pets')).toBeNull()
  })
  it('redirects when no catalog permission', () => {
    useAuthStore.setState({ permissions: {} })
    ui(<CatalogPage />)
    expect(screen.queryByTestId('tab-medals')).toBeNull()
  })
})
