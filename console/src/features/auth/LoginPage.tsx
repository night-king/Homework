import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getErrorMessage } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const nav = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true)
    try { await login(userName, password); nav('/home') }
    catch (err) { toast.error(getErrorMessage(err, '登录失败，请检查账号密码')) }
    finally { setBusy(false) }
  }
  return (
    <div className="grid h-full place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-bold text-brand-600">登录</h1>
        <div className="space-y-1"><Label>用户名</Label><Input value={userName} onChange={(e) => setUserName(e.target.value)} required /></div>
        <div className="space-y-1"><Label>密码</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? '登录中…' : '登录'}</Button>
        <div className="flex justify-between text-sm text-muted">
          <Link to="/register" className="hover:text-brand-600">注册家长号</Link>
          <Link to="/forgot-password" className="hover:text-brand-600">忘记密码？</Link>
        </div>
      </form>
    </div>
  )
}
