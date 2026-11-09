# 04 · Módulos funcionales

La aplicación se organiza en la barra lateral. Estos son los módulos y su
comportamiento real.

---

## 4.1 Panel

**Objetivo:** dar una foto rápida del día sin exigir nada.

- Anillo de progreso con el **% de perfil completo** (5 campos: nombre, título,
  ubicación, correo, resumen).
- Tarjetas de **checklist** (% de tareas hechas), **objetivos** (avance medio) y
  **entrevistas practicadas** (contadas con la misma fuente que el patrón de
  dificultad: `NWAnalytics.allPractice()`, es decir historial + sesiones).
- **Patrón de dificultad**: cuántas preguntas de entrevista has sentido fáciles,
  medias o difíciles (a partir del historial y de las sesiones del simulador).
- Accesos directos a las secciones.

Estados vacíos explícitos: si no hay datos, se indica cómo generarlos.

---

## 4.2 Progreso (minería de datos)

**Objetivo:** responder con datos a la pregunta "¿cómo voy?".

Ver `06-mineria-de-datos.md` para el detalle de cada cálculo. Incluye:

- Filtro temporal (4 / 6 / 12 semanas).
- Actividad por semana (gráfica de barras SVG propia).
- Evolución del perfil en el tiempo (gráfica de líneas).
- Perfil de habilidades por categoría (radar + barras).
- Dificultad de las entrevistas por semana.
- Brecha frente a la última vacante analizada.
- Recomendaciones derivadas de los datos.
- Exportación de un **informe de progreso** a documento `.doc`.

---

## 4.3 Perfil

**Objetivo:** reunir los datos base que alimentan el CV y las comparaciones.

Campos: nombre, título profesional, ubicación, correo, teléfono y resumen.

Listas dinámicas:

- **Experiencia:** puesto, empresa, periodo y descripción.
- **Educación:** título/estudio, centro y periodo.

Los datos se pueden modificar o eliminar en cualquier momento. Guardar registra
una entrada en el registro de actividad (`perfil`).

---

## 4.4 Habilidades

**Objetivo:** que la persona haga explícito lo que sabe hacer, con su propio nivel
de confianza.

- Categorías: `Técnica`, `Comunicación`, `Organización`, `Digital`, `Idioma`, `Otra`.
- **Nivel de confianza de 1 a 5** — se llama así a propósito: no es una nota de
  capacidad, es cómo se siente la persona respecto a esa habilidad.

Estos datos alimentan:

- la generación y adaptación del CV,
- el **perfil de habilidades** del módulo Progreso,
- la **brecha** frente a los requisitos de una vacante.

---

## 4.5 CV (currículum)

**Objetivo:** producir un CV útil sin inventar nada.

Tres acciones:

1. **Generar CV con IA** a partir del perfil, experiencia, educación, habilidades y
   preferencias. El *prompt* prohíbe explícitamente inventar datos o fechas.
2. **Adaptar a una vacante** (ver `05-flujos-de-ia.md`, flujo 2): detecta requisitos,
   muestra la comparación con tus habilidades y **propone** un CV adaptado en un
   área editable. Nada se sobrescribe hasta que la persona pulsa "Usar este CV".
3. **Vista previa:** abre el CV con el diseño aplicado en una pestaña nueva, para
   revisarlo antes de descargarlo.
4. **Descargar con diseño:** genera un documento `.doc` con uno de tres estilos
   profesionales (`moderno`, `clasico`, `minimalista`) a partir del texto del CV.
   El documento se compone a partir de un **análisis estructural** del texto
   (nombre, título, contacto y secciones) y de los datos del perfil, de modo que:
   - *Moderno* es un diseño **a dos columnas** con barra lateral de color (contacto,
     habilidades, idiomas y cursos) y columna principal (perfil, experiencia,
     educación y proyectos).
   - *Clásico* es de una columna, con encabezado centrado y tipografía serif.
   - *Minimalista* es de una columna, con mucho espacio en blanco y jerarquía sobria.
   Las habilidades escritas en una sola línea se convierten automáticamente en
   lista, y todo el contenido se **escapa** antes de insertarse en el documento.

---

## 4.6 Entrevistas

**Objetivo:** entender las ofertas y practicar sin presión.

Cuatro pestañas:

### a) Entender la vacante
Pega el texto de una oferta. La app hace **dos llamadas en paralelo**:

- una explicación en lenguaje simple (resumen, requisitos, qué evaluarán, consejos);
- un **JSON con los requisitos clave**, que se guarda en `interview.vacancySkills`.

Esos requisitos son los que alimentan después la *brecha* del módulo Progreso.

### b) Simulador
Un **simulacro completo** (ver flujo 3):

1. Se elige el puesto y el número de preguntas (3 o 5).
2. La IA genera todas las preguntas de una vez (JSON).
3. Se responde una a una; cada respuesta recibe retroalimentación
   (fortalezas, sugerencias, ejemplo mejorado).
4. Se marca la dificultad sentida de cada pregunta.
5. Al terminar se genera un **resumen del simulacro** y la sesión se guarda en
   `interview.sessions`.

Aviso visible dentro del módulo: la retroalimentación la genera una IA con fines
de práctica y **no es una decisión de contratación**.

### c) Preparación
Enfoque **mixto** (ver flujo 7):

- **Guía estática** siempre disponible, incluso si la IA no responde: lista "Antes
  de la entrevista", explicación del método **STAR**, preguntas frecuentes para
  ensayar y pautas de logística/ajustes.
- **Plan personalizado con IA:** genera un plan a partir del perfil, el puesto
  objetivo, las habilidades y las preferencias. El último plan se guarda en
  `interview.prepPlan` y se vuelve a mostrar al entrar.
- Si la IA no está disponible, la guía estática sigue siendo la base.

### d) Preparar respuestas
Flujo directo para construir una respuesta concreta (ver flujo 8):

1. Se elige una pregunta frecuente de la lista o se escribe una propia.
2. Se añaden notas o experiencia (opcional).
3. La IA devuelve, con encabezados fijos, `ESTRUCTURA SUGERIDA (STAR)`,
   `BORRADOR DE RESPUESTA` y `CLAVES PARA PERSONALIZAR`.
4. El borrador aparece en un **área editable**; se puede guardar, editar más tarde
   o eliminar. Las respuestas se guardan en `interview.preparedAnswers`.

Aviso visible: el borrador es de una IA con fines de práctica y debe revisarse con
palabras propias.

---

## 4.7 Reuniones

**Objetivo:** convertir el lenguaje difuso del trabajo en tareas concretas.

- **Convertir instrucciones en pasos:** pega un correo o notas; devuelve una lista
  numerada (JSON) y permite añadir todos los pasos al checklist.
- **Redacción profesional:** reescribe un borrador con tono claro y profesional.
- **Historial de reuniones:** guarda las conversiones realizadas (fecha y pasos).

---

## 4.8 Checklist

**Objetivo:** organizar la jornada en tareas pequeñas y tachables.

- Añadir tarea con texto libre.
- Marcar casilla **"Diaria"** para tareas recurrentes.
- Marcar/desmarcar (con tachado visual) y eliminar.
- Indicador de % completado.

---

## 4.9 Objetivos

**Objetivo:** trabajar con metas pequeñas y medibles.

- Título y fecha límite opcional.
- Avance con control deslizante (0–100 %, pasos de 5).
- Barra de progreso; al 100 % el objetivo aparece tachado.
- El avance medio alimenta el Panel, el módulo Progreso y las recomendaciones.

---

## 4.10 Preferencias

**Objetivo:** que las adaptaciones sean explícitas y las tenga en cuenta la IA.

- Modalidad de trabajo (Remoto / Presencial / Híbrido).
- Horario preferido.
- Estilo de comunicación preferido.
- Ritmo y organización de tareas (por escrito, pocas tareas a la vez, rutinas fijas…).
- **Ajustes razonables** que le gustaría solicitar.
- Notas adicionales.

Estas preferencias se insertan literalmente en los *prompts* de CV y entrevistas
(véase `preferencesText()`), pero **no se inventan ni se completan solas**.

---

## 4.11 Privacidad

Página informativa (no recoge nada por sí misma) que explica:

- Que los datos viven **solo en este navegador**.
- Qué se guarda exactamente.
- Que la única información que sale del dispositivo es la que se envía al modelo
  en los flujos de IA.
- Que la clave de la IA está en el servidor, no en el navegador.

---

## 4.12 Elementos transversales

- **Modo simple** (◐): oculta bloques secundarios para reducir la carga visual.
- **Reiniciar datos** (↺): borra todo el estado local, con confirmación.
- **Diagnóstico** (🩺): panel técnico (estado de `localStorage`, IA, última acción).
- **Toasts:** confirmaciones breves no bloqueantes.
- **Tema claro/oscuro:** automático según la preferencia del sistema. El CSS también
  admite forzarlo con el atributo `data-theme` en `<html>`, aunque no hay un botón en
  la interfaz para ello.
