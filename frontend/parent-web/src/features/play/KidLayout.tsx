import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import './kid.css'

export function KidLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)

  if (isInitializing) return <div className="kid-shell kid-center">{t('play.loading')}</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="kid-shell">
      <button
        type="button"
        data-testid="kid-exit"
        className="kid-exit"
        onClick={() => navigate('/children')}
      >
        ↩ {t('play.backToParent')}
      </button>
      <Outlet />
    </div>
  )
}
