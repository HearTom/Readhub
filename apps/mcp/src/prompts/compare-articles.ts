import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { searchSimilarChunks } from '@readhub/database/vector-search.service'
import { getSupabaseClient } from '../supabase-client.js'
import { loadArticleContext, formatArticleBlock } from './article-context.js'

const PROMPT_NAME = 'compare_articles'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function registerCompareArticlesPrompt(server: McpServer): string {
  server.registerPrompt(
    PROMPT_NAME,
    {
      title: 'Comparar artículos',
      description:
        'Prepara un prompt para comparar 2 o más artículos de ReadHub. Si se da un solo ID, ' +
        'busca automáticamente un artículo relacionado mediante búsqueda semántica (pipeline RAG) ' +
        'para comparar contra ese.',
      argsSchema: {
        articleIds: z
          .string()
          .describe('IDs (UUID) de los artículos a comparar, separados por coma. Mínimo 1.'),
      },
    },
    async ({ articleIds }) => {
      const ids = articleIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      if (ids.length === 0) {
        throw new Error('articleIds no puede estar vacío: indica al menos un ID de artículo.')
      }
      const invalid = ids.find((id) => !UUID_RE.test(id))
      if (invalid) {
        throw new Error(`"${invalid}" no es un UUID válido de artículo.`)
      }

      let finalIds = ids
      let autoDiscoveredId: string | null = null

      if (ids.length === 1) {
        // Reutiliza el pipeline RAG existente (embeddings + similitud, ver
        // @readhub/database/vector-search.service) para encontrar
        // automáticamente un artículo relacionado -- no reimplementa
        // ninguna lógica de búsqueda propia.
        const client = getSupabaseClient()
        const base = await loadArticleContext(ids[0])
        const related = await searchSimilarChunks(client, `${base.title} ${base.summary ?? ''}`.trim(), {
          matchCount: 5,
        })
        const candidate =
          related.error === null ? related.data.find((match) => match.articleId !== ids[0]) : undefined

        if (!candidate) {
          throw new Error(
            'Solo se indicó un articleId y no se encontró ningún artículo relacionado por búsqueda ' +
              'semántica para comparar automáticamente. Indica al menos 2 IDs separados por coma.'
          )
        }
        finalIds = [ids[0], candidate.articleId]
        autoDiscoveredId = candidate.articleId
      }

      const articles = await Promise.all(finalIds.map((id) => loadArticleContext(id)))
      const blocks = articles
        .map((article, i) => formatArticleBlock(`Artículo ${i + 1}`, article))
        .join('\n\n---\n\n')

      const autoNote = autoDiscoveredId
        ? ` (el artículo "${articles[1].title}" se encontró automáticamente por similitud semántica, ` +
          'no fue indicado explícitamente -- indícalo en tu respuesta.)'
        : ''

      return {
        description: `Comparación de ${articles.length} artículos`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                `Compara los siguientes ${articles.length} artículos de ReadHub. Identifica: ` +
                '(1) qué tienen en común, (2) en qué difieren (enfoque, conclusiones, alcance), y ' +
                '(3) si se contradicen en algún punto. Sé específico y cita el título de cada ' +
                `artículo al referirte a él.${autoNote}\n\n${blocks}`,
            },
          },
        ],
      }
    }
  )
  return PROMPT_NAME
}
