# 03 · Arquitectura

## 3.1 Vista general

```
┌──────────────────────────────── Navegador ────────────────────────────────┐
│                                                                           │
│  index.html  ──> styles.css                                               │
│      │                                                                    │
│      ├─ ai.js           Puente de IA  ──► fetch('/api/gemini')            │
│      ├─ analytics.js    Minería de datos + gráficas SVG (funciones puras) │
│      └─ app.js          Estado, render y eventos de todos los módulos     │
│                                                                           │
│  localStorage  ◄──► estado completo de la persona (persistencia local)    │
│  Service Worker (sw.js)  ──► caché de estáticos; /api/* NUNCA se cachea   │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │ HTTP (solo /api/*)
┌───────────────────────────────────▼───────────────────────────────────────┐
│                    server/server.js  (Node, sin dependencias)             │
│                                                                           │
│  · Sirve los archivos estáticos del proyecto                             │
│  · POST /api/gemini   -> añade la clave desde server/.env y llama a       │
│                          Google Generative Language API                  │
│  · GET/PUT/DELETE /api/state -> respaldo del estado en la base de datos   │
│                          relacional (SQLite, server/db.js)               │
│  · GET  /api/db       -> esquema y conteo de filas por tabla              │
│  · GET  /api/health   -> diagnóstico (nunca expone la clave)             │
│  · Límite de peticiones (30/min por IP) y de tamaño (256 KB / 4 MB)      │
│                                                                           │
│                       server/db.js  ◄──►  SQLite (node:sqlite)            │
│                       server/data/neurowork.db  (archivo local)           │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │ HTTPS + x-goog-api-key
                                    ▼
                        Google Gemini (generativelanguage.googleapis.com)
```

La persistencia es **doble y opcional**:

1. **localStorage** (siempre): funciona sin servidor y sin conexión.
2. **SQLite** (si el servidor está activo): respaldo relacional en
   `server/data/neurowork.db`, en el propio equipo. Ver `13-base-de-datos.md`.

## 3.2 Decisión clave: la clave de API no vive en el navegador

Todo lo que se sirve al navegador (`index.html`, `app.js`, `ai.js`, `analytics.js`)
es **público por definición**. Si una API key estuviera ahí, cualquiera podría leerla
y usarla con cargo a la persona propietaria.

Por eso existe `server/server.js`: un proxy mínimo que:

1. Guarda la clave en `server/.env` (que **no** se sirve y está en `.gitignore`).
2. Añade la clave a la petición saliente, en el servidor.
3. Devuelve al navegador solo el texto generado.

Comparación descartada: el enfoque "trae tu propia clave" (que la persona escriba su
clave en el navegador) también es seguro frente a terceros, pero peor para el usuario
final porque obliga a cada persona a crear y pegar una clave. Se eligió el proxy.

## 3.3 Organización del código del cliente

`app.js` sigue un patrón sencillo de un solo sentido:

```
render()  ──>  elige la función de render del módulo actual (current)
          ──>  escribe el HTML en #content
          ──>  wireCurrentSection() conecta los eventos de esa sección
```

- **Estado:** un único objeto `state` (módulo global en el IIFE).
- **Persistencia:** `saveState()` serializa `state` a `localStorage`
  bajo la clave `neurowork_state_v1`.
- **Snapshots:** en cada guardado se actualiza un registro diario
  (`state.snapshots`) que permite dibujar tendencias en el tiempo.
- **Actividad:** `logActivity(tipo, detalle)` deja traza de cada acción relevante
  (máximo 60 entradas), que alimenta la minería de datos.

`analytics.js` es deliberadamente **puro**: recibe el estado y devuelve datos o
cadenas SVG. No toca el DOM ni el almacenamiento. Esto permite probarlo con Node.

## 3.4 Módulos y responsabilidades

| Archivo | Responsabilidad | ¿Tiene lógica de negocio? |
|---|---|---|
| `index.html` | Estructura de la app (shell) | No |
| `styles.css` | Presentación, tema claro/oscuro, responsive | No |
| `ai.js` | Llamadas al proxy, generación de documentos .doc | Mínima |
| `analytics.js` | Agregación de datos, gráficas, informe | Sí (funciones puras) |
| `app.js` | Estado, render, eventos, flujos de IA | Sí |
| `sw.js` | Caché offline | No |
| `server/server.js` | Proxy + estáticos + API de estado + seguridad | Sí (proxy) |
| `server/db.js` | Esquema relacional y persistencia SQLite | Sí (datos) |

## 3.5 Formato de datos (`state`)

```js
{
  profile:   { name, title, location, email, phone, summary,
               experience:[{id,role,company,period,desc}],
               education:[{id,degree,school,period}] },
  skills:    [{ id, name, category, level /* 1..5 */ }],
  cv:        { text, role, updated, template },
  interview: { vacancyNotes, vacancySkills:[String], history:[...], sessions:[...] },
  meetings:  { history:[{ id, date, raw, steps:[String] }] },
  checklist: [{ id, text, done, recurring }],
  goals:     [{ id, text, deadline /* opcional */, progress /* 0..100 */ }],
  activity:  [{ id, date, type, detail }],
  snapshots: [{ date, completeness, checklist, goals, skills, interviews }],
  preferences: { modality, schedule, communication, pace, accommodations, notes }
}
```

Cada sesión de simulacro (`interview.sessions[]`):

```js
{
  id, date, role,
  questions: [{ text, answer, feedback, difficulty /* facil|media|dificil */ }],
  summary: String   // resumen final generado por la IA
}
```

## 3.6 Compatibilidad con datos antiguos

`fillDefaults(parsed)` rellena campos ausentes al cargar el estado guardado, de modo
que una versión anterior de los datos sigue funcionando (por ejemplo, estados sin
`snapshots`, sin `interview.sessions` o sin `interview.vacancySkills`).

## 3.7 PWA

- `manifest.webmanifest`: nombre, colores, iconos y `display: standalone`.
- `sw.js`: precarga el shell; sirve estáticos con estrategia "caché primero" y
  navegación "red primero con respaldo en caché".
- **Excepción de seguridad:** cualquier ruta `/api/*` va **siempre a la red** y no se
  cachea. La IA no puede funcionar sin conexión.

Ver `08-pwa.md`.

## 3.8 Persistencia y flujo de guardado

```
saveState()  ──>  localStorage.setItem(neurowork_state_v1, JSON(state))   [siempre]
             └──>  scheduleServerSave()  ──(800 ms)──>  PUT /api/state    [si hay servidor]
                                                          └─> server/db.js ─> SQLite
```

- El estado se normaliza en **23 tablas** con claves foráneas (`workspace` como raíz).
- Al arrancar, si **no** había datos locales pero el servidor sí tiene un respaldo,
  se recupera automáticamente (`restoreFromServer()`). Nunca se sobrescribe un estado
  local existente con uno del servidor.
- Si el servidor no está disponible, la app sigue igual (solo localStorage).
- Detalle del esquema, relaciones y endpoints: `13-base-de-datos.md`.
