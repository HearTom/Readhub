import type { createClient } from '@/lib/supabase/server'
import { searchSimilarChunks } from './vector-search.service'
import { buildContext } from './context-builder.service'
import { generateAnswer, GENERATION_MODEL } from '@/lib/ai/generation'
import type { ServiceResult } from './types'
import type { ChatResult } from '@/types/chat'
import type { VectorSearchOptions } from '@/types/vector-search'
import type { ContextBuilderOptions } from '@/types/context'

type Client = Awaited<ReturnType<typeof createClient>>

export interface AskQuestionOptions {
  search?: VectorSearchOptions
  context?: ContextBuilderOptions
}

// ─────────────────────────────────────────────────────────────────────────────
// ASK QUESTION — único punto de entrada del asistente conversacional.
//
// Orquesta el flujo RAG completo reutilizando exclusivamente los servicios
// ya existentes; no implementa lógica de embeddings, recuperación ni
// construcción de contexto por su cuenta:
//
//   pregunta
//     → vector-search.service.ts (internamente ya reutiliza
//       embedding.service.ts para generar el embedding de la consulta —
//       chat.service.ts NO vuelve a llamarlo por separado, evitando
//       duplicar esa invocación)
//     → context-builder.service.ts (puro, arma el prompt)
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

  const searchResult = await searchSimilarChunks(client, trimmedQuestion, options?.search)
  if (searchResult.error !== null) {
    return { data: null, error: searchResult.error }
  }

  const built = buildContext(trimmedQuestion, searchResult.data, options?.context)

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
      matchesFound: searchResult.data.length,
      sourcesUsed: built.sources.length,
      contextTruncated: built.truncated,
      tookMs: Date.now() - startedAt,
    },
  }

  return { data: result, error: null }
}
