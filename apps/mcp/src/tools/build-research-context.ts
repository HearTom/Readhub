import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { buildResearchContext } from '@readhub/database/chat.service'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'build_research_context'

// Transporte puro sobre @readhub/database/chat.service::buildResearchContext
// -- el mismo paso de "recuperación + construcción de contexto" que usa
// ask_readhub, extraído en la fase anterior para que ambos lo compartan sin
// duplicar la composición searchSimilarChunks + context-builder.service.ts.
// A diferencia de ask_readhub, esta Tool NO genera una respuesta -- devuelve
// el contexto ya armado (fuentes citables + texto listo para un prompt),
// pensado para que quien investigue arme su propio razonamiento sobre él.
export function registerBuildResearchContextTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Construir contexto de investigación',
      description:
        'Busca en ReadHub el contenido más relevante para una consulta de investigación y arma un ' +
        'bloque de contexto citable (con fuentes) — sin generar una respuesta. Útil para investigar ' +
        'un tema antes de sacar conclusiones propias, a diferencia de ask_readhub que sí responde.',
      inputSchema: {
        query: z.string().min(1).describe('Tema o pregunta de investigación en lenguaje natural'),
        maxDocuments: z
          .number()
          .int()
          .positive()
          .max(10)
          .optional()
          .describe('Cantidad máxima de artículos distintos a incluir en el contexto (por defecto 5)'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ query, maxDocuments }) => {
      const client = getSupabaseClient()
      const result = await buildResearchContext(
        client,
        query,
        maxDocuments !== undefined ? { context: { maxDocuments } } : undefined
      )
      return serviceResultToToolResult(result)
    }
  )
  return TOOL_NAME
}
