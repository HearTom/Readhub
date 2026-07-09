'use client'

import { useState, useCallback, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { uploadDocument, uploadImage } from '@/services/storage.service'
import { createArticle } from '@/services/article.service'
import type { Article } from '@/types/article'
import type { ServiceResult } from '@/services/types'

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

      if (articleResult.error) {
        setStep('error')
        setError(articleResult.error)
        return articleResult
      }

      setStep('done')
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
