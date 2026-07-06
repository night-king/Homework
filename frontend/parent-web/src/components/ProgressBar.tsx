import { cn } from '@/lib/utils'

interface ProgressBarProps {
  percent: number
  className?: string
}

export function ProgressBar({ percent, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-semibold text-ink">{clamped}%</span>
    </div>
  )
}
