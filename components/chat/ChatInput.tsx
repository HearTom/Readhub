'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 border-t bg-background p-3 sm:p-4">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Pregúntale algo a ReadHub sobre los artículos publicados…"
        aria-label="Escribe tu pregunta para el asistente"
        disabled={disabled}
        rows={1}
        className="min-h-[44px] max-h-32 resize-none"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || value.trim().length === 0}
        size="icon"
        aria-label="Enviar pregunta"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
