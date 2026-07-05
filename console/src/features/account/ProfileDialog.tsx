import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { myProfile, updateMyProfile } from '@/services/authService'
import { getErrorMessage } from '@/services/api'

interface ProfileDialogProps {
  open: boolean
  onClose: () => void
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [concurrencyStamp, setConcurrencyStamp] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    myProfile()
      .then((data: { userName?: string; email?: string; name?: string; surname?: string; concurrencyStamp?: string }) => {
        setUserName(data.userName ?? '')
        setEmail(data.email ?? '')
        setName(data.name ?? '')
        setSurname(data.surname ?? '')
        setConcurrencyStamp(data.concurrencyStamp ?? '')
      })
      .catch((e: unknown) => toast.error(getErrorMessage(e, '加载资料失败')))
      .finally(() => setLoading(false))
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateMyProfile({ userName, email, name, surname, concurrencyStamp })
      toast.success('资料已更新')
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>个人资料</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted">加载中…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="profile-username">用户名</Label>
              <Input
                id="profile-username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                maxLength={64}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-email">邮箱</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={256}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="profile-name">名字</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={64}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-surname">姓氏</Label>
                <Input
                  id="profile-surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  maxLength={64}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
