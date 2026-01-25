# DMB Almanac Svelte PWA - Service Worker Debug Report

Generated: January 21, 2026

## Executive Summary

The Service Worker implementation in DMB Almanac Svelte has several issues that could impact PWA functionality, offline capabilities, and update behavior. Most are medium-severity issues related to initialization timing, cache strategies, and event handling.

---

## Issues Found

### CRITICAL: Race Condition in PWA Store Initialization

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/pwa.ts`
**Lines:** 56-143

**Issue:** The `pwaStore.initialize()` function is called in `onMount` hooks in multiple components, but it doesn't prevent multiple invocations. This can cause:
- Multiple `register()` calls for the same SW
- Duplicate event listeners
- Memory leaks from uncleaned listeners

**Current Code:**
```typescript
// +layout.svelte (line 20)
onMount(() => {
  mounted = true;
  pwaStore.initialize();  // Could be called multiple times
  dataStore.initialize();
});

// InstallPrompt.svelte (line 46)
onMount(() => {
  pwaStore.initialize();  // Second invocation!
});
```

**Impact:** HIGH - Multiple registrations can cause:
- Memory leaks from duplicate listeners
- Confusing console logs
- Potential race conditions in update flow

**Fix:** Add guard to prevent re-initialization:
```typescript
let initialized = false;

export const pwaStore = {
  async initialize() {
    if (initialized) return;
    initialized = true;
    // ... rest of initialization
  }
}
```

---

### HIGH: Incomplete Cleanup in Event Listeners

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/pwa.ts`
**Lines:** 104-124

**Issue:** The `updatefound` listener attaches a nested `statechange` listener, but the AbortController doesn't clean it up properly.

**Current Code:**
```typescript
const handleUpdateFound = () => {
  const newWorker = reg.installing;
  if (newWorker) {
    const handleStateChange = () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        hasUpdate.set(true);
      }
    };
    newWorker.addEventListener('statechange', handleStateChange);
    // Only adds to cleanupFunctions array, not AbortController
    cleanupFunctions.push(() => {
      newWorker.removeEventListener('statechange', handleStateChange);
    });
  }
};

reg.addEventListener('updatefound', handleUpdateFound);
```

**Impact:** MEDIUM - Can cause:
- Stale listeners if component unmounts
- Potential memory leaks
- Multiple `hasUpdate` state changes for same update

**Fix:** Use AbortController for nested listeners:
```typescript
const nestedController = new AbortController();
newWorker.addEventListener('statechange', handleStateChange, {
  signal: nestedController.signal
});
cleanupFunctions.push(() => nestedController.abort());
```

---

### HIGH: Missing `clients.claim()` Follow-up

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js`
**Line:** 66, 100

**Issue:** The SW calls `self.skipWaiting()` immediately on install, but doesn't force clients to reload when a new SW takes control.

**Current Code:**
```javascript
// Line 66
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(CACHES_CONFIG.SHELL)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        self.skipWaiting();  // Takes over immediately
      })
  );
});

// Line 100
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // ... cleanup ...
    .then(() => {
      return self.clients.claim();  // Claims existing clients
    })
  );
});
```

**Issue:** When `clients.claim()` is called, existing clients are suddenly controlled by the NEW SW, but they're still using OLD cached assets. The pwa store does reload on `controllerchange`, but the timing is critical:

**In pwa.ts (line 127-129):**
```typescript
const handleControllerChange = () => {
  window.location.reload();  // Only reloads on controller change
};
```

**Problem:** If the new SW takes control and immediately serves cached content, the reload happens AFTER the client is already using stale resources.

**Impact:** HIGH - Users may see:
- Mixed old/new assets on page
- Broken layouts from mismatched CSS/JS versions
- Temporary functional issues before reload

**Fix:** Add immediate message to clients after activation:
```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(/* cleanup */)
      .then(() => self.clients.claim())
      .then(() => {
        // Notify all clients of update
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      })
  );
});
```

---

### HIGH: Precache Failure Handling

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js`
**Lines:** 53-72

**Issue:** If precache fails (404 on any URL), the entire install hangs silently with only console error.

**Current Code:**
```javascript
const PRECACHE_URLS = [
  '/',
  '/songs',
  '/venues',
  '/stats',
  '/tours',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHES_CONFIG.SHELL)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS);  // Throws on ANY 404
      })
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
        // Silently continues - SW still installs!
      })
  );
});
```

**Problem:** `cache.addAll()` rejects if ANY URL fails. This means:
- If `/offline` page doesn't exist, SW installs but can't serve fallback
- No offline capability for new installations
- Silent failure - developers won't know

**Impact:** HIGH - First install may not provide offline fallback

**Fix:** Use `cache.add()` individually with error handling:
```javascript
const cachePromises = PRECACHE_URLS.map(url =>
  caches.open(CACHES_CONFIG.SHELL)
    .then(cache => {
      return fetch(url)
        .then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
          console.warn(`[SW] Failed to precache ${url}: ${response.status}`);
        })
        .catch(error => {
          console.warn(`[SW] Failed to precache ${url}:`, error);
        });
    })
);

Promise.all(cachePromises).then(() => self.skipWaiting());
```

---

### MEDIUM: Unvetted Network Requests in Offline

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js`
**Lines:** 118-121, 206-263

**Issue:** NetworkFirst strategy with expiration doesn't handle network timeouts. A slow network can cause:
- Extended page load times
- No fallback shown to user
- Cache not used even though network is effectively offline

**Current Code:**
```javascript
// NetworkFirst - waits for network indefinitely
function networkFirstWithExpiration(request, maxAgeSeconds) {
  return fetch(request)  // No timeout!
    .then((response) => {
      // Cache successful response
    })
    .catch((error) => {
      // Only on hard failure - not timeout
      return caches.match(request);
    });
}
```

**Issue:** If server is slow (>30s), user sees blank page. Network timeout isn't caught.

**Impact:** MEDIUM - Poor UX on slow connections

**Fix:** Add fetch timeout:
```javascript
function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Fetch timeout')), timeout)
    )
  ]);
}
```

---

### MEDIUM: Duplicate SW Registration Logic

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/sw/register.ts`
**AND**
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/pwa.ts`

**Issue:** Two separate implementations for SW registration:

1. **register.ts** (Lines 31-84): Exported utility functions
2. **pwa.ts** (Lines 95-135): Store-based implementation

**Current Code - register.ts:**
```typescript
export async function registerServiceWorker(
  config: ServiceWorkerConfig = {}
): Promise<ServiceWorkerRegistration | undefined> {
  if (!isServiceWorkerSupported()) { return; }
  if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_ENABLE_SW_DEV) {
    console.log("[SW] Skipping SW registration in development");
    return;
  }
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  // ... listeners ...
}
```

**Current Code - pwa.ts:**
```typescript
export const pwaStore = {
  async initialize() {
    // ... different implementation ...
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    // ... different listeners ...
  }
}
```

**Problems:**
- Only pwa.ts is used (register.ts utility unused)
- Different event handling between them
- register.ts still checks NODE_ENV (which doesn't exist in SvelteKit)
- Confusing for developers

**Impact:** MEDIUM - Code maintenance burden, unused code

**Fix:** Remove register.ts or consolidate to single implementation

---

### MEDIUM: Scope Registration Mismatch Potential

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/pwa.ts`
**Line:** 96-98

**Issue:** SW scope is hardcoded to "/", but manifest has scope "/dmb-almanac" (line 2 of manifest.json):

**manifest.json:**
```json
{
  "id": "/dmb-almanac",
  "scope": "/",
  ...
}
```

**Confusion:** The manifest's `id` is "/dmb-almanac" but `scope` is "/". This is correct behavior but could cause issues if someone later changes deployment path.

**Impact:** LOW-MEDIUM - Only problematic if app moves to subdirectory

**Fix:** Make scope configurable or document:
```typescript
// Clear documentation needed
// Scope "/" is correct for root deployment
// If deploying to /subdirectory, update both:
// 1. register() scope parameter
// 2. manifest.json scope field
```

---

### MEDIUM: Cache Status Message Port Never Closed

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js`
**Lines:** 364-411

**Issue:** MessageChannel ports are never explicitly closed in async operations:

**Current Code:**
```typescript
export async function getCacheStatus() {
  const registration = await navigator.serviceWorker.ready;
  const channel = new MessageChannel();

  const status = await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);  // Port never closed!
    }, 5000);

    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data);  // Port still open!
    };

    if (registration.active) {
      registration.active.postMessage({ type: "GET_CACHE_STATUS" }, [channel.port2]);
    }
  });

  return status;  // Port leaks if timeout fires
}
```

**Problem:** If timeout fires, `channel.port1` remains open with listener attached.

**Impact:** LOW-MEDIUM - Memory leak if repeated calls timeout

**Fix:** Close port explicitly:
```typescript
const status = await new Promise((resolve) => {
  const timeout = setTimeout(() => {
    channel.port1.close();  // Close the port
    resolve(null);
  }, 5000);

  channel.port1.onmessage = (event) => {
    clearTimeout(timeout);
    channel.port1.close();  // Close the port
    resolve(event.data);
  };
});
```

---

### MEDIUM: Cache Expiration Logic Flaw

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js`
**Lines:** 246-257

**Issue:** Expiration check logs cache as stale but STILL returns it without indicator:

**Current Code:**
```javascript
function networkFirstWithExpiration(request, maxAgeSeconds) {
  return fetch(request)
    .catch((error) => {
      return caches.match(request)
        .then((cachedResponse) => {
          if (!cachedResponse) {
            return caches.match(OFFLINE_FALLBACK_URL);
          }

          const cacheTime = parseInt(
            cachedResponse.headers.get('X-Cache-Time') || '0', 10
          );
          const age = Math.floor((Date.now() - cacheTime) / 1000);

          if (age > maxAgeSeconds) {
            console.log('[SW] Cache expired:', request.url, `age: ${age}s`);
            // Still returns expired cache silently!
          }

          console.log('[SW] NetworkFirst CACHE FALLBACK:', request.url);
          return cachedResponse;  // Returns expired cache without flag
        });
    });
}
```

**Problem:** Expired cache is returned but:
- No indication to UI it's stale
- Comment says "might want to show staleness indicator" but doesn't implement it
- User sees outdated data without knowing

**Impact:** MEDIUM - Silent data staleness

**Fix:** Add staleness flag to response:
```javascript
if (age > maxAgeSeconds) {
  console.log('[SW] Cache expired:', request.url);
  const headers = new Headers(cachedResponse.headers);
  headers.set('X-Cache-Stale', 'true');
  headers.set('X-Cache-Age', String(age));
  return new Response(cachedResponse.body, {
    status: cachedResponse.status,
    statusText: cachedResponse.statusText,
    headers: headers
  });
}
```

Then in app, check for staleness:
```typescript
const response = await fetch(url);
if (response.headers.get('X-Cache-Stale') === 'true') {
  // Show stale data warning to user
}
```

---

### LOW-MEDIUM: Unused Code in register.ts

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/sw/register.ts`
**Lines:** 31-84

**Issue:** The `registerServiceWorker()` utility function is exported but never imported anywhere in the codebase. Only the pwa.ts store implementation is used.

**Current Code:**
```typescript
export async function registerServiceWorker(
  config: ServiceWorkerConfig = {}
): Promise<ServiceWorkerRegistration | undefined> {
  // Never called!
}

// Also unused:
export async function unregisterServiceWorker(): Promise<boolean> { }
export async function checkForUpdates(): Promise<void> { }
export async function skipWaiting(): Promise<void> { }
// ... many more unused exports
```

**Impact:** LOW - Code bloat, confusion

**Fix:** Either use these utilities or remove register.ts entirely

---

### LOW: PWA Development Environment Check Error

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/sw/register.ts`
**Line:** 40

**Issue:** Checks `process.env.NODE_ENV` which doesn't exist in SvelteKit (uses `dev` import instead):

**Current Code:**
```typescript
if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_ENABLE_SW_DEV) {
  console.log("[SW] Skipping SW registration in development");
  return;
}
```

**Problem:**
- `process.env.NODE_ENV` is undefined in SvelteKit
- References `NEXT_PUBLIC_*` (Next.js convention, not SvelteKit)
- Condition always false, SW registers in dev mode

**Impact:** LOW - But means SW registers during dev, which may not be intended

**Fix:** Use SvelteKit dev flag:
```typescript
import { dev } from '$app/environment';

if (dev) {
  console.log("[SW] Skipping SW registration in development");
  return;
}
```

---

### LOW: Inconsistent Manifest ID

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/manifest.json`
**Line:** 2

**Issue:** Manifest has `"id": "/dmb-almanac"` but app is served from root:

**Current:**
```json
{
  "id": "/dmb-almanac",
  "scope": "/",
  "start_url": "/?source=pwa"
}
```

**Problem:** The `id` field should match the deployment path. If app is at `/`, it should be:
```json
{
  "id": "/",
  "scope": "/",
  ...
}
```

**Impact:** LOW - May cause issues with app updates and instance identification

---

## Summary of Issues by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| CRITICAL | 1 | Race condition in PWA initialization |
| HIGH | 3 | Incomplete cleanup, missing clients.claim() follow-up, precache failure |
| MEDIUM | 5 | Network timeout, duplicate registration, scope mismatch potential, port leaks, cache expiration |
| LOW | 2 | Unused code, dev env check error, manifest ID inconsistency |

---

## Recommended Fix Priority

### Phase 1 (Do First - Breaks Functionality)
1. Fix PWA store initialization race condition
2. Add explicit SW update notification to clients
3. Improve precache failure handling

### Phase 2 (Do Next - Data Quality)
1. Add network timeout for fetch requests
2. Add staleness indicators to stale cache
3. Fix MessageChannel port cleanup

### Phase 3 (Nice to Have)
1. Consolidate registration logic
2. Fix environment detection
3. Fix manifest ID

---

## Testing Recommendations

### To Verify Fixes

1. **Test Multiple Initializations:**
   ```bash
   # Check DevTools Application > Service Workers
   # Should see only ONE registration, not multiple
   ```

2. **Test SW Update Flow:**
   ```bash
   # Build new version, update CACHE_VERSION in sw.js
   # Open app in two tabs
   # Verify update notification appears
   # Click "Update Now" and verify reload occurs
   ```

3. **Test Precache:**
   ```bash
   # Clear all caches
   # Unregister SW
   # Reload page
   # Check DevTools > Cache Storage > dmb-shell-v1
   # Should have 6 entries: /, /songs, /venues, /stats, /tours, /offline
   ```

4. **Test Offline:**
   ```bash
   # Load app fully
   # DevTools > Network > Offline
   # Click around - should show cached pages
   # Turn online again - should work normally
   ```

5. **Test Network Timeout:**
   ```bash
   # DevTools > Network > Slow 3G
   # Load a page
   # Should not hang indefinitely
   # Should show fallback after ~5s
   ```

---

## Files to Review

1. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/pwa.ts` - Primary PWA store
2. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/sw.js` - Main service worker
3. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/sw/register.ts` - Unused registration utilities
4. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/manifest.json` - Web app manifest
5. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/+layout.svelte` - App initialization

---

## Key Strengths of Current Implementation

Despite the issues found, the implementation has several good practices:

1. **Good caching strategy:** Separate caches for different asset types
2. **Version-based cache busting:** CACHE_VERSION increments for updates
3. **Offline fallback page:** `/offline` route for network errors
4. **Message passing:** Proper use of MessageChannel for bi-directional communication
5. **Install optimization:** `skipWaiting()` for faster updates
6. **Manifest:** Comprehensive manifest with icons, screenshots, shortcuts
7. **Cleanup logic:** Proper cache cleanup in activate event
8. **CSS-based offline indicator:** Nice user experience during offline

---

## Checklist for Next Steps

- [ ] Implement PWA store initialization guard
- [ ] Add explicit SW_UPDATED message to clients
- [ ] Improve precache error handling
- [ ] Add network request timeout
- [ ] Implement staleness indicators
- [ ] Close MessageChannel ports explicitly
- [ ] Consolidate registration logic
- [ ] Fix environment detection
- [ ] Fix manifest ID
- [ ] Run comprehensive PWA testing
- [ ] Test on real mobile device
- [ ] Test on iOS Safari (limited PWA support)

