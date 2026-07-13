# Ejemplos de uso

Ejemplos ilustrativos del tipo de interacción esperado. No son transcripciones
literales a reproducir — muestran el nivel de especificidad y el flujo de
razonamiento esperado.

## Ejemplo 1 — Planificación desde cero

**Usuario:** "Quiero escribir un artículo sobre por qué usamos RLS en
Supabase en vez de autorización a nivel de aplicación, pero no sé por dónde
empezar."

**Comportamiento esperado:**
1. Se activa la Skill (planificación, sin borrador aún) →
   `references/flujo-planificacion.md`.
2. Claude pregunta en una sola tanda: tipo de artículo (parece técnico),
   audiencia (¿desarrolladores que ya conocen Supabase, o principiantes?),
   y si ya tiene notas o resultados concretos (p. ej. comparación de
   rendimiento).
3. Con las respuestas, entrega un esquema tipo "Técnico": Contexto/problema
   → Prerrequisitos → Desarrollo paso a paso (RLS vs. autorización en app) →
   Ejemplo aplicado (políticas reales del proyecto) → Errores comunes →
   Conclusión, con 1-2 líneas de guía por sección.
4. Antes de cerrar, sigue la cadena de `herramientas-mcp.md` para revisar si
   ya hay algo similar en ReadHub (por ejemplo, vía `mcp__supabase__execute_sql`
   con `ILIKE` sobre "RLS" en `title`/`summary`) y lo reporta.

## Ejemplo 2 — Mejora de redacción sobre un párrafo concreto

**Usuario pega:**
> "Es importante mencionar que en el presente artículo se busca analizar,
> de manera detallada y exhaustiva, el impacto que tiene la utilización de
> políticas RLS en el rendimiento general del sistema, lo cual será
> abordado a lo largo de las siguientes secciones del documento."

**Comportamiento esperado** (`references/flujo-redaccion.md`):

- Señala la muletilla inicial ("Es importante mencionar que... se busca
  analizar") y la propone eliminar.
- Señala que la oración empaqueta varias ideas (qué se analiza, cómo, y que
  se abordará después) y sugiere dividirla.
- Entrega reescritura concreta, por ejemplo: *"Este artículo mide el impacto
  de las políticas RLS en el rendimiento del sistema."* — y explica en una
  línea por qué es más directa (sujeto y verbo al inicio, sin metadiscurso).
- No reescribe el resto del artículo sin que se lo pidan.

## Ejemplo 3 — Títulos, resumen, palabras clave y verificación de duplicados

**Usuario:** "Ya terminé el artículo sobre RLS vs. autorización en app.
Dame título, resumen y palabras clave, y dime si ya hay algo parecido
publicado."

**Comportamiento esperado:**
1. `references/flujo-metadatos.md` → 3-5 títulos con enfoques distintos,
   resumen de 2-4 oraciones pensado para la tarjeta de artículo, 5-8
   palabras clave.
2. Verifica consistencia entre los tres antes de entregarlos.
3. `references/flujo-investigacion.md` → sigue la cadena de herramientas:
   intenta `ToolSearch` por herramientas `mcp__readhub__*`; si no existen,
   usa `mcp__supabase__execute_sql` (solo lectura) para buscar por
   coincidencia léxica en `articles.title`/`summary`; si tampoco es viable,
   sugiere preguntar en `/assistant`.
4. Si encuentra un artículo cercano, lo reporta con título y por qué se
   parece — sin decirle al usuario que no publique, sugiriendo cómo
   diferenciar el enfoque.

## Ejemplo 4 — Checklist final de prepublicación

**Usuario:** "Creo que ya está listo para publicar, ¿lo revisas?"

**Comportamiento esperado** (`references/flujo-prepublicacion.md`):

- Si en la conversación actual ya se trabajaron redacción, metadatos e
  investigación (Ejemplos 2 y 3), los reutiliza — no vuelve a analizarlos
  desde cero.
- Reporta Bloque 1 (título/documento/imagen/visibilidad) como pendientes de
  confirmar en el formulario de `/upload`, sin intentar validarlos él mismo.
- Reporta Bloque 2 como checklist ✅/⚠️/❌: por ejemplo, ✅ redacción, ✅
  metadatos, ⚠️ contradicciones ("no se llegó a revisar en esta
  conversación — ¿quieres que lo haga ahora?").
- Cierra con un veredicto explícito: "listo salvo por revisar
  contradicciones con artículos existentes" en vez de una respuesta
  ambigua.

## Cuándo la Skill correctamente NO se activa

**Usuario:** "¿Qué dice el artículo de fotosíntesis que subió Ana la semana
pasada?"

Esto es una pregunta de **lectura** sobre contenido ya publicado, no sobre
un artículo propio en construcción — corresponde al Asistente IA existente
de ReadHub (`/assistant`), no a esta Skill. La respuesta correcta es
señalar esa herramienta, no intentar resolverlo aquí.
