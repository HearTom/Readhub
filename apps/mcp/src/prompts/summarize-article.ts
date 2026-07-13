import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { loadArticleContext, formatArticleBlock } from './article-context.js'

const PROMPT_NAME = 'summarize_article'

// No llama a ningún modelo de lenguaje del lado del servidor -- solo trae el
// contenido del artículo (reutilizando @readhub/database, sin volver a
// extraer el documento) y arma un mensaje para que el LLM del cliente MCP
// haga el resumen. Distinto de la Tool ask_readhub, que sí genera la
// respuesta en el servidor vía el pipeline RAG completo.
export function registerSummarizeArticlePrompt(server: McpServer): string {
  server.registerPrompt(
    PROMPT_NAME,
    {
      title: 'Resumir artículo',
      description: 'Prepara un prompt para resumir un artículo publicado en ReadHub a partir de su ID.',
      argsSchema: {
        articleId: z.string().uuid().describe('ID (UUID) del artículo a resumir'),
      },
    },
    async ({ articleId }) => {
      const article = await loadArticleContext(articleId)
      return {
        description: `Resumen de "${article.title}"`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                'Resume el siguiente artículo de ReadHub en 3-5 oraciones, en español, capturando ' +
                'la idea central y la conclusión o resultado principal. No inventes información que ' +
                `no esté en el texto.\n\n${formatArticleBlock('Artículo', article)}`,
            },
          },
        ],
      }
    }
  )
  return PROMPT_NAME
}
