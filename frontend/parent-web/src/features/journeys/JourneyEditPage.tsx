import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useSharedJourney } from '@/hooks/useJourneys'
import { useJourneyTemplates } from '@/hooks/useJourneyTemplates'
import { JourneyWizard } from './wizard/JourneyWizard'
import { draftFromTemplate } from './wizard/wizardTypes'
import type { WizardState } from './wizard/wizardTypes'
import { saveJourneyEdits } from './wizard/submitJourney'
import { ParticipantPanel } from './ParticipantPanel'

export function JourneyEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: journey, isLoading } = useSharedJourney(id)
  const { data: templates, isLoading: tplLoading } = useJourneyTemplates(id)

  if (isLoading || !journey) {
    return <div className="py-12 text-center text-muted">{t('common.loading')}</div>
  }
  if (tplLoading || !templates) {
    return <div className="py-12 text-center text-muted">{t('common.loading')}</div>
  }

  const initialState: WizardState = {
    title: journey.title,
    description: journey.description ?? '',
    startDate: journey.startDate,
    endDate: journey.endDate,
    medalId: journey.medalId,
    tasks: templates.map(draftFromTemplate),
  }

  return (
    <div className="space-y-8">
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

      <section className="mx-auto max-w-3xl space-y-4 border-t border-ink/10 pt-6">
        <h2 className="text-lg font-semibold text-ink">{t('journeys.participants')}</h2>
        <ParticipantPanel sharedJourneyId={id} />
      </section>
    </div>
  )
}
