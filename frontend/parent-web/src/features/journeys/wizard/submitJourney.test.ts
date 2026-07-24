import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/homeworkService', () => ({
  createSharedJourney: vi.fn(),
  updateSharedJourney: vi.fn(),
  createJourneyTemplate: vi.fn(),
  updateJourneyTemplate: vi.fn(),
  deleteJourneyTemplate: vi.fn(),
  listJourneyTemplates: vi.fn(),
}))
import {
  createSharedJourney, updateSharedJourney, createJourneyTemplate, updateJourneyTemplate,
  deleteJourneyTemplate, listJourneyTemplates,
} from '@/services/homeworkService'
import { publishNewJourney, saveJourneyEdits } from './submitJourney'
import { emptyWizardState, newTaskDraft } from './wizardTypes'

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>
beforeEach(() => vi.clearAllMocks())

describe('publishNewJourney', () => {
  it('creates the shared journey then one template per task', async () => {
    mock(createSharedJourney).mockResolvedValue({ id: 'j1' })
    mock(createJourneyTemplate).mockResolvedValue({ id: 'tt' })
    const state = { ...emptyWizardState(), title: '暑假', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1',
      tasks: [{ ...newTaskDraft(1, 0), title: 'A' }, { ...newTaskDraft(2, 0), title: 'B' }] }
    const res = await publishNewJourney(state)
    expect(res).toEqual({ sharedJourneyId: 'j1', failedTasks: 0 })
    expect(createSharedJourney).toHaveBeenCalledWith({ title: '暑假', description: null, startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1' })
    expect(createJourneyTemplate).toHaveBeenCalledTimes(2)
  })

  it('counts template failures without aborting, still returns sharedJourneyId', async () => {
    mock(createSharedJourney).mockResolvedValue({ id: 'j1' })
    mock(createJourneyTemplate).mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ id: 'tt' })
    const state = { ...emptyWizardState(), title: 'x', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1',
      tasks: [{ ...newTaskDraft(1, 0), title: 'A' }, { ...newTaskDraft(2, 0), title: 'B' }] }
    const res = await publishNewJourney(state)
    expect(res.sharedJourneyId).toBe('j1')
    expect(res.failedTasks).toBe(1)
  })

  it('propagates when shared-journey creation fails (no templates attempted)', async () => {
    mock(createSharedJourney).mockRejectedValue(new Error('nope'))
    const state = { ...emptyWizardState(), title: 'x', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1', tasks: [{ ...newTaskDraft(1, 0), title: 'A' }] }
    await expect(publishNewJourney(state)).rejects.toThrow('nope')
    expect(createJourneyTemplate).not.toHaveBeenCalled()
  })
})

describe('saveJourneyEdits', () => {
  it('updates shared journey, deletes removed, updates existing, creates new', async () => {
    mock(updateSharedJourney).mockResolvedValue({ id: 'j1' })
    mock(listJourneyTemplates).mockResolvedValue([
      { id: 'keep', sharedJourneyId: 'j1', dayOfWeek: 1, title: '旧', subject: null, order: 0, estimatedMinutes: null, isActive: true, rewardItemId: null, rewardIsRandom: true },
      { id: 'drop', sharedJourneyId: 'j1', dayOfWeek: 2, title: '删', subject: null, order: 0, estimatedMinutes: null, isActive: true, rewardItemId: null, rewardIsRandom: true },
    ])
    mock(updateJourneyTemplate).mockResolvedValue({ id: 'keep' })
    mock(deleteJourneyTemplate).mockResolvedValue(undefined)
    mock(createJourneyTemplate).mockResolvedValue({ id: 'new' })

    const state = { ...emptyWizardState(), title: 'T', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1', tasks: [
      { ...newTaskDraft(1, 0), id: 'keep', key: 'keep', title: '改后' },
      { ...newTaskDraft(3, 0), title: '新任务' },
    ] }
    const res = await saveJourneyEdits('j1', state)
    expect(res.failedTasks).toBe(0)
    expect(listJourneyTemplates).toHaveBeenCalledWith({ sharedJourneyId: 'j1' })
    expect(deleteJourneyTemplate).toHaveBeenCalledWith('drop')
    expect(updateJourneyTemplate).toHaveBeenCalledWith('keep', expect.objectContaining({ title: '改后', isActive: true }))
    expect(createJourneyTemplate).toHaveBeenCalledTimes(1)
  })
})
