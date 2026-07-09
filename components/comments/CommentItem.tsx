import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export interface CommentData {
  id: string
  content: string
  authorEmail: string
  createdAt: string
}

interface CommentItemProps {
  comment: CommentData
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export function CommentItem({ comment }: CommentItemProps) {
  const { content, authorEmail, createdAt } = comment
  const initials = authorEmail.split('@')[0].slice(0, 2).toUpperCase()

  return (
    <article className="flex gap-3 py-4 border-b border-border last:border-0">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{authorEmail}</span>
          <time dateTime={createdAt} className="text-xs text-muted-foreground shrink-0">
            {formatDate(createdAt)}
          </time>
        </div>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{content}</p>
      </div>
    </article>
  )
}
