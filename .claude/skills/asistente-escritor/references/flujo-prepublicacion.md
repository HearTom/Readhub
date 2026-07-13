# Fase 4b — Checklist de prepublicación

Se activa cuando el usuario pregunta si su artículo "está listo" para
publicar, o pide una revisión final antes de subirlo.

Esta checklist combina dos tipos de criterios y **no debe mezclarlos sin
distinguirlos**: lo que la plataforma exige técnicamente para aceptar la
publicación, y lo que esta Skill recomienda por calidad editorial.

## Bloque 1 — Requisitos técnicos de la plataforma (recuérdalos, no los repares tú)

Estos ya los valida el formulario de carga de ReadHub (`/upload`). Esta
Skill no los ejecuta ni los fuerza — solo se asegura de que el usuario los
tenga presentes antes de subir:

- Título no vacío.
- Documento seleccionado, en formato TXT, DOCX o PDF.
- Imagen de portada seleccionada.
- Decisión consciente de visibilidad (`is_public`): ¿publicar de inmediato o
  dejar como borrador privado?

Si el usuario todavía no tiene alguno de estos listo, señálalo como
pendiente — no como "error", ya que puede resolverlo en el propio formulario.

## Bloque 2 — Calidad editorial (lo que esta Skill sí evalúa)

Recorre y confirma, reutilizando el trabajo ya hecho en fases previas de la
misma conversación en vez de repetirlo desde cero:

- [ ] **Redacción y claridad** (Fase 2) — ¿quedaron observaciones abiertas
      sin resolver?
- [ ] **Coherencia** (Fase 2) — ¿la conclusión se sostiene con lo
      desarrollado en el cuerpo?
- [ ] **Redundancias internas** (Fase 2) — ¿se eliminaron las detectadas?
- [ ] **Título, resumen y palabras clave** (Fase 3) — ¿están definidos y
      alineados entre sí?
- [ ] **Artículos relacionados** (Fase 4a) — ¿se revisó qué más existe en
      ReadHub sobre el tema?
- [ ] **Contradicciones** (Fase 4a) — si se detectaron, ¿el usuario las
      abordó (matizó, citó, o justificó la diferencia) o decidió
      conscientemente dejarlas así?

Si alguno de estos puntos no se trabajó en la conversación actual, no lo des
por aprobado — dile al usuario que ese punto sigue pendiente y ofrécete a
hacerlo ahora.

## Salida esperada

Un resumen corto en dos partes:

1. **Pendientes de plataforma** (Bloque 1) — lista simple.
2. **Estado editorial** (Bloque 2) — checklist con ✅/⚠️/❌ y, para cada ⚠️/❌,
   una acción concreta siguiente.

Cierra con un veredicto directo: "listo para publicar", "listo salvo por
[lo pendiente]", o "recomiendo resolver X antes de publicar" — el usuario
pidió una recomendación, no solo una lista de datos.
