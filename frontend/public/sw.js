// MY News Sentiment — Service Worker
// Feature 18: Offline mode with cache-first strategy

const VERSION = 'v1';
const STATIC_CACHE = `mns-static-${VERSION}`;
const RUNTIME_CACHE = `mns-runtime-${VERSION}`;
const API_CACHE = `mns-api-${VERSION}`;

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/offline.html',
];

const MAX_API_ENTRIES = 30;
const MAX_RUNTIME_ENTRIES = 80;

// ─── Install ───────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

// ─── Activate ──────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── LRU trim helper ───────────────────────────────────────────────────
const trimCache = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((req) => cache.delete(req)));
  }
};

// ─── Fetch strategies ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin (except known CDNs), chrome-extension
  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;

  // Strategy 1: Navigation (HTML) → network-first, fall back to cached index or offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Strategy 2: API calls → network-first with cache fallback (only same-origin /api)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(API_CACHE).then(async (cache) => {
              await cache.put(request, copy);
              await trimCache(API_CACHE, MAX_API_ENTRIES);
            });
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Strategy 3: Static assets (JS/CSS/fonts/images) → cache-first
  const dest = request.destination;
  if (['style', 'script', 'font', 'image'].includes(dest)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            if (res.ok && (url.origin === self.location.origin || dest === 'font' || dest === 'image')) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then(async (cache) => {
                await cache.put(request, copy);
                await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
              });
            }
            return res;
          })
          .catch(() => {
            if (dest === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-family="sans-serif" font-size="10">offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            return new Response('', { status: 504 });
          });
      })
    );
    return;
  }

  // Default: just fetch
});

// ─── Manual cache messages from app ────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});
