# NeuroWork — Beta multiplataforma

Aplicación web (PWA) de apoyo a la **búsqueda de empleo para personas neurodivergentes**.
Reúne en un solo lugar la preparación del perfil, el currículum, el análisis de vacantes,
el entrenamiento para entrevistas, la organización de tareas y — sobre todo — un
**análisis de datos del propio progreso**.

> Versión: **1.0.0 (Beta)** · Estado: funcional, sin dependencias externas en el cliente.

---

## 1. Qué hace

| Módulo | Para qué sirve |
|---|---|
| **Panel** | Resumen del día: perfil, checklist, objetivos y patrón de dificultad. |
| **Progreso** | Minería de datos: actividad por semana, evolución, perfil de habilidades, dificultad, brecha vs. vacante y recomendaciones. |
| **Perfil** | Datos personales, experiencia y formación. Base del CV. |
| **Habilidades** | Registro de habilidades con categoría y nivel de confianza (1–5). |
| **CV** | Redacción asistida por IA, adaptación a una vacante, **4 plantillas** con vista previa y descarga `.doc`. |
| **Entrevistas** | Explicación de vacantes + **simulador completo** con retroalimentación por respuesta y resumen final. |
| **Reuniones** | Conversión de instrucciones en pasos + redacción profesional de mensajes. |
| **Checklist** | Tareas con recordatorio de repetición. |
| **Objetivos** | Metas con porcentaje de avance. |
| **Preferencias** | Modalidad, horario, comunicación y apoyos que necesita la persona. |
| **Privacidad** | Explica dónde se guardan los datos y cómo se protege la clave de IA. |

## 2. Requisitos

- **Node.js 22 o superior** para la base de datos (probado con Node 22.21). Con Node
  18/20 la app funciona igual, usando solo `localStorage`.
- Un navegador moderno (Chrome, Edge o Firefox).
- Una **API key de Gemini** de [Google AI Studio](https://aistudio.google.com/app/apikey) si quieres usar las funciones de IA.

No hay que instalar nada más: el proyecto **no tiene dependencias npm**.

## 3. Instalación y ejecución (paso a paso)

```bash
# 1) Entra en la carpeta del proyecto
cd NeuroWork

# 2) Crea el archivo de configuración de la clave de IA
#    (copia la plantilla y escribe tu clave dentro)
cp server/.env.example server/.env
```

Edita `server/.env` y coloca tu clave:

```ini
GEMINI_API_KEY=tu_clave_de_google_ai_studio
GEMINI_MODEL=gemini-2.5-flash
PORT=8787
```

```bash
# 3) Arranca el servidor
npm start
#   o, sin npm:
node server/server.js
```

Abre en el navegador:

```
http://127.0.0.1:8787
```

> ⚠️ **Importante:** no abras `index.html` haciendo doble clic (protocolo `file://`).
> La aplicación debe servirse por HTTP para que funcionen la IA y la PWA.

### Comprobar que la clave está bien

Con el servidor arrancado, visita:

```
http://127.0.0.1:8787/api/health
```

Devuelve algo como:

```json
{ "ok": true, "model": "gemini-2.5-flash",
  "keyConfigured": true, "keySource": "file", "keyLooksValid": true,
  "db": { "engine": "sqlite", "file": "server/data/neurowork.db" } }
```

Si `keyConfigured` es `false`, no hay clave. Si la IA responde con un error 401
(`code: "invalid_key"`), la clave fue rechazada: genera una nueva en Google AI Studio.

### Base de datos (respaldo local)

Con el servidor activo, tu información se respalda además en una **base de datos
SQLite local** (`server/data/neurowork.db`). Inspecciónala con:

```bash
node tools/db-info.js       # esquema y conteo de filas
curl http://127.0.0.1:8787/api/db
```

La base vive en tu equipo y está en `.gitignore`. Ver
[`docs/13-base-de-datos.md`](docs/13-base-de-datos.md).

## 4. Pruebas

```bash
npm test          # equivale a: node --test
```

Las pruebas usan el runner nativo de Node (`node:test`), sin dependencias.
Ver [`docs/09-pruebas.md`](docs/09-pruebas.md) para el detalle.

## 5. Estructura del proyecto

```
NeuroWork/
├─ index.html            Interfaz (shell de la app)
├─ styles.css            Estilos (claro/oscuro)
├─ app.js                Lógica de la interfaz y de los módulos
├─ ai.js                 Puente hacia la IA (NUNCA contiene la clave)
├─ analytics.js          Minería de datos + gráficas SVG propias
├─ manifest.webmanifest  Manifiesto PWA
├─ sw.js                 Service Worker (offline para lo local)
├─ icons/                Iconos de la PWA (generados sin librerías)
├─ tools/make-icons.py   Generador de iconos (opcional, Python estándar)
├─ server/
│  ├─ server.js          Proxy seguro de Gemini + API de estado + estáticos
│  ├─ db.js              Esquema relacional y persistencia (SQLite)
│  ├─ data/              Base de datos local (ignorada por git)
│  ├─ package.json
│  ├─ .env.example       Plantilla de configuración (sin clave)
│  └─ .env               TU clave privada (ignorada por git)
├─ tests/                Pruebas automáticas (node:test)
│  ├─ analytics.test.js  Minería de datos
│  ├─ cv-doc.test.js     Documentos de CV
│  ├─ db.test.js         Base de datos (SQLite)
│  ├─ api.test.js        API HTTP + base de datos
│  └─ server.test.js     Utilidades y seguridad del servidor
├─ tools/db-info.js      Inspecciona el esquema y las filas
└─ docs/                 Documentación académica (Markdown)
```

## 6. Documentación

- [`docs/01-descripcion-general.md`](docs/01-descripcion-general.md) — problema, objetivo y usuarios.
- [`docs/02-instalacion-y-ejecucion.md`](docs/02-instalacion-y-ejecucion.md) — guía detallada.
- [`docs/03-arquitectura.md`](docs/03-arquitectura.md) — cómo está construida.
- [`docs/04-modulos-funcionales.md`](docs/04-modulos-funcionales.md) — los módulos uno a uno.
- [`docs/05-flujos-de-ia.md`](docs/05-flujos-de-ia.md) — los 6 flujos de IA generativa.
- [`docs/06-mineria-de-datos.md`](docs/06-mineria-de-datos.md) — qué se analiza y cómo se calcula.
- [`docs/07-seguridad.md`](docs/07-seguridad.md) — el manejo de la clave de API.
- [`docs/08-pwa.md`](docs/08-pwa.md) — instalación y modo sin conexión.
- [`docs/09-pruebas.md`](docs/09-pruebas.md) — pruebas y cómo ejecutarlas.
- [`docs/10-matriz-trazabilidad.md`](docs/10-matriz-trazabilidad.md) — requisito → dónde está cumplido.
- [`docs/11-limitaciones.md`](docs/11-limitaciones.md) — qué no hace (honestidad técnica).
- [`docs/12-accesibilidad.md`](docs/12-accesibilidad.md) — decisiones de accesibilidad.
- [`docs/13-base-de-datos.md`](docs/13-base-de-datos.md) — esquema relacional, relaciones y endpoints.
- [`docs/14-manual-usuario.md`](docs/14-manual-usuario.md) — guía de uso.
- [`docs/15-plan-fase-final.md`](docs/15-plan-fase-final.md) — plan de cierre.

## 7. Limitaciones principales

- Los datos se guardan en el navegador (localStorage) y, si el servidor está activo, en
  una **base de datos local** (SQLite). No hay cuentas ni sincronización entre equipos.
- La IA **no funciona sin conexión** (es un servicio externo).
- El icono de la PWA se genera con un script propio; no es un diseño profesional.
- No se ha probado en todos los navegadores ni en lectores de pantalla reales.

Ver [`docs/11-limitaciones.md`](docs/11-limitaciones.md) para la lista completa.

## 8. Licencia y uso

Proyecto académico. El código se entrega con fines educativos.
