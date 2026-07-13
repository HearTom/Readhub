import { defineConfig } from 'vitest/config'

// Servidor MCP (protocolo stdio) — entorno node. Cubre principalmente
// src/lib/mcp-adapters.ts y los adaptadores delgados de tools/resources.
export default defineConfig({
  test: {
    name: '@readhub/mcp',
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**'],
    passWithNoTests: true,
  },
})
