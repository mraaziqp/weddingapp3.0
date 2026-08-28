/**
 * Wedu 3.0 — Service Worker v6
 * Provides offline capability, asset caching, and enables the PWA install prompt.
 * Strategy: stale-while-revalidate for static assets, network-first for API/data.
 */

const CACHE_NAME = 'wedu-3-v6';

// Core assets to pre-cache on install
const PRECACHE_URLS = [
  '/manifest.json',
  '/RA-logo.svg',
  '/bismillah.png',
  '/wedding-flowers.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-touch-icon.png',
];

// ── Install: pre-cache app shell ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.log('[SW] Precache skipped:', err))
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

// ── Fetch: safe caching ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Let browser handle non-http(s) requests (e.g. chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Never intercept navigation requests or API routes or Next.js internals
  if (
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.includes('__nextjs')
  ) {
    return; // Allow native network fetch without service worker interference
  }

  // Cache-first only for static assets (images, fonts, icons, manifest, media files).
  const isStaticAsset =
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|css|js|mp3|wav|ogg|mp4)$/i.test(url.pathname) ||
    url.pathname === '/manifest.json';

  if (!isStaticAsset) {
    return;
  }

  // Safe Stale-While-Revalidate without unhandled rejections
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
