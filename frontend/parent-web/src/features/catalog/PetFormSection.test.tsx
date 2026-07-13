import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PetFormSection } from './PetFormSection'
import type { PetSpeciesDto } from '@/types/homework'

const species = {
  id: 'p1', name: '火龙', code: 'dragon', isActive: false, displayOrder: 0, coverUrl: null,
  forms: [{ level: 1, name: '龙蛋', spriteUrl: 'u1', revealText: null, growthToNext: 30, evolveVideoUrl: null, scale: null }],
} as unknown as PetSpeciesDto

describe('PetFormSection', () => {
  it('prefills the form meta and saves via onSaveMeta', () => {
    const onSaveMeta = vi.fn()
    render(<PetFormSection species={species} level={1} onSaveMeta={onSaveMeta} onUploadSprite={vi.fn()} onUploadEvolveVideo={vi.fn()} />)
    expect(screen.getByTestId('form-name-1')).toHaveValue('龙蛋')
    fireEvent.change(screen.getByTestId('form-name-1'), { target: { value: '龙蛋X' } })
    fireEvent.click(screen.getByTestId('form-save-1'))
    expect(onSaveMeta).toHaveBeenCalledWith(expect.objectContaining({ level: 1, name: '龙蛋X' }))
  })
  it('hides evolve-video upload at level 5', () => {
    render(<PetFormSection species={species} level={5} onSaveMeta={vi.fn()} onUploadSprite={vi.fn()} onUploadEvolveVideo={vi.fn()} />)
    expect(screen.queryByTestId('form-evolve-5-btn')).toBeNull()
  })
})
