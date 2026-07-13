import type { ContextSource } from './context'

// Misma forma que ContextSource — se reexporta con su propio nombre para no
// acoplar la interfaz pública del chat al tipo interno del context builder.
export type ChatSource = ContextSource

export interface ChatMetadata {
  model: string
  matchesFound: number // candidatos devueltos por vector-search.service.ts
  sourcesUsed: number // fuentes que realmente entraron al contexto final
  contextTruncated: boolean
  tookMs: number
}

export interface ChatResult {
  answer: string
  sources: ChatSource[]
  contextFound: boolean // true si hubo al menos una fuente en el contexto (dato objetivo, no una interpretación de la respuesta del modelo)
  metadata: ChatMetadata
}
