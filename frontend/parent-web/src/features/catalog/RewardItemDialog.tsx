import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FileUploadField } from './FileUploadField'
import type { RewardItemDto, CreateUpdateRewardItemDto } from '@/types/homework'

interface Props {
  open: boolean
  onClose: () => void
  item: RewardItemDto | null
  onSubmit: (dto: CreateUpdateRewardItemDto) => void
  onUploadIcon?: (file: File) => Promise<void>
  isPending: boolean
}

export function RewardItemDialog({ open, onClose, item, onSubmit, onUploadIcon, isPending }: Props) {
  const { t } = useTranslation()
  const isEdit = !!item
  const [name, setName] = useState(item?.name ?? '')
  const [glyph, setGlyph] = useState(item?.glyph ?? '')
  const [growthValue, setGrowthValue] = useState(item?.growthValue ?? 12)
  const [randomWeight, setRandomWeight] = useState(item?.randomWeight ?? 1)
  const [displayOrder, setDisplayOrder] = useState(item?.displayOrder ?? 0)
  const [isActive, setIsActive] = useState(item?.isActive ?? false)
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErr(t('catalog.name')); return }
    onSubmit({ name: name.trim(), glyph: glyph.trim() || null, growthValue, randomWeight, displayOrder, isActive })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? t('catalog.edit') : t('catalog.create')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t('catalog.name')} <span className="text-error-500">*</span></Label>
            <Input data-testid="reward-name-input" value={name} maxLength={64} onChange={(e) => { setName(e.target.value); setErr('') }} />
            {err && <p className="text-xs text-error-500">{err}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{t('catalog.glyph')}</Label>
              <Input data-testid="reward-glyph-input" value={glyph} maxLength={8} onChange={(e) => setGlyph(e.target.value)} /></div>
            <div className="space-y-1"><Label>{t('catalog.displayOrder')}</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
            <div className="space-y-1"><Label>{t('catalog.growthValue')}</Label>
              <Input type="number" min={1} value={growthValue} onChange={(e) => setGrowthValue(Number(e.target.value))} /></div>
            <div className="space-y-1"><Label>{t('catalog.randomWeight')}</Label>
              <Input type="number" min={0} value={randomWeight} onChange={(e) => setRandomWeight(Number(e.target.value))} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="reward-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="reward-active">{t('catalog.active')}</Label>
          </div>
          {isEdit && onUploadIcon && (
            <FileUploadField testId="reward-icon" label={t('catalog.icon')} accept="image/*" kind="image"
              currentUrl={item?.iconUrl} onUpload={onUploadIcon} />
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
