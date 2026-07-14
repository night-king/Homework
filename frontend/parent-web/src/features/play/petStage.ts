import type { PetSpeciesDto, PetFormDto, JourneyDto } from '@/types/homework'

export function currentForm(species: PetSpeciesDto | undefined, level: number): PetFormDto | undefined {
  return species?.forms.find((f) => f.level === level)
}

export function growthRatio(journey: Pick<JourneyDto, 'growthPoints'>, form: Pick<PetFormDto, 'growthToNext'> | undefined): number {
  const threshold = form?.growthToNext
  if (!threshold || threshold <= 0) return 1
  return Math.max(0, Math.min(1, journey.growthPoints / threshold))
}
