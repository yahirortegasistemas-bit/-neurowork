# 11 · Limitaciones

Documentar lo que **no** hace el proyecto es parte de hacerlo bien. Estas son las
limitaciones reales de esta entrega.

---

## 11.1 Datos y persistencia

- **Persistencia local.** Los datos viven en `localStorage` del navegador y, si el
  servidor está activo, se respaldan en una base de datos **local** (SQLite).
  No hay cuentas ni sincronización entre dispositivos.
- **Se pierden al limpiar el navegador.** Borrar los datos del sitio, usar modo
  incógnito o cambiar de navegador implica empezar de cero en el cliente (el respaldo
  del servidor permite recuperarlos si sigue existiendo).
- **Sin exportación/importación del estado completo** (solo el informe de progreso,
  el CV en `.doc` y el respaldo interno de la base de datos).
- **Base de datos local, no remota.** No hay servidor en la nube: el `workspace` es
  único (`local`) y la base no se comparte entre equipos.
- **`node:sqlite` es experimental** en Node 22: emite un aviso y su API podría cambiar.

## 11.2 Inteligencia artificial

- **No funciona sin conexión.** La IA es un servicio externo (Google Gemini).
- **Requiere clave propia.** Sin una `GEMINI_API_KEY` válida, los flujos de IA no
  generan nada (el resto de la app sí funciona).
- **Puede fallar o tardar.** El servicio puede devolver 429/503; el cliente reintenta
  con espera progresiva, pero no hay garantía de éxito.
- **Salidas no deterministas.** La misma entrada puede producir textos distintos.
  El CV "adaptado" debe **revisarse siempre** antes de usarlo.
- **Riesgo de invención (alucinación).** Los *prompts* prohíben inventar datos y el
  CV adaptado no se aplica sin confirmación, pero **no se puede garantizar** que el
  modelo nunca añada información no aportada. La persona debe revisar el resultado.
- **Sin filtros de contenido propios.** Se delega en las políticas del proveedor.
- **Un único modelo** (`gemini-2.5-flash`), configurable solo por variable de entorno.

## 11.3 Minería de datos

- **Basada solo en lo que la persona registra.** Si no hay actividad o no se marcan
  dificultades, los indicadores aparecen vacíos. No se infiere nada.
- **Sin análisis estadístico avanzado.** Son agregaciones, medias y recuentos; no hay
  correlaciones, predicciones ni agrupamiento (clustering).
- **La evolución temporal necesita días distintos de uso.** Con un solo registro, la
  gráfica de tendencia se sustituye por un estado vacío (deliberadamente).
- **Etiquetas de los gráficos (fechas) pueden solaparse** si hay muchas semanas en
  pantallas estrechas.
- **El nombre de la semana es su lunes**, no un número de semana ISO.

## 11.4 Accesibilidad

- Se usan atributos `aria-label`, `aria-live` en avisos y foco visible, pero **no se
  ha hecho una auditoría formal** (por ejemplo con un lector de pantalla real).
- **Contraste:** se ha buscado alto contraste, pero no se ha medido con una
  herramienta específica (WCAG AA/AAA) en todos los elementos.
- **Sin pruebas con usuarios neurodivergentes reales.** Las decisiones de diseño se
  basan en criterios razonados, no en evidencia empírica recogida.

## 11.5 Compatibilidad

- **Desarrollado y probado principalmente en Chrome** (escritorio, Windows).
- Usa funciones modernas de JavaScript y `color-mix()` en CSS; navegadores muy
  antiguos podrían no renderizar el radar exactamente igual.
- **Service Worker limitado a contextos seguros** (`http://localhost` o `https://`);
  con `file://` no se registra.

## 11.6 Despliegue y seguridad

- **Pensado para uso local.** El servidor escucha en `127.0.0.1` por defecto, sin
  HTTPS ni autenticación.
- El **límite de peticiones es básico** (por IP, en memoria): reiniciar el servidor
  lo reinicia, y no hay control distribuido.
- **Sin roles ni permisos** (no hay cuentas).
- Si se expone a internet, deberían añadirse HTTPS, autenticación y un proxy inverso.

## 11.7 Proceso de ingeniería

- **Repositorio Git público** en GitHub:
  <https://github.com/yahirortegasistemas-bit/-neurowork> (rama `main`, con historial de
  cambios).
- **No hay pipeline de integración continua** ni *linter* configurado. La validación
  automática se reduce a las pruebas de `npm test` y a `node --check` (sintaxis).
- **Cobertura de pruebas parcial:** se cubre la lógica pura de `analytics.js`, la
  generación de documentos, la base de datos (`server/db.js`) y la API HTTP
  (`tests/api.test.js`). La manipulación del DOM en `app.js` **no** está cubierta
  por pruebas automáticas (requeriría un entorno de navegador).
- Los **iconos** se generan con un script propio; no es un diseño gráfico profesional.

## 11.8 Legales y éticos

- Las ofertas y datos personales introducidos **no se usan más allá de la propia
  sesión y el envío al modelo** para generar la respuesta solicitada.
- La retroalimentación de entrevistas es **orientativa** y no constituye una
  evaluación profesional ni una decisión de contratación (la app lo advierte).
- **Uso académico.** No se recomienda su uso en producción sin revisar privacidad,
  accesibilidad y seguridad de extremo a extremo.

---

## Lo que sí puede afirmarse con seguridad

- La clave de API **no se expone** en el navegador (verificado).
- Las gráficas **se calculan a partir de los datos reales** y hay pruebas que lo
  comprueban.
- Los tres caminos de IA verificados (texto, JSON de requisitos, JSON de preguntas)
  **devuelven respuestas válidas** a través del proxy.
- El servidor sirve manifest, service worker e iconos con los tipos correctos.
- La **base de datos relacional** guarda y recupera el estado completo (verificado por
  `tests/db.test.js` y `tests/api.test.js`): 23 tablas, con foráneas y borrado en cascada.
- La app sigue funcionando **sin base de datos** (solo localStorage): la BD es un
  respaldo opcional, no un requisito.
- Todos los módulos funcionan **sin conexión salvo** las acciones que llaman a la IA.
