/**
 * Wedu 3.0 — Service Worker
 * Provides offline capability and enables the PWA install prompt on Android.
 * Strategy: stale-while-revalidate for static assets, network-first for API/data.
 */

const CACHE_NAME = 'wedu-3-v1';

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// ── Install: pre-cache app shell ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: smart caching ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-only for API routes and Next.js internals
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.includes('__nextjs')
  ) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Stale-while-revalidate for everything else
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok && response.type !== 'opaque') {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => cached ?? new Response('', { status: 503 }));

      return cached ?? networkFetch;
    })
  );
});
