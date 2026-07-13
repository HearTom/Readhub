import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { APP_NAME, USER_ROLES } from '@readhub/config'
import { jsonResourceContent } from '../lib/mcp-adapters.js'

const RESOURCE_URI = 'readhub://info'
const RESOURCE_NAME = 'readhub_info'

// Información general de la plataforma. Reutiliza @readhub/config (nombre y
// roles compartidos) en vez de hardcodear esos valores acá -- primer
// consumidor real de ese paquete desde que se creó en la migración a
// monorepo.
export function registerInfoResource(server: McpServer): string {
  server.registerResource(
    RESOURCE_NAME,
    RESOURCE_URI,
    {
      title: 'Información general de ReadHub',
      description: 'Nombre de la plataforma, descripción y roles de usuario soportados.',
      mimeType: 'application/json',
    },
    async (uri) =>
      jsonResourceContent(uri.href, {
        name: APP_NAME,
        description: 'Plataforma de publicación y lectura de artículos.',
        userRoles: Object.values(USER_ROLES),
      })
  )
  return RESOURCE_URI
}
