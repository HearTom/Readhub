'use client'

import { useState, useCallback, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@readhub/database/client'
import { uploadDocument, uploadImage, createArticle, type ServiceResult } from '@readhub/database'
import type { Article } from '@readhub/types'

export interface UploadArticlePayload {
  title: string
  summary?: string | null
  document: File
  image: File
  isPublic?: boolean
}

// Pasos de progreso visibles para la UI
export type UploadStep = 'idle' | 'uploading-doc' | 'uploading-image' | 'saving' | 'done' | 'error'

export function useUpload(currentUser: User | null) {
  const client = useMemo(() => createClient(), [])
  const [step, setStep] = useState<UploadStep>('idle')
  const [error, setError] = useState<string | null>(null)

  const uploadArticle = useCallback(
    async (payload: UploadArticlePayload): Promise<ServiceResult<Article>> => {
      if (!currentUser) {
        return { data: null, error: 'Debes iniciar sesión para publicar' }
      }

      setError(null)
      setStep('uploading-doc')

      const docResult = await uploadDocument(client, payload.document, currentUser.id)
      if (docResult.error) {
        setStep('error')
        setError(docResult.error)
        return { data: null, error: docResult.error }
      }

      setStep('uploading-image')
      const imgResult = await uploadImage(client, payload.image, currentUser.id)
      if (imgResult.error) {
        setStep('error')
        setError(imgResult.error)
        return { data: null, error: imgResult.error }
      }

      setStep('saving')
      const articleResult = await createArticle(client, {
        author_id: currentUser.id,
        title: payload.title,
        summary: payload.summary ?? null,
        document_path: docResult.data,
        image_path: imgResult.data,
        is_public: payload.isPublic ?? true,
      })

      if (articleResult.error !== null) {
        setStep('error')
        setError(articleResult.error)
        return articleResult
      }

      setStep('done')

      // Indexación automática (RAG) — best-effort y no bloqueante: el
      // artículo ya quedó publicado correctamente, así que un fallo aquí
      // no debe revertir ni marcar como error el flujo de publicación
      // (mismo criterio de resiliencia que registerView/likes).
      try {
        const indexResponse = await fetch('/api/index-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId: articleResult.data.id }),
        })
        // response.ok se verifica solo para dejar rastro en consola — no
        // bloquea ni marca como error el flujo de publicación (ver comentario
        // de resiliencia arriba). Antes de esta revisión, un fallo HTTP
        // (p. ej. 500 por error del proveedor de embeddings) pasaba
        // completamente desapercibido porque solo el `catch` (fallo de red)
        // dejaba algún rastro.
        if (!indexResponse.ok) {
          console.warn(`[useUpload] Indexación no exitosa (HTTP ${indexResponse.status}) para el artículo ${articleResult.data.id}`)
        }
      } catch {
        // Falla silenciosa — la indexación puede reintentarse más adelante
        // sin generar duplicados (embedding.service.ts reemplaza por completo
        // los chunks existentes del artículo en cada ejecución).
      }

      return articleResult
    },
    [client, currentUser],
  )

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
  }, [])

  return {
    step,
    loading: step === 'uploading-doc' || step === 'uploading-image' || step === 'saving',
    error,
    uploadArticle,
    reset,
  }
}
