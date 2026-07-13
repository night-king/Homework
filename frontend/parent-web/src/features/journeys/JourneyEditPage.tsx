import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useJourney } from '@/hooks/useJourneys'
import { useJourneyTemplates } from '@/hooks/useJourneyTemplates'
import { JourneyWizard } from './wizard/JourneyWizard'
import { draftFromTemplate } from './wizard/wizardTypes'
import type { WizardState } from './wizard/wizardTypes'
import { saveJourneyEdits } from './wizard/submitJourney'

export function JourneyEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: journey, isLoading } = useJourney(id)
  const { data: templates, isLoading: tplLoading } = useJourneyTemplates(id)

  if (isLoading || !journey) {
    return <div className="py-12 text-center text-muted">{t('common.loading')}</div>
  }
  if (journey.status !== 0) {
    return (
      <div data-testid="journey-readonly" className="space-y-3">
        <h1 className="text-2xl font-bold text-ink">{journey.title}</h1>
        <div className="rounded-xl border border-dashed border-ink/20 p-8 text-center text-muted">
          {t('journeys.readOnlyActive')}
        </div>
      </div>
    )
  }
  if (tplLoading || !templates) {
    return <div className="py-12 text-center text-muted">{t('common.loading')}</div>
  }

  const initialState: WizardState = {
    childId: journey.childId,
    title: journey.title,
    description: journey.description ?? '',
    startDate: journey.startDate,
    endDate: journey.endDate,
    medalId: journey.medalId,
    tasks: templates.map(draftFromTemplate),
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{journey.title}</h1>
      <JourneyWizard
        initialState={initialState}
        submitLabelKey="wizard.save"
        onSubmit={(s) => saveJourneyEdits(id, s)}
        onCancel={() => navigate('/journeys')}
        onDone={(r) => {
          if (r.failedTasks > 0) {
            toast.warning(t('wizard.publishPartial'))
          } else {
            toast.success(t('wizard.saveSuccess'))
            navigate('/journeys')
          }
        }}
      />
    </div>
  )
}
