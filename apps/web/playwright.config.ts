import path from 'node:path'
import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

// Next.js carga .env.local automáticamente para SU PROPIO proceso (el
// webServer de abajo), pero el proceso del test runner de Playwright es
// independiente y no lo hace solo — sin esto, e2e/data/users.ts no vería
// E2E_USER_EMAIL/E2E_USER_PASSWORD aunque el server sí arranque bien.
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

// E2E de apps/web contra un servidor Next.js real (dev local vía Turbopack;
// build + start en CI, más representativo de producción). Complementa a
// Vitest (pruebas unitarias de packages/database, packages/ai, apps/mcp y
// apps/web) — acá solo van recorridos de usuario completos contra el
// navegador real; la lógica ya cubierta con mocks a nivel unitario no se
// vuelve a probar por rama de error aquí (ver estrategia de testing).
//
// BASE_URL permite apuntar a un entorno ya desplegado (staging) sin levantar
// el webServer local; si no se define, se usa el servidor local de Next.js.
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000'
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // En CI, un `test.only` olvidado debe romper el build en vez de saltarse
  // en silencio el resto de la suite.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  // Reportes: HTML navegable siempre; agregado del formato `github` en CI
  // para anotaciones inline en el PR.
  reporter: isCI
    ? [['html', { open: 'never' }], ['github'], ['list']]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // Solo levanta un servidor local si no se apuntó explícitamente a uno ya
  // desplegado vía BASE_URL.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: isCI ? 'npm run build && npm run start' : 'npm run dev',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
})
