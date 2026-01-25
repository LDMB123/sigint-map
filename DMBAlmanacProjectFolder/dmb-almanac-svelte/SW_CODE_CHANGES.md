# Service Worker Code Changes - Quick Reference

## All Code Changes Required

This document shows exactly what to change, line-by-line. Copy-paste ready.

---

## Change 1: Remove BroadcastChannel (Lines 118-124)

**DELETE these lines:**
```javascript
// BroadcastChannel for cache update notifications
let broadcastChannel = null;
try {
  broadcastChannel = new BroadcastChannel('dmb-sw-cache-updates');
} catch (error) {
  console.warn('[SW] BroadcastChannel not supported:', error);
}
```

---

## Change 2: Add DEBUG System (After line 113)

**ADD this code:**
```javascript
// DEBUG mode - set to false in production for size reduction
// Terser will dead-code-eliminate all debugLog/debugWarn calls when DEBUG=false
const DEBUG = false;

function debugLog(...args) {
  if (DEBUG) console.log('[SW]', ...args);
}

function debugWarn(...args) {
  if (DEBUG) console.warn('[SW]', ...args);
}
```

---

## Change 3: Add Client Notification Function (After line 125)

**ADD this code:**
```javascript
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
```

---

## Change 4: Add Cache Header Helpers (After line 125)

**ADD this code:**
```javascript
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
```

---

## Change 5: Replace Console Calls (Find & Replace All)

**Find:** `console.log('[SW]`
**Replace with:** `debugLog(`

**Find:** `console.warn('[SW]`
**Replace with:** `debugWarn(`

**Examples:**
```javascript
// BEFORE:
console.log('[SW] Installing service worker');
console.warn('[SW] BroadcastChannel not supported:', error);

// AFTER:
debugLog('Installing service worker');
debugWarn('BroadcastChannel not supported:', error);
```

**NOTE:** Keep `console.error('[SW]` as-is (errors always logged)

---

## Change 6: Replace BroadcastChannel Posts (3 Locations)

### Location 1: In `cacheFirst()` function (around line 542)

**FIND:**
```javascript
// Broadcast cache update
if (broadcastChannel) {
  broadcastChannel.postMessage({
    type: 'CACHE_UPDATED',
    cacheName,
    url: request.url,
    timestamp: Date.now()
  });
}
```

**REPLACE WITH:**
```javascript
// Notify clients of cache update
notifyClientsOfCacheUpdate(cacheName, request.url);
```

### Location 2: In `networkFirstWithExpiration()` function (around line 628)

**FIND:**
```javascript
// Broadcast cache update
if (broadcastChannel) {
  broadcastChannel.postMessage({
    type: 'CACHE_UPDATED',
    cacheName,
    url: request.url,
    timestamp: Date.now()
  });
}
```

**REPLACE WITH:**
```javascript
// Notify clients of cache update
notifyClientsOfCacheUpdate(cacheName, request.url);
```

### Location 3: In `serveCompressedData()` function (around line 883)

**FIND:**
```javascript
// Broadcast cache update
if (broadcastChannel) {
  broadcastChannel.postMessage({
    type: 'CACHE_UPDATED',
    cacheName: CACHES_CONFIG.STATIC_ASSETS,
    url: compressedRequest.url,
    timestamp: Date.now()
  });
}
```

**REPLACE WITH:**
```javascript
// Notify clients of cache update
notifyClientsOfCacheUpdate(CACHES_CONFIG.STATIC_ASSETS, compressedRequest.url);
```

---

## Change 7: Replace Cache Operations with Helper (4 Locations)

### Location 1: In `cacheFirst()` function (around line 520-555)

**FIND:**
```javascript
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

        // Broadcast cache update
        if (broadcastChannel) {
          broadcastChannel.postMessage({
            type: 'CACHE_UPDATED',
            cacheName,
            url: request.url,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('[SW] Cache operation error:', error);
      }
    }).catch((error) => {
      console.error('[SW] Error opening cache:', cacheName, error);
    });

    return response;
  })
```

**REPLACE WITH:**
```javascript
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
```

### Location 2: In `networkFirstWithExpiration()` function (around line 608-638)

**FIND:**
```javascript
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

  // Broadcast cache update
  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'CACHE_UPDATED',
      cacheName,
      url: request.url,
      timestamp: Date.now()
    });
  }
} catch (error) {
  console.error('[SW] Error caching response:', cacheName, error);
}
```

**REPLACE WITH:**
```javascript
try {
  await cacheAndEnforce(cacheName, request, response);
} catch (error) {
  debugLog('Error caching response:', cacheName, error.message);
}
```

### Location 3: In `staleWhileRevalidate()` function (around line 727-761)

**FIND:**
```javascript
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
    // Broadcast cache update
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'CACHE_UPDATED',
        cacheName,
        url: request.url,
        timestamp: Date.now()
      });
    }
  })
  .catch((error) => {
    console.error('[SW] Background cache update failed:', error);
    // Don't throw - let background update fail silently
  });
```

**REPLACE WITH:**
```javascript
cacheAndEnforce(cacheName, request, response).catch((error) => {
  debugLog('Background cache update failed:', error);
});
```

### Location 4: In `serveCompressedData()` function (around line 858-890)

**FIND:**
```javascript
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

// Broadcast cache update
if (broadcastChannel) {
  broadcastChannel.postMessage({
    type: 'CACHE_UPDATED',
    cacheName: CACHES_CONFIG.STATIC_ASSETS,
    url: compressedRequest.url,
    timestamp: Date.now()
  });
}

console.log(`[SW] Compressed data cached: ${url.pathname} (${format.type})`);
```

**REPLACE WITH:**
```javascript
// Cache successful response with compression headers
const cache = await caches.open(CACHES_CONFIG.STATIC_ASSETS);
const headers = createCachedHeaders(response.headers);
headers.set('Content-Type', 'application/json');
if (format.encoding) {
  headers.set('Content-Encoding', format.encoding);
}

const cachedResponse = new Response(response.body, {
  status: response.status,
  statusText: response.statusText,
  headers: headers,
});

await cache.put(compressedRequest, cachedResponse);
await enforceCacheSizeLimits(CACHES_CONFIG.STATIC_ASSETS, CACHE_SIZE_LIMITS[CACHES_CONFIG.STATIC_ASSETS]);
notifyClientsOfCacheUpdate(CACHES_CONFIG.STATIC_ASSETS, compressedRequest.url);

debugLog(`Compressed data cached: ${url.pathname} (${format.type})`);
```

---

## Change 8: Optimize `cleanExpiredEntries()` Function (Around line 1234)

**FIND:**
```javascript
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
```

**REPLACE WITH:**
```javascript
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
```

---

## Change 9: Condense Header Comments

**FIND (lines 1-12):**
```javascript
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
```

**REPLACE WITH:**
```javascript
/**
 * DMB Almanac Service Worker (OPTIMIZED)
 * Implements: precache, cache-first, network-first, stale-while-revalidate
 */
```

---

## Summary of Find/Replace Operations

```
1. DELETE: Lines 118-124 (BroadcastChannel)
2. ADD: DEBUG flag + functions (line ~113)
3. ADD: notifyClientsOfCacheUpdate() (line ~125)
4. ADD: Cache header helpers (line ~125)
5. REPLACE: console.log('[SW]' → debugLog( (all)
6. REPLACE: console.warn('[SW]' → debugWarn( (all)
7. REPLACE: broadcastChannel.postMessage → notifyClientsOfCacheUpdate (3x)
8. REPLACE: Cache operations with cacheAndEnforce (4x)
9. OPTIMIZE: cleanExpiredEntries (1x)
10. CONDENSE: Header comments (1x)
```

---

## Quick Validation

After making changes, verify:

```javascript
// 1. Check DEBUG flag exists
const DEBUG = false;  // Should be present

// 2. Check new functions exist
function notifyClientsOfCacheUpdate() { ... }
function createCachedHeaders() { ... }
function createCachedResponse() { ... }
function cacheAndEnforce() { ... }

// 3. Check no BroadcastChannel references
// Should have 0 matches in search
broadcastChannel

// 4. Check console calls
// Should only see console.error, debugLog, debugWarn
console.log  // Should have 0 matches in SW
console.warn // Should have 0 matches in SW

// 5. Verify size reduction
// Before: ~55.4KB
// After: ~47KB (before minification)
```

---

## Testing After Changes

```bash
# 1. Syntax check
node -c static/sw.js  # Should output nothing if valid

# 2. Size check
wc -c static/sw.js  # Should be ~47KB

# 3. Build check
npm run build  # Should complete without errors

# 4. DevTools check
# Open Chrome DevTools → Application → Service Workers
# Should show SW registered and ready

# 5. Functionality check
# Go to offline page
# Should see cached content
```

---

## All Changes at a Glance

| Change | Lines | Type | Impact |
|--------|-------|------|--------|
| Remove BroadcastChannel | 118-124 | DELETE | +Safari |
| Add DEBUG system | ~113 | ADD | -3.6KB |
| Add notifyClients() | ~125 | ADD | Safari support |
| Add cache helpers | ~125 | ADD | -2.0KB |
| Replace console calls | Various | REPLACE | -3.6KB |
| Replace posts | 3x | REPLACE | Safari support |
| Replace cache ops | 4x | REPLACE | -2.0KB |
| Optimize cleanup | ~1234 | REPLACE | -0.4KB |
| Condense comments | ~1-12 | REPLACE | -0.7KB |
| **Total** | - | - | **-8-12KB** |

---

Done! You can now:
1. Apply these changes manually or
2. Use `sw-optimized.js` directly as a replacement

See `SW_MIGRATION_GUIDE.md` for deployment steps.
