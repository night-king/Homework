import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayBoard, useActivePetSpecies } from '@/hooks/usePlay'
import { currentForm, growthRatio } from './petStage'
import type { JourneyDto } from '@/types/homework'

// 本地日期 YYYY-MM-DD（不带时区）
function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function DailyBoard({ childId, journey }: { childId: string; journey: JourneyDto }) {
  const { t } = useTranslation()
  const date = useMemo(todayStr, [])
  const board = usePlayBoard(childId, date)
  const species = useActivePetSpecies()

  const mySpecies = (species.data ?? []).find((s) => s.id === journey.petSpeciesId)
  const form = currentForm(mySpecies, journey.currentLevel)
  const ratio = growthRatio(journey, form)

  return (
    <div className="kid-board">
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
              <span className="kid-task-state">{task.countsAsCompleted ? t('play.done') : t('play.goComplete')}</span>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
