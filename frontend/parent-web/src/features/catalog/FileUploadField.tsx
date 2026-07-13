import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  testId: string
  label: string
  accept: string
  kind: 'image' | 'video'
  currentUrl?: string | null
  disabled?: boolean
  onUpload: (file: File) => Promise<void>
}

export function FileUploadField({ testId, label, accept, kind, currentUrl, disabled, onUpload }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUpload(file)
      setUploadedName(file.name)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="flex items-center gap-3">
        {kind === 'image' && currentUrl && (
          <img data-testid={`${testId}-preview`} src={currentUrl} alt={label}
            className="h-14 w-14 rounded-lg border border-ink/10 object-cover" />
        )}
        {kind === 'video' && (currentUrl || uploadedName) && (
          <span className="inline-flex items-center gap-1 text-sm text-success-500">
            <Check className="h-4 w-4" /> {uploadedName ?? t('catalog.evolveVideo')}
          </span>
        )}
        <Button type="button" size="sm" variant="outline" disabled={disabled || uploading}
          data-testid={`${testId}-btn`} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" /> {uploading ? t('catalog.uploading') : (currentUrl ? t('catalog.replace') : t('catalog.upload'))}
        </Button>
        <input ref={inputRef} data-testid={`${testId}-input`} type="file" accept={accept}
          className="hidden" onChange={onChange} />
      </div>
    </div>
  )
}
