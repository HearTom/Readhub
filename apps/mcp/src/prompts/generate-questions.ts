import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { loadArticleContext, formatArticleBlock } from './article-context.js'

const PROMPT_NAME = 'generate_questions'
const DEFAULT_COUNT = 5

export function registerGenerateQuestionsPrompt(server: McpServer): string {
  server.registerPrompt(
    PROMPT_NAME,
    {
      title: 'Generar preguntas',
      description: 'Prepara un prompt para generar preguntas de comprensión sobre un artículo de ReadHub.',
      argsSchema: {
        articleId: z.string().uuid().describe('ID (UUID) del artículo'),
        count: z
          .string()
          .optional()
          .describe(`Cantidad de preguntas a generar, como texto (por defecto ${DEFAULT_COUNT})`),
      },
    },
    async ({ articleId, count }) => {
      const article = await loadArticleContext(articleId)
      const parsed = Number.parseInt(count ?? '', 10)
      const n = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 20) : DEFAULT_COUNT

      return {
        description: `Preguntas sobre "${article.title}"`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                `Genera ${n} preguntas de comprensión sobre el siguiente artículo de ReadHub, en ` +
                'español. Varía el tipo: algunas literales (se responden directamente con el texto) ' +
                'y otras de análisis o aplicación. Numera las preguntas y no las respondas.' +
                `\n\n${formatArticleBlock('Artículo', article)}`,
            },
          },
        ],
      }
    }
  )
  return PROMPT_NAME
}
