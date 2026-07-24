import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listActiveRewardItems: vi.fn().mockResolvedValue([]),
  listActiveMedals: vi.fn().mockResolvedValue([{ id: 'm1', name: '毕业勋章', isActive: true, displayOrder: 0 }]),
  listActivePetSpecies: vi.fn().mockResolvedValue([]),
}))
import { JourneyWizard } from './JourneyWizard'
import { emptyWizardState } from './wizardTypes'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('JourneyWizard', () => {
  it('blocks Next on basics until title + valid dates are set', async () => {
    const onSubmit = vi.fn()
    ui(<JourneyWizard initialState={emptyWizardState()} submitLabelKey="wizard.publish"
      onSubmit={onSubmit} onDone={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByTestId('wiz-next'))
    // 仍在第 1 步(基本信息):title 输入仍在
    expect(screen.getByTestId('wiz-title')).toBeInTheDocument()
  })

  it('walks all steps and submits, then calls onDone', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ sharedJourneyId: 'j1', failedTasks: 0 })
    const onDone = vi.fn()
    ui(<JourneyWizard initialState={emptyWizardState()} submitLabelKey="wizard.publish"
      onSubmit={onSubmit} onDone={onDone} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByTestId('wiz-title'), { target: { value: '暑假之旅' } })
    fireEvent.change(screen.getByTestId('wiz-start'), { target: { value: '2026-07-01' } })
    fireEvent.change(screen.getByTestId('wiz-end'), { target: { value: '2026-08-31' } })
    fireEvent.click(screen.getByTestId('wiz-next')) // → tasks
    fireEvent.click(screen.getByTestId('wiz-next')) // → medal
    await waitFor(() => expect(screen.getByTestId('medal-m1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('medal-m1'))
    fireEvent.click(screen.getByTestId('wiz-next')) // → review
    fireEvent.click(screen.getByTestId('wiz-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ sharedJourneyId: 'j1', failedTasks: 0 }))
    const submitted = onSubmit.mock.calls[0][0]
    expect(submitted.title).toBe('暑假之旅')
    expect(submitted.medalId).toBe('m1')
  })
})
