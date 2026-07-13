import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { jsonResourceContent } from '../lib/mcp-adapters.js'

const RESOURCE_URI = 'readhub://categories'
const RESOURCE_NAME = 'readhub_categories'

// El esquema de `articles` (ver packages/types/database.ts) no tiene columna
// de categoría ni de etiquetas -- ReadHub no tiene un sistema de categorías
// implementado todavía. En vez de inventar una taxonomía a partir del texto
// de los artículos (lógica de negocio nueva que no existe en el producto),
// este Resource devuelve un contenido honesto sobre ese estado, para que un
// cliente MCP no interprete una lista vacía como "hay categorías pero no
// coinciden con nada".
export function registerCategoriesResource(server: McpServer): string {
  server.registerResource(
    RESOURCE_NAME,
    RESOURCE_URI,
    {
      title: 'Categorías de ReadHub',
      description: 'Estado del sistema de categorías/etiquetas de ReadHub.',
      mimeType: 'application/json',
    },
    async (uri) =>
      jsonResourceContent(uri.href, {
        implemented: false,
        message:
          'ReadHub no tiene un sistema de categorías o etiquetas en su modelo de datos actual ' +
          '(la tabla articles no tiene columna category ni tags). Este Resource queda reservado ' +
          'para cuando esa funcionalidad exista en la plataforma.',
        categories: [],
      })
  )
  return RESOURCE_URI
}
