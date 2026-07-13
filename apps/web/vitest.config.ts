import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// Componentes, hooks, middleware y route handlers — entorno jsdom + React.
// tsconfigPaths resuelve el alias @/* declarado en tsconfig.json; react()
// habilita JSX/TSX y Fast Refresh no aplica en test (solo el transform).
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    name: '@readhub/web',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    passWithNoTests: true,
    // Next.js expone estas variables al cliente; los services las leen vía
    // process.env — se fija un valor dummy para que instanciar el cliente
    // Supabase (aunque esté mockeado) no falle por variables ausentes.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
