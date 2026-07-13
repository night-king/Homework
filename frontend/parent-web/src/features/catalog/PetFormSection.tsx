import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FileUploadField } from './FileUploadField'
import type { PetSpeciesDto, SetPetFormDto, PetFormLevel } from '@/types/homework'

interface Props {
  species: PetSpeciesDto
  level: PetFormLevel
  onSaveMeta: (dto: SetPetFormDto) => void
  onUploadSprite: (file: File) => Promise<void>
  onUploadEvolveVideo: (file: File) => Promise<void>
}

export function PetFormSection({ species, level, onSaveMeta, onUploadSprite, onUploadEvolveVideo }: Props) {
  const { t } = useTranslation()
  const form = species.forms.find((f) => f.level === level)
  const [name, setName] = useState(form?.name ?? '')
  const [revealText, setRevealText] = useState(form?.revealText ?? '')
  const [growthToNext, setGrowthToNext] = useState<string>(form?.growthToNext != null ? String(form.growthToNext) : '')
  const [scale, setScale] = useState<string>(form?.scale != null ? String(form.scale) : '')

  const save = () => onSaveMeta({
    level, name: name.trim(),
    revealText: revealText.trim() || null,
    growthToNext: growthToNext ? Number(growthToNext) : null,
    scale: scale ? Number(scale) : null,
  })

  return (
    <div className="space-y-3 rounded-xl border border-ink/10 p-4">
      <div className="font-semibold text-ink">{t('catalog.form')} {level}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label>{t('catalog.name')}</Label>
          <Input data-testid={`form-name-${level}`} value={name} maxLength={64} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1"><Label>{t('catalog.revealText')}</Label>
          <Input data-testid={`form-reveal-${level}`} value={revealText} maxLength={128} onChange={(e) => setRevealText(e.target.value)} /></div>
        <div className="space-y-1"><Label>{t('catalog.growthToNext')}</Label>
          <Input type="number" data-testid={`form-growth-${level}`} value={growthToNext} onChange={(e) => setGrowthToNext(e.target.value)} /></div>
        <div className="space-y-1"><Label>{t('catalog.scale')}</Label>
          <Input type="number" step="0.01" data-testid={`form-scale-${level}`} value={scale} onChange={(e) => setScale(e.target.value)} /></div>
      </div>
      <Button size="sm" variant="outline" data-testid={`form-save-${level}`} onClick={save}>{t('catalog.saveForm')}</Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <FileUploadField testId={`form-sprite-${level}`} label={t('catalog.sprite')} accept="image/*" kind="image"
          currentUrl={form?.spriteUrl} onUpload={onUploadSprite} />
        {level < 5 && (
          <FileUploadField testId={`form-evolve-${level}`} label={`${t('catalog.evolveVideo')} → Lv${level + 1}`} accept="video/*" kind="video"
            currentUrl={form?.evolveVideoUrl} onUpload={onUploadEvolveVideo} />
        )}
      </div>
      {level < 5 && <p className="text-xs text-muted">{t('catalog.videoSizeHint')}</p>}
    </div>
  )
}
