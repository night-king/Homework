import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepTasks } from './StepTasks'
import { emptyWizardState, newTaskDraft } from './wizardTypes'
import type { WizardTaskDraft } from './wizardTypes'

const rewards = [
  { id: 'r1', name: '书签', glyph: '✦', growthValue: 12, randomWeight: 1, isActive: true, displayOrder: 0 },
]

describe('StepTasks', () => {
  it('adds a task to Monday', () => {
    const setTasks = vi.fn()
    render(<StepTasks state={emptyWizardState()} setTasks={setTasks} rewardItems={rewards} />)
    fireEvent.click(screen.getByTestId('add-task-1'))
    const added = setTasks.mock.calls[0][0] as WizardTaskDraft[]
    expect(added).toHaveLength(1)
    expect(added[0].dayOfWeek).toBe(1)
  })

  it('edits a task title', () => {
    const setTasks = vi.fn()
    const task = { ...newTaskDraft(1, 0), key: 'k1' }
    render(<StepTasks state={{ ...emptyWizardState(), tasks: [task] }} setTasks={setTasks} rewardItems={rewards} />)
    fireEvent.change(screen.getByTestId('task-title-k1'), { target: { value: '背单词' } })
    const next = setTasks.mock.calls[0][0] as WizardTaskDraft[]
    expect(next[0].title).toBe('背单词')
  })

  it('switches reward to specific and picks an item', () => {
    const setTasks = vi.fn()
    const task = { ...newTaskDraft(1, 0), key: 'k1' }
    render(<StepTasks state={{ ...emptyWizardState(), tasks: [task] }} setTasks={setTasks} rewardItems={rewards} />)
    fireEvent.click(screen.getByTestId('reward-specific-k1'))
    expect((setTasks.mock.calls[0][0] as WizardTaskDraft[])[0].rewardMode).toBe('specific')
  })

  it('removes a task', () => {
    const setTasks = vi.fn()
    const task = { ...newTaskDraft(1, 0), key: 'k1' }
    render(<StepTasks state={{ ...emptyWizardState(), tasks: [task] }} setTasks={setTasks} rewardItems={rewards} />)
    fireEvent.click(screen.getByTestId('remove-task-k1'))
    expect(setTasks.mock.calls[0][0]).toEqual([])
  })

  it('picks a specific reward item and sets rewardItemId', () => {
    const setTasks = vi.fn()
    const task = { ...newTaskDraft(1, 0), key: 'k1', rewardMode: 'specific' as const }
    render(<StepTasks state={{ ...emptyWizardState(), tasks: [task] }} setTasks={setTasks} rewardItems={rewards} />)
    fireEvent.click(screen.getByTestId('reward-item-k1-r1'))
    expect((setTasks.mock.calls[0][0] as WizardTaskDraft[])[0].rewardItemId).toBe('r1')
  })
})
