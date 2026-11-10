# Guion del video de demostración — NeuroWork (Avance 2)

**Duración objetivo:** 2:30–3:00 · **Formato:** 1080p, con voz · **Tono:** claro y pausado.

El video cubre el **flujo principal** (entregable 4 del Avance 2). No necesita ser perfecto:
debe mostrar que el prototipo **se ejecuta** y que sus funciones clave trabajan.

---

## 1. Antes de grabar (lista de comprobación)

- [ ] Servidor activo: en la carpeta del proyecto, `node server\server.js`, y abre `http://127.0.0.1:8787`.
- [ ] **Recarga fuerte** de la app: `Ctrl + Shift + R`.
- [ ] Clave de Gemini configurada en `server/.env` (para que la IA responda en CV y Entrevistas).
- [ ] Datos ya cargados (perfil, habilidades, un CV). Si prefieres datos neutros, pulsa **"Reiniciar datos"** y agrega 3–4 cosas.
- [ ] Cierra notificaciones y pestañas que no uses; deja la app y una pestaña con el repositorio de GitHub.
- [ ] Sube el zoom del navegador a **110 %** (`Ctrl` + `+`) para que el texto se lea bien.
- [ ] Prueba el micrófono y que no haya ruido de fondo.

**Texto de vacante listo para pegar** (en Entrevistas → Entender la vacante):

> Buscamos auxiliar administrativo con manejo de Excel, atención a clientes y organización de documentos. Tiempo completo, modalidad híbrida.

## 2. Herramientas de grabación (Windows)

- **Barra de juegos:** `Win + G` → graba pantalla y micrófono. Atajos: `Win + Alt + R` inicia/detiene. Guarda en `Vídeos\Capturas`.
- Alternativa: **Herramienta de recortes** (`Win + Shift + S` → Grabar) o PowerPoint.

---

## 3. Guion por tomas

| Tiempo | Qué haces en pantalla | Qué dices (aprox.) |
|---|---|---|
| 0:00–0:15 | Estás en **Panel**. | «Hola, soy Yahir. Este es **NeuroWork**, una aplicación web de apoyo a la búsqueda de empleo para personas neurodivergentes. Está hecha con JavaScript y un backend en Node.js, sin dependencias externas.» |
| 0:15–0:30 | Muestra 1 segundo la **terminal** con `node server\server.js` y luego la app abierta. | «El servidor sirve la aplicación y una **base de datos SQLite** local.» |
| 0:30–0:55 | Ve a **Perfil** (muestra experiencia) y a **Habilidades** (nivel 1–5). | «Aquí registro mi perfil, mi experiencia y mis habilidades con un nivel de confianza.» |
| 0:55–1:35 | Ve a **CV**: pulsa **Generar borrador** (IA) → cambia plantilla (**Moderno** → **Ejecutivo**) → **👁 Vista previa** → cierra → **📄 Descargar con diseño**. | «El módulo de CV redacta un borrador con IA a partir de mi perfil, **sin inventar** experiencia. Puedo elegir entre **cuatro diseños**, ver la vista previa y descargarlo.» |
| 1:35–2:05 | Ve a **Entrevistas** → pestaña **Entender la vacante**: pega el texto y pulsa **Analizar vacante**. Si hay tiempo, muestra **Simulador**. | «En Entrevistas, la IA explica la vacante en lenguaje simple y hay un **simulador** con retroalimentación por respuesta.» |
| 2:05–2:30 | **Objetivos** (mueve una barra) → **Checklist** (marca una tarea) → **Progreso** (muestra las gráficas). | «También organizo mis tareas y objetivos, y veo mi **progreso** en gráficas calculadas a partir de mis datos, sin inventar cifras.» |
| 2:30–2:45 | **Privacidad** (señala «Respaldo: base de datos local»). Opcional: abre `http://127.0.0.1:8787/api/db` en otra pestaña. | «Mis datos viven en el navegador y, si el servidor está activo, se **respaldan en una base de datos SQLite** local. Son **veintitrés tablas** relacionales.» |
| 2:45–3:00 | Pestaña con **GitHub** (el repositorio). | «El código y la documentación están en **GitHub**, con **cuarenta y una pruebas automáticas**. Gracias.» |

---

## 4. Qué NO decir

- ❌ No digas «tiene **login**»: no existe, es una **decisión de privacidad** (*local-first*). Si te preguntan, eso se explica.
- ❌ No digas que está «terminado al 100 %»: es un **avance**. Di «prototipo funcional en fase operativa inicial».

## 5. Consejos para que se vea bien

- Mueve el ratón **despacio** y espera a que cargue la IA antes de hablar de ella (puede tardar 2–4 s).
- Si la IA falla (sin clave), **sáltate** esos pasos y muestra solo la pestaña **Preparación** (la guía funciona siempre); menciona que la IA se demuestra en el informe.
- No edites el video si no quieres; un solo plano continuo es válido.

## 6. Después de grabar

1. Guarda el archivo como `NeuroWork-avance2-demo.mp4`.
2. Súbelo a **YouTube (No listado)** o **Google Drive** y copia el enlace.
3. Pega el enlace en `informe/AVANCE-2.md`, sección 4, en la fila **«Video de demostración»**.
4. Avísame y lo dejo enlazado también en el PDF Springer y en el repositorio.
