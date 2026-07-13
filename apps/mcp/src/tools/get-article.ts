import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getArticle } from '@readhub/database'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'get_article'

// Transporte puro sobre @readhub/database::getArticle.
export function registerGetArticleTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Obtener artículo por ID',
      description:
        'Obtiene el detalle completo de un artículo de ReadHub a partir de su ID: título, ' +
        'resumen, autor, fecha de publicación y contadores de likes/vistas.',
      inputSchema: {
        articleId: z.string().uuid().describe('ID (UUID) del artículo'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ articleId }) => {
      const client = getSupabaseClient()
      const result = await getArticle(client, articleId)
      return serviceResultToToolResult(result)
    }
  )
  return TOOL_NAME
}
