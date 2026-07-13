import { expect, type Page } from '@playwright/test'

// Utilidad transversal (no atada a un Page Object concreto) para verificar
// las notificaciones toast de Sonner (components/ui/sonner.tsx, montado una
// sola vez en app/layout.tsx). Reutilizable por cualquier spec que dispare
// una acción con feedback visible al usuario real (login, logout, etc.).
export async function expectToast(page: Page, text: string) {
  await expect(page.getByText(text)).toBeVisible()
}
