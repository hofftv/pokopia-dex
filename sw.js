const CACHE_NAME = 'pokopia-dex-v1';

// Install: cache core files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['./', './index.html', './data.js', './manifest.json'])
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for images, network-first for HTML/JS
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Local images: cache-first (they don't change)
  if (url.pathname.includes('/img/')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(response => {
            if (response.ok) cache.put(e.request, response.clone());
            return response;
          }).catch(() => new Response('', { status: 404 }));
        })
      )
    );
    return;
  }

  // HTML/JS/manifest: network-first, cache fallback
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') || url.pathname.endsWith('.json') ||
      url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: network with cache fallback
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
