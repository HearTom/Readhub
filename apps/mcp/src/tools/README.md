# tools/

Tools registradas por este servidor MCP. Todas son transporte puro sobre los
servicios ya existentes en `@readhub/database`/`@readhub/ai` — ninguna
reimplementa lógica de negocio.

### Consulta de información

| Tool | Servicio reutilizado | Archivo |
|---|---|---|
| `search_articles` | `@readhub/database::searchArticles` (coincidencia de texto) | `search-articles.ts` |
| `get_article` | `@readhub/database::getArticle` | `get-article.ts` |
| `list_articles` | `@readhub/database::getArticles` | `list-articles.ts` |
| `search_articles_semantic` | `@readhub/database/vector-search.service::searchSimilarChunks` | `search-articles-semantic.ts` |
| `ask_readhub` | `@readhub/database/chat.service::askQuestion` (pipeline RAG completo) | `ask-readhub.ts` |

### Análisis avanzado

Estas Tools **generan resultado en el servidor** (llaman a `@readhub/ai::generateAnswer`,
igual que `ask_readhub`) — a diferencia de las skills en `../prompts/`, que solo
arman un mensaje para que el modelo del *cliente* MCP razone.

| Tool | Servicio reutilizado | Archivo |
|---|---|---|
| `analyze_article_comparison` | `@readhub/database/analysis.service::compareArticlesAnalysis` | `analyze-article-comparison.ts` |
| `extract_main_themes` | `@readhub/database/analysis.service::extractMainThemes` | `extract-main-themes.ts` |
| `generate_global_summary` | `@readhub/database/analysis.service::generateGlobalSummary` | `generate-global-summary.ts` |
| `identify_article_relationships` | `@readhub/database/analysis.service::identifyArticleRelationships` (reutiliza `searchSimilarChunks`) | `identify-article-relationships.ts` |
| `build_research_context` | `@readhub/database/chat.service::buildResearchContext` (mismo paso que usa `ask_readhub`, sin generar respuesta) | `build-research-context.ts` |

## Cómo agregar una Tool nueva

1. Crear `<nombre>.ts` en esta carpeta con el patrón:
   ```ts
   export function register<Nombre>Tool(server: McpServer): string {
     server.registerTool(TOOL_NAME, { title, description, inputSchema, annotations }, async (args) => {
       const client = getSupabaseClient()
       const result = await algunServicioDe('@readhub/database' o '@readhub/ai')(client, ...args)
       return serviceResultToToolResult(result)
     })
     return TOOL_NAME
   }
   ```
2. Si la capacidad no existe todavía como servicio compartido, agregarla en
   `packages/database` (o `packages/ai`), no acá — esta carpeta nunca debe
   contener lógica de acceso a datos o de IA, solo el adaptador al protocolo
   MCP (`inputSchema` con `zod`, `serviceResultToToolResult` para la
   respuesta).
3. Registrar la función en `index.ts` (`registerAllTools`).

`../lib/mcp-adapters.ts` centraliza la conversión `ServiceResult<T>` →
`CallToolResult` (`serviceResultToToolResult`) — cualquier Tool nueva debería
reutilizarla en vez de construir su propio `content`/`isError` a mano. Es el
mismo módulo que usan los Resources (`serviceResultToResourceContent`,
`jsonResourceContent`) — antes cada carpeta tenía su propio adaptador
duplicado; se unificaron en la auditoría de esta fase.
