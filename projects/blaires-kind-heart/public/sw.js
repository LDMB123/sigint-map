// Service Worker — cache-first, offline-capable.
// Safari 26.2 on iPadOS 26.2. No backward compat needed.
// This is one of only 3 JS files in the entire project.
//
// WEEK 1 OPTIMIZATION: Tiered loading strategy
// - Install phase: CRITICAL_ASSETS only (fast first paint)
// - Background: DEFERRED_ASSETS loaded after activation
// - Runtime: Cache-first for all assets

const CACHE_NAME = 'kindheart-v6'; // LCP Optimization: image compression + CSS cleanup

importScripts("./runtime-diagnostics.js");

// Import asset manifest (includes CRITICAL_ASSETS and DEFERRED_ASSETS)
importScripts('./sw-assets.js');

self.__BKH_RUNTIME_DIAGNOSTICS__?.install({
  scope: "sw"
});

// Install: precache CRITICAL assets only (fast boot)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Only precache critical assets during install
      // Deferred assets loaded in background after activation
      // Use Promise.allSettled for resilient caching (don't fail install if 1 asset missing)
      return Promise.allSettled(
        CRITICAL_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn(`[SW Install] Failed to cache ${url}:`, err.message || err);
            throw err; // Re-throw for allSettled to mark as rejected
          })
        )
      ).then(results => {
        const cached = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`[SW Install] Cached ${cached}/${CRITICAL_ASSETS.length} critical assets (${failed} failed)`);
        if (failed > 0 && cached === 0) {
          throw new Error('All critical assets failed to cache');
        }
      });
    })
  );
  // skipWaiting is triggered by a 'SKIP_WAITING' message from the app
  // so the user sees an update prompt instead of a surprise reload.
});

// Listen for skip-waiting message from the app
self.addEventListener('message', (event) => {
  // Type validation: ensure event.data is an object with type property
  if (event.data && typeof event.data === 'object' && typeof event.data.type === 'string') {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  }
});

// Activate: clean old caches + start background prefetch of deferred assets
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
      // Background prefetch deferred assets (non-blocking)
      caches.open(CACHE_NAME).then((cache) => {
        // Phase 3.1: Promise.allSettled for resilient partial caching
        // Cache each asset independently - if 1 of 71 fails, others still cache
        return Promise.allSettled(
          DEFERRED_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err.message || err);
              throw err; // Re-throw for allSettled to mark as rejected
            })
          )
        ).then(results => {
          const cached = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected').length;
          console.log(`[SW] Cached ${cached}/${DEFERRED_ASSETS.length} deferred assets (${failed} failed)`);
        });
      })
    ])
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin, network-only for cross-origin
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation requests: serve app shell (index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        return cached || fetch(event.request);
      }).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // All other requests: cache-first with stale-while-revalidate for app logic
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Phase 3.2: Stale-while-revalidate for WASM/JS files
      // Serve cached immediately, update in background
      const isAppLogic = /\.(wasm|js)$/.test(url.pathname);

      if (cached && isAppLogic) {
        // Serve stale, fetch fresh in background
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(() => cached); // Fallback to cached on network error

        return cached; // Return stale immediately
      }

      // For non-app-logic: standard cache-first
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful responses for next time
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for HTML
      if (event.request.headers.get('Accept')?.includes('text/html')) {
        return caches.match('/offline.html');
      }
      // Offline fallback for images (return transparent 1x1 WebP to avoid broken icons)
      if (event.request.headers.get('Accept')?.includes('image/')) {
        // Return a data URI for a transparent 1x1 WebP image
        const bytes = Uint8Array.from(atob('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='), c => c.charCodeAt(0));
        return new Response(bytes, { headers: { 'Content-Type': 'image/webp' } });
      }
    })
  );
});
