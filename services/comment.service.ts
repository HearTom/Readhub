import type { createClient } from '@/lib/supabase/client'
import type { Comment } from '@/types/comment'
import type { ServiceResult } from './types'

type Client = ReturnType<typeof createClient>

// ─────────────────────────────────────────────────────────────────────────────
// GET COMMENTS
// RLS comments_select: USING(TRUE) — todos los comentarios son públicos.
// Orden ascendente para mostrar la conversación cronológicamente.
// ─────────────────────────────────────────────────────────────────────────────

export async function getComments(
  client: Client,
  articleId: string
): Promise<ServiceResult<Comment[]>> {
  const { data, error } = await client
    .from('comments')
    .select('*')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []) as Comment[], error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD COMMENT
// RLS comments_insert: TO authenticated WITH CHECK (auth.uid() = user_id).
// ─────────────────────────────────────────────────────────────────────────────

export async function addComment(
  client: Client,
  articleId: string,
  userId: string,
  content: string
): Promise<ServiceResult<Comment>> {
  const { data, error } = await client
    .from('comments')
    .insert({ article_id: articleId, user_id: userId, comment: content } as never)
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Error al agregar el comentario' }
  }
  return { data: data as Comment, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE COMMENT
// RLS comments_delete: auth.uid() = user_id OR is_admin().
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteComment(
  client: Client,
  commentId: string
): Promise<ServiceResult<null>> {
  const { error } = await client
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET COMMENTS COUNT — para tarjetas sin cargar todos los comentarios
// ─────────────────────────────────────────────────────────────────────────────

export async function getCommentsCount(
  client: Client,
  articleId: string
): Promise<ServiceResult<number>> {
  const { count, error } = await client
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('article_id', articleId)

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}
