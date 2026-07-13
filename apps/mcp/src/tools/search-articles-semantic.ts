import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { searchSimilarChunks } from '@readhub/database/vector-search.service'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'search_articles_semantic'

// Transporte puro sobre @readhub/database/vector-search.service::searchSimilarChunks
// -- el mismo pipeline de embeddings + similitud que ya usa el Asistente IA
// de la app web (services/chat.service.ts). No reimplementa nada de eso.
export function registerSemanticSearchTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Buscar artículos por similitud semántica',
      description:
        'Busca fragmentos de artículos de ReadHub semánticamente similares a una consulta en ' +
        'lenguaje natural (embeddings + similitud de coseno), a diferencia de search_articles ' +
        'que solo compara texto literal. Útil para encontrar contenido relacionado aunque no ' +
        'comparta las mismas palabras.',
      inputSchema: {
        query: z.string().min(1).describe('Consulta en lenguaje natural'),
        matchCount: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe('Cantidad máxima de fragmentos a devolver (por defecto 5)'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ query, matchCount }) => {
      const client = getSupabaseClient()
      const result = await searchSimilarChunks(
        client,
        query,
        matchCount !== undefined ? { matchCount } : undefined
      )
      return serviceResultToToolResult(result)
    }
  )
  return TOOL_NAME
}
