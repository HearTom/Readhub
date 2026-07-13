import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerSearchArticlesTool } from './search-articles.js'
import { registerGetArticleTool } from './get-article.js'
import { registerListArticlesTool } from './list-articles.js'
import { registerSemanticSearchTool } from './search-articles-semantic.js'
import { registerAskReadHubTool } from './ask-readhub.js'
import { registerAnalyzeArticleComparisonTool } from './analyze-article-comparison.js'
import { registerExtractMainThemesTool } from './extract-main-themes.js'
import { registerGenerateGlobalSummaryTool } from './generate-global-summary.js'
import { registerIdentifyArticleRelationshipsTool } from './identify-article-relationships.js'
import { registerBuildResearchContextTool } from './build-research-context.js'

// Punto único de registro de Tools. Para agregar una Tool nueva: crear su
// archivo en esta carpeta siguiendo el patrón de las existentes
// (register<Nombre>Tool(server): string, transporte puro sobre un servicio
// de @readhub/database o @readhub/ai) y sumar su llamada acá. Nada más
// necesita cambiar -- ni server.ts ni index.ts conocen los nombres de las
// Tools individuales.
export function registerAllTools(server: McpServer): string[] {
  return [
    // Consulta de información (fase 4)
    registerSearchArticlesTool(server),
    registerGetArticleTool(server),
    registerListArticlesTool(server),
    registerSemanticSearchTool(server),
    registerAskReadHubTool(server),
    // Análisis avanzado (fase 6) — generan resultado en el servidor,
    // reutilizando @readhub/ai y el pipeline RAG existente
    registerAnalyzeArticleComparisonTool(server),
    registerExtractMainThemesTool(server),
    registerGenerateGlobalSummaryTool(server),
    registerIdentifyArticleRelationshipsTool(server),
    registerBuildResearchContextTool(server),
  ]
}
