import { useTranslation } from 'react-i18next'
import { useActivePetSpecies, usePlayMutations } from '@/hooks/usePlay'
import type { JourneyDto } from '@/types/homework'

export function PickPet({ childId, journey }: { childId: string; journey: JourneyDto }) {
  const { t } = useTranslation()
  const species = useActivePetSpecies()
  const { start } = usePlayMutations(childId, journey.id)

  return (
    <div className="kid-pick">
      <h1 className="kid-pick-title">{t('play.pickPetTitle')}</h1>
      <div className="kid-pick-grid">
        {(species.data ?? []).map((s) => (
          <button
            key={s.id}
            type="button"
            data-testid={`pick-pet-${s.id}`}
            className="kid-pick-card"
            disabled={start.isPending}
            onClick={() => start.mutate({ childId, journeyId: journey.id, petSpeciesId: s.id })}
          >
            {s.coverUrl ? (
              <img className="kid-pick-cover" src={s.coverUrl} alt={s.name} />
            ) : (
              <span className="kid-pick-avatar">🥚</span>
            )}
            <span className="kid-pick-name">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
