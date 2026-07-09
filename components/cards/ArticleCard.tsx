import Link from 'next/link'
import Image from 'next/image'
import { Eye, Heart, Clock, BookOpen } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export interface ArticleCardData {
  id: string
  title: string
  summary: string | null
  imageUrl: string | null
  authorEmail: string
  createdAt: string
  viewsCount: number
  likesCount: number
}

interface ArticleCardProps {
  article: ArticleCardData
  className?: string
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function getInitials(email: string): string {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

export function ArticleCard({ article, className }: ArticleCardProps) {
  const { id, title, summary, imageUrl, authorEmail, createdAt, viewsCount, likesCount } = article

  return (
    <Link
      href={`/article/${id}`}
      className={cn(
        'group block rounded-xl border bg-card overflow-hidden',
        'shadow-card hover:shadow-card-hover card-interactive',
        'transition-all duration-200',
        className
      )}
    >
      {/* Cover image */}
      <div className="article-cover relative bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground opacity-30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2.5">
        <h3 className="text-base font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>

        {summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {summary}
          </p>
        )}

        {/* Author + stats row */}
        <div className="flex items-center justify-between pt-1 mt-auto">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[10px]">{getInitials(authorEmail)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{authorEmail}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-2">
            <span className="stat-chip">
              <Eye className="h-3 w-3" />
              {formatCount(viewsCount)}
            </span>
            <span className="stat-chip">
              <Heart className="h-3 w-3" />
              {formatCount(likesCount)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatRelativeDate(createdAt)}
        </div>
      </div>
    </Link>
  )
}
