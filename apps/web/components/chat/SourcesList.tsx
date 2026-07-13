import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ChatSource } from '@readhub/types'

interface SourcesListProps {
  sources: ChatSource[]
}

function relevanceLabel(similarity: number): {
  label: string
  variant: 'success' | 'info' | 'warning'
} {
  if (similarity >= 0.5) return { label: 'Alta relevancia', variant: 'success' }
  if (similarity >= 0.3) return { label: 'Relevancia media', variant: 'info' }
  return { label: 'Relevancia baja', variant: 'warning' }
}

export function SourcesList({ sources }: SourcesListProps) {
  if (sources.length === 0) return null

  return (
    <div className="w-full max-w-[85%] rounded-lg border bg-card p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Fuentes utilizadas</p>
      <ul className="space-y-1.5">
        {sources.map((source) => {
          const relevance = relevanceLabel(source.similarity)
          return (
            <li key={`${source.articleId}-${source.chunkIndex}`}>
              <Link
                href={`/article/${source.articleId}`}
                className="group flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <span className="shrink-0 text-xs text-muted-foreground">[{source.rank}]</span>
                <span className="truncate flex-1 group-hover:underline">{source.articleTitle}</span>
                <Badge variant={relevance.variant} className="shrink-0 hidden sm:inline-flex">
                  {relevance.label}
                </Badge>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
