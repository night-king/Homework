import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Award } from 'lucide-react'
import { useAdminMedals, useMedalMutations } from '@/hooks/useAdminMedals'
import { useConfirm } from '@/components/ConfirmDialog'
import { MedalDialog } from './MedalDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MedalDto, CreateUpdateMedalDto } from '@/types/homework'

export function MedalsPanel() {
  const { t } = useTranslation()
  const { data: medals = [], isLoading } = useAdminMedals()
  const m = useMedalMutations()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MedalDto | null>(null)
  const openForm = (md: MedalDto | null) => { setEditing(md); setOpen(true) }
  const close = () => { setOpen(false); setEditing(null) }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button data-testid="medal-create" onClick={() => openForm(null)}><Plus className="h-4 w-4" /> {t('catalog.create')}</Button>
      </div>
      {isLoading ? <div className="py-8 text-center text-muted">{t('common.loading')}</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {medals.map((md) => (
            <Card key={md.id}><CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                {md.imageUrl ? <img src={md.imageUrl} alt={md.name} className="h-7 w-7 rounded object-cover" /> : <Award className="h-6 w-6 text-muted" />}
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{md.name}</span>
                <Badge variant={md.isActive ? 'success' : 'secondary'} className="text-xs">{md.isActive ? t('catalog.active') : t('catalog.inactive')}</Badge>
              </div>
              {md.description && <div className="text-sm text-muted line-clamp-2">{md.description}</div>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" data-testid={`medal-edit-${md.id}`} onClick={() => openForm(md)}><Pencil className="h-3.5 w-3.5" /> {t('catalog.edit')}</Button>
                <Button size="sm" variant="ghost" className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                  data-testid={`medal-delete-${md.id}`}
                  onClick={async () => { if (await confirm(t('catalog.deleteConfirmTitle'), t('catalog.deleteConfirmBody'))) m.remove.mutate(md.id) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {open && (
        <MedalDialog key={editing?.id ?? 'new'} open onClose={close} medal={editing}
          isPending={m.create.isPending || m.update.isPending}
          onUploadImage={editing ? (file) => m.uploadImage.mutateAsync({ id: editing.id, file }).then(() => undefined) : undefined}
          onSubmit={(dto: CreateUpdateMedalDto) => {
            if (editing) m.update.mutate({ id: editing.id, dto }, { onSuccess: close })
            else m.create.mutate(dto, { onSuccess: close })
          }} />
      )}
    </div>
  )
}
