import { describe, it, expect } from 'vitest'
import { currentForm, growthRatio } from './petStage'
import type { PetSpeciesDto, JourneyDto } from '@/types/homework'

const species = {
  id: 'p1', name: '火龙', code: 'dragon', isActive: true, displayOrder: 0,
  forms: [
    { level: 1, name: '龙蛋', growthToNext: 36, scale: 0.48 },
    { level: 2, name: '破壳萌龙', growthToNext: 60, scale: 0.72 },
    { level: 5, name: '喷火成龙', growthToNext: null, scale: 1.62 },
  ],
} as unknown as PetSpeciesDto

describe('petStage', () => {
  it('currentForm returns the matching level form', () => {
    expect(currentForm(species, 2)?.name).toBe('破壳萌龙')
    expect(currentForm(species, 9)).toBeUndefined()
  })
  it('growthRatio clamps to 0..1 and returns 1 when no threshold', () => {
    expect(growthRatio({ growthPoints: 18 } as JourneyDto, { growthToNext: 36 } as never)).toBeCloseTo(0.5)
    expect(growthRatio({ growthPoints: 100 } as JourneyDto, { growthToNext: 36 } as never)).toBe(1)
    expect(growthRatio({ growthPoints: 10 } as JourneyDto, { growthToNext: null } as never)).toBe(1)
  })
})
