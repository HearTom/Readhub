# ReadHub — Documentación Técnica del Proyecto

> **Estado:** Infraestructura base completada  
> **Fecha:** 2026-07-02  
> **Supabase:** `https://qpiewvxzeejknlqvggot.supabase.co`  
> **Migraciones aplicadas:** 2 / 2 ✅

---

## 1. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | ^15.3.0 |
| UI | React | ^19.0.0 |
| Lenguaje | TypeScript | ^5 |
| Estilos | Tailwind CSS | ^4.1.0 |
| Componentes | Shadcn/UI | new-york style |
| Backend / BaaS | Supabase | — |
| Base de datos | PostgreSQL (Supabase) | — |
| Autenticación | Supabase Auth | — |
| Almacenamiento | Supabase Storage | — |
| Cliente SSR | @supabase/ssr | ^0.5.2 |
| Cliente JS | @supabase/supabase-js | ^2.49.4 |

---

## 2. Estructura de Archivos

```
readhub/
│
├── app/                            # App Router de Next.js 15
│   ├── globals.css                 # Estilos globales + tokens Tailwind v4
│   ├── layout.tsx                  # Root layout (fuente Inter, metadata)
│   └── page.tsx                    # Página raíz placeholder
│
├── components/
│   └── ui/                         # Componentes Shadcn/UI (vacío — fase posterior)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Cliente Supabase para el navegador
│   │   ├── server.ts               # Cliente Supabase para el servidor
│   │   └── middleware.ts           # Helper de refresco de sesión
│   ├── utils.ts                    # Función cn() para Tailwind
│   ├── validators/
│   │   └── index.ts                # Placeholder (fase posterior)
│   └── constants/
│       └── index.ts                # APP_NAME, USER_ROLES
│
├── types/
│   ├── database.ts                 # Interfaz Database + tipos auxiliares
│   ├── user.ts                     # Profile, ProfileInsert, ProfileUpdate
│   ├── article.ts                  # Article, ArticleInsert, ArticleUpdate
│   └── comment.ts                  # Comment, CommentInsert, CommentUpdate
│
├── supabase/
│   ├── migrations/
│   │   ├── 20260702012314_create_initial_schema.sql   ✅ aplicada
│   │   └── 20260702013354_create_rls_policies.sql     ✅ aplicada
│   ├── schema.sql                  # Referencia del esquema completo
│   ├── policies.sql                # Referencia de políticas RLS
│   ├── seed.sql                    # Datos de prueba (3 usuarios, seed completo)
│   └── validate_rls.sql            # 36 tests de validación de políticas
│
├── middleware.ts                   # Middleware Next.js (intercepta requests)
├── components.json                 # Config Shadcn/UI
├── next.config.ts                  # Config Next.js
├── tsconfig.json                   # Config TypeScript (strict, path alias @/*)
├── postcss.config.mjs              # Config PostCSS (@tailwindcss/postcss)
├── package.json                    # Dependencias del proyecto
├── .env.example                    # Template de variables de entorno
├── .gitignore                      # Excluye .env, .next/, node_modules
└── README.md                       # Documentación de arquitectura
```

---

## 3. Módulos y Archivos

### 3.1 `app/` — Capa de Presentación

#### `app/layout.tsx`
Root layout de la aplicación. Se aplica a todas las rutas.

| Elemento | Valor |
|---|---|
| Fuente | Inter (Google Fonts, subset latin) |
| Lang | `es` |
| Title | ReadHub |
| Description | Plataforma de publicación y lectura de artículos |

```tsx
// Exporta
export const metadata: Metadata
export default function RootLayout({ children }): JSX.Element
```

#### `app/page.tsx`
Página raíz placeholder. Muestra el nombre de la aplicación centrado.

```tsx
// Exporta
export default function Home(): JSX.Element
```

#### `app/globals.css`
Estilos globales con Tailwind v4. Define:
- `@import "tailwindcss"` — punto de entrada de Tailwind v4
- `@custom-variant dark` — soporte para modo oscuro
- `@theme inline` — mapeo de variables CSS a tokens de Tailwind
- Variables CSS `:root` (modo claro) con colores en formato `oklch`
- Variables CSS `.dark` (modo oscuro)
- `@layer base` — estilos base (`border-border`, `bg-background`, `text-foreground`)

---

### 3.2 `middleware.ts` — Interceptor de Requests

Archivo en la raíz del proyecto. Next.js lo ejecuta en el Edge Runtime antes de cada request.

```ts
// Función exportada
export async function middleware(request: NextRequest): Promise<NextResponse>

// Configuración del matcher
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
```

**Responsabilidad:** Delega a `updateSession()` para refrescar el JWT de Supabase en cada request. Excluye archivos estáticos y de imagen.

---

### 3.3 `lib/supabase/` — Clientes de Supabase

Tres clientes diferenciados por contexto de ejecución:

#### `lib/supabase/client.ts`
Cliente para uso en **Client Components** (navegador).

```ts
// Función exportada
export function createClient(): SupabaseClient<Database>
```

- Usa `createBrowserClient` de `@supabase/ssr`
- Lee `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Tipado con la interfaz `Database`
- Uso: suscripciones realtime, autenticación en el cliente

#### `lib/supabase/server.ts`
Cliente para uso en **Server Components**, **Server Actions** y **Route Handlers**.

```ts
// Función exportada
export async function createClient(): Promise<SupabaseClient<Database>>
```

- Usa `createServerClient` de `@supabase/ssr`
- Lee las cookies del request con `next/headers` (API asíncrona de Next.js 15)
- Implementa `getAll()` y `setAll()` para sincronizar cookies de sesión
- El bloque `catch` en `setAll` ignora el error cuando se llama desde un Server Component (las cookies son de solo lectura en ese contexto)
- Uso: consultas de datos seguras del lado del servidor

#### `lib/supabase/middleware.ts`
Helper usado exclusivamente por `middleware.ts`.

```ts
// Función exportada
export async function updateSession(request: NextRequest): Promise<NextResponse>
```

- Crea un cliente Supabase con acceso a las cookies del request entrante
- Llama a `supabase.auth.getUser()` para refrescar el token JWT si está por vencer
- Propaga las cookies actualizadas tanto al request como a la response
- Garantiza que la sesión nunca expire silenciosamente en el servidor

---

### 3.4 `lib/utils.ts` — Utilidades

```ts
// Función exportada
export function cn(...inputs: ClassValue[]): string
```

Combina clases de Tailwind CSS resolviendo conflictos. Usa `clsx` para condicionales y `tailwind-merge` para deduplicar clases conflictantes (ej. `p-2` + `p-4` → `p-4`). Requerida por todos los componentes Shadcn/UI.

---

### 3.5 `lib/constants/index.ts` — Constantes Globales

```ts
// Exportaciones
export const APP_NAME = 'ReadHub'

export const USER_ROLES = {
  READER: 'reader',
  WRITER: 'writer',
  ADMIN: 'admin',
} as const
```

`USER_ROLES` está tipado con `as const` para inferencia de tipos literal en TypeScript.

---

### 3.6 `lib/validators/index.ts` — Validadores

Módulo placeholder. Actualmente vacío (`export {}`). Se implementará en fases posteriores para validar entradas de formularios y datos de API.

---

## 4. Tipos TypeScript

### 4.1 `types/user.ts`

```ts
type UserRole = 'reader' | 'writer' | 'admin'

interface Profile {
  id: string           // UUID — mismo que auth.users.id
  birth_date: string | null
  phone: string | null
  role: UserRole       // Default: 'reader'
  created_at: string   // ISO 8601
}

type ProfileInsert = Omit<Profile, 'created_at'>
type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>
```

### 4.2 `types/article.ts`

```ts
interface Article {
  id: string
  author_id: string    // FK → profiles.id
  title: string
  summary: string | null
  document_path: string | null   // Ruta en Supabase Storage
  image_path: string | null      // Ruta en Supabase Storage
  is_public: boolean             // Default: false
  created_at: string
}

type ArticleInsert = Omit<Article, 'id' | 'created_at'>
type ArticleUpdate = Partial<Omit<Article, 'id' | 'author_id' | 'created_at'>>
```

### 4.3 `types/comment.ts`

```ts
interface Comment {
  id: string
  article_id: string   // FK → articles.id
  user_id: string      // FK → auth.users.id
  comment: string
  created_at: string
}

type CommentInsert = Omit<Comment, 'id' | 'created_at'>
type CommentUpdate = Pick<Comment, 'comment'>   // Solo el texto es editable
```

### 4.4 `types/database.ts`

Tipos auxiliares definidos aquí (no tienen archivo propio):

```ts
type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

interface Like     { id, article_id, user_id, created_at }
interface View     { id, article_id, user_id, viewed_at  }
interface Favorite { id, article_id, user_id, created_at }
```

Interfaz principal que estructura el cliente de Supabase con tipado completo:

```ts
interface Database {
  public: {
    Tables: {
      profiles:  { Row: Profile,  Insert: ProfileInsert,  Update: ProfileUpdate  }
      articles:  { Row: Article,  Insert: ArticleInsert,  Update: ArticleUpdate  }
      comments:  { Row: Comment,  Insert: CommentInsert,  Update: CommentUpdate  }
      likes:     { Row: Like,     Insert: Omit<Like, 'id'|'created_at'>, Update: never }
      views:     { Row: View,     Insert: Omit<View, 'id'|'viewed_at'>,  Update: never }
      favorites: { Row: Favorite, Insert: Omit<Favorite, 'id'|'created_at'>, Update: never }
    }
    Enums: {
      user_role: 'reader' | 'writer' | 'admin'
    }
  }
}
```

> `Update: never` en `likes`, `views` y `favorites` refleja que estas tablas no tienen operación UPDATE definida en las políticas RLS.

---

## 5. Base de Datos (Supabase / PostgreSQL)

**Proyecto:** `qpiewvxzeejknlqvggot.supabase.co`  
**Migraciones aplicadas:** 2

### 5.1 Tablas

#### `public.profiles`
Extiende `auth.users` con una relación 1:1.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK · FK → `auth.users.id` ON DELETE CASCADE |
| `birth_date` | DATE | nullable |
| `phone` | TEXT | nullable |
| `role` | `user_role` | NOT NULL · DEFAULT `'reader'` |
| `created_at` | TIMESTAMPTZ | NOT NULL · DEFAULT NOW() |

#### `public.articles`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK · DEFAULT `gen_random_uuid()` |
| `author_id` | UUID | NOT NULL · FK → `profiles.id` ON DELETE CASCADE |
| `title` | TEXT | NOT NULL |
| `summary` | TEXT | nullable |
| `document_path` | TEXT | nullable · ruta en Storage |
| `image_path` | TEXT | nullable · ruta en Storage |
| `is_public` | BOOLEAN | NOT NULL · DEFAULT `false` |
| `created_at` | TIMESTAMPTZ | NOT NULL · DEFAULT NOW() |

#### `public.views`
Registro de eventos. Cada fila = una apertura.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK · DEFAULT `gen_random_uuid()` |
| `article_id` | UUID | NOT NULL · FK → `articles.id` ON DELETE CASCADE |
| `user_id` | UUID | NOT NULL · FK → `auth.users.id` ON DELETE CASCADE |
| `viewed_at` | TIMESTAMPTZ | NOT NULL · DEFAULT NOW() |

#### `public.likes`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK · DEFAULT `gen_random_uuid()` |
| `article_id` | UUID | NOT NULL · FK → `articles.id` ON DELETE CASCADE |
| `user_id` | UUID | NOT NULL · FK → `auth.users.id` ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL · DEFAULT NOW() |
| — | — | UNIQUE `(article_id, user_id)` |

#### `public.comments`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK · DEFAULT `gen_random_uuid()` |
| `article_id` | UUID | NOT NULL · FK → `articles.id` ON DELETE CASCADE |
| `user_id` | UUID | NOT NULL · FK → `auth.users.id` ON DELETE CASCADE |
| `comment` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL · DEFAULT NOW() |

#### `public.favorites`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK · DEFAULT `gen_random_uuid()` |
| `article_id` | UUID | NOT NULL · FK → `articles.id` ON DELETE CASCADE |
| `user_id` | UUID | NOT NULL · FK → `auth.users.id` ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL · DEFAULT NOW() |
| — | — | UNIQUE `(article_id, user_id)` |

---

### 5.2 Índices (10)

| Índice | Tabla | Columna |
|---|---|---|
| `idx_articles_author_id` | articles | `author_id` |
| `idx_articles_is_public` | articles | `is_public` |
| `idx_views_article_id` | views | `article_id` |
| `idx_views_user_id` | views | `user_id` |
| `idx_likes_article_id` | likes | `article_id` |
| `idx_likes_user_id` | likes | `user_id` |
| `idx_comments_article_id` | comments | `article_id` |
| `idx_comments_user_id` | comments | `user_id` |
| `idx_favorites_article_id` | favorites | `article_id` |
| `idx_favorites_user_id` | favorites | `user_id` |

---

### 5.3 Funciones de Base de Datos

#### `public.handle_new_user()` — Trigger Function

```sql
RETURNS TRIGGER | LANGUAGE plpgsql | SECURITY DEFINER
```

Se ejecuta automáticamente al insertar un registro en `auth.users`. Crea la fila correspondiente en `public.profiles` con `role = 'reader'`. `SECURITY DEFINER` le permite escribir en `profiles` sin importar el contexto RLS.

**Trigger asociado:** `on_auth_user_created` — AFTER INSERT ON `auth.users` FOR EACH ROW

#### `public.is_admin()` — Helper Function

```sql
RETURNS BOOLEAN | LANGUAGE sql | SECURITY DEFINER | STABLE
```

Devuelve `TRUE` si el usuario autenticado (`auth.uid()`) tiene `role = 'admin'` en `profiles`. `SECURITY DEFINER` evita recursión infinita al consultar `profiles` desde dentro de las políticas RLS de esa misma tabla. `STABLE` permite que PostgreSQL la cachee dentro de una consulta.

**Usada en las políticas:**
- `comments_delete` — `auth.uid() = user_id OR public.is_admin()`
- `views_select` — `public.is_admin() OR EXISTS (...)`

---

### 5.4 Políticas RLS (17 políticas)

RLS habilitado en las 6 tablas. Todas las políticas usan `auth.uid()` como referencia de identidad.

| Tabla | Política | Operación | Condición |
|---|---|---|---|
| profiles | `profiles_select_own` | SELECT | `auth.uid() = id` |
| profiles | `profiles_update_own` | UPDATE | `auth.uid() = id` |
| articles | `articles_select` | SELECT | `is_public = TRUE OR auth.uid() = author_id` |
| articles | `articles_insert` | INSERT | `auth.uid() = author_id` (TO authenticated) |
| articles | `articles_update` | UPDATE | `auth.uid() = author_id` |
| articles | `articles_delete` | DELETE | `auth.uid() = author_id` |
| views | `views_select` | SELECT | `is_admin() OR autor del artículo` |
| views | `views_insert` | INSERT | `auth.uid() = user_id` (TO authenticated) |
| likes | `likes_select` | SELECT | `TRUE` (público) |
| likes | `likes_insert` | INSERT | `auth.uid() = user_id` (TO authenticated) |
| likes | `likes_delete` | DELETE | `auth.uid() = user_id` |
| comments | `comments_select` | SELECT | `TRUE` (público) |
| comments | `comments_insert` | INSERT | `auth.uid() = user_id` (TO authenticated) |
| comments | `comments_update` | UPDATE | `auth.uid() = user_id` |
| comments | `comments_delete` | DELETE | `auth.uid() = user_id OR is_admin()` |
| favorites | `favorites_select` | SELECT | `auth.uid() = user_id` |
| favorites | `favorites_insert` | INSERT | `auth.uid() = user_id` (TO authenticated) |
| favorites | `favorites_delete` | DELETE | `auth.uid() = user_id` |

---

### 5.5 Datos de Prueba (`seed.sql`)

Usuarios disponibles (contraseña: `ReadHub2024!`):

| Email | Role | UUID |
|---|---|---|
| `reader@readhub.com` | reader | `00000000-…-0001` |
| `writer@readhub.com` | writer | `00000000-…-0002` |
| `admin@readhub.com` | admin | `00000000-…-0003` |

Estado actual de la base de datos:

| Tabla | Filas |
|---|---|
| profiles | 3 |
| articles | 3 (2 públicos · 1 privado) |
| views | 5 |
| likes | 3 |
| comments | 4 |
| favorites | 2 |

---

## 6. Configuraciones

### `next.config.ts`
Configuración mínima de Next.js. Sin modificaciones al comportamiento por defecto. Punto de extensión para `images.remotePatterns`, `headers`, y otras opciones cuando se implementen funcionalidades.

### `tsconfig.json`
| Opción clave | Valor |
|---|---|
| `strict` | `true` |
| `moduleResolution` | `bundler` |
| `jsx` | `preserve` |
| `paths` | `@/* → ./*` |
| `target` | `ES2017` |

### `postcss.config.mjs`
Configura `@tailwindcss/postcss` como único plugin. Reemplaza el plugin `tailwindcss` de versiones anteriores.

### `components.json` (Shadcn/UI)
| Opción | Valor |
|---|---|
| `style` | `new-york` |
| `rsc` | `true` |
| `tailwind.config` | `""` (Tailwind v4, sin archivo de config) |
| `tailwind.css` | `app/globals.css` |
| `tailwind.baseColor` | `zinc` |
| `aliases.ui` | `@/components/ui` |
| `aliases.utils` | `@/lib/utils` |

### `.env.example`
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 7. Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo con Turbopack
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # ESLint
```

---

## 8. Validación de Políticas RLS

El archivo `supabase/validate_rls.sql` contiene **36 tests** organizados por tabla.

| Grupo | Tests | Escenarios |
|---|---|---|
| PROFILES | P1–P5 | Anon bloqueado · propietario puede leer/editar · acceso ajeno denegado |
| ARTICLES | A1–A10 | Visibilidad pública/privada · INSERT/UPDATE/DELETE solo por autor · suplantación bloqueada |
| VIEWS | V1–V5 | Admin ve todo · autor ve sus artículos · reader bloqueado · user_id ajeno rechazado |
| LIKES | L1–L4 | Lectura pública · INSERT propio · DELETE solo propietario |
| COMMENTS | C1–C7 | Lectura pública · CRUD propio · admin puede borrar cualquiera |
| FAVORITES | F1–F5 | Aislamiento total por propietario |

Para ejecutarlo: `Supabase Dashboard → SQL Editor → pegar validate_rls.sql → Run`

El script revierte todos los cambios al finalizar (rollback intencional).

---

## 9. Estado de Implementación

### Completado ✅
- [x] Proyecto Next.js 15 configurado (TypeScript, Tailwind v4, Shadcn)
- [x] Clientes Supabase (browser, server, middleware)
- [x] Tipos TypeScript de toda la base de datos
- [x] Middleware de sesión
- [x] Constantes y estructura de módulos
- [x] Esquema SQL completo (6 tablas, 10 índices, 1 enum)
- [x] Trigger de auto-creación de perfil
- [x] 17 políticas RLS en 6 tablas
- [x] 2 funciones de base de datos (`handle_new_user`, `is_admin`)
- [x] Datos de prueba (3 usuarios, seed completo)
- [x] 36 scripts de validación de RLS
- [x] Migraciones aplicadas en Supabase

### Pendiente (fases posteriores) 🔜
- [ ] Completar variables de entorno en `.env.local`
- [ ] Instalar dependencias (`npm install`)
- [ ] Pantallas de autenticación (login, registro)
- [ ] CRUD de artículos (crear, editar, publicar)
- [ ] Endpoints API (Route Handlers)
- [ ] Componentes UI (Shadcn: Button, Card, Form, etc.)
- [ ] Hooks de datos (useArticles, useProfile, etc.)
- [ ] Integración con Supabase Storage (subida de archivos)
- [ ] Dashboard de escritor (estadísticas, vistas)
- [ ] Generación de tipos desde Supabase (`supabase gen types typescript`)
- [ ] Configurar buckets de Storage para documentos e imágenes
