# NeuroWork — Avance 2

**Asistente Inteligente para la Búsqueda y Adaptación Laboral de Personas
Neurodivergentes mediante Inteligencia Artificial Generativa y Minería de Datos**

Yahir Ortega Ramos
Instituto Tecnológico de Tijuana, Tijuana, Baja California, México
L21212578@tectijuana.edu.mx

---

## Resumen

Este documento reporta el avance correspondiente al **Avance 2** del proyecto
NeuroWork. En esta etapa el sistema pasó de ser una propuesta a un **prototipo web
funcional** con once módulos operativos, integración de inteligencia artificial
generativa mediante un proxy seguro, y una **base de datos relacional** conectada a la
aplicación. Se incorporó, además, un conjunto de **41 pruebas automáticas** (unitarias y
de integración) que verifican la analítica, la generación de currículums, la base de
datos y la API del servidor. La validación con personas usuarias queda prevista para la
fase final.

---

## 1. Desarrollo funcional parcial

El sistema se encuentra en una **fase operativa inicial estable**. La aplicación
contempla once módulos, todos navegables y funcionales:

| Módulo | Estado | Función principal |
|---|---|---|
| Panel | Funcional | Resumen del día: perfil, checklist, objetivos, dificultad |
| Progreso | Funcional | Minería de datos y gráficas de avance |
| Perfil | Funcional | Datos de contacto, experiencia y formación |
| Habilidades | Funcional | Registro con categoría y nivel (1–5) |
| CV | Funcional | Generación/adaptación con IA y **4 plantillas** descargables |
| Entrevistas | Funcional | 4 pestañas: vacante, simulador, preparación y respuestas |
| Reuniones | Funcional | Instrucciones → pasos + redacción asistida |
| Checklist | Funcional | Tareas con repetición diaria |
| Objetivos | Funcional | Metas con porcentaje de avance |
| Preferencias | Funcional | Modalidad, horario y ajustes |
| Privacidad | Funcional | Transparencia sobre el manejo de datos |

**Funcionalidad principal destacada (CV):** genera un borrador con IA a partir del
perfil, permite adaptarlo a una vacante concreta y descargarlo en un documento `.doc`
con cuatro diseños profesionales (*Moderno*, *Ejecutivo*, *Clásico*, *Minimalista*),
con vista previa antes de descargar y fechas alineadas a la derecha.

> **Sobre el inicio de sesión:** NeuroWork **no implementa autenticación** de forma
> deliberada. Su modelo es *local-first*: la información permanece en el equipo de la
> persona y no existe un servidor de cuentas en la nube. Añadir un *login* obligaría a
> almacenar datos personales en un servidor, lo que contradiría el principio de
> minimización documentado en `docs/07-seguridad.md`. El acceso se resuelve con un
> perfil local en el dispositivo. Esta decisión puede revisarse si el proyecto requiere
> multiusuario.

---

## 2. Prototipo funcional / versión de prueba

El prototipo es **ejecutable y navegable**, e instalable como aplicación (PWA).

**Requisitos:** Node.js 22+ (para la base de datos) y un navegador moderno.

**Ejecución:**

```bash
npm start          # o:  node server/server.js
```

Luego abrir: `http://127.0.0.1:8787`

**Flujo principal demostrable:**

1. Registrar perfil y habilidades.
2. Generar un CV con IA y descargarlo en cualquiera de los 4 diseños.
3. Adaptar el CV a una vacante pegada por la persona.
4. Practicar un simulacro de entrevista con retroalimentación por respuesta.
5. Registrar objetivos y checklist; ver el progreso en gráficas.
6. Comprobar el respaldo en la base de datos (`/api/db`).

La aplicación funciona **sin conexión** para todo lo local mediante un Service Worker;
solo las funciones de IA requieren red.

---

## 3. Avance de la base de datos / arquitectura

### 3.1 Decisión y estado

Se integró una base de datos **relacional SQLite** usando el módulo nativo
`node:sqlite` (sin dependencias externas). El archivo vive en
`server/data/neurowork.db`, en el propio equipo, y está excluido del repositorio.

**Estado: diseñada e implementada parcialmente.** El prototipo ya guarda y recupera el
estado completo en las tablas; queda pendiente la migración de datos antiguos y la
sincronización multiusuario.

### 3.2 Esquema (23 tablas con relaciones)

```
workspace (raíz)
 ├─1:1─ profile            ├─1:N─ experiences        ├─1:N─ skills
 ├─1:1─ preferences        ├─1:N─ education          ├─1:N─ languages
 ├─1:1─ prep_plans         ├─1:N─ certifications     ├─1:N─ projects
 ├─1:1─ vacancy_analyses   ├─1:N─ cv_documents ─N:1─ cv_templates
 ├─1:N─ checklist_items    ├─1:N─ goals              ├─1:N─ activity_log
 ├─1:N─ snapshots          ├─1:N─ prepared_answers   ├─1:N─ professional_links
 └─1:N─ meetings ─1:N─ meeting_steps
 └─1:N─ interview_sessions ─1:N─ interview_questions
```

Cada tabla tiene **clave primaria**; las tablas hijas referencian `workspace(id)` con
`ON DELETE CASCADE`. El DDL completo está en `server/db.js` (constante `SCHEMA_SQL`) y
documentado en `docs/13-base-de-datos.md`.

### 3.3 Conexión con la aplicación

| Método | Endpoint | Función |
|---|---|---|
| `PUT` | `/api/state` | Guarda el estado (llamado por `saveState()`) |
| `GET` | `/api/state` | Recupera el estado al arrancar si no había datos locales |
| `DELETE` | `/api/state` | Borra el respaldo ("Reiniciar datos") |
| `GET` | `/api/db` | Motor, ruta y conteo de filas por tabla |

La persistencia es doble y transparente: **localStorage siempre** y, si el servidor
está activo, **respaldo en SQLite**. Si no hay servidor, la app sigue funcionando igual.

### 3.4 Arquitectura general

```
Navegador                           Servidor Node                Google
─────────                           ─────────────                ──────
app.js (estado, UI)  ──PUT/GET──►  /api/state ──► server/db.js ──► SQLite
ai.js                ──POST────►   /api/gemini ──x-goog-api-key──► Gemini API
sw.js (offline)                    estáticos
```

La clave de API **nunca** viaja al navegador: se inyecta en el servidor desde
`server/.env`.

---

## 4. Evidencias del avance

| Evidencia | Ubicación | Qué demuestra |
|---|---|---|
| Código fuente | Repositorio local (`git`) | Implementación completa |
| Base de datos | `server/db.js`, `docs/13-base-de-datos.md` | Esquema relacional y relaciones |
| Pruebas automáticas | `tests/` (41 pruebas) | Calidad y verificación |
| Documentación | `docs/01`–`15`, `README.md` | Diseño y funcionamiento |
| Capturas de pantalla | *(insertar Figuras 1–N)* | Módulos en funcionamiento |
| Video de demostración | *(opcional, insertar enlace)* | Flujo principal en vivo |

Comandos de verificación reproducibles:

```bash
npm test                       # 41 pruebas correctas
node tools/db-info.js          # 23 tablas y conteo de filas
curl http://127.0.0.1:8787/api/db
```

> **Nota honesta:** el repositorio es **local**; su publicación en GitHub queda como
> paso pendiente si el profesor requiere un enlace. Las capturas y el video deben
> insertarse como figuras reales del sistema en ejecución (no se incluyen aquí para no
> presentar material que no haya sido capturado).

---

## 5. Comparación con el cronograma inicial

| Actividad planificada | Estado | Evidencia |
|---|---|---|
| Anteproyecto y análisis de requerimientos | Completado | `docs/01`, anteproyecto |
| Diseño de arquitectura y modelo de datos | Completado | `docs/03`, `docs/13` |
| Diseño de interfaz accesible | Completado | `styles.css`, `docs/12` |
| Desarrollo de módulos funcionales (11) | Completado | `app.js` |
| Integración de IA generativa | Completado (integración técnica) | `ai.js`, `server/server.js` |
| Base de datos relacional | Parcial (diseñada e implementada en local) | `server/db.js` |
| Módulo de minería de datos | Completado | `analytics.js`, `docs/06` |
| Capacidades PWA / offline | Completado | `sw.js`, `docs/08` |
| Pruebas técnicas | Completado | `tests/` (41 correctas) |
| Documentación técnica | En curso | `docs/01`–`15` |
| Validación con usuarios | Pendiente | prevista en fase final |

**Avance global estimado: ~85 %.** Se han consolidado todas las actividades técnicas;
falta la validación empírica con usuarios y la exportación a PDF.

---

## 6. Pruebas preliminares / validaciones

### 6.1 Pruebas automáticas

```bash
npm test    # node --test
```

**Resultado: 41 pruebas, 41 correctas, 0 fallos.**

| Archivo | Casos | Cubre |
|---|---|---|
| `tests/analytics.test.js` | 16 | Minería de datos y gráficas |
| `tests/cv-doc.test.js` | 7 | Generación de documentos de CV |
| `tests/db.test.js` | 7 | Base de datos (ida y vuelta, cascada) |
| `tests/api.test.js` | 7 | API HTTP + base de datos (integración real) |
| `tests/server.test.js` | 4 | Seguridad y utilidades del servidor |

### 6.2 Verificación manual

- Verificación sintáctica con `node --check` en `app.js`, `ai.js`, `sw.js`, `server/*.js`.
- `/api/health` operativo con `keyConfigured: true`.
- Comprobación en vivo de `PUT/GET/DELETE /api/state` y `GET /api/db` (23 tablas).
- Checklist manual en `docs/09-pruebas.md` (incluye respaldo en base de datos).

### 6.3 Correcciones aplicadas durante el desarrollo

- **Conexión con la IA:** error `Failed to fetch` por abrir la app como archivo
  (`file://`); se resolvió sirviendo por HTTP y mostrando un mensaje orientador.
- **Caché PWA:** se incrementó la versión del Service Worker (`neurowork-v3`) para
  invalidar la caché anterior.
- **Diseño del CV:** se rediseñó el generador (4 plantillas, fechas alineadas,
  deduplicación de contacto).
- **Codificación:** se garantizó UTF-8 en los documentos `.doc` (prefijo BOM) y en el
  entorno de trabajo.

### 6.4 Retroalimentación

**Aún no se ha realizado validación con usuarios finales.** No se reportan opiniones ni
resultados que no se hayan recogido formalmente. La prueba piloto con 2–3 personas
neurodivergentes está planificada para la fase final (sección 8).

---

## 7. Documentación técnica (parcial)

- **Diagrama de arquitectura y flujo:** `docs/03-arquitectura.md`, `docs/13-base-de-datos.md`.
- **Especificación de módulos:** `docs/04-modulos-funcionales.md`.
- **Flujos de IA:** `docs/05-flujos-de-ia.md`.
- **Minería de datos:** `docs/06-mineria-de-datos.md`.
- **Seguridad:** `docs/07-seguridad.md`.
- **Pruebas:** `docs/09-pruebas.md`.
- **Base de datos:** `docs/13-base-de-datos.md` (ER, tablas, endpoints, mapeo).
- **Manual de usuario inicial:** `docs/14-manual-usuario.md`.
- **Plan de cierre:** `docs/15-plan-fase-final.md`.

---

## 8. Plan de trabajo para la fase final

| # | Actividad pendiente | Entregable | Tiempo estimado |
|---|---|---|---|
| 1 | Validación con usuarios neurodivergentes (2–3) | Informe de usabilidad | 4–5 días |
| 2 | Exportación del CV a **PDF** | Botón "Descargar PDF" | 2–3 días |
| 3 | Migración y respaldo de la base de datos | Script de migración | 2 días |
| 4 | Pruebas E2E completas en navegador | Checklist con evidencias | 2 días |
| 5 | Revisión de accesibilidad (WCAG 2.2 AA) | Informe de conformidad | 2–3 días |
| 6 | Refinamiento UI/UX según hallazgos | Ajustes documentados | 3 días |
| 7 | Documentación final y memoria | Memoria + diagramas | 4–5 días |
| 8 | Presentación y demo | Diapositivas + video | 2 días |

**Recursos:** desarrollo individual, asesoría del profesor y usuarios voluntarios.
**Tiempo total estimado:** ~4 semanas.

**Entregables planeados para la entrega final:** prototipo completo, base de datos con
migración, suite de pruebas en verde, memoria técnica, manual de usuario y evidencias
(repositorio, capturas, video).

---

## Anexo · Cómo reproducir la verificación

```bash
# 1) Pruebas automáticas
npm test

# 2) Esquema de la base de datos
node tools/db-info.js

# 3) Arrancar y comprobar endpoints
npm start
curl http://127.0.0.1:8787/api/health
curl http://127.0.0.1:8787/api/db
```
