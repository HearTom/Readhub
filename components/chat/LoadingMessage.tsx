import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BookOpen } from 'lucide-react'

export function LoadingMessage() {
  return (
    <div className="flex gap-3" role="status" aria-label="El asistente está escribiendo">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="text-xs">
          <BookOpen className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
      </div>
    </div>
  )
}
