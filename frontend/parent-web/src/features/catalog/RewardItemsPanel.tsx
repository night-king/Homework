import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAdminRewardItems, useRewardItemMutations } from '@/hooks/useAdminRewardItems'
import { useConfirm } from '@/components/ConfirmDialog'
import { RewardItemDialog } from './RewardItemDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RewardItemDto, CreateUpdateRewardItemDto } from '@/types/homework'

export function RewardItemsPanel() {
  const { t } = useTranslation()
  const { data: items = [], isLoading } = useAdminRewardItems()
  const m = useRewardItemMutations()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RewardItemDto | null>(null)

  const openForm = (it: RewardItemDto | null) => { setEditing(it); setOpen(true) }
  const close = () => { setOpen(false); setEditing(null) }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button data-testid="reward-create" onClick={() => openForm(null)}><Plus className="h-4 w-4" /> {t('catalog.create')}</Button>
      </div>
      {isLoading ? <div className="py-8 text-center text-muted">{t('common.loading')}</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it.id}><CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{it.glyph ?? (it.iconUrl ? '🖼️' : '🎁')}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{it.name}</span>
                <Badge variant={it.isActive ? 'success' : 'secondary'} className="text-xs">{it.isActive ? t('catalog.active') : t('catalog.inactive')}</Badge>
              </div>
              <div className="text-sm text-muted">{t('catalog.growthValue')} {it.growthValue} · {t('catalog.randomWeight')} {it.randomWeight}</div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" data-testid={`reward-edit-${it.id}`} onClick={() => openForm(it)}><Pencil className="h-3.5 w-3.5" /> {t('catalog.edit')}</Button>
                <Button size="sm" variant="ghost" className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                  data-testid={`reward-delete-${it.id}`}
                  onClick={async () => { if (await confirm(t('catalog.deleteConfirmTitle'), t('catalog.deleteConfirmBody'))) m.remove.mutate(it.id) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {open && (
        <RewardItemDialog key={editing?.id ?? 'new'} open onClose={close} item={editing}
          isPending={m.create.isPending || m.update.isPending}
          onUploadIcon={editing ? (file) => m.uploadIcon.mutateAsync({ id: editing.id, file }).then(() => undefined) : undefined}
          onSubmit={(dto: CreateUpdateRewardItemDto) => {
            if (editing) m.update.mutate({ id: editing.id, dto }, { onSuccess: close })
            else m.create.mutate(dto, { onSuccess: close })
          }} />
      )}
    </div>
  )
}
