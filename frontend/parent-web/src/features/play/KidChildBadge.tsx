import { useTranslation } from 'react-i18next'
import { useChildren } from '@/hooks/useChildren'

/** 孩子端持久身份芯片：头像 emoji + 名字 + 年级。找不到孩子（加载中/无此 id）则不渲染。 */
export function KidChildBadge({ childId }: { childId: string }) {
  const { t } = useTranslation()
  const { data: children } = useChildren()
  const child = children?.find((c) => c.id === childId)
  if (!child) return null

  return (
    <div className="kid-child-badge" data-testid="kid-child-badge">
      <span className="kid-child-badge-avatar" aria-hidden="true">{child.avatarKey || '🐼'}</span>
      <span className="kid-child-badge-meta">
        <span className="kid-child-badge-name">{child.displayName}</span>
        <span className="kid-child-badge-grade" data-testid="kid-child-badge-grade">
          {t('play.gradeLabel', { n: child.grade })}
        </span>
      </span>
    </div>
  )
}
