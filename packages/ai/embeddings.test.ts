import { describe, it, expect, vi } from 'vitest'

vi.mock('./client', () => ({ getHfClient: vi.fn() }))

import { getHfClient } from './client'
import { embedTexts, EMBEDDING_MODEL } from './embeddings'

function mockHf(featureExtractionResult: unknown) {
  const featureExtraction = vi.fn().mockResolvedValue(featureExtractionResult)
  vi.mocked(getHfClient).mockReturnValue({ featureExtraction } as any)
  return featureExtraction
}

describe('embedTexts', () => {
  it('devuelve [] sin llamar al cliente HF si no hay textos', async () => {
    const featureExtraction = mockHf(null)
    expect(await embedTexts([])).toEqual([])
    expect(featureExtraction).not.toHaveBeenCalled()
  })

  it('un solo texto: HF devuelve un vector plano (number[])', async () => {
    mockHf([0.1, 0.2, 0.3])
    expect(await embedTexts(['hola'])).toEqual([[0.1, 0.2, 0.3]])
  })

  it('un solo texto: HF devuelve vectores por token (number[][]) y se promedian (mean pooling)', async () => {
    mockHf([
      [1, 2],
      [3, 4],
    ])
    expect(await embedTexts(['hola'])).toEqual([[2, 3]])
  })

  it('un solo texto: pasa el input como string (no array) a featureExtraction', async () => {
    const featureExtraction = mockHf([0.1, 0.2])
    await embedTexts(['único texto'])
    expect(featureExtraction).toHaveBeenCalledWith({ model: EMBEDDING_MODEL, inputs: 'único texto' })
  })

  it('múltiples textos: HF devuelve un vector por texto (number[][]) sin poolear', async () => {
    mockHf([
      [1, 1],
      [2, 2],
    ])
    expect(await embedTexts(['a', 'b'])).toEqual([
      [1, 1],
      [2, 2],
    ])
  })

  it('múltiples textos: HF devuelve tokens sin poolear por texto (number[][][]) y se promedian por elemento', async () => {
    mockHf([
      [
        [1, 1],
        [3, 3],
      ],
      [[10, 10]],
    ])
    expect(await embedTexts(['a', 'b'])).toEqual([
      [2, 2],
      [10, 10],
    ])
  })

  it('múltiples textos: pasa el array completo como inputs a featureExtraction', async () => {
    const featureExtraction = mockHf([
      [1, 1],
      [2, 2],
    ])
    await embedTexts(['a', 'b'])
    expect(featureExtraction).toHaveBeenCalledWith({ model: EMBEDDING_MODEL, inputs: ['a', 'b'] })
  })

  it('devuelve [] si la forma de la respuesta no es reconocida', async () => {
    mockHf(42)
    expect(await embedTexts(['a', 'b'])).toEqual([])
  })
})
