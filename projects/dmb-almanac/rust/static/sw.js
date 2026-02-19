const VERSION = '2026-02-15';
const CACHE_PREFIX = 'dmb-almanac-rs';
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}-data-${VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}-asset-${VERSION}`;
const OFFLINE_FALLBACK = '/offline.html';

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
  const cache = await caches.open(cacheName);
  const results = await Promise.allSettled(
    assets.map(async (asset) => {
      const response = await fetch(asset, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`${asset} returned ${response.status}`);
      }
      await cache.put(asset, response.clone());
    })
  );
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed > 0) {
    console.warn('precache partial failure:', cacheName, failed);
    return false;
  }
  return true;
}

function isCacheable(response) {
  return !!response && response.ok;
}

async function putCache(cacheName, cacheKey, response) {
  if (!response) {
    return false;
  }
  const cache = await caches.open(cacheName);
  await cache.put(cacheKey, response);
  return true;
}

function putCacheWithLifetime(cacheName, cacheKey, response) {
  if (!isCacheable(response)) {
    return;
  }
  const responseCopy = response.clone();
  void putCache(cacheName, cacheKey, responseCopy).catch((err) => {
    console.warn('cache write failed:', cacheName, cacheKey, err);
  });
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
      caches.match(url.pathname).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            putCacheWithLifetime(SHELL_CACHE, url.pathname, response);
            return response;
          })
          .catch(() => cached || Response.error());
      })
    );
    return;
  }

  if (url.origin === location.origin && request.headers.get('accept')?.includes('text/html')) {
    const cacheKey = url.pathname || '/';
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
        .then((response) => {
          // Store by path (not the full Request) so later navigations match reliably even if
          // headers differ (Playwright offline mode, different Accept headers, etc).
          putCacheWithLifetime(SHELL_CACHE, cacheKey, response);
          return response;
        })
        .catch(() => caches.match(cacheKey).then((res) => res || caches.match(OFFLINE_FALLBACK)))
    );
    return;
  }

  if (url.pathname.startsWith('/data/')) {
    const cacheKey = url.pathname;
    event.respondWith(
      caches.match(cacheKey).then((cached) => {
        const fetchPromise = fetch(new Request(request, { cache: 'no-store' }))
          .then((response) => {
            putCacheWithLifetime(DATA_CACHE, cacheKey, response);
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
    const cacheKey = url.pathname;
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
        .then((response) => {
          putCacheWithLifetime(ASSET_CACHE, cacheKey, response);
          return response;
        })
        .catch(() => caches.match(cacheKey))
    );
    return;
  }

  if (url.pathname.startsWith('/icons/')) {
    const cacheKey = url.pathname;
    event.respondWith(
      caches.match(cacheKey).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          putCacheWithLifetime(ASSET_CACHE, cacheKey, response);
          return response;
        })
      )
    );
    return;
  }
});
