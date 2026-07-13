# Fase 4a — Artículos relacionados, comparación y contradicciones

Se activa cuando el usuario pregunta "¿ya existe algo parecido en ReadHub?",
"¿cómo se compara mi artículo con otros publicados?", o "¿hay algo que
contradiga lo que estoy escribiendo?".

Toda búsqueda de contenido existente en esta fase sigue la cadena de
prioridad de `references/herramientas-mcp.md`. No la repitas aquí — este
archivo asume que ya obtuviste candidatos (por el nivel que sea) y se enfoca
en qué hacer con ellos.

## Paso 1 — Extraer las afirmaciones clave del artículo del usuario

Antes de buscar, resume en 3-6 bullets las afirmaciones o resultados
centrales del artículo del usuario. Esto define qué comparar, y evita
búsquedas vagas por el tema general.

## Paso 2 — Buscar candidatos

Ejecuta la búsqueda (vía la cadena de herramientas) usando tanto el tema
general como 1-2 afirmaciones específicas del Paso 1 — una búsqueda solo por
tema general trae demasiado ruido para detectar contradicciones puntuales.

## Paso 3 — Artículos relacionados (listado simple)

Presenta cada candidato con: título, autor (si está disponible), y una línea
de por qué es relevante. Ordena por relevancia, no por fecha.

## Paso 4 — Comparación

Cuando el usuario pida comparación (no solo listado), arma una tabla:

| Aspecto | Artículo del usuario | Artículo relacionado |
|---|---|---|
| Enfoque/tesis principal | ... | ... |
| Metodología o evidencia | ... | ... |
| Conclusión | ... | ... |

Completa solo las filas donde tengas evidencia real del artículo
relacionado (del fragmento recuperado) — no rellenes con suposiciones.

## Paso 5 — Detección de contradicciones

Marca como contradicción únicamente cuando dos fuentes afirman cosas
mutuamente excluyentes sobre el mismo punto (no toda diferencia de énfasis
es una contradicción). Para cada contradicción detectada:

- cita el fragmento del artículo del usuario;
- cita el fragmento de la fuente en conflicto, con su título como
  referencia (formato `[Fuente N] "Título del artículo"`, igual que usa
  `context-builder.service.ts` en `/assistant`, para que el usuario
  reconozca el mismo lenguaje de citación en toda la app);
- no falles automáticamente a favor de ninguna de las dos partes — dile al
  usuario que existe una discrepancia y que decida cómo abordarla
  (matizar su afirmación, citar la fuente en conflicto, o justificar por
  qué su posición difiere).

## Cuándo no hay candidatos

Si la búsqueda (en cualquier nivel de la cadena) no devuelve nada relevante,
dilo explícitamente: "no encontré artículos relacionados en ReadHub sobre
esto" es una respuesta válida y útil — no la reemplaces por resultados poco
relevantes solo para tener algo que mostrar.
