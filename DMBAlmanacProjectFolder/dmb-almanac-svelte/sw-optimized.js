/**
 * DMB Almanac Service Worker (OPTIMIZED)
 * Implements: precache, cache-first, network-first, stale-while-revalidate
 */

// Cache version - semantic versioning for proper cache invalidation
// Format: v{major}.{minor}.{patch}-{timestamp}
const SW_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
};

// Generate a stable timestamp-based suffix for cache busting on deployment
const DEPLOYMENT_ID = (() => {
  if (typeof __BUILD_TIMESTAMP__ !== 'undefined') {
    return String(__BUILD_TIMESTAMP__);
  }
  return '20260123';
})();

const CACHE_VERSION = `v${SW_VERSION.major}.${SW_VERSION.minor}.${SW_VERSION.patch}-${DEPLOYMENT_ID}`;

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
  '/offline',
];

// Offline fallback page
const OFFLINE_FALLBACK_URL = '/offline';

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
const CACHE_WARMING_IDLE_MS = 5000;

// Request deduplication Map - tracks in-flight requests
const inFlightRequests = new Map();
const inFlightTimeouts = new Map();
let cleanupTimerId = null;

// DEBUG mode - set to false in production for size reduction
// Terser will dead-code-eliminate all debugLog/debugWarn calls when DEBUG=false
const DEBUG = false;

function debugLog(...args) {
  if (DEBUG) console.log('[SW]', ...args);
}

function debugWarn(...args) {
  if (DEBUG) console.warn('[SW]', ...args);
}

/**
 * Notify all clients of cache updates (Safari-compatible, replaces BroadcastChannel)
 */
async function notifyClientsOfCacheUpdate(cacheName, url) {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        cacheName,
        url,
        timestamp: Date.now()
      });
    });
  } catch (error) {
    debugLog('Client notification failed:', error.message);
  }
}

/**
 * Create response headers with caching metadata
 */
function createCachedHeaders(sourceHeaders) {
  const headers = new Headers(sourceHeaders);
  headers.set('X-Cache-Time', String(Date.now()));
  headers.set('Content-Security-Policy', "default-src 'self'");
  return headers;
}

/**
 * Wrap response with caching headers
 */
function createCachedResponse(sourceResponse) {
  return new Response(sourceResponse.body, {
    status: sourceResponse.status,
    statusText: sourceResponse.statusText,
    headers: createCachedHeaders(sourceResponse.headers)
  });
}

/**
 * Cache response, enforce size limits, notify clients
 */
async function cacheAndEnforce(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, createCachedResponse(response));
    await enforceCacheSizeLimits(cacheName, CACHE_SIZE_LIMITS[cacheName]);
    notifyClientsOfCacheUpdate(cacheName, request.url);
  } catch (error) {
    debugLog('Cache operation failed:', error.message);
  }
}

/**
 * Global error handler
 */
self.addEventListener('error', (event) => {
  console.error('[SW] Uncaught error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack || event.error,
  });
});

/**
 * Global unhandled rejection handler
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise,
  });
  event.preventDefault();
});

/**
 * Install event - precache critical assets
 */
self.addEventListener('install', (event) => {
  debugLog('Installing service worker');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHES_CONFIG.SHELL);
        debugLog('Precaching shell pages:', PRECACHE_URLS);

        const cachePromises = PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
            debugLog('Precached:', url);
          } catch (error) {
            console.error(`[SW] Failed to precache ${url}:`, error.message);
          }
        });

        await Promise.all(cachePromises);
        debugLog('Precache complete');
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Install event failed:', error);
        throw error;
      }
    })()
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  debugLog('Activating service worker');

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
          debugLog('Deleting old caches:', cachesToDelete);
        }

        await Promise.all(
          cachesToDelete.map((cacheName) => caches.delete(cacheName))
        );

        // Clean expired entries from runtime caches
        debugLog('Cleaning expired cache entries');
        await cleanExpiredEntries(CACHES_CONFIG.API_CACHE, EXPIRATION_TIMES.API);
        await cleanExpiredEntries(CACHES_CONFIG.PAGES_CACHE, EXPIRATION_TIMES.PAGES);
        await cleanExpiredEntries(CACHES_CONFIG.IMAGE_CACHE, EXPIRATION_TIMES.IMAGES);

        // Enforce cache size limits
        await enforceCacheSizeLimits(CACHES_CONFIG.API_CACHE, CACHE_SIZE_LIMITS[CACHES_CONFIG.API_CACHE]);
        await enforceCacheSizeLimits(CACHES_CONFIG.PAGES_CACHE, CACHE_SIZE_LIMITS[CACHES_CONFIG.PAGES_CACHE]);
        await enforceCacheSizeLimits(CACHES_CONFIG.IMAGE_CACHE, CACHE_SIZE_LIMITS[CACHES_CONFIG.IMAGE_CACHE]);

        debugLog('Activation complete');

        await self.clients.claim();
        schedulePeriodicCleanup();
        scheduleCacheWarming();
      } catch (error) {
        console.error('[SW] Activate event failed:', error);
      }
    })()
  );
});

/**
 * Fetch event - implement caching strategies per route
 */
self.addEventListener('fetch', (event) => {
  try {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') {
      return;
    }

    // Static JSON data files - CacheFirst with compression
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
    if (url.pathname === '/' || url.pathname === '/offline') {
      event.respondWith(networkFirstWithExpiration(request, EXPIRATION_TIMES.PAGES));
      return;
    }

    // Static assets (JS, CSS) - CacheFirst
    if (/\.(js|css)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request));
      return;
    }

    // Images - StaleWhileRevalidate
    if (/\.(png|jpg|jpeg|gif|webp|svg|ico|avif)$/i.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, EXPIRATION_TIMES.IMAGES));
      return;
    }

    // Google Fonts stylesheets - CacheFirst
    if (url.origin === 'https://fonts.googleapis.com') {
      event.respondWith(cacheFirst(request, CACHES_CONFIG.FONTS_STYLESHEETS));
      return;
    }

    // Google Fonts webfonts - CacheFirst
    if (url.origin === 'https://fonts.gstatic.com') {
      event.respondWith(cacheFirst(request, CACHES_CONFIG.FONTS_WEBFONTS));
      return;
    }

    // WASM modules - CacheFirst
    if (/\.wasm$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request, CACHES_CONFIG.WASM_MODULES));
      return;
    }

    // Default - NetworkFirst
    event.respondWith(networkFirstWithExpiration(request, EXPIRATION_TIMES.PAGES));
  } catch (error) {
    console.error('[SW] Fetch event error:', error);
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
 * Enable navigation preload
 */
async function enableNavigationPreload() {
  if (self.registration?.navigationPreload) {
    try {
      await self.registration.navigationPreload.enable();
      debugLog('Navigation preload enabled');
    } catch (error) {
      debugWarn('Navigation preload enable failed:', error);
    }
  }
}

self.addEventListener('activate', () => {
  enableNavigationPreload().catch(console.error);
});

/**
 * Fetch with timeout and retry logic
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
    if (retryCount < RETRY_CONFIG.maxRetries) {
      const delayMs = Math.min(
        RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
        RETRY_CONFIG.maxDelayMs
      );

      debugLog(`Fetch retry ${retryCount + 1}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms:`, request.url);

      await new Promise(resolve => setTimeout(resolve, delayMs));
      return fetchWithTimeoutAndRetry(request, timeoutMs, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Get deduplicated request key
 */
function getRequestKey(request) {
  return `${request.method}:${request.url}`;
}

/**
 * Add in-flight request with automatic cleanup
 */
function addInFlightRequest(requestKey, fetchPromise) {
  if (inFlightRequests.size >= MAX_IN_FLIGHT) {
    const oldestKey = inFlightRequests.keys().next().value;
    if (oldestKey) {
      clearInFlightRequest(oldestKey);
      debugLog('In-flight requests at capacity, evicted oldest:', oldestKey);
    }
  }

  inFlightRequests.set(requestKey, fetchPromise);

  const timeoutId = setTimeout(() => {
    if (inFlightRequests.has(requestKey)) {
      clearInFlightRequest(requestKey);
      debugLog('In-flight request timeout cleanup:', requestKey);
    }
  }, IN_FLIGHT_TIMEOUT);

  inFlightTimeouts.set(requestKey, timeoutId);
}

/**
 * Remove in-flight request and clear timeout
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
 * Enforce cache size limits with LRU eviction (optimized)
 */
async function enforceCacheSizeLimits(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    if (requests.length <= maxEntries) return;

    debugLog(`Cache ${cacheName} exceeds limit (${requests.length}/${maxEntries}), evicting old entries...`);

    // Batch 1: Get all entries with timestamps
    const entriesWithTimes = await Promise.all(
      requests.map(async (request) => {
        try {
          const response = await cache.match(request);
          const cacheTime = response
            ? parseInt(response.headers.get('X-Cache-Time') || '0', 10)
            : 0;
          return { request, cacheTime };
        } catch (error) {
          debugWarn('Failed to get cache entry metadata:', error);
          return { request, cacheTime: 0 };
        }
      })
    );

    // Batch 2: Sort by cache time (oldest first)
    entriesWithTimes.sort((a, b) => a.cacheTime - b.cacheTime);

    // Batch 3: Delete all excess entries at once
    const entriesToDelete = entriesWithTimes.slice(0, entriesWithTimes.length - maxEntries);
    await Promise.all(entriesToDelete.map(({ request }) => cache.delete(request)));

    if (entriesToDelete.length > 0) {
      debugLog(`Cache ${cacheName} reduced to ${maxEntries} entries`);
    }
  } catch (error) {
    console.error(`[SW] Error enforcing cache size limits for ${cacheName}:`, error);
  }
}

/**
 * CacheFirst strategy
 */
function cacheFirst(request, cacheName = CACHES_CONFIG.STATIC_ASSETS) {
  return caches
    .match(request)
    .then((response) => {
      if (response) {
        debugLog('CacheFirst HIT:', request.url);
        return response;
      }

      return fetchWithTimeoutAndRetry(request)
        .then((response) => {
          if (!response || !response.ok || response.type === 'error') {
            debugLog('Not caching non-ok response:', request.url, response.status);
            return response;
          }

          cacheAndEnforce(cacheName, request, response).catch((error) => {
            debugLog('Cache operation failed:', cacheName, error.message);
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
 * NetworkFirst strategy with expiration and deduplication
 */
function networkFirstWithExpiration(request, maxAgeSeconds) {
  const cacheName = getCacheNameForRequest(request);
  const requestKey = getRequestKey(request);

  const existingPromise = inFlightRequests.get(requestKey);
  if (existingPromise) {
    debugLog('Request deduplicated (in-flight):', request.url);
    return existingPromise;
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetchWithTimeoutAndRetry(request, NETWORK_TIMEOUT_MS);

      clearInFlightRequest(requestKey);

      if (!response || !response.ok || response.type === 'error') {
        debugLog('Not caching non-ok response:', request.url, response.status);
        return response;
      }

      await cacheAndEnforce(cacheName, request, response);
      return response;
    } catch (error) {
      clearInFlightRequest(requestKey);

      if (error.message.includes('timeout')) {
        debugLog('Network timeout, falling back to cache:', request.url);
      } else {
        debugLog('Network failed, trying cache:', request.url, error.message);
      }

      try {
        const cachedResponse = await caches.match(request);

        if (!cachedResponse) {
          if (request.mode === 'navigate') {
            debugLog('Navigation failed, redirecting to offline:', request.url);
            const offlineResponse = await caches.match(OFFLINE_FALLBACK_URL);
            if (offlineResponse) {
              return offlineResponse;
            }
          }
          return new Response('Offline - No cached content available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        const cacheTime = parseInt(
          cachedResponse.headers.get('X-Cache-Time') || '0',
          10
        );
        const age = Math.floor((Date.now() - cacheTime) / 1000);

        if (age > maxAgeSeconds) {
          debugLog('Cache expired:', request.url, `age: ${age}s`);
        }

        debugLog('NetworkFirst CACHE FALLBACK:', request.url);
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

  addInFlightRequest(requestKey, fetchPromise);
  return fetchPromise;
}

/**
 * StaleWhileRevalidate strategy
 */
function staleWhileRevalidate(request, maxAgeSeconds) {
  const cacheName = CACHES_CONFIG.IMAGE_CACHE;

  return caches
    .match(request)
    .then((cachedResponse) => {
      // Start background fetch
      const fetchPromise = fetchWithTimeoutAndRetry(request)
        .then((response) => {
          if (!response || !response.ok || response.type === 'error') {
            debugLog('Not caching non-ok response in background:', request.url, response.status);
            return response;
          }

          cacheAndEnforce(cacheName, request, response).catch((error) => {
            debugLog('Background cache update failed:', error);
          });

          return response;
        })
        .catch((error) => {
          debugLog('StaleWhileRevalidate background fetch failed:', error);
          return cachedResponse;
        });

      if (cachedResponse) {
        debugLog('StaleWhileRevalidate STALE:', request.url);
        return cachedResponse;
      }

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
 * Determine cache name based on request
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
 * Serve compressed data with automatic format negotiation
 */
function serveCompressedData(request) {
  const url = new URL(request.url);
  const acceptEncoding = request.headers.get('Accept-Encoding') || '';

  const supportsBrotli = acceptEncoding.includes('br');
  const supportsGzip = acceptEncoding.includes('gzip');

  const formats = [];

  if (supportsBrotli) {
    formats.push({ ext: '.br', encoding: 'br', type: 'Brotli' });
  }
  if (supportsGzip) {
    formats.push({ ext: '.gz', encoding: 'gzip', type: 'gzip' });
  }
  formats.push({ ext: '', encoding: null, type: 'uncompressed' });

  async function tryFormat(format) {
    const compressedUrl = format.ext ? `${url.pathname}${format.ext}` : url.pathname;
    const compressedRequest = new Request(compressedUrl, {
      method: request.method,
      headers: request.headers,
    });

    const cached = await caches.match(compressedRequest);
    if (cached) {
      debugLog(`Compressed data cache HIT: ${url.pathname} (${format.type})`);
      return cached;
    }

    try {
      const response = await fetchWithTimeoutAndRetry(compressedRequest);

      if (!response.ok) {
        return null;
      }

      const cache = await caches.open(CACHES_CONFIG.STATIC_ASSETS);

      const headers = createCachedHeaders(response.headers);
      headers.set('Content-Type', 'application/json');
      if (format.encoding) {
        headers.set('Content-Encoding', format.encoding);
      }

      const cachedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

      await cache.put(compressedRequest, cachedResponse);
      await enforceCacheSizeLimits(CACHES_CONFIG.STATIC_ASSETS, CACHE_SIZE_LIMITS[CACHES_CONFIG.STATIC_ASSETS]);
      notifyClientsOfCacheUpdate(CACHES_CONFIG.STATIC_ASSETS, compressedRequest.url);

      debugLog(`Compressed data cached: ${url.pathname} (${format.type})`);
      return response;
    } catch (error) {
      debugWarn(`Failed to fetch ${format.type}:`, error);
      return null;
    }
  }

  return (async () => {
    try {
      for (const format of formats) {
        const response = await tryFormat(format);
        if (response) {
          return response;
        }
      }

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
 */
function schedulePeriodicCleanup() {
  if (cleanupTimerId) {
    clearTimeout(cleanupTimerId);
  }

  cleanupTimerId = setTimeout(async () => {
    try {
      debugLog('Running periodic cache cleanup');

      await cleanExpiredEntries(CACHES_CONFIG.API_CACHE, EXPIRATION_TIMES.API);
      await cleanExpiredEntries(CACHES_CONFIG.PAGES_CACHE, EXPIRATION_TIMES.PAGES);
      await cleanExpiredEntries(CACHES_CONFIG.IMAGE_CACHE, EXPIRATION_TIMES.IMAGES);

      for (const [cacheName, limit] of Object.entries(CACHE_SIZE_LIMITS)) {
        await enforceCacheSizeLimits(cacheName, limit);
      }

      debugLog('Periodic cleanup complete');
      schedulePeriodicCleanup();
    } catch (error) {
      console.error('[SW] Periodic cleanup failed:', error);
      schedulePeriodicCleanup();
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Schedule cache warming on idle
 */
function scheduleCacheWarming() {
  if ('requestIdleCallback' in self) {
    self.requestIdleCallback(async () => {
      try {
        debugLog('Warming cache on idle');
        const criticalUrls = ['/'];
        const cache = await caches.open(CACHES_CONFIG.SHELL);

        for (const url of criticalUrls) {
          try {
            const cached = await cache.match(url);
            if (!cached) {
              const response = await fetchWithTimeoutAndRetry(new Request(url));
              if (response.ok) {
                await cache.put(url, response.clone());
                debugLog('Warmed cache for:', url);
              }
            }
          } catch (error) {
            debugWarn('Cache warming failed for:', url, error);
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
        debugLog('SKIP_WAITING message received');
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
        debugWarn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('[SW] Message handler error:', error);
  }
});

/**
 * GET_CACHE_STATUS - Report cache status
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
 * CLEANUP_CACHES - Manually purge caches
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
 */
async function performCacheCleanup() {
  const cacheNames = await caches.keys();
  const currentCaches = Object.values(CACHES_CONFIG);
  const deleted = [];

  for (const cacheName of cacheNames) {
    if (!currentCaches.includes(cacheName)) {
      await caches.delete(cacheName);
      deleted.push(cacheName);
      debugLog('Deleted cache:', cacheName);
    }
  }

  await cleanExpiredEntries(CACHES_CONFIG.API_CACHE, EXPIRATION_TIMES.API);
  await cleanExpiredEntries(CACHES_CONFIG.PAGES_CACHE, EXPIRATION_TIMES.PAGES);

  return deleted;
}

/**
 * CHECK_CRITICAL_UPDATE - Check for SW updates
 */
async function handleCheckCriticalUpdate(event) {
  try {
    const response = await fetchWithTimeoutAndRetry(
      new Request('/sw.js?cache-bust=' + Date.now())
    );

    if (response.ok) {
      const text = await response.text();
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
 */
async function handleQueueSyncRequest(event) {
  try {
    const { method, url, headers, body } = event.data.payload;

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
 * Clean expired entries from cache
 */
async function cleanExpiredEntries(cacheName, maxAgeSeconds) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const expiredRequests = [];

    // Collect expired entries
    for (const request of requests) {
      try {
        const response = await cache.match(request);
        if (!response) continue;

        const cacheTime = parseInt(response.headers.get('X-Cache-Time') || '0', 10);
        const age = Math.floor((Date.now() - cacheTime) / 1000);

        if (age > maxAgeSeconds) {
          expiredRequests.push(request);
        }
      } catch (error) {
        debugWarn('Cache entry check failed:', error);
      }
    }

    // Batch delete
    if (expiredRequests.length > 0) {
      await Promise.all(expiredRequests.map(r => cache.delete(r)));
      debugLog(`Cleaned ${expiredRequests.length} expired entries from ${cacheName}`);
    }
  } catch (error) {
    console.error('[SW] Clean expired entries failed:', error);
  }
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  try {
    if (!event.data) {
      debugLog('Push received without data');
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
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }

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
 * Background sync handler
 */
self.addEventListener('sync', (event) => {
  try {
    if (event.tag === 'sync-queue' || event.tag === 'dmb-offline-mutation-queue') {
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
 * Check data freshness and notify clients
 */
async function checkDataFreshness() {
  try {
    debugLog('Periodic background sync: checking data freshness');
    const startTime = Date.now();

    try {
      const response = await fetchWithTimeoutAndRetry(
        new Request('/api/data-version', {
          headers: { 'X-Periodic-Sync': 'true' }
        })
      );

      if (response.ok) {
        const data = await response.json();
        const version = data.version || 'unknown';

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
        debugLog(`Periodic sync complete (${duration}ms): checked version ${version}, notified ${clientCount} clients`);
      } else {
        debugWarn('Periodic sync: data-version API returned status', response.status);
      }
    } catch (error) {
      debugWarn('Periodic sync: failed to check data freshness:', error.message);
    }

    try {
      debugLog('Periodic sync: refreshing critical cache entries');

      const criticalUrls = ['/api/shows', '/api/songs', '/api/venues'];
      let refreshedCount = 0;

      for (const url of criticalUrls) {
        try {
          const response = await fetchWithTimeoutAndRetry(new Request(url));
          if (response.ok) {
            const cache = await caches.open(CACHES_CONFIG.API_CACHE);
            const headers = createCachedHeaders(response.headers);

            await cache.put(
              url,
              new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers
              })
            );
            refreshedCount++;
          }
        } catch (error) {
          debugWarn('Periodic sync: failed to refresh', url, error.message);
        }
      }

      debugLog(`Periodic sync: refreshed ${refreshedCount}/${criticalUrls.length} critical cache entries`);
    } catch (error) {
      debugWarn('Periodic sync: cache refresh failed:', error.message);
    }

  } catch (error) {
    console.error('[SW] Periodic background sync failed:', error);
    throw error;
  }
}

/**
 * Process sync queue from IndexedDB
 */
async function processSyncQueue() {
  try {
    debugLog('Processing sync queue...');

    const dbRequest = indexedDB.open('dmb-almanac');

    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);

      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;

        if (!db.objectStoreNames.contains('syncQueue')) {
          debugLog('syncQueue table does not exist, skipping');
          db.close();
          resolve();
          return;
        }

        const transaction = db.transaction(['syncQueue'], 'readonly');
        const store = transaction.objectStore('syncQueue');
        const queueItems = [];

        store.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            queueItems.push(cursor.value);
            cursor.continue();
          }
        };

        transaction.oncomplete = async () => {
          if (queueItems.length === 0) {
            debugLog('Sync queue is empty');
            db.close();
            resolve();
            return;
          }

          debugLog('Found', queueItems.length, 'items to sync');

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
                const deleteTransaction = db.transaction(['syncQueue'], 'readwrite');
                const deleteStore = deleteTransaction.objectStore('syncQueue');
                deleteStore.delete(item.id);

                debugLog('Synced:', item.endpoint, item.id);
              } else {
                debugWarn('Sync failed with status', response.status, ':', item.endpoint);
              }
            } catch (error) {
              console.error('[SW] Sync error for', item.endpoint, ':', error);
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
    throw error;
  }
}

/**
 * Process telemetry queue from IndexedDB
 */
async function processTelemetryQueue() {
  try {
    debugLog('Processing telemetry queue...');

    const dbRequest = indexedDB.open('dmb-almanac');

    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);

      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;

        if (!db.objectStoreNames.contains('telemetryQueue')) {
          debugLog('telemetryQueue table does not exist, skipping');
          db.close();
          resolve();
          return;
        }

        const transaction = db.transaction(['telemetryQueue'], 'readonly');
        const store = transaction.objectStore('telemetryQueue');
        const queueItems = [];

        const statusIndex = store.index('status');

        const pendingRequest = statusIndex.getAll('pending');
        pendingRequest.onsuccess = () => {
          queueItems.push(...pendingRequest.result);
        };

        const retryingRequest = statusIndex.getAll('retrying');
        retryingRequest.onsuccess = () => {
          queueItems.push(...retryingRequest.result);
        };

        transaction.oncomplete = async () => {
          if (queueItems.length === 0) {
            debugLog('Telemetry queue is empty');
            db.close();
            resolve();
            return;
          }

          debugLog('Found', queueItems.length, 'telemetry items to process');

          for (const item of queueItems) {
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
                const updateTransaction = db.transaction(['telemetryQueue'], 'readwrite');
                const updateStore = updateTransaction.objectStore('telemetryQueue');
                updateStore.put({
                  ...item,
                  status: 'completed'
                });

                debugLog('Telemetry sent:', item.id);
              } else {
                const retries = (item.retries || 0) + 1;
                const maxRetries = 3;

                if (retries >= maxRetries) {
                  const updateTransaction = db.transaction(['telemetryQueue'], 'readwrite');
                  const updateStore = updateTransaction.objectStore('telemetryQueue');
                  updateStore.put({
                    ...item,
                    status: 'failed',
                    retries,
                    lastError: `HTTP ${response.status}: ${response.statusText}`
                  });

                  debugWarn('Telemetry failed permanently after', retries, 'retries:', item.id);
                } else {
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

                  debugWarn('Telemetry retry scheduled:', item.id, 'attempt', retries);
                }
              }
            } catch (error) {
              const retries = (item.retries || 0) + 1;
              const maxRetries = 3;

              if (retries >= maxRetries) {
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

                debugWarn('Telemetry retry scheduled:', item.id, 'attempt', retries);
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
    throw error;
  }
}

debugLog('Service Worker loaded');
