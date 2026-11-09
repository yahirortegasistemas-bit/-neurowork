# 06 · Minería de datos y visualización

El módulo `analytics.js` agrega los datos que la propia persona ha introducido y los
convierte en indicadores y gráficas. **No se genera ningún dato artificial**: si falta
información, se muestra un estado vacío que explica cómo producirla.

Todas las funciones son **puras** (reciben el estado y devuelven datos), lo que
permite verificarlas con pruebas automáticas (`tests/analytics.test.js`).

---

## 6.1 Datos de entrada

| Fuente | Campo del estado | Qué aporta |
|---|---|---|
| Actividad | `activity[]` | Fecha, tipo y detalle de cada acción |
| Snapshots | `snapshots[]` | Registro diario de indicadores (se genera solo) |
| Habilidades | `skills[]` | Categoría y nivel de confianza (1–5) |
| Entrevistas | `interview.history[]`, `interview.sessions[]` | Dificultad sentida por pregunta |
| Vacante | `interview.vacancySkills[]` | Requisitos detectados en la oferta |
| Checklist | `checklist[]` | Tareas hechas / total |
| Objetivos | `goals[]` | Avance (0–100) |

---

## 6.2 Indicadores y sus fórmulas

### Perfil completo
```
completeness = (campos_llenos / 5) * 100
campos = [nombre, título, ubicación, correo, resumen]
```
`profileCompleteness()`.

### Checklist
```
checklist = (tareas_hechas / total_tareas) * 100     (null si no hay tareas)
```
`checklistRate()`.

### Objetivos
```
goals = media(progress de cada objetivo)             (null si no hay objetivos)
```
`goalsAvg()`.

### Actividad por semana
Se agrupan las entradas de `activity` por **semana natural (lunes a domingo)**.
Se devuelven las últimas *N* semanas (4, 6 o 12, según el filtro) **incluyendo las
semanas con 0 acciones**: así una caída de actividad se ve como un hueco, no como
si no existiera.
`weeklyActivity()`.

### Actividad por tipo
Recuento de entradas por `type` (perfil, habilidades, cv, entrevistas, reuniones,
checklist, objetivos, preferencias, datos), ordenado de mayor a menor.
`activityByType()`.

### Habilidades por categoría
```
count    = número de habilidades de la categoría
avgLevel = media(level) de esas habilidades   (rango 1–5)
```
`skillsByCategory()`. El **nivel medio global** es `averageSkillLevel()`.

### Patrón de dificultad
Se unifican las prácticas del historial antiguo y las preguntas de las sesiones
del simulador:
```
items = interview.history ∪ (preguntas de interview.sessions)
counts = { facil, media, dificil }
```
`allPractice()` + `difficultyCounts()`.
La variante por semanas es `weeklyDifficulty()` (total de prácticas por semana).

### Brecha frente a la vacante
Compara los requisitos de la vacante con las habilidades registradas:
```
matched = requisitos que la persona ya tiene
missing = requisitos que no aparecen
```
La coincidencia es **exacta o parcial** (si una cadena contiene a la otra y tiene más
de dos caracteres), para que "Excel" case con "Microsoft Excel avanzado".
`skillGap()` + `userHasSkill()`.

---

## 6.3 Snapshots: la serie temporal

Para poder dibujar tendencias (cosa que un único porcentaje no permite), la app
guarda **un registro por día**:

```
snapshot = { date, completeness, checklist, goals, skills, interviews }
```

- `ensureSnapshots(state)` se ejecuta en cada guardado: **actualiza** el registro del
  día (no lo duplica) y conserva los últimos **120**.
- `metricSeries(state, 'completeness', 12)` devuelve las etiquetas (`MM-DD`) y los
  valores de los últimos 12 registros.

Consecuencia honesta: la gráfica de evolución del perfil solo aparece cuando hay
**al menos dos días distintos** de uso. Antes de eso se muestra un estado vacío.

---

## 6.4 Gráficas (SVG escritas a mano)

No se usa ninguna librería de gráficas. Cada gráfica es un `String` de SVG generado
por una función propia, con `viewBox` para escalar de forma responsiva.

| Función | Tipo | Detalles |
|---|---|---|
| `barChart(data, opts)` | Barras verticales | Rejilla con 4 líneas, etiquetas de valor y de categoría, color configurable |
| `lineChart(labels, values, opts)` | Línea + puntos | Rejilla, `polyline` y un círculo por punto con su etiqueta |
| `radarChart(axes, opts)` | Radar | Anillos al 25/50/75/100 %, radios, etiquetas y polígono de valores (requiere ≥ 3 ejes) |

Ejemplo de uso real:

```js
NWAnalytics.barChart(
  NWAnalytics.weeklyActivity(state.activity, 6).map(w => ({ label: w.label, value: w.count })),
  { color: 'var(--primary)' }
);
```

Colores tomados de las variables CSS (`--primary`, `--accent`, `--danger`, `--border`),
por lo que **se adaptan al tema claro y oscuro** automáticamente.

Los ejes parten **siempre de cero** y el máximo se calcula con los datos reales
(`Math.max(...valores, 1)`); no hay escalas manipuladas.

---

## 6.5 Recomendaciones derivadas de los datos

`recommendations(state)` aplica reglas explícitas y devuelve solo lo que se cumple:

| Condición | Recomendación |
|---|---|
| No hay habilidades | "Registra tu primera habilidad" |
| Perfil < 100 % | "Completa tu perfil profesional" |
| No hay texto de CV | "Genera un borrador de CV" |
| No hay requisitos de vacante | "Analiza una vacante" |
| Checklist vacío | "Crea tu checklist laboral" |
| Sin objetivos | "Define un objetivo" |
| ≥ 3 prácticas y más difíciles que fáciles | "Refuerza las preguntas difíciles" |
| Avance medio de objetivos < 40 % | "Revisa tus objetivos" |

Cada recomendación incluye un botón **"Ir"** que lleva a la sección correspondiente.

---

## 6.6 Informe exportable

`buildReport(state)` construye un informe con secciones verificables:

1. Resumen del perfil (nombre, título, % completo, nº de habilidades, nivel medio).
2. Habilidades por categoría (recuento y nivel medio).
3. Brecha frente a la vacante (coincidencias y faltantes).
4. Currículum (si existe, y puesto objetivo).
5. Objetivos y checklist.
6. Práctica de entrevistas (total por dificultad).
7. Actividad por sección.
8. Recomendaciones.

Se descarga como documento `.doc` desde el módulo *Progreso*.

---

## 6.7 Cómo se verifica

- **Pruebas automáticas** en `tests/analytics.test.js` (19 casos) que comprueban
  fórmulas, agrupaciones, estados vacíos y que las gráficas devuelven SVG válido.
- **Estados vacíos explícitos** en la interfaz cuando no hay datos.
- **Leyendas** junto a cada gráfica que explican cómo se calcula ("Se calcula
  agrupando el registro de actividad por la fecha de cada acción", etc.).
- **Cero datos inventados:** ningún valor se rellena con estimaciones. Si no hay
  información, aparece "—" o un mensaje.

Ejecutar:

```bash
npm test
```
