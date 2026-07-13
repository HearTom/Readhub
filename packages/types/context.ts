export interface ContextSource {
  rank: number // posición dentro del contexto final (1-based), coincide con "[Fuente N]" en el prompt
  articleId: string
  articleTitle: string
  chunkIndex: number
  similarity: number
  excerpt: string
}

export interface BuiltContext {
  contextText: string // solo el bloque de fuentes, ya formateado
  sources: ContextSource[] // metadata de cada fuente incluida, en el mismo orden que contextText
  prompt: string // prompt completo (instrucciones + contexto + pregunta), listo para el LLM
  truncated: boolean // true si se omitió o recortó contenido por el límite de tamaño
}

export interface ContextBuilderOptions {
  maxDocuments?: number // artículos distintos máximos a incluir
  maxChunksPerArticle?: number // fragmentos máximos de un mismo artículo
  minSimilarity?: number // umbral adicional de selección (independiente del de vector-search.service.ts)
  maxContextChars?: number // presupuesto de tamaño del bloque de contexto
}
