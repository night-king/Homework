import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Map } from 'lucide-react'
import { useSharedJourneys, useSharedJourneyMutations } from '@/hooks/useJourneys'
import { useActiveMedals } from '@/hooks/useCatalog'
import { useConfirm } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SharedJourneyDto } from '@/types/homework'

const STATUS_LABEL: Record<number, string> = { 0: 'journeys.statusDraft', 1: 'journeys.statusActive' }
const STATUS_VARIANT: Record<number, 'secondary' | 'default'> = { 0: 'secondary', 1: 'default' }

export function JourneysPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const { data: journeys = [], isLoading } = useSharedJourneys()
  const { data: medals = [] } = useActiveMedals()
  const m = useSharedJourneyMutations()

  const medalName = (j: SharedJourneyDto) => medals.find((md) => md.id === j.medalId)?.name ?? '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{t('journeys.title')}</h1>
        <Button data-testid="create-journey" onClick={() => navigate('/journeys/new')}>
          <Plus className="h-4 w-4" /> {t('journeys.create')}
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted">{t('common.loading')}</div>
      ) : journeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 p-12 text-center">
          <Map className="mx-auto mb-4 h-12 w-12 text-muted" />
          <p className="text-muted">{t('journeys.empty')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journeys.map((j) => (
            <Card key={j.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-semibold text-ink">{j.title}</h3>
                  <Badge data-testid={`journey-status-${j.id}`} variant={STATUS_VARIANT[j.status]} className="shrink-0 text-xs">
                    {t(STATUS_LABEL[j.status])}
                  </Badge>
                </div>
                <div className="text-sm text-muted">{j.startDate} → {j.endDate}</div>
                <div className="text-sm text-ink">🏅 {medalName(j)}</div>
                {/* 草稿与进行中都可编辑（进行中改动只对未来日生效，已生成任务是快照不受影响）。
                    删除仅草稿可见——进行中删除会连带清掉孩子进度，后端也会拒绝。 */}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" data-testid={`edit-journey-${j.id}`}
                    onClick={() => navigate(`/journeys/${j.id}/edit`)}>
                    <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
                  </Button>
                  {j.status === 0 && (
                    <Button size="sm" variant="ghost" data-testid={`delete-journey-${j.id}`}
                      className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                      onClick={async () => {
                        if (await confirm(t('journeys.deleteConfirmTitle'), t('journeys.deleteConfirmBody'))) {
                          m.remove.mutate(j.id)
                        }
                      }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
