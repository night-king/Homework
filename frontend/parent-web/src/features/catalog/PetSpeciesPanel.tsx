import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Power } from 'lucide-react'
import { useAdminPetSpecies, usePetSpeciesMutations } from '@/hooks/useAdminPetSpecies'
import { useConfirm } from '@/components/ConfirmDialog'
import { PetSpeciesCreateDialog } from './PetSpeciesCreateDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PetSpeciesDto } from '@/types/homework'

const spriteCount = (p: PetSpeciesDto) => p.forms.filter((f) => f.spriteUrl).length

export function PetSpeciesPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: species = [], isLoading } = useAdminPetSpecies()
  const m = usePetSpeciesMutations()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button data-testid="pet-create" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('catalog.create')}</Button>
      </div>
      {isLoading ? <div className="py-8 text-center text-muted">{t('common.loading')}</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {species.map((p) => (
            <Card key={p.id}><CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                {p.coverUrl ? <img src={p.coverUrl} alt={p.name} className="h-10 w-10 rounded-lg object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink/5 text-lg">🐣</div>}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{p.name}</div>
                  <div className="text-xs text-muted">{p.code}</div>
                </div>
                <Badge variant={p.isActive ? 'success' : 'secondary'} className="text-xs">{p.isActive ? t('catalog.active') : t('catalog.inactive')}</Badge>
              </div>
              <div className="text-sm text-muted">{t('catalog.sprite')} <span data-testid={`pet-completeness-${p.id}`}>{spriteCount(p)}/5</span></div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" data-testid={`pet-edit-${p.id}`} onClick={() => navigate(`/catalog/pets/${p.id}`)}><Pencil className="h-3.5 w-3.5" /> {t('catalog.edit')}</Button>
                <Button size="sm" variant="outline" data-testid={`pet-toggle-${p.id}`}
                  onClick={() => (p.isActive ? m.deactivate.mutate(p.id) : m.activate.mutate(p.id))}>
                  <Power className="h-3.5 w-3.5" /> {p.isActive ? t('catalog.inactive') : t('catalog.active')}
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                  data-testid={`pet-delete-${p.id}`}
                  onClick={async () => { if (await confirm(t('catalog.deleteConfirmTitle'), t('catalog.deleteConfirmBody'))) m.remove.mutate(p.id) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {open && (
        <PetSpeciesCreateDialog open onClose={() => setOpen(false)} isPending={m.create.isPending}
          onSubmit={(dto) => m.create.mutate(dto, { onSuccess: (created) => { setOpen(false); navigate(`/catalog/pets/${created.id}`) } })} />
      )}
    </div>
  )
}
