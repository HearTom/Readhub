'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoginForm } from '@/components/forms/LoginForm'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, user, loading, error } = useAuth()

  // Redirigir si ya existe sesión activa (edge case — el middleware ya filtra esto)
  useEffect(() => {
    if (!loading && user) {
      router.replace('/')
    }
  }, [user, loading, router])

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
