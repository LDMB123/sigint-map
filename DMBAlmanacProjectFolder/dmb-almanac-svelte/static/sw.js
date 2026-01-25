/**
     * DMB Almanac Service Worker
     * Production-ready PWA service worker for Chrome 143+
     *
     * Caching Strategies:
     * - Precache: App shell and critical pages
     * - CacheFirst: Static assets (CSS, JS, images, WASM)
     * - NetworkFirst: API routes and pages (with expiration)
     * - StaleWhileRevalidate: Google Fonts and images
     *
     * @author DMB Almanac PWA Team
     */

// Cache version - semantic versioning for proper cache invalidation
// Format: v{version}-{hash}
const CACHE_VERSION = (() => {
  if (typeof __APP_VERSION__ !== 'undefined' && typeof __BUILD_HASH__ !== 'undefined') {
    return `v${__APP_VERSION__}-${__BUILD_HASH__}`;
  }
  // Fallback for dev/test
  return `v1.0.0-${Date.now()}`;
})();

// Cache names
const CACHES_CONFIG = {
  SHELL: `dmb-shell-${CACHE_VERSION}`,
  STATIC_ASSETS: `dmb-assets-${CACHE_VERSION}`,
  API_CACHE: `dmb-api-${CACHE_VERSION}`,
  PAGES_CACHE: `dmb-pages-${CACHE_VERSION}`,
  IMAGE_CACHE: `dmb-images-${CACHE_VERSION}`,
  FONTS_STYLESHEETS: `dmb-fonts-stylesheets-${CACHE_VERSION}`,
  FONTS_WEBFONTS: `dmb-fonts-webfonts-${CACHE_VERSION}`,
  OFFLINE_FALLBACK: `dmb-offline-${CACHE_VERSION}`,
  WASM_MODULES: `dmb-wasm-${CACHE_VERSION}`,
  BACKGROUND_SYNC: `dmb-sync-${CACHE_VERSION}`,
};

// Pages to precache on install
const PRECACHE_URLS = [
  '/',
  '/songs',
  '/venues',
  '/stats',
  '/tours',
  '/shows',
  '/guests',
  '/liberation',
  '/search',
  '/search',
  '/offline.html',
];

// Offline fallback page
const OFFLINE_FALLBACK_URL = '/offline.html';

// Cache expiration settings (in seconds)
const EXPIRATION_TIMES = {
  API: 60 * 60,           // 1 hour
  PAGES: 15 * 60,         // 15 minutes
  IMAGES: 60 * 60 * 24 * 30, // 30 days
  FONTS: 60 * 60 * 24 * 365, // 1 year
};

// Network timeout configuration
const NETWORK_TIMEOUT_MS = 3000; // 3 seconds

// Retry configuration for exponential backoff
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 2000,
  backoffMultiplier: 2,
};

// In-flight request tracking limits
const MAX_IN_FLIGHT = 100;
const IN_FLIGHT_TIMEOUT = 30000; // 30 seconds

// Cache size management
const MAX_CACHE_ENTRIES = 500;
const CACHE_SIZE_LIMITS = {
  [CACHES_CONFIG.STATIC_ASSETS]: 100,
  [CACHES_CONFIG.API_CACHE]: 50,
  [CACHES_CONFIG.PAGES_CACHE]: 100,
  [CACHES_CONFIG.IMAGE_CACHE]: 200,
  [CACHES_CONFIG.FONTS_STYLESHEETS]: 10,
  [CACHES_CONFIG.FONTS_WEBFONTS]: 30,
  [CACHES_CONFIG.WASM_MODULES]: 10,
  [CACHES_CONFIG.BACKGROUND_SYNC]: 100,
};

// Periodic cleanup interval (1 hour)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const CACHE_WARMING_IDLE_MS = 5000; // 5 seconds of idle time

// Request deduplication Map - tracks in-flight requests
const inFlightRequests = new Map();

// Track timeout IDs for cleanup
const inFlightTimeouts = new Map();

// Track periodic cleanup timer
let cleanupTimerId = null;

// BroadcastChannel for cache update notifications
// Note: Safari doesn't support BroadcastChannel in Service Workers
let broadcastChannel = null;
try {
  broadcastChannel = new BroadcastChannel('dmb-sw-cache-updates');
} catch (error) {
  console.warn('[SW] BroadcastChannel not supported:', error);
}

/**
 * Notify all clients of cache updates
 * Uses BroadcastChannel when available (Chrome, Firefox, Edge)
 * Falls back to postMessage to all clients (Safari, iOS Safari)
 *
 * @param {Object} message - The message to broadcast
 * @returns {Promise<void>}
 */
async function notifyClients(message) {
  // Try BroadcastChannel first (more efficient)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
      return;
    } catch (error) {
      console.warn('[SW] BroadcastChannel postMessage failed:', error);
      // Fall through to client messaging
    }
  }

  // Safari fallback: iterate over all clients and postMessage
  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of clients) {
      client.postMessage(message);
    }
  } catch (error) {
    console.warn('[SW] Failed to notify clients:', error);
  }
}

/**
 * Global error handler for uncaught errors in service worker
 */
self.addEventListener('error', (event) => {
  console.error('[SW] Uncaught error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack || event.error,
  });
  // Could send to error reporting service here
});

/**
 * Global handler for unhandled promise rejections
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise,
  });
  // Prevent the default browser behavior of logging to console
  event.preventDefault();
  // Could send to error reporting service here
});

/**
 * Install event - precache critical assets and pages
 * ISSUE #1: Added comprehensive error handling for failed cache operations
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  // Service Worker Static Routing API (Chromium 143+)
  // Bypass Service Worker for static assets to improve load performance
  if (event.registerRouter) {
    try {
      console.log('[SW] Registering Static Routing rules');
      event.registerRouter([
        // Bypass SW for static images and assets in /assets/
        // DISABLED: Bypassing SW prevents offline access to these assets unless they are in HTTP cache.
        // For a robust offline PWA, we usually want these to go through SW or use a Cache-first rule if supported.
        /*
        {
          condition: {
            urlPattern: /^\/assets\/.*\.(png|jpg|jpeg|svg|webp|avif|mp4)$/,
          },
          source: 'network',
        },
        */
        // Bypass SW for Google Fonts
        {
          condition: {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
          },
          source: 'network',
        }
      ]);
    } catch (e) {
      console.warn('[SW] Failed to register router:', e);
    }
  }

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHES_CONFIG.SHELL);
        console.log('[SW] Precaching shell pages:', PRECACHE_URLS);

        // Attempt to cache all URLs, but don't fail if some 404
        const cachePromises = PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
            console.log('[SW] Precached:', url);
          } catch (error) {
            console.error(`[SW] Failed to precache ${url}:`, error.message);
            // Don't throw - continue precaching other URLs
          }
        });

        await Promise.all(cachePromises);
        console.log('[SW] Precache complete');

        // Skip waiting to activate immediately (replace old SW)
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Install event failed:', error);
        throw error; // Reject the install promise to retry
      }
    })()
  );
});

/**
 * Activate event - clean up old caches and expired entries
 * ISSUE #18: Proper skipWaiting/clients.claim coordination
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    (async () => {
      try {
        // Delete old cache versions
        const cacheNames = await caches.keys();
        const currentCaches = Object.values(CACHES_CONFIG);
        const cachesToDelete = cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );

        if (cachesToDelete.length > 0) {
          console.log('[SW] Deleting old caches:', cachesToDelete);
        }

        await Promise.all(
          cachesToDelete.map((cacheName) => caches.delete(cacheName))
        );

        // Clean expired entries from runtime caches
        console.log('[SW] Cleaning expired cache entries');
        await cleanExpiredEntries(CACHES_CONFIG.API_CACHE, EXPIRATION_TIMES.API);
        await cleanExpiredEntries(CACHES_CONFIG.PAGES_CACHE, EXPIRATION_TIMES.PAGES);
        await cleanExpiredEntries(CACHES_CONFIG.IMAGE_CACHE, EXPIRATION_TIMES.IMAGES);

        // Enforce cache size limits
        await enforceCacheSizeLimits(CACHES_CONFIG.API_CACHE, CACHE_SIZE_LIMITS[CACHES_CONFIG.API_CACHE]);
        await enforceCacheSizeLimits(CACHES_CONFIG.PAGES_CACHE, CACHE_SIZE_LIMITS[CACHES_CONFIG.PAGES_CACHE]);
        await enforceCacheSizeLimits(CACHES_CONFIG.IMAGE_CACHE, CACHE_SIZE_LIMITS[CACHES_CONFIG.IMAGE_CACHE]);

        console.log('[SW] Activation complete');

        // Take control of all pages immediately
        await self.clients.claim();

        // Register periodic cleanup job
        schedulePeriodicCleanup();

        // Schedule cache warming on idle
        scheduleCacheWarming();
      } catch (error) {
        console.error('[SW] Activate event failed:', error);
        // Don't throw - activation should succeed even if cleanup fails
      }
    })()
  );
});

/**
 * Fetch event - implement caching strategies per route type
 * ISSUE #5: Added proper error propagation from fetch handlers
 */
self.addEventListener('fetch', (event) => {
  try {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
      return;
    }

    // Static JSON data files - serve compressed versions with CacheFirst
    // Optimized: ~26MB → ~5-7MB (73-81% reduction)
    if (url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
      event.respondWith(serveCompressedData(request));
      return;
    }

    // API routes - NetworkFirst with 1hr expiration
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirstWithExpiration(request, EXPIRATION_TIMES.API));
      return;
    }

    // Main app pages - NetworkFirst with 15min expiration
    if (
      /^\/(songs|venues|tours|stats|guests|liberation|shows|search).*$/i.test(
        url.pathname
      )
    ) {
      event.respondWith(networkFirstWithExpiration(request, EXPIRATION_TIMES.PAGES));
      return;
    }

    // Home page and offline fallback - NetworkFirst
    if (url.pathname === '/' || url.pathname === '/offline.html') {
      event.respondWith(networkFirstWithExpiration(request, EXPIRATION_TIMES.PAGES));
      return;
    }

    // Static assets (JS, CSS) - CacheFirst with navigation preload
    if (/\.(js|css)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request));
      return;
    }

    // Images - StaleWhileRevalidate
    if (/\.(png|jpg|jpeg|gif|webp|svg|ico|avif)$/i.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, EXPIRATION_TIMES.IMAGES));
      return;
    }

    // Google Fonts stylesheets - CacheFirst (proper split)
    if (url.origin === 'https://fonts.googleapis.com') {
      event.respondWith(cacheFirst(request, CACHES_CONFIG.FONTS_STYLESHEETS));
      return;
    }

    // Google Fonts webfonts - CacheFirst (proper split)
    if (url.origin === 'https://fonts.gstatic.com') {
      event.respondWith(cacheFirst(request, CACHES_CONFIG.FONTS_WEBFONTS));
      return;
    }

    // WASM modules - CacheFirst (issue #13)
    if (/\.wasm$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request, CACHES_CONFIG.WASM_MODULES));
      return;
    }

    // Default - NetworkFirst with page expiration
    event.respondWith(networkFirstWithExpiration(request, EXPIRATION_TIMES.PAGES));
  } catch (error) {
    console.error('[SW] Fetch event error:', error);
    // Return a safe error response with proper CSP
    event.respondWith(
      new Response('Service Worker error - fetch failed', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Security-Policy': "default-src 'self'"
        }
      })
    );
  }
});

/**
 * Enable navigation preload for faster page loads
 * ISSUE #17: Added navigation preload support
 */
async function enableNavigationPreload() {
  if (self.registration?.navigationPreload) {
    try {
      await self.registration.navigationPreload.enable();
      console.log('[SW] Navigation preload enabled');
    } catch (error) {
      console.warn('[SW] Navigation preload enable failed:', error);
    }
  }
}

// Enable navigation preload on activation
self.addEventListener('activate', () => {
  enableNavigationPreload().catch(console.error);
});

/**
 * Fetch with timeout and retry logic with exponential backoff
 * ISSUE #2: Added retry logic with exponential backoff
 * @param {Request} request - The fetch request
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Response>} The fetch response or timeout error
 */
async function fetchWithTimeoutAndRetry(request, timeoutMs = NETWORK_TIMEOUT_MS, retryCount = 0) {
  try {
    return await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Network timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  } catch (error) {
    // Retry with exponential backoff
    if (retryCount < RETRY_CONFIG.maxRetries) {
      const delayMs = Math.min(
        RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
        RETRY_CONFIG.maxDelayMs
      );

      console.log(`[SW] Fetch retry ${retryCount + 1}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms:`, request.url);

      await new Promise(resolve => setTimeout(resolve, delayMs));
      return fetchWithTimeoutAndRetry(request, timeoutMs, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Get deduplicated request key for deduplication
 * @param {Request} request - The fetch request
 * @returns {string} Unique key for the request
 */
function getRequestKey(request) {
  return `${request.method}:${request.url}`;
}

/**
 * Add in-flight request with automatic cleanup and size limit enforcement
 * @param {string} requestKey - The request key
 * @param {Promise} fetchPromise - The fetch promise to track
 */
function addInFlightRequest(requestKey, fetchPromise) {
  // Clean up size limit if at capacity
  if (inFlightRequests.size >= MAX_IN_FLIGHT) {
    // Get the first (oldest) entry and remove it
    const oldestKey = inFlightRequests.keys().next().value;
    if (oldestKey) {
      clearInFlightRequest(oldestKey);
      console.log('[SW] In-flight requests at capacity, evicted oldest:', oldestKey);
    }
  }

  // Add new request to tracking
  inFlightRequests.set(requestKey, fetchPromise);

  // Set up automatic cleanup timeout
  const timeoutId = setTimeout(() => {
    if (inFlightRequests.has(requestKey)) {
      clearInFlightRequest(requestKey);
      console.log('[SW] In-flight request timeout cleanup:', requestKey);
    }
  }, IN_FLIGHT_TIMEOUT);

  inFlightTimeouts.set(requestKey, timeoutId);
}

/**
 * Remove in-flight request and clear its timeout
 * ISSUE #4: Fixed memory leak by clearing both request and timeout
 * @param {string} requestKey - The request key to clear
 */
function clearInFlightRequest(requestKey) {
  inFlightRequests.delete(requestKey);

  const timeoutId = inFlightTimeouts.get(requestKey);
  if (timeoutId) {
    clearTimeout(timeoutId);
    inFlightTimeouts.delete(requestKey);
  }
}

/**
 * Enforce cache size limits using LRU (Least Recently Used) eviction
 * ISSUE #3: Added cache size enforcement with LRU eviction
 * @param {string} cacheName - The cache name to enforce limits on
 * @param {number} maxEntries - Maximum entries allowed
 */
async function enforceCacheSizeLimits(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    if (requests.length > maxEntries) {
      console.log(`[SW] Cache ${cacheName} exceeds limit (${requests.length}/${maxEntries}), evicting old entries...`);

      // Get all entries with their cache times
      const entriesWithTimes = await Promise.all(
        requests.map(async (request) => {
          try {
            const response = await cache.match(request);
            const cacheTime = response
              ? parseInt(response.headers.get('X-Cache-Time') || '0', 10)
              : 0;
            return { request, cacheTime };
          } catch (error) {
            console.warn('[SW] Failed to get cache entry metadata:', error);
            return { request, cacheTime: 0 };
          }
        })
      );

      // Sort by cache time (oldest first)
      entriesWithTimes.sort((a, b) => a.cacheTime - b.cacheTime);

      // Delete oldest entries until we're under the limit
      const entriesToDelete = entriesWithTimes.length - maxEntries;
      for (let i = 0; i < entriesToDelete; i++) {
        try {
          await cache.delete(entriesWithTimes[i].request);
          console.log(`[SW] Evicted cache entry: ${entriesWithTimes[i].request.url}`);
        } catch (error) {
          console.error('[SW] Failed to delete cache entry:', error);
        }
      }

      console.log(`[SW] Cache ${cacheName} reduced to ${maxEntries} entries`);
    }
  } catch (error) {
    console.error(`[SW] Error enforcing cache size limits for ${cacheName}:`, error);
  }
}

/**
 * CacheFirst strategy - return cached version if available
 * Falls back to network if not cached
 */
function cacheFirst(request, cacheName = CACHES_CONFIG.STATIC_ASSETS) {
  return caches
    .match(request)
    .then((response) => {
      if (response) {
        console.log('[SW] CacheFirst HIT:', request.url);
        return response;
      }

      return fetchWithTimeoutAndRetry(request)
        .then((response) => {
          // Only cache successful responses (status 200-299)
          if (!response || !response.ok || response.type === 'error') {
            console.log('[SW] Not caching non-ok response:', request.url, response.status);
            return response;
          }

          // Clone and cache the response
          const clonedResponse = response.clone();
          caches.open(cacheName).then((cache) => {
            try {
              // Add cache time metadata
              const headers = new Headers(clonedResponse.headers);
              headers.set('X-Cache-Time', String(Date.now()));
              headers.set('Content-Security-Policy', "default-src 'self'");

              cache.put(
                request,
                new Response(clonedResponse.body, {
                  status: clonedResponse.status,
                  statusText: clonedResponse.statusText,
                  headers: headers,
                })
              ).catch((error) => {
                console.error('[SW] Cache put error:', error);
              });

              // Enforce size limits after caching
              enforceCacheSizeLimits(cacheName, CACHE_SIZE_LIMITS[cacheName]);

              // Broadcast cache update (Safari-compatible)
              notifyClients({
                type: 'CACHE_UPDATED',
                cacheName,
                url: request.url,
                timestamp: Date.now()
              });
            } catch (error) {
              console.error('[SW] Cache operation error:', error);
            }
          }).catch((error) => {
            console.error('[SW] Error opening cache:', cacheName, error);
          });

          return response;
        })
        .catch((error) => {
          console.error('[SW] Fetch failed:', request.url, error);
          return caches.match(OFFLINE_FALLBACK_URL);
        });
    })
    .catch((error) => {
      console.error('[SW] Cache match error:', error);
      return new Response('Offline - Cache unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    });
}

/**
 * NetworkFirst strategy with expiration and timeout
 * Try network first with 3s timeout, fall back to cache, respect cache age
 * Deduplicates identical in-flight requests with automatic cleanup
 * ISSUE #9: Fixed race condition in stale-while-revalidate by using proper clone()
 * ISSUE #20: Fixed race condition - track promise before async execution starts
 */
function networkFirstWithExpiration(request, maxAgeSeconds) {
  const cacheName = getCacheNameForRequest(request);
  const requestKey = getRequestKey(request);

  // Check for in-flight request deduplication (synchronous check)
  const existingPromise = inFlightRequests.get(requestKey);
  if (existingPromise) {
    console.log('[SW] Request deduplicated (in-flight):', request.url);
    return existingPromise;
  }

  // Create the fetch promise with timeout and retry
  // CRITICAL: We must track the promise SYNCHRONOUSLY before returning
  // to prevent race conditions where duplicate requests slip through
  const fetchPromise = (async () => {
    try {
      const response = await fetchWithTimeoutAndRetry(request, NETWORK_TIMEOUT_MS);

      // Remove from in-flight tracking on success (cleanup happens in finally for safety)
      clearInFlightRequest(requestKey);

      // Only cache successful responses (status 200-299)
      if (!response || !response.ok || response.type === 'error') {
        console.log('[SW] Not caching non-ok response:', request.url, response.status);
        return response;
      }

      // Clone and cache with timestamp
      const clonedResponse = response.clone();
      try {
        const cache = await caches.open(cacheName);
        const headers = new Headers(clonedResponse.headers);
        headers.set('X-Cache-Time', String(Date.now()));
        headers.set('Content-Security-Policy', "default-src 'self'");

        const responseWithMetadata = new Response(clonedResponse.body, {
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers: headers,
        });

        await cache.put(request, responseWithMetadata);

        // Enforce size limits after caching
        await enforceCacheSizeLimits(cacheName, CACHE_SIZE_LIMITS[cacheName]);

        // Broadcast cache update (Safari-compatible)
        notifyClients({
          type: 'CACHE_UPDATED',
          cacheName,
          url: request.url,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[SW] Error caching response:', cacheName, error);
      }

      return response;
    } catch (error) {
      // Remove from in-flight tracking on error
      clearInFlightRequest(requestKey);

      // Log timeout vs other errors differently
      if (error.message.includes('timeout')) {
        console.log('[SW] Network timeout, falling back to cache:', request.url);
      } else {
        console.log('[SW] Network failed, trying cache:', request.url, error.message);
      }

      // Network failed or timed out, check cache
      try {
        const cachedResponse = await caches.match(request);

        if (!cachedResponse) {
          // No cache, return offline fallback for navigation requests
          if (request.mode === 'navigate') {
            console.log('[SW] Navigation failed, redirecting to offline:', request.url);
            const offlineResponse = await caches.match(OFFLINE_FALLBACK_URL);
            if (offlineResponse) {
              return offlineResponse;
            }
          }
          // For non-navigation requests, return error response
          return new Response('Offline - No cached content available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        // Check if cache is expired
        const cacheTime = parseInt(
          cachedResponse.headers.get('X-Cache-Time') || '0',
          10
        );
        const age = Math.floor((Date.now() - cacheTime) / 1000);

        if (age > maxAgeSeconds) {
          console.log('[SW] Cache expired:', request.url, `age: ${age}s`);
          // Cache expired, but still return it while network is down
          // In a real app, you might want to show a staleness indicator
        }

        console.log('[SW] NetworkFirst CACHE FALLBACK:', request.url);
        return cachedResponse;
      } catch (cacheError) {
        console.error('[SW] Cache match error:', cacheError);
        return new Response('Offline - Cache unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
  })();

  // CRITICAL: Track this request SYNCHRONOUSLY before returning
  // This prevents race conditions where two identical requests both pass
  // the deduplication check before either is tracked
  addInFlightRequest(requestKey, fetchPromise);

  return fetchPromise;
}

/**
 * StaleWhileRevalidate strategy
 * Return cached version immediately, update in background
 * Ensures cache updates don't conflict with concurrent requests
 */
function staleWhileRevalidate(request, maxAgeSeconds) {
  const cacheName = CACHES_CONFIG.IMAGE_CACHE;

  return caches
    .match(request)
    .then((cachedResponse) => {
      // Start background fetch to update cache
      const fetchPromise = fetchWithTimeoutAndRetry(request)
        .then((response) => {
          if (!response || !response.ok || response.type === 'error') {
            console.log('[SW] Not caching non-ok response in background:', request.url, response.status);
            return response;
          }

          // Update cache with new response in background
          const clonedResponse = response.clone();
          caches.open(cacheName)
            .then((cache) => {
              const headers = new Headers(clonedResponse.headers);
              headers.set('X-Cache-Time', String(Date.now()));
              headers.set('Content-Security-Policy', "default-src 'self'");

              return cache.put(
                request,
                new Response(clonedResponse.body, {
                  status: clonedResponse.status,
                  statusText: clonedResponse.statusText,
                  headers: headers,
                })
              );
            })
            .then(() => {
              // Enforce size limits after caching
              return enforceCacheSizeLimits(cacheName, CACHE_SIZE_LIMITS[cacheName]);
            })
            .then(() => {
              // Broadcast cache update (Safari-compatible)
              notifyClients({
                type: 'CACHE_UPDATED',
                cacheName,
                url: request.url,
                timestamp: Date.now()
              });
            })
            .catch((error) => {
              console.error('[SW] Background cache update failed:', error);
              // Don't throw - let background update fail silently
            });

          return response;
        })
        .catch((error) => {
          console.error('[SW] StaleWhileRevalidate background fetch failed:', error);
          return cachedResponse; // Return cached version if update fails
        });

      // Return cached version immediately if available
      if (cachedResponse) {
        console.log('[SW] StaleWhileRevalidate STALE:', request.url);
        return cachedResponse;
      }

      // No cache, wait for network
      return fetchPromise;
    })
    .catch((error) => {
      console.error('[SW] StaleWhileRevalidate match error:', error);
      return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    });
}

/**
 * Determine cache name based on request URL
 */
function getCacheNameForRequest(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return CACHES_CONFIG.API_CACHE;
  }

  if (url.pathname.startsWith('/data/')) {
    return CACHES_CONFIG.STATIC_ASSETS;
  }

  if (/^\/(songs|venues|tours|stats|guests|liberation|shows|search).*$/i.test(url.pathname)) {
    return CACHES_CONFIG.PAGES_CACHE;
  }

  return CACHES_CONFIG.PAGES_CACHE;
}

/**
 * Serve compressed data files with automatic format negotiation.
 * Tries Brotli (.br) first, then gzip (.gz), then uncompressed (.json).
 * Uses CacheFirst strategy with proper Content-Encoding headers.
 * ISSUE #7: Added cache headers parsing for proper TTL
 */
function serveCompressedData(request) {
  const url = new URL(request.url);
  const acceptEncoding = request.headers.get('Accept-Encoding') || '';

  // Determine best compression format based on browser support
  const supportsBrotli = acceptEncoding.includes('br');
  const supportsGzip = acceptEncoding.includes('gzip');

  // Try formats in order of preference
  const formats = [];

  if (supportsBrotli) {
    formats.push({ ext: '.br', encoding: 'br', type: 'Brotli' });
  }
  if (supportsGzip) {
    formats.push({ ext: '.gz', encoding: 'gzip', type: 'gzip' });
  }
  formats.push({ ext: '', encoding: null, type: 'uncompressed' });

  // Helper to try a specific format
  async function tryFormat(format) {
    const compressedUrl = format.ext ? `${url.pathname}${format.ext}` : url.pathname;
    const compressedRequest = new Request(compressedUrl, {
      method: request.method,
      headers: request.headers,
    });

    // Check cache first
    const cached = await caches.match(compressedRequest);
    if (cached) {
      console.log(`[SW] Compressed data cache HIT: ${url.pathname} (${format.type})`);
      return cached;
    }

    // Fetch from network
    try {
      const response = await fetchWithTimeoutAndRetry(compressedRequest);

      if (!response.ok) {
        return null; // Try next format
      }

      // Cache successful response
      const clonedResponse = response.clone();
      const cache = await caches.open(CACHES_CONFIG.STATIC_ASSETS);

      // Store with proper headers including Cache-Control for TTL parsing
      const headers = new Headers(clonedResponse.headers);
      headers.set('Content-Type', 'application/json');
      if (format.encoding) {
        headers.set('Content-Encoding', format.encoding);
      }
      headers.set('X-Cache-Time', String(Date.now()));
      headers.set('Content-Security-Policy', "default-src 'self'");

      const cachedResponse = new Response(clonedResponse.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      });

      await cache.put(compressedRequest, cachedResponse);

      // Enforce size limits after caching
      await enforceCacheSizeLimits(CACHES_CONFIG.STATIC_ASSETS, CACHE_SIZE_LIMITS[CACHES_CONFIG.STATIC_ASSETS]);

      // Broadcast cache update (Safari-compatible)
      notifyClients({
        type: 'CACHE_UPDATED',
        cacheName: CACHES_CONFIG.STATIC_ASSETS,
        url: compressedRequest.url,
        timestamp: Date.now()
      });

      console.log(`[SW] Compressed data cached: ${url.pathname} (${format.type})`);
      return response;
    } catch (error) {
      console.warn(`[SW] Failed to fetch ${format.type}:`, error);
      return null;
    }
  }

  // Try each format in order
  return (async () => {
    try {
      for (const format of formats) {
        const response = await tryFormat(format);
        if (response) {
          return response;
        }
      }

      // All formats failed, return error
      console.error(`[SW] All compression formats failed for: ${url.pathname}`);
      return new Response('Data file not found', {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (error) {
      console.error('[SW] serveCompressedData error:', error);
      return new Response('Data file error', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  })();
}

/**
 * Schedule periodic cache cleanup
 * ISSUE #12: Added periodic cache cleanup job registration
 */
function schedulePeriodicCleanup() {
  // Clear existing timer if any
  if (cleanupTimerId) {
    clearTimeout(cleanupTimerId);
  }

  cleanupTimerId = setTimeout(async () => {
    try {
      console.log('[SW] Running periodic cache cleanup');

      // Clean expired entries from all runtime caches
      await cleanExpiredEntries(CACHES_CONFIG.API_CACHE, EXPIRATION_TIMES.API);
      await cleanExpiredEntries(CACHES_CONFIG.PAGES_CACHE, EXPIRATION_TIMES.PAGES);
      await cleanExpiredEntries(CACHES_CONFIG.IMAGE_CACHE, EXPIRATION_TIMES.IMAGES);

      // Enforce size limits on all caches
      for (const [cacheName, limit] of Object.entries(CACHE_SIZE_LIMITS)) {
        await enforceCacheSizeLimits(cacheName, limit);
      }

      console.log('[SW] Periodic cleanup complete');

      // Schedule next cleanup
      schedulePeriodicCleanup();
    } catch (error) {
      console.error('[SW] Periodic cleanup failed:', error);
      // Schedule next cleanup anyway
      schedulePeriodicCleanup();
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Schedule cache warming on idle
 * ISSUE #15: Added cache warming on idle
 */
function scheduleCacheWarming() {
  if ('requestIdleCallback' in self) {
    self.requestIdleCallback(async () => {
      try {
        console.log('[SW] Warming cache on idle');
        // Pre-populate critical static assets
        const criticalUrls = ['/'];
        const cache = await caches.open(CACHES_CONFIG.SHELL);

        for (const url of criticalUrls) {
          try {
            const cached = await cache.match(url);
            if (!cached) {
              const response = await fetchWithTimeoutAndRetry(new Request(url));
              if (response.ok) {
                await cache.put(url, response.clone());
                console.log('[SW] Warmed cache for:', url);
              }
            }
          } catch (error) {
            console.warn('[SW] Cache warming failed for:', url, error);
          }
        }
      } catch (error) {
        console.error('[SW] Cache warming error:', error);
      }
    });
  }
}

/**
 * Message handler for client communication
 */
self.addEventListener('message', (event) => {
  try {
    const { type, payload } = event.data;

    switch (type) {
      case 'SKIP_WAITING':
        console.log('[SW] SKIP_WAITING message received');
        self.skipWaiting();
        break;

      case 'GET_CACHE_STATUS':
        handleGetCacheStatus(event);
        break;

      case 'CLEANUP_CACHES':
        handleCleanupCaches(event);
        break;

      case 'CHECK_CRITICAL_UPDATE':
        handleCheckCriticalUpdate(event);
        break;

      case 'QUEUE_SYNC_REQUEST':
        handleQueueSyncRequest(event);
        break;

      default:
        console.warn('[SW] Unknown message type:', type);
    }
  } catch (error) {
    console.error('[SW] Message handler error:', error);
  }
});

/**
 * GET_CACHE_STATUS - Report cache status to client
 */
async function handleGetCacheStatus(event) {
  try {
    const cacheNames = await caches.keys();
    const cacheStatus = {};

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheStatus[cacheName] = {
        entries: keys.length,
        urls: keys.map((request) => request.url),
      };
    }

    // Get storage quota
    let storageQuota = {
      usage: 0,
      quota: 0,
      percentage: 0,
    };

    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        storageQuota = {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
        };
      } catch (error) {
        console.error('[SW] Storage estimate failed:', error);
      }
    }

    event.ports[0].postMessage({
      success: true,
      caches: cacheStatus,
      storage: storageQuota,
      cacheVersion: CACHE_VERSION,
    });
  } catch (error) {
    console.error('[SW] GET_CACHE_STATUS failed:', error);
    event.ports[0].postMessage({
      success: false,
      error: error.message,
    });
  }
}

/**
 * CLEANUP_CACHES - Manually purge old/expired caches
 * ISSUE #6: Deduplicated cache cleanup logic
 */
async function handleCleanupCaches(event) {
  try {
    const deleted = await performCacheCleanup();

    event.ports[0].postMessage({
      success: true,
      deletedCaches: deleted,
    });
  } catch (error) {
    console.error('[SW] CLEANUP_CACHES failed:', error);
    event.ports[0].postMessage({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Unified cache cleanup logic
 * ISSUE #6: Deduplicated from activate and manual cleanup
 */
async function performCacheCleanup() {
  const cacheNames = await caches.keys();
  const currentCaches = Object.values(CACHES_CONFIG);
  const deleted = [];

  for (const cacheName of cacheNames) {
    if (!currentCaches.includes(cacheName)) {
      await caches.delete(cacheName);
      deleted.push(cacheName);
      console.log('[SW] Deleted cache:', cacheName);
    }
  }

  // Clean expired entries from API/Pages cache
  await cleanExpiredEntries(CACHES_CONFIG.API_CACHE, EXPIRATION_TIMES.API);
  await cleanExpiredEntries(CACHES_CONFIG.PAGES_CACHE, EXPIRATION_TIMES.PAGES);

  return deleted;
}

/**
 * CHECK_CRITICAL_UPDATE - Check if service worker needs update
 */
async function handleCheckCriticalUpdate(event) {
  try {
    // Attempt to fetch the service worker file itself
    const response = await fetchWithTimeoutAndRetry(
      new Request('/sw.js?cache-bust=' + Date.now())
    );

    if (response.ok) {
      const text = await response.text();
      // Simple version check - look for version string
      const remoteVersion = text.match(/const CACHE_VERSION = '([^']+)'/)?.[1];

      const hasUpdate = remoteVersion && remoteVersion !== CACHE_VERSION;

      event.ports[0].postMessage({
        success: true,
        hasUpdate,
        currentVersion: CACHE_VERSION,
        remoteVersion: remoteVersion || 'unknown',
      });
    } else {
      event.ports[0].postMessage({
        success: false,
        error: 'Failed to fetch SW file',
      });
    }
  } catch (error) {
    console.error('[SW] CHECK_CRITICAL_UPDATE failed:', error);
    event.ports[0].postMessage({
      success: false,
      error: error.message,
    });
  }
}

/**
 * QUEUE_SYNC_REQUEST - Queue request for offline background sync
 * ISSUE #11: Added background sync for failed offline submissions
 */
async function handleQueueSyncRequest(event) {
  try {
    const { method, url, headers, body } = event.data.payload;

    // Queue the request in IndexedDB via syncQueue
    const dbRequest = indexedDB.open('dmb-almanac-db');

    dbRequest.onerror = () => {
      event.ports[0].postMessage({
        success: false,
        error: 'Failed to open IndexedDB'
      });
    };

    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      const syncItem = {
        endpoint: url,
        method: method || 'POST',
        headers,
        payload: body,
        timestamp: Date.now()
      };

      const addRequest = store.add(syncItem);

      addRequest.onerror = () => {
        event.ports[0].postMessage({
          success: false,
          error: 'Failed to queue sync request'
        });
      };

      addRequest.onsuccess = () => {
        event.ports[0].postMessage({
          success: true,
          id: addRequest.result
        });

        // Attempt immediate sync
        if (navigator.onLine) {
          processSyncQueue().catch(console.error);
        }
      };
    };
  } catch (error) {
    console.error('[SW] QUEUE_SYNC_REQUEST failed:', error);
    event.ports[0].postMessage({
      success: false,
      error: error.message
    });
  }
}

/**
 * Clean expired entries from a cache
 */
async function cleanExpiredEntries(cacheName, maxAgeSeconds) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    let deleted = 0;

    for (const request of requests) {
      try {
        const response = await cache.match(request);
        if (response) {
          const cacheTime = parseInt(
            response.headers.get('X-Cache-Time') || '0',
            10
          );
          const age = Math.floor((Date.now() - cacheTime) / 1000);

          if (age > maxAgeSeconds) {
            await cache.delete(request);
            deleted++;
          }
        }
      } catch (error) {
        console.warn('[SW] Error checking cache entry:', error);
      }
    }

    if (deleted > 0) {
      console.log(
        `[SW] Cleaned ${deleted} expired entries from ${cacheName}`
      );
    }
  } catch (error) {
    console.error('[SW] Clean expired entries failed:', error);
  }
}

/**
 * Push notification handler (ready for future implementation)
 */
self.addEventListener('push', (event) => {
  try {
    if (!event.data) {
      console.log('[SW] Push received without data');
      return;
    }

    const data = event.data.json();
    const options = {
      body: data.body || 'DMB Almanac notification',
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'dmb-notification',
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(self.registration.showNotification(data.title || 'DMB Almanac', options));
  } catch (error) {
    console.error('[SW] Push notification failed:', error);
  }
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  try {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Look for an existing window with the target URL
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }

          // If no existing window, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } catch (error) {
    console.error('[SW] Notification click handler error:', error);
  }
});

/**
 * Background sync handler for offline queue
 */
self.addEventListener('sync', (event) => {
  try {
    if (event.tag === 'sync-queue') {
      event.waitUntil(processSyncQueue());
    } else if (event.tag === 'dmb-offline-mutation-queue') {
      event.waitUntil(processSyncQueue());
    } else if (event.tag === 'dmb-telemetry-queue') {
      event.waitUntil(processTelemetryQueue());
    }
  } catch (error) {
    console.error('[SW] Sync event error:', error);
  }
});

/**
 * Periodic background sync handler
 * Checks for data freshness at regular intervals
 * Registered with tags:
 * - 'dmb-data-refresh': Refresh DMB data cache (24 hour interval)
 * - 'check-data-freshness': Legacy tag for backward compatibility
 */
self.addEventListener('periodicsync', (event) => {
  try {
    if (event.tag === 'dmb-data-refresh' || event.tag === 'check-data-freshness') {
      event.waitUntil(checkDataFreshness());
    }
  } catch (error) {
    console.error('[SW] Periodic sync event failed:', error);
  }
});

/**
 * Check data freshness and notify clients of updates
 * Called periodically (every 24 hours) to verify if cached data needs refresh
 * Updates critical API caches and notifies clients of available updates
 */
async function checkDataFreshness() {
  try {
    console.log('[SW] Periodic background sync: checking data freshness');
    const startTime = Date.now();

    // Try to fetch a lightweight API endpoint to check for updates
    try {
      const response = await fetchWithTimeoutAndRetry(
        new Request('/api/data-version', {
          headers: { 'X-Periodic-Sync': 'true' }
        })
      );

      if (response.ok) {
        const data = await response.json();
        const version = data.version || 'unknown';

        // Store the last periodic sync timestamp
        const cache = await caches.open(CACHES_CONFIG.API_CACHE);
        const syncMetadata = {
          lastPeriodicSync: Date.now(),
          lastVersion: version
        };

        await cache.put(
          new Request('/__periodic-sync-metadata'),
          new Response(JSON.stringify(syncMetadata), {
            headers: {
              'Content-Type': 'application/json',
              'X-Cache-Time': String(Date.now())
            }
          })
        );

        // Notify all connected clients of update availability
        const clients = await self.clients.matchAll();
        const clientCount = clients.length;

        for (const client of clients) {
          client.postMessage({
            type: 'DATA_UPDATE_AVAILABLE',
            version: version,
            timestamp: Date.now()
          });
        }

        const duration = Date.now() - startTime;
        console.log(`[SW] Periodic sync complete (${duration}ms): checked version ${version}, notified ${clientCount} clients`);
      } else {
        console.warn('[SW] Periodic sync: data-version API returned status', response.status);
      }
    } catch (error) {
      console.warn('[SW] Periodic sync: failed to check data freshness:', error.message);
      // Continue - periodic sync should not fail the entire background task
    }

    // Also refresh critical caches on a periodic basis
    try {
      console.log('[SW] Periodic sync: refreshing critical cache entries');

      // List of critical URLs to keep fresh
      const criticalUrls = ['/api/shows', '/api/songs', '/api/venues'];
      let refreshedCount = 0;

      for (const url of criticalUrls) {
        try {
          const response = await fetchWithTimeoutAndRetry(new Request(url));
          if (response.ok) {
            const cache = await caches.open(CACHES_CONFIG.API_CACHE);
            const headers = new Headers(response.headers);
            headers.set('X-Cache-Time', String(Date.now()));

            await cache.put(
              url,
              new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers
              })
            );
            refreshedCount++;
          }
        } catch (error) {
          console.warn('[SW] Periodic sync: failed to refresh', url, error.message);
          // Continue with next URL - don't fail entire sync
        }
      }

      console.log(`[SW] Periodic sync: refreshed ${refreshedCount}/${criticalUrls.length} critical cache entries`);
    } catch (error) {
      console.warn('[SW] Periodic sync: cache refresh failed:', error.message);
      // Non-critical - continue execution
    }

  } catch (error) {
    console.error('[SW] Periodic background sync failed:', error);
    // Re-throw to allow browser to retry periodic sync
    throw error;
  }
}

/**
 * Process sync queue from IndexedDB
 * Syncs offline actions (favorites, attended shows) with server
 * Schema: src/lib/db/dexie/schema.ts
 */
async function processSyncQueue() {
  try {
    console.log('[SW] Processing sync queue...');

    // Open IndexedDB
    const dbRequest = indexedDB.open('dmb-almanac');

    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);

      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;

        // Check if syncQueue table exists (for backward compatibility)
        if (!db.objectStoreNames.contains('syncQueue')) {
          console.log('[SW] syncQueue table does not exist, skipping');
          db.close();
          resolve();
          return;
        }

        const transaction = db.transaction(['syncQueue'], 'readonly');
        const store = transaction.objectStore('syncQueue');
        const queueItems = [];

        // Collect all pending sync items
        store.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            queueItems.push(cursor.value);
            cursor.continue();
          }
        };

        transaction.oncomplete = async () => {
          if (queueItems.length === 0) {
            console.log('[SW] Sync queue is empty');
            db.close();
            resolve();
            return;
          }

          console.log('[SW] Found', queueItems.length, 'items to sync');

          // Process each sync item with retry logic
          for (const item of queueItems) {
            try {
              const response = await fetchWithTimeoutAndRetry(
                new Request(item.endpoint, {
                  method: item.method || 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Offline-Sync': 'true',
                    ...item.headers,
                  },
                  body: JSON.stringify(item.payload),
                })
              );

              if (response.ok) {
                // Remove synced item from queue
                const deleteTransaction = db.transaction(['syncQueue'], 'readwrite');
                const deleteStore = deleteTransaction.objectStore('syncQueue');
                deleteStore.delete(item.id);

                console.log('[SW] Synced:', item.endpoint, item.id);
              } else {
                console.warn('[SW] Sync failed with status', response.status, ':', item.endpoint);
                // Don't remove from queue, will retry next time
              }
            } catch (error) {
              console.error('[SW] Sync error for', item.endpoint, ':', error);
              // Don't remove from queue, will retry next time
            }
          }

          db.close();
          resolve();
        };

        transaction.onerror = () => reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[SW] Sync queue processing failed:', error);
    throw error; // Retry sync
  }
}

/**
 * Process telemetry queue from IndexedDB
 * Sends queued performance telemetry with retry logic
 * Schema: src/lib/db/dexie/schema.ts
 */
async function processTelemetryQueue() {
  try {
    console.log('[SW] Processing telemetry queue...');

    // Open IndexedDB
    const dbRequest = indexedDB.open('dmb-almanac');

    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);

      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;

        // Check if telemetryQueue table exists
        if (!db.objectStoreNames.contains('telemetryQueue')) {
          console.log('[SW] telemetryQueue table does not exist, skipping');
          db.close();
          resolve();
          return;
        }

        const transaction = db.transaction(['telemetryQueue'], 'readonly');
        const store = transaction.objectStore('telemetryQueue');
        const queueItems = [];

        // Get pending and retrying items using status index
        const statusIndex = store.index('status');

        // Get pending items
        const pendingRequest = statusIndex.getAll('pending');
        pendingRequest.onsuccess = () => {
          queueItems.push(...pendingRequest.result);
        };

        // Get retrying items
        const retryingRequest = statusIndex.getAll('retrying');
        retryingRequest.onsuccess = () => {
          queueItems.push(...retryingRequest.result);
        };

        transaction.oncomplete = async () => {
          if (queueItems.length === 0) {
            console.log('[SW] Telemetry queue is empty');
            db.close();
            resolve();
            return;
          }

          console.log('[SW] Found', queueItems.length, 'telemetry items to process');

          // Process each telemetry item with retry logic
          for (const item of queueItems) {
            // Skip if not yet time to retry
            if (item.nextRetry && Date.now() < item.nextRetry) {
              continue;
            }

            try {
              const response = await fetchWithTimeoutAndRetry(
                new Request(item.endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Background-Sync': 'true',
                  },
                  body: JSON.stringify(item.payload),
                })
              );

              if (response.ok) {
                // Mark as completed
                const updateTransaction = db.transaction(['telemetryQueue'], 'readwrite');
                const updateStore = updateTransaction.objectStore('telemetryQueue');
                updateStore.put({
                  ...item,
                  status: 'completed'
                });

                console.log('[SW] Telemetry sent:', item.id);
              } else {
                // Update retry info
                const retries = (item.retries || 0) + 1;
                const maxRetries = 3;

                if (retries >= maxRetries) {
                  // Max retries exceeded, mark as failed
                  const updateTransaction = db.transaction(['telemetryQueue'], 'readwrite');
                  const updateStore = updateTransaction.objectStore('telemetryQueue');
                  updateStore.put({
                    ...item,
                    status: 'failed',
                    retries,
                    lastError: `HTTP ${response.status}: ${response.statusText}`
                  });

                  console.warn('[SW] Telemetry failed permanently after', retries, 'retries:', item.id);
                } else {
                  // Calculate exponential backoff delay
                  const backoffMs = 1000 * Math.pow(2, retries);
                  const nextRetry = Date.now() + backoffMs;

                  const updateTransaction = db.transaction(['telemetryQueue'], 'readwrite');
                  const updateStore = updateTransaction.objectStore('telemetryQueue');
                  updateStore.put({
                    ...item,
                    status: 'retrying',
                    retries,
                    nextRetry,
                    lastError: `HTTP ${response.status}: ${response.statusText}`
                  });

                  console.warn('[SW] Telemetry retry scheduled:', item.id, 'attempt', retries);
                }
              }
            } catch (error) {
              // Network error - queue for retry
              const retries = (item.retries || 0) + 1;
              const maxRetries = 3;

              if (retries >= maxRetries) {
                // Max retries exceeded, mark as failed
                const updateTransaction = db.transaction(['telemetryQueue'], 'readwrite');
                const updateStore = updateTransaction.objectStore('telemetryQueue');
                updateStore.put({
                  ...item,
                  status: 'failed',
                  retries,
                  lastError: error.message || String(error)
                });

                console.error('[SW] Telemetry failed permanently:', item.id, error);
              } else {
                // Calculate exponential backoff delay
                const backoffMs = 1000 * Math.pow(2, retries);
                const nextRetry = Date.now() + backoffMs;

                const updateTransaction = db.transaction(['telemetryQueue'], 'readwrite');
                const updateStore = updateTransaction.objectStore('telemetryQueue');
                updateStore.put({
                  ...item,
                  status: 'retrying',
                  retries,
                  nextRetry,
                  lastError: error.message || String(error)
                });

                console.warn('[SW] Telemetry retry scheduled:', item.id, 'attempt', retries);
              }
            }
          }

          db.close();
          resolve();
        };

        transaction.onerror = () => reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[SW] Telemetry queue processing failed:', error);
    throw error; // Retry sync
  }
}

console.log('[SW] Service Worker loaded');
