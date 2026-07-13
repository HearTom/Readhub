import { vi } from 'vitest'

// Helper de test: construye un query builder encadenable que imita la forma
// de PostgrestFilterBuilder (select/eq/order/... devuelven `this`, y el
// objeto es "thenable" — awaitearlo en cualquier punto de la cadena resuelve
// al mismo resultado final, igual que el SDK real de Supabase).
//
// Vive en test/ (no coincide con **/*.test.ts) y no se agrega al mapa
// "exports" de package.json — no es parte de la superficie pública del
// paquete, solo lo importan archivos *.test.ts de packages/database vía ruta
// relativa.
export interface MockQueryResult<T = unknown> {
  data?: T
  error?: { message: string; code?: string } | null
  count?: number | null
}

export interface QueryBuilderMock {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise<unknown>
}

export function createQueryBuilder<T = unknown>(result: MockQueryResult<T>): QueryBuilderMock {
  const resolved = { data: result.data ?? null, error: result.error ?? null, count: result.count ?? null }
  const builder = {} as QueryBuilderMock

  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'or', 'order', 'limit'] as const) {
    builder[method] = vi.fn(() => builder)
  }
  builder.single = vi.fn(() => Promise.resolve(resolved))
  builder.maybeSingle = vi.fn(() => Promise.resolve(resolved))
  builder.then = (onFulfilled, onRejected) => Promise.resolve(resolved).then(onFulfilled, onRejected)

  return builder
}

// Cliente mínimo mockeado para services que solo usan `client.from(...)`.
export function createFromClientMock() {
  return { from: vi.fn() }
}
