import type { createClient } from './server'
import type { ServiceResult } from './types'
import { getArticles } from './article.service'
import { getArticleWithContent, searchSimilarChunks, type ArticleContent } from './vector-search.service'
import { generateAnswer } from '@readhub/ai'

type Client = Awaited<ReturnType<typeof createClient>>

const MAX_ARTICLES_FOR_ANALYSIS = 5

export interface ArticleRef {
  id: string
  title: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Trae contenido de varios artículos en paralelo, reutilizando
// getArticleWithContent (la misma función que usan las skills de prompts/ en
// apps/mcp) -- ninguna función de este archivo repite esa combinación de
// consultas por su cuenta.
// ─────────────────────────────────────────────────────────────────────────────
async function loadArticlesContent(
  client: Client,
  articleIds: string[]
): Promise<ServiceResult<ArticleContent[]>> {
  const results = await Promise.all(articleIds.map((id) => getArticleWithContent(client, id)))
  const failed = results.find((r) => r.error !== null)
  if (failed) return { data: null, error: failed.error }
  return { data: results.map((r) => r.data as ArticleContent), error: null }
}

function formatFullBlocks(articles: ArticleContent[]): string {
  return articles.map((a, i) => `### Artículo ${i + 1}: "${a.title}"\n${a.content}`).join('\n\n---\n\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Resuelve el bloque de texto a analizar y la lista de artículos cubiertos,
// a partir de articleIds explícitos (contenido completo) o -- si se omiten
// -- de todos los artículos públicos (solo título+resumen, para no inflar el
// prompt de un análisis "de toda la plataforma"). extractMainThemes y
// generateGlobalSummary comparten exactamente esta misma resolución; antes
// cada una la repetía por su cuenta.
// ─────────────────────────────────────────────────────────────────────────────
async function resolveArticlesContent(
  client: Client,
  articleIds: string[] | undefined,
  tooManyErrorLabel: string,
  noArticlesErrorMessage: string
): Promise<ServiceResult<{ blocks: string; articles: ArticleRef[] }>> {
  if (articleIds && articleIds.length > 0) {
    if (articleIds.length > MAX_ARTICLES_FOR_ANALYSIS) {
      return { data: null, error: `Máximo ${MAX_ARTICLES_FOR_ANALYSIS} artículos por ${tooManyErrorLabel}` }
    }
    const contentResult = await loadArticlesContent(client, articleIds)
    if (contentResult.error !== null) return { data: null, error: contentResult.error }
    return {
      data: {
        blocks: formatFullBlocks(contentResult.data),
        articles: contentResult.data.map((a) => ({ id: a.id, title: a.title })),
      },
      error: null,
    }
  }

  const articlesResult = await getArticles(client)
  if (articlesResult.error !== null) return { data: null, error: articlesResult.error }
  if (articlesResult.data.length === 0) {
    return { data: null, error: noArticlesErrorMessage }
  }
  return {
    data: {
      blocks: articlesResult.data.map((a, i) => `${i + 1}. "${a.title}"${a.summary ? ` — ${a.summary}` : ''}`).join('\n'),
      articles: articlesResult.data.map((a) => ({ id: a.id, title: a.title })),
    },
    error: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Llama a @readhub/ai::generateAnswer con manejo de error uniforme: falla de
// red/proveedor y respuesta vacía se reportan igual, en vez de repetir el
// mismo try/catch + chequeo en cada función de este archivo que genera texto
// (compareArticlesAnalysis, extractMainThemes, generateGlobalSummary).
// identifyArticleRelationships NO usa este helper a propósito: ahí un fallo
// del LLM se traga en vez de propagarse (ver comentario en esa función), un
// contrato de error distinto e intencional, no una inconsistencia.
// ─────────────────────────────────────────────────────────────────────────────
async function generateOrError(
  prompt: string,
  genericErrorMessage: string,
  emptyErrorMessage: string
): Promise<ServiceResult<string>> {
  let text: string
  try {
    text = await generateAnswer(prompt)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : genericErrorMessage }
  }
  if (text.trim().length === 0) {
    return { data: null, error: emptyErrorMessage }
  }
  return { data: text.trim(), error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARE ARTICLES ANALYSIS — comparación profunda de 2+ artículos generada
// por el LLM. Distinto del Prompt (skill) compare_articles: aquel solo arma
// un mensaje para que el modelo del CLIENTE MCP razone; esta Tool genera la
// comparación en el servidor, reutilizando @readhub/ai::generateAnswer (el
// mismo punto de contacto con el proveedor de IA que ya usa chat.service.ts,
// no uno nuevo). Cubre a la vez "comparar artículos" y "detectar
// similitudes y diferencias": pedírselo al modelo en una sola pasada, con
// una consigna que exige ambas secciones, es la misma operación -- separarla
// en dos llamadas sería la duplicación que esta fase pide evitar.
// ─────────────────────────────────────────────────────────────────────────────

export interface ComparisonResult {
  comparison: string
  articles: ArticleRef[]
}

export async function compareArticlesAnalysis(
  client: Client,
  articleIds: string[]
): Promise<ServiceResult<ComparisonResult>> {
  if (articleIds.length < 2) {
    return { data: null, error: 'Se necesitan al menos 2 articleIds para comparar' }
  }
  if (articleIds.length > MAX_ARTICLES_FOR_ANALYSIS) {
    return { data: null, error: `Máximo ${MAX_ARTICLES_FOR_ANALYSIS} artículos por comparación` }
  }

  const contentResult = await loadArticlesContent(client, articleIds)
  if (contentResult.error !== null) return { data: null, error: contentResult.error }
  const articles = contentResult.data

  const prompt =
    `Compara los siguientes ${articles.length} artículos de ReadHub. Estructura tu respuesta en ` +
    'dos secciones claras: "Similitudes" y "Diferencias" (incluyendo si se contradicen en algún ' +
    'punto). Cita el título de cada artículo al referirte a él. Basate únicamente en el contenido ' +
    `provisto, no inventes información.\n\n${formatFullBlocks(articles)}`

  const generated = await generateOrError(
    prompt,
    'Error al generar la comparación',
    'El modelo no devolvió ninguna comparación'
  )
  if (generated.error !== null) return { data: null, error: generated.error }

  return {
    data: { comparison: generated.data, articles: articles.map((a) => ({ id: a.id, title: a.title })) },
    error: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT MAIN THEMES — temas principales de un conjunto de artículos, o de
// todos los públicos si no se especifica ninguno. Con articleIds explícito
// usa el contenido completo indexado; sin articleIds, usa solo
// título+resumen de getArticles -- un análisis temático de toda la
// plataforma no necesita el texto completo de cada artículo, y evita un
// prompt desproporcionadamente grande.
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemesResult {
  themes: string
  articlesAnalyzed: ArticleRef[]
}

export async function extractMainThemes(
  client: Client,
  articleIds?: string[]
): Promise<ServiceResult<ThemesResult>> {
  const resolved = await resolveArticlesContent(
    client,
    articleIds,
    'análisis',
    'No hay artículos públicos para analizar'
  )
  if (resolved.error !== null) return { data: null, error: resolved.error }

  const prompt =
    'Identifica los temas principales que cubren los siguientes artículos de ReadHub. Agrupa por ' +
    'tema (no por artículo), y para cada tema indica qué artículos lo tratan. Presenta el ' +
    `resultado como una lista.\n\n${resolved.data.blocks}`

  const generated = await generateOrError(prompt, 'Error al extraer los temas', 'El modelo no devolvió ningún tema')
  if (generated.error !== null) return { data: null, error: generated.error }

  return { data: { themes: generated.data, articlesAnalyzed: resolved.data.articles }, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE GLOBAL SUMMARY — resumen de conjunto sobre varios artículos, o
// sobre toda la plataforma pública si no se especifica ninguno. Misma
// distinción de tamaño de prompt que extractMainThemes.
// ─────────────────────────────────────────────────────────────────────────────

export interface GlobalSummaryResult {
  summary: string
  articlesCovered: number
}

export async function generateGlobalSummary(
  client: Client,
  articleIds?: string[]
): Promise<ServiceResult<GlobalSummaryResult>> {
  const resolved = await resolveArticlesContent(
    client,
    articleIds,
    'resumen',
    'No hay artículos públicos para resumir'
  )
  if (resolved.error !== null) return { data: null, error: resolved.error }

  const prompt =
    'Redacta un resumen general (un párrafo, 5-8 oraciones) de qué cubre el siguiente conjunto de ' +
    `artículos de ReadHub en su conjunto, como si describieras la plataforma a alguien nuevo.\n\n${resolved.data.blocks}`

  const generated = await generateOrError(
    prompt,
    'Error al generar el resumen',
    'El modelo no devolvió ningún resumen'
  )
  if (generated.error !== null) return { data: null, error: generated.error }

  return { data: { summary: generated.data, articlesCovered: resolved.data.articles.length }, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// IDENTIFY ARTICLE RELATIONSHIPS — encuentra artículos relacionados con uno
// dado reutilizando searchSimilarChunks (sin reimplementar la búsqueda) y
// agrega una explicación en lenguaje natural de cómo se relacionan. La lista
// de relacionados y su similitud son deterministas (vienen directo de la
// búsqueda semántica); solo la explicación cualitativa viene del LLM, y un
// fallo puntual de generación no tira abajo la lista determinista.
// ─────────────────────────────────────────────────────────────────────────────

export interface RelatedArticle {
  articleId: string
  title: string
  similarity: number
}

export interface RelationshipsResult {
  sourceArticle: ArticleRef
  relatedArticles: RelatedArticle[]
  relationshipsNarrative: string | null
}

export async function identifyArticleRelationships(
  client: Client,
  articleId: string,
  matchCount = 5
): Promise<ServiceResult<RelationshipsResult>> {
  const sourceResult = await getArticleWithContent(client, articleId)
  if (sourceResult.error !== null) return { data: null, error: sourceResult.error }
  const source = sourceResult.data

  const searchResult = await searchSimilarChunks(client, `${source.title} ${source.summary ?? ''}`.trim(), {
    matchCount: matchCount + 5, // margen para descartar chunks del propio artículo y duplicados
  })
  if (searchResult.error !== null) return { data: null, error: searchResult.error }

  const candidates = new Map<string, { title: string; similarity: number; excerpt: string }>()
  for (const match of searchResult.data) {
    if (match.articleId === articleId || candidates.has(match.articleId)) continue
    candidates.set(match.articleId, {
      title: match.articleTitle,
      similarity: match.similarity,
      excerpt: match.content.slice(0, 300),
    })
    if (candidates.size >= matchCount) break
  }

  const relatedArticles: RelatedArticle[] = Array.from(candidates.entries()).map(([id, c]) => ({
    articleId: id,
    title: c.title,
    similarity: c.similarity,
  }))

  if (relatedArticles.length === 0) {
    return {
      data: { sourceArticle: { id: source.id, title: source.title }, relatedArticles: [], relationshipsNarrative: null },
      error: null,
    }
  }

  const candidatesBlock = Array.from(candidates.values())
    .map((c, i) => `${i + 1}. "${c.title}" (similitud: ${c.similarity.toFixed(2)})\nFragmento: ${c.excerpt}`)
    .join('\n\n')

  const prompt =
    `El artículo "${source.title}" de ReadHub tiene estos artículos relacionados por similitud ` +
    `semántica:\n\n${candidatesBlock}\n\nPara cada uno, describe en una línea qué tipo de relación ` +
    'tiene con el artículo original (p. ej. profundiza el mismo tema, lo complementa, presenta un ' +
    'enfoque distinto, o solo comparte vocabulario sin relación real de contenido). Si no podés ' +
    'inferirlo con certeza a partir del fragmento, decilo en vez de inventar.'

  let relationshipsNarrative: string | null
  try {
    const raw = await generateAnswer(prompt)
    relationshipsNarrative = raw.trim().length > 0 ? raw.trim() : null
  } catch {
    // La lista determinista de relacionados ya es útil por sí sola -- un
    // fallo del LLM acá no debe tirar abajo toda la respuesta.
    relationshipsNarrative = null
  }

  return {
    data: { sourceArticle: { id: source.id, title: source.title }, relatedArticles, relationshipsNarrative },
    error: null,
  }
}
