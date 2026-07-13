import { describe, it, expect } from 'vitest'
import { getComments, addComment, deleteComment, getCommentsCount, getCommentsCountForArticles } from './comment.service'
import { createFromClientMock, createQueryBuilder } from './test/supabase-mock'

describe('getComments', () => {
  it('devuelve los comentarios en éxito', async () => {
    const client = createFromClientMock() as any
    const comments = [{ id: 'c1' }]
    client.from.mockReturnValueOnce(createQueryBuilder({ data: comments, error: null }))

    expect(await getComments(client, 'art-1')).toEqual({ data: comments, error: null })
  })

  it('propaga el error de la consulta', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'falló' } }))

    expect(await getComments(client, 'art-1')).toEqual({ data: null, error: 'falló' })
  })
})

describe('addComment', () => {
  it('inserta mapeando el parámetro content a la columna comment', async () => {
    const client = createFromClientMock() as any
    const builder = createQueryBuilder({ data: { id: 'c1', comment: 'hola' }, error: null })
    client.from.mockReturnValueOnce(builder)

    const result = await addComment(client, 'art-1', 'user-1', 'hola')

    expect(builder.insert).toHaveBeenCalledWith({ article_id: 'art-1', user_id: 'user-1', comment: 'hola' })
    expect(result).toEqual({ data: { id: 'c1', comment: 'hola' }, error: null })
  })

  it('usa un mensaje por defecto cuando falla sin error explícito', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    const result = await addComment(client, 'art-1', 'user-1', 'hola')

    expect(result).toEqual({ data: null, error: 'Error al agregar el comentario' })
  })
})

describe('deleteComment', () => {
  it('propaga el error', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'no autorizado' } }))

    expect(await deleteComment(client, 'c1')).toEqual({ data: null, error: 'no autorizado' })
  })

  it('devuelve éxito sin data', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    expect(await deleteComment(client, 'c1')).toEqual({ data: null, error: null })
  })
})

describe('getCommentsCount', () => {
  it('devuelve 0 cuando count es null', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ count: null, error: null }))

    expect(await getCommentsCount(client, 'art-1')).toEqual({ data: 0, error: null })
  })

  it('propaga el error', async () => {
    const client = createFromClientMock() as any
    client.from.mockReturnValueOnce(createQueryBuilder({ count: null, error: { message: 'falló' } }))

    expect(await getCommentsCount(client, 'art-1')).toEqual({ data: null, error: 'falló' })
  })
})

describe('getCommentsCountForArticles', () => {
  it('devuelve 0 sin consultar la base de datos si articleIds está vacío', async () => {
    const client = createFromClientMock() as any

    const result = await getCommentsCountForArticles(client, [])

    expect(result).toEqual({ data: 0, error: null })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('devuelve el conteo agregado para varios artículos', async () => {
    const client = createFromClientMock() as any
    const builder = createQueryBuilder({ count: 5, error: null })
    client.from.mockReturnValueOnce(builder)

    const result = await getCommentsCountForArticles(client, ['a1', 'a2'])

    expect(builder.in).toHaveBeenCalledWith('article_id', ['a1', 'a2'])
    expect(result).toEqual({ data: 5, error: null })
  })
})
