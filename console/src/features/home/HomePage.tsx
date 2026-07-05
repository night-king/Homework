import { Link } from 'react-router-dom'
import { useChildren } from '@/hooks/useChildren'
import { useDailyBoard } from '@/hooks/useDailyBoard'
import { useGoals } from '@/hooks/useGoals'
import { ProgressBar } from '@/components/ProgressBar'
import { StarRating } from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ChildProfileDto } from '@/types/homework'

const today = new Date().toISOString().slice(0, 10)

interface ChildTodayCardProps {
  child: ChildProfileDto
}

function ChildTodayCard({ child }: ChildTodayCardProps) {
  const { data: board, isLoading } = useDailyBoard(child.id, today)

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{child.avatarKey ?? '🐼'}</div>
          <div className="flex-1 min-w-0">
            <div className="truncate font-semibold text-ink">{child.displayName}</div>
            <div className="text-sm text-muted">{child.grade} 年级</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted">加载中…</div>
        ) : board ? (
          <>
            <StarRating stars={board.stars} />
            <div className="text-sm text-muted">
              今日 {board.tasksCompleted}/{board.tasksTotal} 完成
              {board.isFull && (
                <span className="ml-2 font-semibold text-brand-600">满勤 🎉</span>
              )}
              {board.isRestDay && <span className="ml-2">（休息日）</span>}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted">暂无数据</div>
        )}

        <Link to="/board">
          <Button size="sm" variant="outline" className="w-full">
            查看看板
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  const { data: children = [], isLoading: childrenLoading } = useChildren()
  const { data: goals = [], isLoading: goalsLoading } = useGoals()

  return (
    <div className="space-y-8">
      {/* Today's boards */}
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-ink">今日看板</h1>
        {childrenLoading ? (
          <div className="py-8 text-center text-muted">加载中…</div>
        ) : children.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/20 p-10 text-center text-muted">
            请先在「孩子」页面添加孩子档案
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <ChildTodayCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </section>

      {/* Family goals */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-ink">家庭目标</h2>
        {goalsLoading ? (
          <div className="py-4 text-center text-muted">加载中…</div>
        ) : goals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/20 p-8 text-center text-muted">
            还没有家庭目标
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink truncate">{goal.title}</h3>
                    {goal.isAchieved && (
                      <span className="shrink-0 text-sm font-semibold text-brand-600">
                        已达成 🎉
                      </span>
                    )}
                  </div>
                  <ProgressBar percent={goal.progressPercent} />
                  <div className="text-sm text-muted">
                    {goal.currentStars} / {goal.targetStars} ★
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
