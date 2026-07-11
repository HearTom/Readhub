import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { askQuestion } from '@/services/chat.service'

// pdf-parse no se usa aquí, pero embedding/generation (Hugging Face) sí
// requieren Node — mismo criterio que app/api/index-article/route.ts.
export const runtime = 'nodejs'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat
// Capa de transporte pura entre la UI y services/chat.service.ts (sin
// modificar ese servicio ni ninguna otra pieza del RAG). No implementa
// streaming — devuelve el ChatResult completo de una sola vez; el
// "renderizado progresivo" de esta fase ocurre del lado del cliente
// (ver hooks/useChat.ts y el informe técnico).
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  let body: { question?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Cuerpo de la solicitud inválido' },
      { status: 400 }
    )
  }

  const question = body.question
  if (typeof question !== 'string' || question.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'La pregunta no puede estar vacía' },
      { status: 400 }
    )
  }

  const result = await askQuestion(supabase, question)

  if (result.error !== null) {
    // El mensaje real (que puede incluir detalle interno de Supabase o del
    // proveedor de IA) se registra en el servidor; al cliente se le devuelve
    // un mensaje genérico para no exponer información interna.
    console.error('[api/chat] askQuestion falló:', result.error)
    return NextResponse.json(
      { success: false, error: 'No se pudo procesar la consulta. Inténtalo de nuevo más tarde.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: result.data })
}
