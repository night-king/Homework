/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { DayOfWeek, WeeklyTaskTemplateItemDto } from '@/types/homework'

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
}
const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]

export interface TemplateFormValues {
  dayOfWeek: DayOfWeek
  title: string
  subject: string
  order: number
  estimatedMinutes: string
  isActive: boolean
}

interface TemplateItemDialogProps {
  open: boolean
  onClose: () => void
  item?: WeeklyTaskTemplateItemDto | null
  defaultDayOfWeek?: DayOfWeek
  defaultOrder?: number
  onSubmit: (vals: TemplateFormValues) => void
  isPending: boolean
}

export function TemplateItemDialog({
  open,
  onClose,
  item,
  defaultDayOfWeek = 1,
  defaultOrder = 0,
  onSubmit,
  isPending,
}: TemplateItemDialogProps) {
  const isEdit = !!item
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(item?.dayOfWeek ?? defaultDayOfWeek)
  const [title, setTitle] = useState(item?.title ?? '')
  const [subject, setSubject] = useState(item?.subject ?? '')
  const [order, setOrder] = useState(item?.order ?? defaultOrder)
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    item?.estimatedMinutes != null ? String(item.estimatedMinutes) : '',
  )
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [titleError, setTitleError] = useState('')

  const validate = (): boolean => {
    if (!title.trim()) {
      setTitleError('请输入任务标题')
      return false
    }
    if (title.trim().length > 128) {
      setTitleError('标题最多 128 个字符')
      return false
    }
    setTitleError('')
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      dayOfWeek,
      title: title.trim(),
      subject: subject.trim(),
      order,
      estimatedMinutes,
      isActive,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑任务模板' : '新增任务模板'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1">
              <Label>星期</Label>
              <Select
                value={String(dayOfWeek)}
                onValueChange={(v) => setDayOfWeek(Number(v) as DayOfWeek)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_ORDER.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {DAY_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="tmpl-title">
              任务标题 <span className="text-error-500">*</span>
            </Label>
            <Input
              id="tmpl-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleError('')
              }}
              maxLength={128}
              placeholder="例如：数学作业"
            />
            {titleError && <p className="text-xs text-error-500">{titleError}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="tmpl-subject">科目（可选）</Label>
            <Input
              id="tmpl-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={64}
              placeholder="例如：数学"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tmpl-order">排序</Label>
              <Input
                id="tmpl-order"
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tmpl-minutes">预计时长（分钟）</Label>
              <Input
                id="tmpl-minutes"
                type="number"
                min={1}
                max={600}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="可选"
              />
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <Switch id="tmpl-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="tmpl-active">启用此任务</Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中…' : isEdit ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
