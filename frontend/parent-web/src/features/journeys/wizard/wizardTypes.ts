import type { DayOfWeek, CreateJourneyTaskTemplateItemDto, JourneyTaskTemplateItemDto } from '@/types/homework'

export type RewardMode = 'random' | 'specific'

export interface WizardTaskDraft {
  key: string          // 稳定的客户端渲染 key
  id?: string          // 服务端模板项 id(编辑态才有;新任务为 undefined)
  dayOfWeek: DayOfWeek
  title: string
  subject: string
  estimatedMinutes: number | null
  order: number
  rewardMode: RewardMode
  rewardItemId: string | null
}

export interface WizardState {
  childId: string
  title: string
  description: string
  startDate: string    // YYYY-MM-DD
  endDate: string      // YYYY-MM-DD
  medalId: string
  tasks: WizardTaskDraft[]
}

export function emptyWizardState(childId: string): WizardState {
  return { childId, title: '', description: '', startDate: '', endDate: '', medalId: '', tasks: [] }
}

export function newTaskDraft(dayOfWeek: DayOfWeek, order: number): WizardTaskDraft {
  return {
    key: `t-${dayOfWeek}-${order}-${Math.random().toString(36).slice(2, 8)}`,
    dayOfWeek, title: '', subject: '', estimatedMinutes: null, order,
    rewardMode: 'random', rewardItemId: null,
  }
}

export function draftFromTemplate(t: JourneyTaskTemplateItemDto): WizardTaskDraft {
  return {
    key: t.id,
    id: t.id,
    dayOfWeek: t.dayOfWeek,
    title: t.title,
    subject: t.subject ?? '',
    estimatedMinutes: t.estimatedMinutes ?? null,
    order: t.order,
    rewardMode: t.rewardIsRandom ? 'random' : 'specific',
    rewardItemId: t.rewardItemId ?? null,
  }
}

export function toCreateTemplateDto(journeyId: string, t: WizardTaskDraft): CreateJourneyTaskTemplateItemDto {
  return {
    journeyId,
    dayOfWeek: t.dayOfWeek,
    title: t.title.trim(),
    subject: t.subject.trim() || null,
    order: t.order,
    estimatedMinutes: t.estimatedMinutes,
    rewardItemId: t.rewardMode === 'specific' ? t.rewardItemId : null,
    rewardIsRandom: t.rewardMode === 'random',
  }
}

export function validateBasics(s: WizardState): string | null {
  if (!s.title.trim()) return 'title'
  if (!s.startDate || !s.endDate) return 'dates'
  if (s.endDate < s.startDate) return 'dateOrder'
  return null
}

export function validateTasks(s: WizardState): string | null {
  for (const t of s.tasks) {
    if (!t.title.trim()) return 'taskTitle'
    if (t.rewardMode === 'specific' && !t.rewardItemId) return 'taskReward'
  }
  return null
}

export function validateMedal(s: WizardState): string | null {
  return s.medalId ? null : 'medal'
}
