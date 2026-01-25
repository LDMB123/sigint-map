# PWA Audit - Quick Fix Code Snippets

Copy-paste ready solutions for the 4 critical issues.

---

## Fix #1: In-Flight Deduplication Memory Leak

**File:** `static/sw.js`
**Replace lines 60-61 and 265-350 with:**

```javascript
// Request deduplication Map - tracks in-flight requests
const inFlightRequests = new Map();
const requestTimestamps = new Map();

// Maximum in-flight requests to track (prevents unbounded growth)
const MAX_IN_FLIGHT_REQUESTS = 100;
const REQUEST_DEDUP_TIMEOUT_MS = 60000; // 1 minute timeout

/**
 * Get deduplicated request key for deduplication (GET/HEAD only)
 * @param {Request} request - The fetch request
 * @returns {string|null} Unique key for the request, or null if non-idempotent
 */
function getRequestKey(request) {
  // Only deduplicate safe, idempotent requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return null;
  }
  return `${request.method}:${request.url}`;
}

/**
 * Track in-flight request with automatic timeout cleanup
 */
function trackInFlightRequest(key, promise) {
  // Enforce maximum concurrent requests
  if (inFlightRequests.size >= MAX_IN_FLIGHT_REQUESTS) {
    // Remove oldest entries
    const entries = Array.from(requestTimestamps.entries())
      .sort(([, aTime], [, bTime]) => aTime - bTime);

    // Remove oldest 10% of requests
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      const [oldKey] = entries[i];
      inFlightRequests.delete(oldKey);
      requestTimestamps.delete(oldKey);
      console.log('[SW] Evicted old in-flight request:', oldKey);
    }
  }

  inFlightRequests.set(key, promise);
  requestTimestamps.set(key, Date.now());

  // Auto-cleanup if request hangs longer than timeout
  const timeoutId = setTimeout(() => {
    if (inFlightRequests.get(key) === promise) {
      inFlightRequests.delete(key);
      requestTimestamps.delete(key);
      console.warn('[SW] In-flight request timeout cleanup:', key);
    }
  }, REQUEST_DEDUP_TIMEOUT_MS);

  // Clear timeout if request completes
  promise
    .finally(() => {
      clearTimeout(timeoutId);
    })
    .catch(() => {
      // Silence promise rejection warning
    });
}

/**
 * NetworkFirst strategy with expiration, timeout, and deduplication
 * Try network first with 3s timeout, fall back to cache, respect cache age
 * Deduplicates identical in-flight GET requests
 */
function networkFirstWithExpiration(request, maxAgeSeconds) {
  const cacheName = getCacheNameForRequest(request);
  const requestKey = getRequestKey(request);

  // Check for in-flight request deduplication (GET/HEAD only)
  if (requestKey && inFlightRequests.has(requestKey)) {
    console.log('[SW] Request deduplicated (in-flight):', request.url);
    return inFlightRequests.get(requestKey);
  }

  // Create the fetch promise with timeout
  const fetchPromise = fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
    .then((response) => {
      // Only cache successful responses
      if (!response || response.status !== 200 || response.type === 'error') {
        return response;
      }

      // Clone and cache with timestamp
      const clonedResponse = response.clone();
      caches.open(cacheName).then((cache) => {
        const responseWithMetadata = clonedResponse.clone();
        // Store timestamp in response headers for expiration checking
        const headers = new Headers(responseWithMetadata.headers);
        headers.set('X-Cache-Time', String(Date.now()));
        cache.put(
          request,
          new Response(responseWithMetadata.body, {
            status: responseWithMetadata.status,
            statusText: responseWithMetadata.statusText,
            headers: headers,
          })
        );
      });

      return response;
    })
    .catch((error) => {
      // Log timeout vs other errors differently
      if (error.message.includes('timeout')) {
        console.log('[SW] Network timeout, falling back to cache:', request.url);
      } else {
        console.log('[SW] Network failed, trying cache:', request.url, error);
      }

      // Network failed or timed out, check cache
      return caches
        .match(request)
        .then((cachedResponse) => {
          if (!cachedResponse) {
            // No cache, return offline fallback for navigation requests
            if (request.mode === 'navigate') {
              console.log('[SW] Navigation failed, redirecting to offline:', request.url);
              return caches.match(OFFLINE_FALLBACK_URL);
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
        });
    });

  // Track this request as in-flight (only for GET/HEAD)
  if (requestKey) {
    trackInFlightRequest(requestKey, fetchPromise);
  }

  return fetchPromise;
}
```

---

## Fix #2: Service Worker Lifecycle Cleanup

**File:** `src/routes/+layout.svelte`
**Replace lines 26-65 with:**

```typescript
onMount(() => {
  _mounted = true;

  // Initialize PWA and capture cleanup function
  const pwCleanup = pwaStore.initialize();

  // Initialize data loading
  dataStore.initialize();

  // Initialize cache invalidation listeners
  setupCacheInvalidationListeners();

  // Initialize offline mutation queue
  initializeQueue();

  // Initialize Navigation API (Chrome 102+)
  initializeNavigation();

  // Initialize Speculation Rules API (Chrome 109+ / Chromium 2025)
  // Handles intelligent prerendering/prefetching for instant navigation
  initializeSpeculationRules();

  // Monitor prerendering state if page was prerendered
  // Useful for deferring animations/interactions until page is visible
  if ((globalThis.document as any)?.prerendering) {
    onPrerenderingComplete(() => {
      console.info('[Layout] Prerendered page is now visible');
    });
  }

  // Preload WASM module in background for faster first use
  initializeWasm().catch(err => {
    console.warn('[Layout] WASM preload failed, will use JS fallback:', err);
  });

  // Cleanup function - called when component unmounts
  return () => {
    // Clean offline queue
    cleanupQueue();

    // Clean PWA listeners (IMPORTANT: calls AbortController.abort())
    pwCleanup?.();

    console.debug('[Layout] Cleanup complete');
  };
});
```

**Also update:** `src/lib/stores/pwa.ts` (lines 56-62)

Ensure `initialize()` always returns a cleanup function:

```typescript
async initialize() {
  if (!browser) return () => {};  // Return no-op function for SSR

  const controller = new AbortController();

  // ... rest of initialization code ...

  // Return cleanup function at the end
  return () => {
    controller.abort();
    cleanupFunctions.forEach((fn) => fn());
    cleanupFunctions = [];
  };
}
```

---

## Fix #3: Register Background Sync on Client

**File:** `src/lib/stores/pwa.ts`
**Add this function after `initialize()`:**

```typescript
/**
 * Register background sync for offline mutations
 * Syncs offline actions (favorites, attended shows) with server
 */
async function registerBackgroundSync(): Promise<boolean> {
  if (!browser) return false;

  try {
    const reg = get(registration);

    if (!reg) {
      console.debug('[PWA] Service worker not ready for background sync');
      return false;
    }

    // Check if background sync is supported
    if (!('sync' in reg)) {
      console.debug('[PWA] Background Sync API not supported');
      return false;
    }

    // Register for background sync
    await (reg as any).sync.register('sync-queue');
    console.debug('[PWA] Background sync registered');
    return true;
  } catch (error) {
    console.error('[PWA] Background sync registration failed:', error);
    return false;
  }
}
```

**Then in the pwaStore object, add:**

```typescript
// Export new function
export const pwaStore = {
  isSupported: { subscribe: isSupported.subscribe },
  isReady: { subscribe: isReady.subscribe },
  hasUpdate: { subscribe: hasUpdate.subscribe },
  isInstalled: { subscribe: isInstalled.subscribe },
  isOffline: { subscribe: isOffline.subscribe },

  async initialize() {
    // ... existing code ...
  },

  cleanup() {
    // ... existing code ...
  },

  // New method
  async registerBackgroundSync() {
    return registerBackgroundSync();
  },

  // ... rest of store ...
};
```

**Finally, call from layout after PWA init:**

```typescript
// In src/routes/+layout.svelte onMount()
const pwCleanup = pwaStore.initialize();

// Register background sync once PWA is ready
$effect.pre(() => {
  if (browser && $pwaState.isReady) {
    pwaStore.registerBackgroundSync();
  }
});
```

---

## Fix #4: Register Periodic Sync on Client

**File:** `src/lib/stores/pwa.ts`
**Add this function:**

```typescript
/**
 * Register periodic background sync for data freshness checks
 * Checks for new data at regular intervals (browser-controlled, minimum 24 hours)
 */
async function registerPeriodicSync(): Promise<boolean> {
  if (!browser) return false;

  try {
    const reg = get(registration);

    if (!reg) {
      console.debug('[PWA] Service worker not ready for periodic sync');
      return false;
    }

    // Check if periodic sync is supported
    if (!('periodicSync' in reg)) {
      console.debug('[PWA] Periodic Sync API not supported');
      return false;
    }

    // Check permission status
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    });

    if (status.state !== 'granted') {
      console.debug('[PWA] Periodic sync permission not granted');
      return false;
    }

    // Register periodic sync - browser will check every 24 hours minimum
    await (reg as any).periodicSync.register('check-data-freshness', {
      minInterval: 24 * 60 * 60 * 1000, // 24 hours
    });

    console.debug('[PWA] Periodic sync registered');
    return true;
  } catch (error) {
    console.error('[PWA] Periodic sync registration failed:', error);
    return false;
  }
}
```

**Add to pwaStore:**

```typescript
export const pwaStore = {
  // ... existing methods ...

  async registerPeriodicSync() {
    return registerPeriodicSync();
  },

  // ... rest of store ...
};
```

**Call from layout:**

```typescript
// In src/routes/+layout.svelte onMount()
$effect.pre(() => {
  if (browser && $pwaState.isReady && Notification.permission === 'granted') {
    // Only register if notifications enabled (implies user wants background activity)
    pwaStore.registerPeriodicSync();
  }
});
```

---

## Verification Commands

After applying fixes, verify they work:

```bash
# 1. Check memory leak fix
npm run dev
# DevTools > Console > Network tab > Slow 3G
# Navigate same page 10 times rapidly
# Check: inFlightRequests Map should stay under 10 entries
# grep -n "inFlightRequests.set\|inFlightRequests.delete" static/sw.js

# 2. Check lifecycle cleanup
npm run dev
# Enable fast refresh (should trigger)
# DevTools > Console should show: "[Layout] Cleanup complete"
# Run 5 times, should not show accumulated listeners

# 3. Check background sync registration
npm run dev
# Go offline
# Perform an action that triggers sync
# DevTools > Application > Service Workers > check for "sync-queue"
# Should be present

# 4. Check periodic sync registration
npm run dev
# DevTools > Application > Service Workers
# Look for "check-data-freshness" in periodic sync
# Note: only shows if notification permission granted
```

---

## Rollback Plan

If issues occur after applying fixes:

1. **Memory leak fix fails:** Comment out `trackInFlightRequest()` calls, revert to original dedup
2. **Lifecycle cleanup breaks:** Remove `pwCleanup?.()` call, event listeners will accumulate but app works
3. **Background sync breaks:** Comment out `registerBackgroundSync()` call, offline sync won't work but no errors
4. **Periodic sync breaks:** Comment out `registerPeriodicSync()` call, data freshness checks skip but no errors

---

## Testing Checklist

- [ ] No console errors after applying fixes
- [ ] Service worker registers successfully
- [ ] Cache works offline
- [ ] Update detection works
- [ ] Hot reload doesn't leak listeners
- [ ] In-flight dedup under 100 entries
- [ ] Background sync registers (check DevTools)
- [ ] Periodic sync registers (if notifications enabled)

---

## Performance Impact

| Fix | Before | After | Improvement |
|-----|--------|-------|-------------|
| Memory leak | Unbounded | <100 entries | Memory safe |
| Lifecycle | Accumulating listeners | Proper cleanup | 0 leaks |
| Background sync | Manual only | Auto-syncs offline | Seamless UX |
| Periodic sync | Never runs | 24h checks | Data freshness |

All fixes have **zero performance overhead** in the happy path.
