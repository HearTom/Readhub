import type { createClient } from './server'
import { searchSimilarChunks } from './vector-search.service'
import { buildContext } from './context-builder.service'
import { generateAnswer, GENERATION_MODEL } from '@readhub/ai'
import type { ServiceResult } from './types'
import type { BuiltContext, ChatResult, VectorSearchOptions, ContextBuilderOptions } from '@readhub/types'

type Client = Awaited<ReturnType<typeof createClient>>

export interface AskQuestionOptions {
  search?: VectorSearchOptions
  context?: ContextBuilderOptions
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD RESEARCH CONTEXT — paso "recuperación + construcción de contexto" del
// pipeline RAG, extraído como función propia para que askQuestion y
// consumidores que solo necesitan el CONTEXTO (sin generar una respuesta —
// p. ej. la Tool build_research_context) compartan la misma composición en
// vez de reimplementarla cada uno por su lado. No genera nada con el LLM.
// ─────────────────────────────────────────────────────────────────────────────
export interface ResearchContext extends BuiltContext {
  matchesFound: number // cantidad de fragmentos crudos encontrados por similitud, antes de la selección/filtrado de context-builder.service.ts (sources.length es la cantidad ya filtrada)
}

export async function buildResearchContext(
  client: Client,
  query: string,
  options?: AskQuestionOptions
): Promise<ServiceResult<ResearchContext>> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length === 0) {
    return { data: null, error: 'La consulta no puede estar vacía' }
  }

  const searchResult = await searchSimilarChunks(client, trimmedQuery, options?.search)
  if (searchResult.error !== null) {
    return { data: null, error: searchResult.error }
  }

  const built = buildContext(trimmedQuery, searchResult.data, options?.context)
  return { data: { ...built, matchesFound: searchResult.data.length }, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASK QUESTION — único punto de entrada del asistente conversacional.
//
// Orquesta el flujo RAG completo reutilizando exclusivamente los servicios
// ya existentes; no implementa lógica de embeddings, recuperación ni
// construcción de contexto por su cuenta:
//
//   pregunta
//     → buildResearchContext (arriba, en este mismo archivo) — que a su vez
//       reutiliza vector-search.service.ts (embedding + similitud) y
//       context-builder.service.ts (arma el prompt), sin duplicar ninguno
//     → lib/ai/generation.ts (único punto de contacto con el proveedor de
//       generación; su identidad queda oculta detrás de esta función)
//     → resultado estructurado
// ─────────────────────────────────────────────────────────────────────────────
export async function askQuestion(
  client: Client,
  question: string,
  options?: AskQuestionOptions
): Promise<ServiceResult<ChatResult>> {
  const trimmedQuestion = question.trim()
  if (trimmedQuestion.length === 0) {
    return { data: null, error: 'La pregunta no puede estar vacía' }
  }

  const startedAt = Date.now()

  const contextResult = await buildResearchContext(client, trimmedQuestion, options)
  if (contextResult.error !== null) {
    return { data: null, error: contextResult.error }
  }
  const built = contextResult.data

  let answer: string
  try {
    answer = await generateAnswer(built.prompt)
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al generar la respuesta',
    }
  }

  if (answer.trim().length === 0) {
    return { data: null, error: 'El modelo no devolvió ninguna respuesta' }
  }

  const result: ChatResult = {
    answer: answer.trim(),
    sources: built.sources,
    contextFound: built.sources.length > 0,
    metadata: {
      model: GENERATION_MODEL,
      matchesFound: built.matchesFound,
      sourcesUsed: built.sources.length,
      contextTruncated: built.truncated,
      tookMs: Date.now() - startedAt,
    },
  }

  return { data: result, error: null }
}
