import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useChildren } from '@/hooks/useChildren'

export function KidPickChildPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: children = [], isLoading } = useChildren()

  return (
    <div className="kid-pick">
      <h1 className="kid-pick-title">{t('play.pickChildTitle')}</h1>
      <button
        type="button"
        data-testid="kid-pk-entry"
        className="pk-entry"
        onClick={() => navigate('/play/pk')}
      >
        🏆 本周 PK 榜
      </button>
      {isLoading ? (
        <div className="kid-center">{t('play.loading')}</div>
      ) : (
        <div className="kid-pick-grid">
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`pick-child-${c.id}`}
              className="kid-pick-card"
              onClick={() => navigate('/play/' + c.id)}
            >
              <span className="kid-pick-avatar">{c.avatarKey ?? '🐼'}</span>
              <span className="kid-pick-name">{c.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
