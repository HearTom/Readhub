'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@readhub/database/client'
import {
  getArticles,
  getArticle,
  createArticle as svcCreateArticle,
  registerView,
  type ArticleWithStats,
  type ServiceResult,
} from '@readhub/database'
import type { Article, ArticleInsert } from '@readhub/types'

// Resuelve un author_id a un string de visualización:
// - Si coincide con el usuario actual → su email
// - En caso contrario → identificador abreviado (perfiles ajenos están restringidos por RLS)
export function resolveAuthorDisplay(authorId: string, currentUser: User | null): string {
  if (currentUser && authorId === currentUser.id) {
    return currentUser.email ?? 'Tú'
  }
  return `usr-${authorId.substring(0, 8)}`
}

// ─── useArticles — feed público ───────────────────────────────────────────────

interface UseArticlesState {
  articles: ArticleWithStats[]
  loading: boolean
  error: string | null
}

export function useArticles(currentUser: User | null) {
  const client = useMemo(() => createClient(), [])
  const [state, setState] = useState<UseArticlesState>({
    articles: [],
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    const result = await getArticles(client, currentUser?.id)
    if (result.error !== null) {
      setState({ articles: [], loading: false, error: result.error })
      return
    }
    setState({ articles: result.data, loading: false, error: null })
  }, [client, currentUser])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refresh: load }
}

// ─── useArticle — detalle de un artículo ─────────────────────────────────────

interface UseArticleState {
  article: ArticleWithStats | null
  loading: boolean
  error: string | null
}

export function useArticle(id: string, currentUser: User | null) {
  const client = useMemo(() => createClient(), [])
  const [state, setState] = useState<UseArticleState>({
    article: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!id) return
    let mounted = true

    async function load() {
      setState({ article: null, loading: true, error: null })
      const result = await getArticle(client, id, currentUser?.id)
      if (!mounted) return

      if (result.error) {
        setState({ article: null, loading: false, error: result.error })
        return
      }

      setState({ article: result.data, loading: false, error: null })

      // Registrar visualización en segundo plano (fire-and-forget)
      if (currentUser) {
        registerView(client, id, currentUser.id)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [id, client, currentUser])

  return state
}

// ─── useCreateArticle — publicar un artículo ─────────────────────────────────

export function useCreateArticle() {
  const client = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createArticle = useCallback(
    async (payload: ArticleInsert): Promise<ServiceResult<Article>> => {
      setLoading(true)
      setError(null)
      const result = await svcCreateArticle(client, payload)
      setLoading(false)
      if (result.error) setError(result.error)
      return result
    },
    [client],
  )

  const clearError = useCallback(() => setError(null), [])

  return { createArticle, loading, error, clearError }
}
