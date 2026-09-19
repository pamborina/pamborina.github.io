/* ========================================================================
 * Pamborina Patisserie — Production Grade Service Worker
 * Cache Strategy: Online-First for APIs/Firebase, Stale-While-Revalidate for Assets
 * ======================================================================== */

const CACHE_NAME = 'PAMBORINA_PWA_CACHE_V2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './site.webmanifest',
  './manifest.json',
  './favicon.svg',
  './favicon.ico',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './apple-touch-icon.png'
];

// Domains & URLs that MUST NEVER be cached
const IGNORED_DOMAINS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebasestorage.googleapis.com',
  'googleapis.com',
  'google.com'
];

// Install Event — Pre-cache static App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Pamborina SW] Pre-caching warning:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event — Clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache.startsWith('PAMBORINA_')) {
            console.log('[Pamborina SW] Purging stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event — Handle network caching safely
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only process GET requests
  if (request.method !== 'GET') return;

  // 2. Ignore non-http(s) schemes (e.g. chrome-extension, data URIs)
  if (!url.protocol.startsWith('http')) return;

  // 3. Ignore Firebase, Authentication, API & Server Endpoints
  if (
    url.pathname.startsWith('/api/') ||
    IGNORED_DOMAINS.some((domain) => url.hostname.includes(domain))
  ) {
    return; // Pass through to browser network directly
  }

  // 4. HTML Navigation Requests — Network-First, fallback to Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('./index.html') || caches.match('./');
          });
        })
    );
    return;
  }

  // 5. Static Assets (CSS, JS, Fonts, Images) — Stale-While-Revalidate
  const isStaticAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    STATIC_ASSETS.includes(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default Network Fetch with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
