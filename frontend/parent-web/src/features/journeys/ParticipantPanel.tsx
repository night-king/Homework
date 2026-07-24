import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, UserMinus, Check } from 'lucide-react'
import { useChildren } from '@/hooks/useChildren'
import { useParticipantMutations } from '@/hooks/useJourneys'
import { useConfirm } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'

/**
 * 参与者面板：勾选孩子后「加入计划」（幂等，后端跳过已在的），或逐个「移出」。
 * 说明：后端未提供“列出参与者”接口，故无法预先反映当前成员——面板以显式加/移操作为准。
 */
export function ParticipantPanel({ sharedJourneyId }: { sharedJourneyId: string }) {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const { data: children = [] } = useChildren()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const m = useParticipantMutations(sharedJourneyId)

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const addSelected = () => {
    if (selected.size === 0) return
    m.add.mutate([...selected], { onSuccess: () => setSelected(new Set()) })
  }

  if (children.length === 0) {
    return <p data-testid="participants-empty" className="text-sm text-muted">{t('journeys.participantsNoChildren')}</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('journeys.participantsHint')}</p>
      <div className="space-y-2">
        {children.map((c) => {
          const on = selected.has(c.id)
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-ink/10 p-3">
              <button type="button" data-testid={`participant-toggle-${c.id}`}
                onClick={() => toggle(c.id)}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded border ${
                  on ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink/25 text-transparent'}`}>
                <Check className="h-4 w-4" />
              </button>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{c.displayName}</span>
              <Button size="sm" variant="ghost" data-testid={`participant-remove-${c.id}`}
                className="text-error-500 hover:bg-error-500/10 hover:text-error-500"
                onClick={async () => {
                  if (await confirm(t('journeys.removeParticipantTitle'), t('journeys.removeParticipantBody'))) {
                    m.remove.mutate(c.id)
                  }
                }}>
                <UserMinus className="h-3.5 w-3.5" /> {t('journeys.removeParticipant')}
              </Button>
            </div>
          )
        })}
      </div>
      <Button data-testid="participants-add" disabled={selected.size === 0 || m.add.isPending} onClick={addSelected}>
        <UserPlus className="h-4 w-4" /> {t('journeys.addParticipants')}
      </Button>
    </div>
  )
}
