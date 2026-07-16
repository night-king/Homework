import { render, screen, fireEvent, within } from '@testing-library/react'
import { it, expect, vi } from 'vitest'
import { PetCodex } from './PetCodex'
import type { PetSpeciesDto } from '@/types/homework'

const species: PetSpeciesDto = {
  id: 'p1', name: '火龙', code: 'dragon', isActive: true, displayOrder: 0,
  forms: [
    { level: 1, name: '龙蛋', spriteUrl: 'http://x/1.png', growthToNext: 36 },
    { level: 2, name: '破壳萌龙', spriteUrl: 'http://x/2.png', revealText: '第一次睁眼', growthToNext: 80 },
    { level: 3, name: '少年龙', spriteUrl: 'http://x/3.png', growthToNext: 140 },
    { level: 4, name: '烈焰龙', spriteUrl: 'http://x/4.png', growthToNext: 220 },
    { level: 5, name: '龙王', spriteUrl: 'http://x/5.png', revealText: '首次喷火' },
  ],
}

it('渲染五阶卡', () => {
  render(<PetCodex species={species} currentLevel={2} onClose={() => {}} />)
  for (const lvl of [1, 2, 3, 4, 5]) {
    expect(screen.getByTestId(`codex-stage-${lvl}`)).toBeInTheDocument()
  }
})

it('已达成阶显真身(名+精灵图),当前阶带 is-current', () => {
  render(<PetCodex species={species} currentLevel={2} onClose={() => {}} />)
  const cur = screen.getByTestId('codex-stage-2')
  // 当前形态名在阶卡与摘要卡都会出现,用 within 限定在卡内断言(避免 getByText 多匹配报错)
  expect(within(cur).getByText('破壳萌龙')).toBeInTheDocument()
  expect(cur.className).toContain('is-current')
  const past = screen.getByTestId('codex-stage-1')
  expect(within(past).getByText('龙蛋')).toBeInTheDocument()           // 已解锁阶名
  expect(past.className).toContain('is-unlocked')
})

it('未达成阶显未揭示态(无真名,带 is-locked)', () => {
  render(<PetCodex species={species} currentLevel={2} onClose={() => {}} />)
  const locked = screen.getByTestId('codex-stage-4')
  expect(locked.className).toContain('is-locked')
  expect(locked.textContent).not.toContain('烈焰龙')   // 真名藏起来
  // 3/4/5 阶都不该出现真名
  expect(screen.queryByText('烈焰龙')).toBeNull()
  expect(screen.queryByText('龙王')).toBeNull()
})

it('关闭按钮触发 onClose', () => {
  const onClose = vi.fn()
  render(<PetCodex species={species} currentLevel={2} onClose={onClose} />)
  fireEvent.click(screen.getByTestId('codex-close'))
  expect(onClose).toHaveBeenCalled()
})

it('species 未加载时不崩(空态)', () => {
  render(<PetCodex species={undefined} currentLevel={1} onClose={() => {}} />)
  expect(screen.getByTestId('pet-codex')).toBeInTheDocument()
})
