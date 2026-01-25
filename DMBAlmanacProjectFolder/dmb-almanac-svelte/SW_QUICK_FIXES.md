# SW Quick Fixes - Code Snippets

## Fix 1: PWA Store Initialization Guard

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/pwa.ts`

Replace the entire `pwaStore` object initialization with this guard:

```typescript
// Add at top of pwaStore definition
let initialized = false;
let initPromise: Promise<void> | null = null;

export const pwaStore = {
  // ... existing stores ...

  async initialize() {
    if (initialized) return;

    // Prevent race conditions
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (!browser) return;

      try {
        // ... existing code from lines 59-135 ...

        initialized = true;
      } catch (error) {
        console.error('Service Worker initialization failed:', error);
        initialized = true; // Mark as initialized even on error to prevent retry loop
      }
    })();

    return initPromise;
  }
}
```

---

## Fix 2: Add SW Update Notification

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js`

Add this to the activate event (after line 100):

```javascript
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        const currentCaches = Object.values(CACHES_CONFIG);
        const cachesToDelete = cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );

        if (cachesToDelete.length > 0) {
          console.log('[SW] Deleting old caches:', cachesToDelete);
        }

        return Promise.all(
          cachesToDelete.map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
      .then(() => {
        // NEW: Notify all clients of update
        console.log('[SW] Notifying clients of update');
        return self.clients.matchAll({ type: 'window' });
      })
      .then((clients) => {
        // NEW: Send message to each client
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      })
  );
});
```

Then update the pwa.ts store to handle this message (add to the initialize function after line 132):

```typescript
// Handle SW updated message
const handleSWUpdated = (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SW_UPDATED') {
    console.log('[PWA] SW updated, reloading...');
    window.location.reload();
  }
};

navigator.serviceWorker.addEventListener('message', handleSWUpdated);
cleanupFunctions.push(() => {
  navigator.serviceWorker.removeEventListener('message', handleSWUpdated);
});
```

---

## Fix 3: Improve Precache Error Handling

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js`

Replace the entire install event (lines 53-72) with:

```javascript
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  const precacheWithFallback = async () => {
    const cache = await caches.open(CACHES_CONFIG.SHELL);
    const failedUrls = [];

    for (const url of PRECACHE_URLS) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`[SW] Precache failed for ${url}: ${response.status}`);
          failedUrls.push(url);
          continue;
        }
        await cache.put(url, response);
        console.log(`[SW] Precached: ${url}`);
      } catch (error) {
        console.warn(`[SW] Precache failed for ${url}:`, error);
        failedUrls.push(url);
      }
    }

    if (failedUrls.length > 0) {
      console.warn(`[SW] ${failedUrls.length} URLs failed to precache:`, failedUrls);
    }

    console.log('[SW] Precache complete');
    return self.skipWaiting();
  };

  event.waitUntil(precacheWithFallback().catch((error) => {
    console.error('[SW] Critical precache error:', error);
    return self.skipWaiting(); // Still continue install
  }));
});
```

---

## Fix 4: Add Network Timeout

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js`

Add this helper function before the networkFirstWithExpiration function (around line 206):

```javascript
/**
 * Fetch with timeout
 * @param {Request} request - The request
 * @param {number} timeoutMs - Timeout in milliseconds (default 5000ms)
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(request, timeoutMs = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Fetch timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ]);
}
```

Then update networkFirstWithExpiration to use it (line 209):

```javascript
function networkFirstWithExpiration(request, maxAgeSeconds) {
  const cacheName = getCacheNameForRequest(request);

  return fetchWithTimeout(request, 5000)  // Changed: use timeout
    .then((response) => {
      // ... rest stays the same ...
    })
    .catch((error) => {
      console.log('[SW] Network failed (timeout or error), trying cache:', request.url, error);
      // ... rest stays the same ...
    });
}
```

---

## Fix 5: Add Cache Staleness Flag

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js`

Replace the expiration check in networkFirstWithExpiration (lines 246-257):

```javascript
// Check if cache is expired
const cacheTime = parseInt(
  cachedResponse.headers.get('X-Cache-Time') || '0',
  10
);
const age = Math.floor((Date.now() - cacheTime) / 1000);

let responseToReturn = cachedResponse;

if (age > maxAgeSeconds) {
  console.log('[SW] Cache expired:', request.url, `age: ${age}s`);

  // Add staleness headers
  const headers = new Headers(cachedResponse.headers);
  headers.set('X-Cache-Stale', 'true');
  headers.set('X-Cache-Age', String(age));

  responseToReturn = new Response(cachedResponse.body, {
    status: cachedResponse.status,
    statusText: cachedResponse.statusText,
    headers: headers
  });
}

console.log('[SW] NetworkFirst CACHE FALLBACK:', request.url);
return responseToReturn;
```

Then in your Svelte components, check for staleness:

```svelte
<script>
  async function loadData(url) {
    const response = await fetch(url);
    const isStale = response.headers.get('X-Cache-Stale') === 'true';
    const cacheAge = response.headers.get('X-Cache-Age');

    if (isStale) {
      console.warn(`Data is stale (${cacheAge}s old), consider refreshing`);
      // Show stale data warning to user
    }

    return await response.json();
  }
</script>
```

---

## Fix 6: Close MessageChannel Ports

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/sw/register.ts`

Update getCacheStatus function (lines 352-391):

```typescript
export async function getCacheStatus(): Promise<{
  version: string;
  caches: Record<string, { entries: number; size: string }>;
  totalSize: string;
  totalEntries: number;
} | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const channel = new MessageChannel();

    const status = await new Promise<{
      version: string;
      caches: Record<string, { entries: number; size: string }>;
      totalSize: string;
      totalEntries: number;
    } | null>((resolve) => {
      const timeout = setTimeout(() => {
        channel.port1.close();  // NEW: Close port on timeout
        resolve(null);
      }, 5000);

      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        channel.port1.close();  // NEW: Close port after message
        resolve(event.data);
      };

      if (registration.active) {
        registration.active.postMessage({ type: "GET_CACHE_STATUS" }, [channel.port2]);
      }
    });

    return status;
  } catch (error) {
    console.error("[SW] Get cache status failed:", error);
    return null;
  }
}
```

Apply same pattern to:
- `checkForCriticalUpdates()` (lines 291-327)
- `triggerCacheCleanup()` (indirectly - already working)

---

## Fix 7: Fix Environment Detection

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/sw/register.ts`

Replace lines 39-43:

```typescript
// OLD:
if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_ENABLE_SW_DEV) {
  console.log("[SW] Skipping SW registration in development");
  return;
}

// NEW:
// Note: SvelteKit always registers SW now for better testing
// To skip in dev, wrap the registerServiceWorker() call with a dev check
// import { dev } from '$app/environment';
// if (!dev) { registerServiceWorker(); }
```

Then in your components:

```typescript
// pwa.ts or +layout.svelte
import { dev } from '$app/environment';

if (!dev) {
  pwaStore.initialize();
}
```

---

## Fix 8: Fix Manifest ID

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/manifest.json`

Change line 2 from:
```json
"id": "/dmb-almanac",
```

To:
```json
"id": "/",
```

This should match your actual deployment path. If you deploy to a subdirectory later, remember to update BOTH:
1. manifest.json `"id"` and `"scope"`
2. pwa.ts register call `scope` parameter

---

## Testing Checklist

After applying fixes, test these scenarios:

```bash
# 1. Clear everything
DevTools > Application > Service Workers > Unregister
DevTools > Application > Cache Storage > Delete all
LocalStorage > Clear all

# 2. Fresh install
Reload page
Check: Single SW registration in DevTools
Check: dmb-shell-v1 cache has 6 entries

# 3. Navigate around
Visit /songs, /venues, /stats
Check: Pages cache populated
Check: No error in console

# 4. Offline test
DevTools > Network > Offline
Reload page
Check: Shows offline page
Navigate to cached pages: Should work
Navigate to uncached pages: Should show offline fallback

# 5. Update test
Edit sw.js, change CACHE_VERSION to 'v2'
npm run build
npm run preview
Open in new tab
Check: "Update available" banner appears
Click "Update Now"
Check: Page reloads automatically with new SW

# 6. Timeout test
DevTools > Network > Slow 3G
Visit uncached page
Should show fallback after ~5s, not hang forever

# 7. iOS Safari test (if available)
Add to home screen
Open from home screen
Test offline functionality
Test caching
(Note: Limited PWA support on iOS)
```

---

## Performance Impact

These fixes should improve:
- **Installation reliability:** Better error handling for precache failures
- **Update experience:** Automatic reload on SW update
- **Offline resilience:** Timeout prevents indefinite hangs
- **Memory usage:** Port cleanup prevents leaks
- **User experience:** Staleness indicators for cached data

