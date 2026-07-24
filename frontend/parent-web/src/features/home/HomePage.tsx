import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useChildren } from '@/hooks/useChildren'
import { useJourneys } from '@/hooks/useJourneys'
import { useDailyBoard } from '@/hooks/useDailyBoard'
import { StarRating } from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ChildProfileDto } from '@/types/homework'

const today = new Date().toISOString().slice(0, 10)

function ChildJourneyCard({ child }: { child: ChildProfileDto }) {
  const { t } = useTranslation()
  const { data: journeys = [] } = useJourneys(child.id)
  const { data: board } = useDailyBoard(child.id, today)
  const active = journeys.find((j) => j.status === 1)

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{child.avatarKey ?? '🐼'}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-ink">{child.displayName}</div>
            <div className="text-sm text-muted">{child.grade} {t('children.grade')}</div>
          </div>
        </div>

        {active ? (
          <>
            <div className="font-medium text-ink">{active.title}</div>
            <div className="text-sm text-muted">{t('journeys.level')} {active.currentLevel} · {active.startDate} → {active.endDate}</div>
            {board && (
              <>
                <StarRating stars={board.stars} />
                <div className="text-sm text-muted">
                  {board.tasksCompleted}/{board.tasksTotal}
                  {board.isFull && <span className="ml-2 font-semibold text-brand-600">{t('board.fullAttendance')}</span>}
                </div>
              </>
            )}
            <Link to="/board"><Button size="sm" variant="outline" className="w-full">{t('board.title')}</Button></Link>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('journeys.empty')}</p>
            <Link to="/journeys/new">
              <Button size="sm" className="w-full">{t('journeys.create')}</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  const { t } = useTranslation()
  const { data: children = [], isLoading } = useChildren()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t('nav.home')}</h1>
      {isLoading ? (
        <div className="py-8 text-center text-muted">{t('common.loading')}</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 p-10 text-center text-muted">
          {t('journeys.noChildren')}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <ChildJourneyCard key={child.id} child={child} />
          ))}
        </div>
      )}
    </div>
  )
}
