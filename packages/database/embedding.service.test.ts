import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFromClientMock, createQueryBuilder } from './test/supabase-mock'
import type { Article } from '@readhub/types'

vi.mock('@readhub/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@readhub/ai')>()
  return { ...actual, embedTexts: vi.fn(), extractText: vi.fn() }
})

import { embedTexts, extractText, EMBEDDING_DIMENSIONS } from '@readhub/ai'
import {
  buildArticleText,
  generateEmbeddings,
  generateEmbedding,
  persistArticleChunks,
  embedArticle,
} from './embedding.service'

function vector(fill = 0): number[] {
  return Array(EMBEDDING_DIMENSIONS).fill(fill)
}

function articleFixture(overrides: Partial<Article> = {}): Article {
  return {
    id: 'art-1',
    author_id: 'user-1',
    title: 'Mi artículo',
    summary: 'Un resumen',
    document_path: null,
    image_path: null,
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('buildArticleText', () => {
  it('incluye solo el título cuando no hay resumen ni contenido', () => {
    expect(buildArticleText({ title: 'T', summary: null })).toBe('T')
  })

  it('recorta el título', () => {
    expect(buildArticleText({ title: '  T  ', summary: null })).toBe('T')
  })

  it('agrega el resumen separado por línea en blanco', () => {
    expect(buildArticleText({ title: 'T', summary: 'S' })).toBe('T\n\nS')
  })

  it('agrega título + resumen + contenido en ese orden', () => {
    expect(buildArticleText({ title: 'T', summary: 'S' }, 'C')).toBe('T\n\nS\n\nC')
  })

  it('excluye un resumen que es solo espacios en blanco', () => {
    expect(buildArticleText({ title: 'T', summary: '   ' })).toBe('T')
  })

  it('excluye un contenido que es solo espacios en blanco', () => {
    expect(buildArticleText({ title: 'T', summary: null }, '   ')).toBe('T')
  })
})

describe('generateEmbeddings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve [] sin llamar a embedTexts si no hay textos', async () => {
    const result = await generateEmbeddings([])
    expect(result).toEqual({ data: [], error: null })
    expect(embedTexts).not.toHaveBeenCalled()
  })

  it('captura el mensaje de un Error lanzado por embedTexts', async () => {
    vi.mocked(embedTexts).mockRejectedValue(new Error('HF caído'))
    const result = await generateEmbeddings(['a'])
    expect(result).toEqual({ data: null, error: 'HF caído' })
  })

  it('usa un mensaje genérico si el rechazo no es un Error', async () => {
    vi.mocked(embedTexts).mockRejectedValue('boom')
    const result = await generateEmbeddings(['a'])
    expect(result).toEqual({ data: null, error: 'Error al generar los embeddings' })
  })

  it('rechaza si la cantidad de vectores no coincide con la de textos', async () => {
    vi.mocked(embedTexts).mockResolvedValue([vector()])
    const result = await generateEmbeddings(['a', 'b'])
    expect(result).toEqual({
      data: null,
      error: 'El proveedor de embeddings devolvió un número de vectores distinto al esperado',
    })
  })

  it('rechaza si algún vector no tiene la dimensión esperada', async () => {
    vi.mocked(embedTexts).mockResolvedValue([vector(), [1, 2, 3]])
    const result = await generateEmbeddings(['a', 'b'])
    expect(result.error).toBe(
      `El proveedor de embeddings devolvió un vector de 3 dimensiones; se esperaban ${EMBEDDING_DIMENSIONS}`
    )
  })

  it('devuelve los vectores cuando todo es válido', async () => {
    const vectors = [vector(1), vector(2)]
    vi.mocked(embedTexts).mockResolvedValue(vectors)
    const result = await generateEmbeddings(['a', 'b'])
    expect(result).toEqual({ data: vectors, error: null })
  })
})

describe('generateEmbedding', () => {
  it('devuelve el primer (único) vector', async () => {
    vi.mocked(embedTexts).mockResolvedValue([vector(5)])
    const result = await generateEmbedding('texto')
    expect(result).toEqual({ data: vector(5), error: null })
  })

  it('propaga el error de generateEmbeddings', async () => {
    vi.mocked(embedTexts).mockRejectedValue(new Error('falló'))
    const result = await generateEmbedding('texto')
    expect(result).toEqual({ data: null, error: 'falló' })
  })
})

describe('persistArticleChunks', () => {
  it('devuelve el error de delete sin intentar insertar', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'delete falló' } }))

    const result = await persistArticleChunks(client, 'art-1', [{ content: 'c', embedding: vector() }])

    expect(result).toEqual({ data: null, error: 'delete falló' })
    expect(client.from).toHaveBeenCalledTimes(1)
  })

  it('con 0 chunks: borra y devuelve chunksCreated:0 sin insertar', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    const result = await persistArticleChunks(client, 'art-1', [])

    expect(result).toEqual({ data: { chunksCreated: 0 }, error: null })
    expect(client.from).toHaveBeenCalledTimes(1)
  })

  it('inserta los chunks con chunk_index secuencial desde 0', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))
    const insertBuilder = createQueryBuilder({ data: null, error: null })
    client.from.mockReturnValueOnce(insertBuilder)

    const chunks = [
      { content: 'uno', embedding: vector(1) },
      { content: 'dos', embedding: vector(2) },
    ]
    const result = await persistArticleChunks(client, 'art-1', chunks)

    expect(insertBuilder.insert).toHaveBeenCalledWith([
      { article_id: 'art-1', chunk_index: 0, content: 'uno', embedding: vector(1) },
      { article_id: 'art-1', chunk_index: 1, content: 'dos', embedding: vector(2) },
    ])
    expect(result).toEqual({ data: { chunksCreated: 2 }, error: null })
  })

  it('propaga el error de insert', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'insert falló' } }))

    const result = await persistArticleChunks(client, 'art-1', [{ content: 'c', embedding: vector() }])

    expect(result).toEqual({ data: null, error: 'insert falló' })
  })
})

describe('embedArticle', () => {
  beforeEach(() => vi.clearAllMocks())

  function clientWithStorage(download?: ReturnType<typeof vi.fn>) {
    const bucketApi = { download: download ?? vi.fn() }
    return { storage: { from: vi.fn(() => bucketApi) }, from: vi.fn() } as any
  }

  it('sin document_path: indexa solo título + resumen, sin tocar storage', async () => {
    const client = clientWithStorage()
    vi.mocked(embedTexts).mockResolvedValue([vector()])
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: null, error: null })) // delete
      .mockReturnValueOnce(createQueryBuilder({ data: null, error: null })) // insert

    const result = await embedArticle(client, articleFixture({ document_path: null }))

    expect(client.storage.from).not.toHaveBeenCalled()
    expect(embedTexts).toHaveBeenCalledWith(['Mi artículo\n\nUn resumen'])
    expect(result).toEqual({ data: { chunksCreated: 1 }, error: null })
  })

  it('con document_path: incluye el texto extraído del documento', async () => {
    const download = vi.fn().mockResolvedValue({
      data: { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)), type: 'text/plain' },
      error: null,
    })
    const client = clientWithStorage(download)
    vi.mocked(extractText).mockResolvedValue('contenido extraído del documento')
    vi.mocked(embedTexts).mockResolvedValue([vector()])
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    await embedArticle(client, articleFixture({ document_path: 'user-1/doc.txt' }))

    expect(embedTexts).toHaveBeenCalledWith(['Mi artículo\n\nUn resumen\n\ncontenido extraído del documento'])
  })

  it('es resiliente si la descarga del documento falla (indexa igual con título+resumen)', async () => {
    const download = vi.fn().mockResolvedValue({ data: null, error: { message: 'no existe' } })
    const client = clientWithStorage(download)
    vi.mocked(embedTexts).mockResolvedValue([vector()])
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    const result = await embedArticle(client, articleFixture({ document_path: 'user-1/doc.pdf' }))

    expect(extractText).not.toHaveBeenCalled()
    expect(embedTexts).toHaveBeenCalledWith(['Mi artículo\n\nUn resumen'])
    expect(result.error).toBeNull()
  })

  it('es resiliente si extractText lanza (indexa igual con título+resumen)', async () => {
    const download = vi.fn().mockResolvedValue({
      data: { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)), type: 'application/pdf' },
      error: null,
    })
    const client = clientWithStorage(download)
    vi.mocked(extractText).mockRejectedValue(new Error('PDF corrupto'))
    vi.mocked(embedTexts).mockResolvedValue([vector()])
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    const result = await embedArticle(client, articleFixture({ document_path: 'user-1/doc.pdf' }))

    expect(embedTexts).toHaveBeenCalledWith(['Mi artículo\n\nUn resumen'])
    expect(result.error).toBeNull()
  })

  it('con 0 chunks (texto vacío): persiste [] directamente sin llamar a embedTexts', async () => {
    const client = clientWithStorage()
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null })) // delete, sin insert

    const result = await embedArticle(client, articleFixture({ title: '', summary: null }))

    expect(embedTexts).not.toHaveBeenCalled()
    expect(client.from).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ data: { chunksCreated: 0 }, error: null })
  })

  it('propaga el error de generateEmbeddings sin llegar a persistir chunks', async () => {
    const client = clientWithStorage()
    vi.mocked(embedTexts).mockRejectedValue(new Error('proveedor caído'))

    const result = await embedArticle(client, articleFixture())

    expect(result).toEqual({ data: null, error: 'proveedor caído' })
    expect(client.from).not.toHaveBeenCalled()
  })
})
