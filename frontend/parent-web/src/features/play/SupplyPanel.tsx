import { useTranslation } from 'react-i18next'
import { useBackpack } from '@/hooks/usePlay'
import type { BackpackItemDto } from '@/types/homework'

// 补给台：由 Backpack 改造为原型的纸感面板 + 道具卡(对照 child-web-prototype/child-homepage.html 3768–3784)。
// 逐个道具卡点击即喂养(同旧 Backpack 交互)，不做原型里"图标展示 + 独立喂给伙伴按钮"的两段式流程。
export function SupplyPanel({ childId, journeyId, onFeed, disabled }: {
  childId: string
  journeyId: string
  onFeed?: (item: BackpackItemDto) => void
  // 喂养在途时锁住：连点会让第二次 mutate 顶掉第一次的 scoped onSuccess，庆祝就丢了
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { data: items = [], isLoading } = useBackpack(childId, journeyId)

  return (
    <section className="kid-panel kid-supply-panel">
      <div className="kid-panel-head"><h3>{t('play.supplyTitle')}</h3></div>
      {isLoading ? (
        <div className="kid-center">{t('play.loading')}</div>
      ) : items.length === 0 ? (
        <div data-testid="backpack-empty" className="kid-reward-copy">{t('play.backpackEmpty')}</div>
      ) : (
        <div className="kid-reward-drop-list">
          {items.map((it) => (
            <button
              key={it.rewardItemId}
              type="button"
              data-testid={`backpack-item-${it.rewardItemId}`}
              className="kid-reward-drop"
              disabled={disabled}
              onClick={() => onFeed?.(it)}
            >
              {it.iconUrl ? (
                <img className="kid-reward-drop-icon" src={it.iconUrl} alt={it.name} />
              ) : (
                <span className="kid-reward-drop-icon kid-reward-drop-glyph">{it.glyph ?? '🎁'}</span>
              )}
              <span className="kid-reward-drop-copy">
                {it.name}
                <small>×{it.quantity} · +{it.growthValue}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
