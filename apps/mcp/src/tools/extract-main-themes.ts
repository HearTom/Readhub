import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { extractMainThemes } from '@readhub/database/analysis.service'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'extract_main_themes'

// Transporte puro sobre @readhub/database/analysis.service::extractMainThemes.
export function registerExtractMainThemesTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Extraer temas principales',
      description:
        'Identifica los temas principales que cubren varios artículos de ReadHub. Si no se indican ' +
        'articleIds, analiza todos los artículos públicos de la plataforma.',
      inputSchema: {
        articleIds: z
          .array(z.string().uuid())
          .max(5)
          .optional()
          .describe('IDs (UUID) de hasta 5 artículos. Si se omite, analiza todos los públicos.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ articleIds }) => {
      const client = getSupabaseClient()
      const result = await extractMainThemes(client, articleIds)
      return serviceResultToToolResult(result)
    }
  )
  return TOOL_NAME
}
