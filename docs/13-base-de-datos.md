# 13 · Base de datos (diseño e implementación)

NeuroWork usa una base de datos **relacional SQLite** para respaldar el estado del
usuario. Se eligió SQLite porque:

- **No requiere dependencias externas**: se usa el módulo nativo `node:sqlite`.
- **Es un archivo local** (`server/data/neurowork.db`): los datos no salen del equipo.
- Permite **tablas, relaciones y claves foráneas** reales, verificables con SQL.

> Estado: **diseñada e implementada parcialmente**. El prototipo ya guarda y recupera
> el estado completo en las tablas. Falta la migración de datos antiguos y la
> sincronización multi-dispositivo (fuera del alcance actual).

## 13.1 Diagrama entidad-relación (simplificado)

```
                         ┌─────────────────────┐
                         │      workspace      │  ← raíz (una fila)
                         │  id, schema_version │
                         │  created_at, updated│
                         └──────────┬──────────┘
        ┌──────────────┬────────────┼────────────┬──────────────┐
        │ 1:1          │ 1:N        │ 1:N        │ 1:N          │ 1:N
        ▼              ▼            ▼            ▼              ▼
 ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
 │  profile   │ │experiences │ │  skills  │ │  goals   │ │checklist_    │
 └────────────┘ └────────────┘ └──────────┘ └──────────┘ │items         │
 ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ └──────────────┘
 │preferences │ │ education  │ │languages │ │activity_ │ ┌──────────────┐
 └────────────┘ └────────────┘ └──────────┘ │ log      │ │  snapshots   │
 ┌──────────────────┐ ┌────────────────┐    └──────────┘ └──────────────┘
 │ cv_documents     │ │prepared_answers│    ┌────────────┐ ┌──────────────┐
 │ (N:1 cv_templates)│ └────────────────┘   │ meetings   │ │vacancy_      │
 └──────────────────┘                        └─────┬──────┘ │analyses      │
 ┌──────────────────┐  ┌───────────────┐           │ 1:N    └──────────────┘
 │interview_sessions│  │  prep_plans   │           ▼
 └────────┬─────────┘  └───────────────┘    ┌──────────────┐
          │ 1:N                             │ meeting_steps│
          ▼                                 └──────────────┘
 ┌───────────────────┐
 │interview_questions│
 └───────────────────┘
```

## 13.2 Tablas (23)

| Tabla | Propósito | Relación |
|---|---|---|
| `workspace` | Raíz del espacio de datos (una fila) | — |
| `profile` | Datos de contacto y resumen | 1:1 `workspace` |
| `professional_links` | Enlaces (portafolio, LinkedIn…) | 1:N `workspace` |
| `experiences` | Experiencia laboral | 1:N `workspace` |
| `education` | Formación académica | 1:N `workspace` |
| `skills` | Habilidades y nivel (1–5) | 1:N `workspace` |
| `languages` | Idiomas y nivel | 1:N `workspace` |
| `certifications` | Cursos y certificaciones | 1:N `workspace` |
| `projects` | Proyectos relevantes | 1:N `workspace` |
| `cv_templates` | Catálogo de los 4 diseños de CV | catálogo |
| `cv_documents` | Texto y plantilla del CV | 1:N `workspace`, N:1 `cv_templates` |
| `vacancy_analyses` | Última vacante analizada | 1:1 `workspace` |
| `interview_sessions` | Simulacros completados | 1:N `workspace` |
| `interview_questions` | Preguntas/respuestas de cada simulacro | 1:N `interview_sessions` |
| `prepared_answers` | Respuestas preparadas | 1:N `workspace` |
| `prep_plans` | Plan de preparación (IA) | 1:1 `workspace` |
| `meetings` | Reuniones convertidas en pasos | 1:N `workspace` |
| `meeting_steps` | Pasos de cada reunión | 1:N `meetings` |
| `checklist_items` | Tareas del checklist | 1:N `workspace` |
| `goals` | Objetivos y progreso | 1:N `workspace` |
| `preferences` | Preferencias de trabajo | 1:1 `workspace` |
| `activity_log` | Historial de actividad (minería de datos) | 1:N `workspace` |
| `snapshots` | Métricas diarias (tendencias) | 1:N `workspace` |

El DDL completo (con `CREATE TABLE`, claves primarias, foráneas e índices) vive en
`server/db.js` (constante `SCHEMA_SQL`).

## 13.3 Cómo se conecta con la aplicación

```
app.js
  saveState() ──► localStorage            (siempre)
              └─► PUT  /api/state         (si el servidor está activo; 800 ms de retardo)
  arranque    ──► GET  /api/state         (solo si NO había datos locales)
reiniciar    ──► DELETE /api/state
```

Endpoints expuestos por `server/server.js`:

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/state?workspaceId=local` | Devuelve `{ exists, state }` |
| `PUT` | `/api/state` | Guarda `{ workspaceId, state }` |
| `DELETE` | `/api/state?workspaceId=local` | Borra el respaldo del espacio |
| `GET` | `/api/db` | Motor, ruta y conteo de filas por tabla |
| `GET` | `/api/health` | Estado general (incluye `db.engine`) |

## 13.4 Mapeo entre el objeto `state` y las tablas

| Campo de `state` | Tabla(s) |
|---|---|
| `profile.*` (excepto arrays) | `profile` |
| `profile.experience[]` | `experiences` |
| `profile.education[]` | `education` |
| `skills[]` | `skills` |
| `cv` | `cv_documents` (catálogo en `cv_templates`) |
| `interview.vacancyNotes`, `vacancySkills` | `vacancy_analyses` |
| `interview.sessions[]` | `interview_sessions` + `interview_questions` |
| `interview.preparedAnswers[]` | `prepared_answers` |
| `interview.prepPlan` | `prep_plans` |
| `meetings.history[]` | `meetings` + `meeting_steps` |
| `checklist[]` | `checklist_items` |
| `goals[]` | `goals` |
| `activity[]` | `activity_log` |
| `snapshots[]` | `snapshots` |
| `preferences` | `preferences` |

El orden de las listas se conserva con una columna `position`.

## 13.5 Cómo inspeccionar la base de datos

```bash
# Con el servidor activo
curl http://127.0.0.1:8787/api/db

# Sin servidor: resumen del esquema y conteo de filas
node tools/db-info.js
```

Ejemplo de salida de `tools/db-info.js`:

```
Tablas (23):
  activity_log              0 filas
  cv_templates              4 filas
  ...
Claves foráneas de "experiences":
  workspace_id -> workspace(id)
```

## 13.6 Decisiones y limitaciones

- **Privacidad:** la base vive en el equipo del usuario (`server/data/neurowork.db`)
  y está en `.gitignore`. No hay autenticación porque no hay cuentas: el modelo es
  *local-first* con un único `workspace` llamado `local`.
- **Doble almacenamiento:** localStorage sigue siendo la fuente primaria; SQLite es un
  respaldo útil y la base para análisis con SQL. Si no hay servidor, todo funciona igual.
- **`node:sqlite` es experimental:** emite un aviso (`ExperimentalWarning`). Es estable
  en Node 22, pero conviene fijar la versión de Node en la entrega final.
- **Pendiente:** migración automática de la clave antigua `neurowork_state_v1` ya
  cubierta por el respaldo, y sincronización entre dispositivos (fuera de alcance).
