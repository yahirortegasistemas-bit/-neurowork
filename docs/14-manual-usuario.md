# 14 · Manual de usuario (inicial)

Guía breve para usar NeuroWork sin conocimientos técnicos.

## 14.1 Requisitos

- Un navegador moderno (Chrome, Edge o Firefox).
- **Opcional:** Node.js 18+ si quieres usar la IA y el respaldo en base de datos.

## 14.2 Cómo abrir la aplicación

**Opción A — Recomendada (con servidor):**

1. Abre una terminal en la carpeta del proyecto.
2. Ejecuta:
   ```bash
   node server/server.js
   ```
   (o `npm start`)
3. Abre en el navegador: `http://127.0.0.1:8787`

**Opción B — Sin servidor:** abre `index.html` con doble clic. Funciona todo
**excepto** la IA (avisa con un mensaje y muestra cómo activarla).

> Para ver cambios recientes, haz una **recarga fuerte** (Ctrl + Shift + R).

## 14.3 Primeros pasos

1. **Perfil:** escribe tu nombre, título, contacto y un resumen. Agrega tu
   **experiencia** y **educación** con los botones correspondientes.
2. **Habilidades:** registra lo que sabes hacer y su nivel (1–5).
3. **Preferencias:** indica modalidad, horario y ajustes que te ayuden.

Cuanta más información completas, mejores son el CV y las prácticas de IA.

## 14.4 Generar tu currículum

1. Ve a **CV**.
2. Pulsa **Generar borrador** (usa tus datos; nunca inventa experiencia).
3. Elige un **diseño** entre cuatro: *Moderno*, *Ejecutivo*, *Clásico* o *Minimalista*.
4. Pulsa **Vista previa** para verlo tal como quedará.
5. Pulsa **Descargar con diseño** para obtener un documento `.doc` (Word).

**Adaptar a una vacante:** pega la oferta y pulsa *Analizar y adaptar*. Verás qué
requisitos ya cumples y cuáles reforzar; nada se sobrescribe hasta que pulses
"Usar este CV".

## 14.5 Preparar entrevistas

En **Entrevistas** hay cuatro pestañas:

- **Entender la vacante:** pega una oferta y la IA la explica en lenguaje simple.
- **Simulador:** la IA hace preguntas, tú respondes y recibes retroalimentación.
- **Preparación:** guía (siempre disponible) + plan personalizado con IA.
- **Preparar respuestas:** construye, guarda, edita y elimina respuestas.

## 14.6 Organización diaria

- **Reuniones:** convierte instrucciones en una lista de pasos.
- **Checklist:** tareas simples, opcionalmente diarias.
- **Objetivos:** metas con fecha y una barra de progreso.
- **Progreso:** gráficas de tu avance y descarga de un informe `.doc`.

## 14.7 Accesibilidad

- **Modo simple** (abajo a la izquierda): oculta elementos secundarios.
- **Modo claro/oscuro:** se ajusta a tu sistema; se puede forzar.
- Tipografía **Atkinson Hyperlegible** (diseñada para facilitar la lectura).

## 14.8 Tus datos

- Se guardan en **este navegador** (localStorage).
- Si el servidor está activo, se **respaldan** además en una base de datos local
  (`server/data/neurowork.db`). Ver `13-base-de-datos.md`.
- Para borrarlo todo, usa **Reiniciar datos** (abajo a la izquierda).

## 14.9 Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| "No se pudo conectar con el servidor" | La app se abrió como archivo | Ábrela en `http://127.0.0.1:8787` |
| La IA no responde | Falta la clave o el servidor | Revisa `server/.env` y reinicia el servidor |
| No veo mis cambios | Caché del service worker | Ctrl + Shift + R |
| Los acentos salen mal en un `.doc` | Codificación | El archivo se guarda en UTF-8; ábrelo con Word |
