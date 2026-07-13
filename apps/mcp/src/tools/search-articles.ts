import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { searchArticles } from '@readhub/database'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'search_articles'

// Transporte puro sobre @readhub/database::searchArticles (coincidencia de
// texto en título/resumen) -- ninguna lógica de búsqueda vive acá.
export function registerSearchArticlesTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Buscar artículos',
      description:
        'Busca artículos públicos de ReadHub cuyo título o resumen contenga el texto indicado. ' +
        'Es búsqueda por coincidencia de texto, no semántica -- para eso usar search_articles_semantic.',
      inputSchema: {
        query: z.string().min(1).describe('Texto a buscar en el título o resumen del artículo'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ query }) => {
      const client = getSupabaseClient()
      const result = await searchArticles(client, query)
      return serviceResultToToolResult(result)
    }
  )
  return TOOL_NAME
}
