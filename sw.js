const CACHE_NAME = 'portfolio-v3';

// Files to cache for offline use
const URLS_TO_CACHE = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './icon.svg',
  './public/config.md',
  './config.md',
  './lib/tailwindcss.js',
  './lib/marked.min.js',
  './lib/lucide.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(URLS_TO_CACHE.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch(err => console.warn('Cache add error', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(err => {
          console.warn('Network fetch failed', err);
        });
        
        return cachedResponse || fetchPromise;
      })
  );
});