// Barrel deliberadamente acotado a servicios "client-safe" (sin dependencias
// Node-only). embedding/vector-search/context-builder/chat.service se
// exponen solo por subpath explícito (ver package.json "exports") porque
// arrastran, transitivamente vía @readhub/ai, `pdf-parse`/`mammoth` (usan
// `fs` y APIs de Node) — incluirlos aquí rompería cualquier bundle de
// cliente que importe cualquier cosa de este barrel (p. ej. hooks/useAuth.ts
// importando solo auth.service terminaría arrastrando pdf-parse al bundle
// del navegador).
export * from './types'
export * from './article.service'
export * from './auth.service'
export * from './comment.service'
export * from './storage.service'
export * from './stats.service'
