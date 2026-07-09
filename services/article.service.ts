import type { createClient } from '@/lib/supabase/client'
import type { Article, ArticleInsert } from '@/types/article'
import type { ServiceResult } from './types'

type Client = ReturnType<typeof createClient>

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS ENRIQUECIDOS
// ─────────────────────────────────────────────────────────────────────────────

export interface ArticleWithStats extends Article {
  likes_count: number
  views_count: number
  has_liked: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: enriquece un array de artículos con contadores en dos round-trips.
//
// likes_select: USING(TRUE) → todos los likes son visibles.
// views_select: autor o admin → views_count = 0 para artículos ajenos (esperado).
// ─────────────────────────────────────────────────────────────────────────────

async function enrichArticles(
  client: Client,
  articles: Article[],
  currentUserId?: string
): Promise<ArticleWithStats[]> {
  if (articles.length === 0) return []

  const ids = articles.map((a) => a.id)

  // Queries separadas — Promise.all + destructuring rompe la inferencia de tipos
  const likesRes = await client.from('likes').select('article_id, user_id').in('article_id', ids)
  const viewsRes = await client.from('views').select('article_id').in('article_id', ids)

  const likes = (likesRes.data ?? []) as { article_id: string; user_id: string }[]
  const views = (viewsRes.data ?? []) as { article_id: string }[]

  return articles.map((article) => ({
    ...article,
    likes_count: likes.filter((l) => l.article_id === article.id).length,
    views_count: views.filter((v) => v.article_id === article.id).length,
    has_liked: currentUserId
      ? likes.some((l) => l.article_id === article.id && l.user_id === currentUserId)
      : false,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ARTICLES — feed público, ordenado por fecha descendente
// ─────────────────────────────────────────────────────────────────────────────

export async function getArticles(
  client: Client,
  currentUserId?: string
): Promise<ServiceResult<ArticleWithStats[]>> {
  const { data, error } = await client
    .from('articles')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }

  const enriched = await enrichArticles(client, (data ?? []) as Article[], currentUserId)
  return { data: enriched, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ARTICLE — detalle por ID
// ─────────────────────────────────────────────────────────────────────────────

export async function getArticle(
  client: Client,
  id: string,
  currentUserId?: string
): Promise<ServiceResult<ArticleWithStats>> {
  const { data, error } = await client
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Artículo no encontrado' }
  }

  const article = data as Article

  const likesCountRes = await client
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('article_id', id)

  const viewsCountRes = await client
    .from('views')
    .select('*', { count: 'exact', head: true })
    .eq('article_id', id)

  let hasLiked = false
  if (currentUserId) {
    const userLikeRes = await client
      .from('likes')
      .select('id')
      .eq('article_id', id)
      .eq('user_id', currentUserId)
      .maybeSingle()
    hasLiked = userLikeRes.data !== null
  }

  return {
    data: {
      ...article,
      likes_count: likesCountRes.count ?? 0,
      views_count: viewsCountRes.count ?? 0,
      has_liked: hasLiked,
    },
    error: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET MY ARTICLES — borradores + publicados del usuario autenticado
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyArticles(
  client: Client,
  userId: string
): Promise<ServiceResult<ArticleWithStats[]>> {
  const { data, error } = await client
    .from('articles')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }

  const enriched = await enrichArticles(client, (data ?? []) as Article[], userId)
  return { data: enriched, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ARTICLE
// Los paths de Storage deben estar subidos antes de llamar a esta función.
// ─────────────────────────────────────────────────────────────────────────────

export async function createArticle(
  client: Client,
  payload: ArticleInsert
): Promise<ServiceResult<Article>> {
  const { data, error } = await client
    .from('articles')
    .insert(payload as never)
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Error al crear el artículo' }
  }
  return { data: data as Article, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER VIEW — fire-and-forget, nunca bloquea la navegación
// ─────────────────────────────────────────────────────────────────────────────

export async function registerView(
  client: Client,
  articleId: string,
  userId: string
): Promise<void> {
  await client
    .from('views')
    .insert({ article_id: articleId, user_id: userId } as never)
}

// ─────────────────────────────────────────────────────────────────────────────
// LIKES
// ─────────────────────────────────────────────────────────────────────────────

export async function addLike(
  client: Client,
  articleId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const { error } = await client
    .from('likes')
    .insert({ article_id: articleId, user_id: userId } as never)

  // 23505 = violación de unique constraint → el like ya existe → OK
  if (error && error.code !== '23505') {
    return { data: null, error: error.message }
  }
  return { data: null, error: null }
}

export async function removeLike(
  client: Client,
  articleId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const { error } = await client
    .from('likes')
    .delete()
    .eq('article_id', articleId)
    .eq('user_id', userId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

export async function getLikesCount(
  client: Client,
  articleId: string
): Promise<ServiceResult<number>> {
  const { count, error } = await client
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('article_id', articleId)

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}
