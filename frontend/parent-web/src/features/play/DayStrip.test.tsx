import { render, screen, fireEvent } from '@testing-library/react'
import { it, expect, vi } from 'vitest'
import { DayStrip } from './DayStrip'
import type { WeekDayDto } from '@/types/homework'

const days: WeekDayDto[] = [
  { date: '2026-07-13', isRestDay: false, tasksTotal: 2, tasksCompleted: 2, isFull: true },  // 过去·已攻克
  { date: '2026-07-15', isRestDay: false, tasksTotal: 3, tasksCompleted: 1, isFull: false }, // 今天·进行中
  { date: '2026-07-17', isRestDay: false, tasksTotal: 3, tasksCompleted: 0, isFull: false }, // 未来·待战
]
const TODAY = '2026-07-15'

it('渲染每天一个按钮,选中日带 is-selected', () => {
  render(<DayStrip days={days} today={TODAY} selectedDate={TODAY} onSelectDate={() => {}} />)
  expect(screen.getByTestId('day-chip-2026-07-13')).toBeInTheDocument()
  expect(screen.getByTestId('day-chip-2026-07-15').className).toContain('is-selected')
})

it('未来日按钮 disabled,点了不触发 onSelectDate', () => {
  const onSelect = vi.fn()
  render(<DayStrip days={days} today={TODAY} selectedDate={TODAY} onSelectDate={onSelect} />)
  const future = screen.getByTestId('day-chip-2026-07-17')
  expect(future).toBeDisabled()
  fireEvent.click(future)
  expect(onSelect).not.toHaveBeenCalled()
})

it('点过去日触发 onSelectDate(补做入口)', () => {
  const onSelect = vi.fn()
  render(<DayStrip days={days} today={TODAY} selectedDate={TODAY} onSelectDate={onSelect} />)
  fireEvent.click(screen.getByTestId('day-chip-2026-07-13'))
  expect(onSelect).toHaveBeenCalledWith('2026-07-13')
})
