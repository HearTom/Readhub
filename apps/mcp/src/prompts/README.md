# prompts/ (skills)

Prompts (skills) registrados por este servidor MCP: instrucciones
predefinidas que un cliente MCP invoca para que **su propio** modelo de
lenguaje interactúe con ReadHub de forma más eficiente. Ninguno llama a un
LLM del lado del servidor — esa es la diferencia con las Tools de generación
(`ask_readhub`, que sí ejecuta el pipeline RAG completo en el servidor). Los
Prompts solo traen datos reales de ReadHub (reutilizando
`@readhub/database`) y arman el mensaje; el razonamiento (resumir, explicar,
comparar, generar preguntas, extraer conceptos) lo hace el modelo del
cliente.

| Skill | Argumentos | Qué prepara | Archivo |
|---|---|---|---|
| `summarize_article` | `articleId` | Prompt para resumir un artículo en 3-5 oraciones | `summarize-article.ts` |
| `explain_article` | `articleId`, `audienceLevel?` | Prompt para explicar (no solo resumir), adaptable a nivel de audiencia | `explain-article.ts` |
| `compare_articles` | `articleIds` (uno o más, separados por coma) | Prompt para comparar 2+ artículos; con un solo ID, encuentra automáticamente uno relacionado vía búsqueda semántica | `compare-articles.ts` |
| `generate_questions` | `articleId`, `count?` | Prompt para generar N preguntas de comprensión | `generate-questions.ts` |
| `extract_key_concepts` | `articleId` | Prompt para extraer términos clave con definición breve | `extract-key-concepts.ts` |

## `article-context.ts` — evita duplicar lógica entre skills

Todas las skills que operan sobre un artículo pasan por
`loadArticleContext(articleId)`, que combina `getArticle` (metadata) +
`getArticleChunks` (texto indexado, reconstruido desde `article_chunks` —
ya generado por el pipeline RAG al publicarse, no se vuelve a extraer el
documento) y `formatArticleBlock` para darle el mismo formato a cada una.
Ninguna skill vuelve a escribir esa combinación por su cuenta.

## Reutilización del sistema RAG

`compare_articles` es la única skill que además usa
`@readhub/database/vector-search.service::searchSimilarChunks` (embeddings +
similitud) — cuando se da un solo `articleId`, encuentra automáticamente un
artículo relacionado para comparar, en vez de fallar o pedir un segundo ID a
la fuerza. El resto de las skills no necesita búsqueda semántica: ya reciben
el ID del artículo sobre el que operan.

## Cómo agregar una skill nueva

1. Crear `<nombre>.ts` con el patrón `register<Nombre>Prompt(server): string`,
   usando `server.registerPrompt(name, { title, description, argsSchema }, callback)`.
   `argsSchema` son campos `zod` — a nivel de protocolo MCP los argumentos de
   un Prompt siempre viajan como texto, así que valores no-string (como
   `count` en `generate_questions`) se declaran `z.string()` y se parsean
   dentro del callback.
2. Si la skill necesita datos que no trae `article-context.ts`, agregar la
   consulta en `packages/database` (nunca acá) y reutilizarla desde ahí.
3. Registrar la función en `index.ts` (`registerAllPrompts`).
