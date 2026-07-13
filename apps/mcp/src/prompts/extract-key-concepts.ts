import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { loadArticleContext, formatArticleBlock } from './article-context.js'

const PROMPT_NAME = 'extract_key_concepts'

export function registerExtractKeyConceptsPrompt(server: McpServer): string {
  server.registerPrompt(
    PROMPT_NAME,
    {
      title: 'Extraer conceptos clave',
      description: 'Prepara un prompt para extraer los conceptos clave (término + definición breve) de un artículo de ReadHub.',
      argsSchema: {
        articleId: z.string().uuid().describe('ID (UUID) del artículo'),
      },
    },
    async ({ articleId }) => {
      const article = await loadArticleContext(articleId)
      return {
        description: `Conceptos clave de "${article.title}"`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                'Extrae los conceptos clave del siguiente artículo de ReadHub. Para cada uno, indica ' +
                'el término y una definición breve (1-2 oraciones) basada únicamente en cómo se usa ' +
                'en el texto, no en conocimiento externo. Presenta el resultado como una lista.' +
                `\n\n${formatArticleBlock('Artículo', article)}`,
            },
          },
        ],
      }
    }
  )
  return PROMPT_NAME
}
