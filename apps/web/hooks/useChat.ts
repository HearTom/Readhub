'use client'

import { useCallback, useRef, useState } from 'react'
import type { ChatResult, ChatSource } from '@readhub/types'

export interface ChatViewMessage {
  id: string
  role: 'user' | 'assistant'
  content: string // texto ya revelado (efecto de escritura progresiva del lado del cliente)
  fullContent?: string // texto completo del asistente, mientras `content` aún se está revelando
  sources?: ChatSource[]
  contextFound?: boolean
}

const REVEAL_CHARS_PER_TICK = 3
const REVEAL_TICK_MS = 15

export function useChat() {
  const [messages, setMessages] = useState<ChatViewMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const revealTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // Revela el texto de la respuesta de a poco. La respuesta ya llegó completa
  // desde /api/chat (no hay streaming real del servidor en esta fase — ver
  // informe técnico); esto es puramente un efecto visual del lado del
  // cliente para dar sensación de "escritura en progreso".
  const revealProgressively = useCallback((messageId: string, fullText: string) => {
    let index = 0
    const interval = setInterval(() => {
      index = Math.min(index + REVEAL_CHARS_PER_TICK, fullText.length)
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: fullText.slice(0, index) } : m))
      )
      if (index >= fullText.length) {
        clearInterval(interval)
        revealTimers.current.delete(messageId)
      }
    }, REVEAL_TICK_MS)
    revealTimers.current.set(messageId, interval)
  }, [])

  const sendMessage = useCallback(async (question: string) => {
    const trimmed = question.trim()
    if (trimmed.length === 0 || loading) return

    setError(null)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: trimmed }])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      const json = await response.json()

      if (!response.ok || !json.success) {
        setError(json.error ?? 'No se pudo obtener una respuesta. Inténtalo de nuevo.')
        setLoading(false)
        return
      }

      const data = json.data as ChatResult
      const assistantId = crypto.randomUUID()

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          fullContent: data.answer,
          sources: data.sources,
          contextFound: data.contextFound,
        },
      ])
      setLoading(false)
      revealProgressively(assistantId, data.answer)
    } catch {
      setError('No se pudo conectar con el asistente. Revisa tu conexión e inténtalo de nuevo.')
      setLoading(false)
    }
  }, [loading, revealProgressively])

  const clearError = useCallback(() => setError(null), [])

  return { messages, loading, error, sendMessage, clearError }
}
