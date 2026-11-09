# 02 · Instalación, configuración y ejecución

## 2.1 Requisitos

| Elemento | Mínimo | Probado con |
|---|---|---|
| Node.js | 18 | 22.21.0 |
| Navegador | Chrome/Edge/Firefox modernos | Chrome |
| Dependencias npm | ninguna | — |

El proyecto **no tiene dependencias externas**. Todo se ejecuta con la biblioteca
estándar de Node y JavaScript del navegador.

> La base de datos usa el módulo nativo `node:sqlite`, disponible desde **Node 22**.
> Con Node 18/20 la app funciona igual usando solo `localStorage` (el respaldo en
> base de datos se desactiva solo). Ver `13-base-de-datos.md`.

## 2.2 Obtener una clave de Gemini

1. Entra en <https://aistudio.google.com/app/apikey> con una cuenta de Google.
2. Crea una **API key** ("Create API key").
3. Copia el valor. Hoy Google emite claves con dos formatos posibles:
   - Antiguo: empieza por `AIza...`
   - Nuevo: empieza por `AQ....`

Ambos son válidos. El servidor acepta los dos.

> La IA es **opcional** para explorar la app: sin clave, todos los módulos funcionan
> salvo los botones que llaman al modelo (que muestran un aviso claro).

## 2.3 Configurar el servidor

El servidor lee la clave desde el archivo `server/.env`. Nunca desde el navegador.

```bash
cp server/.env.example server/.env
```

Edita `server/.env`:

```ini
GEMINI_API_KEY=tu_clave_real
GEMINI_MODEL=gemini-2.5-flash
PORT=8787
HOST=127.0.0.1
```

### Precedencia de la configuración

`server/.env` **tiene prioridad** sobre las variables de entorno del sistema.
Esto permite corregir la clave editando el archivo, sin tocar la configuración
de Windows/macOS/Linux.

### Sobre las variables de entorno del sistema

Si defines `GEMINI_API_KEY` como variable de entorno del sistema (por ejemplo en
Windows con `setx`), el servidor también la detecta. El endpoint `/api/health`
indica de dónde tomó la clave con el campo `keySource` (`file` o `system`).

## 2.4 Arrancar

```bash
# Opción A (recomendada)
npm start

# Opción B
node server/server.js
```

Salida esperada:

```
  NeuroWork — servidor activo
  ------------------------------------------------
  Abre:      http://127.0.0.1:8787
  Modelo:    gemini-2.5-flash
  Clave API: parece válida  [fuente: file]
  Base datos: server/data/neurowork.db  [sqlite]
```

Abre <http://127.0.0.1:8787> en el navegador.

> ⚠️ **No abras `index.html` con doble clic.** Eso usa el protocolo `file://`, en el
> que no existe el servidor: la IA fallaría con "Failed to fetch" y la PWA no se
> registraría. La aplicación detecta este caso y muestra un mensaje explicativo.

## 2.5 Comprobar el estado de la IA

```
http://127.0.0.1:8787/api/health
```

```json
{
  "ok": true,
  "model": "gemini-2.5-flash",
  "keyConfigured": true,
  "keySource": "file",
  "keyLooksValid": true,
  "db": { "engine": "sqlite", "file": "server/data/neurowork.db" }
}
```

Significado:

| Campo | Interpretación |
|---|---|
| `keyConfigured: false` | No hay clave. Copia `.env.example` a `.env` y escríbela. |
| `keyLooksValid: false` | El formato no parece de Gemini, o la clave está caducada. |
| `keySource: "file"` | La clave viene de `server/.env` (lo habitual). |
| `keySource: "system"` | La clave viene de una variable de entorno del sistema. |

Además, la app muestra un **banner superior** si detecta problemas, y el botón
🩺 **Diagnóstico** (barra lateral) muestra un panel con información técnica
(también sin revelar nunca el valor de la clave).

## 2.6 Errores frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| "No se pudo conectar con el servidor" | El servidor no está arrancado, o abriste el HTML con el protocolo `file://`. | Arranca `npm start` y abre `http://127.0.0.1:8787`. |
| Error 401 `invalid_key` | La clave es inválida, caducada o revocada. | Genera una nueva en AI Studio y actualiza `server/.env`. Reinicia el servidor. |
| Error 429 | Demasiadas peticiones (límite: 30 por minuto y por IP). | Espera un minuto. |
| Error 503 | El servicio de Gemini está saturado. | El cliente reintenta automáticamente con espera progresiva. |
| El puerto 8787 está ocupado | Otra instancia del servidor sigue abierta. | Cambia `PORT` en `server/.env` o cierra el proceso anterior. |

### Cerrar el servidor en Windows

```bat
netstat -ano | findstr :8787
taskkill /F /PID <PID>
```

## 2.7 Ejecutar las pruebas

```bash
npm test        # node --test
```

No requiere red ni clave de API. Deben pasar **41 pruebas** (analítica, documentos de
CV, base de datos y API HTTP).

## 2.8 Base de datos (opcional)

Si el servidor está activo, el estado se respalda en una base de datos SQLite local.

```bash
# Esquema y conteo de filas por tabla (sin necesidad de servidor)
node tools/db-info.js

# Con el servidor activo
curl http://127.0.0.1:8787/api/db        # motor y tablas
curl http://127.0.0.1:8787/api/state     # estado respaldado
```

El archivo `server/data/neurowork.db` se crea solo al primer uso y **no** se sube al
repositorio (está en `.gitignore`). Ver `13-base-de-datos.md`.
