/**
 * Wedu 3.0 — Service Worker
 * Provides offline capability and enables the PWA install prompt on Android.
 * Strategy: stale-while-revalidate for static assets, network-first for API/data.
 */

const CACHE_NAME = 'wedu-3-v4';

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = ['/manifest.json', '/RA-logo.svg'];

// ── Install: pre-cache app shell ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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

  // Let browser/extensions handle non-http(s) requests.
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Never cache navigation requests. Keep HTML fresh to avoid stale chunk references.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-only for API routes and Next.js internals
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.includes('__nextjs')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first only for static assets (images, fonts, icons, manifest, media files).
  const isStaticAsset =
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|css|js|mp3|wav|ogg|mp4)$/i.test(url.pathname) ||
    url.pathname === '/manifest.json';

  if (!isStaticAsset) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-while-revalidate for static assets only.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok && response.status !== 206 && response.type !== 'opaque') {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => cached ?? Response.error());

      return cached ?? networkFetch;
    })
  );
});
