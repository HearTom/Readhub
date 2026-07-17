'use client'

import { useEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { LoadingMessage } from './LoadingMessage'
import { InlineError } from '@/components/ui/states'

export function ChatWindow() {
  const { messages, loading, error, sendMessage } = useChat()
  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)

  // Desplazamiento automático hacia el mensaje más reciente. `messages`
  // cambia de referencia en cada tick de revealProgressively (~cada 15ms
  // mientras se revela una respuesta), así que este efecto corre muy
  // seguido — se anima con 'smooth' solo cuando aparece un mensaje nuevo;
  // el resto de los ticks (que solo siguen el crecimiento del texto ya
  // visible) usan 'auto' para no relanzar una animación de scroll compitiendo
  // consigo misma decenas de veces por segundo.
  useEffect(() => {
    const isNewMessage = messages.length !== prevMessageCountRef.current
    prevMessageCountRef.current = messages.length
    scrollAnchorRef.current?.scrollIntoView({
      behavior: isNewMessage ? 'smooth' : 'auto',
      block: 'end',
    })
  }, [messages, loading])

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] sm:h-[calc(100vh-14rem)] min-h-[420px] rounded-xl border bg-card overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-2">
              <MessageCircle className="h-7 w-7 text-muted-foreground opacity-60" />
            </div>
            <h3 className="font-semibold text-foreground">Pregúntale a ReadHub</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              El asistente responde únicamente con información de los artículos publicados en la
              plataforma, citando siempre sus fuentes.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {loading && <LoadingMessage />}

        <div ref={scrollAnchorRef} />
      </div>

      {error && (
        <div className="px-4 sm:px-6 pt-3">
          <InlineError message={error} />
        </div>
      )}

      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  )
}
