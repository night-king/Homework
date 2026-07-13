import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { newTaskDraft } from './wizardTypes'
import type { WizardState, WizardTaskDraft } from './wizardTypes'
import type { DayOfWeek, RewardItemDto } from '@/types/homework'

interface Props {
  state: WizardState
  setTasks: (tasks: WizardTaskDraft[]) => void
  rewardItems: RewardItemDto[]
}

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0] // 周一..周日

export function StepTasks({ state, setTasks, rewardItems }: Props) {
  const { t } = useTranslation()

  const patchTask = (key: string, p: Partial<WizardTaskDraft>) =>
    setTasks(state.tasks.map((task) => (task.key === key ? { ...task, ...p } : task)))
  const addTask = (day: DayOfWeek) => {
    const order = state.tasks.filter((task) => task.dayOfWeek === day).length
    setTasks([...state.tasks, newTaskDraft(day, order)])
  }
  const removeTask = (key: string) => setTasks(state.tasks.filter((task) => task.key !== key))

  return (
    <div className="space-y-5">
      {DAYS.map((day) => {
        const dayTasks = state.tasks.filter((task) => task.dayOfWeek === day)
        return (
          <div key={day} className="rounded-xl border border-ink/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ink">{t(`wizard.days.${day}`)}</h3>
              <Button size="sm" variant="outline" data-testid={`add-task-${day}`} onClick={() => addTask(day)}>
                <Plus className="h-4 w-4" /> {t('wizard.addTask')}
              </Button>
            </div>
            {dayTasks.length === 0 ? (
              <p className="text-sm text-muted">—</p>
            ) : (
              <div className="space-y-3">
                {dayTasks.map((task) => (
                  <div key={task.key} className="space-y-2 rounded-lg bg-ink/[0.03] p-3">
                    <div className="flex gap-2">
                      <Input data-testid={`task-title-${task.key}`} placeholder={t('wizard.taskTitle')}
                        value={task.title} maxLength={128}
                        onChange={(e) => patchTask(task.key, { title: e.target.value })} />
                      <Button size="icon" variant="ghost" data-testid={`remove-task-${task.key}`}
                        className="shrink-0 text-error-500 hover:bg-error-500/10 hover:text-error-500"
                        onClick={() => removeTask(task.key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input data-testid={`task-subject-${task.key}`} placeholder={t('wizard.subject')}
                        value={task.subject} maxLength={64} className="flex-1"
                        onChange={(e) => patchTask(task.key, { subject: e.target.value })} />
                      <Input data-testid={`task-minutes-${task.key}`} type="number" min={1} max={600}
                        placeholder={t('wizard.minutes')} value={task.estimatedMinutes ?? ''} className="w-32"
                        onChange={(e) => patchTask(task.key, { estimatedMinutes: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted">{t('wizard.reward')}:</span>
                      <button type="button" data-testid={`reward-random-${task.key}`}
                        onClick={() => patchTask(task.key, { rewardMode: 'random', rewardItemId: null })}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          task.rewardMode === 'random' ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-ink/15 text-muted'}`}>
                        {t('wizard.rewardRandom')}
                      </button>
                      <button type="button" data-testid={`reward-specific-${task.key}`}
                        onClick={() => patchTask(task.key, { rewardMode: 'specific' })}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          task.rewardMode === 'specific' ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-ink/15 text-muted'}`}>
                        {t('wizard.rewardSpecific')}
                      </button>
                      {task.rewardMode === 'specific' && (
                        rewardItems.length === 0 ? (
                          <span className="text-sm text-error-500">{t('wizard.noReward')}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {rewardItems.map((r) => (
                              <button key={r.id} type="button" data-testid={`reward-item-${task.key}-${r.id}`}
                                onClick={() => patchTask(task.key, { rewardItemId: r.id })}
                                className={`rounded-full border px-2.5 py-1 text-sm ${
                                  task.rewardItemId === r.id ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-ink/15 text-ink hover:bg-ink/5'}`}>
                                {r.glyph ?? '🎁'} {r.name}
                              </button>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
