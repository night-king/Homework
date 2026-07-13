import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useActiveRewardItems, useActiveMedals } from '@/hooks/useCatalog'
import { StepBasics } from './StepBasics'
import { StepTasks } from './StepTasks'
import { StepMedal } from './StepMedal'
import { StepReview } from './StepReview'
import { validateBasics, validateTasks, validateMedal } from './wizardTypes'
import type { WizardState, WizardTaskDraft } from './wizardTypes'
import type { PublishResult } from './submitJourney'

interface Props {
  initialState: WizardState
  submitLabelKey: string
  onSubmit: (state: WizardState) => Promise<PublishResult>
  onDone: (result: PublishResult) => void
  onCancel: () => void
}

const STEP_KEYS = ['wizard.stepBasics', 'wizard.stepTasks', 'wizard.stepMedal', 'wizard.stepReview']

export function JourneyWizard({ initialState, submitLabelKey, onSubmit, onDone, onCancel }: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<WizardState>(initialState)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { data: rewardItems = [] } = useActiveRewardItems()
  const { data: medals = [] } = useActiveMedals()

  const patch = (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p }))
  const setTasks = (tasks: WizardTaskDraft[]) => setState((s) => ({ ...s, tasks }))

  const errorForStep = (): string | null => {
    if (step === 0) return validateBasics(state)
    if (step === 1) return validateTasks(state)
    if (step === 2) return validateMedal(state)
    return null
  }
  const stepErrorMessage: Record<string, string> = {
    title: t('wizard.titleRequired'), dates: t('wizard.datesRequired'), dateOrder: t('wizard.dateOrderError'),
    taskTitle: t('wizard.taskTitleRequired'), taskReward: t('wizard.taskRewardRequired'), medal: t('wizard.selectMedalRequired'),
  }

  const goNext = () => {
    const err = errorForStep()
    if (err) { toast.error(stepErrorMessage[err] ?? err); return }
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1))
  }
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const submit = async () => {
    const err = validateBasics(state) ?? validateTasks(state) ?? validateMedal(state)
    if (err) { toast.error(stepErrorMessage[err] ?? err); return }
    setSubmitting(true)
    try {
      const result = await onSubmit(state)
      onDone(result)
    } catch {
      toast.error('出错了，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  const isLast = step === STEP_KEYS.length - 1

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ol className="flex items-center gap-2 text-sm">
        {STEP_KEYS.map((key, i) => (
          <li key={key} className={`flex items-center gap-2 ${i === step ? 'font-semibold text-brand-600' : 'text-muted'}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full border text-xs ${
              i === step ? 'border-brand-600 bg-brand-50' : 'border-ink/20'}`}>{i + 1}</span>
            <span className="hidden sm:inline">{t(key)}</span>
            {i < STEP_KEYS.length - 1 && <span className="mx-1 text-ink/20">›</span>}
          </li>
        ))}
      </ol>

      <div>
        {step === 0 && <StepBasics state={state} patch={patch} />}
        {step === 1 && <StepTasks state={state} setTasks={setTasks} rewardItems={rewardItems} />}
        {step === 2 && <StepMedal state={state} patch={patch} medals={medals} />}
        {step === 3 && <StepReview state={state} medals={medals} rewardItems={rewardItems} />}
      </div>

      <div className="flex items-center justify-between border-t border-ink/10 pt-4">
        <Button variant="ghost" onClick={onCancel}>{t('wizard.cancel')}</Button>
        <div className="flex gap-2">
          {step > 0 && <Button variant="outline" data-testid="wiz-back" onClick={goBack}>{t('wizard.back')}</Button>}
          {!isLast && <Button data-testid="wiz-next" onClick={goNext}>{t('wizard.next')}</Button>}
          {isLast && <Button data-testid="wiz-submit" disabled={submitting} onClick={submit}>{t(submitLabelKey)}</Button>}
        </div>
      </div>
    </div>
  )
}
