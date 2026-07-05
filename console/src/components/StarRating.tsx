import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  stars: number
  className?: string
}

export function StarRating({ stars, className }: StarRatingProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'h-5 w-5',
            i < stars ? 'fill-star text-star' : 'fill-transparent text-ink/20',
          )}
        />
      ))}
    </div>
  )
}
