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
import { cn } from '@/lib/utils'
import type { ChildProfileDto, CreateChildDto } from '@/types/homework'

const AVATAR_PRESETS = ['🐼', '🦊', '🐯', '🐸', '🐧', '🦁']

interface ChildFormDialogProps {
  open: boolean
  onClose: () => void
  child: ChildProfileDto | null
  onSubmit: (dto: CreateChildDto) => void
  isPending: boolean
}

export function ChildFormDialog({ open, onClose, child, onSubmit, isPending }: ChildFormDialogProps) {
  const isEdit = !!child
  const [displayName, setDisplayName] = useState(child?.displayName ?? '')
  const [grade, setGrade] = useState(child?.grade ?? 1)
  const [avatarKey, setAvatarKey] = useState<string | null>(child?.avatarKey ?? null)
  const [nameError, setNameError] = useState('')

  const validate = (): boolean => {
    if (!displayName.trim()) {
      setNameError('请输入名字')
      return false
    }
    if (displayName.trim().length > 32) {
      setNameError('名字最多 32 个字符')
      return false
    }
    setNameError('')
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ displayName: displayName.trim(), grade, avatarKey })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑孩子档案' : '添加孩子'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="child-name">
              名字 <span className="text-error-500">*</span>
            </Label>
            <Input
              id="child-name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setNameError('')
              }}
              maxLength={32}
              placeholder="孩子的名字或昵称"
            />
            {nameError && <p className="text-xs text-error-500">{nameError}</p>}
          </div>

          <div className="space-y-1">
            <Label>年级</Label>
            <Select value={String(grade)} onValueChange={(v) => setGrade(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    {g} 年级
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>头像（可选）</Label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarKey(avatarKey === emoji ? null : emoji)}
                  className={cn(
                    'h-10 w-10 rounded-lg border-2 text-xl transition-colors',
                    avatarKey === emoji
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-ink/15 hover:border-brand-500/50',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
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
