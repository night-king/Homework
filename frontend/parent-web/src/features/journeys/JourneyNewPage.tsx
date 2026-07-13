import { useSearchParams, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { JourneyWizard } from './wizard/JourneyWizard'
import { emptyWizardState } from './wizard/wizardTypes'
import { publishNewJourney } from './wizard/submitJourney'

export function JourneyNewPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const childId = params.get('childId') ?? ''
  if (!childId) return <Navigate to="/journeys" replace />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t('journeys.create')}</h1>
      <JourneyWizard
        initialState={emptyWizardState(childId)}
        submitLabelKey="wizard.publish"
        onSubmit={publishNewJourney}
        onCancel={() => navigate('/journeys')}
        onDone={(r) => {
          if (r.failedTasks > 0) {
            toast.warning(t('wizard.publishPartial'))
            navigate(`/journeys/${r.journeyId}/edit`)
          } else {
            toast.success(t('wizard.publishSuccess'))
            navigate('/journeys')
          }
        }}
      />
    </div>
  )
}
