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
import { Textarea } from '@/components/ui/textarea'
import type { FamilyGoalDto, CreateUpdateFamilyGoalDto } from '@/types/homework'

interface GoalFormDialogProps {
  open: boolean
  onClose: () => void
  goal: FamilyGoalDto | null
  onSubmit: (dto: CreateUpdateFamilyGoalDto) => void
  isPending: boolean
}

export function GoalFormDialog({ open, onClose, goal, onSubmit, isPending }: GoalFormDialogProps) {
  const isEdit = !!goal
  const today = new Date().toISOString().slice(0, 10)

  const [title, setTitle] = useState(goal?.title ?? '')
  const [targetStars, setTargetStars] = useState(goal?.targetStars ?? 10)
  const [rewardText, setRewardText] = useState(goal?.rewardText ?? '')
  const [startDate, setStartDate] = useState(goal?.startDate ?? today)
  const [endDate, setEndDate] = useState(goal?.endDate ?? today)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = '请输入目标名称'
    else if (title.trim().length > 128) e.title = '目标名称最多 128 个字符'
    if (!targetStars || targetStars < 1) e.targetStars = '目标星星数最少 1'
    if (rewardText && rewardText.length > 256) e.rewardText = '奖励说明最多 256 个字符'
    if (!startDate) e.startDate = '请选择开始日期'
    if (!endDate) e.endDate = '请选择结束日期'
    else if (endDate < startDate) e.endDate = '结束日期不能早于开始日期'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      title: title.trim(),
      targetStars,
      rewardText: rewardText.trim() || null,
      startDate,
      endDate,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑家庭目标' : '新建家庭目标'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="goal-title">
              目标名称 <span className="text-error-500">*</span>
            </Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setErrors((prev) => ({ ...prev, title: '' }))
              }}
              maxLength={128}
              placeholder="例如：本月家庭目标"
            />
            {errors.title && <p className="text-xs text-error-500">{errors.title}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="goal-stars">
              目标星星数 <span className="text-error-500">*</span>
            </Label>
            <Input
              id="goal-stars"
              type="number"
              min={1}
              value={targetStars}
              onChange={(e) => {
                setTargetStars(Number(e.target.value))
                setErrors((prev) => ({ ...prev, targetStars: '' }))
              }}
            />
            {errors.targetStars && <p className="text-xs text-error-500">{errors.targetStars}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="goal-reward">奖励说明（可选）</Label>
            <Textarea
              id="goal-reward"
              value={rewardText}
              onChange={(e) => {
                setRewardText(e.target.value)
                setErrors((prev) => ({ ...prev, rewardText: '' }))
              }}
              maxLength={256}
              placeholder="达成目标后的奖励…"
              className="resize-none"
              rows={3}
            />
            {errors.rewardText && <p className="text-xs text-error-500">{errors.rewardText}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="goal-start">
                开始日期 <span className="text-error-500">*</span>
              </Label>
              <Input
                id="goal-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setErrors((prev) => ({ ...prev, startDate: '' }))
                }}
              />
              {errors.startDate && <p className="text-xs text-error-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="goal-end">
                结束日期 <span className="text-error-500">*</span>
              </Label>
              <Input
                id="goal-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setErrors((prev) => ({ ...prev, endDate: '' }))
                }}
              />
              {errors.endDate && <p className="text-xs text-error-500">{errors.endDate}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中…' : isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
