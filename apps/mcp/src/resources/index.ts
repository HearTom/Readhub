import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerInfoResource } from './info.js'
import { registerArticlesResources } from './articles.js'
import { registerAuthorsResources } from './authors.js'
import { registerCategoriesResource } from './categories.js'
import { registerStatsResource } from './stats.js'

// Punto único de registro de Resources. Mismo patrón que tools/index.ts:
// para agregar un Resource nuevo, crear su archivo acá siguiendo el patrón
// de los existentes (register<Nombre>Resource(server): string | string[],
// transporte puro sobre un servicio de @readhub/database o @readhub/config)
// y sumar su llamada acá.
export function registerAllResources(server: McpServer): string[] {
  return [
    registerInfoResource(server),
    ...registerArticlesResources(server),
    ...registerAuthorsResources(server),
    registerCategoriesResource(server),
    registerStatsResource(server),
  ]
}
