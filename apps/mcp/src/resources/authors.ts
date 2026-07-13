import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getAuthorsSummary, getMyArticles } from '@readhub/database'
import { getSupabaseClient } from '../supabase-client.js'
import { serviceResultToResourceContent, firstTemplateValue } from '../lib/mcp-adapters.js'

const LIST_URI = 'readhub://authors'
const LIST_NAME = 'readhub_authors'
const TEMPLATE_URI = 'readhub://authors/{authorId}'
const TEMPLATE_NAME = 'readhub_author'

// Transporte puro sobre @readhub/database::getAuthorsSummary / getMyArticles.
//
// El detalle por autor reutiliza getMyArticles(client, authorId) -- pensada
// originalmente para "mis artículos" -- en vez de escribir una consulta
// nueva: bajo este cliente anon (sin sesión), RLS (`articles_select`:
// `is_public = TRUE OR auth.uid() = author_id`) ya garantiza que solo se
// devuelvan los artículos PÚBLICOS de ese autor sin importar qué authorId se
// pida, así que es seguro reutilizarla tal cual para cualquier autor, no
// solo para uno mismo.
export function registerAuthorsResources(server: McpServer): string[] {
  server.registerResource(
    LIST_NAME,
    LIST_URI,
    {
      title: 'Autores de ReadHub',
      description: 'Autores con artículos públicos en ReadHub, con su cantidad de artículos y likes totales.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const client = getSupabaseClient()
      const result = await getAuthorsSummary(client)
      return serviceResultToResourceContent(uri.href, result)
    }
  )

  server.registerResource(
    TEMPLATE_NAME,
    new ResourceTemplate(TEMPLATE_URI, {
      list: async () => {
        const client = getSupabaseClient()
        const result = await getAuthorsSummary(client)
        if (result.error !== null) return { resources: [] }
        return {
          resources: result.data.map((author) => ({
            uri: TEMPLATE_URI.replace('{authorId}', author.authorId),
            name: `Autor ${author.authorId} (${author.articlesCount} artículo${author.articlesCount === 1 ? '' : 's'})`,
            mimeType: 'application/json',
          })),
        }
      },
    }),
    {
      title: 'Artículos públicos de un autor',
      description: 'Artículos públicos de ReadHub publicados por un autor específico.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const client = getSupabaseClient()
      const authorId = firstTemplateValue(variables.authorId)
      const result = await getMyArticles(client, authorId)
      return serviceResultToResourceContent(uri.href, result)
    }
  )

  return [LIST_URI, TEMPLATE_URI]
}
