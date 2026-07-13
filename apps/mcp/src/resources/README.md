# resources/

Resources registrados por este servidor MCP. Todos son transporte puro sobre
los servicios ya existentes en `@readhub/database`/`@readhub/config` —
ninguno reimplementa lógica de negocio ni repite una consulta que ya exista.

| Resource(s) | URI | Servicio reutilizado | Archivo |
|---|---|---|---|
| Info general | `readhub://info` | `@readhub/config` (`APP_NAME`, `USER_ROLES`) | `info.ts` |
| Artículos (lista) | `readhub://articles` | `@readhub/database::getArticles` | `articles.ts` |
| Artículo (detalle, plantilla) | `readhub://articles/{articleId}` | `@readhub/database::getArticle` | `articles.ts` |
| Autores (lista) | `readhub://authors` | `@readhub/database::getAuthorsSummary` | `authors.ts` |
| Autor (artículos, plantilla) | `readhub://authors/{authorId}` | `@readhub/database::getMyArticles` | `authors.ts` |
| Categorías | `readhub://categories` | — (contenido estático, ver nota) | `categories.ts` |
| Estadísticas | `readhub://stats` | `@readhub/database::getStatistics` | `stats.ts` |

## Nota sobre `categories`

El esquema de `articles` no tiene columna de categoría ni de etiquetas —
ReadHub no tiene esa funcionalidad implementada. En vez de inventar una
taxonomía a partir del texto de los artículos, el Resource devuelve un
mensaje honesto (`implemented: false`) en vez de datos fabricados.

## Nota sobre `authors`

No existe una tabla/servicio de "autores": la identidad de usuario vive en
`profiles`, pero RLS (`profiles_select_own`) solo permite a cada usuario leer
su propio perfil — un cliente sin sesión (como este servidor MCP, que usa la
clave anon) nunca puede leerla para terceros. Por eso `authors` se deriva
enteramente de columnas ya visibles en `articles`/`likes` bajo RLS pública
(`getAuthorsSummary`), y cada autor se identifica por su `author_id` (UUID),
sin nombre ni email — esa información seguirá sin estar disponible hasta que
exista un mecanismo de acceso autenticado o una vista pública de perfiles.

## Cómo agregar un Resource nuevo

1. Crear `<nombre>.ts` con el patrón `register<Nombre>Resource(server): string`
   (o `string[]` si registra más de una URI, como `articles.ts`/`authors.ts`),
   usando `server.registerResource(name, uri, config, callback)` para una URI
   fija o `new ResourceTemplate(uriTemplate, { list })` para una plantilla
   navegable.
2. Si el dato no existe todavía como servicio compartido, agregarlo en
   `packages/database` (o `packages/ai`/`packages/config`), no acá.
3. Registrar la función en `index.ts` (`registerAllResources`).

`../lib/mcp-adapters.ts` centraliza la conversión `ServiceResult<T>` →
`ReadResourceResult` (`serviceResultToResourceContent`) y el formato JSON
para contenido estático (`jsonResourceContent`) — el mismo módulo que usan
las Tools (`serviceResultToToolResult`). Antes cada carpeta tenía su propio
adaptador casi idéntico; se unificaron en la auditoría de esta fase.
