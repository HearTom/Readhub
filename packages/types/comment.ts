export interface Comment {
  id: string
  article_id: string
  user_id: string
  comment: string
  created_at: string
}

export type CommentInsert = Omit<Comment, 'id' | 'created_at'>
export type CommentUpdate = Pick<Comment, 'comment'>
