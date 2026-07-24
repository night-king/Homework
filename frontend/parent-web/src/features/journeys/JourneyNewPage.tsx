import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { JourneyWizard } from './wizard/JourneyWizard'
import { emptyWizardState } from './wizard/wizardTypes'
import { publishNewJourney } from './wizard/submitJourney'

export function JourneyNewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t('journeys.create')}</h1>
      <JourneyWizard
        initialState={emptyWizardState()}
        submitLabelKey="wizard.publish"
        onSubmit={publishNewJourney}
        onCancel={() => navigate('/journeys')}
        onDone={(r) => {
          if (r.failedTasks > 0) {
            toast.warning(t('wizard.publishPartial'))
          } else {
            toast.success(t('wizard.publishSuccess'))
          }
          // 建完直接进编辑页：家长紧接着要加参与者
          navigate(`/journeys/${r.sharedJourneyId}/edit`)
        }}
      />
    </div>
  )
}
