import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getArticles } from '@readhub/database'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'list_articles'
const DEFAULT_LIMIT = 20

// Transporte sobre @readhub/database::getArticles. El único agregado propio
// de esta Tool es recortar el arreglo ya devuelto a `limit` -- getArticles
// no acepta paginación y no hace falta tocarlo para eso; no es lógica de
// negocio nueva, solo un límite de presentación para el cliente MCP.
export function registerListArticlesTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Listar artículos',
      description:
        'Lista los artículos públicos de ReadHub, ordenados por fecha de publicación descendente.',
      inputSchema: {
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe(`Cantidad máxima de artículos a devolver (por defecto ${DEFAULT_LIMIT})`),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ limit }) => {
      const client = getSupabaseClient()
      const result = await getArticles(client)
      if (result.error !== null) return serviceResultToToolResult(result)

      return serviceResultToToolResult({
        data: result.data.slice(0, limit ?? DEFAULT_LIMIT),
        error: null,
      })
    }
  )
  return TOOL_NAME
}
