import { useTranslation } from 'react-i18next'
import { TaskCard } from './TaskCard'
import type { DailyBoardDto } from '@/types/homework'

export function QuestPanel({ board, loading, disabled, onToggle }: {
  board?: DailyBoardDto
  loading: boolean
  disabled: boolean
  onToggle: (taskId: string, done: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <section className="kid-panel kid-quest-panel">
      <div className="kid-panel-head"><h3>{t('play.questTitle')}</h3></div>
      <div className="kid-task-list">
        {loading ? (
          <div className="kid-center">{t('play.loading')}</div>
        ) : board?.isRestDay ? (
          <div className="kid-rest">{t('play.restDay')}</div>
        ) : (
          board?.tasks.map((task) => (
            <TaskCard key={task.id} task={task} disabled={disabled} onToggle={onToggle} />
          ))
        )}
      </div>
    </section>
  )
}
