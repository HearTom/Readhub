import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { compareArticlesAnalysis } from '@readhub/database/analysis.service'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'analyze_article_comparison'

// Transporte puro sobre @readhub/database/analysis.service::compareArticlesAnalysis.
// Distinta del Prompt (skill) `compare_articles`: esa arma un mensaje para
// que el modelo del cliente MCP compare; esta Tool genera la comparación en
// el servidor (vía @readhub/ai, el mismo proveedor que ya usa ask_readhub) y
// devuelve el resultado ya calculado. Cubre a la vez "comparar múltiples
// artículos" y "detectar similitudes y diferencias".
export function registerAnalyzeArticleComparisonTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Comparar artículos (análisis generado)',
      description:
        'Genera un análisis comparativo de 2 a 5 artículos de ReadHub, identificando similitudes, ' +
        'diferencias y posibles contradicciones. A diferencia de la skill compare_articles, esta ' +
        'Tool genera el análisis en el servidor y devuelve el resultado directamente.',
      inputSchema: {
        articleIds: z
          .array(z.string().uuid())
          .min(2)
          .max(5)
          .describe('IDs (UUID) de 2 a 5 artículos a comparar'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ articleIds }) => {
      const client = getSupabaseClient()
      const result = await compareArticlesAnalysis(client, articleIds)
      return serviceResultToToolResult(result)
    }
  )
  return TOOL_NAME
}
