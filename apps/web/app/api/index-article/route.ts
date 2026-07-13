import { NextResponse } from 'next/server'
import { createClient } from '@readhub/database/server'
import { embedArticle } from '@readhub/database/embedding.service'
import type { Article } from '@readhub/types'

// pdf-parse/mammoth y el SDK de Hugging Face requieren APIs de Node —
// no pueden correr en Edge Runtime.
export const runtime = 'nodejs'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/index-article
// Único punto de disparo de la indexación automática (ver hooks/useUpload.ts).
// No implementa lógica de embeddings propia — es una capa de transporte que
// autentica al llamador, verifica que sea el autor del artículo, y delega
// completamente en services/embedding.service.ts (embedArticle), reutilizado
// tal cual de la fase anterior.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autenticado' },
      { status: 401 }
    )
  }

  let body: { articleId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Cuerpo de la solicitud inválido' },
      { status: 400 }
    )
  }

  const articleId = body.articleId
  if (typeof articleId !== 'string' || articleId.length === 0) {
    return NextResponse.json(
      { success: false, error: 'articleId es requerido' },
      { status: 400 }
    )
  }

  const { data: article, error: fetchError } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single()

  if (fetchError || !article) {
    return NextResponse.json(
      { success: false, error: 'Artículo no encontrado' },
      { status: 404 }
    )
  }

  const typedArticle = article as Article
  if (typedArticle.author_id !== user.id) {
    return NextResponse.json(
      { success: false, error: 'No autorizado para indexar este artículo' },
      { status: 403 }
    )
  }

  const result = await embedArticle(supabase, typedArticle)

  if (result.error !== null) {
    // Mismo criterio que app/api/chat/route.ts: detalle real en el log del
    // servidor, mensaje genérico hacia el cliente.
    console.error(`[api/index-article] embedArticle falló para ${articleId}:`, result.error)
    return NextResponse.json(
      { success: false, error: 'No se pudo indexar el artículo. Inténtalo de nuevo más tarde.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: result.data })
}
