import { describe, it, expect } from 'vitest'
import { buildContext } from './context-builder.service'
import type { VectorSearchMatch } from '@readhub/types'

function match(overrides: Partial<VectorSearchMatch> = {}): VectorSearchMatch {
  return {
    chunkId: 'chunk-1',
    articleId: 'art-1',
    articleTitle: 'Título de prueba',
    chunkIndex: 0,
    content: 'x'.repeat(50),
    similarity: 0.5,
    ...overrides,
  }
}

describe('buildContext', () => {
  it('devuelve contexto vacío cuando no hay matches', () => {
    const result = buildContext('¿Qué es X?', [])
    expect(result.sources).toEqual([])
    expect(result.contextText).toBe('')
    expect(result.truncated).toBe(false)
    expect(result.prompt).toContain('(sin información relevante encontrada)')
    expect(result.prompt).toContain('PREGUNTA: ¿Qué es X?')
  })

  it('recorta los espacios de la pregunta en el prompt final', () => {
    const result = buildContext('   hola   ', [])
    expect(result.prompt).toContain('PREGUNTA: hola')
  })

  it('descarta fragmentos con contenido menor a MIN_CONTENT_CHARS (20)', () => {
    const result = buildContext('q', [match({ content: 'muy corto' })])
    expect(result.sources).toEqual([])
  })

  it('descarta matches por debajo de minSimilarity', () => {
    const matches = [match({ similarity: 0.1 }), match({ articleId: 'art-2', similarity: 0.9 })]
    const result = buildContext('q', matches, { minSimilarity: 0.5 })
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0].articleId).toBe('art-2')
  })

  it('ordena las fuentes por similitud descendente sin importar el orden de entrada', () => {
    // contenido distinto por match: contenido idéntico activaría el filtro de
    // redundancia y confundiría esta prueba de orden con la de deduplicación.
    const matches = [
      match({ articleId: 'a', similarity: 0.2, content: 'contenido a '.repeat(3) }),
      match({ articleId: 'b', similarity: 0.9, content: 'contenido b '.repeat(3) }),
      match({ articleId: 'c', similarity: 0.5, content: 'contenido c '.repeat(3) }),
    ]
    const result = buildContext('q', matches)
    expect(result.sources.map((s) => s.articleId)).toEqual(['b', 'c', 'a'])
    expect(result.sources.map((s) => s.rank)).toEqual([1, 2, 3])
  })

  it('respeta maxDocuments (artículos distintos)', () => {
    const matches = [
      match({ articleId: 'a', similarity: 0.9, content: 'contenido a '.repeat(3) }),
      match({ articleId: 'b', similarity: 0.8, content: 'contenido b '.repeat(3) }),
      match({ articleId: 'c', similarity: 0.7, content: 'contenido c '.repeat(3) }),
    ]
    const result = buildContext('q', matches, { maxDocuments: 2 })
    expect(result.sources.map((s) => s.articleId)).toEqual(['a', 'b'])
  })

  it('respeta maxChunksPerArticle', () => {
    const matches = [
      match({ articleId: 'a', chunkIndex: 0, similarity: 0.9, content: 'a'.repeat(30) }),
      match({ articleId: 'a', chunkIndex: 1, similarity: 0.8, content: 'b'.repeat(30) }),
      match({ articleId: 'a', chunkIndex: 2, similarity: 0.7, content: 'c'.repeat(30) }),
    ]
    const result = buildContext('q', matches, { maxChunksPerArticle: 2 })
    expect(result.sources).toHaveLength(2)
    expect(result.sources.map((s) => s.chunkIndex)).toEqual([0, 1])
  })

  it('descarta fragmentos redundantes (contenido duplicado o contenido entre sí)', () => {
    const matches = [
      match({ articleId: 'a', similarity: 0.9, content: 'Contenido Relevante Sobre El Tema' }),
      // mismo contenido normalizado (case/espacios distintos) → redundante
      match({ articleId: 'b', similarity: 0.8, content: 'contenido   relevante sobre el tema' }),
      // contiene el contenido ya incluido → también redundante
      match({
        articleId: 'c',
        similarity: 0.7,
        content: 'Prefijo extra contenido relevante sobre el tema sufijo extra',
      }),
    ]
    const result = buildContext('q', matches)
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0].articleId).toBe('a')
  })

  it('excluye por completo una fuente si no queda presupuesto ni para su encabezado', () => {
    const matches = [
      match({ articleId: 'a', articleTitle: 'T1', similarity: 0.9, content: 'A'.repeat(30) }),
      match({ articleId: 'b', articleTitle: 'T2', similarity: 0.8, content: 'B'.repeat(30) }),
    ]
    // bloque 1 = header(16) + 30 = 46 <= 50 → entra completo, usedChars = 48
    // bloque 2 = header(16) + 30 = 46; 48+46=94 > 50 → truncated; remaining = 50-48-16 = -14 <= 0 → se descarta entero
    const result = buildContext('q', matches, { maxContextChars: 50 })
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0].articleId).toBe('a')
    expect(result.truncated).toBe(true)
  })

  it('recorta el contenido de una fuente cuando queda presupuesto parcial', () => {
    const matches = [
      match({ articleId: 'a', articleTitle: 'T1', similarity: 0.9, content: 'A'.repeat(30) }),
      match({ articleId: 'b', articleTitle: 'T2', similarity: 0.8, content: 'B'.repeat(30) }),
    ]
    // remaining para el bloque 2 = 70-48-16 = 6 > 0 → se recorta a 6 chars + '…'
    const result = buildContext('q', matches, { maxContextChars: 70 })
    expect(result.sources).toHaveLength(2)
    expect(result.truncated).toBe(true)
    expect(result.contextText).toContain(`${'B'.repeat(6)}…`)
    expect(result.contextText).not.toContain('B'.repeat(30))
  })

  it('el excerpt de cada fuente usa el contenido original completo (no el bloque recortado)', () => {
    const longContent = 'y'.repeat(200)
    const result = buildContext('q', [match({ content: longContent })])
    expect(result.sources[0].excerpt).toBe(`${'y'.repeat(160)}…`)
  })

  it('no trunca el excerpt si el contenido cabe en 160 caracteres', () => {
    const shortContent = 'z'.repeat(100)
    const result = buildContext('q', [match({ content: shortContent })])
    expect(result.sources[0].excerpt).toBe(shortContent)
  })

  it('incluye el número de fuente y el título en el prompt final', () => {
    const result = buildContext('mi pregunta', [match({ articleTitle: 'Artículo A', content: 'z'.repeat(30) })])
    expect(result.prompt).toContain('[Fuente 1] "Artículo A"')
    expect(result.prompt).toContain('CONTEXTO:')
    expect(result.prompt).toContain('PREGUNTA: mi pregunta')
  })
})
