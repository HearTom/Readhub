'use client'

import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LikeButtonProps {
  count: number
  hasLiked: boolean
  onToggle: () => void
  isLoading?: boolean
  className?: string
}

export function LikeButton({ count, hasLiked, onToggle, isLoading, className }: LikeButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      disabled={isLoading}
      aria-label={hasLiked ? 'Quitar like' : 'Dar like'}
      aria-pressed={hasLiked}
      className={cn(
        'gap-2 transition-all duration-150 select-none',
        hasLiked
          ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900'
          : 'hover:border-red-200 hover:text-red-500',
        className
      )}
    >
      <Heart
        className={cn('h-4 w-4 transition-all duration-150', hasLiked && 'fill-current')}
      />
      <span className="tabular-nums">{count}</span>
    </Button>
  )
}
