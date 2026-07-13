'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useArticle, resolveAuthorDisplay } from '@/hooks/useArticles'
import { useComments } from '@/hooks/useComments'
import { useLikes } from '@/hooks/useLikes'
import { useDocumentContent } from '@/hooks/useDocumentContent'
import { ArticleDetail, type ArticleDetailData } from '@/components/articles/ArticleDetail'
import { CommentList } from '@/components/comments/CommentList'
import { ArticleDetailSkeleton, ErrorState, LoadingState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getImageUrl, getDocumentUrl, type ArticleWithStats } from '@readhub/database'
import type { CommentData } from '@/components/comments/CommentItem'
import type { User } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// ArticleView — se monta solo cuando el artículo y la sesión están listos,
// para que useLikes reciba initialHasLiked correcto desde el primer render.
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleViewProps {
  article: ArticleWithStats
  user: User | null
}

function ArticleView({ article, user }: ArticleViewProps) {
  const docExt = article.document_path?.split('.').pop()?.toLowerCase() ?? ''
  const isTxt  = docExt === 'txt'

  // ── Contenido del documento (delegado a hook → service) ─────────────────
  const { content: docContent, loading: docLoading } = useDocumentContent(
    isTxt ? article.document_path : null
  )

  // ── Likes ────────────────────────────────────────────────────────────────
  const {
    likesCount,
    hasLiked,
    loading: liking,
    error: likeError,
    toggleLike,
    clearError: clearLikeError,
  } = useLikes({
    articleId:        article.id,
    initialLikesCount: article.likes_count,
    initialHasLiked:   article.has_liked,
    currentUser:      user,
  })

  useEffect(() => {
    if (likeError) {
      toast.error(likeError)
      clearLikeError()
    }
  }, [likeError, clearLikeError])

  // ── Comentarios ──────────────────────────────────────────────────────────
  const { comments, loading: commentsLoading, submitting, addComment } = useComments(
    article.id,
    user,
  )

  async function handleAddComment(text: string) {
    const err = await addComment(text)
    if (err) toast.error(err)
  }

  // ── Mapeo de tipos ───────────────────────────────────────────────────────

  // CommentViewModel → CommentData (lo que espera CommentItem/CommentList)
  const commentData: CommentData[] = comments.map((c) => ({
    id:          c.id,
    content:     c.content,
    authorEmail: c.authorDisplay,   // authorDisplay actúa como display name
    createdAt:   c.createdAt,
  }))

  // ArticleWithStats → ArticleDetailData
  const articleData: ArticleDetailData = {
    id:          article.id,
    title:       article.title,
    summary:     article.summary,
    imageUrl:    article.image_path ? getImageUrl(article.image_path) : null,
    authorEmail: resolveAuthorDisplay(article.author_id, user),
    createdAt:   article.created_at,
    content:     docContent,      // null si no es TXT o aún no cargado
    viewsCount:  article.views_count,
  }

  return (
    <ArticleDetail
      article={articleData}
      likesCount={likesCount}
      hasLiked={hasLiked}
      onLike={toggleLike}
      isLiking={liking}
    >
      {/* ── Visor / descarga de documento ── */}
      {article.document_path && (
        <div className="mb-8">
          {/* TXT: skeleton mientras carga */}
          {isTxt && docLoading && (
            <div className="prose-article space-y-3 mb-8">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-4" style={{ width: `${65 + (i * 7) % 35}%` }} />
              ))}
            </div>
          )}

          {/* Documento no-TXT: botón para abrir en nueva pestaña */}
          {!isTxt && (
            <div className="flex items-center justify-between gap-3 sm:gap-4 rounded-xl border bg-muted/40 px-4 sm:px-5 py-3 sm:py-4 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    Documento adjunto
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {docExt || 'archivo'}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <a
                  href={getDocumentUrl(article.document_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir
                </a>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Comentarios ── */}
      {commentsLoading ? (
        <LoadingState message="Cargando comentarios…" size="sm" />
      ) : (
        <CommentList
          comments={commentData}
          onAddComment={handleAddComment}
          isSubmitting={submitting}
          isAuthenticated={!!user}
        />
      )}
    </ArticleDetail>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ArticlePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const { user, loading: authLoading } = useAuth()

  // useArticle registra la visualización en segundo plano (fire-and-forget)
  const { article, loading: articleLoading, error } = useArticle(id, user)

  // Esperar a que tanto el artículo como la sesión estén listos,
  // para que useLikes en ArticleView reciba has_liked correcto desde el inicio.
  const isLoading = articleLoading || authLoading

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">

      {/* ── Botón volver ── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/')}
        className="text-muted-foreground hover:text-foreground -ml-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Button>

      {/* ── Skeleton ── */}
      {isLoading && <ArticleDetailSkeleton />}

      {/* ── Error ── */}
      {!isLoading && error && (
        <ErrorState
          title="No se pudo cargar el artículo"
          message={error}
          onRetry={() => router.refresh()}
        />
      )}

      {/* ── Artículo no encontrado ── */}
      {!isLoading && !error && !article && (
        <ErrorState
          title="Artículo no encontrado"
          message="El artículo que buscas no existe o fue eliminado."
          onRetry={() => router.push('/')}
        />
      )}

      {/* ── Artículo listo ── */}
      {!isLoading && !error && article && (
        <ArticleView article={article} user={user} />
      )}

    </div>
  )
}
