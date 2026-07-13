import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { getValidTestUser } from './data/users'
import { expectToast } from './support/toast'

// Flujo principal de autenticación de ReadHub, de punta a punta contra el
// sistema real (middleware.ts, useAuth.ts → auth.service.ts → Supabase, sin
// mocks). No se modificó la app ni se agregaron atajos: los selectores usan
// exclusivamente markup accesible que ya existía (ver Page Objects).
test.describe('Autenticación — flujo principal', () => {
  test('un usuario se autentica, ve su información y cierra sesión', async ({ page }) => {
    const user = getValidTestUser()
    const loginPage = new LoginPage(page)
    const dashboardPage = new DashboardPage(page)

    await test.step('Abrir la aplicación', async () => {
      await page.goto('/')
    })

    await test.step('Acceder a Login', async () => {
      // ReadHub no tiene landing pública: `/` está protegida por
      // middleware.ts, así que un usuario sin sesión llega a /login por la
      // propia redirección real de la app (se valida acá, no se fuerza la
      // navegación directa a /login).
      await expect(page).toHaveURL('/login')
      await expect(loginPage.submitButton).toBeVisible()
    })

    await test.step('Ingresar credenciales válidas y autenticarse', async () => {
      await loginPage.login(user.email, user.password)
      await expectToast(page, '¡Bienvenido de vuelta!')
    })

    await test.step('Validar la redirección al Dashboard', async () => {
      await expect(page).toHaveURL('/')
    })

    await test.step('Comprobar que la información del usuario se cargó correctamente', async () => {
      await dashboardPage.expectUserInfoLoaded(user.email)
    })

    await test.step('Verificar que la navegación principal esté disponible', async () => {
      await dashboardPage.expectPrimaryNavigationAvailable()
    })

    await test.step('Cerrar sesión', async () => {
      await dashboardPage.logout()
      await expectToast(page, 'Sesión cerrada')
    })

    await test.step('Comprobar el regreso a Login', async () => {
      await expect(page).toHaveURL('/login')
      await expect(loginPage.submitButton).toBeVisible()
      // El guard de middleware.ts sigue activo: la ruta protegida ya no es
      // accesible tras cerrar sesión (valida que signOut() invalidó la
      // sesión real, no solo el estado de UI).
      await page.goto('/')
      await expect(page).toHaveURL('/login')
    })
  })
})
