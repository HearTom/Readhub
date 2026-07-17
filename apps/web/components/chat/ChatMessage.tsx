import { memo } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BookOpen, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SourcesList } from './SourcesList'
import type { ChatViewMessage } from '@/hooks/useChat'

interface ChatMessageProps {
  message: ChatViewMessage
}

// Memoizado: useChat.revealProgressively actualiza `messages` cada 15ms
// mientras se revela una respuesta — sin memo, ese tick re-renderiza TODOS
// los ChatMessage montados (no solo el que cambia) en cada iteración.
export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isRevealing =
    !isUser && message.fullContent !== undefined && message.content.length < message.fullContent.length

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="text-xs">
          {isUser ? <User className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex-1 min-w-0 space-y-2 flex flex-col', isUser && 'items-end')}>
        <div
          className={cn(
            'inline-block max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          )}
        >
          {message.content}
          {isRevealing && (
            <span
              className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse-soft align-middle"
              aria-hidden
            />
          )}
        </div>

        {!isUser && !isRevealing && message.sources && message.sources.length > 0 && (
          <SourcesList sources={message.sources} />
        )}

        {!isUser && !isRevealing && message.contextFound === false && (
          <p className="text-xs text-muted-foreground italic px-1">
            No se encontraron artículos relevantes para esta consulta.
          </p>
        )}
      </div>
    </div>
  )
})
