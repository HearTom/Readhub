import type { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from './embedding.service'
import type { ServiceResult } from './types'
import type { VectorSearchMatch, VectorSearchOptions } from '@/types/vector-search'

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
