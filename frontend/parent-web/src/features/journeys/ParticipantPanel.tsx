import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, UserMinus, Check } from 'lucide-react'
import { useChildren } from '@/hooks/useChildren'
import { useParticipants, useParticipantMutations } from '@/hooks/useJourneys'
import { useConfirm } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'

/**
 * 参与者面板：
 *  - 上半区「已加入的孩子」：读取当前成员，标注「已开始/未开始」；仅未开始者可「移出」（幂等 + 二次确认）。
 *  - 下半区「可加入的孩子」：账户名下尚未加入的孩子，勾选后「加入计划」（幂等，后端跳过已在的）。
 */
export function ParticipantPanel({ sharedJourneyId }: { sharedJourneyId: string }) {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const { data: children = [] } = useChildren()
  const { data: participants = [] } = useParticipants(sharedJourneyId)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const m = useParticipantMutations(sharedJourneyId)

  const memberIds = new Set(participants.map((p) => p.childId))
  const available = children.filter((c) => !memberIds.has(c.id))

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
    <div className="space-y-6">
      {/* 已加入的孩子 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">{t('journeys.currentParticipants')}</h3>
        {participants.length === 0 ? (
          <p data-testid="participants-none" className="text-sm text-muted">{t('journeys.participantsNoneYet')}</p>
        ) : (
          participants.map((p) => (
            <div key={p.childId} data-testid={`participant-member-${p.childId}`}
              className="flex items-center gap-3 rounded-lg border border-ink/10 p-3">
              <div className="text-2xl">{p.avatarKey ?? '🐼'}</div>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{p.displayName}</span>
              <span data-testid={`participant-badge-${p.childId}`}
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  p.hasStarted ? 'bg-brand-600/10 text-brand-600' : 'bg-ink/5 text-muted'}`}>
                {p.hasStarted ? t('journeys.participantStarted') : t('journeys.participantNotStarted')}
              </span>
              {!p.hasStarted && (
                <Button size="sm" variant="ghost" data-testid={`participant-remove-${p.childId}`}
                  className="text-error-500 hover:bg-error-500/10 hover:text-error-500"
                  onClick={async () => {
                    if (await confirm(t('journeys.removeParticipantTitle'), t('journeys.removeParticipantBody'))) {
                      m.remove.mutate(p.childId)
                    }
                  }}>
                  <UserMinus className="h-3.5 w-3.5" /> {t('journeys.removeParticipant')}
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* 可加入的孩子 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">{t('journeys.availableChildren')}</h3>
        {available.length === 0 ? (
          <p data-testid="participants-all-added" className="text-sm text-muted">{t('journeys.participantsAllAdded')}</p>
        ) : (
          <>
            <p className="text-sm text-muted">{t('journeys.participantsHint')}</p>
            {available.map((c) => {
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
                </div>
              )
            })}
            <Button data-testid="participants-add" disabled={selected.size === 0 || m.add.isPending} onClick={addSelected}>
              <UserPlus className="h-4 w-4" /> {t('journeys.addParticipants')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
