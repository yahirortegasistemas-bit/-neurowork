# 09 · Pruebas

## 9.1 Pruebas automáticas (unitarias)

Se usa el **runner nativo de Node** (`node:test` + `node:assert`): sin frameworks,
sin dependencias, sin instalación.

```bash
npm test        # equivale a:  node --test
```

Resultado esperado: **41 pruebas, 41 correctas, 0 fallos** (duración ~300 ms).

### Qué se prueba

`tests/analytics.test.js` (16 casos) — el módulo de minería de datos:

| Prueba | Qué verifica |
|---|---|
| `profileCompleteness` | 0 %, 80 % y 100 % según campos |
| `checklistRate` / `goalsAvg` | listas vacías devuelven `null` (no `NaN`) |
| `skillsByCategory` | agrupación y media de niveles |
| `averageSkillLevel` | media global |
| `activityByType` | recuento por tipo y orden descendente |
| `weeklyActivity` | agrupación por semana; la actividad fuera de rango no se cuenta |
| `allPractice` / `difficultyCounts` | unión de historial y sesiones |
| `ensureSnapshots` | añade el snapshot de hoy y **no lo duplica** |
| `metricSeries` | etiquetas y valores alineados |
| `skillGap` | coincidencias y faltantes |
| `skillGap` (parcial) | "Microsoft Excel avanzado" casa con "Excel" |
| `recommendations` (vacío) | propone acciones cuando faltan datos |
| `recommendations` (completo) | no recomienda nada si todo está cubierto |
| `buildReport` | secciones y datos verificables (nombre, brecha) |
| gráficas | `barChart`/`lineChart`/`radarChart` devuelven SVG y estado vacío |
| `esc` | neutraliza HTML |

`tests/cv-doc.test.js` (7 casos) — el generador de documentos de CV (`buildProfessionalDoc`):

| Prueba | Qué verifica |
|---|---|
| Documento válido | devuelve `<!DOCTYPE html>` con los datos del CV |
| Diseño moderno | usa dos columnas (`page`, `sidebar`, `cvmain`) con barra de color |
| Habilidades en línea | una sola línea con comas se convierte en lista |
| Clásico / minimalista | son de una columna con encabezado (sin barra lateral) |
| Contacto | se toma del texto y del perfil **sin duplicar** |
| Escape HTML | una entrada con `<img>` no se inserta sin escapar |
| CV vacío | un texto vacío no rompe la generación |

`tests/server.test.js` (4 casos) — seguridad del servidor:

| Prueba | Qué verifica |
|---|---|
| `keyLooksValid` (válidas) | acepta formatos `AIza...` y `AQ....` |
| `keyLooksValid` (inválidas) | rechaza vacío, `undefined`, cadenas cortas y claves de otro proveedor |
| `keyHint` | devuelve un texto de estado sin filtrar la clave |
| `MIME` | incluye los tipos necesarios para la PWA (`.webmanifest`, `.js`, `.html`, `.png`) |

`tests/db.test.js` (7 casos) — la capa de persistencia relacional (`server/db.js`):

| Prueba | Qué verifica |
|---|---|
| Esquema | existen ≥ 20 tablas y el catálogo de CV tiene 4 plantillas |
| Ida y vuelta | `saveState` + `loadState` conservan **todo** el estado (deep-equal) |
| Workspace inexistente | `loadState` devuelve `null` |
| Re-guardado | volver a guardar **reemplaza** sin duplicar filas |
| Relaciones N:1 | las listas se recuperan **en orden** |
| Borrado en cascada | al borrar el workspace se eliminan sus filas hijas |
| `tableCounts` | el conteo por tabla refleja lo guardado |

`tests/api.test.js` (7 casos) — el servidor HTTP + base de datos (integración real):

| Prueba | Qué verifica |
|---|---|
| `PUT`/`GET /api/state` | guarda y recupera el estado por HTTP |
| `GET` (sin datos) | devuelve `exists:false` para un workspace vacío |
| `GET /api/db` | informa `engine:sqlite` y el conteo de ≥ 20 tablas |
| `PUT` inválido | responde `400` si falta `state` |
| `DELETE /api/state` | borra el respaldo del workspace |
| Método no permitido | `405` para `POST /api/state` |
| `GET /api/health` | incluye la información de la base de datos |

> Nota de diseño: `server/server.js` **no arranca al importarse** (`if (require.main === module)`),
> lo que permite probar sus utilidades sin abrir el puerto.

## 9.2 Pruebas de extremo a extremo (E2E) de los flujos de IA

Requieren el servidor arrancado con una clave válida. Se verificó el camino completo
**navegador lógico → proxy → Gemini → respuesta**, con estos resultados reales:

**1. Generación de texto**

```json
{"text":"OK"}            // prompt: "Responde SOLO con la palabra: OK"
```

**2. Extracción de requisitos de una vacante (JSON) — base de la adaptación de CV**

Entrada: oferta de "Auxiliar administrativo" (Excel, organización, atención al público, inglés).
Respuesta:

```json
{"skills":["Excel","Organización","Atención al cliente","Inglés"]}
```

**3. Generación de preguntas del simulador (JSON)**

```json
{"questions":[
  "Describe tu experiencia con el manejo de software de oficina…",
  "Imagina que estás gestionando varias tareas administrativas…",
  "¿Qué te motiva a trabajar como Auxiliar Administrativo…?"
]}
```

Los tres devuelven JSON/texto válido que `ai.js` puede parsear
(`JSON.parse` directo, con extracción del bloque `{...}` como respaldo).

### Servido de PWA (cabeceras reales)

| Ruta | Código | `Content-Type` |
|---|---|---|
| `/` | 200 | `text/html; charset=utf-8` |
| `/manifest.webmanifest` | 200 | `application/manifest+json; charset=utf-8` |
| `/sw.js` | 200 | `text/javascript; charset=utf-8` |
| `/icons/icon-192.png` | 200 | `image/png` |
| `/analytics.js` | 200 | `text/javascript; charset=utf-8` |

## 9.3 Pruebas manuales en el navegador (lista de comprobación)

Se realizan en `http://127.0.0.1:8787` con la consola (F12) abierta.

### Seguridad de la clave
- [ ] En *Network*, la petición a `/api/gemini` **no** lleva ninguna cabecera con la clave.
- [ ] Buscar la clave en los archivos servidos (`Ctrl+F` en *Sources*): sin resultados.
- [ ] `/api/health` responde con `keyConfigured: true` y sin mostrar la clave.

### Adaptación de CV (E2E)
- [ ] Perfil con datos + al menos una habilidad.
- [ ] Pegar una vacante en *CV → Adaptar el CV a una vacante* y pulsar "Analizar y adaptar".
- [ ] Aparecen las etiquetas "Ya cubres" / "Por reforzar".
- [ ] Aparece un **área de texto editable** con la propuesta.
- [ ] Pulses "Usar este CV" y comprueba que el texto se copia al CV de abajo.
- [ ] Comprobar que **nada se sobrescribió** antes de pulsar el botón.

### Diseño y descarga del CV
- [ ] En *CV*, el selector muestra los **cuatro** diseños (Moderno / Ejecutivo / Clásico / Minimalista).
- [ ] "Vista previa" abre el CV con el diseño aplicado en una pestaña nueva.
- [ ] El diseño **Moderno** se ve a **dos columnas** (barra lateral de color con
      contacto, habilidades, idiomas y cursos).
- [ ] "Descargar con diseño" genera un `.doc` que se abre en Word con el diseño elegido.
- [ ] El nombre, el contacto y las secciones aparecen correctamente (sin duplicados).

### Simulacro completo (E2E)
- [ ] *Entrevistas → Simulador*: elegir puesto y 3 preguntas, "Iniciar simulacro".
- [ ] Responder la pregunta 1 → "Evaluar respuesta" → aparece retroalimentación.
- [ ] Marcar dificultad → "Siguiente pregunta".
- [ ] Repetir hasta la última → "Ver resumen del simulacro".
- [ ] El resumen aparece y la sesión se añade al historial.
- [ ] *Progreso*: el patrón de dificultad refleja las respuestas.

### Base de datos y respaldo
- [ ] Con el servidor activo, `GET /api/db` responde `engine: sqlite` con ≥ 20 tablas.
- [ ] Al editar el perfil, en los 800 ms siguientes se envía un `PUT /api/state` (Network).
- [ ] `node tools/db-info.js` muestra filas > 0 en `profile`, `skills`, etc. tras usar la app.
- [ ] *Privacidad* indica "Respaldo: base de datos local del servidor" cuando está activo.
- [ ] Con el servidor apagado, la app sigue guardando (solo localStorage) y no da error.
- [ ] "Reiniciar datos" borra también el respaldo (`GET /api/state` → `exists:false`).

### Minería de datos
- [ ] *Progreso* muestra actividad por semana con barras.
- [ ] La gráfica de "Evolución del perfil" pide dos días de uso si solo hay uno.
- [ ] Las gráficas se ven bien en tema claro **y** oscuro.
- [ ] "Descargar informe" genera un `.doc` con las secciones.
- [ ] Con datos insuficientes se ve un **estado vacío**, no una gráfica inventada.

### PWA
- [ ] *Application → Manifest*: se lee sin errores.
- [ ] *Application → Service Workers*: `sw.js` activado.
- [ ] *Application → Cache Storage*: existe `neurowork-v3`.
- [ ] *Network → Offline* + recargar: la app abre.
- [ ] Con *Offline*, un flujo de IA falla con mensaje claro (no responde de caché).

### Módulos existentes
- [ ] Perfil guarda y recarga tras refrescar.
- [ ] Habilidades, checklist y objetivos persisten.
- [ ] "Convertir en pasos" guarda la reunión **una sola vez** (sin duplicados).
- [ ] "Reiniciar datos" pide confirmación y limpia todo.
- [ ] "Modo simple" oculta bloques secundarios.

## 9.4 Cómo repetir las pruebas E2E por línea de comandos

Con el servidor arrancado:

```bash
# 1. Estado
curl -s http://127.0.0.1:8787/api/health

# 2. Texto
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"prompt":"Responde SOLO con la palabra: OK"}' \
  http://127.0.0.1:8787/api/gemini

# 3. JSON (requisitos)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"prompt":"Devuelve SOLO JSON {\"skills\":[\"a\"]}","json":true}' \
  http://127.0.0.1:8787/api/gemini
```

> En Windows, si ejecutas el comando desde WSL, usa `curl.exe` (el de Windows) para
> alcanzar el `127.0.0.1` de Windows.
