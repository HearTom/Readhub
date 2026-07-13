# ReadHub — Checklist de preparación para CI/CD

Estado del repositorio verificado para que `.github/workflows/ci.yml` pueda
ejecutarse en GitHub Actions apenas se publique. Este documento es la salida
de una auditoría, no un tutorial — cada ítem indica qué se verificó, qué se
encontró y qué se corrigió (si algo estaba mal).

## 1. Checklist de infraestructura

| Ítem | Estado | Detalle |
|---|---|---|
| Repositorio Git inicializado | ✅ OK | `.git` presente, `git rev-parse --is-inside-work-tree` → `true` |
| Rama principal correctamente configurada | ✅ **Corregido** | Estaba en `master` (legado) mientras `ci.yml` dispara sobre `main` → el pipeline **nunca se hubiera activado**. Renombrada localmente con `git branch -m master main` (sin remoto configurado todavía, cambio sin riesgo ni pérdida de historia) |
| `.github/workflows/` existe | ✅ OK | Contiene un único archivo |
| `ci.yml` correctamente ubicado | ✅ OK | `.github/workflows/ci.yml` — YAML válido, 4 jobs (`typecheck`, `lint`, `unit-tests`, `e2e`), triggers `push`/`pull_request` sobre `branches: [main]` (ahora coincide con la rama real) |
| `package-lock.json` trackeado | ✅ OK | Necesario para que `npm ci` funcione en CI (falla si el lockfile no está commiteado o desincronizado) |
| `.env.example` por workspace | ✅ OK | Ya existían y están completos: `apps/web/.env.example`, `apps/mcp/.env.example`. No hizo falta generar ninguno nuevo |
| Secretos reales fuera de git | ✅ OK | `apps/web/.env.local` y `apps/mcp/.env` — confirmado con `git check-ignore -v` que ambos están ignorados vía `.gitignore` (`.env*.local`, `.env`) |

## 2. Variables de entorno — qué necesita cada job

Relevamiento hecho con `grep -r "process.env\."` sobre el código fuente real (no supuesto): estas son las únicas variables que el código efectivamente lee.

| Variable | Dónde se usa (código real) | Requerida por | Secret en GitHub |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `packages/database/client.ts`, `server.ts`, `middleware.ts`, `storage.service.ts` | Job `e2e` (build + start real de Next.js) | **Sí** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ídem | Job `e2e` | **Sí** |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | `apps/web/e2e/data/users.ts` | Job `e2e` (usuario QA real, ya confirmado en Supabase) | **Sí** |
| `HF_TOKEN` | `packages/ai/client.ts` | Ninguno actualmente — `auth.spec.ts` no ejercita rutas de IA (chat/upload) | No, hasta que se agreguen esos E2E |
| `SUPABASE_SERVICE_ROLE_KEY` | **Ninguno** — solo aparece en un comentario en `apps/mcp/src/supabase-client.ts` explicando qué *no* hacer | Ninguno | No, hasta que se implemente un cliente admin real |

**Jobs `typecheck`, `lint` y `unit-tests` no requieren ninguna variable de entorno**: `tsc --noEmit` y ESLint no ejecutan código; Vitest nunca toca Supabase/HuggingFace real — todo mockeado (confirmado: cero referencias a estas variables en los `*.test.ts`), y `apps/web/vitest.config.ts` ya fija valores dummy (`test.env`) para los dos únicos casos donde un service intenta leer `NEXT_PUBLIC_SUPABASE_URL` al instanciar un cliente mockeado.

## 3. Secrets a configurar en GitHub (Settings → Secrets and variables → Actions)

Antes de que el job `e2e` pueda pasar en CI, hay que cargar estos 4 secrets (Repository secrets, no Environment secrets — no hay ambientes de deploy definidos):

```
NEXT_PUBLIC_SUPABASE_URL       → mismo valor que apps/web/.env.local
NEXT_PUBLIC_SUPABASE_ANON_KEY  → mismo valor que apps/web/.env.local
E2E_USER_EMAIL                 → e2e-playwright@readhub.test (usuario QA ya creado)
E2E_USER_PASSWORD              → el valor guardado en apps/web/.env.local (nunca commiteado)
```

`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` son técnicamente públicas (se exponen en el bundle del navegador), pero igual se recomienda cargarlas como secret — evita hardcodearlas en el YAML y las mantiene junto con el resto de la configuración sensible del repo.

Si en el futuro se agregan E2E que ejerciten `/upload` o `/assistant`, sumar ahí mismo `HF_TOKEN` y, si se implementa un cliente admin real, `SUPABASE_SERVICE_ROLE_KEY` — y agregarlos al bloque `env:` del step "Ejecutar Playwright" en `ci.yml`.

## 4. Compatibilidad de scripts (`package.json` ↔ `ci.yml`)

| Comando en `ci.yml` | Script real invocado | Verificado |
|---|---|---|
| `npm ci` | — (comando nativo de npm, usa `package-lock.json`) | ✅ exit 0 |
| `npm run typecheck` | raíz → `turbo run typecheck` → `tsc --noEmit` en 6 workspaces | ✅ 6/6 OK |
| `npm run lint` | raíz → `npm run lint --workspace=@readhub/web` → `eslint .` | ✅ exit 0 (0 errores) |
| `npm run test:coverage` | raíz → `turbo run test -- --coverage` → `vitest run --coverage` en 4 workspaces | ✅ 164 tests, cobertura generada |
| `npx playwright install --with-deps` (cwd `apps/web`) | — | Instala navegadores + deps de SO (Ubuntu en CI) |
| `npm run test:e2e --workspace=@readhub/web` | `apps/web` → `playwright test` | ✅ 1/1 passed (verificado contra Supabase real) |

## 5. Ejecución no interactiva — verificado explícitamente

- **Vitest**: los 4 workspaces usan `"test": "vitest run"` (modo single-run), nunca `vitest` a secas (que entra en modo watch y colgaría el job indefinidamente).
- **Playwright**: `reporter` fija `open: 'never'` tanto en CI como en local (`apps/web/playwright.config.ts`) — el reporte HTML nunca intenta abrir un navegador.
- **ESLint**: ya no usa `next lint` (el wizard interactivo de primera ejecución que se cuelga en CI sin TTY) — se reemplazó por `eslint .` directo sobre `eslint.config.mjs` ya materializado.
- **Turborepo**: sin `TURBO_TOKEN`/`TURBO_TEAM` configurados — cachea solo localmente (`.turbo/`), no intenta autenticarse contra Vercel Remote Cache.

## 6. Pendiente — fuera del alcance de este documento

Por restricción explícita, **no se publicó el repositorio**. Cuando decidas hacerlo:

1. `git remote add origin <url>` y `git push -u origin main`.
2. Cargar los 4 secrets de la sección 3 en Settings → Secrets and variables → Actions → New repository secret.
3. El primer push a `main` (o el primer PR contra `main`) debería disparar los 4 jobs automáticamente.
