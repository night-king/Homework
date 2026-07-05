import { useState } from 'react'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useChildren } from '@/hooks/useChildren'
import { useWeeklyTemplates, useWeeklyMutations } from '@/hooks/useWeeklyTemplates'
import { updateWeeklyTemplate } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { TemplateItemDialog } from './TemplateItemDialog'
import type { TemplateFormValues } from './TemplateItemDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  DayOfWeek,
  WeeklyTaskTemplateItemDto,
  CreateWeeklyTaskTemplateItemDto,
  UpdateWeeklyTaskTemplateItemDto,
} from '@/types/homework'

const DAYS: { label: string; dayOfWeek: DayOfWeek }[] = [
  { label: '周一', dayOfWeek: 1 },
  { label: '周二', dayOfWeek: 2 },
  { label: '周三', dayOfWeek: 3 },
  { label: '周四', dayOfWeek: 4 },
  { label: '周五', dayOfWeek: 5 },
  { label: '周六', dayOfWeek: 6 },
  { label: '周日', dayOfWeek: 0 },
]

type DialogState =
  | { mode: 'create'; dayOfWeek: DayOfWeek; defaultOrder: number }
  | { mode: 'edit'; item: WeeklyTaskTemplateItemDto }

export function WeeklyTemplatePage() {
  const { data: children = [], isLoading: childrenLoading } = useChildren()
  const [childId, setChildId] = useState('')
  const effectiveChildId = childId || children[0]?.id || ''

  const { data: templates = [], isLoading: templatesLoading } = useWeeklyTemplates(effectiveChildId)
  const m = useWeeklyMutations(effectiveChildId)
  const confirm = useConfirm()
  const qc = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogState, setDialogState] = useState<DialogState | null>(null)

  const closeDialog = () => {
    setDialogOpen(false)
    setDialogState(null)
  }

  const openCreate = (dayOfWeek: DayOfWeek, defaultOrder: number) => {
    setDialogState({ mode: 'create', dayOfWeek, defaultOrder })
    setDialogOpen(true)
  }

  const openEdit = (item: WeeklyTaskTemplateItemDto) => {
    setDialogState({ mode: 'edit', item })
    setDialogOpen(true)
  }

  const handleDialogSubmit = (vals: TemplateFormValues) => {
    if (!dialogState) return
    if (dialogState.mode === 'create') {
      const dto: CreateWeeklyTaskTemplateItemDto = {
        childId: effectiveChildId,
        dayOfWeek: vals.dayOfWeek,
        title: vals.title,
        subject: vals.subject.trim() || null,
        order: vals.order,
        estimatedMinutes: vals.estimatedMinutes ? Number(vals.estimatedMinutes) : null,
      }
      m.create.mutate(dto, { onSuccess: closeDialog })
    } else {
      const dto: UpdateWeeklyTaskTemplateItemDto = {
        title: vals.title,
        subject: vals.subject.trim() || null,
        order: vals.order,
        estimatedMinutes: vals.estimatedMinutes ? Number(vals.estimatedMinutes) : null,
        isActive: vals.isActive,
      }
      m.update.mutate({ id: dialogState.item.id, dto }, { onSuccess: closeDialog })
    }
  }

  const toggleActive = (item: WeeklyTaskTemplateItemDto) => {
    const dto: UpdateWeeklyTaskTemplateItemDto = {
      title: item.title,
      subject: item.subject ?? null,
      order: item.order,
      estimatedMinutes: item.estimatedMinutes ?? null,
      isActive: !item.isActive,
    }
    m.update.mutate({ id: item.id, dto })
  }

  const moveItem = async (
    dayItems: WeeklyTaskTemplateItemDto[],
    index: number,
    direction: 'up' | 'down',
  ) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const current = dayItems[index]
    const target = dayItems[targetIndex]
    if (!current || !target) return

    try {
      await updateWeeklyTemplate(current.id, {
        title: current.title,
        subject: current.subject ?? null,
        order: target.order,
        estimatedMinutes: current.estimatedMinutes ?? null,
        isActive: current.isActive,
      })
      await updateWeeklyTemplate(target.id, {
        title: target.title,
        subject: target.subject ?? null,
        order: current.order,
        estimatedMinutes: target.estimatedMinutes ?? null,
        isActive: target.isActive,
      })
      void qc.invalidateQueries({ queryKey: ['weekly', effectiveChildId] })
      toast.success('已保存')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">每周任务模板</h1>
        {children.length > 0 && (
          <Select value={effectiveChildId} onValueChange={setChildId}>
            <SelectTrigger className="w-40">
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
      </div>

      {/* States */}
      {childrenLoading ? (
        <div className="py-12 text-center text-muted">加载中…</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 p-12 text-center text-muted">
          请先在「孩子」页面添加孩子档案
        </div>
      ) : templatesLoading ? (
        <div className="py-12 text-center text-muted">加载中…</div>
      ) : (
        <div className="space-y-4">
          {DAYS.map(({ label, dayOfWeek }) => {
            const dayItems = [...templates.filter((t) => t.dayOfWeek === dayOfWeek)].sort(
              (a, b) => a.order - b.order,
            )
            return (
              <Card key={dayOfWeek}>
                <CardContent className="p-4">
                  {/* Day header */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold text-ink">{label}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openCreate(dayOfWeek, dayItems.length)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      添加
                    </Button>
                  </div>

                  {/* Items */}
                  {dayItems.length === 0 ? (
                    <p className="text-sm text-muted">暂无模板任务</p>
                  ) : (
                    <div className="space-y-2">
                      {dayItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-lg border border-ink/10 bg-paper px-3 py-2"
                        >
                          {/* isActive switch */}
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={() => toggleActive(item)}
                            aria-label="启用"
                          />

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <span
                              className={`font-medium ${item.isActive ? 'text-ink' : 'text-muted line-through'}`}
                            >
                              {item.title}
                            </span>
                            {item.subject && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {item.subject}
                              </Badge>
                            )}
                            {item.estimatedMinutes != null && (
                              <span className="ml-2 text-xs text-muted">
                                {item.estimatedMinutes} 分钟
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              disabled={idx === 0}
                              onClick={() => void moveItem(dayItems, idx, 'up')}
                              title="上移"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              disabled={idx === dayItems.length - 1}
                              onClick={() => void moveItem(dayItems, idx, 'down')}
                              title="下移"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openEdit(item)}
                              title="编辑"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-error-500 hover:bg-error-500/10 hover:text-error-500"
                              onClick={async () => {
                                if (
                                  await confirm('删除任务模板？', '删除后无法恢复。')
                                ) {
                                  m.remove.mutate(item.id)
                                }
                              }}
                              title="删除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && dialogState && (
        <TemplateItemDialog
          key={
            dialogState.mode === 'edit'
              ? dialogState.item.id
              : `create-${dialogState.dayOfWeek}`
          }
          open
          onClose={closeDialog}
          item={dialogState.mode === 'edit' ? dialogState.item : null}
          defaultDayOfWeek={
            dialogState.mode === 'create' ? dialogState.dayOfWeek : undefined
          }
          defaultOrder={
            dialogState.mode === 'create' ? dialogState.defaultOrder : undefined
          }
          onSubmit={handleDialogSubmit}
          isPending={m.create.isPending || m.update.isPending}
        />
      )}
    </div>
  )
}
