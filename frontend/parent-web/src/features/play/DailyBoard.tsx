import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { usePlayBoard, useActivePetSpecies, usePlayMutations, useWeekStrip } from '@/hooks/usePlay'
import { currentForm, growthRatio } from './petStage'
import { Backpack } from './Backpack'
import { KidTopBar } from './KidTopBar'
import { PetStage } from './PetStage.tsx'
import type { JourneyDto, FeedResultDto, BackpackItemDto } from '@/types/homework'

// 本地日期 YYYY-MM-DD（不带时区）
function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 本地日期所在周的周一(原型周条以周一起头)
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay() // 0=周日
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function DailyBoard({ childId, journey, onFeedResult }: {
  childId: string
  journey: JourneyDto
  // 喂养结果交给上层：满级会让本组件被卸载，庆祝不能挂在这里。
  // 必填：漏传就等于悄悄丢掉庆祝，这类失败正是本组件踩过的坑，交给编译器守。
  onFeedResult: (result: FeedResultDto, journeyId: string) => void
}) {
  const { t } = useTranslation()
  const today = useMemo(todayStr, [])
  const [selectedDate, setSelectedDate] = useState(today)
  const weekStart = useMemo(() => mondayOf(today), [today])
  const weekStrip = useWeekStrip(childId, weekStart)
  const board = usePlayBoard(childId, selectedDate)
  const species = useActivePetSpecies()
  const { complete, uncomplete, feed } = usePlayMutations(childId, journey.id)

  const mySpecies = (species.data ?? []).find((s) => s.id === journey.petSpeciesId)
  const form = currentForm(mySpecies, journey.currentLevel)
  const ratio = growthRatio(journey, form)

  const toggleTask = (taskId: string, done: boolean) => {
    if (done) {
      uncomplete.mutate(taskId)
    } else {
      complete.mutate(taskId, { onSuccess: () => toast.success(t('play.rewardEarned', { name: t('play.feed') })) })
    }
  }

  const onFeed = (item: BackpackItemDto) => {
    feed.mutate(
      { childId, journeyId: journey.id, rewardItemId: item.rewardItemId },
      { onSuccess: (r) => onFeedResult(r, journey.id) },
    )
  }

  return (
    <div className="kid-board">
      <KidTopBar
        childName={journey.title}
        weekStrip={weekStrip.data}
        board={board.data}
        today={today}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <div className="kid-main-grid">
        <section className="kid-panel kid-stage-panel" data-testid="kid-main">
          {/* 宠物舞台：氛围层 + LV 横幅 + 形态名 + 精灵图(或蛋兜底) */}
          <PetStage form={form} level={journey.currentLevel} />

          {/* 成长条：暂留在 kid-main，Task 7 抽进 GrowthPanel */}
          <div className="kid-growth">
            <div data-testid="growth-bar" className="kid-growth-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
          <div className="kid-growth-label">{t('play.growth')} {journey.growthPoints}{form?.growthToNext ? ` / ${form.growthToNext}` : ''}</div>

          <Link data-testid="open-collection" className="kid-collection-link" to={`/play/${childId}/collection`}>
            🏆 {t('play.collectionTitle')}
          </Link>
        </section>

        <aside className="kid-side-stack" data-testid="kid-side">
          {/* 任务列表（完成接线在 Task 11 加，本 task 仅渲染） */}
          <section className="kid-tasks">
            {board.isLoading ? (
              <div className="kid-center">{t('play.loading')}</div>
            ) : board.data?.isRestDay ? (
              <div className="kid-rest">{t('play.restDay')}</div>
            ) : (
              board.data?.tasks.map((task) => (
                <div key={task.id} data-testid={`task-${task.id}`} className={`kid-task ${task.countsAsCompleted ? 'is-done' : ''}`}>
                  <div className="kid-task-main">
                    <div className="kid-task-title">{task.title}</div>
                    {task.subject && <div className="kid-task-subject">{task.subject}</div>}
                  </div>
                  <button
                    type="button"
                    data-testid={`task-toggle-${task.id}`}
                    className="kid-task-state"
                    disabled={complete.isPending || uncomplete.isPending}
                    onClick={() => toggleTask(task.id, task.countsAsCompleted)}
                  >
                    {task.countsAsCompleted ? t('play.done') : t('play.goComplete')}
                  </button>
                </div>
              ))
            )}
          </section>

          {journey.petSpeciesId && (
            <Backpack childId={childId} journeyId={journey.id} onFeed={onFeed} disabled={feed.isPending} />
          )}
        </aside>
      </div>
    </div>
  )
}
