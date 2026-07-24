import {
  createSharedJourney, updateSharedJourney, createJourneyTemplate, updateJourneyTemplate,
  deleteJourneyTemplate, listJourneyTemplates,
} from '@/services/homeworkService'
import type { WizardState, WizardTaskDraft } from './wizardTypes'
import { toCreateTemplateDto } from './wizardTypes'

export interface PublishResult {
  sharedJourneyId: string
  failedTasks: number
}

function updateDtoFrom(t: WizardTaskDraft) {
  return {
    title: t.title.trim(),
    subject: t.subject.trim() || null,
    order: t.order,
    estimatedMinutes: t.estimatedMinutes,
    isActive: true,
    rewardItemId: t.rewardMode === 'specific' ? t.rewardItemId : null,
    rewardIsRandom: t.rewardMode === 'random',
  }
}

export async function publishNewJourney(state: WizardState): Promise<PublishResult> {
  const sharedJourney = await createSharedJourney({
    title: state.title.trim(),
    description: state.description.trim() || null,
    startDate: state.startDate,
    endDate: state.endDate,
    medalId: state.medalId,
  })

  let failedTasks = 0
  for (const t of state.tasks) {
    try {
      await createJourneyTemplate(toCreateTemplateDto(sharedJourney.id, t))
    } catch {
      failedTasks++
    }
  }
  return { sharedJourneyId: sharedJourney.id, failedTasks }
}

export async function saveJourneyEdits(sharedJourneyId: string, state: WizardState): Promise<PublishResult> {
  await updateSharedJourney(sharedJourneyId, {
    title: state.title.trim(),
    description: state.description.trim() || null,
    startDate: state.startDate,
    endDate: state.endDate,
    medalId: state.medalId,
  })

  const existing = await listJourneyTemplates({ sharedJourneyId })
  const keptIds = new Set(state.tasks.filter((t) => t.id).map((t) => t.id as string))

  let failedTasks = 0
  for (const e of existing) {
    if (!keptIds.has(e.id)) {
      try {
        await deleteJourneyTemplate(e.id)
      } catch {
        failedTasks++
      }
    }
  }
  for (const t of state.tasks) {
    try {
      if (t.id) {
        await updateJourneyTemplate(t.id, updateDtoFrom(t))
      } else {
        await createJourneyTemplate(toCreateTemplateDto(sharedJourneyId, t))
      }
    } catch {
      failedTasks++
    }
  }
  return { sharedJourneyId, failedTasks }
}
