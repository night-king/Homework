import { useState } from 'react'
import { Plus, Pencil, Trash2, Target } from 'lucide-react'
import { useGoals, useGoalMutations } from '@/hooks/useGoals'
import { useConfirm } from '@/components/ConfirmDialog'
import { GoalFormDialog } from './GoalFormDialog'
import { ProgressBar } from '@/components/ProgressBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { FamilyGoalDto, CreateUpdateFamilyGoalDto } from '@/types/homework'

export function FamilyGoalsPage() {
  const { data: goals = [], isLoading } = useGoals()
  const m = useGoalMutations()
  const confirm = useConfirm()

  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FamilyGoalDto | null>(null)

  const openForm = (goal: FamilyGoalDto | null = null) => {
    setEditingGoal(goal)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingGoal(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">家庭目标</h1>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4" />
          新建目标
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted">加载中…</div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 p-12 text-center">
          <Target className="mx-auto mb-4 h-12 w-12 text-muted" />
          <p className="text-muted">还没有家庭目标，建一个吧</p>
          <Button className="mt-4" onClick={() => openForm()}>
            <Plus className="h-4 w-4" />
            新建目标
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink leading-tight">{goal.title}</h3>
                  {goal.isAchieved && (
                    <Badge variant="success" className="shrink-0 text-xs">
                      已达成 🎉
                    </Badge>
                  )}
                </div>

                <ProgressBar percent={goal.progressPercent} />

                <div className="flex items-center gap-1 text-sm">
                  <span className="font-medium text-ink">{goal.currentStars}</span>
                  <span className="text-muted">/ {goal.targetStars} ★</span>
                </div>

                {goal.rewardText && (
                  <p className="line-clamp-2 text-sm text-muted">🎁 {goal.rewardText}</p>
                )}

                <p className="text-xs text-muted">
                  {goal.startDate} ~ {goal.endDate}
                </p>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openForm(goal)}>
                    <Pencil className="h-3.5 w-3.5" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                    onClick={async () => {
                      if (await confirm('删除目标？', '将移除此家庭目标，无法恢复。')) {
                        m.remove.mutate(goal.id)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {formOpen && (
        <GoalFormDialog
          key={editingGoal?.id ?? 'new'}
          open
          onClose={closeForm}
          goal={editingGoal}
          onSubmit={(dto: CreateUpdateFamilyGoalDto) => {
            if (editingGoal) {
              m.update.mutate({ id: editingGoal.id, dto }, { onSuccess: closeForm })
            } else {
              m.create.mutate(dto, { onSuccess: closeForm })
            }
          }}
          isPending={m.create.isPending || m.update.isPending}
        />
      )}
    </div>
  )
}
