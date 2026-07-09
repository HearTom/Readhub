import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navigation/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Segunda línea de defensa: el middleware ya redirige, pero si el server
  // component se ejecuta sin sesión (edge cases), redirigimos aquí también.
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email ?? ''} />
      <main className="container-page py-5 sm:py-8 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
