import { useTranslation } from 'react-i18next'
import { useBackpack } from '@/hooks/usePlay'
import type { BackpackItemDto } from '@/types/homework'

export function Backpack({ childId, journeyId, onFeed }: { childId: string; journeyId: string; onFeed?: (item: BackpackItemDto) => void }) {
  const { t } = useTranslation()
  const { data: items = [], isLoading } = useBackpack(childId, journeyId)

  if (isLoading) return <div className="kid-center">{t('play.loading')}</div>
  if (items.length === 0) return <div data-testid="backpack-empty" className="kid-rest">{t('play.backpackEmpty')}</div>

  return (
    <div className="kid-backpack">
      <h2 className="kid-backpack-title">{t('play.backpackTitle')}</h2>
      <div className="kid-backpack-grid">
        {items.map((it) => (
          <button
            key={it.rewardItemId}
            type="button"
            data-testid={`backpack-item-${it.rewardItemId}`}
            className="kid-backpack-item"
            onClick={() => onFeed?.(it)}
          >
            {it.iconUrl ? <img className="kid-backpack-icon" src={it.iconUrl} alt={it.name} /> : <span className="kid-backpack-glyph">{it.glyph ?? '🎁'}</span>}
            <span className="kid-backpack-name">{it.name}</span>
            <span className="kid-backpack-qty">×{it.quantity}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
