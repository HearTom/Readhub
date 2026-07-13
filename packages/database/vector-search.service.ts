import type { createClient } from './server'
import { generateEmbedding } from './embedding.service'
import type { ServiceResult } from './types'
import type { VectorSearchMatch, VectorSearchOptions } from '@readhub/types'

// Corre server-side (mismo cliente que embedding.service.ts) porque reutiliza
// generateEmbedding(), que a su vez depende del SDK de Hugging Face.
type Client = Awaited<ReturnType<typeof createClient>>

// ─────────────────────────────────────────────────────────────────────────────
// Valores por defecto — ver justificación en el informe técnico de esta fase.
//
// DEFAULT_MATCH_COUNT = 5: los artículos de ReadHub son publicaciones cortas
// (la mayoría produce 1 solo chunk), así que Top-5 normalmente cubre entre
// 3 y 5 artículos distintos — suficiente variedad para una futura etapa de
// construcción de contexto sin arrastrar ruido innecesario.
//
// DEFAULT_MATCH_THRESHOLD = 0.25: calibrado empíricamente contra la API real
// de Hugging Face (ver informe de esta fase). Con 2 artículos indexados, una
// consulta genuinamente relacionada pero parafraseada con otras palabras
// obtuvo una similitud de apenas ~0.31 — muy cerca del 0.3 que trae por
// defecto la función SQL match_article_chunks — mientras que una consulta
// sin relación alguna (ruido) se mantuvo en ~0.21-0.24. Se baja el default a
// nivel de servicio a 0.25 para reducir el riesgo de falsos negativos
// (descartar contenido relevante) sin dejar de discriminar el ruido medido
// en la prueba. El 0.3 de la función SQL queda como resguardo solo para
// quien la invoque directamente sin pasar por este servicio.
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_MATCH_COUNT = 5
export const DEFAULT_MATCH_THRESHOLD = 0.25

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH SIMILAR CHUNKS
// Única responsabilidad: recibir una consulta en lenguaje natural, generar su
// embedding (reutilizando embedding.service.ts, sin duplicar lógica) y
// ejecutar la búsqueda por similitud vía la función SQL match_article_chunks
// (RLS + SECURITY INVOKER ya garantizan que solo se devuelvan artículos
// visibles para el usuario que llama). No construye contexto ni interactúa
// con ningún modelo de lenguaje — eso pertenece a fases posteriores.
// ─────────────────────────────────────────────────────────────────────────────
export async function searchSimilarChunks(
  client: Client,
  query: string,
  options?: VectorSearchOptions
): Promise<ServiceResult<VectorSearchMatch[]>> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length === 0) {
    return { data: [], error: null }
  }

  const embeddingResult = await generateEmbedding(trimmedQuery)
  if (embeddingResult.error !== null) {
    return { data: null, error: embeddingResult.error }
  }

  const matchCount = options?.matchCount ?? DEFAULT_MATCH_COUNT
  const matchThreshold = options?.matchThreshold ?? DEFAULT_MATCH_THRESHOLD

  const { data, error } = await client.rpc('match_article_chunks', {
    query_embedding: embeddingResult.data,
    match_count: matchCount,
    match_threshold: matchThreshold,
  } as never)

  if (error) return { data: null, error: error.message }

  const rows = (data ?? []) as {
    chunk_id: string
    article_id: string
    article_title: string
    chunk_index: number
    content: string
    similarity: number
  }[]

  // match_article_chunks ya ordena por similitud (ASC en distancia coseno,
  // equivalente a DESC en similitud) — se conserva ese orden tal cual.
  const results: VectorSearchMatch[] = rows.map((row) => ({
    chunkId: row.chunk_id,
    articleId: row.article_id,
    articleTitle: row.article_title,
    chunkIndex: row.chunk_index,
    content: row.content,
    similarity: row.similarity,
  }))

  return { data: results, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ARTICLE CHUNKS — reconstruye el texto indexado de un artículo a partir
// de sus fragmentos en article_chunks (ya generados por embedding.service.ts
// al publicarse). No vuelve a descargar el documento de Storage ni a
// extraer texto (lib/documents/extract-text.ts vía @readhub/ai) -- reutiliza
// el índice que el pipeline RAG ya construyó, en vez de duplicar esa
// extracción para un caso de uso distinto (dar contexto a un prompt).
//
// chunk-text.ts solapa levemente el final/inicio de fragmentos consecutivos
// para no perder contexto en el corte -- el texto reconstruido puede tener
// pequeñas repeticiones en los bordes; aceptable como contexto para un LLM,
// no pensado para mostrarse como el documento original.
// ─────────────────────────────────────────────────────────────────────────────

export async function getArticleChunks(
  client: Client,
  articleId: string,
  maxChunks = 12
): Promise<ServiceResult<string>> {
  const { data, error } = await client
    .from('article_chunks')
    .select('content, chunk_index')
    .eq('article_id', articleId)
    .order('chunk_index', { ascending: true })
    .limit(maxChunks)

  if (error) return { data: null, error: error.message }

  const rows = (data ?? []) as { content: string; chunk_index: number }[]
  return { data: rows.map((row) => row.content).join('\n\n'), error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ARTICLE WITH CONTENT — combina título/resumen + texto indexado en un
// solo objeto listo para meterlo en un prompt de LLM. Usa una consulta propia
// mínima (solo title/summary) en vez de reutilizar article.service.ts::getArticle
// -- ese trae además likes_count/views_count/has_liked (irrelevante acá) y
// además está tipado contra el cliente de navegador (./client), no el de
// servidor (./server) que usa este archivo. No es duplicación de lógica: es
// una consulta de una sola tabla, mucho más chica que la de getArticle.
// ─────────────────────────────────────────────────────────────────────────────

export interface ArticleContent {
  id: string
  title: string
  summary: string | null
  content: string
}

export async function getArticleWithContent(
  client: Client,
  articleId: string
): Promise<ServiceResult<ArticleContent>> {
  const { data, error } = await client
    .from('articles')
    .select('id, title, summary')
    .eq('id', articleId)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Artículo no encontrado' }
  }

  const article = data as { id: string; title: string; summary: string | null }

  const chunksResult = await getArticleChunks(client, articleId)
  if (chunksResult.error !== null) return { data: null, error: chunksResult.error }

  const content =
    chunksResult.data.trim().length > 0
      ? chunksResult.data
      : (article.summary ?? '(sin contenido indexado ni resumen disponible)')

  return {
    data: { id: article.id, title: article.title, summary: article.summary, content },
    error: null,
  }
}
