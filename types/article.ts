export interface Article {
  id: string
  author_id: string
  title: string
  summary: string | null
  document_path: string | null
  image_path: string | null
  is_public: boolean
  created_at: string
}

export type ArticleInsert = Omit<Article, 'id' | 'created_at'>
export type ArticleUpdate = Partial<Omit<Article, 'id' | 'author_id' | 'created_at'>>
