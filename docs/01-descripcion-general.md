# 01 · Descripción general

## 1.1 El problema

Las personas neurodivergentes (autismo, TDAH, dislexia, dispraxia, entre otras)
se enfrentan a la búsqueda de empleo con dificultades añadidas:

- Las ofertas de trabajo suelen estar escritas con jerga ambigua y frases vacías.
- Los procesos de entrevista son informales y cambian de reglas de forma implícita.
- La carga de tareas administrativas (currículum, correos, seguimiento) es alta y
  fragmentada, y la memoria de trabajo o la función ejecutiva pueden dificultarla.
- Falta retroalimentación objetiva sobre "cómo voy".

## 1.2 El objetivo

Construir una **herramienta de apoyo** que:

1. **Ordene** el proceso de búsqueda de empleo en módulos pequeños y claros.
2. **Traduzca** lo que realmente pide una vacante a lenguaje simple y a pasos concretos.
3. **Entrene** para la entrevista de forma segura (sin presión, sin consecuencias).
4. **Mida y muestre** el propio progreso con datos reales, no con frases motivacionales.

## 1.3 Usuarios previstos

- **Persona usuaria principal:** alguien neurodivergente en búsqueda activa de empleo,
  que puede estar recibiendo apoyo de un orientador laboral.
- **Usuario secundario (no implementado como rol):** profesional de orientación que
  revisa el informe de progreso exportable.

## 1.4 Enfoque de diseño

- **Claridad > estética:** frases cortas, secciones con títulos, sin adornos.
- **Control del usuario:** ninguna acción de IA sobrescribe datos sin que la persona
  pueda revisar el resultado antes (especialmente en el CV adaptado).
- **Sin promesas falsas:** la IA no decide, no evalúa la validez de una persona y
  no sustituye a un profesional. Esto se advierte dentro de la aplicación.
- **Modo simple:** un botón oculta los bloques "declarativos" para reducir la carga
  visual cuando la persona lo necesita.
- **Alto contraste y tema oscuro:** pensado para fatiga visual y fotosensibilidad.
- **Tipografía Atkinson Hyperlegible**, diseñada para mejorar la legibilidad.

## 1.5 Alcance de esta entrega (Beta)

Incluye:

- 9 módulos funcionales + módulo de progreso + panel.
- 6 flujos de IA generativa a través de un proxy seguro.
- Minería de datos del propio progreso con gráficas hechas a mano.
- PWA instalable con funcionamiento sin conexión para lo local.
- Pruebas automáticas y documentación.

No incluye (ver `11-limitaciones.md`):

- Cuentas de usuario ni sincronización entre dispositivos.
- Base de datos en servidor.
- Integración con portales de empleo reales.
- Validación con usuarios reales ni pruebas de accesibilidad formales.

## 1.6 Relación entre módulos

```
Perfil ─┐
Habilidades ─┼─> CV (generación y adaptación)
Preferencias ─┘        │
                       ▼
Vacante (texto) ──> Requisitos ──> Brecha de habilidades ──┐
                                                            ├─> Progreso (minería)
Entrevistas (simulador) ──> Dificultad por pregunta ────────┤
Checklist / Objetivos ──> Cumplimiento y avance ─────────────┤
Actividad (todas las secciones) ──> Frecuencia semanal ──────┘
                                                            ▼
                                            Recomendaciones + Informe exportable
```
