'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, Mail } from 'lucide-react'
import { RegisterForm, type RegisterFormData } from '@/components/forms/RegisterForm'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, user, loading, error } = useAuth()
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  // Si la confirmación de email está deshabilitada en Supabase,
  // onAuthStateChange dispara SIGNED_IN y user se puebla → redirigimos.
  useEffect(() => {
    if (!loading && user && awaitingConfirmation) {
      toast.success('¡Cuenta creada!', { description: 'Ya puedes explorar ReadHub.' })
      router.replace('/')
    }
  }, [user, loading, router, awaitingConfirmation])

  async function handleRegister(data: RegisterFormData) {
    const err = await signUp({
      email: data.email,
      password: data.password,
      birth_date: data.birth_date,
      phone: data.phone,
    })
    if (!err) {
      setAwaitingConfirmation(true)
      // Si email confirmation está habilitada, user permanece null → mostramos card de confirmación.
      // Si está deshabilitada, onAuthStateChange → useEffect → redirect.
    }
  }

  // Estado: registro exitoso pero email confirmation requerida
  if (awaitingConfirmation && !user && !loading) {
    return (
      <div className="flex flex-col items-center text-center gap-4 sm:gap-6 p-5 sm:p-8 rounded-2xl border bg-card shadow-card animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold">¡Registro exitoso!</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Te enviamos un correo de confirmación.
            <br />
            Revísalo y activa tu cuenta para ingresar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="text-sm font-medium text-primary hover:underline transition-colors"
        >
          Ir al inicio de sesión
        </button>
      </div>
    )
  }

  return (
    <RegisterForm
      onSubmit={handleRegister}
      onLoginClick={() => router.push('/login')}
      isLoading={loading}
      error={error}
    />
  )
}
