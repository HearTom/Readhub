import { MessageCircle } from 'lucide-react'
import { CommentItem, type CommentData } from './CommentItem'
import { CommentForm } from '@/components/forms/CommentForm'
import { EmptyState } from '@/components/ui/states'
import { Separator } from '@/components/ui/separator'

interface CommentListProps {
  comments: CommentData[]
  onAddComment: (content: string) => Promise<void> | void
  isSubmitting?: boolean
  isAuthenticated?: boolean
}

export function CommentList({
  comments,
  onAddComment,
  isSubmitting,
  isAuthenticated = true,
}: CommentListProps) {
  return (
    <section aria-label="Comentarios" className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">
          Comentarios{' '}
          <span className="text-muted-foreground font-normal text-base">
            ({comments.length})
          </span>
        </h2>
      </div>

      <Separator />

      {/* Comment form */}
      {isAuthenticated && (
        <div className="py-2">
          <CommentForm onSubmit={onAddComment} isLoading={isSubmitting} />
        </div>
      )}

      {/* List */}
      {comments.length === 0 ? (
        <EmptyState
          title="Sin comentarios aún"
          message="Sé el primero en comentar este artículo."
          className="py-8"
        />
      ) : (
        <div className="divide-y divide-border">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </section>
  )
}
