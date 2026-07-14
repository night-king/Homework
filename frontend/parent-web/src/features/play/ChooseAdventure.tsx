import { useTranslation } from 'react-i18next'
import type { JourneyDto } from '@/types/homework'

export function ChooseAdventure({ drafts, onChoose }: { drafts: JourneyDto[]; onChoose: (id: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="kid-pick">
      <h1 className="kid-pick-title">{t('play.chooseAdventureTitle')}</h1>
      <div className="kid-pick-grid">
        {drafts.map((d) => (
          <button
            key={d.id}
            type="button"
            data-testid={`choose-adventure-${d.id}`}
            className="kid-pick-card"
            onClick={() => onChoose(d.id)}
          >
            <span className="kid-pick-avatar">🗺️</span>
            <span className="kid-pick-name">{d.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
