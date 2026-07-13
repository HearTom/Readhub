import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { loadArticleContext, formatArticleBlock } from './article-context.js'

const PROMPT_NAME = 'explain_article'

export function registerExplainArticlePrompt(server: McpServer): string {
  server.registerPrompt(
    PROMPT_NAME,
    {
      title: 'Explicar artículo',
      description:
        'Prepara un prompt para explicar (no solo resumir) un artículo de ReadHub, ' +
        'adaptado opcionalmente a un nivel de audiencia.',
      argsSchema: {
        articleId: z.string().uuid().describe('ID (UUID) del artículo a explicar'),
        audienceLevel: z
          .string()
          .optional()
          .describe('Nivel de la audiencia, p. ej. "principiante", "intermedio", "experto" (opcional)'),
      },
    },
    async ({ articleId, audienceLevel }) => {
      const article = await loadArticleContext(articleId)
      const level = audienceLevel?.trim()
      return {
        description: `Explicación de "${article.title}"`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                `Explica el siguiente artículo de ReadHub ${level ? `para una audiencia de nivel ${level}` : 'para una audiencia general, sin asumir conocimiento previo del tema'}. ` +
                'Desarrolla los conceptos clave paso a paso, usa ejemplos si ayudan a la comprensión, ' +
                'y aclara cualquier término técnico que aparezca. El objetivo es que se entienda, no ' +
                `solo resumir de qué trata.\n\n${formatArticleBlock('Artículo', article)}`,
            },
          },
        ],
      }
    }
  )
  return PROMPT_NAME
}
