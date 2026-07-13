import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchSimilarChunks, getArticleChunks, getArticleWithContent } from './vector-search.service'
import { createFromClientMock, createQueryBuilder } from './test/supabase-mock'

vi.mock('./embedding.service', () => ({
  generateEmbedding: vi.fn(),
}))

import { generateEmbedding } from './embedding.service'

describe('searchSimilarChunks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve [] sin llamar a generateEmbedding ni a rpc si la consulta está vacía', async () => {
    const client = { rpc: vi.fn() } as any
    const result = await searchSimilarChunks(client, '   ')
    expect(result).toEqual({ data: [], error: null })
    expect(generateEmbedding).not.toHaveBeenCalled()
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('propaga el error de generateEmbedding sin llamar a rpc', async () => {
    vi.mocked(generateEmbedding).mockResolvedValue({ data: null, error: 'HF no disponible' })
    const client = { rpc: vi.fn() } as any

    const result = await searchSimilarChunks(client, 'una consulta')

    expect(result).toEqual({ data: null, error: 'HF no disponible' })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('llama a rpc con los valores por defecto (matchCount=5, matchThreshold=0.25) y mapea los resultados', async () => {
    vi.mocked(generateEmbedding).mockResolvedValue({ data: [0.1, 0.2, 0.3], error: null })
    const rows = [
      {
        chunk_id: 'c1',
        article_id: 'a1',
        article_title: 'Título',
        chunk_index: 0,
        content: 'contenido',
        similarity: 0.42,
      },
    ]
    const client = { rpc: vi.fn().mockResolvedValue({ data: rows, error: null }) } as any

    const result = await searchSimilarChunks(client, 'una consulta')

    expect(client.rpc).toHaveBeenCalledWith('match_article_chunks', {
      query_embedding: [0.1, 0.2, 0.3],
      match_count: 5,
      match_threshold: 0.25,
    })
    expect(result).toEqual({
      data: [
        {
          chunkId: 'c1',
          articleId: 'a1',
          articleTitle: 'Título',
          chunkIndex: 0,
          content: 'contenido',
          similarity: 0.42,
        },
      ],
      error: null,
    })
  })

  it('pasa matchCount/matchThreshold personalizados a rpc', async () => {
    vi.mocked(generateEmbedding).mockResolvedValue({ data: [0.1], error: null })
    const client = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) } as any

    await searchSimilarChunks(client, 'q', { matchCount: 10, matchThreshold: 0.5 })

    expect(client.rpc).toHaveBeenCalledWith(
      'match_article_chunks',
      expect.objectContaining({ match_count: 10, match_threshold: 0.5 })
    )
  })

  it('devuelve el error cuando rpc falla', async () => {
    vi.mocked(generateEmbedding).mockResolvedValue({ data: [0.1], error: null })
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'rpc caída' } }) } as any

    const result = await searchSimilarChunks(client, 'q')

    expect(result).toEqual({ data: null, error: 'rpc caída' })
  })

  it('devuelve [] cuando rpc no da error pero data es null', async () => {
    vi.mocked(generateEmbedding).mockResolvedValue({ data: [0.1], error: null })
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) } as any

    const result = await searchSimilarChunks(client, 'q')

    expect(result).toEqual({ data: [], error: null })
  })
})

describe('getArticleChunks', () => {
  it('concatena el contenido de los chunks ordenados con doble salto de línea', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          { content: 'parte uno', chunk_index: 0 },
          { content: 'parte dos', chunk_index: 1 },
        ],
        error: null,
      })
    )

    const result = await getArticleChunks(client, 'art-1')

    expect(result).toEqual({ data: 'parte uno\n\nparte dos', error: null })
  })

  it('devuelve error cuando la consulta falla', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'db error' } }))

    const result = await getArticleChunks(client, 'art-1')

    expect(result).toEqual({ data: null, error: 'db error' })
  })

  it('devuelve string vacío cuando el artículo no tiene chunks', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))

    const result = await getArticleChunks(client, 'art-1')

    expect(result).toEqual({ data: '', error: null })
  })
})

describe('getArticleWithContent', () => {
  it('devuelve error si el artículo no existe', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    const result = await getArticleWithContent(client, 'missing')

    expect(result).toEqual({ data: null, error: 'Artículo no encontrado' })
  })

  it('usa el texto indexado como content cuando existen chunks', async () => {
    const client = createFromClientMock() as any
    client.from
      .mockReturnValueOnce(
        createQueryBuilder({ data: { id: 'a1', title: 'T', summary: 'Resumen' }, error: null })
      )
      .mockReturnValueOnce(createQueryBuilder({ data: [{ content: 'texto indexado', chunk_index: 0 }], error: null }))

    const result = await getArticleWithContent(client, 'a1')

    expect(result).toEqual({
      data: { id: 'a1', title: 'T', summary: 'Resumen', content: 'texto indexado' },
      error: null,
    })
  })

  it('usa el resumen como content cuando no hay chunks indexados', async () => {
    const client = createFromClientMock() as any
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: { id: 'a1', title: 'T', summary: 'Resumen' }, error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))

    const result = await getArticleWithContent(client, 'a1')

    expect(result.data).toEqual({ id: 'a1', title: 'T', summary: 'Resumen', content: 'Resumen' })
  })

  it('usa un mensaje por defecto cuando no hay chunks ni resumen', async () => {
    const client = createFromClientMock() as any
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: { id: 'a1', title: 'T', summary: null }, error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))

    const result = await getArticleWithContent(client, 'a1')

    expect(result.data?.content).toBe('(sin contenido indexado ni resumen disponible)')
  })

  it('propaga el error si falla la obtención de chunks', async () => {
    const client = createFromClientMock() as any
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: { id: 'a1', title: 'T', summary: null }, error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'chunks error' } }))

    const result = await getArticleWithContent(client, 'a1')

    expect(result).toEqual({ data: null, error: 'chunks error' })
  })
})
