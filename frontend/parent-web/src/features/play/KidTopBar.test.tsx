import { render, screen } from '@testing-library/react'
import { it, expect } from 'vitest'
import { KidTopBar } from './KidTopBar'
import type { WeekStripDto, DailyBoardDto } from '@/types/homework'

const weekStrip: WeekStripDto = {
  streak: 4,
  days: [{ date: '2026-07-15', isRestDay: false, tasksTotal: 3, tasksCompleted: 1, isFull: false }],
}
const board: DailyBoardDto = {
  childId: 'c1', date: '2026-07-15', tasks: [], tasksTotal: 4, tasksCompleted: 2,
  stars: 3, isFull: false, isRestDay: false,
}

it('三个 stat-pill 显示星星/连续/进度', () => {
  render(<KidTopBar weekStrip={weekStrip} board={board}
    today="2026-07-15" selectedDate="2026-07-15" onSelectDate={() => {}} />)
  expect(screen.getByTestId('topbar-stars')).toHaveTextContent('3')
  expect(screen.getByTestId('topbar-streak')).toHaveTextContent('4')
  expect(screen.getByTestId('topbar-progress')).toHaveTextContent('2/4')
})

it('缺数据时 pill 退化为 0/破折号,不崩', () => {
  render(<KidTopBar today="2026-07-15" selectedDate="2026-07-15" onSelectDate={() => {}} />)
  expect(screen.getByTestId('topbar-streak')).toHaveTextContent('0')
})
