import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { usePlayBoard, useActivePetSpecies, usePlayMutations } from '@/hooks/usePlay'
import { currentForm, growthRatio } from './petStage'
import { Backpack } from './Backpack'
import type { JourneyDto, FeedResultDto, BackpackItemDto } from '@/types/homework'

// 本地日期 YYYY-MM-DD（不带时区）
function todayStr(): string {
  const d = new Date()
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
  const [selectedDate] = useState(today) // Task 5 接 DayStrip 时改为带 setter
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
      <div className="kid-topbar-slot">{/* Task 5 放 KidTopBar；本任务留空占位 */}</div>
      <div className="kid-main-grid">
        <section className="kid-panel kid-stage-panel" data-testid="kid-main">
          {/* 宠物舞台 */}
          <section className="kid-stage">
            {form?.spriteUrl ? (
              <img
                data-testid="pet-sprite"
                className="kid-pet"
                src={form.spriteUrl}
                alt={form.name}
                style={{ transform: `scale(${form.scale ?? 1})` }}
              />
            ) : (
              <div data-testid="pet-sprite" className="kid-pet kid-pet-fallback">🥚</div>
            )}
            <div className="kid-growth">
              <div data-testid="growth-bar" className="kid-growth-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
            </div>
            <div className="kid-growth-label">{t('play.growth')} {journey.growthPoints}{form?.growthToNext ? ` / ${form.growthToNext}` : ''}</div>
          </section>

          {/* 状态条 */}
          <section className="kid-stats">
            <span>⭐ {t('play.stars')}：{board.data?.stars ?? 0}</span>
            <span>📈 {t('play.progress')}：{board.data?.tasksCompleted ?? 0}/{board.data?.tasksTotal ?? 0}</span>
          </section>

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
