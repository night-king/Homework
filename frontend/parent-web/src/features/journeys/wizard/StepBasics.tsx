import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { WizardState } from './wizardTypes'

interface Props {
  state: WizardState
  patch: (p: Partial<WizardState>) => void
}

export function StepBasics({ state, patch }: Props) {
  const { t } = useTranslation()
  const dateOrderBad = !!state.startDate && !!state.endDate && state.endDate < state.startDate

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="wiz-title">{t('wizard.title')}</Label>
        <Input id="wiz-title" data-testid="wiz-title" value={state.title}
          onChange={(e) => patch({ title: e.target.value })} maxLength={128} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wiz-desc">{t('wizard.description')}</Label>
        <Textarea id="wiz-desc" data-testid="wiz-desc" value={state.description}
          onChange={(e) => patch({ description: e.target.value })} maxLength={512} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-start">{t('wizard.startDate')}</Label>
          <Input id="wiz-start" data-testid="wiz-start" type="date" value={state.startDate}
            onChange={(e) => patch({ startDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wiz-end">{t('wizard.endDate')}</Label>
          <Input id="wiz-end" data-testid="wiz-end" type="date" value={state.endDate}
            onChange={(e) => patch({ endDate: e.target.value })} />
        </div>
      </div>
      {dateOrderBad && (
        <p data-testid="wiz-date-error" className="text-sm text-error-500">{t('wizard.dateOrderError')}</p>
      )}
    </div>
  )
}
