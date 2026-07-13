# @readhub/mcp

Servidor MCP de ReadHub, construido con el SDK oficial
`@modelcontextprotocol/sdk`. Expone la plataforma a cualquier cliente MCP a
través de los tres primitivos del protocolo — Tools, Resources y Prompts —
reutilizando en cada uno la lógica ya existente en el monorepo
(`@readhub/database`, `@readhub/ai`, `@readhub/types`, `@readhub/config`).
No duplica ninguna consulta ni lógica de negocio: cada Tool/Resource/Prompt
es transporte puro sobre un servicio compartido.

## Estructura

```
apps/mcp/
├── src/
│   ├── index.ts              # punto de entrada: transporte STDIO, registra Tools/Resources/Prompts, conecta
│   ├── server.ts               # crea la instancia McpServer (nombre/versión)
│   ├── supabase-client.ts       # cliente Supabase propio del servidor (clave anon, singleton perezoso)
│   ├── lib/
│   │   └── mcp-adapters.ts        # ServiceResult<T> -> CallToolResult / ReadResourceResult (compartido por tools/ y resources/)
│   ├── tools/                      # 10 Tools — generan resultado en el servidor
│   ├── resources/                   # 7 Resources (5 URIs fijas + 2 plantillas navegables)
│   └── prompts/                      # 5 Prompts (skills) — arman un mensaje para el modelo del *cliente*
├── package.json
└── tsconfig.json
```

Cada una de `tools/`, `resources/` y `prompts/` tiene su propio `README.md`
con el detalle de qué registra cada archivo y cómo agregar uno nuevo — este
README cubre solo la vista general y cómo correr el servidor.

## Los tres primitivos, en una frase cada uno

- **Tools** (`src/tools/`): ejecutan lógica y devuelven un resultado ya
  calculado. Algunas generan texto con el LLM del lado del **servidor**
  (`ask_readhub`, `analyze_article_comparison`, `extract_main_themes`,
  `generate_global_summary`, `identify_article_relationships`), reutilizando
  `@readhub/ai::generateAnswer` — nunca un cliente HTTP propio hacia el
  proveedor de IA.
- **Resources** (`src/resources/`): datos de solo lectura, direccionables
  por URI (`readhub://...`), pensados para que un cliente MCP los liste y
  navegue.
- **Prompts / skills** (`src/prompts/`): arman un mensaje para que el modelo
  del **cliente** MCP razone — el servidor no genera nada acá. Es la
  diferencia real con las Tools de análisis: mismo dominio (resumir,
  comparar), pero dónde ocurre la generación.

## Cómo quedó integrado con el resto del monorepo

`apps/mcp/package.json` depende de los 4 paquetes compartidos con el
protocolo de workspace (`"@readhub/x": "*"`), igual que `apps/web`:

```json
"dependencies": {
  "@modelcontextprotocol/sdk": "^1.29.0",
  "@readhub/ai": "*",
  "@readhub/config": "*",
  "@readhub/database": "*",
  "@readhub/types": "*",
  "@supabase/supabase-js": "^2.49.4",
  "tsx": "^4.19.0",
  "zod": "^4.0.0"
}
```

**Desacoplado de la app web**: nada en `apps/mcp` importa código de
`apps/web`, ni al revés. El acoplamiento es exclusivamente vía los paquetes
compartidos (`packages/*`). `supabase-client.ts` construye su propio cliente
Supabase (clave anon, vía `@supabase/supabase-js` directo) en vez de
reutilizar `@readhub/database/client` (navegador) o `/server` (atado a
cookies de un request HTTP de Next.js) — ninguno de esos dos contextos
existe en un proceso MCP de larga duración hablando STDIO.

**Runtime: `tsx`, no `tsc` + `node`.** Los 4 paquetes compartidos se
consumen como fuente TypeScript sin paso de build (la misma decisión ya
tomada para `apps/web`, que los consume vía `transpilePackages` de Next).
Node no puede ejecutar `.ts` de forma nativa, así que `apps/mcp` corre
siempre a través de `tsx`:

```bash
npm run dev --workspace=@readhub/mcp     # tsx src/index.ts
npm run start --workspace=@readhub/mcp   # tsx src/index.ts (mismo runtime, sin diferencia dev/prod)
npm run build --workspace=@readhub/mcp   # tsc --noEmit — solo verificación de tipos, no genera dist/
```

`npm run dev` / `npm run build` desde la raíz (vía Turborepo) ya incluyen
este paquete junto con `@readhub/web`.

## Variables de entorno

Copiar `.env.example` a `.env` con las mismas credenciales que
`apps/web/.env.local` (mismo proyecto Supabase; el servidor usa la clave
anon, no la service role — solo lee contenido público) más `HF_TOKEN`
(requerido por las Tools/skills que usan embeddings o generación). `tsx` las
carga automáticamente vía `--env-file-if-exists=.env` en los scripts `dev`/
`start`.

## Verificación manual

El servidor habla JSON-RPC 2.0 sobre stdio (un mensaje por línea):

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"0.0.1"}}}' | npm run dev --workspace=@readhub/mcp
```

Respuesta esperada en `stdout` (los `console.error` de arranque van a
`stderr`, nunca a `stdout` — ese stream es exclusivo del protocolo):

```json
{"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{"listChanged":true},"resources":{"listChanged":true},"prompts":{"listChanged":true}},"serverInfo":{"name":"readhub-mcp","version":"0.0.1"}},"jsonrpc":"2.0","id":1}
```

Seguido de `tools/list`, `resources/list` o `prompts/list` para ver el
detalle de cada uno — ver los `README.md` de cada carpeta para el listado
completo y qué servicio reutiliza cada registro.
