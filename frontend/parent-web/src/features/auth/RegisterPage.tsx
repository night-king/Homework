import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getErrorMessage } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterPage() {
  const nav = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [userName, setUserName] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) return
    setBusy(true)
    try {
      await register({ userName, emailAddress, password })
      nav('/home')
    } catch (err) {
      const msg = getErrorMessage(err, '')
      // Catch email-confirmation branch: ABP returns error when email verification required
      if (msg.toLowerCase().includes('confirm') || msg.toLowerCase().includes('激活') || msg.toLowerCase().includes('验证')) {
        toast.info('注册成功，请查收邮件完成验证后再登录')
        nav('/login')
      } else {
        toast.error(msg || '注册失败，请稍后再试')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-bold text-brand-600">注册家长号</h1>
        <div className="space-y-1">
          <Label>用户名</Label>
          <Input value={userName} onChange={(e) => setUserName(e.target.value)} required maxLength={32} />
        </div>
        <div className="space-y-1">
          <Label>电子邮箱</Label>
          <Input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>密码</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink/20 accent-brand-500"
          />
          <label htmlFor="consent" className="text-muted leading-relaxed cursor-pointer select-none">
            我已阅读并同意{' '}
            <a href="#" className="text-brand-600 hover:underline">《儿童隐私与家长同意声明》</a>
          </label>
        </div>
        <Button type="submit" disabled={busy || !consent} className="w-full">
          {busy ? '注册中…' : '注册'}
        </Button>
        <p className="text-center text-sm text-muted">
          已有账号？{' '}
          <Link to="/login" className="text-brand-600 hover:underline">登录</Link>
        </p>
      </form>
    </div>
  )
}
