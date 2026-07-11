import { getHfClient } from './client'

export const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
export const EMBEDDING_DIMENSIONS = 384

type RawFeatureExtractionResult = number | number[] | number[][] | number[][][]

// Promedia embeddings a nivel de token en un único vector de oración.
// La Inference API de Hugging Face normalmente devuelve el embedding ya
// promediado (pooled) para modelos sentence-transformers, pero algunos
// backends devuelven un vector por token — este fallback cubre ese caso
// sin que el servicio de embeddings tenga que conocer el detalle.
function meanPool(tokenVectors: number[][]): number[] {
  const dims = tokenVectors[0]?.length ?? 0
  const pooled = new Array(dims).fill(0)
  for (const vector of tokenVectors) {
    for (let i = 0; i < dims; i++) pooled[i] += vector[i]
  }
  return pooled.map((sum) => sum / tokenVectors.length)
}

function normalizeToVectors(raw: RawFeatureExtractionResult, expectedCount: number): number[][] {
  // Un solo input → HF puede devolver directamente number[] (un vector) o
  // number[][] (embeddings por token, sin poolear).
  if (expectedCount === 1) {
    if (Array.isArray(raw) && typeof raw[0] === 'number') {
      return [raw as number[]]
    }
    if (Array.isArray(raw) && Array.isArray(raw[0]) && typeof raw[0][0] === 'number') {
      return [meanPool(raw as number[][])]
    }
  }

  // Múltiples inputs → se espera number[][] (un vector por texto) o
  // number[][][] (por texto, por token — requiere pooling por elemento).
  if (Array.isArray(raw) && Array.isArray(raw[0])) {
    const arr = raw as number[][] | number[][][]
    return arr.map((item) =>
      Array.isArray(item[0]) ? meanPool(item as number[][]) : (item as number[])
    )
  }

  return []
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const hf = getHfClient()
  const raw = (await hf.featureExtraction({
    model: EMBEDDING_MODEL,
    inputs: texts.length === 1 ? texts[0] : texts,
  })) as RawFeatureExtractionResult

  return normalizeToVectors(raw, texts.length)
}
