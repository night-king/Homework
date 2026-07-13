import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepBasics } from './StepBasics'
import { StepMedal } from './StepMedal'
import { StepReview } from './StepReview'
import { emptyWizardState, newTaskDraft } from './wizardTypes'

describe('StepBasics', () => {
  it('patches title and shows date-order error', () => {
    const patch = vi.fn()
    const state = { ...emptyWizardState('c1'), startDate: '2026-08-01', endDate: '2026-07-01' }
    render(<StepBasics state={state} patch={patch} />)
    fireEvent.change(screen.getByTestId('wiz-title'), { target: { value: '暑假之旅' } })
    expect(patch).toHaveBeenCalledWith({ title: '暑假之旅' })
    expect(screen.getByTestId('wiz-date-error')).toBeInTheDocument()
  })
})

describe('StepMedal', () => {
  it('selects a medal on click', () => {
    const patch = vi.fn()
    const medals = [{ id: 'm1', name: '毕业勋章', isActive: true, displayOrder: 0 }]
    render(<StepMedal state={emptyWizardState('c1')} patch={patch} medals={medals} />)
    fireEvent.click(screen.getByTestId('medal-m1'))
    expect(patch).toHaveBeenCalledWith({ medalId: 'm1' })
  })
  it('shows empty hint when no medals', () => {
    render(<StepMedal state={emptyWizardState('c1')} patch={vi.fn()} medals={[]} />)
    expect(screen.getByTestId('medal-empty')).toBeInTheDocument()
  })
})

describe('StepReview', () => {
  it('summarizes title, medal name and task count', () => {
    const state = { ...emptyWizardState('c1'), title: '暑假', medalId: 'm1', startDate: '2026-07-01', endDate: '2026-08-31',
      tasks: [{ ...newTaskDraft(1, 0), title: '背单词' }] }
    const medals = [{ id: 'm1', name: '毕业勋章', isActive: true, displayOrder: 0 }]
    render(<StepReview state={state} medals={medals} rewardItems={[]} />)
    expect(screen.getByTestId('review-title')).toHaveTextContent('暑假')
    expect(screen.getByTestId('review-medal')).toHaveTextContent('毕业勋章')
    expect(screen.getByTestId('review-task-count')).toHaveTextContent('1')
  })
})
