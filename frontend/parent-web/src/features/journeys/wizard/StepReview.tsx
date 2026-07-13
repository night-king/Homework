import { useTranslation } from 'react-i18next'
import type { WizardState } from './wizardTypes'
import type { MedalDto, RewardItemDto } from '@/types/homework'

interface Props {
  state: WizardState
  medals: MedalDto[]
  rewardItems: RewardItemDto[]
}

export function StepReview({ state, medals, rewardItems }: Props) {
  const { t } = useTranslation()
  const medalName = medals.find((m) => m.id === state.medalId)?.name ?? '—'
  const rewardLabel = (rewardItemId: string | null, mode: string) => {
    if (mode === 'random') return t('wizard.rewardRandom')
    const r = rewardItems.find((x) => x.id === rewardItemId)
    return r ? `${r.glyph ?? '🎁'} ${r.name}` : t('wizard.rewardSpecific')
  }
  const sorted = [...state.tasks].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.order - b.order)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink/10 p-4">
        <div data-testid="review-title" className="text-lg font-bold text-ink">{state.title || '—'}</div>
        {state.description && <div className="mt-1 text-sm text-muted">{state.description}</div>}
        <div className="mt-2 text-sm text-muted">{state.startDate} → {state.endDate}</div>
        <div className="mt-2 text-sm">
          {t('wizard.stepMedal')}: <span data-testid="review-medal" className="font-medium text-ink">{medalName}</span>
        </div>
      </div>
      <div className="rounded-xl border border-ink/10 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-ink">{t('wizard.reviewTasks')}</span>
          <span data-testid="review-task-count" className="text-sm text-muted">{state.tasks.length}</span>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">{t('wizard.reviewNoTasks')}</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {sorted.map((task) => (
              <li key={task.key} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-muted">{t(`wizard.days.${task.dayOfWeek}`)}</span>
                <span className="flex-1 truncate text-ink">{task.title}</span>
                <span className="shrink-0 text-muted">{rewardLabel(task.rewardItemId, task.rewardMode)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
