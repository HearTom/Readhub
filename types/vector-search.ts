export interface VectorSearchMatch {
  chunkId: string
  articleId: string
  articleTitle: string
  chunkIndex: number
  content: string
  similarity: number
}

export interface VectorSearchOptions {
  matchCount?: number
  matchThreshold?: number
}
