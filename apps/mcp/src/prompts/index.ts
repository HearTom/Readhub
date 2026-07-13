import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerSummarizeArticlePrompt } from './summarize-article.js'
import { registerExplainArticlePrompt } from './explain-article.js'
import { registerCompareArticlesPrompt } from './compare-articles.js'
import { registerGenerateQuestionsPrompt } from './generate-questions.js'
import { registerExtractKeyConceptsPrompt } from './extract-key-concepts.js'

// Punto único de registro de Prompts (skills). Mismo patrón que
// tools/index.ts y resources/index.ts: para agregar una skill nueva, crear
// su archivo acá siguiendo el patrón de las existentes
// (register<Nombre>Prompt(server): string, usando loadArticleContext de
// ./article-context.ts si opera sobre un artículo) y sumar su llamada acá.
export function registerAllPrompts(server: McpServer): string[] {
  return [
    registerSummarizeArticlePrompt(server),
    registerExplainArticlePrompt(server),
    registerCompareArticlesPrompt(server),
    registerGenerateQuestionsPrompt(server),
    registerExtractKeyConceptsPrompt(server),
  ]
}
