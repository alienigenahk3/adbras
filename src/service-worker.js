// Service Worker with install, activate, and fetch lifecycle handlers
// This list is populated by vite-plugin-pwa during build
const precacheManifest = self.__WB_MANIFEST || [];
console.log('[Service Worker] Loaded with precache manifest size:', precacheManifest.length);

const CACHE_NAME = 'ictus-church-cache-v1';

// Install event - caching basic shell assets if needed and skipping waiting
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing event triggered.');
  self.skipWaiting();
});

// Activate event - cleaning up old caches and claiming clients
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating event triggered.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serving cached assets or fetching from network
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Only handle GET requests and local origin requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Exclude service-worker.js itself to prevent caching loop
  if (requestUrl.pathname === '/service-worker.js') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip Firebase auth / Firestore requests or other external requests
  if (requestUrl.pathname.includes('/__/auth') || requestUrl.hostname.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve cached, but fetch and update in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch((error) => {
          console.warn('[Service Worker] Fetch failed; returning offline cache if available.', error);
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          throw error;
        });
    })
  );
});
