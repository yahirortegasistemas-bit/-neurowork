# 07 · Seguridad: manejo de la clave de API

## 7.1 El riesgo

En una aplicación web, **todo lo que llega al navegador es público**. Cualquier
persona puede abrir las herramientas de desarrollo y leer el código fuente.

Si una clave de API de Gemini estuviera en un archivo servido al navegador
(`ai.js`, `app.js`…), cualquiera podría:

- copiarla y usarla con cargo a la cuenta propietaria,
- agotar la cuota,
- y en caso de facturación, generar gastos.

**Esto es exactamente lo que ocurre cuando se llama a Gemini directamente desde el
frontend.**

## 7.2 La solución aplicada: proxy en el servidor

```
Navegador                          Servidor (Node)                    Google
─────────                          ───────────────                    ──────
fetch('/api/gemini', {prompt}) ──► POST /api/gemini
                                   añade  x-goog-api-key: <CLAVE> ──► Gemini API
                                   lee la clave de server/.env
                        ◄────────  devuelve { text }             ◄────
```

- La clave vive en **`server/.env`**.
- `server/.env` está en **`.gitignore`** (no se sube a ningún repositorio).
- `server/.env.example` es la plantilla y **no contiene ninguna clave real**.
- `ai.js` **no contiene la clave**: solo llamadas a `/api/gemini`.
- El endpoint `/api/health` informa del **estado** de la clave
  (`keyConfigured`, `keySource`, `keyLooksValid`) pero **nunca de su valor**.

## 7.3 Comprobaciones en el servidor

| Medida | Implementación |
|---|---|
| Sin dependencias externas | Solo módulos nativos de Node (`http`, `fs`, `path`, `node:sqlite`) |
| Límite de tamaño | 256 KB por petición de IA (`MAX_BODY`); 4 MB para el estado |
| Límite de frecuencia | 30 peticiones/minuto por IP (`RATE_MAX`, `RATE_WINDOW_MS`) |
| Solo POST en el proxy | Métodos distintos devuelven `405` |
| Validación del cuerpo | Se exige un campo `prompt` no vacío |
| Sin registro de contenido | El servidor no guarda los *prompts* |
| Enlace a directorio restringido | El servidor estático impide salir de la carpeta del proyecto |
| Mensajes de error claros | Un 401 se traduce a `code: "invalid_key"` con instrucciones |
| Diagnóstico sin filtrar | `/api/health` no expone la clave |
| Identificador de espacio validado | `/api/state` acepta solo `[A-Za-z0-9_-]{1,40}` |
| Consultas parametrizadas | `server/db.js` usa sentencias preparadas (sin concatenar SQL) |
| Base de datos fuera del repositorio | `server/data/*.db` está en `.gitignore` |

Fragmento del control de acceso a archivos:

```js
const filePath = path.normalize(path.join(ROOT, rel));
if (!filePath.startsWith(ROOT)) return sendJson(res, 403, { error: 'Prohibido' });
```

## 7.4 Comprobación práctica

1. Abre la app en `http://127.0.0.1:8787`.
2. Abre las herramientas de desarrollo (F12) → pestaña *Network*.
3. Mira **todas** las peticiones: a `/api/gemini` solo viaja
   `{ "prompt": "..." }`. La cabecera `x-goog-api-key` **no aparece**.
4. Busca en los archivos servidos (`ai.js`, `app.js`, `analytics.js`, `index.html`):
   no hay ninguna clave.

```bash
# En los archivos que se sirven al navegador no debe haber claves:
grep -rn "AIza\|GEMINI_API_KEY" ai.js app.js analytics.js index.html styles.css
# (sin resultados)

# En todo el proyecto, las únicas apariciones deben ser la plantilla y las pruebas:
grep -rn "AIza" .        # solo en server/server.js (regex de validación) y tests/
```

## 7.5 Buenas prácticas para quien despliegue la app

1. **Nunca** subir `server/.env` a un repositorio (ya está en `.gitignore`).
2. Si una clave se expuso alguna vez (chat, captura, repositorio), **revocarla y
   generar una nueva** en Google AI Studio.
3. En producción, colocar el proxy detrás de HTTPS y mantener el límite de peticiones.
4. Restringir la clave en la consola de Google si el proveedor lo permite.

## 7.6 Nota sobre claves ya expuestas

Durante el desarrollo, una clave apareció escrita en un archivo que se servía al
navegador. Se sustituyó por el proxy aquí descrito. **Cualquier clave que haya estado
en texto plano debe considerarse comprometida y revocarse.**

## 7.7 Privacidad de los datos personales

- Los datos de la persona se guardan **primero en su navegador** (localStorage).
- Si el servidor está activo, se **respaldan** en una base de datos SQLite **local**
  (`server/data/neurowork.db`), en el propio equipo. No hay servidor en la nube.
- La base de datos **no se sube al repositorio** (`.gitignore`) y no hay cuentas ni
  autenticación: es un modelo *local-first* con un único espacio llamado `local`.
- Lo único que sale del dispositivo es el texto enviado al modelo en los flujos de IA.
- El módulo *Privacidad* de la app explica todo esto e indica si el respaldo está activo.
- Ver `13-base-de-datos.md` para el esquema y `14-manual-usuario.md` para el control
  de datos por parte de la persona usuaria.
