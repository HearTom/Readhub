import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import type { ServiceResult } from '@readhub/database'

// ─────────────────────────────────────────────────────────────────────────────
// Adaptadores entre el contrato ServiceResult<T> (usado en toda la capa de
// servicios de ReadHub -- ver @readhub/database) y los contratos del
// protocolo MCP. Viven acá, no en @readhub/database, porque son conversión
// de protocolo, no lógica de negocio -- y viven en un único módulo (no uno
// por carpeta) porque tools/ y resources/ hacen exactamente la misma
// conversión de datos; solo cambia la forma del resultado y cómo se
// reporta un error.
//
// Tools señalizan error CON el resultado (`isError: true` dentro de
// CallToolResult, que sí tiene ese campo) -- así el cliente ve el mensaje
// sin que la llamada JSON-RPC en sí falle. Resources no tienen un campo
// equivalente en ReadResourceResult, así que ahí SÍ se lanza -- el SDK lo
// traduce a un error de protocolo. Ambos son el uso correcto según el SDK,
// no una inconsistencia entre sí.
// ─────────────────────────────────────────────────────────────────────────────

export function serviceResultToToolResult<T>(result: ServiceResult<T>): CallToolResult {
  if (result.error !== null) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${result.error}` }],
    }
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
  }
}

export function serviceResultToResourceContent<T>(
  uri: string,
  result: ServiceResult<T>
): ReadResourceResult {
  if (result.error !== null) {
    throw new Error(result.error)
  }
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(result.data, null, 2),
      },
    ],
  }
}

// Para contenido estático (no proviene de un ServiceResult), p. ej.
// resources/info.ts y resources/categories.ts.
export function jsonResourceContent(uri: string, data: unknown): ReadResourceResult {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}

// El SDK tipa las variables de un ResourceTemplate como `string | string[]`
// (una URI template puede repetir la misma variable). Las plantillas de este
// servidor (readhub://articles/{articleId}, readhub://authors/{authorId})
// solo usan cada variable una vez -- este helper toma el primer valor en
// ambos casos, evitando repetir el mismo `Array.isArray(...) ? ... : ...`
// en cada callback de lectura de plantilla.
export function firstTemplateValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}
