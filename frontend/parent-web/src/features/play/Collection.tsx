import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCollection } from '@/hooks/usePlay'

export function Collection() {
  const { t } = useTranslation()
  const { childId = '' } = useParams()
  const { data: entries = [], isLoading } = useCollection(childId)

  if (isLoading) return <div className="kid-center">{t('play.loading')}</div>

  return (
    <div className="kid-board">
      <h1 className="kid-pick-title">{t('play.collectionTitle')}</h1>
      {entries.length === 0 ? (
        <div data-testid="collection-empty" className="kid-rest">{t('play.collectionEmpty')}</div>
      ) : (
        <div className="kid-collection-grid">
          {entries.map((e) => (
            <div key={e.journeyId} data-testid={`collection-entry-${e.journeyId}`} className="kid-collection-card">
              {e.petFinalSpriteUrl && <img className="kid-collection-pet" src={e.petFinalSpriteUrl} alt={e.petName} />}
              <div className="kid-collection-title">{e.title}</div>
              <div className="kid-collection-medal">
                {e.medalImageUrl ? <img className="kid-collection-medal-img" src={e.medalImageUrl} alt={e.medalName} /> : <span>🏅</span>}
                <span>{e.medalName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
