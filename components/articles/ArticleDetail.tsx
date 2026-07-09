import Image from 'next/image'
import { Eye, Clock, BookOpen } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { LikeButton } from './LikeButton'
import { cn } from '@/lib/utils'

export interface ArticleDetailData {
  id: string
  title: string
  summary: string | null
  imageUrl: string | null
  authorEmail: string
  createdAt: string
  content: string | null
  viewsCount: number
}

interface ArticleDetailProps {
  article: ArticleDetailData
  likesCount: number
  hasLiked: boolean
  onLike: () => void
  isLiking?: boolean
  className?: string
  children?: React.ReactNode
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function ArticleDetail({
  article,
  likesCount,
  hasLiked,
  onLike,
  isLiking,
  className,
  children,
}: ArticleDetailProps) {
  const { title, summary, imageUrl, authorEmail, createdAt, content, viewsCount } = article
  const initials = authorEmail.split('@')[0].slice(0, 2).toUpperCase()

  return (
    <article className={cn('max-w-3xl mx-auto', className)}>
      {/* Header */}
      <header className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl text-balance">
          {title}
        </h1>

        {summary && (
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{summary}</p>
        )}

        {/* Meta row — wrap en móvil, separadores en tablet+ */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
          {/* Author */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
              <AvatarFallback className="text-[10px] sm:text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground text-sm truncate max-w-[180px] sm:max-w-none">
              {authorEmail}
            </span>
          </div>

          <span className="text-border/60">·</span>

          {/* Date */}
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <time dateTime={createdAt} className="text-xs sm:text-sm">{formatDate(createdAt)}</time>
          </div>

          <span className="text-border/60">·</span>

          {/* Views */}
          <div className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs sm:text-sm">{viewsCount} vistas</span>
          </div>
        </div>

        {/* Cover image */}
        {imageUrl ? (
          <div className="relative h-52 sm:h-72 md:h-96 w-full rounded-xl overflow-hidden bg-muted">
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="flex h-36 sm:h-48 items-center justify-center rounded-xl bg-muted">
            <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground opacity-30" />
          </div>
        )}
      </header>

      {/* Prose content */}
      {content && (
        <div className="prose-article mb-6 sm:mb-8">
          {content.split('\n').map((paragraph, i) =>
            paragraph.trim() ? <p key={i}>{paragraph}</p> : <br key={i} />
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3 py-4 sm:py-5 border-t border-b border-border mb-6 sm:mb-8">
        <LikeButton
          count={likesCount}
          hasLiked={hasLiked}
          onToggle={onLike}
          isLoading={isLiking}
        />
      </div>

      <Separator className="mb-6 sm:mb-8" />

      {/* Slot for CommentList */}
      {children}
    </article>
  )
}
