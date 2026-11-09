# 15 · Plan de trabajo para la fase final

Documento de planeación del cierre del proyecto (posterior al Avance 2).

## 15.1 Estado de partida

- Prototipo funcional con 11 módulos, IA integrada por proxy seguro y base de datos
  relacional (SQLite) conectada.
- **41 pruebas automáticas** aprobadas (analítica, documentos de CV, base de datos y API).
- Documentación técnica `docs/01–15` + README.

## 15.2 Qué queda por hacer

| # | Actividad | Entregable final | Tiempo estimado | Recursos |
|---|---|---|---|---|
| 1 | **Validación con usuarios** (2–3 personas neurodivergentes) | Informe de usabilidad: tareas, hallazgos, mejoras | 4–5 días | Guion de tareas, registro, consentimiento |
| 2 | **Exportación a PDF** del CV (conservando diseño y márgenes) | Botón "Descargar PDF" + pruebas | 2–3 días | `print` CSS / vista de impresión |
| 3 | **Migración y respaldo de la BD** | Script de migración + endpoint de importación | 2 días | `server/db.js`, `node:sqlite` |
| 4 | **Pruebas E2E completas** | Checklist `docs/09` marcado con evidencias | 2 días | Navegador, capturas |
| 5 | **Refinamiento UI/UX** según validación | Ajustes documentados | 3 días | `styles.css`, `app.js` |
| 6 | **Accesibilidad**: revisión con heurísticas (WCAG 2.2 AA) | Informe de conformidad + correcciones | 2–3 días | `docs/12`, `tools/contrast-check.js` |
| 7 | **Documentación final y memoria** | Memoria del proyecto + diagramas | 4–5 días | LaTeX (Springer LNCS) |
| 8 | **Presentación y demo** | Diapositivas + video de 3–5 min | 2 días | Grabador de pantalla |

**Tiempo total estimado:** ~4 semanas de trabajo individual.

## 15.3 Entregables planeados para la entrega final

1. Prototipo web completo (ejecutable con `npm start`, instalable como PWA).
2. Base de datos relacional con esquema, migración y respaldo.
3. Suite de pruebas automáticas (unitarias + integración) en verde.
4. Memoria técnica con arquitectura, módulos, base de datos y resultados de validación.
5. Manual de usuario final.
6. Evidencias: repositorio, capturas, video de demostración.

## 15.4 Recursos y supuestos

- **Tecnológicos:** Node.js 22+, navegador moderno, sin dependencias externas
  (solo módulos nativos de Node). Se fijará la versión de Node por el carácter
  experimental de `node:sqlite`.
- **Humanos:** desarrollo individual + asesoría del profesor; usuarios voluntarios
  para la validación.
- **Supuestos:** disponibilidad de participantes para la prueba de usabilidad;
  clave de Gemini válida y con cuota suficiente.

## 15.5 Riesgos y mitigación

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Falta de usuarios para validar | Media | Plan B: revisión heurística con pares |
| Cambios en `node:sqlite` (experimental) | Baja | Fijar versión de Node; alternativa: respaldo en JSON |
| Cuota/credencial de IA | Media | Reintentos ya implementados; mensajes claros |
| Tiempo insuficiente | Media | Priorizar 1, 2, 4 y 7 |
