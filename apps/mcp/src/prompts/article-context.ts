import { getArticleWithContent, type ArticleContent } from '@readhub/database/vector-search.service'
import { getSupabaseClient } from '../supabase-client.js'

export type ArticleContext = ArticleContent

// Punto único de "traer un artículo listo para meterlo en un prompt". Todas
// las skills que operan sobre un artículo (resumir, explicar, generar
// preguntas, extraer conceptos, y cada lado de comparar) pasan por acá, y
// las nuevas Tools de análisis avanzado (../tools/analysis) también --
// ambas llaman a la misma @readhub/database::getArticleWithContent, ninguna
// repite la combinación título+resumen+contenido indexado por su cuenta.
export async function loadArticleContext(articleId: string): Promise<ArticleContext> {
  const client = getSupabaseClient()
  const result = await getArticleWithContent(client, articleId)
  if (result.error !== null) {
    throw new Error(`No se pudo obtener el artículo ${articleId}: ${result.error}`)
  }
  return result.data
}

export function formatArticleBlock(label: string, article: ArticleContext): string {
  return [`### ${label}: "${article.title}"`, article.summary ? `Resumen: ${article.summary}` : null, '', article.content]
    .filter((line): line is string => line !== null)
    .join('\n')
}
