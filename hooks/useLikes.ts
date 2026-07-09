'use client'

import { useState, useCallback, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { addLike, removeLike, getLikesCount } from '@/services/article.service'

interface UseLikesOptions {
  articleId: string
  initialLikesCount: number
  initialHasLiked: boolean
  currentUser: User | null
}

export function useLikes({
  articleId,
  initialLikesCount,
  initialHasLiked,
  currentUser,
}: UseLikesOptions) {
  const client = useMemo(() => createClient(), [])
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [hasLiked, setHasLiked] = useState(initialHasLiked)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleLike = useCallback(async (): Promise<void> => {
    if (!currentUser) {
      setError('Debes iniciar sesión para dar like')
      return
    }
    if (loading) return

    setError(null)

    // Optimistic update
    const wasLiked = hasLiked
    const prevCount = likesCount
    setHasLiked(!wasLiked)
    setLikesCount(wasLiked ? prevCount - 1 : prevCount + 1)
    const optimisticCount = wasLiked ? prevCount - 1 : prevCount + 1
    setLoading(true)

    const result = wasLiked
      ? await removeLike(client, articleId, currentUser.id)
      : await addLike(client, articleId, currentUser.id)

    setLoading(false)

    if (result.error) {
      // Revertir en caso de error
      setHasLiked(wasLiked)
      setLikesCount(prevCount)
      setError(result.error)
      return
    }

    // Sincronizar con el servidor para tener el conteo exacto
    const countResult = await getLikesCount(client, articleId)
    if (!countResult.error) {
      setLikesCount(countResult.data ?? optimisticCount)
    }
  }, [client, articleId, currentUser, hasLiked, likesCount, loading])

  const clearError = useCallback(() => setError(null), [])

  return { likesCount, hasLiked, loading, error, toggleLike, clearError }
}
