import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { FileUploadField } from './FileUploadField'
import type { MedalDto, CreateUpdateMedalDto } from '@/types/homework'

interface Props {
  open: boolean
  onClose: () => void
  medal: MedalDto | null
  onSubmit: (dto: CreateUpdateMedalDto) => void
  onUploadImage?: (file: File) => Promise<void>
  isPending: boolean
}

export function MedalDialog({ open, onClose, medal, onSubmit, onUploadImage, isPending }: Props) {
  const { t } = useTranslation()
  const isEdit = !!medal
  const [name, setName] = useState(medal?.name ?? '')
  const [description, setDescription] = useState(medal?.description ?? '')
  const [displayOrder, setDisplayOrder] = useState(medal?.displayOrder ?? 0)
  const [isActive, setIsActive] = useState(medal?.isActive ?? false)
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErr(t('catalog.name')); return }
    onSubmit({ name: name.trim(), description: description.trim() || null, displayOrder, isActive })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? t('catalog.edit') : t('catalog.create')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t('catalog.name')} <span className="text-error-500">*</span></Label>
            <Input data-testid="medal-name-input" value={name} maxLength={64} onChange={(e) => { setName(e.target.value); setErr('') }} />
            {err && <p className="text-xs text-error-500">{err}</p>}
          </div>
          <div className="space-y-1">
            <Label>{t('catalog.description')}</Label>
            <Textarea value={description} maxLength={512} rows={3} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1"><Label>{t('catalog.displayOrder')}</Label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
          <div className="flex items-center gap-2">
            <Switch id="medal-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="medal-active">{t('catalog.active')}</Label>
          </div>
          {isEdit && onUploadImage && (
            <FileUploadField testId="medal-image" label={t('catalog.image')} accept="image/*" kind="image"
              currentUrl={medal?.imageUrl} onUpload={onUploadImage} />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isPending}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
