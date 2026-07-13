import { defineConfig } from 'vitest/config'

// Services + factories de cliente Supabase — entorno node (sin DOM). Los
// tests inyectan un cliente Supabase mockeado; nunca se conecta a Supabase
// real ni a Hugging Face aquí.
export default defineConfig({
  test: {
    name: '@readhub/database',
    environment: 'node',
    globals: true,
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**'],
    passWithNoTests: true,
  },
})
