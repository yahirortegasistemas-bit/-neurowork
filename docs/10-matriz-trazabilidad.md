# 10 · Matriz de trazabilidad

Recorrido de cada requisito hasta el lugar exacto donde está cumplido.

---

## 10.1 Módulos funcionales

| Requisito | Dónde está | Cómo comprobarlo |
|---|---|---|
| Perfil | `app.js` → `renderPerfil()` | Barra lateral → *Perfil* |
| Habilidades | `renderHabilidades()` + `SKILL_CATS` | *Habilidades* → añadir con nivel 1–5 |
| CV | `renderCV()`, `onGenerateCv()` | *CV* → "Generar CV con IA" |
| Análisis de vacantes | `renderEntrevistas()` pestaña *vacante*, `onExplainVacancy()` | *Entrevistas → Entender la vacante* |
| Entrevistas / simulador | `onStartSim()`, `renderSimStage()`, `finishSim()` | *Entrevistas → Simulador* |
| Preparación de entrevistas | `renderPrepTab()`, `onGenPrepPlan()` | *Entrevistas → Preparación* |
| Preparación de respuestas | `renderAnswersTab()`, `onBuildAnswer()`, `onSaveAnswer()` | *Entrevistas → Preparar respuestas* |
| Reuniones / respuestas profesionales | `onConvertSteps()`, `onPolishText()` | *Reuniones* |
| Checklist | `renderChecklist()` | *Checklist* |
| Metas | `renderObjetivos()` | *Objetivos* |
| Registro de avances | `logActivity()` + `snapshots` + módulo *Progreso* | *Progreso* |
| Panel de control | `renderDashboard()` | *Panel* |

## 10.2 Flujos de IA generativa

| Flujo | Implementación | Documentación |
|---|---|---|
| Adaptar CV a la vacante | `onAdaptCv()` (JSON requisitos + reescritura + revisión previa) | `05-flujos-de-ia.md` §Flujo 2 |
| Simulacro de entrevista completo | `onStartSim` → `onSimSubmit` → `onSimNext` → `finishSim` | §Flujo 3 |
| Explicación de vacantes | `onExplainVacancy()` | §Flujo 4 |
| Preparación de respuestas | retroalimentación por respuesta en el simulador | §Flujo 3 (paso B) |
| Preparación de entrevistas (plan) | `onGenPrepPlan()` | §Flujo 7 |
| Preparación de respuestas (construir/guardar) | `onBuildAnswer()`, `onSaveAnswer()` | §Flujo 8 |
| Redacción profesional | `onPolishText()` | §Flujo 5 |
| Conversión de instrucciones en pasos | `onConvertSteps()` | §Flujo 6 |

## 10.3 Minería de datos

| Requisito | Implementación | Gráfica / salida |
|---|---|---|
| Habilidades | `skillsByCategory()`, `averageSkillLevel()` | Radar + barras |
| Actividades | `activityByType()`, `weeklyActivity()` | Barras por semana |
| Progreso | `makeSnapshot()`, `metricSeries()` | Línea de evolución |
| Preferencias | `preferencesText()` + módulo *Preferencias* | Se usan en los *prompts* |
| Patrones de dificultad | `allPractice()`, `difficultyCounts()`, `weeklyDifficulty()` | Barras + etiquetas |
| Gráficas verificables | `barChart()`, `lineChart()`, `radarChart()` | SVG propio, sin librerías |

Detalle de fórmulas en `06-mineria-de-datos.md`.

## 10.4 Seguridad

| Requisito | Implementación | Comprobación |
|---|---|---|
| La clave no está en el frontend | `ai.js` solo llama a `/api/gemini` | `grep` en `07-seguridad.md` §7.4 |
| Backend con variables de entorno | `server/server.js` + `server/.env` | `/api/health` → `keySource: "file"` |
| Plantilla sin claves | `server/.env.example` | Abrir el archivo |
| Archivo de secretos ignorado | `.gitignore` → `server/.env` | Leer `.gitignore` |
| Límite de peticiones | `rateLimited()` (30/min) | Hacer 31 peticiones seguidas → 429 |

## 10.5 PWA

| Requisito | Implementación | Comprobación |
|---|---|---|
| Manifiesto | `manifest.webmanifest` | DevTools → Manifest |
| Service Worker | `sw.js` + registro en `index.html` | DevTools → Service Workers |
| Iconos válidos | `icons/*.png` (generados, 192/512/maskable) | DevTools → Manifest → Icons |
| Offline para lo local | precache del shell + caché primero | DevTools → Offline |
| La IA nunca offline | `sw.js` excluye `/api/*` | Con Offline, el simulador falla con aviso |

## 10.6 Calidad y documentación

| Requisito | Implementación | Comprobación |
|---|---|---|
| Pruebas automatizadas | `tests/*.test.js` (19 casos) | `npm test` |
| Build / arranque documentado | `README.md`, `docs/02-...md` | `npm start` |
| Instrucciones de instalación y configuración | `README.md` §3 | Seguir los pasos |
| Limitaciones documentadas | `docs/11-limitaciones.md` | Leer |

## 10.7 Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| La clave no se expone en el cliente | ✅ | `07-seguridad.md`; `ai.js` sin clave |
| Adaptación de CV E2E | ✅ | `09-pruebas.md` §9.2 (JSON de requisitos) + §9.3 |
| Simulacro de entrevista E2E | ✅ | §9.2 (JSON de preguntas) + §9.3 |
| Gráficas verificables | ✅ | `06-mineria-de-datos.md`; 19 pruebas |
| PWA instalable y offline | ✅ | `08-pwa.md`; cabeceras verificadas |
| Los módulos existentes siguen funcionando | ✅ | §9.3 (lista de comprobación) |
| Pruebas y build documentados | ✅ | `09-pruebas.md`, `README.md` |
| Instrucciones de instalación/configuración/ejecución | ✅ | `README.md` §3, `docs/02` |
| Limitaciones documentadas | ✅ | `docs/11-limitaciones.md` |

> Los criterios marcados con ✅ corresponden a funcionalidad implementada y verificada
> (pruebas automáticas o comprobaciones realizadas). Las verificaciones que requieren
> interacción manual en el navegador se enumeran como lista de comprobación en
> `09-pruebas.md` §9.3.
