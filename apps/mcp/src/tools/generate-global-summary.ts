import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { generateGlobalSummary } from '@readhub/database/analysis.service'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'generate_global_summary'

// Transporte puro sobre @readhub/database/analysis.service::generateGlobalSummary.
export function registerGenerateGlobalSummaryTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Generar resumen global',
      description:
        'Genera un resumen de conjunto sobre varios artículos de ReadHub. Si no se indican ' +
        'articleIds, resume la plataforma completa (todos los artículos públicos).',
      inputSchema: {
        articleIds: z
          .array(z.string().uuid())
          .max(5)
          .optional()
          .describe('IDs (UUID) de hasta 5 artículos. Si se omite, resume toda la plataforma.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ articleIds }) => {
      const client = getSupabaseClient()
      const result = await generateGlobalSummary(client, articleIds)
      return serviceResultToToolResult(result)
    }
  )
  return TOOL_NAME
}
