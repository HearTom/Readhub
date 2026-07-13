import { describe, it, expect } from 'vitest'
import {
  getArticles,
  searchArticles,
  getArticle,
  getMyArticles,
  getAuthorsSummary,
  createArticle,
  registerView,
  addLike,
  removeLike,
  getLikesCount,
} from './article.service'
import { createFromClientMock, createQueryBuilder } from './test/supabase-mock'
import type { Article } from '@readhub/types'

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: 'art-1',
    author_id: 'user-1',
    title: 'Título',
    summary: 'Resumen',
    document_path: null,
    image_path: null,
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('searchArticles', () => {
  it('devuelve [] sin consultar la base de datos si la query está vacía', async () => {
    const client = createFromClientMock() as any
    const result = await searchArticles(client, '   ')
    expect(result).toEqual({ data: [], error: null })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('devuelve [] sin consultar si la query queda vacía tras sanitizar', async () => {
    const client = createFromClientMock() as any
    const result = await searchArticles(client, ',()%')
    expect(result).toEqual({ data: [], error: null })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('elimina , ( ) % del término antes de construir el filtro .or() (evita inyección en el DSL de PostgREST)', async () => {
    const client = createFromClientMock() as any
    const builder = createQueryBuilder({ data: [], error: null })
    client.from.mockReturnValueOnce(builder)

    await searchArticles(client, 'foo, (bar)% baz')

    expect(builder.or).toHaveBeenCalledWith('title.ilike.%foo bar baz%,summary.ilike.%foo bar baz%')
  })

  it('propaga el error de la consulta', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'db error' } }))

    const result = await searchArticles(client, 'algo')

    expect(result).toEqual({ data: null, error: 'db error' })
  })
})

describe('getArticles', () => {
  it('no consulta likes/views cuando no hay artículos', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))

    const result = await getArticles(client)

    expect(result).toEqual({ data: [], error: null })
    expect(client.from).toHaveBeenCalledTimes(1)
  })

  it('enriquece los artículos con likes_count, views_count y has_liked', async () => {
    const client = createFromClientMock() as any
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: [article({ id: 'a1' }), article({ id: 'a2' })], error: null }))
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [
            { article_id: 'a1', user_id: 'user-1' },
            { article_id: 'a1', user_id: 'user-2' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(createQueryBuilder({ data: [{ article_id: 'a1' }], error: null }))

    const result = await getArticles(client, 'user-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      { ...article({ id: 'a1' }), likes_count: 2, views_count: 1, has_liked: true },
      { ...article({ id: 'a2' }), likes_count: 0, views_count: 0, has_liked: false },
    ])
  })

  it('has_liked es false cuando no se pasa currentUserId', async () => {
    const client = createFromClientMock() as any
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: [article({ id: 'a1' })], error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: [{ article_id: 'a1', user_id: 'user-1' }], error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))

    const result = await getArticles(client)

    expect(result.data?.[0].has_liked).toBe(false)
  })

  it('propaga el error de la consulta principal', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'falló' } }))

    const result = await getArticles(client)

    expect(result).toEqual({ data: null, error: 'falló' })
  })
})

describe('getArticle', () => {
  it('devuelve el mensaje de error por defecto cuando el artículo no existe', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    const result = await getArticle(client, 'missing')

    expect(result).toEqual({ data: null, error: 'Artículo no encontrado' })
  })

  it('no consulta el like del usuario si no se pasa currentUserId', async () => {
    const client = createFromClientMock() as any
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: article({ id: 'a1' }), error: null }))
      .mockReturnValueOnce(createQueryBuilder({ count: 3, error: null }))
      .mockReturnValueOnce(createQueryBuilder({ count: 7, error: null }))

    const result = await getArticle(client, 'a1')

    expect(client.from).toHaveBeenCalledTimes(3)
    expect(result.data).toEqual({ ...article({ id: 'a1' }), likes_count: 3, views_count: 7, has_liked: false })
  })

  it('marca has_liked=true cuando existe un like del usuario actual', async () => {
    const client = createFromClientMock() as any
    client.from
      .mockReturnValueOnce(createQueryBuilder({ data: article({ id: 'a1' }), error: null }))
      .mockReturnValueOnce(createQueryBuilder({ count: 1, error: null }))
      .mockReturnValueOnce(createQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: { id: 'like-1' }, error: null }))

    const result = await getArticle(client, 'a1', 'user-1')

    expect(result.data?.has_liked).toBe(true)
  })
})

describe('getMyArticles', () => {
  it('propaga el error de la consulta', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'falló' } }))

    const result = await getMyArticles(client, 'user-1')

    expect(result).toEqual({ data: null, error: 'falló' })
  })
})

describe('getAuthorsSummary', () => {
  it('agrupa artículos por autor sumando cantidad y likes', async () => {
    const client = createFromClientMock() as any
    client.from
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [
            article({ id: 'a1', author_id: 'u1', title: 'Uno' }),
            article({ id: 'a2', author_id: 'u1', title: 'Dos' }),
            article({ id: 'a3', author_id: 'u2', title: 'Tres' }),
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [
            { article_id: 'a1', user_id: 'x' },
            { article_id: 'a1', user_id: 'y' },
            { article_id: 'a3', user_id: 'x' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))

    const result = await getAuthorsSummary(client)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      { authorId: 'u1', articlesCount: 2, totalLikes: 2, articles: [{ id: 'a1', title: 'Uno' }, { id: 'a2', title: 'Dos' }] },
      { authorId: 'u2', articlesCount: 1, totalLikes: 1, articles: [{ id: 'a3', title: 'Tres' }] },
    ])
  })

  it('propaga el error de getArticles', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'falló' } }))

    const result = await getAuthorsSummary(client)

    expect(result).toEqual({ data: null, error: 'falló' })
  })
})

describe('createArticle', () => {
  it('devuelve el artículo creado', async () => {
    const client = createFromClientMock() as any
    const created = article({ id: 'new-1' })
    client.from.mockReturnValueOnce(createQueryBuilder({ data: created, error: null }))

    const result = await createArticle(client, {
      author_id: 'user-1',
      title: 'Título',
      summary: null,
      document_path: null,
      image_path: null,
      is_public: true,
    })

    expect(result).toEqual({ data: created, error: null })
  })

  it('usa un mensaje por defecto cuando falla sin error explícito', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    const result = await createArticle(client, {
      author_id: 'user-1',
      title: 'Título',
      summary: null,
      document_path: null,
      image_path: null,
      is_public: true,
    })

    expect(result).toEqual({ data: null, error: 'Error al crear el artículo' })
  })
})

describe('registerView', () => {
  it('inserta la vista con article_id y user_id', async () => {
    const client = createFromClientMock() as any
    const builder = createQueryBuilder({ data: null, error: null })
    client.from.mockReturnValueOnce(builder)

    await registerView(client, 'art-1', 'user-1')

    expect(client.from).toHaveBeenCalledWith('views')
    expect(builder.insert).toHaveBeenCalledWith({ article_id: 'art-1', user_id: 'user-1' })
  })
})

describe('addLike / removeLike / getLikesCount', () => {
  it('addLike trata el código 23505 (like duplicado) como éxito', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'duplicate', code: '23505' } }))

    const result = await addLike(client, 'art-1', 'user-1')

    expect(result).toEqual({ data: null, error: null })
  })

  it('addLike propaga otros códigos de error', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'otro error', code: '500' } }))

    const result = await addLike(client, 'art-1', 'user-1')

    expect(result).toEqual({ data: null, error: 'otro error' })
  })

  it('removeLike propaga el error', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'falló' } }))

    const result = await removeLike(client, 'art-1', 'user-1')

    expect(result).toEqual({ data: null, error: 'falló' })
  })

  it('getLikesCount devuelve 0 cuando count es null', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ count: null, error: null }))

    const result = await getLikesCount(client, 'art-1')

    expect(result).toEqual({ data: 0, error: null })
  })
})
