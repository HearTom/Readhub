import { AlertCircle, FileSearch, RefreshCw, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────
   LOADING STATE
   Spinner centrado con mensaje opcional
   ───────────────────────────────────────────── */

interface LoadingStateProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({
  message = 'Cargando…',
  className,
  size = 'md',
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-16',
    lg: 'py-24',
  }
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', sizeClasses[size], className)}>
      <div
        className="rounded-full border-2 border-primary border-t-transparent"
        style={{
          width: size === 'sm' ? 24 : size === 'lg' ? 48 : 36,
          height: size === 'sm' ? 24 : size === 'lg' ? 48 : 36,
          animation: 'spin 0.7s linear infinite',
        }}
        role="status"
        aria-label={message}
      />
      <p className="text-sm text-muted-foreground animate-pulse-soft">{message}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ERROR STATE
   Icono + mensaje + botón retry opcional
   ───────────────────────────────────────────── */

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Algo salió mal',
  message = 'Ocurrió un error inesperado. Inténtalo de nuevo.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Intentar de nuevo
        </Button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   EMPTY STATE
   Sin resultados / sin contenido
   ───────────────────────────────────────────── */

interface EmptyStateProps {
  icon?: React.ReactNode
  title?: string
  message?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title = 'Sin resultados',
  message = 'No hay contenido para mostrar por el momento.',
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-2">
        {icon ?? <Inbox className="h-7 w-7 text-muted-foreground opacity-60" />}
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SEARCH EMPTY STATE
   Variante para resultados de búsqueda vacíos
   ───────────────────────────────────────────── */

interface SearchEmptyProps {
  query?: string
  className?: string
}

export function SearchEmpty({ query, className }: SearchEmptyProps) {
  return (
    <EmptyState
      icon={<FileSearch className="h-7 w-7 text-muted-foreground opacity-60" />}
      title="Sin resultados"
      message={query ? `No se encontraron artículos para "${query}".` : 'No se encontraron resultados.'}
      className={className}
    />
  )
}

/* ─────────────────────────────────────────────
   INLINE ERROR
   Banner de error compacto para formularios
   ───────────────────────────────────────────── */

interface InlineErrorProps {
  message: string
  className?: string
}

export function InlineError({ message, className }: InlineErrorProps) {
  if (!message) return null
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-destructive/30',
        'bg-destructive/10 px-3 py-2.5 text-sm text-destructive',
        className
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ARTICLE CARD SKELETON
   ───────────────────────────────────────────── */

export function ArticleCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-0 overflow-hidden">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-3.5 w-10" />
            <Skeleton className="h-3.5 w-10" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ARTICLE LIST SKELETON
   Grid de 3 skeletons
   ───────────────────────────────────────────── */

export function ArticleListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   ARTICLE DETAIL SKELETON
   ───────────────────────────────────────────── */

export function ArticleDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-4 w-full" style={{ width: `${70 + Math.random() * 30}%` }} />
        ))}
      </div>
    </div>
  )
}
