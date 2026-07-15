import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCollection } from '@/hooks/usePlay'

// 满级落地屏：庆祝过场谢幕后停在这里，给孩子看清战利品并递出收藏墙入口。
// 满级后已无 active 旅程，勋章/满级形象只能从收藏墙那条数据里按 journeyId 取。
export function JourneyCompleted({ childId, journeyId, onDismiss }: {
  childId: string
  journeyId: string
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  // 孩子端别处不挂 useCollection，这里必然是冷启动：加载完再露面，
  // 否则勋章名会先空白一下——而这正是整段旅程的兑现时刻。
  const { data: entries = [], isLoading } = useCollection(childId)
  const entry = entries.find((e) => e.journeyId === journeyId)

  if (isLoading) return <div className="kid-center">{t('play.loading')}</div>

  return (
    <div className="kid-center kid-completed" data-testid="journey-completed">
      <h1 className="kid-pick-title">{t('play.completedTitle')}</h1>
      {entry ? (
        <>
          {entry.petFinalSpriteUrl && (
            <img className="kid-completed-pet" src={entry.petFinalSpriteUrl} alt={entry.petName} />
          )}
          <div className="kid-completed-journey">{entry.title}</div>
          <div className="kid-completed-medal">
            {entry.medalImageUrl
              ? <img className="kid-completed-medal-img" src={entry.medalImageUrl} alt={entry.medalName} />
              : <span className="kid-completed-medal-glyph">🏅</span>}
            <span>{entry.medalName}</span>
          </div>
        </>
      ) : (
        // 收藏取不到（失败/缓存里还没这条）时别留空壳：庆祝文案照给，入口照给
        <>
          <div className="kid-completed-medal-glyph">🏅</div>
          <p>{t('play.completedBody')}</p>
        </>
      )}
      <Link data-testid="completed-see-collection" className="kid-completed-cta" to={`/play/${childId}/collection`}>
        🏆 {t('play.seeCollection')}
      </Link>
      <button type="button" data-testid="completed-dismiss" className="kid-completed-dismiss" onClick={onDismiss}>
        {t('play.backToPlay')}
      </button>
    </div>
  )
}
