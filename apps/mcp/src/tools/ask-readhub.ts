import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { askQuestion } from '@readhub/database/chat.service'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToToolResult } from '../lib/mcp-adapters.js'

const TOOL_NAME = 'ask_readhub'

// Transporte puro sobre @readhub/database/chat.service::askQuestion -- el
// pipeline RAG completo (búsqueda semántica -> construcción de contexto ->
// generación) ya construido para el Asistente IA de la app web. Esta Tool
// no reimplementa ni un paso de ese pipeline.
export function registerAskReadHubTool(server: McpServer): string {
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Preguntar a ReadHub (RAG)',
      description:
        'Responde una pregunta en lenguaje natural utilizando el pipeline RAG completo de ' +
        'ReadHub (búsqueda semántica + construcción de contexto + generación), citando los ' +
        'artículos publicados que uso como fuente. Si no encuentra contexto suficiente, lo dice ' +
        'explícitamente en vez de inventar una respuesta.',
      inputSchema: {
        question: z
          .string()
          .min(1)
          .describe('Pregunta en lenguaje natural sobre el contenido publicado en ReadHub'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ question }) => {
      const client = getSupabaseClient()
      const result = await askQuestion(client, question)
      return serviceResultToToolResult(result)
    }
  )
  return TOOL_NAME
}
