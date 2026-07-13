'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { ArticleForm, type ArticleFormData } from '@/components/forms/ArticleForm'
import { useAuth } from '@/hooks/useAuth'
import { useUpload, type UploadStep } from '@/hooks/useUpload'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Mensajes de progreso por paso ───────────────────────────────────────────

const STEP_LABELS: Partial<Record<UploadStep, string>> = {
  'uploading-doc':   'Subiendo documento…',
  'uploading-image': 'Subiendo imagen de portada…',
  'saving':          'Guardando artículo en la base de datos…',
}

// ─── Indicador de progreso visual ────────────────────────────────────────────

const STEPS: { key: UploadStep; label: string }[] = [
  { key: 'uploading-doc',   label: 'Documento' },
  { key: 'uploading-image', label: 'Imagen' },
  { key: 'saving',          label: 'Guardar' },
  { key: 'done',            label: 'Listo' },
]

const STEP_ORDER: UploadStep[] = ['idle', 'uploading-doc', 'uploading-image', 'saving', 'done', 'error']

function StepProgress({ step }: { step: UploadStep }) {
  const currentIndex = STEP_ORDER.indexOf(step)

  return (
    <div className="flex items-start gap-0 w-full">
      {STEPS.map((s, i) => {
        const stepIndex = STEP_ORDER.indexOf(s.key)
        const isDone    = currentIndex > stepIndex
        const isActive  = currentIndex === stepIndex
        const isLast    = i === STEPS.length - 1

        return (
          <div key={s.key} className="flex items-start flex-1 min-w-0">
            {/* Node + label */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                  isDone  && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary/20 border-2 border-primary text-primary',
                  !isDone && !isActive && 'bg-muted text-muted-foreground',
                )}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[9px] sm:text-[10px] font-medium transition-colors text-center leading-tight max-w-[48px] sm:max-w-[56px]',
                  isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>

            {/* Connector — centrado con el nodo */}
            {!isLast && (
              <div className="flex-1 mx-1 mt-3.5">
                <div className="h-px w-full bg-border" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router  = useRouter()
  const { user } = useAuth()
  const { step, loading, error, uploadArticle } = useUpload(user)

  // Redirigir al home cuando la publicación termina con éxito
  useEffect(() => {
    if (step === 'done') {
      toast.success('¡Artículo publicado!', {
        description: 'Tu artículo ya está visible en el feed.',
      })
      router.push('/')
    }
  }, [step, router])

  async function handleSubmit(data: ArticleFormData) {
    await uploadArticle({
      title:    data.title,
      document: data.document,
      image:    data.image,
      isPublic: true,
    })
  }

  function handleCancel() {
    router.push('/')
  }

  const isActive = loading || step === 'uploading-doc' || step === 'uploading-image' || step === 'saving'

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">

      {/* ── Back link ── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        disabled={loading}
        className="text-muted-foreground hover:text-foreground -ml-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Button>

      {/* ── Indicador de progreso (visible solo durante la subida) ── */}
      {isActive && (
        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-card animate-fade-in space-y-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <span className="spinner h-3.5 w-3.5 sm:h-4 sm:w-4 border-[1.5px]" aria-hidden />
            {STEP_LABELS[step] ?? 'Procesando…'}
          </div>
          <StepProgress step={step} />
        </div>
      )}

      {/* ── Formulario ── */}
      <ArticleForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={loading}
        error={error}
      />

    </div>
  )
}
