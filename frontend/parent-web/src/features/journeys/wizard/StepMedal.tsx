import { useTranslation } from 'react-i18next'
import { Award } from 'lucide-react'
import type { WizardState } from './wizardTypes'
import type { MedalDto } from '@/types/homework'

interface Props {
  state: WizardState
  patch: (p: Partial<WizardState>) => void
  medals: MedalDto[]
}

export function StepMedal({ state, patch, medals }: Props) {
  const { t } = useTranslation()
  if (medals.length === 0) {
    return <p data-testid="medal-empty" className="text-sm text-muted">{t('wizard.noMedal')}</p>
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {medals.map((m) => {
        const selected = state.medalId === m.id
        return (
          <button key={m.id} type="button" data-testid={`medal-${m.id}`}
            onClick={() => patch({ medalId: m.id })}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              selected ? 'border-brand-600 bg-brand-50' : 'border-ink/15 hover:bg-ink/5'}`}>
            <Award className={`h-6 w-6 shrink-0 ${selected ? 'text-brand-600' : 'text-muted'}`} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-ink">{m.name}</div>
              {m.description && <div className="text-sm text-muted line-clamp-2">{m.description}</div>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
