import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { UserMenu } from '@/components/UserMenu'
import { Home, Users, CalendarDays, ClipboardCheck, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const nav = [
  { to: '/home', icon: Home, key: 'nav.home' },
  { to: '/children', icon: Users, key: 'nav.children' },
  { to: '/schedule', icon: CalendarDays, key: 'nav.schedule' },
  { to: '/board', icon: ClipboardCheck, key: 'nav.board' },
  { to: '/goals', icon: Target, key: 'nav.goals' },
]

export function AppLayout() {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  if (isInitializing) return <div className="grid h-full place-items-center text-muted">加载中…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex h-full">
      <aside className="hidden w-60 flex-col gap-1 border-r border-ink/10 bg-white p-4 lg:flex">
        <div className="mb-4 px-2 text-lg font-bold text-brand-600">学习小伙伴</div>
        {nav.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 font-medium ${isActive ? 'bg-brand-50 text-brand-600' : 'text-ink hover:bg-ink/5'}`}>
            <Icon size={18} /> {t(key)}
          </NavLink>
        ))}
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-end gap-3 border-b border-ink/10 bg-white px-6 py-3">
          <LanguageSwitcher /> <UserMenu />
        </header>
        <main className="flex-1 overflow-auto p-6"><Outlet /></main>
      </div>
    </div>
  )
}
