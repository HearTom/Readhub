import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

// `next lint` está deprecado en Next.js 15 y se elimina en Next 16 (además
// de disparar un wizard interactivo la primera vez, incompatible con CI).
// Este es el reemplazo recomendado por Next: ESLint CLI directo sobre el
// flat config estándar de `create-next-app` (Strict: core-web-vitals +
// typescript), sin agregar reglas propias del proyecto.
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // next-env.d.ts es generado por Next.js en cada build (está en
    // .gitignore) — no es código del proyecto, no se lintea.
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'coverage/**', 'next-env.d.ts'],
  },
]

export default eslintConfig
