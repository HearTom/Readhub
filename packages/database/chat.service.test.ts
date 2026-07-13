import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./vector-search.service', () => ({ searchSimilarChunks: vi.fn() }))
vi.mock('@readhub/ai', () => ({ generateAnswer: vi.fn(), GENERATION_MODEL: 'modelo-de-prueba' }))

import { searchSimilarChunks } from './vector-search.service'
import { generateAnswer, GENERATION_MODEL } from '@readhub/ai'
import { buildResearchContext, askQuestion } from './chat.service'
import type { VectorSearchMatch } from '@readhub/types'

function match(overrides: Partial<VectorSearchMatch> = {}): VectorSearchMatch {
  return {
    chunkId: 'chunk-1',
    articleId: 'art-1',
    articleTitle: 'Artículo relevante',
    chunkIndex: 0,
    content: 'contenido con longitud suficiente para pasar el filtro mínimo',
    similarity: 0.8,
    ...overrides,
  }
}

describe('buildResearchContext', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rechaza una consulta vacía sin llamar a searchSimilarChunks', async () => {
    const result = await buildResearchContext({} as any, '   ')
    expect(result).toEqual({ data: null, error: 'La consulta no puede estar vacía' })
    expect(searchSimilarChunks).not.toHaveBeenCalled()
  })

  it('propaga el error de searchSimilarChunks', async () => {
    vi.mocked(searchSimilarChunks).mockResolvedValue({ data: null, error: 'HF caído' })
    const result = await buildResearchContext({} as any, 'pregunta')
    expect(result).toEqual({ data: null, error: 'HF caído' })
  })

  it('construye el contexto real y reporta matchesFound', async () => {
    vi.mocked(searchSimilarChunks).mockResolvedValue({ data: [match(), match({ articleId: 'art-2', content: 'otro contenido distinto con longitud suficiente' })], error: null })

    const result = await buildResearchContext({} as any, 'pregunta')

    expect(result.error).toBeNull()
    expect(result.data?.matchesFound).toBe(2)
    expect(result.data?.sources).toHaveLength(2)
    expect(result.data?.prompt).toContain('PREGUNTA: pregunta')
  })
})

describe('askQuestion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rechaza una pregunta vacía sin llamar a ningún colaborador', async () => {
    const result = await askQuestion({} as any, '   ')
    expect(result).toEqual({ data: null, error: 'La pregunta no puede estar vacía' })
    expect(searchSimilarChunks).not.toHaveBeenCalled()
    expect(generateAnswer).not.toHaveBeenCalled()
  })

  it('propaga el error de recuperación de contexto sin llamar al LLM', async () => {
    vi.mocked(searchSimilarChunks).mockResolvedValue({ data: null, error: 'búsqueda vectorial caída' })

    const result = await askQuestion({} as any, '¿qué es X?')

    expect(result).toEqual({ data: null, error: 'búsqueda vectorial caída' })
    expect(generateAnswer).not.toHaveBeenCalled()
  })

  it('captura el mensaje cuando generateAnswer lanza', async () => {
    vi.mocked(searchSimilarChunks).mockResolvedValue({ data: [match()], error: null })
    vi.mocked(generateAnswer).mockRejectedValue(new Error('modelo no disponible'))

    const result = await askQuestion({} as any, '¿qué es X?')

    expect(result).toEqual({ data: null, error: 'modelo no disponible' })
  })

  it('rechaza una respuesta vacía del modelo', async () => {
    vi.mocked(searchSimilarChunks).mockResolvedValue({ data: [match()], error: null })
    vi.mocked(generateAnswer).mockResolvedValue('   ')

    const result = await askQuestion({} as any, '¿qué es X?')

    expect(result).toEqual({ data: null, error: 'El modelo no devolvió ninguna respuesta' })
  })

  it('devuelve un ChatResult completo en el camino feliz', async () => {
    vi.mocked(searchSimilarChunks).mockResolvedValue({ data: [match(), match({ articleId: 'art-2', content: 'otro contenido distinto con longitud suficiente' })], error: null })
    vi.mocked(generateAnswer).mockResolvedValue('  Esta es la respuesta.  ')

    const result = await askQuestion({} as any, '¿qué es X?')

    expect(result.error).toBeNull()
    expect(result.data?.answer).toBe('Esta es la respuesta.')
    expect(result.data?.contextFound).toBe(true)
    expect(result.data?.sources).toHaveLength(2)
    expect(result.data?.metadata).toMatchObject({
      model: GENERATION_MODEL,
      matchesFound: 2,
      sourcesUsed: 2,
      contextTruncated: false,
    })
    expect(result.data?.metadata.tookMs).toBeGreaterThanOrEqual(0)
  })

  it('contextFound es false cuando no hay fuentes en el contexto', async () => {
    vi.mocked(searchSimilarChunks).mockResolvedValue({ data: [], error: null })
    vi.mocked(generateAnswer).mockResolvedValue('Respuesta sin contexto.')

    const result = await askQuestion({} as any, '¿qué es X?')

    expect(result.data?.contextFound).toBe(false)
    expect(result.data?.sources).toEqual([])
  })
})
