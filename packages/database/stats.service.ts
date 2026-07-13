import type { createClient } from './client'
import type { ServiceResult } from './types'
import { getArticles } from './article.service'
import { getCommentsCountForArticles } from './comment.service'

type Client = ReturnType<typeof createClient>

export interface ReadHubStatistics {
  totalPublicArticles: number
  totalAuthors: number
  totalLikes: number
  totalComments: number
}

// ─────────────────────────────────────────────────────────────────────────────
// GET STATISTICS — estadísticas generales de la plataforma, acotadas a lo que
// es visible sin sesión (artículos públicos y sus likes/comentarios; RLS ya
// garantiza que nada privado se filtre). No repite ninguna consulta propia:
// compone getArticles (article.service.ts) + getCommentsCountForArticles
// (comment.service.ts) -- este archivo no llama a Supabase directamente.
//
// No incluye total de vistas: `views_select` restringe esa tabla a admin o
// al propio autor del artículo, así que bajo un cliente sin sesión (como
// este servidor MCP) el conteo siempre sería 0 -- un número así sería
// engañoso, no informativo, y se omite en vez de mostrarlo.
// ─────────────────────────────────────────────────────────────────────────────

export async function getStatistics(client: Client): Promise<ServiceResult<ReadHubStatistics>> {
  const articlesResult = await getArticles(client)
  if (articlesResult.error !== null) return { data: null, error: articlesResult.error }

  const articles = articlesResult.data
  const articleIds = articles.map((a) => a.id)
  const authorIds = new Set(articles.map((a) => a.author_id))
  const totalLikes = articles.reduce((sum, a) => sum + a.likes_count, 0)

  const commentsResult = await getCommentsCountForArticles(client, articleIds)
  if (commentsResult.error !== null) return { data: null, error: commentsResult.error }

  return {
    data: {
      totalPublicArticles: articles.length,
      totalAuthors: authorIds.size,
      totalLikes,
      totalComments: commentsResult.data,
    },
    error: null,
  }
}
