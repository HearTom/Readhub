import type { createClient } from './server'
import type { Article, ArticleChunkInsert, IndexArticleResult } from '@readhub/types'
import type { ServiceResult } from './types'
import { embedTexts, EMBEDDING_DIMENSIONS, chunkText, extractText } from '@readhub/ai'

// Este servicio corre exclusivamente server-side (usa el cliente de
// lib/supabase/server.ts, no el de navegador) porque la extracción de
// PDF/DOCX y el SDK de Hugging Face requieren APIs de Node.
type Client = Awaited<ReturnType<typeof createClient>>

const DOCUMENTS_BUCKET = 'documents' // mismo bucket que services/storage.service.ts

// ─────────────────────────────────────────────────────────────────────────────
// BUILD ARTICLE TEXT
// Compone el texto que será vectorizado a partir de los campos disponibles
// del artículo: título → resumen → contenido del documento (si existe).
// `articles` no tiene columnas de categoría/etiquetas en este esquema; si se
// agregaran en el futuro, se sumarían aquí siguiendo el mismo criterio.
//
// Justificación del orden y del formato (separador en blanco entre partes,
// compatible con el chunker por párrafos de lib/ai/chunk-text.ts):
//   1. Título primero: es la porción de mayor densidad semántica por palabra
//      (el autor ya condensó el tema en pocas palabras) y siempre cabe en el
//      primer fragmento (chunk_index 0), garantizando que ese fragmento de
//      alto nivel sea recuperable aunque el resto del artículo sea muy largo.
//   2. Resumen después: contexto adicional de alto valor, normalmente corto,
//      pensado por el propio autor para describir el artículo.
//   3. Contenido del documento al final: es la porción más extensa y variable
//      — si el artículo es largo, es la que terminará repartida en múltiples
//      chunks adicionales, sin desplazar título+resumen del primer fragmento.
// ─────────────────────────────────────────────────────────────────────────────
export function buildArticleText(
  article: Pick<Article, 'title' | 'summary'>,
  content?: string | null
): string {
  const parts: string[] = [article.title.trim()]
  if (article.summary?.trim()) parts.push(article.summary.trim())
  if (content?.trim()) parts.push(content.trim())
  return parts.join('\n\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE EMBEDDING(S)
// Único punto de contacto con el proveedor de embeddings (Hugging Face vía
// lib/ai/embeddings.ts). Ningún otro módulo del proyecto debe importar
// lib/ai directamente. Valida dimensión y cantidad de vectores recibidos
// antes de dar la respuesta por buena.
// ─────────────────────────────────────────────────────────────────────────────
export async function generateEmbeddings(
  texts: string[]
): Promise<ServiceResult<number[][]>> {
  if (texts.length === 0) return { data: [], error: null }

  let vectors: number[][]
  try {
    vectors = await embedTexts(texts)
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al generar los embeddings',
    }
  }

  if (vectors.length !== texts.length) {
    return {
      data: null,
      error: 'El proveedor de embeddings devolvió un número de vectores distinto al esperado',
    }
  }

  const invalid = vectors.find((v) => v.length !== EMBEDDING_DIMENSIONS)
  if (invalid) {
    return {
      data: null,
      error: `El proveedor de embeddings devolvió un vector de ${invalid.length} dimensiones; se esperaban ${EMBEDDING_DIMENSIONS}`,
    }
  }

  return { data: vectors, error: null }
}

export async function generateEmbedding(text: string): Promise<ServiceResult<number[]>> {
  const result = await generateEmbeddings([text])
  if (result.error !== null) return { data: null, error: result.error }
  return { data: result.data[0], error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSIST ARTICLE CHUNKS
// RLS article_chunks_insert/delete (ver supabase/migrations/20260709041204_*
// y 20260709041322_*): requieren que auth.uid() sea el autor del artículo.
// Reemplazo completo (DELETE + INSERT) para no dejar vectores huérfanos ni
// duplicados si esta función se vuelve a ejecutar sobre el mismo artículo.
// ─────────────────────────────────────────────────────────────────────────────
export async function persistArticleChunks(
  client: Client,
  articleId: string,
  chunks: { content: string; embedding: number[] }[]
): Promise<ServiceResult<IndexArticleResult>> {
  const { error: deleteError } = await client
    .from('article_chunks')
    .delete()
    .eq('article_id', articleId)

  if (deleteError) return { data: null, error: deleteError.message }

  if (chunks.length === 0) {
    return { data: { chunksCreated: 0 }, error: null }
  }

  const rows: ArticleChunkInsert[] = chunks.map((chunk, index) => ({
    article_id: articleId,
    chunk_index: index,
    content: chunk.content,
    embedding: chunk.embedding,
  }))

  const { error: insertError } = await client
    .from('article_chunks')
    .insert(rows as never)

  if (insertError) return { data: null, error: insertError.message }

  return { data: { chunksCreated: rows.length }, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMBED ARTICLE — punto de entrada principal de este servicio.
// Ejecución manual en esta fase (nadie la dispara todavía automáticamente):
// recibe un artículo completo, compone su texto (título + resumen + contenido
// del documento en Storage, si existe), lo fragmenta, genera un embedding
// por fragmento y lo persiste en article_chunks.
//
// Best-effort ante fallas de extracción: si el documento no se puede
// descargar o su formato no es soportado, se indexa igual con título+resumen
// en vez de fallar por completo — mismo criterio de resiliencia que ya usa
// el resto del proyecto (p. ej. registerView es fire-and-forget).
// ─────────────────────────────────────────────────────────────────────────────
export async function embedArticle(
  client: Client,
  article: Article
): Promise<ServiceResult<IndexArticleResult>> {
  let documentText: string | null = null

  if (article.document_path) {
    try {
      const { data: blob, error: downloadError } = await client.storage
        .from(DOCUMENTS_BUCKET)
        .download(article.document_path)

      if (!downloadError && blob) {
        const buffer = Buffer.from(await blob.arrayBuffer())
        documentText = await extractText(buffer, blob.type || 'text/plain')
      }
    } catch (err) {
      // Observabilidad: la extracción falla silenciosamente hacia el resultado
      // (se indexa igual con título+resumen), pero deja rastro en logs del
      // servidor para poder diagnosticar documentos que nunca se indexan bien.
      console.warn(
        `[embedding.service] No se pudo extraer texto de "${article.document_path}":`,
        err instanceof Error ? err.message : err
      )
      documentText = null
    }
  }

  const fullText = buildArticleText(article, documentText)
  const chunks = chunkText(fullText)

  // Importante: se llama a persistArticleChunks incluso con 0 chunks (en vez
  // de retornar antes). persistArticleChunks siempre borra los chunks previos
  // del artículo antes de insertar los nuevos — si se retornara aquí sin
  // llamarla, un artículo que antes tenía chunks válidos y ahora quedó sin
  // contenido indexable (caso extremo, no debería ocurrir dado que el título
  // es obligatorio) conservaría vectores viejos y ya no vigentes.
  if (chunks.length === 0) {
    return persistArticleChunks(client, article.id, [])
  }

  const embeddingsResult = await generateEmbeddings(chunks)
  if (embeddingsResult.error !== null) return { data: null, error: embeddingsResult.error }

  const chunkRows = chunks.map((content, i) => ({
    content,
    embedding: embeddingsResult.data[i],
  }))

  return persistArticleChunks(client, article.id, chunkRows)
}
