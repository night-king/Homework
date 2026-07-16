import type { WeekDayDto } from '@/types/homework'

export type DayTone = 'rest' | 'complete' | 'active' | 'pending' | 'future' | 'locked'

/**
 * 移植自原型 getDayStatusMeta（child-homepage.html:4328–4346）。
 * 用 date 与 today 的比较代替原型的 index<todayIndex；labelKey 交 i18n。
 */
export function dayStatus(day: WeekDayDto, today: string): { tone: DayTone; labelKey: string } {
  if (day.isRestDay) return { tone: 'rest', labelKey: 'play.dayRest' }

  const done = day.tasksCompleted
  const total = day.tasksTotal

  if (day.date === today) {
    if (day.isFull) return { tone: 'complete', labelKey: 'play.dayDone' }
    return done > 0
      ? { tone: 'active', labelKey: 'play.dayActive' }
      : { tone: 'pending', labelKey: 'play.dayPending' }
  }

  if (done === 0) {
    return day.date < today
      ? { tone: 'locked', labelKey: 'play.dayLocked' }
      : { tone: 'future', labelKey: 'play.dayFuture' }
  }
  if (done === total) return { tone: 'complete', labelKey: 'play.dayConquered' }
  return { tone: 'active', labelKey: 'play.dayActive' }
}
