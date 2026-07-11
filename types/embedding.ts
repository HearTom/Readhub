export interface ArticleChunk {
  id: string
  article_id: string
  chunk_index: number
  content: string
  embedding: number[]
  created_at: string
}

export type ArticleChunkInsert = Omit<ArticleChunk, 'id' | 'created_at'>

export interface IndexArticleResult {
  chunksCreated: number
}
