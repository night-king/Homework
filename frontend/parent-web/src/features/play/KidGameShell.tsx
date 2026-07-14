import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useActiveJourney, useChildJourneys } from '@/hooks/usePlay'
import { DailyBoard } from './DailyBoard'
import { PickPet } from './PickPet'
import { ChooseAdventure } from './ChooseAdventure'
import type { JourneyDto } from '@/types/homework'

export function KidGameShell() {
  const { t } = useTranslation()
  const { childId = '' } = useParams()
  const active = useActiveJourney(childId)
  const journeys = useChildJourneys(childId)
  const [chosenDraftId, setChosenDraftId] = useState<string | null>(null)

  const drafts = useMemo(
    () => (journeys.data ?? []).filter((j) => j.status === 0),
    [journeys.data],
  )

  if (active.isLoading || journeys.isLoading) {
    return <div className="kid-center">{t('play.loading')}</div>
  }

  // 有 Active 旅程 → 每日看板
  if (active.data) {
    return <DailyBoard childId={childId} journey={active.data} />
  }

  // 无 Active：按 Draft 数量分支
  if (drafts.length === 0) {
    return (
      <div className="kid-center kid-empty" data-testid="play-empty">
        <h1 className="kid-pick-title">{t('play.noJourneyTitle')}</h1>
        <p>{t('play.noJourneyBody')}</p>
      </div>
    )
  }

  const target: JourneyDto | undefined =
    drafts.length === 1 ? drafts[0] : drafts.find((d) => d.id === chosenDraftId)

  if (!target) {
    return (
      <ChooseAdventure
        drafts={drafts}
        onChoose={(id) => setChosenDraftId(id)}
      />
    )
  }

  return <PickPet childId={childId} journey={target} />
}
