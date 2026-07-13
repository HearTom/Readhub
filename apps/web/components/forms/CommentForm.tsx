'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_LENGTH = 1000

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void> | void
  isLoading?: boolean
  placeholder?: string
}

export function CommentForm({
  onSubmit,
  isLoading,
  placeholder = 'Escribe un comentario…',
}: CommentFormProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) { setError('El comentario no puede estar vacío'); return }
    await onSubmit(trimmed)
    setValue('')
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(null) }}
        rows={3}
        disabled={isLoading}
        aria-invalid={!!error}
        maxLength={MAX_LENGTH}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {value.length}/{MAX_LENGTH}
        </span>
        <Button
          type="submit"
          size="sm"
          loading={isLoading}
          disabled={!value.trim()}
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          Comentar
        </Button>
      </div>
    </form>
  )
}
