import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ChildProfileDto, SetChildPinDto } from '@/types/homework'

interface SetPinDialogProps {
  open: boolean
  onClose: () => void
  child: ChildProfileDto
  onSubmit: (dto: SetChildPinDto) => void
  isPending: boolean
}

export function SetPinDialog({ open, onClose, child, onSubmit, isPending }: SetPinDialogProps) {
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')

  const handleSetPin = () => {
    if (!/^\d{4}$/.test(pin)) {
      setPinError('PIN 必须为 4 位数字')
      return
    }
    setPinError('')
    onSubmit({ pin })
  }

  const handleClearPin = () => {
    onSubmit({ pin: null })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>设置 PIN — {child.displayName}</DialogTitle>
          <DialogDescription>PIN 码用于孩子在游戏端登录时验证身份</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pin-input">4 位数字 PIN</Label>
            <Input
              id="pin-input"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                setPinError('')
              }}
              placeholder="0000"
              maxLength={4}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            {pinError && <p className="text-xs text-error-500">{pinError}</p>}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
          {child.hasPin && (
            <Button
              type="button"
              variant="ghost"
              className="text-sm text-muted hover:text-ink"
              onClick={handleClearPin}
              disabled={isPending}
            >
              清除 PIN
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              取消
            </Button>
            <Button onClick={handleSetPin} disabled={isPending || pin.length !== 4}>
              {isPending ? '保存中…' : '设置 PIN'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
