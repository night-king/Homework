import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { resetPassword } from '@/services/authService'
import { getErrorMessage } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResetPasswordPage() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId') ?? ''
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('两次输入的密码不一致')
      return
    }
    if (!userId || !token) {
      toast.error('重置链接无效或已过期')
      return
    }
    setBusy(true)
    try {
      await resetPassword(userId, token, password)
      toast.success('密码已重置，请重新登录')
      nav('/login')
    } catch (err) {
      toast.error(getErrorMessage(err, '重置失败，请重新申请重置链接'))
    } finally {
      setBusy(false)
    }
  }

  if (!userId || !token) {
    return (
      <div className="grid h-full place-items-center p-4">
        <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-soft text-center">
          <p className="text-muted">重置链接无效或已过期。</p>
          <Link to="/forgot-password" className="text-brand-600 hover:underline text-sm">
            重新申请重置
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-full place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-bold text-brand-600">重置密码</h1>
        <div className="space-y-1">
          <Label>新密码</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>确认新密码</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? '重置中…' : '重置密码'}
        </Button>
      </form>
    </div>
  )
}
