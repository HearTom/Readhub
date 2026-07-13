import { defineConfig } from 'vitest/config'

// Registro de proyectos Vitest del monorepo (test.projects, reemplazo actual
// de vitest.workspace.ts). Permite correr `vitest`/`vitest run` desde la raíz
// (todos los paquetes en un solo watcher) como complemento a `turbo run test`,
// que sigue siendo el camino recomendado para CI (paralelismo y cache por
// paquete). No incluye paquetes sin lógica propia (types, config).
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      'apps/web/vitest.config.ts',
      'apps/mcp/vitest.config.ts',
      'packages/ai/vitest.config.ts',
      'packages/database/vitest.config.ts',
    ],
  },
})
