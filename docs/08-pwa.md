# 08 · PWA (aplicación web progresiva)

## 8.1 Qué aporta

Una PWA permite **instalar** la aplicación en el dispositivo (escritorio o móvil) y
usarla como una app nativa, además de funcionar **sin conexión** para las funciones
que no dependen de internet.

En NeuroWork esto tiene sentido porque gran parte del trabajo (rellenar el perfil,
registrar habilidades, revisar el checklist, leer las notas) es **local** y no
necesita red.

## 8.2 Componentes

### `manifest.webmanifest`

```json
{
  "name": "NeuroWork — Apoyo laboral para personas neurodivergentes",
  "short_name": "NeuroWork",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#F1F4EF",
  "theme_color": "#2F6259",
  "icons": [ "...192, 512 y 512 maskable..." ]
}
```

- `display: standalone` → se abre sin la barra del navegador.
- Iconos de 192 y 512 px, más una versión *maskable* (con la marca dentro de la zona
  segura, para recortes circulares de Android).
- `theme_color` y `background_color` coherentes con el diseño.

### `sw.js` (Service Worker)

Estrategias de caché, deliberadamente diferenciadas:

| Tipo de petición | Estrategia | Motivo |
|---|---|---|
| `/api/*` | **Siempre red, nunca caché** | La IA es un servicio en vivo; cachear respuestas sería incorrecto y confuso |
| Navegación (HTML) | Red primero; si falla, el `index.html` cacheado | Permite abrir la app sin conexión |
| Estáticos propios (CSS, JS, iconos) | Caché primero + actualización en segundo plano | Arranque instantáneo y offline |
| Otros orígenes (p. ej. Google Fonts) | No se interceptan | No se asume responsabilidad sobre terceros |

El *precache* del `install` incluye:

```
./ , ./index.html , ./styles.css , ./ai.js , ./analytics.js , ./app.js ,
./manifest.webmanifest , ./icons/*.png
```

La caché se versiona (`neurowork-v3`). Al cambiar archivos hay que **subir la
versión** para invalidar la caché anterior; el `activate` borra las cachés viejas.

### Registro

En `index.html`, tras cargar los scripts:

```js
if ('serviceWorker' in navigator &&
    (location.protocol === 'http:' || location.protocol === 'https:')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
```

Nota: en `file://` **no** se registra (igual que la IA), porque los service workers
requieren un contexto seguro.

## 8.3 Iconos

Los iconos se generan con un script propio **sin librerías externas**
(`tools/make-icons.py`, solo `zlib` y `struct` de Python). Dibuja una pequeña "red
neuronal" (nodos y conexiones) sobre el color primario, con supersampling 4× para
bordes suaves.

```
icons/icon-192.png           192×192
icons/icon-512.png           512×512
icons/icon-512-maskable.png  512×512 (marca al 78 % para la zona segura)
icons/apple-touch-icon.png   180×180
```

Regenerar (opcional):

```bash
python3 tools/make-icons.py
```

## 8.4 Qué funciona sin conexión y qué no

| Función | ¿Offline? |
|---|---|
| Abrir la app (shell) | ✅ |
| Ver y editar perfil, habilidades, checklist, objetivos, preferencias | ✅ |
| Ver el módulo Progreso con datos ya guardados | ✅ |
| Leer el historial de simulacros y reuniones | ✅ |
| **Generar CV, adaptar CV, simulacro, explicar vacante, redacción, pasos** | ❌ (necesitan la IA) |

Cuando no hay conexión, un flujo de IA falla mostrando un mensaje claro; la
aplicación **no intenta servir una respuesta falsa desde la caché**.

## 8.5 Cómo instalar

**Chrome / Edge (escritorio):** aparece un icono de instalación en la barra de
direcciones (o menú ⋮ → "Instalar NeuroWork").

**Android:** menú ⋮ → "Añadir a pantalla de inicio".

> La instalación solo está disponible cuando la app se sirve por `http://localhost`
> o `https://`. Con `file://` no es posible.

## 8.6 Cómo comprobar que la PWA funciona

1. Arranca el servidor y abre `http://127.0.0.1:8787`.
2. F12 → *Application* → *Manifest*: debe leerse el manifiesto sin errores.
3. *Application* → *Service Workers*: debe aparecer `sw.js` **activated**.
4. *Application* → *Cache Storage*: debe existir `neurowork-v3` con los estáticos.
5. *Network* → marca "Offline" y recarga: la app debe seguir abriéndose.
6. Con "Offline" activo, prueba el simulador: debe fallar con un mensaje de error
   (comportamiento correcto: la IA no funciona offline).
