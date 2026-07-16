import { useTranslation } from 'react-i18next'
import type { PetSpeciesDto, PetFormDto } from '@/types/homework'

export function PetCodex({ species, currentLevel, onClose }: {
  species?: PetSpeciesDto
  currentLevel: number
  onClose: () => void
}) {
  const { t } = useTranslation()
  const forms = [...(species?.forms ?? [])].sort((a, b) => a.level - b.level)
  const current = forms.find((f) => f.level === currentLevel)
  const next = forms.find((f) => f.level === currentLevel + 1)

  const stageState = (f: PetFormDto) =>
    f.level === currentLevel ? 'is-current' : f.level < currentLevel ? 'is-unlocked' : 'is-locked'
  const stateLabel = (f: PetFormDto) =>
    f.level === currentLevel ? t('play.codexStateCurrent')
      : f.level < currentLevel ? t('play.codexStateUnlocked') : t('play.codexStateLocked')

  return (
    <div className="kid-codex-modal is-open" data-testid="pet-codex"
         role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="kid-codex-panel">
        <div className="kid-codex-top">
          <div>
            <div className="kid-overline">CODEX</div>
            <h3>{t('play.codexTitle')}</h3>
            <p className="kid-codex-copy">{t('play.codexModalCopy')}</p>
          </div>
          <button type="button" data-testid="codex-close" className="kid-codex-close"
                  aria-label={t('play.close')} onClick={onClose}>✕</button>
        </div>

        <div className="kid-codex-rail">
          {forms.map((f) => {
            const st = stageState(f)
            const unlocked = f.level <= currentLevel
            return (
              <div key={f.level} data-testid={`codex-stage-${f.level}`} className={`kid-codex-stage ${st}`}>
                <span className="kid-codex-state">{stateLabel(f)}</span>
                {unlocked && f.spriteUrl ? (
                  <img className="kid-codex-sprite" src={f.spriteUrl} alt={f.name} />
                ) : (
                  <div className="kid-codex-lock">?</div>
                )}
                <h4>{unlocked ? f.name : t('play.codexLockedName')}</h4>
                <p>{unlocked ? (f.revealText ?? '') : ''}</p>
              </div>
            )
          })}
        </div>

        <div className="kid-codex-summary">
          <div className="kid-codex-summary-card">
            <div className="kid-overline">{t('play.codexCurrent')}</div>
            <strong>{current?.name ?? '—'}</strong>
            <p>{t('play.codexUnlockedN', { level: currentLevel })}</p>
          </div>
          <div className="kid-codex-goal-card">
            <div className="kid-overline">{t('play.codexGoal')}</div>
            <strong>{next ? next.name : t('play.codexMaxed')}</strong>
            <p>{next ? t('play.codexNext', { name: next.name }) : t('play.codexMaxedCopy')}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
