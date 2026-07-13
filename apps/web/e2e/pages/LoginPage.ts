import { expect, type Locator, type Page } from '@playwright/test'

// Page Object del formulario de login real
// (apps/web/components/forms/LoginForm.tsx, montado en
// apps/web/app/(auth)/login/page.tsx). Los selectores usan exclusivamente
// markup accesible que ya existe en la app (label/rol/texto) — no se agregó
// ningún atributo nuevo para facilitar este test.
export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly inlineError: Locator
  readonly registerLink: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByLabel('Correo electrónico', { exact: true })
    // exact:true evita que el substring "contraseña" también matchee el
    // botón "Mostrar/Ocultar contraseña" que alterna la visibilidad.
    this.passwordInput = page.getByLabel('Contraseña', { exact: true })
    this.submitButton = page.getByRole('button', { name: 'Iniciar Sesión' })
    // components/ui/states.tsx → InlineError renderiza role="alert"
    this.inlineError = page.getByRole('alert')
    this.registerLink = page.getByRole('button', { name: 'Regístrate' })
  }

  async goto() {
    await this.page.goto('/login')
    await expect(this.submitButton).toBeVisible()
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    // .click() ya espera a que el botón sea accionable — cubre el estado
    // `loading` (disabled + spinner) definido en components/ui/button.tsx.
    await this.submitButton.click()
  }
}
