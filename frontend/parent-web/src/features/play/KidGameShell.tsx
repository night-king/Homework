import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useActiveJourney, useChildJourneys } from '@/hooks/usePlay'
import { DailyBoard } from './DailyBoard'
import { PickPet } from './PickPet'
import { ChooseAdventure } from './ChooseAdventure'
import { EvolutionCutscene } from './EvolutionCutscene'
import { JourneyCompleted } from './JourneyCompleted'
import type { JourneyDto, FeedResultDto } from '@/types/homework'

export function KidGameShell() {
  const { t } = useTranslation()
  const { childId = '' } = useParams()
  const active = useActiveJourney(childId)
  const journeys = useChildJourneys(childId)
  const [chosenDraftId, setChosenDraftId] = useState<string | null>(null)
  // 过场与庆祝挂在 shell 上：满级会让 GetActive 变空、看板随之切走，
  // 若它们住在看板里就会被一起卸载，孩子只能看到庆祝闪一帧。
  const [cutscene, setCutscene] = useState<FeedResultDto | null>(null)
  const [completedJourneyId, setCompletedJourneyId] = useState<string | null>(null)

  const drafts = useMemo(
    () => (journeys.data ?? []).filter((j) => j.status === 0),
    [journeys.data],
  )

  const onFeedResult = (r: FeedResultDto, journeyId: string) => {
    if (r.completed) {
      setCompletedJourneyId(journeyId)
    }
    if (r.evolved || r.completed) {
      setCutscene(r)
    }
  }

  const screen = () => {
    // 庆祝是一次性的：只在刚满级的这一程里出现，关掉即回归常规分支。
    // 若改由服务端状态推导，满级后永远没有 active 旅程，这屏会变成新的死路。
    if (completedJourneyId) {
      return (
        <JourneyCompleted
          childId={childId}
          journeyId={completedJourneyId}
          onDismiss={() => setCompletedJourneyId(null)}
        />
      )
    }

    if (active.isLoading || journeys.isLoading) {
      return <div className="kid-center">{t('play.loading')}</div>
    }

    // 有 Active 旅程 → 每日看板
    if (active.data) {
      return <DailyBoard childId={childId} journey={active.data} onFeedResult={onFeedResult} />
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

  return (
    <>
      {screen()}
      {cutscene && <EvolutionCutscene result={cutscene} onClose={() => setCutscene(null)} />}
    </>
  )
}
