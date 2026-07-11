import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

const AUTH_PAGES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Crear cliente inline para refresh de sesión Y protección de rutas en un solo paso
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() refresca el token. No insertar lógica entre
  // createServerClient y esta llamada — la sincronización de cookies depende del orden.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p)
  const isApiRoute = pathname.startsWith('/api/')

  // Las rutas /api/* gestionan su propia autenticación y devuelven un JSON
  // de error (401/403/etc.) — no deben recibir un redirect HTML a /login,
  // que rompería a cualquier cliente que espere una respuesta JSON.
  if (!isApiRoute) {
    // Usuario no autenticado intentando acceder a ruta protegida → /login
    if (!user && !isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Usuario autenticado en páginas de auth → inicio
    if (user && isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static  (archivos estáticos)
     * - _next/image   (optimización de imágenes)
     * - favicon.ico
     * - archivos de imagen con extensión conocida
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
