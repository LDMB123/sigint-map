const VERSION = '2026-02-15';
const CACHE_PREFIX = 'dmb-almanac-rs';
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}-data-${VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}-asset-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/app.css',
  '/manifest.json',
  '/webgpu.js',
  '/webgpu-worker.js',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

const DATA_ASSETS = [
  '/data/manifest.json',
  '/data/ai-config.json',
  '/data/idb-migration-dry-run.json'
];

async function notifyClients(type, payload = {}) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => {
    client.postMessage({ type, version: VERSION, ...payload });
  });
}

async function precache(cacheName, assets) {
  try {
    const cache = await caches.open(cacheName);
    await cache.addAll(assets);
    return true;
  } catch (err) {
    console.warn('precache failed:', cacheName, err);
    return false;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all([
        precache(SHELL_CACHE, SHELL_ASSETS),
        precache(DATA_CACHE, DATA_ASSETS)
      ]);
      await notifyClients('SW_INSTALLED');
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX))
          .filter((key) => ![SHELL_CACHE, DATA_CACHE, ASSET_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', version: VERSION });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const type = typeof data === 'string' ? data : data.type;

  if (type === 'SKIP_WAITING') {
    const skipPromise = Promise.resolve(self.skipWaiting());
    if (typeof event.waitUntil === 'function') {
      event.waitUntil(skipPromise);
    }
    return;
  }

  // Diagnostics: allows the app to verify the controlling SW is this Rust implementation.
  if (type === 'PING') {
    const source = event.source;
    if (source && typeof source.postMessage === 'function') {
      source.postMessage({
        type: 'PONG',
        impl: 'rust',
        version: VERSION,
        cachePrefix: CACHE_PREFIX
      });
    }
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cache-first for known shell assets so offline navigations don't hang on missing CSS/manifest.
  if (url.origin === location.origin && SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(url.pathname).then((cached) => cached || fetch(request).catch(() => cached))
    );
    return;
  }

  if (url.origin === location.origin && request.headers.get('accept')?.includes('text/html')) {
    const cacheKey = url.pathname || '/';
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
        .then((response) => {
          const copy = response.clone();
          // Store by path (not the full Request) so later navigations match reliably even if
          // headers differ (Playwright offline mode, different Accept headers, etc).
          caches.open(SHELL_CACHE).then((cache) => cache.put(cacheKey, copy));
          return response;
        })
        .catch(() => caches.match(cacheKey).then((res) => res || caches.match('/offline.html')))
    );
    return;
  }

  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(new Request(request, { cache: 'no-store' }))
          .then((response) => {
            const copy = response.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // WASM + JS bundles must stay in sync with SSR markup. Prefer network-first for /pkg/ so
  // dev rebuilds and production deploys do not get stuck on stale cached bundles.
  if (url.pathname.startsWith('/pkg/')) {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
        .then((response) => {
          const copy = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
      )
    );
    return;
  }
});
