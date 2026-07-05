import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, id, ...rest }, ref) => (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-500' : 'bg-ink/20',
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  ),
)
Switch.displayName = 'Switch'
