/**
 * Tipo base para todas las respuestas de la capa Services.
 * El discriminante es `error`: null = éxito, string = falla.
 */
export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }
