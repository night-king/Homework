import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { usePetSpecies, usePetSpeciesMutations } from '@/hooks/useAdminPetSpecies'
import { PetFormSection } from './PetFormSection'
import { FileUploadField } from './FileUploadField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import type { PetFormLevel } from '@/types/homework'

const LEVELS: PetFormLevel[] = [1, 2, 3, 4, 5]

export function PetSpeciesEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: species, isLoading } = usePetSpecies(id)
  const m = usePetSpeciesMutations(id)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [accentColor, setAccentColor] = useState('')
  const [description, setDescription] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)

  useEffect(() => {
    if (species) {
      setName(species.name); setCode(species.code); setAccentColor(species.accentColor ?? '')
      setDescription(species.description ?? ''); setDisplayOrder(species.displayOrder)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species?.id])

  if (isLoading || !species) return <div className="py-12 text-center text-muted">{t('common.loading')}</div>

  const spriteCount = species.forms.filter((f) => f.spriteUrl).length
  const complete = !!species.coverUrl && spriteCount === 5
  const saveBase = () => m.update.mutate({ id, dto: { name: name.trim(), code: code.trim(), accentColor: accentColor.trim() || null, description: description.trim() || null, displayOrder } })

  return (
    <div className="space-y-6">
      <button type="button" className="flex items-center gap-1 text-sm text-muted hover:text-ink" onClick={() => navigate('/catalog')}>
        <ArrowLeft className="h-4 w-4" /> {t('catalog.backToList')}
      </button>
      <h1 className="text-2xl font-bold text-ink">{species.name}</h1>

      <Card><CardContent className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>{t('catalog.name')}</Label>
            <Input data-testid="pet-base-name" value={name} maxLength={64} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>{t('catalog.code')}</Label>
            <Input value={code} maxLength={64} onChange={(e) => setCode(e.target.value)} /></div>
          <div className="space-y-1"><Label>{t('catalog.accentColor')}</Label>
            <Input value={accentColor} maxLength={16} onChange={(e) => setAccentColor(e.target.value)} /></div>
          <div className="space-y-1"><Label>{t('catalog.displayOrder')}</Label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
        </div>
        <div className="space-y-1"><Label>{t('catalog.description')}</Label>
          <Textarea value={description} maxLength={512} rows={2} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" data-testid="pet-base-save" onClick={saveBase} disabled={m.update.isPending}>{t('common.save')}</Button>
          <FileUploadField testId="pet-cover" label={t('catalog.cover')} accept="image/*" kind="image" currentUrl={species.coverUrl}
            onUpload={(file) => m.uploadCover.mutateAsync({ id, file }).then(() => undefined)} />
        </div>
      </CardContent></Card>

      <div className="space-y-4">
        {LEVELS.map((level) => (
          <PetFormSection key={level} species={species} level={level}
            onSaveMeta={(dto) => m.setForm.mutate({ id, dto })}
            onUploadSprite={(file) => m.uploadSprite.mutateAsync({ id, level, file }).then(() => undefined)}
            onUploadEvolveVideo={(file) => m.uploadEvolveVideo.mutateAsync({ id, level, file }).then(() => undefined)} />
        ))}
      </div>

      <Card><CardContent className="flex items-center justify-between p-5">
        <div className="text-sm text-muted">
          {t('catalog.completeness')}: {t('catalog.cover')} {species.coverUrl ? '✓' : '✗'} · {t('catalog.sprite')} <span data-testid="pet-completeness">{spriteCount}/5</span>
          {!complete && <span className="ml-2 text-error-500">{t('catalog.activateHint')}</span>}
        </div>
        {species.isActive ? (
          <Button variant="outline" data-testid="pet-deactivate" onClick={() => m.deactivate.mutate(id)}>{t('catalog.inactive')}</Button>
        ) : (
          <Button data-testid="pet-activate" disabled={!complete} onClick={() => m.activate.mutate(id)}>{t('catalog.active')}</Button>
        )}
      </CardContent></Card>
    </div>
  )
}
