import { render, screen, fireEvent } from '@testing-library/react'
import { it, expect, vi } from 'vitest'
import { TaskCard } from './TaskCard'
import type { DailyTaskDto } from '@/types/homework'

const base: DailyTaskDto = {
  id: 't1', childId: 'c1', date: '2026-07-15', title: '数学作业本', subject: 'math',
  order: 0, isCompleted: false, reviewState: 0, countsAsCompleted: false, journeyId: 'j1',
  rewardGranted: false, rewardName: '冲锋饭团', estimatedMinutes: 25,
}

it('显示学科标签/时长/奖励名/去完成', () => {
  render(<TaskCard task={base} disabled={false} onToggle={() => {}} />)
  expect(screen.getByText('数学作业本')).toBeInTheDocument()
  expect(screen.getByText(/25/)).toBeInTheDocument()          // 时长 chip
  expect(screen.getByText(/冲锋饭团/)).toBeInTheDocument()      // 奖励名
  expect(screen.getByTestId('task-toggle-t1')).toHaveTextContent('play.goComplete')
})

it('时长为 null 时不显示时长 chip', () => {
  render(<TaskCard task={{ ...base, estimatedMinutes: null }} disabled={false} onToggle={() => {}} />)
  expect(screen.queryByText(/分钟|min/i)).toBeNull()
})

it('奖励名为 null 时不显示奖励行', () => {
  const { container } = render(<TaskCard task={{ ...base, rewardName: null }} disabled={false} onToggle={() => {}} />)
  expect(container.querySelector('.kid-task-reward')).toBeNull()
})

it('已完成显示已攻克,点击回调带 done=true', () => {
  const onToggle = vi.fn()
  render(<TaskCard task={{ ...base, countsAsCompleted: true }} disabled={false} onToggle={onToggle} />)
  expect(screen.getByTestId('task-toggle-t1')).toHaveTextContent('play.done')
  fireEvent.click(screen.getByTestId('task-toggle-t1'))
  expect(onToggle).toHaveBeenCalledWith('t1', true)
})

it('disabled 时按钮禁用', () => {
  render(<TaskCard task={base} disabled onToggle={() => {}} />)
  expect(screen.getByTestId('task-toggle-t1')).toBeDisabled()
})
