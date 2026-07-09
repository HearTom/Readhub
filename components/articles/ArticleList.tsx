import { ArticleCard, type ArticleCardData } from '@/components/cards/ArticleCard'
import { EmptyState } from '@/components/ui/states'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ArticleListProps {
  articles: ArticleCardData[]
  emptyTitle?: string
  emptyMessage?: string
  emptyAction?: React.ReactNode
  className?: string
}

export function ArticleList({
  articles,
  emptyTitle = 'Sin artículos',
  emptyMessage = 'No hay artículos para mostrar todavía.',
  emptyAction,
  className,
}: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-7 w-7 text-muted-foreground opacity-60" />}
        title={emptyTitle}
        message={emptyMessage}
        action={emptyAction}
        className={className}
      />
    )
  }

  return (
    <div
      className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}
      role="list"
      aria-label="Lista de artículos"
    >
      {articles.map((article) => (
        <div key={article.id} role="listitem">
          <ArticleCard article={article} />
        </div>
      ))}
    </div>
  )
}
