import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink shadow-soft transition-all placeholder:text-muted focus-visible:border-brand-500/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
