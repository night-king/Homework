import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PetStage } from './PetStage.tsx'
import type { PetFormDto } from '@/types/homework'

const form: PetFormDto = { level: 2, name: '幼龙', spriteUrl: 'http://x/s.png', growthToNext: 40, scale: 1.1 }

describe('PetStage', () => {
  it('有精灵图 → img,带等级横幅与形态名', () => {
    render(<PetStage form={form} level={2} />)
    const sprite = screen.getByTestId('pet-sprite')
    expect(sprite.tagName).toBe('IMG')
    expect(screen.getByText('LV 2')).toBeInTheDocument()
    expect(screen.getByText('幼龙')).toBeInTheDocument()
  })

  it('无精灵图 → 蛋兜底', () => {
    render(<PetStage form={undefined} level={1} />)
    const sprite = screen.getByTestId('pet-sprite')
    expect(sprite.tagName).not.toBe('IMG')
    expect(sprite).toHaveTextContent('🥚')
  })
})
