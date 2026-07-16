import { useTranslation } from 'react-i18next'
import { growthRatio } from './petStage'
import type { PetFormDto } from '@/types/homework'

// 成长槽面板:标题 + 百分比 + n/m + 「差N到XX」/满级文案 + 伙伴图鉴入口(占位,Plan 3 接) + Lv 徽章。
// 对照原型 child-homepage.html DOM 3731–3755。
export function GrowthPanel({ growthPoints, form, nextForm, onOpenCodex }: {
  growthPoints: number
  form?: PetFormDto
  nextForm?: PetFormDto
  onOpenCodex?: () => void
}) {
  const { t } = useTranslation()
  const ratio = growthRatio({ growthPoints }, form)
  const pct = Math.round(ratio * 100)
  const toNext = form?.growthToNext
  const left = toNext ? Math.max(0, toNext - growthPoints) : 0
  return (
    <section className="kid-panel kid-growth-panel">
      <div className="kid-growth-main">
        <div className="kid-growth-head">
          <span className="kid-growth-title">{t('play.growthTitle')}</span>
        </div>
        <div className="kid-growth-track">
          <div data-testid="growth-bar" className="kid-growth-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="kid-growth-stats">
          <span>{pct}%</span>
          <span>{t('play.growth')} {growthPoints}{toNext ? ` / ${toNext}` : ''}</span>
        </div>
        <p className="kid-growth-copy">
          {nextForm && toNext
            ? t('play.growthHint', { left, name: nextForm.name })
            : t('play.growthMaxed')}
        </p>
      </div>
      <div className="kid-growth-side">
        <button type="button" data-testid="open-codex" className="kid-growth-gallery-link" onClick={onOpenCodex}>
          {t('play.codexTitle')}
        </button>
        <div className="kid-mini-badges">
          <span className="kid-mini-badge">
            <span className="kid-mini-badge-label">Lv</span>
            <strong className="kid-mini-badge-value">{form?.level ?? 1}</strong>
          </span>
        </div>
      </div>
    </section>
  )
}
