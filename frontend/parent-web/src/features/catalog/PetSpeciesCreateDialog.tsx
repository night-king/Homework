import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CreateUpdatePetSpeciesDto } from '@/types/homework'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (dto: CreateUpdatePetSpeciesDto) => void
  isPending: boolean
}

export function PetSpeciesCreateDialog({ open, onClose, onSubmit, isPending }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [accentColor, setAccentColor] = useState('')
  const [description, setDescription] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) { setErr(t('catalog.code')); return }
    onSubmit({ name: name.trim(), code: code.trim(), accentColor: accentColor.trim() || null, description: description.trim() || null, displayOrder })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('catalog.create')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label>{t('catalog.name')} <span className="text-error-500">*</span></Label>
            <Input data-testid="pet-name-input" value={name} maxLength={64} onChange={(e) => { setName(e.target.value); setErr('') }} /></div>
          <div className="space-y-1"><Label>{t('catalog.code')} <span className="text-error-500">*</span></Label>
            <Input data-testid="pet-code-input" value={code} maxLength={64} onChange={(e) => { setCode(e.target.value); setErr('') }} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{t('catalog.accentColor')}</Label>
              <Input value={accentColor} maxLength={16} placeholder="#FF6B35" onChange={(e) => setAccentColor(e.target.value)} /></div>
            <div className="space-y-1"><Label>{t('catalog.displayOrder')}</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
          </div>
          <div className="space-y-1"><Label>{t('catalog.description')}</Label>
            <Textarea value={description} maxLength={512} rows={2} onChange={(e) => setDescription(e.target.value)} /></div>
          {err && <p className="text-xs text-error-500">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isPending}>{t('common.create')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
