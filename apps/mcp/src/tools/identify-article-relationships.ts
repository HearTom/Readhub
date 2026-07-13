import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { identifyArticleRelationships } from '@readhub/database/analysis.service'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'identify_article_relationships'

// Transporte puro sobre @readhub/database/analysis.service::identifyArticleRelationships,
// que a su vez reutiliza vector-search.service.ts::searchSimilarChunks -- no
// reimplementa ninguna lógica de búsqueda.
export function registerIdentifyArticleRelationshipsTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Identificar relaciones entre artículos',
      description:
        'Encuentra artículos de ReadHub relacionados con uno dado (por similitud semántica) y ' +
        'describe qué tipo de relación tienen entre sí (profundiza el tema, lo complementa, ' +
        'presenta un enfoque distinto, etc.).',
      inputSchema: {
        articleId: z.string().uuid().describe('ID (UUID) del artículo de origen'),
        matchCount: z
          .number()
          .int()
          .positive()
          .max(10)
          .optional()
          .describe('Cantidad máxima de artículos relacionados a devolver (por defecto 5)'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ articleId, matchCount }) => {
      const client = getSupabaseClient()
      const result = await identifyArticleRelationships(client, articleId, matchCount)
      return serviceResultToToolResult(result)
    }
  )
  return TOOL_NAME
}
