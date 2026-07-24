import { describe, it, expect } from 'vitest'
import {
  emptyWizardState, newTaskDraft, toCreateTemplateDto, draftFromTemplate,
  validateBasics, validateTasks, validateMedal,
} from './wizardTypes'

describe('wizardTypes', () => {
  it('emptyWizardState starts with empty fields', () => {
    const s = emptyWizardState()
    expect(s.tasks).toEqual([])
    expect(s.medalId).toBe('')
    expect(s.title).toBe('')
  })

  it('validateBasics: title + date presence + order', () => {
    const base = emptyWizardState()
    expect(validateBasics(base)).toBe('title')
    expect(validateBasics({ ...base, title: 'x' })).toBe('dates')
    expect(validateBasics({ ...base, title: 'x', startDate: '2026-08-01', endDate: '2026-07-01' })).toBe('dateOrder')
    expect(validateBasics({ ...base, title: 'x', startDate: '2026-07-01', endDate: '2026-08-01' })).toBeNull()
  })

  it('validateMedal requires a medalId', () => {
    expect(validateMedal(emptyWizardState())).toBe('medal')
    expect(validateMedal({ ...emptyWizardState(), medalId: 'm1' })).toBeNull()
  })

  it('validateTasks: every task needs a title, specific reward needs an item', () => {
    const s = emptyWizardState()
    const t = newTaskDraft(1, 0)
    expect(validateTasks({ ...s, tasks: [{ ...t, title: '' }] })).toBe('taskTitle')
    expect(validateTasks({ ...s, tasks: [{ ...t, title: '背单词', rewardMode: 'specific', rewardItemId: null }] })).toBe('taskReward')
    expect(validateTasks({ ...s, tasks: [{ ...t, title: '背单词' }] })).toBeNull()
  })

  it('toCreateTemplateDto maps random vs specific reward and trims', () => {
    const t = { ...newTaskDraft(2, 3), title: ' 读书 ', subject: ' 语文 ', estimatedMinutes: 20, rewardMode: 'random' as const, rewardItemId: null }
    expect(toCreateTemplateDto('j1', t)).toEqual({
      sharedJourneyId: 'j1', dayOfWeek: 2, title: '读书', subject: '语文', order: 3,
      estimatedMinutes: 20, rewardItemId: null, rewardIsRandom: true,
    })
    const spec = { ...t, rewardMode: 'specific' as const, rewardItemId: 'r1' }
    expect(toCreateTemplateDto('j1', spec)).toMatchObject({ rewardItemId: 'r1', rewardIsRandom: false })
  })

  it('draftFromTemplate round-trips a server template item', () => {
    const d = draftFromTemplate({
      id: 'tt1', sharedJourneyId: 'j1', dayOfWeek: 4, title: '练字', subject: null,
      order: 1, estimatedMinutes: null, isActive: true, rewardItemId: 'r9', rewardIsRandom: false,
    })
    expect(d.id).toBe('tt1')
    expect(d.rewardMode).toBe('specific')
    expect(d.rewardItemId).toBe('r9')
    expect(d.subject).toBe('')
  })
})
