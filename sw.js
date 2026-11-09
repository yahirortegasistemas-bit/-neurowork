/* NeuroWork — Service Worker
 * ---------------------------------------------------------------------------
 * Estrategia pensada para que la app funcione SIN CONEXIÓN en todo lo que es
 * local (interfaz, datos guardados en el navegador), pero NUNCA sirva desde
 * caché las llamadas a la IA.
 *
 *   - Llamadas a /api/*  -> SIEMPRE a la red (nunca se cachean). Si no hay
 *     conexión, fallan con un error claro; la IA no funciona offline.
 *   - Navegación (HTML)  -> red primero, y si falla, el index cacheado.
 *   - Estáticos propios  -> caché primero, con actualización en segundo plano.
 *
 * Sube la versión de CACHE al cambiar archivos para invalidar la caché vieja.
 */
const CACHE = 'neurowork-v3';

const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './ai.js',
  './analytics.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.indexOf('/api/') === 0 || url.pathname.indexOf('/api/') !== -1;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // no interferir con POST/PUT/DELETE

  const url = new URL(req.url);

  // 1) La IA nunca se sirve de caché.
  if (isApiRequest(url) || url.pathname.indexOf('/api/') !== -1) {
    event.respondWith(fetch(req)); // red directa; si falla, error de red normal
    return;
  }

  // 2) Solo gestionamos peticiones del mismo origen.
  if (url.origin !== self.location.origin) return;

  // 3) Navegación: red primero, con respaldo en el shell cacheado.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // 4) Estáticos: caché primero, y se actualiza en segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// Permite que la página pida activar de inmediato una nueva versión.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
