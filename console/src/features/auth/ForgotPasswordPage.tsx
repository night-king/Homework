import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { sendPasswordResetLink } from '@/services/authService'
import { getErrorMessage } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await sendPasswordResetLink(email)
      setSent(true)
      toast.success('若邮箱存在，已发送重置链接，请查收邮件')
    } catch (err) {
      toast.error(getErrorMessage(err, '发送失败，请稍后再试'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full place-items-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-bold text-brand-600">忘记密码</h1>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">重置链接已发送，请查收邮件并按提示操作。</p>
            <Link to="/login" className="block text-center text-sm text-brand-600 hover:underline">
              返回登录
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>注册邮箱</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? '发送中…' : '发送重置链接'}
            </Button>
            <p className="text-center text-sm">
              <Link to="/login" className="text-muted hover:text-brand-600">
                返回登录
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
