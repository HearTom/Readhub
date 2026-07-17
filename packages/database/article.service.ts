import type { createClient } from './client'
import type { Article, ArticleInsert } from '@readhub/types'
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
// SEARCH ARTICLES — coincidencia de texto en título o resumen (no semántica;
// para búsqueda por similitud ver vector-search.service.ts). Mismo filtro
// is_public que getArticles: sin currentUserId no expone borradores ajenos.
// ─────────────────────────────────────────────────────────────────────────────

export async function searchArticles(
  client: Client,
  query: string,
  currentUserId?: string
): Promise<ServiceResult<ArticleWithStats[]>> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length === 0) {
    return { data: [], error: null }
  }

  // `.or()` interpola un string crudo en el DSL de filtros de PostgREST,
  // donde `,`, `(`, `)` y `%` tienen significado especial (separador de
  // condiciones, agrupación, y comodín de ILIKE respectivamente). Se
  // eliminan del término de búsqueda para que el usuario nunca pueda
  // inyectar condiciones adicionales o comodines fuera de los que agrega
  // esta función a propósito.
  const safeQuery = trimmedQuery.replace(/[,()%]/g, '')
  if (safeQuery.length === 0) {
    return { data: [], error: null }
  }

  const { data, error } = await client
    .from('articles')
    .select('*')
    .eq('is_public', true)
    .or(`title.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%`)
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

  // likes_count, views_count y has_liked no dependen entre sí — se disparan
  // en paralelo (antes eran 3 awaits secuenciales) para que la latencia de
  // esta página sea el máximo de las tres consultas en vez de la suma.
  const [likesCountRes, viewsCountRes, userLikeRes] = await Promise.all([
    client.from('likes').select('*', { count: 'exact', head: true }).eq('article_id', id),
    client.from('views').select('*', { count: 'exact', head: true }).eq('article_id', id),
    currentUserId
      ? client.from('likes').select('id').eq('article_id', id).eq('user_id', currentUserId).maybeSingle()
      : Promise.resolve({ data: null } as { data: { id: string } | null }),
  ])

  return {
    data: {
      ...article,
      likes_count: likesCountRes.count ?? 0,
      views_count: viewsCountRes.count ?? 0,
      has_liked: userLikeRes.data !== null,
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
// GET AUTHORS SUMMARY — agrega los artículos públicos por autor (id, cantidad
// de artículos, likes totales, lista de {id,title}). No hay tabla/servicio de
// "autores": la fuente de verdad de identidad de usuario es `profiles`, pero
// RLS (`profiles_select_own`) solo permite a cada usuario leer su propio
// perfil, así que un cliente sin sesión (como este servidor MCP) nunca puede
// leerla para terceros. Este resumen se deriva enteramente de columnas ya
// visibles en `articles`/`likes` bajo RLS pública, reutilizando getArticles
// en vez de repetir su consulta.
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthorSummary {
  authorId: string
  articlesCount: number
  totalLikes: number
  articles: { id: string; title: string }[]
}

export async function getAuthorsSummary(client: Client): Promise<ServiceResult<AuthorSummary[]>> {
  const result = await getArticles(client)
  if (result.error !== null) return { data: null, error: result.error }

  const byAuthor = new Map<string, AuthorSummary>()
  for (const article of result.data) {
    const entry = byAuthor.get(article.author_id) ?? {
      authorId: article.author_id,
      articlesCount: 0,
      totalLikes: 0,
      articles: [],
    }
    entry.articlesCount += 1
    entry.totalLikes += article.likes_count
    entry.articles.push({ id: article.id, title: article.title })
    byAuthor.set(article.author_id, entry)
  }

  return { data: Array.from(byAuthor.values()), error: null }
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
