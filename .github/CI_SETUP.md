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
| `VERCEL_TOKEN` | `vercel pull` / `vercel build` / `vercel deploy` (CLI de Vercel) | Jobs `performance` y `deploy` (Sesión 5 — ver sección 7) | **Sí** |
| `VERCEL_ORG_ID` | Ídem — identifica la organización de Vercel al vincular el proyecto sin prompt interactivo | Jobs `performance` y `deploy` | **Sí** |
| `VERCEL_PROJECT_ID` | Ídem — identifica el proyecto de Vercel | Jobs `performance` y `deploy` | **Sí** |

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

### 3.1 Secrets adicionales — Performance + Deploy a Vercel (Sesión 5)

Los jobs `performance` y `deploy` (ver sección 7) necesitan estos 3 secrets adicionales:

```
VERCEL_TOKEN       → Vercel → Account Settings → Tokens
VERCEL_ORG_ID      → apps/web/.vercel/project.json tras correr `vercel link` localmente una vez
VERCEL_PROJECT_ID  → mismo archivo apps/web/.vercel/project.json
```

Sin estos 3 secrets, el job `performance` falla en el paso "Descargar variables de entorno de Vercel" — con el mensaje de error de la CLI de Vercel, no con un fallo de aserción de performance. Si eso pasa en un PR, no es una regresión real: revisar primero que los secrets estén cargados (y que el PR no venga de un fork, ver nota al pie de la sección 7).

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
2. Cargar los 4 secrets de la sección 3 (y los 3 de la sección 3.1 si vas a usar los jobs de la sección 7) en Settings → Secrets and variables → Actions → New repository secret.
3. El primer push a `main` (o el primer PR contra `main`) debería disparar los jobs automáticamente.

---

## 7. Extensión del pipeline — Performance y Deploy a Vercel (Sesión 5)

Se agregaron dos jobs nuevos a `ci.yml`, **sin tocar** `checks` ni `e2e`.
Ambos corren después de que las validaciones existentes terminan en
verde.

### 7.1 Flujo actualizado del pipeline

```
checks (type-check + lint + Vitest)
   │
   ▼
  e2e (Playwright contra Supabase local efímero)
   │
   ▼
performance (needs: [checks, e2e])
   │  1. vercel pull --environment=production   → variables de entorno reales
   │  2. next build                              → Production Build
   │  3. size-limit                               → tamaño del bundle vs. presupuesto
   │  4. next start + lhci autorun                → Core Web Vitals / Lighthouse
   │  5. resumen en el Summary del job
   │  6. upload-artifact "performance-report"     → siempre, incluso si falló algo
   │
   │  Si size-limit o lhci fallan (exit ≠ 0) → el job falla → deploy nunca corre.
   ▼
deploy (needs: [checks, e2e, performance])
   only-if: push a main/master (nunca en Pull Requests)
   │  1. vercel pull --environment=production
   │  2. vercel build --prod                      → .vercel/output (Build Output API)
   │  3. vercel deploy --prebuilt --prod           → publica exactamente esos artefactos
   ▼
Producción en Vercel
```

`performance` corre también en Pull Requests (mismos triggers que
`checks`/`e2e`) para dar feedback de regresiones antes del merge, sin
desplegar nada. `deploy` es el único job que publica, y solo ante un
push directo a `main`/`master`.

### 7.2 Integración con Vercel

Ambos jobs nuevos usan el flujo oficial de la CLI de Vercel para CI/CD
(`vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt
--prod`). Con `--prebuilt`, Vercel **no vuelve a compilar** del lado
suyo: despliega los artefactos generados en el propio job. Esto requiere
que el proyecto de Vercel tenga **Root Directory = `apps/web`**
configurado en su dashboard (monorepo) y las variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `HF_TOKEN` cargadas en su entorno
**Production** — `vercel pull` las trae de ahí, no hace falta
duplicarlas como secret de GitHub.

Variables de entorno que requiere el despliegue (secrets de GitHub, no
de Vercel): ver sección 3.1.

### 7.3 Cómo interpretar los reportes generados

- **Summary del job `performance`** (pestaña "Summary" del run en
  Actions): tabla con tamaño de bundle vs. límite, y performance
  score/LCP/CLS/TBT por URL auditada — para un vistazo rápido sin
  descargar nada.
- **Artefacto `performance-report`** (30 días de retención):
  - `bundle-size-report.json` — `{name, size, sizeLimit, passed}` por
    cada entrada configurada en `apps/web/package.json` (`"size-limit"`).
  - `.lighthouseci/*.report.html` — reporte visual completo de
    Lighthouse por cada corrida (3 por URL).
  - `.lighthouseci/manifest.json` — indica cuál corrida fue la
    representativa (mediana), usada para las aserciones de
    `apps/web/lighthouserc.json`.
- **Umbrales configurados** (ajustables en `apps/web/package.json` →
  `"size-limit"` y `apps/web/lighthouserc.json`, sin tocar el workflow):
  JS de cliente ≤ 350 KB gzip, CSS ≤ 50 KB gzip, Lighthouse Performance
  ≥ 90/100, LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 300ms (proxy de laboratorio
  para INP — Lighthouse no mide INP de campo real).
- **Alcance de la auditoría de Lighthouse**: solo `/login` y
  `/register` — son las únicas rutas públicas que no requieren una
  sesión real. El resto de las rutas del dashboard queda fuera de este
  gate automático (ver `DOCUMENTACION.md` sección 11.6).
