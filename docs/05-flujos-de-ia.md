# 05 · Flujos de inteligencia artificial generativa

Todos los flujos pasan por el mismo camino seguro:

```
app.js  ──>  window.NW.use('sample')  ──>  fetch('/api/gemini')
             (ai.js)                          │
                                              ▼
                                   server/server.js  (añade la clave)
                                              │
                                              ▼
                                        Google Gemini
```

El cliente **nunca** conoce la clave. Ver `07-seguridad.md`.

Modelo por defecto: `gemini-2.5-flash`. Se reintenta automáticamente ante errores
429/502/503 con espera exponencial (1.2 s, 2.4 s, 4.8 s).

---

## Flujo 1 · Generar CV a partir del perfil

- **Dónde:** módulo *CV* → botón "Generar CV con IA".
- **Entrada:** nombre, título, ubicación, contacto, resumen, experiencia, educación,
  habilidades y preferencias.
- **Instrucción clave:** *"usando SOLO la información proporcionada (no inventes datos
  ni fechas)"*; secciones fijas (PERFIL, EXPERIENCIA, EDUCACIÓN, HABILIDADES).
- **Salida:** texto plano del CV, que se guarda en `cv.text`.

## Flujo 2 · Adaptación del CV a una vacante

- **Dónde:** módulo *CV* → bloque "Adaptar el CV a una vacante".
- **Pasos:**
  1. **Extracción de requisitos (JSON):** el modelo devuelve
     `{"skills": ["...", "..."]}` (máximo 12, nombres cortos). Se guardan en
     `interview.vacancySkills`.
  2. **Comparación:** `NWAnalytics.skillGap()` clasifica los requisitos en
     *ya cubiertos* y *por reforzar*, comparándolos con `state.skills`.
  3. **Reescritura adaptada:** se pide un CV reordenado y enfocado al puesto,
     con la restricción de **no inventar experiencia, estudios ni habilidades**.
- **Salida:** un **área de texto editable** con la propuesta. La persona puede
  modificarla antes de pulsar "Usar este CV" (que es lo único que sobrescribe
  `cv.text`).
- **Por qué así:** cumple el requisito de permitir *revisar el resultado antes de
  utilizarlo*.

## Flujo 3 · Simulacro de entrevista completo

- **Dónde:** módulo *Entrevistas* → pestaña *Simulador*.
- **Paso A — generación de preguntas:** una sola llamada JSON devuelve
  `{"questions": [...]}` con preguntas variadas (experiencia, situaciones,
  motivación). El número lo elige la persona (3 o 5).
- **Paso B — retroalimentación por respuesta:** por cada respuesta, el modelo
  devuelve, con encabezados exactos, `FORTALEZAS`, `SUGERENCIAS` y
  `EJEMPLO DE RESPUESTA MEJORADA`.
- **Paso C — resumen final:** con la transcripción completa, el modelo devuelve
  `RESUMEN GENERAL`, `PUNTOS FUERTES`, `ÁREAS A PRACTICAR` y `CONSEJO FINAL`.
- **Persistencia:** toda la sesión (preguntas, respuestas, retroalimentación,
  dificultad y resumen) se guarda en `interview.sessions`.
- **Ética:** aviso visible de que la retroalimentación es de una IA con fines de
  práctica y **no es una decisión de contratación**.

## Flujo 4 · Explicación de vacantes

- **Dónde:** módulo *Entrevistas* → pestaña *Entender la vacante*.
- **Dos llamadas en paralelo** (`Promise.all`):
  - explicación en lenguaje simple con estructura fija
    (`RESUMEN DEL PUESTO`, `REQUISITOS CLAVE`, `LO QUE PROBABLEMENTE EVALUARÁN…`,
    `CONSEJOS DE PREPARACIÓN`);
  - extracción de requisitos en JSON para la métrica de brecha.
- **Salida:** explicación + etiquetas con los requisitos detectados.

## Flujo 5 · Redacción profesional

- **Dónde:** módulo *Reuniones* → "Redacción profesional".
- **Entrada:** un borrador escrito como salga.
- **Salida:** el mismo mensaje con tono claro y profesional, sin cambiar el
  contenido factual.

## Flujo 6 · Convertir instrucciones en pasos

- **Dónde:** módulo *Reuniones* → "Convertir instrucciones en pasos".
- **Salida (JSON):** `{"steps": ["paso 1", "paso 2"]}`.
- **Acción posterior:** botón para añadir todos los pasos al **checklist**.
- La reunión se guarda **una sola vez** al generar los pasos (se corrigió un
  duplicado previo).

## Flujo 7 · Plan de preparación de entrevistas

- **Dónde:** módulo *Entrevistas* → pestaña *Preparación* → "Generar mi plan".
- **Entrada:** título del perfil, puesto objetivo (`cv.role`), nombres de las
  habilidades y preferencias (vía `preferencesText()`).
- **Salida (texto, encabezados fijos):** `PRIORIDADES DE PREPARACIÓN`,
  `PREGUNTAS A ENSAYAR`, `CÓMO APROVECHAR TUS FORTALEZAS` y `AJUSTES Y LOGÍSTICA`.
- **Restricción:** se pide un plan claro "sin inventar datos".
- **Persistencia:** el último plan se guarda en `interview.prepPlan = {date, text}`.
- **Fallback:** la guía estática de la misma pestaña permanece disponible si la IA
  falla.

## Flujo 8 · Preparación de respuestas

- **Dónde:** módulo *Entrevistas* → pestaña *Preparar respuestas* → "Construir
  respuesta".
- **Entrada:** la pregunta (elegida de la lista o escrita) y las notas/experiencia
  de la persona; se añade el puesto objetivo como contexto.
- **Instrucción clave:** *"usa SOLO las notas del candidato; no inventes experiencia
  ni datos"*.
- **Salida (texto, encabezados fijos):** `ESTRUCTURA SUGERIDA (STAR)`,
  `BORRADOR DE RESPUESTA` y `CLAVES PARA PERSONALIZAR`.
- **Acción posterior:** el borrador queda en un área editable y se puede **guardar**,
  editar o eliminar; las respuestas viven en `interview.preparedAnswers`.

---

## Resumen de llamadas

| # | Flujo | Módulo | Formato | Persistencia |
|---|---|---|---|---|
| 1 | Generar CV | CV | texto | `cv.text` |
| 2 | Adaptar CV a vacante | CV | JSON + texto | `interview.vacancySkills`, `cv.text` (tras confirmar) |
| 3 | Simulacro | Entrevistas | JSON + texto (×N) + texto | `interview.sessions` |
| 4 | Explicar vacante | Entrevistas | texto + JSON | `interview.vacancyNotes`, `interview.vacancySkills` |
| 5 | Redacción profesional | Reuniones | texto | — |
| 6 | Instrucciones → pasos | Reuniones | JSON | `meetings.history`, `checklist` |
| 7 | Plan de preparación | Entrevistas | texto | `interview.prepPlan` |
| 8 | Preparar respuesta | Entrevistas | texto | `interview.preparedAnswers` |

## Robustez y errores

- Si la respuesta JSON llega con texto alrededor, `callGeminiJson()` extrae el
  primer bloque `{...}` antes de fallar.
- Si el servidor no está activo, el mensaje de error explica que hay que abrir la
  app desde `http://127.0.0.1:8787` y no con doble clic.
- Los estados de carga/error se muestran junto a cada botón (`setStatus`), no en
  ventanas emergentes.
- Ante un 401, el error se marca como `invalid_key` con una explicación concreta.

## Privacidad de los *prompts*

El servidor **no registra** el contenido de los *prompts*. Solo se guarda el texto
que la persona decide conservar localmente en su navegador.
