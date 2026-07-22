import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useChildren } from '@/hooks/useChildren'
import { KidChildBadge } from './KidChildBadge'
import { KidPinGate } from './KidPinGate'
import { usePinGate } from './pinGate'

import './kid.css'

// 进某个孩子乐园前的 PIN 门：该孩子设了 PIN 且本次未验证 → 拦成 KidPinGate。
// 独立成组件，好让 useChildren 只在有 childId 时才挂（KidLayout 在 /play 无 childId，不触发查询）。
function KidGate({ childId }: { childId: string }) {
  const { t } = useTranslation()
  const { data: children, isLoading } = useChildren()
  const verified = usePinGate((s) => !!s.verified[childId])

  if (verified) return <Outlet />
  if (isLoading) return <div className="kid-center">{t('play.loading')}</div>
  const child = children?.find((c) => c.id === childId)
  if (child?.hasPin) {
    return <KidPinGate childId={childId} childName={child.displayName} avatar={child.avatarKey} />
  }
  return <Outlet />
}

export function KidLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { childId } = useParams()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)

  if (isInitializing) return <div className="kid-shell kid-center">{t('play.loading')}</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="kid-shell">
      <header className="kid-header">
        <div className="kid-header-left">
          {childId ? <KidChildBadge childId={childId} /> : null}
        </div>
        <button
          type="button"
          data-testid="kid-exit"
          className="kid-exit"
          // 退出即清验证态：回来重进要再验一次 PIN
          onClick={() => { usePinGate.getState().reset(); navigate('/children') }}
        >
          ↩ {t('play.backToParent')}
        </button>
      </header>
      <div className="kid-scroll">
        {childId ? <KidGate childId={childId} /> : <Outlet />}
      </div>
    </div>
  )
}
