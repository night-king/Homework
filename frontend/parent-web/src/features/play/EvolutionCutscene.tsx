import { useTranslation } from 'react-i18next'
import type { FeedResultDto } from '@/types/homework'

// 视频优先 + CSS 兜底 + reveal；满级庆祝。动画细节可对照原型
// child-homepage.html 的 playEvolutionCutscene(4581-4646) / playEvolutionCss(4648-4698)。
export function EvolutionCutscene({ result, onClose }: { result: FeedResultDto; onClose: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="kid-evo" role="dialog" aria-modal="true">
      {result.completed ? (
        <div data-testid="evo-completed" className="kid-evo-card">
          <div className="kid-evo-emoji">🏅</div>
          <h1>{t('play.completedTitle')}</h1>
          <p>{t('play.completedBody')}</p>
        </div>
      ) : result.evolveVideoUrl ? (
        <div className="kid-evo-card">
          <video data-testid="evo-video" className="kid-evo-video" src={result.evolveVideoUrl} autoPlay muted playsInline onEnded={onClose} />
          <div className="kid-evo-reveal">{result.revealText ?? t('play.evolveReveal')}</div>
        </div>
      ) : (
        <div data-testid="evo-css" className="kid-evo-card kid-evo-flash">
          <div className="kid-evo-emoji">✨</div>
          <h1>{t('play.evolveReveal')}</h1>
          <div className="kid-evo-reveal">{result.revealText ?? ''}</div>
        </div>
      )}
      <button type="button" data-testid="evo-close" className="kid-evo-close" onClick={onClose}>
        {result.completed ? t('play.done') : t('play.skip')}
      </button>
    </div>
  )
}
