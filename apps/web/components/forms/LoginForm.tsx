'use client'

import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InlineError } from '@/components/ui/states'

interface LoginFormProps {
  onSubmit: (data: { email: string; password: string }) => Promise<void> | void
  onRegisterClick?: () => void
  isLoading?: boolean
  error?: string | null
}

export function LoginForm({ onSubmit, onRegisterClick, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  function clearFieldError(field: 'email' | 'password') {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const errors: typeof fieldErrors = {}
    if (!email) errors.email = 'El correo es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Correo inválido'
    if (!password) errors.password = 'La contraseña es obligatoria'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await onSubmit({ email, password })
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl sm:text-2xl font-bold">Iniciar Sesión</CardTitle>
        <CardDescription>Ingresa tus credenciales para acceder a ReadHub</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && <InlineError message={error} />}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
                className="pl-9"
                aria-invalid={!!fieldErrors.email}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
                className="pl-9 pr-10"
                aria-invalid={!!fieldErrors.password}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <Button type="submit" className="w-full" loading={isLoading}>
            Iniciar Sesión
          </Button>

          {onRegisterClick && (
            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={onRegisterClick}
                className="font-medium text-primary hover:underline"
              >
                Regístrate
              </button>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
