import { createClient } from '@supabase/supabase-js'
import type { Database } from '@readhub/types'
import type { createClient as createBrowserClient } from '@readhub/database/client'

// ─────────────────────────────────────────────────────────────────────────────
// Cliente Supabase propio de este servidor MCP. Deliberadamente NO reutiliza
// la CONSTRUCCIÓN de @readhub/database/client (createBrowserClient, pensado
// para el navegador) ni @readhub/database/server (createServerClient, atado
// a las cookies de un request HTTP de Next.js) -- este proceso no tiene
// ninguno de esos dos contextos: es un proceso Node de larga duración
// hablando STDIO. Se construye con `@supabase/supabase-js` directo.
//
// Sí se importa el TIPO (no el valor) de @readhub/database/client -- solo
// para alinear exactamente con el tipo `Client` que ya esperan los servicios
// de @readhub/database (ReturnType de ese mismo createClient). Es un ajuste
// de tipos en tiempo de compilación (se borra al transpilar), no una
// dependencia real: @supabase/ssr@0.5.2 y el @supabase/supabase-js más
// nuevo resuelto en el árbol expresan los genéricos de PostgREST de forma
// distinta (mismo cliente en runtime, tipos estructuralmente distintos) --
// este cast aislado evita repetir `as unknown as ...` en cada Tool.
//
// Usa la clave anon (respeta RLS) a propósito: las Tools de esta fase solo
// exponen lectura de contenido ya público en ReadHub. Si una Tool futura
// necesitara acceso privilegiado, debería pedirlo explícitamente (otro
// cliente, con SUPABASE_SERVICE_ROLE_KEY), nunca ampliar el alcance de este
// cliente compartido.
//
// Singleton perezoso -- mismo patrón que packages/ai/client.ts (getHfClient):
// falla recién cuando una Tool efectivamente lo necesita, no al importar el
// módulo.
// ─────────────────────────────────────────────────────────────────────────────

type ReadHubSupabaseClient = ReturnType<typeof createBrowserClient>

let client: ReadHubSupabaseClient | null = null

export function getSupabaseClient(): ReadHubSupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY no están configurados. Ver apps/mcp/.env.example.'
      )
    }

    client = createClient<Database>(url, anonKey) as unknown as ReadHubSupabaseClient
  }
  return client
}
