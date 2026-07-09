import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex flex-col">

      {/* Header con logo */}
      <header className="container-page py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group w-fit"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
            <BookOpen className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight transition-colors group-hover:text-primary">
            ReadHub
          </span>
        </Link>
      </header>

      {/* Contenido centrado */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-sm sm:max-w-md animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="container-page py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ReadHub · Plataforma de publicación de artículos
      </footer>

    </div>
  )
}
