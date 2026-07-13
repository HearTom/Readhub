# Contrato de herramientas: MCP y capacidades de ReadHub

Este archivo define, para cualquier tarea de la Skill que necesite saber
"qué existe ya en ReadHub sobre un tema" (artículos relacionados,
comparación, contradicciones, o comprobar que un título/enfoque no esté
duplicado), **en qué orden buscar** y **qué no hacer**.

## Por qué existe este contrato

`services/vector-search.service.ts` ya resuelve búsqueda semántica sobre los
artículos indexados (embeddings vía Hugging Face + RPC
`match_article_chunks`, con RLS aplicado). Reimplementar esa lógica dentro de
esta Skill (por ejemplo, "adivinar" similitud por keywords a mano cuando la
herramienta real está disponible) produciría resultados peores y
duplicaría código que ya existe y se mantiene en otro lugar. Por eso la regla
es siempre: **usa la capacidad más específica que esté realmente disponible
en la sesión actual; nunca la reimplementes.**

## Cadena de prioridad

Antes de decir "ReadHub no tiene nada sobre esto" o "no puedo buscar",
recorre esta cadena en orden. Detente en el primer nivel que esté disponible.

### 1. Herramienta MCP dedicada de ReadHub (si existe)

Si el proyecto expone un servidor MCP propio de ReadHub (patrón de nombre
`mcp__readhub__*`), sus herramientas envuelven los servicios existentes
(`vector-search.service.ts` / `chat.service.ts`) del lado del servidor y son
la fuente preferida. Ejemplos de qué herramientas cabría esperar ahí (no
asumas nombres exactos — usa `ToolSearch` con la consulta `readhub` para
confirmar cuáles existen realmente en la sesión antes de invocarlas):

- una herramienta de **búsqueda semántica** de artículos por consulta en
  lenguaje natural (equivalente a `askQuestion`/`searchSimilarChunks`);
- una herramienta para **obtener un artículo** por id (título, resumen,
  autor, fecha, visibilidad);
- un **recurso** con el listado de artículos públicos (para escaneo rápido
  sin generar embeddings);
- un **prompt** predefinido de "comparar artículo contra el corpus".

Si estas herramientas no aparecen en `ToolSearch`, este servidor todavía no
existe en el entorno actual — pasa al nivel 2 sin insistir.

### 2. MCP de Supabase (ya conectado en este proyecto)

El servidor `supabase` sí está conectado hoy. Úsalo para búsquedas léxicas
rápidas cuando no haya una herramienta semántica dedicada:

- `mcp__supabase__execute_sql` con **SELECT de solo lectura** contra
  `public.articles` (columnas: `id`, `author_id`, `title`, `summary`,
  `is_public`, `created_at`) — por ejemplo, `ILIKE` sobre `title`/`summary`
  con los términos clave del artículo del usuario, filtrando
  `is_public = true` salvo que el propio usuario pida ver sus borradores.
- `mcp__supabase__list_tables` si necesitas confirmar el esquema vigente
  antes de consultar (puede haber cambiado desde que se escribió este
  archivo).

Reglas estrictas para este nivel:

- **Solo lectura.** Nunca uses `apply_migration`, `execute_sql` con
  `INSERT`/`UPDATE`/`DELETE`, ni ninguna herramienta que modifique datos o
  esquema. Esta Skill asiste a un escritor, no administra la base de datos.
- No expongas `author_id`/`user_id` de otros usuarios en la respuesta salvo
  que sea directamente relevante (p. ej. atribuir un artículo relacionado a
  su autor).
- Esta es una búsqueda **léxica**, no semántica — trátala como un primer
  filtro de candidatos, no como equivalente a la búsqueda vectorial real.
  Dilo explícitamente al usuario ("encontré esto por coincidencia de
  palabras, no es la búsqueda semántica completa de ReadHub").

### 3. Endpoint RAG existente de ReadHub (`/api/chat`)

Si el servidor de desarrollo de ReadHub está corriendo y hay contexto de
sesión disponible, la búsqueda semántica real ya existe en
`services/chat.service.ts::askQuestion` (expuesta en `POST /api/chat`, y en
la UI en `/assistant`). Esta Skill no reimplementa ese pipeline. Cuando el
nivel 1 no exista y el nivel 2 no sea suficiente (el usuario necesita
similitud conceptual, no solo coincidencia de palabras), la acción correcta
es:

- si puedes invocar el endpoint (p. ej. mediante una herramienta HTTP con la
  sesión del usuario), reutilízalo tal cual, sin alterar su contrato
  (`{ question }` → `{ answer, sources, contextFound, metadata }`);
- si no puedes invocarlo desde este entorno, indícale al usuario que puede
  formular la misma pregunta directamente en el Asistente IA de ReadHub
  (`/assistant`) y traer aquí los resultados para continuar el trabajo
  editorial (comparar, resumir, detectar contradicciones).

### 4. Sin herramientas disponibles

Si ningún nivel anterior es viable (sin MCP de ReadHub, sin Supabase MCP,
sin servidor corriendo), dilo explícitamente y pide al usuario que pegue
título/resumen de los artículos con los que quiere comparar. No inventes
artículos ni resultados de búsqueda.

## Tareas que NO necesitan esta cadena

Redacción, claridad, coherencia, redundancia interna, títulos, resúmenes y
palabras clave son tareas lingüísticas que Claude resuelve directamente
sobre el texto que el usuario ya compartió. No actives ninguna herramienta
para ellas — hacerlo sería trabajo innecesario y una fuente de latencia sin
beneficio.
