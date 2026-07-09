# ReadHub

Plataforma de publicación y lectura de artículos construida con Next.js 15 y Supabase.

---

## Arquitectura General

ReadHub sigue una arquitectura de tres capas sobre infraestructura serverless:

```
Browser / Cliente
      │
      ▼
Next.js 15 (App Router + React Server Components)
      │
      ▼
Supabase (Auth · PostgreSQL · Storage · RLS)
```

- **Frontend**: Next.js 15 con App Router. Las páginas públicas se renderizan en el servidor (RSC); las interacciones reactivas usan Client Components mínimos.
- **Backend**: Supabase gestiona autenticación, base de datos PostgreSQL y almacenamiento de archivos. No hay servidor Express ni API REST propia: los Server Actions y Route Handlers de Next.js acceden directamente a Supabase desde el servidor.
- **Seguridad**: Row Level Security (RLS) en cada tabla garantiza que las reglas de acceso se apliquen en la capa de base de datos, independientemente del cliente.

---

## Organización de Carpetas

```
readhub/
├── app/                        # App Router de Next.js 15
│   ├── globals.css             # Estilos globales (Tailwind v4 + shadcn tokens)
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Página raíz
│
├── components/
│   └── ui/                     # Componentes shadcn/ui (se añaden con npx shadcn add)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Cliente Supabase para el navegador
│   │   ├── server.ts           # Cliente Supabase para Server Components / Actions
│   │   └── middleware.ts       # Helper para refrescar sesión en middleware
│   ├── utils.ts                # Utilidad cn() para clases de Tailwind (shadcn)
│   ├── validators/             # Validadores de entrada (Prompt 3+)
│   └── constants/              # Constantes globales de la aplicación
│
├── types/
│   ├── database.ts             # Tipos tipados de la base de datos (Database interface)
│   ├── article.ts              # Tipos de Article
│   ├── user.ts                 # Tipos de Profile y UserRole
│   └── comment.ts              # Tipos de Comment
│
├── supabase/
│   ├── migrations/             # Migraciones SQL versionadas (Supabase CLI)
│   ├── schema.sql              # Esquema completo (referencia)
│   ├── policies.sql            # Políticas RLS (referencia)
│   └── seed.sql                # Datos de prueba
│
├── middleware.ts               # Middleware de Next.js — refresca sesión Supabase
├── components.json             # Configuración de shadcn/ui
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
└── .env.example
```

---

## Modelo Relacional

```
auth.users (Supabase Auth)
    │ 1
    │
    ▼ 1
profiles (id FK → auth.users.id)
    │ 1
    │
    ▼ N
articles
    │ 1
    ├──────────────────┬──────────────────┬──────────────────┐
    ▼ N                ▼ N                ▼ N                ▼ N
  views             likes             comments          favorites
```

| Tabla      | Propósito                                          |
|------------|----------------------------------------------------|
| profiles   | Extiende auth.users con rol, teléfono y fecha de nacimiento |
| articles   | Artículos publicados; `is_public` controla visibilidad |
| views      | Eventos de visualización (no contador, por evento) |
| likes      | Un like por usuario por artículo (UNIQUE constraint) |
| comments   | Comentarios de texto por artículo                 |
| favorites  | Artículos guardados por usuario                   |

---

## Decisiones de Diseño

**`profiles` vinculada a `auth.users`**
Se usa el mismo UUID como PK y FK hacia `auth.users`. Supabase gestiona el ciclo de vida del usuario; `profiles` extiende esa entidad con datos de negocio.

**`views` como tabla de eventos**
Se registra cada apertura como fila independiente en lugar de incrementar un contador. Esto permite consultas de estadísticas flexibles (vistas por día, por usuario, etc.) sin pérdida de granularidad.

**`likes` con restricción UNIQUE**
`UNIQUE(article_id, user_id)` a nivel de base de datos garantiza la regla de un like por usuario sin depender de la lógica de aplicación.

**Tipos TypeScript generados manualmente**
La interfaz `Database` en `types/database.ts` permite tipado genérico en los clientes de Supabase. En producción puede reemplazarse por la salida de `supabase gen types typescript`.

---

## Integración Next.js — Supabase

Existen tres clientes según el contexto de ejecución:

| Archivo                    | Contexto                          | Uso                                   |
|----------------------------|-----------------------------------|---------------------------------------|
| `lib/supabase/client.ts`   | Navegador (Client Components)     | Suscripciones en tiempo real, auth UI |
| `lib/supabase/server.ts`   | Servidor (RSC, Server Actions, Route Handlers) | Consultas de datos seguras  |
| `lib/supabase/middleware.ts` | Edge Middleware                 | Refresco de sesión en cada request    |

---

## Flujo de Autenticación

```
1. Usuario inicia sesión → Supabase Auth emite JWT + refresh token
2. Supabase SSR guarda los tokens en cookies HttpOnly
3. middleware.ts intercepta cada request → refresca la sesión si expira
4. Server Components acceden al usuario con supabase.auth.getUser()
5. RLS usa auth.uid() para aplicar políticas por fila
```

---

## Políticas RLS

RLS está habilitado en todas las tablas. Las políticas siguen el principio de mínimo privilegio:

| Tabla     | SELECT                              | INSERT              | UPDATE          | DELETE               |
|-----------|-------------------------------------|---------------------|-----------------|----------------------|
| profiles  | Solo el propio usuario              | —                   | Solo el propio  | —                    |
| articles  | Todos (solo públicos) / autor (todos) | Autenticado       | Solo el autor   | Solo el autor        |
| views     | Admin o autor del artículo          | Autenticado         | —               | —                    |
| likes     | —                                   | Autenticado         | —               | Solo el propietario  |
| comments  | Todos                               | Autenticado         | Solo el autor   | Autor o admin        |
| favorites | Solo el propietario                 | Solo el propietario | —               | Solo el propietario  |

---

## Estrategia de Escalabilidad

- **Índices** sobre `author_id` y `article_id` en todas las tablas relacionadas reducen el costo de los JOINs más frecuentes.
- **App Router + RSC** minimiza el JavaScript enviado al cliente; las consultas pesadas ocurren en el servidor.
- **Supabase Storage** desacopla el almacenamiento de archivos (PDFs, imágenes) de la base de datos; `articles` solo guarda la ruta.
- **RLS en la BD** elimina la necesidad de una capa de autorización en la aplicación, reduciendo superficie de ataque y complejidad.
- La estructura de carpetas permite añadir rutas, hooks y servicios en `app/`, `hooks/` y `lib/` sin refactorizar la base.

---

## Primeros Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales del proyecto Supabase

# 3. Ejecutar migraciones (requiere Supabase CLI)
supabase db push

# 4. Poblar con datos de prueba
supabase db execute --file supabase/seed.sql

# 5. Iniciar el servidor de desarrollo
npm run dev
```
