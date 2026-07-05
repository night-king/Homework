import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-brand-500 text-white hover:bg-brand-600 shadow-soft',
        accent: 'bg-accent-500 text-white hover:bg-accent-600',
        outline: 'border border-ink/15 bg-white hover:bg-paper text-ink',
        ghost: 'hover:bg-ink/5 text-ink',
        destructive: 'bg-error-500 text-white hover:opacity-90',
      },
      size: { default: 'h-11 px-5', sm: 'h-9 px-3 text-sm', icon: 'h-10 w-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
export { buttonVariants }
