import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getStatistics } from '@readhub/database'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToResourceContent } from '../lib/mcp-adapters.js'

const RESOURCE_URI = 'readhub://stats'
const RESOURCE_NAME = 'readhub_stats'

// Transporte puro sobre @readhub/database::getStatistics.
export function registerStatsResource(server: McpServer): string {
  server.registerResource(
    RESOURCE_NAME,
    RESOURCE_URI,
    {
      title: 'Estadísticas de ReadHub',
      description:
        'Estadísticas generales de la plataforma (artículos públicos, autores, likes, ' +
        'comentarios) basadas en lo visible sin sesión.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const client = getSupabaseClient()
      const result = await getStatistics(client)
      return serviceResultToResourceContent(uri.href, result)
    }
  )
  return RESOURCE_URI
}
