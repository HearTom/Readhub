'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { downloadDocumentText } from '@/services/storage.service'

// Solo descarga contenido para archivos TXT; los demás formatos (PDF, DOCX)
// se ofrecen como link de descarga desde el componente.
export function useDocumentContent(documentPath: string | null | undefined) {
  const client = useMemo(() => createClient(), [])
  const [content, setContent]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (!documentPath) return
    const ext = documentPath.split('.').pop()?.toLowerCase() ?? ''
    if (ext !== 'txt') return

    let mounted = true
    setLoading(true)

    downloadDocumentText(client, documentPath).then((result) => {
      if (!mounted) return
      if (!result.error) setContent(result.data)
      setLoading(false)
    })

    return () => { mounted = false }
  }, [documentPath, client])

  return { content, loading }
}
