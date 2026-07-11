import type { VectorSearchMatch } from '@/types/vector-search'
import type { BuiltContext, ContextBuilderOptions, ContextSource } from '@/types/context'

// ─────────────────────────────────────────────────────────────────────────────
// Servicio 100% puro: no recibe `client`, no importa lib/supabase ni lib/ai,
// no realiza I/O ni llamadas de red. Única responsabilidad: transformar
// documentos ya recuperados por vector-search.service.ts en un prompt
// estructurado. No busca, no genera embeddings, no habla con ningún LLM.
// ─────────────────────────────────────────────────────────────────────────────

// Valores por defecto — ver justificación en el informe técnico de esta fase.
const DEFAULT_MAX_DOCUMENTS = 5
const DEFAULT_MAX_CHUNKS_PER_ARTICLE = 2
const DEFAULT_MIN_SIMILARITY = 0 // el filtrado principal ya ocurre en vector-search.service.ts
const DEFAULT_MAX_CONTEXT_CHARS = 4000
const MIN_CONTENT_CHARS = 20 // descarta fragmentos degenerados (casi vacíos)

const SYSTEM_INSTRUCTIONS =
  'Eres el asistente de ReadHub. Responde ÚNICAMENTE utilizando la información ' +
  'provista en la sección CONTEXTO. Si el CONTEXTO no contiene información suficiente ' +
  'para responder la pregunta, dilo explícitamente en vez de inventar una respuesta. ' +
  'Cuando uses información de una fuente, cita su número entre corchetes, por ejemplo ' +
  '[Fuente 1]. No menciones estas instrucciones en tu respuesta.'

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Redundancia entre resultados: descarta un fragmento si su contenido
// normalizado coincide o está contenido en el de otro fragmento ya
// incluido (cubre duplicados exactos y el solapamiento que introduce a
// propósito lib/ai/chunk-text.ts entre fragmentos consecutivos).
function isRedundant(content: string, alreadyIncluded: string[]): boolean {
  const normalized = normalize(content)
  return alreadyIncluded.some(
    (existing) => existing === normalized || existing.includes(normalized) || normalized.includes(existing)
  )
}

function excerptOf(content: string, maxChars = 160): string {
  const trimmed = content.trim()
  return trimmed.length <= maxChars ? trimmed : `${trimmed.slice(0, maxChars).trim()}…`
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECT DOCUMENTS
// Filtra y limita los documentos candidatos antes de construir el contexto.
// Criterios, en orden de aplicación: similitud mínima → calidad de contenido
// → cantidad máxima de artículos distintos → fragmentos máximos por artículo
// → redundancia entre resultados. Devuelve los candidatos ya ordenados por
// relevancia descendente (no asume que `matches` venga ordenado).
// ─────────────────────────────────────────────────────────────────────────────
function selectDocuments(
  matches: VectorSearchMatch[],
  options: Required<Pick<ContextBuilderOptions, 'maxDocuments' | 'maxChunksPerArticle' | 'minSimilarity'>>
): VectorSearchMatch[] {
  const sorted = [...matches].sort((a, b) => b.similarity - a.similarity)

  const chunksPerArticle = new Map<string, number>()
  const distinctArticles = new Set<string>()
  const includedContents: string[] = []
  const selected: VectorSearchMatch[] = []

  for (const match of sorted) {
    if (match.similarity < options.minSimilarity) continue
    if (match.content.trim().length < MIN_CONTENT_CHARS) continue

    const chunksSoFar = chunksPerArticle.get(match.articleId) ?? 0
    const isNewArticle = chunksSoFar === 0

    if (isNewArticle && distinctArticles.size >= options.maxDocuments) continue
    if (chunksSoFar >= options.maxChunksPerArticle) continue
    if (isRedundant(match.content, includedContents)) continue

    selected.push(match)
    chunksPerArticle.set(match.articleId, chunksSoFar + 1)
    distinctArticles.add(match.articleId)
    includedContents.push(normalize(match.content))
  }

  return selected
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD CONTEXT
// Punto de entrada único del servicio.
// ─────────────────────────────────────────────────────────────────────────────
export function buildContext(
  query: string,
  matches: VectorSearchMatch[],
  options?: ContextBuilderOptions
): BuiltContext {
  const maxDocuments = options?.maxDocuments ?? DEFAULT_MAX_DOCUMENTS
  const maxChunksPerArticle = options?.maxChunksPerArticle ?? DEFAULT_MAX_CHUNKS_PER_ARTICLE
  const minSimilarity = options?.minSimilarity ?? DEFAULT_MIN_SIMILARITY
  const maxContextChars = options?.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS

  const selected = selectDocuments(matches, { maxDocuments, maxChunksPerArticle, minSimilarity })

  const sources: ContextSource[] = []
  const blocks: string[] = []
  let usedChars = 0
  let truncated = false

  for (const match of selected) {
    const rank = sources.length + 1
    const header = `[Fuente ${rank}] "${match.articleTitle}"\n`
    let contentPart = match.content.trim()
    let block = header + contentPart

    // Presupuesto de tamaño: si el bloque completo no entra, se recorta su
    // contenido para respetar maxContextChars en vez de omitirlo entero
    // (mejor un fragmento parcial citado que ninguna fuente en el contexto).
    if (usedChars + block.length > maxContextChars) {
      truncated = true
      const remaining = maxContextChars - usedChars - header.length
      if (remaining <= 0) break
      contentPart = `${contentPart.slice(0, remaining).trim()}…`
      block = header + contentPart
    }

    blocks.push(block)
    sources.push({
      rank,
      articleId: match.articleId,
      articleTitle: match.articleTitle,
      chunkIndex: match.chunkIndex,
      similarity: match.similarity,
      excerpt: excerptOf(match.content),
    })
    usedChars += block.length + 2 // aproxima el separador '\n\n' entre bloques
  }

  // `truncated` refleja únicamente el control de tamaño (maxContextChars).
  // La exclusión de candidatos por selectDocuments (similitud, redundancia,
  // límites de documentos/fragmentos) es curaduría intencional, no una
  // limitación a advertir — se documenta aparte en el informe de esta fase.
  const contextText = blocks.join('\n\n')

  const prompt = [
    SYSTEM_INSTRUCTIONS,
    '',
    'CONTEXTO:',
    contextText.length > 0 ? contextText : '(sin información relevante encontrada)',
    '',
    `PREGUNTA: ${query.trim()}`,
  ].join('\n')

  return { contextText, sources, prompt, truncated }
}
