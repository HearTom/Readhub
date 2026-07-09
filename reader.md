## Este documento contiene la especificación completa del laboratorio. Léelo completamente antes de generar cualquier código. No hagas suposiciones fuera de lo especificado. 

**Primer prompt:** "Lee la especificación completa y confírmame que entiendes el alcance del laboratorio. No generes código todavía."  
**Segundo prompt:** "Genera la estructura del proyecto y la configuración inicial."  
**Tercer prompt:** "Genera el esquema de la base de datos y las migraciones."  
**Cuarto prompt:** "Genera las políticas RLS."  
**Quinto prompt:** "Genera el `seed.sql`."  
**Sexto prompt:** "Genera los scripts para validar las políticas RLS."

## **LABORATORIO**

Claude deberá generar automáticamente:

* Proyecto Next.js 15\.  
* Configuración de Supabase.  
* Variables de entorno.  
* Arquitectura escalable.  
* Migraciones SQL.  
* Esquema relacional.  
* Índices.  
* Restricciones.  
* Políticas RLS.  
* Seed.sql.  
* Usuarios de prueba.  
* Scripts para validar las políticas RLS.  
* Documentación de la arquitectura.

# **Tecnologías Base**

* Next.js 15 (App Router)  
* React 19  
* TypeScript  
* TailwindCSS  
* Shadcn/UI  
* Supabase  
* PostgreSQL  
* Supabase Auth  
* Supabase Storage

Claude debería implementar automáticamente : 

Crear proyecto Next.js

Configurar TypeScript

Instalar Tailwind

Instalar Shadcn

Configurar Supabase

Configurar variables de entorno

Crear estructura de carpetas

Crear esquema SQL

Crear migraciones

Crear tablas

Crear índices

Crear RLS

Crear usuarios de prueba

Crear seed.sql

Crear políticas

Probar políticas

Documentar arquitectura 

---

# **Arquitectura General**

readhub/

│

├── app/

│

├── lib/

│   ├── supabase/

│   │   ├── client.ts

│   │   ├── server.ts

│   │   └── middleware.ts

│   │

│   ├── validators/

│   ├── utils/

│   └── constants/

│

├── types/

│   ├── article.ts

│   ├── user.ts

│   ├── comment.ts

│   └── database.ts

│

├── supabase/

│   ├── migrations/

│   ├── seed.sql

│   ├── schema.sql

│   └── policies.sql

│

└── [README.md](http://README.md)

# **3\. Diseño de la Base de Datos**

# **Descripción de las Entidades**

## **PROFILES**

Representa todos los usuarios registrados en la plataforma.

Cada usuario podrá autenticarse y publicar contenido.

### **Campos**

| Campo | Tipo | Descripción |
| ----- | ----- | ----- |
| id | UUID  | Identificador único |
| birth\_date | DATE | Fecha de nacimiento |
| phone | TEXT | Número celular |
| role | TEXT | reader, writer o admin |
| created\_at | TIMESTAMP | Fecha de creación |

La tabla profiles deberá tener una relación uno a uno con auth.users, utilizando el mismo UUID como clave primaria y clave foránea.  
---

## **ARTICLES**

Representa cada artículo publicado por un usuario.

Un usuario puede publicar múltiples artículos.

### **Campos**

| Campo | Tipo | Descripción |
| ----- | ----- | ----- |
| id | UUID  | Identificador |
| author\_id | UUID  | Usuario propietario |
| title | TEXT | Título |
| summary | TEXT | Vista previa |
| document\_path | TEXT | Ruta del archivo |
| image\_path | TEXT | Ruta de la imagen |
| created\_at | TIMESTAMP | Fecha de publicación |
| is\_public | BOOLEAN | visibilidad de articulo |

---

## **VIEWS**

Registra cada apertura de un artículo.

No almacena un contador.

Cada visualización representa un evento independiente.

Esto permitirá obtener estadísticas mediante consultas SQL.

### **Campos**

| Campo | Tipo |
| ----- | ----- |
| id | UUID  |
| article\_id | UUID  |
| user\_id | UUID  |
| viewed\_at | TIMESTAMP |

---

## **LIKES**

Representa cada "Me gusta" realizado por un usuario.

Un usuario solamente podrá registrar un like por artículo.

### **Campos**

| Campo | Tipo |
| ----- | ----- |
| id | UUID  |
| article\_id | UUID  |
| user\_id | UUID  |
| created\_at | TIMESTAMP |

---

## **COMMENTS**

Representa los comentarios realizados sobre un artículo.

### **Campos**

| Campo | Tipo |
| ----- | ----- |
| id | UUID  |
| article\_id | UUID  |
| user\_id | UUID  |
| comment | TEXT |
| created\_at | TIMESTAMP |

---

## **FAVORITES**

Representa los artículos guardados por un usuario.

Aunque esta funcionalidad podrá implementarse en fases posteriores, la estructura queda preparada desde el inicio.

### **Campos**

| Campo | Tipo |
| ----- | ----- |
| id | UUID  |
| article\_id | UUID  |
| user\_id | UUID  |
| created\_at | TIMESTAMP |

---

# **Relaciones**

## **Profiles → Artículos**

Un usuario puede publicar múltiples artículos.

Relación:

1 \---- N

---

## **Artículo → Visualizaciones**

Cada artículo puede tener muchas visualizaciones.

Cada visualización pertenece únicamente a un artículo.

1 \---- N

---

## **Artículo → Likes**

Cada artículo puede recibir múltiples "Me gusta".

Cada like pertenece a un único artículo y a un único usuario.

1 \---- N

---

## **Artículo → Comentarios**

Cada artículo puede recibir múltiples comentarios.

Cada comentario pertenece a un artículo y a un usuario.

1 \---- N

---

## **Profiles→ Comentarios**

Un usuario puede comentar múltiples artículos.

1 \---- N

---

# **POLITICAS DE SEGURIDAD RLS** 

## **Articles**

SELECT

Todos pueden leer artículos públicos.

INSERT

Solo usuarios autenticados.

UPDATE

Solo el autor.

DELETE

Solo el autor.  
---

## **Comments**

Leer todos.

Crear autenticado.

Editar solo autor.

Eliminar autor o admin.  
---

## **Likes**

Insert

Solo autenticado.

DELETE

Solo propietario.

UNIQUE(article\_id,user\_id)  
---

## **Views**

* INSERT: usuarios autenticados.  
* SELECT: solo administradores o el autor del artículo (según el objetivo del curso).

---

## **Favorites**

* SELECT: solo el propietario.  
* INSERT: solo el propietario.  
* DELETE: solo el propietario.

---

## **Profiles**

Cada usuario únicamente puede ver y modificar su perfil.

# **Restricciones**

La implementación deberá respetar las siguientes reglas:

* El correo electrónico deberá ser único.  
* Todo artículo deberá pertenecer a un usuario existente.  
* No podrán existir comentarios asociados a artículos inexistentes.  
* No podrán existir likes asociados a artículos inexistentes.  
* No podrán existir visualizaciones asociadas a artículos inexistentes.  
* Un usuario no podrá registrar múltiples likes sobre el mismo artículo.  
* Todas las claves foráneas deberán garantizar integridad referencial.

---

# **Índices Recomendados**

Para mejorar el rendimiento de las consultas, deberán crearse índices sobre los siguientes campos:

* articles.author\_id  
* views.article\_id  
* likes.article\_id  
* comments.article\_id  
* favorites.article\_id

# **8\. Entregables**

Al finalizar el laboratorio, Claude deberá generar todos los archivos, configuraciones y documentación necesarios para dejar preparado un proyecto base escalable utilizando **Next.js 15** y **Supabase**.

## **8.1 Estructura del Proyecto**

Deberá generar la estructura completa del proyecto con la organización de carpetas definida para la arquitectura propuesta.

La estructura deberá incluir la configuración inicial de:

* Next.js 15 (App Router)  
* TypeScript  
* TailwindCSS  
* Shadcn/UI  
* Supabase  
* Variables de entorno  
* Organización de carpetas

---

## **8.2 Configuración de Supabase**

Deberá entregar la configuración necesaria para conectar el proyecto con Supabase.

Como mínimo deberá incluir:

* Cliente de Supabase para el navegador.  
* Cliente de Supabase para el servidor.  
* Configuración de autenticación.  
* Variables de entorno requeridas.  
* Archivo `.env.example` con todas las variables necesarias.

---

## **8.3 Base de Datos**

Deberá generar el esquema completo de la base de datos.

Como mínimo deberá incluir:

* Creación de tablas.  
* Relaciones.  
* Claves primarias.  
* Claves foráneas.  
* Restricciones.  
* Índices recomendados.  
* Tipos de datos adecuados.  
* Integración con `auth.users` mediante la tabla `profiles`.

---

## **8.4 Migraciones**

Deberá generar las migraciones necesarias para construir completamente la base de datos desde cero.

Las migraciones deberán permitir recrear la estructura completa únicamente ejecutando las migraciones de Supabase.

---

## **8.5 Seguridad RLS**

Deberá implementar todas las políticas Row Level Security necesarias para garantizar la seguridad de la información.

Las políticas deberán cubrir todas las tablas del proyecto.

Como mínimo:

* Profiles  
* Articles  
* Comments  
* Likes  
* Views  
* Favorites

---

## **8.6 Datos de Prueba**

Deberá generar un archivo `seed.sql` que permita poblar automáticamente la base de datos.

Los datos deberán incluir como mínimo:

* Usuarios de prueba.  
* Artículos.  
* Comentarios.  
* Likes.  
* Visualizaciones.  
* Favoritos.

Los datos deberán respetar todas las restricciones y relaciones definidas.

---

## **8.7 Validación de Políticas RLS**

Deberá generar scripts SQL o instrucciones que permitan comprobar el correcto funcionamiento de las políticas RLS.

Las pruebas deberán validar escenarios como:

* Usuario autenticado.  
* Usuario no autenticado.  
* Autor del recurso.  
* Usuario sin permisos.  
* Administrador.

Cada prueba deberá indicar el resultado esperado.

---

## **8.8 Documentación Técnica**

Deberá generar una documentación técnica que explique:

* Arquitectura general del proyecto.  
* Organización de carpetas.  
* Modelo relacional.  
* Decisiones de diseño.  
* Integración entre Next.js y Supabase.  
* Flujo de autenticación.  
* Estrategia de escalabilidad.  
* Descripción de las políticas RLS implementadas.

---

## **8.9 Resultado Esperado**

Al finalizar el laboratorio deberá existir un proyecto completamente funcional en su fase de infraestructura, listo para comenzar el desarrollo de funcionalidades en sesiones posteriores.

El proyecto deberá contar con:

* Arquitectura escalable.  
* Configuración completa de Next.js y Supabase.  
* Base de datos implementada.  
* Migraciones funcionales.  
* Políticas RLS configuradas.  
* Datos de prueba disponibles.  
* Documentación técnica completa.

## **8.10 Límites:**

Este laboratorio tiene como objetivo construir únicamente la infraestructura base del proyecto.

Por lo tanto, **no deberá implementar funcionalidades de negocio ni interfaces de usuario completas**.

No deberán desarrollarse:

* Pantallas de autenticación.  
* Formularios de registro o inicio de sesión.  
* CRUD de artículos.  
* Endpoints de la API.  
* Componentes de interfaz específicos del dominio.  
* Hooks personalizados para lógica de negocio.  
* Servicios de acceso a datos.  
* Funcionalidades de carga de archivos.  
* Dashboards o páginas funcionales.

El resultado esperado es un proyecto preparado para iniciar el desarrollo de estas funcionalidades en sesiones posteriores.