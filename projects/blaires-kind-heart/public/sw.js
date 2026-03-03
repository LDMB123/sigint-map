// Service Worker — cache-first, offline-capable.
// Safari 26.2 on iPadOS 26.2. No backward compat needed.
// This is one of only 5 JS files in the entire project.
//
// WEEK 1 OPTIMIZATION: Tiered loading strategy
// - Install phase: CRITICAL_ASSETS only (fast first paint)
// - Background: DEFERRED_ASSETS loaded after activation
// - Runtime: Cache-first for all assets

const CACHE_NAME = 'kindheart-v80'; // runtime-diagnostics wired in SW

// Import asset manifest (includes CRITICAL_ASSETS and DEFERRED_ASSETS)
importScripts('./sw-assets.js');
importScripts("./runtime-diagnostics.js");
self.__BKH_RUNTIME_DIAGNOSTICS__?.install({ scope: "sw" });

// Pre-compiled regex for hot fetch path (avoid per-request RegExp construction)
const RE_APP_LOGIC = /\.(wasm|js)$/;

// Install: precache CRITICAL assets only (fast boot)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Only precache critical assets during install
      // Deferred assets loaded in background after activation
      // Use Promise.allSettled for resilient caching — but FATAL assets must succeed
      const FATAL_PATTERNS = ['.wasm', '.js', '/index.html', '/offline.html'];
      return Promise.allSettled(
        CRITICAL_ASSETS.map(url => cache.add(url))
      ).then(results => {
        const fatalFailed = [];
        results.forEach((r, i) => {
          if (r.status === 'rejected' && FATAL_PATTERNS.some(p => CRITICAL_ASSETS[i].endsWith(p))) {
            fatalFailed.push(CRITICAL_ASSETS[i]);
          }
        });
        if (fatalFailed.length > 0) {
          throw new Error(`Fatal assets failed to cache: ${fatalFailed.join(', ')}`);
        }
      });
    })
  );
  // skipWaiting is triggered by a 'SKIP_WAITING' message from the app
  // so the user sees an update prompt instead of a surprise reload.
});

// Listen for skip-waiting message from the app
self.addEventListener('message', (event) => {
  let data = event.data;
  // Support both object messages and JSON string messages (Rust wasm_bindgen compat)
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (_) { return; }
  }
  if (data && typeof data === 'object' && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: claim clients immediately, then clean old caches + prefetch deferred assets
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Claim clients first — SW takeover must not wait on cache operations
    await self.clients.claim();

    // Clean old caches
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );

    // Background prefetch deferred assets (fire-and-forget)
    // Phase 3.1: Promise.allSettled for resilient partial caching
    // Cache each asset independently - if 1 of 71 fails, others still cache
    // Do NOT await — activation must complete quickly; large asset sets can timeout
    const cache = await caches.open(CACHE_NAME);
    Promise.allSettled(
      DEFERRED_ASSETS.map(url => cache.add(url))
    );
  })());
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
      }).catch(async () => {
        const offlinePage = await caches.match('/offline.html');
        return offlinePage ?? new Response('<h1>Offline</h1><p>Please check your connection and refresh.</p>', {
          status: 503, headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // All other requests: cache-first with stale-while-revalidate for app logic
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Phase 3.2: Stale-while-revalidate for utility JS/WASM files
      // IMPORTANT: Exclude main app bundle (blaires-kind-heart.js + _bg.wasm)
      // because JS glue and WASM binary are tightly coupled — updating one
      // without the other causes version mismatch crashes on next load.
      // Main app bundle updates atomically via SW CACHE_NAME version bump.
      const isAppBundle = url.pathname.includes('blaires-kind-heart');
      const isAppLogic = RE_APP_LOGIC.test(url.pathname) && !isAppBundle;

      if (cached && isAppLogic) {
        // Serve stale, fetch fresh in background (fire-and-forget)
        fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, clone)
            ).catch(() => { }); // Ignore cache write failures (quota, etc.)
          }
        }).catch(() => { }); // Ignore network errors for background revalidation

        return cached; // Return stale immediately
      }

      // For non-app-logic: standard cache-first
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful responses for next time
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, clone)
          ).catch(() => { }); // Ignore cache write failures (quota, etc.)
        }
        return response;
      });
    }).catch(async () => {
      // Offline fallback for HTML
      if (event.request.headers.get('Accept')?.includes('text/html')) {
        const offlinePage = await caches.match('/offline.html');
        return offlinePage ?? new Response('<h1>Offline</h1><p>Please check your connection and refresh.</p>', {
          status: 503, headers: { 'Content-Type': 'text/html' }
        });
      }
      // Offline fallback for images (return transparent 1x1 WebP to avoid broken icons)
      if (event.request.headers.get('Accept')?.includes('image/')) {
        // Return a data URI for a transparent 1x1 WebP image
        const bytes = Uint8Array.from(atob('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='), c => c.charCodeAt(0));
        return new Response(bytes, { headers: { 'Content-Type': 'image/webp' } });
      }
      // Catch-all: return 503 for CSS/JS/WASM etc. (never return undefined)
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
