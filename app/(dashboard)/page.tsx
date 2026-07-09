'use client'

import Link from 'next/link'
import { UploadCloud, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useArticles, resolveAuthorDisplay } from '@/hooks/useArticles'
import { getImageUrl } from '@/services/storage.service'
import { ArticleList } from '@/components/articles/ArticleList'
import { ArticleListSkeleton, ErrorState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import type { ArticleCardData } from '@/components/cards/ArticleCard'

export default function HomePage() {
  const { user } = useAuth()
  const { articles, loading, error, refresh } = useArticles(user)

  // Mapeo service data → ArticleCardData (formato que espera ArticleCard)
  const cards: ArticleCardData[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    imageUrl: a.image_path ? getImageUrl(a.image_path) : null,
    authorEmail: resolveAuthorDisplay(a.author_id, user),
    createdAt: a.created_at,
    viewsCount: a.views_count,
    likesCount: a.likes_count,
  }))

  // Skeleton solo en la carga inicial (sin datos todavía)
  const showSkeleton = loading && articles.length === 0

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Cabecera ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Artículos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {showSkeleton
              ? 'Cargando artículos…'
              : articles.length > 0
                ? `${articles.length} artículo${articles.length !== 1 ? 's' : ''} publicado${articles.length !== 1 ? 's' : ''}`
                : 'Explora el contenido de la comunidad'}
          </p>
        </div>

        {/* Indicador de refresco en segundo plano */}
        {loading && articles.length > 0 && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="hidden sm:inline">Actualizando</span>
          </span>
        )}
      </div>

      {/* ── Skeleton (primera carga) ── */}
      {showSkeleton && <ArticleListSkeleton count={6} />}

      {/* ── Error ── */}
      {!showSkeleton && error && (
        <ErrorState
          title="No se pudieron cargar los artículos"
          message={error}
          onRetry={refresh}
        />
      )}

      {/* ── Lista (incluye stale data durante refresco) ── */}
      {!showSkeleton && !error && (
        <ArticleList
          articles={cards}
          emptyTitle="Aún no hay artículos"
          emptyMessage="Sé el primero en compartir contenido con la comunidad."
          emptyAction={
            <Button asChild size="sm">
              <Link href="/upload">
                <UploadCloud className="h-4 w-4" />
                Publicar artículo
              </Link>
            </Button>
          }
        />
      )}

    </div>
  )
}
