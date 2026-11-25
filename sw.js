const CACHE_NAME = 'o7-v2';
const ASSETS = [
  './',
  './index.html',
  './egyenlet.html',
  './favicon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './site.webmanifest',
];

const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
];

// On install: pre-cache all local assets + best-effort cache external CDN scripts
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(ASSETS);
      await Promise.all(
        EXTERNAL_ASSETS.map((url) =>
          fetch(new Request(url, { mode: 'no-cors' }))
            .then((res) => cache.put(url, res))
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

// On activate: delete old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// On fetch: serve from cache first while refreshing in background when online
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((response) => {
          if (response && (response.ok || response.type === 'opaque')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });

      return cached || fetchPromise;
    })
  );
});
