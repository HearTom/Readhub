import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getArticles, getArticle } from '@readhub/database'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToResourceContent, firstTemplateValue } from '../lib/mcp-adapters.js'

const LIST_URI = 'readhub://articles'
const LIST_NAME = 'readhub_articles'
const TEMPLATE_URI = 'readhub://articles/{articleId}'
const TEMPLATE_NAME = 'readhub_article'

// Un solo lugar de verdad para el nombre del artículo en la lista, reutilizado
// tanto por la lectura de readhub://articles como por el callback `list` de
// la plantilla readhub://articles/{articleId} -- ambos llaman getArticles,
// nunca duplican la consulta.
function toResourceEntry(uri: string, id: string, title: string) {
  return { uri: uri.replace('{articleId}', id), name: title, mimeType: 'application/json' }
}

// Transporte puro sobre @readhub/database::getArticles / getArticle.
export function registerArticlesResources(server: McpServer): string[] {
  server.registerResource(
    LIST_NAME,
    LIST_URI,
    {
      title: 'Artículos de ReadHub',
      description: 'Todos los artículos públicos de ReadHub.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const client = getSupabaseClient()
      const result = await getArticles(client)
      return serviceResultToResourceContent(uri.href, result)
    }
  )

  server.registerResource(
    TEMPLATE_NAME,
    new ResourceTemplate(TEMPLATE_URI, {
      // Habilita que un cliente MCP "navegue" -- cada artículo público
      // aparece como una entrada individual descubrible, sin que el cliente
      // tenga que adivinar IDs. Reutiliza getArticles, no repite la consulta.
      list: async () => {
        const client = getSupabaseClient()
        const result = await getArticles(client)
        if (result.error !== null) return { resources: [] }
        return {
          resources: result.data.map((article) =>
            toResourceEntry(TEMPLATE_URI, article.id, article.title)
          ),
        }
      },
    }),
    {
      title: 'Artículo de ReadHub por ID',
      description: 'Detalle completo de un artículo de ReadHub (título, resumen, autor, contadores).',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const client = getSupabaseClient()
      const articleId = firstTemplateValue(variables.articleId)
      const result = await getArticle(client, articleId)
      return serviceResultToResourceContent(uri.href, result)
    }
  )

  return [LIST_URI, TEMPLATE_URI]
}
