import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getStatistics } from './stats.service'

vi.mock('./article.service', () => ({ getArticles: vi.fn() }))
vi.mock('./comment.service', () => ({ getCommentsCountForArticles: vi.fn() }))

import { getArticles } from './article.service'
import { getCommentsCountForArticles } from './comment.service'

describe('getStatistics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('agrega artículos, autores distintos, likes y comentarios', async () => {
    vi.mocked(getArticles).mockResolvedValue({
      data: [
        { id: 'a1', author_id: 'u1', likes_count: 3 } as any,
        { id: 'a2', author_id: 'u1', likes_count: 2 } as any,
        { id: 'a3', author_id: 'u2', likes_count: 5 } as any,
      ],
      error: null,
    })
    vi.mocked(getCommentsCountForArticles).mockResolvedValue({ data: 7, error: null })

    const result = await getStatistics({} as any)

    expect(result).toEqual({
      data: { totalPublicArticles: 3, totalAuthors: 2, totalLikes: 10, totalComments: 7 },
      error: null,
    })
    expect(getCommentsCountForArticles).toHaveBeenCalledWith({}, ['a1', 'a2', 'a3'])
  })

  it('propaga el error de getArticles sin llamar a getCommentsCountForArticles', async () => {
    vi.mocked(getArticles).mockResolvedValue({ data: null, error: 'falló al listar' })

    const result = await getStatistics({} as any)

    expect(result).toEqual({ data: null, error: 'falló al listar' })
    expect(getCommentsCountForArticles).not.toHaveBeenCalled()
  })

  it('propaga el error de getCommentsCountForArticles', async () => {
    vi.mocked(getArticles).mockResolvedValue({ data: [], error: null })
    vi.mocked(getCommentsCountForArticles).mockResolvedValue({ data: null, error: 'falló al contar' })

    const result = await getStatistics({} as any)

    expect(result).toEqual({ data: null, error: 'falló al contar' })
  })

  it('devuelve ceros cuando no hay artículos públicos', async () => {
    vi.mocked(getArticles).mockResolvedValue({ data: [], error: null })
    vi.mocked(getCommentsCountForArticles).mockResolvedValue({ data: 0, error: null })

    const result = await getStatistics({} as any)

    expect(result).toEqual({
      data: { totalPublicArticles: 0, totalAuthors: 0, totalLikes: 0, totalComments: 0 },
      error: null,
    })
    expect(getCommentsCountForArticles).toHaveBeenCalledWith({}, [])
  })
})
