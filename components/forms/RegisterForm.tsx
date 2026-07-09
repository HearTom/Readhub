'use client'

import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, Phone, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InlineError } from '@/components/ui/states'

export interface RegisterFormData {
  email: string
  birth_date: string
  phone: string
  password: string
}

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void> | void
  onLoginClick?: () => void
  isLoading?: boolean
  error?: string | null
}

type FieldErrors = Partial<RegisterFormData>

function validateFields(fields: RegisterFormData): FieldErrors {
  const errors: FieldErrors = {}
  if (!fields.email) errors.email = 'El correo es obligatorio'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = 'Correo inválido'
  if (!fields.birth_date) errors.birth_date = 'La fecha es obligatoria'
  if (!fields.phone) errors.phone = 'El celular es obligatorio'
  if (!fields.password) errors.password = 'La contraseña es obligatoria'
  else if (fields.password.length < 8) errors.password = 'Mínimo 8 caracteres'
  return errors
}

export function RegisterForm({ onSubmit, onLoginClick, isLoading, error }: RegisterFormProps) {
  const [fields, setFields] = useState<RegisterFormData>({
    email: '',
    birth_date: '',
    phone: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function setField(key: keyof RegisterFormData, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateFields(fields)
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    await onSubmit(fields)
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl sm:text-2xl font-bold">Crear Cuenta</CardTitle>
        <CardDescription>Completa los datos para unirte a ReadHub</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && <InlineError message={error} />}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="reg-email"
                type="email"
                placeholder="tu@email.com"
                value={fields.email}
                onChange={(e) => setField('email', e.target.value)}
                className="pl-9"
                aria-invalid={!!fieldErrors.email}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
          </div>

          {/* Birth date + Phone — columna única en móvil muy pequeño */}
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="birth_date"
                  type="date"
                  value={fields.birth_date}
                  onChange={(e) => setField('birth_date', e.target.value)}
                  className="pl-9"
                  aria-invalid={!!fieldErrors.birth_date}
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.birth_date && (
                <p className="text-xs text-destructive">{fieldErrors.birth_date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Celular</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="3001234567"
                  value={fields.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  className="pl-9"
                  aria-invalid={!!fieldErrors.phone}
                  disabled={isLoading}
                  autoComplete="tel"
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs text-destructive">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={fields.password}
                onChange={(e) => setField('password', e.target.value)}
                className="pl-9 pr-10"
                aria-invalid={!!fieldErrors.password}
                disabled={isLoading}
                autoComplete="new-password"
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
            Crear Cuenta
          </Button>

          {onLoginClick && (
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={onLoginClick}
                className="font-medium text-primary hover:underline"
              >
                Iniciar Sesión
              </button>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
