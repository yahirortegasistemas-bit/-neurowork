// server/server.js — Proxy seguro para Gemini + servidor estático de NeuroWork
// ---------------------------------------------------------------------------
// Objetivo de seguridad: la clave de API NUNCA vive en el navegador.
// El front-end (ai.js) llama a /api/gemini y este servidor añade la clave
// desde una variable de entorno (server/.env), que no se publica.
//
// Sin dependencias externas. Requiere Node 18+ (por fetch y node: prefix).
// Uso:  node server/server.js     (o: npm start dentro de /server)

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const dbModule = require('./db');

/* ----------------------------- cargar .env ------------------------------ */
// Precedencia: server/.env GANA sobre las variables de entorno del sistema.
// Así puedes corregir la clave creando/actualizando server/.env sin tocar Windows.
const ENV_SOURCE = {}; // clave -> 'file' | 'system'
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][\w.]*)\s*=\s*(.*)\s*$/);
      if (!m) return;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val !== '') { process.env[key] = val; ENV_SOURCE[key] = 'file'; }
    });
  }
  ['GEMINI_API_KEY', 'GEMINI_MODEL', 'PORT', 'HOST'].forEach((k) => {
    if (!ENV_SOURCE[k] && process.env[k]) ENV_SOURCE[k] = 'system';
  });
})();

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ROOT = path.resolve(__dirname, '..');

// Fuente y aspecto de la credencial (para diagnóstico; nunca se expone el valor).
const KEY_SOURCE = ENV_SOURCE['GEMINI_API_KEY'] || (GEMINI_API_KEY ? 'system' : 'none');
function keyLooksValid(k) {
  // Formatos aceptados por Gemini: "AIza..." y "AQ....." (claves nuevas).
  return /^(AIza[0-9A-Za-z_\-]{10,}|AQ\.[0-9A-Za-z_\-.]{20,})$/.test(k || '');
}
function keyHint() {
  if (!GEMINI_API_KEY) return 'FALTA';
  return keyLooksValid(GEMINI_API_KEY) ? 'parece válida' : 'NO parece una API key de Gemini';
}
const MAX_BODY = 256 * 1024; // 256 KB por petición (IA)
const MAX_STATE_BODY = 4 * 1024 * 1024; // 4 MB para el estado completo del usuario

/* ------------------------- base de datos (SQLite) ----------------------- */
// Se abre de forma perezosa: importar este módulo (p. ej. en pruebas) no crea
// ningún archivo hasta que se usa realmente /api/state o /api/db.
let _db = null;
function getDb() {
  if (!_db) _db = dbModule.openDatabase();
  return _db;
}

/* --------------------------- límite de peticiones ----------------------- */
// Ventana de 60s. Evita que la clave sea abusada si la app queda expuesta.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 30;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, reset: now + RATE_WINDOW_MS };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW_MS; }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > RATE_MAX;
}

/* -------------------------------- helpers ------------------------------- */
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req, max) {
  const limit = max || MAX_BODY;
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('payload_too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* ------------------------- proxy hacia Gemini --------------------------- */
async function callGeminiUpstream(prompt, wantJson) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      ...(wantJson ? { responseMimeType: 'application/json' } : {})
    }
  };

  const MAX_RETRIES = 4;
  const BASE_DELAY = 1200;
  let lastErr = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES - 1) { await sleep(BASE_DELAY * Math.pow(2, attempt)); continue; }
      throw e;
    }

    if (resp.status === 503 || resp.status === 429) {
      lastErr = new Error('upstream_busy_' + resp.status);
      if (attempt < MAX_RETRIES - 1) { await sleep(BASE_DELAY * Math.pow(2, attempt)); continue; }
      throw lastErr;
    }

    if (!resp.ok) {
      const errText = await resp.text();
      const err = new Error('Gemini error ' + resp.status + ': ' + errText.slice(0, 400));
      err.status = resp.status;
      throw err;
    }

    const data = await resp.json();
    const text = (data && data.candidates && data.candidates[0]
      && data.candidates[0].content && data.candidates[0].content.parts)
      ? data.candidates[0].content.parts.map((p) => p.text || '').join('')
      : '';
    return text.trim();
  }
  throw lastErr || new Error('unknown');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function handleGemini(req, res) {
  const ip = (req.socket.remoteAddress || 'unknown');
  if (rateLimited(ip)) return sendJson(res, 429, { error: 'Demasiadas peticiones. Intenta en un minuto.' });
  if (!GEMINI_API_KEY) {
    return sendJson(res, 500, { error: 'Falta GEMINI_API_KEY. Copia server/.env.example a server/.env y coloca tu clave.' });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (e) {
    return sendJson(res, 400, { error: 'JSON inválido o demasiado grande.' });
  }

  const prompt = payload && typeof payload.prompt === 'string' ? payload.prompt : '';
  if (!prompt.trim()) return sendJson(res, 400, { error: 'Falta el campo "prompt".' });

  try {
    // Nota de privacidad: no registramos el contenido del prompt en el servidor.
    const text = await callGeminiUpstream(prompt, !!payload.json);
    return sendJson(res, 200, { text });
  } catch (e) {
    const isAuth = e.status === 401 || e.status === 403;
    return sendJson(res, 502, {
      code: isAuth ? 'invalid_key' : 'upstream_error',
      error: isAuth
        ? 'La clave de Gemini fue rechazada (401). Revisa que sea una API key válida de Google AI Studio y colócala en server/.env'
        : (e.message || 'Error al contactar al modelo.')
    });
  }
}

/* ----------------------- persistencia de estado ------------------------- */
// El frontend guarda su estado (perfil, CV, entrevistas, etc.) en tablas
// relacionales. Este endpoint permite respaldarlo/recuperarlo en la BD local.

const WORKSPACE_RE = /^[A-Za-z0-9_-]{1,40}$/;

function workspaceFrom(url) {
  const ws = url.searchParams.get('workspaceId') || dbModule.DEFAULT_WORKSPACE;
  return WORKSPACE_RE.test(ws) ? ws : dbModule.DEFAULT_WORKSPACE;
}

async function handleGetState(req, res, url) {
  const ws = workspaceFrom(url);
  try {
    const state = dbModule.loadState(getDb(), ws);
    return sendJson(res, 200, { ok: true, workspaceId: ws, exists: !!state, state: state });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: 'No se pudo leer el estado: ' + e.message });
  }
}

async function handlePutState(req, res, url) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req, MAX_STATE_BODY));
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: e.message === 'payload_too_large' ? 'El estado es demasiado grande.' : 'JSON inválido.' });
  }
  const ws = WORKSPACE_RE.test(payload.workspaceId || '') ? payload.workspaceId : dbModule.DEFAULT_WORKSPACE;
  if (!payload.state || typeof payload.state !== 'object') {
    return sendJson(res, 400, { ok: false, error: 'Falta el campo "state".' });
  }
  try {
    const out = dbModule.saveState(getDb(), ws, payload.state);
    return sendJson(res, 200, { ok: true, workspaceId: out.workspaceId, savedAt: out.savedAt });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: 'No se pudo guardar el estado: ' + e.message });
  }
}

async function handleDeleteState(req, res, url) {
  const ws = workspaceFrom(url);
  try {
    dbModule.deleteState(getDb(), ws);
    return sendJson(res, 200, { ok: true, workspaceId: ws, deleted: true });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: 'No se pudo borrar el estado: ' + e.message });
  }
}

async function handleDbInfo(req, res) {
  try {
    const db = getDb();
    return sendJson(res, 200, {
      ok: true,
      engine: 'sqlite',
      file: path.relative(ROOT, dbModule.DEFAULT_DB_PATH).split(path.sep).join('/'),
      schemaVersion: dbModule.SCHEMA_VERSION,
      tables: dbModule.tableCounts(db)
    });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: 'Base de datos no disponible: ' + e.message });
  }
}

/* --------------------------- servidor estático -------------------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';

  const filePath = path.normalize(path.join(ROOT, rel));
  // Evita salir del directorio del proyecto.
  if (!filePath.startsWith(ROOT)) return sendJson(res, 403, { error: 'Prohibido' });

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — No encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* --------------------------------- server ------------------------------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/gemini') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' });
    handleGemini(req, res).catch((e) => sendJson(res, 500, { error: e.message }));
    return;
  }

  if (url.pathname === '/api/state') {
    if (req.method === 'GET') { handleGetState(req, res, url).catch((e) => sendJson(res, 500, { error: e.message })); return; }
    if (req.method === 'PUT') { handlePutState(req, res, url).catch((e) => sendJson(res, 500, { error: e.message })); return; }
    if (req.method === 'DELETE') { handleDeleteState(req, res, url).catch((e) => sendJson(res, 500, { error: e.message })); return; }
    return sendJson(res, 405, { error: 'Método no permitido' });
  }

  if (url.pathname === '/api/db') {
    handleDbInfo(req, res).catch((e) => sendJson(res, 500, { error: e.message }));
    return;
  }

  if (url.pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      model: GEMINI_MODEL,
      keyConfigured: !!GEMINI_API_KEY,
      keySource: KEY_SOURCE,
      keyLooksValid: keyLooksValid(GEMINI_API_KEY),
      db: { engine: 'sqlite', file: 'server/data/neurowork.db' }
    });
  }

  serveStatic(req, res, url.pathname);
});

// Solo arranca si se ejecuta directamente (permite importarlo en pruebas).
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log('');
    console.log('  NeuroWork — servidor activo');
    console.log('  ------------------------------------------------');
    console.log('  Abre:      http://' + HOST + ':' + PORT);
    console.log('  Modelo:    ' + GEMINI_MODEL);
    console.log('  Clave API: ' + keyHint() + '  [fuente: ' + KEY_SOURCE + ']');
    console.log('  Base datos: ' + path.relative(ROOT, dbModule.resolveDbPath()).split(path.sep).join('/') + '  [sqlite]');
    console.log('');
    if (!keyLooksValid(GEMINI_API_KEY)) {
      console.log('  >>> La IA no generará hasta que haya una API key válida.');
      console.log('  >>> Crea una en https://aistudio.google.com/app/apikey');
      console.log('  >>> y escríbela en server/.env  ->  GEMINI_API_KEY=...');
      console.log('');
    }
  });
}

module.exports = { keyLooksValid, keyHint, MIME, server, ROOT, getDb, dbModule, DEFAULT_WORKSPACE: dbModule.DEFAULT_WORKSPACE };
