'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, Upload, LogOut, Menu, X, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NavbarProps {
  userEmail: string
}

interface NavLinkProps {
  href: string
  label: string
  icon: React.ReactNode
  onClick?: () => void
}

function NavLink({ href, label, icon, onClick }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'nav-link',
        isActive && 'nav-link-active'
      )}
    >
      {icon}
      {label}
    </Link>
  )
}

export function Navbar({ userEmail }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const { signOut } = useAuth()

  // Derivar iniciales del email para el avatar
  const initials = userEmail
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

  const navLinks = [
    { href: '/',       label: 'Inicio',          icon: <Home   className="h-4 w-4" /> },
    { href: '/upload', label: 'Cargar Artículo',  icon: <Upload className="h-4 w-4" /> },
  ]

  async function handleLogout() {
    setLoggingOut(true)
    const err = await signOut()
    if (err) {
      toast.error('Error al cerrar sesión. Inténtalo de nuevo.')
      setLoggingOut(false)
      return
    }
    toast.success('Sesión cerrada', { description: 'Hasta pronto.' })
    router.push('/login')
    router.refresh()
  }

  function closeMobile() {
    setMobileOpen(false)
  }

  return (
    <header className="nav-wrapper">
      <div className="container-page flex h-16 items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm transition-all group-hover:shadow-md">
            <BookOpen className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight transition-colors group-hover:text-primary hidden sm:block">
            ReadHub
          </span>
        </Link>

        {/* ── Navegación desktop ── */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>

        {/* ── Área de usuario desktop ── */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground max-w-[160px] truncate" title={userEmail}>
              {userEmail}
            </span>
          </div>

          <Separator orientation="vertical" className="h-5" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? 'Saliendo…' : 'Cerrar Sesión'}
          </Button>
        </div>

        {/* ── Botón hamburguesa (mobile) ── */}
        <button
          type="button"
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen
            ? <X    className="h-5 w-5" />
            : <Menu className="h-5 w-5" />
          }
        </button>
      </div>

      {/* ── Menú mobile ── */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t bg-background animate-fade-in"
          role="navigation"
          aria-label="Menú móvil"
        >
          <div className="container-page py-4 flex flex-col gap-1">

            {/* Perfil */}
            <div className="flex items-center gap-3 px-3 py-3 mb-1">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-medium truncate">{userEmail}</p>
                <p className="text-xs text-muted-foreground">Cuenta activa</p>
              </div>
            </div>

            <Separator className="mb-1" />

            {/* Links */}
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                onClick={closeMobile}
              />
            ))}

            <Separator className="my-1" />

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="justify-start text-muted-foreground hover:text-foreground w-full"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Cerrando sesión…' : 'Cerrar Sesión'}
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
