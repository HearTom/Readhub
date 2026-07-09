'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  getComments,
  addComment as svcAddComment,
  deleteComment as svcDeleteComment,
} from '@/services/comment.service'
import type { Comment } from '@/types/comment'

// Tipo de visualización de comentario — refleja CommentData del componente
export interface CommentViewModel {
  id: string
  content: string
  authorDisplay: string
  createdAt: string
  isOwn: boolean
}

function toViewModel(comment: Comment, currentUser: User | null): CommentViewModel {
  const isOwn = currentUser?.id === comment.user_id
  return {
    id: comment.id,
    content: comment.comment,
    authorDisplay: isOwn
      ? (currentUser?.email ?? 'Tú')
      : `usr-${comment.user_id.substring(0, 8)}`,
    createdAt: comment.created_at,
    isOwn,
  }
}

export function useComments(articleId: string, currentUser: User | null) {
  const client = useMemo(() => createClient(), [])
  const [comments, setComments] = useState<CommentViewModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!articleId) return
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      const result = await getComments(client, articleId)
      if (!mounted) return
      if (result.error !== null) {
        setError(result.error)
      } else {
        setComments((result.data ?? []).map((c) => toViewModel(c, currentUser)))
      }
      setLoading(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [articleId, client, currentUser])

  const addComment = useCallback(
    async (content: string): Promise<string | null> => {
      if (!currentUser) return 'Debes iniciar sesión para comentar'
      const trimmed = content.trim()
      if (!trimmed) return 'El comentario no puede estar vacío'

      setSubmitting(true)
      const result = await svcAddComment(client, articleId, currentUser.id, trimmed)
      setSubmitting(false)

      if (result.error) return result.error

      // Append optimista — sin refetch
      setComments((prev) => [...prev, toViewModel(result.data as Comment, currentUser)])
      return null
    },
    [client, articleId, currentUser],
  )

  const deleteComment = useCallback(
    async (commentId: string): Promise<string | null> => {
      const result = await svcDeleteComment(client, commentId)
      if (result.error) return result.error
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      return null
    },
    [client],
  )

  return { comments, loading, error, submitting, addComment, deleteComment }
}
