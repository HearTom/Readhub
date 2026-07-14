'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoginForm } from '@/components/forms/LoginForm'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, user, loading, error } = useAuth()

  // Redirigir si ya existe sesión activa (edge case — el middleware ya filtra
  // esto) o si signIn() acaba de completarse.
  //
  // Navegación dura (no router.replace): el Client-Side Router Cache de
  // Next.js puede tener cacheada la respuesta de "/" de cuando el middleware
  // la redirigía a /login por no haber sesión todavía (p.ej. por el
  // <Link href="/"> del header, prefetcheado en esta misma página antes del
  // login) — router.refresh() no sirve acá porque solo invalida el caché de
  // la ruta actual (/login), no el de "/".
  //
  // El delay le da tiempo al toast de bienvenida a ser visible antes de que
  // la navegación dura destruya el DOM — sin él, la redirección puede ganarle
  // la carrera al primer frame del toast.
  useEffect(() => {
    if (!loading && user) {
      const id = setTimeout(() => window.location.assign('/'), 600)
      return () => clearTimeout(id)
    }
  }, [user, loading])

  async function handleLogin(data: { email: string; password: string }) {
    const err = await signIn(data.email, data.password)
    if (!err) {
      toast.success('¡Bienvenido de vuelta!', {
        description: 'Sesión iniciada correctamente.',
      })
      // onAuthStateChange SIGNED_IN → useEffect redirige a /
    }
  }

  return (
    <LoginForm
      onSubmit={handleLogin}
      onRegisterClick={() => router.push('/register')}
      isLoading={loading}
      error={error}
    />
  )
}
