import { describe, it, expect } from 'vitest'
import { dayStatus } from './dayStatus'
import type { WeekDayDto } from '@/types/homework'

const day = (over: Partial<WeekDayDto>): WeekDayDto => ({
  date: '2026-07-15', isRestDay: false, tasksTotal: 3, tasksCompleted: 0, isFull: false, ...over,
})
const TODAY = '2026-07-15'

describe('dayStatus', () => {
  it('休息日 → rest', () => {
    expect(dayStatus(day({ isRestDay: true, tasksTotal: 0 }), TODAY).tone).toBe('rest')
  })
  it('今天·全做完 → complete', () => {
    expect(dayStatus(day({ tasksCompleted: 3, isFull: true }), TODAY)).toEqual({ tone: 'complete', labelKey: 'play.dayDone' })
  })
  it('今天·做了一部分 → active', () => {
    expect(dayStatus(day({ tasksCompleted: 1 }), TODAY).tone).toBe('active')
  })
  it('今天·一个没做 → pending', () => {
    expect(dayStatus(day({ tasksCompleted: 0 }), TODAY)).toEqual({ tone: 'pending', labelKey: 'play.dayPending' })
  })
  it('过去·一个没做 → locked 未开', () => {
    expect(dayStatus(day({ date: '2026-07-13', tasksCompleted: 0 }), TODAY)).toEqual({ tone: 'locked', labelKey: 'play.dayLocked' })
  })
  it('过去·全做完 → complete 已攻克', () => {
    expect(dayStatus(day({ date: '2026-07-13', tasksCompleted: 3, isFull: true }), TODAY)).toEqual({ tone: 'complete', labelKey: 'play.dayConquered' })
  })
  it('过去·做了一部分 → active', () => {
    expect(dayStatus(day({ date: '2026-07-13', tasksCompleted: 1 }), TODAY).tone).toBe('active')
  })
  it('未来·一个没做 → future 待战', () => {
    expect(dayStatus(day({ date: '2026-07-17', tasksCompleted: 0 }), TODAY)).toEqual({ tone: 'future', labelKey: 'play.dayFuture' })
  })
})
