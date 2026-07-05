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
import type { DailyTaskDto } from '@/types/homework'

export interface DailyTaskFormValues {
  title: string
  subject: string
  order: number
}

interface DailyTaskDialogProps {
  open: boolean
  onClose: () => void
  task?: DailyTaskDto | null
  defaultOrder?: number
  onSubmit: (vals: DailyTaskFormValues) => void
  isPending: boolean
}

export function DailyTaskDialog({
  open,
  onClose,
  task,
  defaultOrder = 0,
  onSubmit,
  isPending,
}: DailyTaskDialogProps) {
  const isEdit = !!task
  const [title, setTitle] = useState(task?.title ?? '')
  const [subject, setSubject] = useState(task?.subject ?? '')
  const [order, setOrder] = useState(task?.order ?? defaultOrder)
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
    onSubmit({ title: title.trim(), subject: subject.trim(), order })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑任务' : '手动添加任务'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="task-title">
              任务标题 <span className="text-error-500">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleError('')
              }}
              maxLength={128}
              placeholder="例如：完成数学练习"
            />
            {titleError && <p className="text-xs text-error-500">{titleError}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-subject">科目（可选）</Label>
            <Input
              id="task-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例如：数学"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-order">排序</Label>
            <Input
              id="task-order"
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
            />
          </div>

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
