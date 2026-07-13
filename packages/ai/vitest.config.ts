import { defineConfig } from 'vitest/config'

// Paquete server-only sin React/DOM (client.ts, embeddings.ts, generation.ts,
// chunk-text.ts, extract-text.ts) — entorno node, sin plugins de bundling.
export default defineConfig({
  test: {
    name: '@readhub/ai',
    environment: 'node',
    globals: true,
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**'],
    passWithNoTests: true,
  },
})
