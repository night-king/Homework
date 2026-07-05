import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useChildren } from '@/hooks/useChildren'
import { useDailyBoard, useBoardMutations } from '@/hooks/useDailyBoard'
import { useConfirm } from '@/components/ConfirmDialog'
import { StarRating } from '@/components/StarRating'
import { DailyTaskDialog } from './DailyTaskDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DailyTaskDto } from '@/types/homework'

export function DailyBoardPage() {
  const { data: children = [], isLoading: childrenLoading } = useChildren()
  const [childId, setChildId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const effectiveChildId = childId || children[0]?.id || ''

  const { data: board, isLoading: boardLoading } = useDailyBoard(effectiveChildId, date)
  const m = useBoardMutations(effectiveChildId, date)
  const confirm = useConfirm()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<DailyTaskDto | null>(null)

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingTask(null)
  }

  const openCreate = () => {
    setEditingTask(null)
    setDialogOpen(true)
  }

  const openEdit = (task: DailyTaskDto) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const sortedTasks = [...(board?.tasks ?? [])].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">每日看板</h1>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {children.length > 0 && (
            <Select value={effectiveChildId} onValueChange={setChildId}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="选择孩子" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.avatarKey ?? '🐼'} {c.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 focus-visible:border-brand-500/50"
          />
          <Button onClick={openCreate} disabled={!effectiveChildId}>
            <Plus className="h-4 w-4" />
            手动添加任务
          </Button>
        </div>
      </div>

      {/* Content */}
      {childrenLoading ? (
        <div className="py-12 text-center text-muted">加载中…</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 p-12 text-center text-muted">
          请先在「孩子」页面添加孩子档案
        </div>
      ) : boardLoading ? (
        <div className="py-12 text-center text-muted">加载中…</div>
      ) : !board ? (
        <div className="py-12 text-center text-muted">无法加载看板数据</div>
      ) : (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
            <StarRating stars={board.stars} />
            <span className="font-medium text-ink">
              {board.tasksCompleted} / {board.tasksTotal} 完成
            </span>
            {board.isRestDay && (
              <Badge variant="secondary" className="text-sm">
                休息日
              </Badge>
            )}
            {board.isFull && (
              <span className="font-semibold text-brand-600">满勤 🎉</span>
            )}
          </div>

          {/* Task list */}
          {sortedTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink/20 p-10 text-center text-muted">
              今日暂无任务
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTasks.map((task) => {
                const isRevoked = task.isCompleted && task.reviewState === 1
                const isCompleted = task.countsAsCompleted

                return (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Status badge */}
                        {isCompleted ? (
                          <Badge variant="success">已完成</Badge>
                        ) : isRevoked ? (
                          <Badge variant="secondary" className="text-muted">
                            已撤销
                          </Badge>
                        ) : (
                          <Badge variant="outline">未完成</Badge>
                        )}

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <span
                            className={
                              isRevoked
                                ? 'text-muted line-through'
                                : 'font-medium text-ink'
                            }
                          >
                            {task.title}
                          </span>
                          {task.subject && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {task.subject}
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {isCompleted && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => m.revoke.mutate(task.id)}
                              disabled={m.revoke.isPending}
                            >
                              撤销
                            </Button>
                          )}
                          {isRevoked && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => m.restore.mutate(task.id)}
                              disabled={m.restore.isPending}
                            >
                              恢复
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(task)}
                            title="编辑"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-error-500 hover:bg-error-500/10 hover:text-error-500"
                            onClick={async () => {
                              if (await confirm('删除任务？', '删除后无法恢复。')) {
                                m.remove.mutate(task.id)
                              }
                            }}
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <DailyTaskDialog
          key={editingTask?.id ?? 'new'}
          open
          onClose={closeDialog}
          task={editingTask}
          defaultOrder={sortedTasks.length}
          onSubmit={(vals) => {
            if (editingTask) {
              m.update.mutate(
                {
                  id: editingTask.id,
                  dto: {
                    title: vals.title,
                    subject: vals.subject.trim() || null,
                    order: vals.order,
                  },
                },
                { onSuccess: closeDialog },
              )
            } else {
              m.create.mutate(
                {
                  childId: effectiveChildId,
                  date,
                  title: vals.title,
                  subject: vals.subject.trim() || null,
                  order: vals.order,
                },
                { onSuccess: closeDialog },
              )
            }
          }}
          isPending={m.create.isPending || m.update.isPending}
        />
      )}
    </div>
  )
}
