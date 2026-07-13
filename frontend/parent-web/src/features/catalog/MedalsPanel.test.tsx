import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listAllMedals: vi.fn().mockResolvedValue([{ id: 'm1', name: '暑期毕业勋章', description: '荣誉', isActive: true, displayOrder: 0 }]),
  createMedal: vi.fn(), updateMedal: vi.fn(), deleteMedal: vi.fn(), uploadMedalImage: vi.fn(),
}))
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { MedalsPanel } from './MedalsPanel'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><ConfirmProvider>{node}</ConfirmProvider></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('MedalsPanel', () => {
  it('lists medals and opens the create dialog', async () => {
    ui(<MedalsPanel />)
    await waitFor(() => expect(screen.getByText('暑期毕业勋章')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('medal-create'))
    expect(screen.getByTestId('medal-name-input')).toBeInTheDocument()
  })
})
