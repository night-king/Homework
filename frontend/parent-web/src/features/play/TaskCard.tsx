import { useTranslation } from 'react-i18next'
import type { DailyTaskDto } from '@/types/homework'

const SUBJECT_CLASS: Record<string, string> = {
  math: 'math', chinese: 'chinese', english: 'english', reading: 'reading',
}

export function TaskCard({ task, disabled, onToggle }: {
  task: DailyTaskDto
  disabled: boolean
  onToggle: (taskId: string, done: boolean) => void
}) {
  const { t } = useTranslation()
  const done = task.countsAsCompleted
  const subjectClass = task.subject ? SUBJECT_CLASS[task.subject] ?? '' : ''
  return (
    <div data-testid={`task-${task.id}`} className={`kid-task-card${done ? ' is-done' : ''}`}>
      <div className="kid-task-meta">
        {task.subject && (
          <span className={`kid-subject-badge ${subjectClass}`}>{t(`play.subject.${task.subject}`, task.subject)}</span>
        )}
        {task.estimatedMinutes != null && (
          <span className="kid-task-time">
            {t('play.minutes', { n: task.estimatedMinutes, defaultValue: `${task.estimatedMinutes} 分钟` })}
          </span>
        )}
      </div>
      <div className="kid-task-title">{task.title}</div>
      <div className="kid-task-foot">
        {task.rewardName && (
          <span className="kid-task-reward">
            {t('play.rewardLabel', { name: task.rewardName, defaultValue: `奖励 ${task.rewardName}` })}
          </span>
        )}
        <button
          type="button"
          data-testid={`task-toggle-${task.id}`}
          className="kid-task-button"
          disabled={disabled}
          onClick={() => onToggle(task.id, done)}
        >
          {done ? t('play.done') : t('play.goComplete')}
        </button>
      </div>
    </div>
  )
}
