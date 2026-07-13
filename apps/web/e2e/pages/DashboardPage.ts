import { expect, type Locator, type Page } from '@playwright/test'

// Page Object del layout autenticado
// (apps/web/components/navigation/Navbar.tsx, montado en
// apps/web/app/(dashboard)/layout.tsx sobre toda ruta protegida). Selectores
// basados en roles/labels ARIA ya presentes en el markup real: <header> es
// el landmark "banner", <nav aria-label="Navegación principal"> agrupa los
// links, y el email del usuario se pasa como texto visible + atributo
// `title` desde el layout (server component) al Navbar.
export class DashboardPage {
  readonly page: Page
  readonly header: Locator
  readonly primaryNav: Locator
  readonly logoutButton: Locator

  constructor(page: Page) {
    this.page = page
    this.header = page.getByRole('banner')
    this.primaryNav = page.getByRole('navigation', { name: 'Navegación principal' })
    // Se escopea al header porque el menú mobile (oculto por defecto en
    // viewport desktop) contiene un segundo botón con el mismo texto.
    this.logoutButton = this.header.getByRole('button', { name: 'Cerrar Sesión' })
  }

  navLink(label: string): Locator {
    return this.primaryNav.getByRole('link', { name: label })
  }

  userEmailText(email: string): Locator {
    return this.header.getByText(email, { exact: true })
  }

  async expectUserInfoLoaded(email: string) {
    await expect(this.header).toBeVisible()
    await expect(this.userEmailText(email)).toBeVisible()
  }

  async expectPrimaryNavigationAvailable() {
    await expect(this.primaryNav).toBeVisible()
    await expect(this.navLink('Inicio')).toBeVisible()
    await expect(this.navLink('Cargar Artículo')).toBeVisible()
    await expect(this.navLink('Asistente IA')).toBeVisible()
    await expect(this.logoutButton).toBeVisible()
  }

  async logout() {
    await this.logoutButton.click()
  }
}
