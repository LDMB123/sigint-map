# DMB Almanac - PWA Critical Fixes

This document provides specific code fixes for the 7 critical PWA issues identified in the debugging report.

---

## FIX #1: Missing cleanupExpiredCaches() Function

**File:** `/public/sw.js`
**Line:** 90, 382-385 (function reference but not defined)
**Severity:** CRITICAL - Will throw ReferenceError

### Problem
```javascript
// Line 89-91 in activate event
.then(() => {
  return cleanupExpiredCaches(); // UNDEFINED FUNCTION!
})
```

### Root Cause
Function is called but never implemented in the service worker.

### Solution
Add this function to `/public/sw.js` (after staleWhileRevalidate function, around line 275):

```javascript
/**
 * Cleanup expired cache entries based on age
 * Runs on service worker activation
 */
async function cleanupExpiredCaches() {
  const now = Date.now();
  const cacheConfigs = {
    [CACHE_NAMES.precache]: { maxAge: 365 * 24 * 60 * 60 * 1000 }, // 1 year
    [CACHE_NAMES.pages]: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
    [CACHE_NAMES.api]: { maxAge: 60 * 60 * 1000 }, // 1 hour
    [CACHE_NAMES.images]: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    [CACHE_NAMES.fonts]: { maxAge: 365 * 24 * 60 * 60 * 1000 }, // 1 year
    [CACHE_NAMES.static]: { maxAge: 365 * 24 * 60 * 60 * 1000 }, // 1 year
    [CACHE_NAMES.offline]: { maxAge: 90 * 24 * 60 * 60 * 1000 }, // 90 days
  };

  const results = {};
  for (const [cacheName, config] of Object.entries(cacheConfigs)) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      let deletedCount = 0;

      for (const request of keys) {
        const response = await cache.match(request);
        if (!response) continue;

        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const cachedTime = new Date(dateHeader).getTime();
          const age = now - cachedTime;

          if (age > config.maxAge) {
            await cache.delete(request);
            deletedCount++;
          }
        }
      }

      results[cacheName] = deletedCount;
    } catch (error) {
      console.error(`[SW] Cleanup failed for ${cacheName}:`, error);
    }
  }

  console.log('[SW] Cache cleanup complete:', results);
  return results;
}
```

### Verification
After deploying:
1. Open DevTools > Application > Cache Storage
2. Check a cached response's Date header
3. The cleanup function will remove entries older than maxAge
4. No console error when SW activates

---

## FIX #2: Service Worker Not Calling skipWaiting() on Install

**File:** `/public/sw.js`
**Lines:** 46-62 (install event)
**Severity:** HIGH - Causes waiting state and delayed updates

### Problem
```javascript
// Current code doesn't skip waiting
self.addEventListener("install", (event) => {
  console.log("[SW] Installing Service Worker...");
  event.waitUntil(
    caches.open(CACHE_NAMES.precache)
      .then((cache) => {
        console.log("[SW] Precaching app shell");
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log("[SW] Precache complete");
        // Missing: self.skipWaiting()
      })
  );
});
```

### Root Cause
Comment on line 57-59 explains the choice not to skip waiting, but this prevents immediate activation.

### Solution
Add `self.skipWaiting()` after precache completes:

```javascript
// Replace the install event (lines 46-62)
self.addEventListener("install", (event) => {
  console.log("[SW] Installing Service Worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAMES.precache)
      .then((cache) => {
        console.log("[SW] Precaching app shell");
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log("[SW] Precache complete");
        // Skip waiting to activate immediately if no previous version
        // The activate event will claim all clients
        self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Precache failed:", error);
        // Don't fail the entire install, allow graceful degradation
      })
  );
});
```

### Why This Works
- First time user: No previous SW, so skipWaiting() takes effect immediately
- Update user: Previous SW exists, so waiting user's clients claim immediately
- Controlled via `clients.claim()` in activate event (already present)

### Verification
After deploying:
1. Update to new SW version
2. DevTools > Application > Service Workers
3. New SW should show "Active and running" within ~3 seconds
4. Old "Waiting to activate" status should not appear

---

## FIX #3: Download Event Listener Not Cleaned Up on Timeout

**File:** `/lib/storage/offline-download.ts`
**Lines:** 295-387 (startDownload function)
**Severity:** HIGH - Memory leak and stale event listeners

### Problem
```javascript
// Line 322: Message listener added
navigator.serviceWorker.addEventListener("message", messageHandler);

// Line 375: Removed only in cancellation
if (cancellationToken?.cancelled) {
  clearInterval(checkInterval);
  navigator.serviceWorker.removeEventListener("message", messageHandler);
  // ...
  resolve(download);
  return;
}

// Line 372-386: TIMEOUT PATH - listeners NOT removed!
setTimeout(async () => {
  clearInterval(checkInterval);
  // MISSING: navigator.serviceWorker.removeEventListener("message", messageHandler);
  download.status = "failed";
  download.errorMessage = "Download timed out";
  try {
    await saveDownload(download);
  } catch (saveError) {
    console.error("[OfflineDownload] Failed to save timeout state:", saveError);
  }
  reject(new Error("Download timed out"));
}, 10 * 60 * 1000);
```

### Root Cause
Timeout handler doesn't remove the message listener, causing multiple listeners to accumulate with each download attempt.

### Solution
Replace the timeout section (lines 371-387):

```typescript
// Replace lines 371-387
// Timeout after 10 minutes
const timeoutHandle = setTimeout(async () => {
  clearInterval(checkInterval);
  // CRITICAL: Remove the message listener to prevent memory leak
  navigator.serviceWorker.removeEventListener("message", messageHandler);

  download.status = "failed";
  download.errorMessage = "Download timed out";
  try {
    await saveDownload(download);
  } catch (saveError) {
    console.error("[OfflineDownload] Failed to save timeout state:", saveError);
  }
  reject(new Error("Download timed out after 10 minutes"));
}, 10 * 60 * 1000);

// Also clean up on promise resolution/rejection
try {
  // ... existing logic ...
} finally {
  clearTimeout(timeoutHandle); // Add this to cancel timeout if download completes early
}
```

### Better Approach
Wrap the entire async operation in proper cleanup:

```typescript
export async function startDownload(
  type: DownloadType,
  identifier: string,
  label: string,
  onProgress?: ProgressCallback,
  cancellationToken?: CancellationToken
): Promise<OfflineDownload> {
  const database = await openDatabase();
  const id = generateDownloadId(type, identifier);

  // ... existing setup code ...

  try {
    // ... existing download setup ...

    // Set up message listener once
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === "DOWNLOAD_PROGRESS" && event.data?.downloadId === id) {
        // ... existing handler code ...
      }
    };

    navigator.serviceWorker.addEventListener("message", messageHandler);

    // Use Promise.race with cleanup in finally
    return await Promise.race([
      // Download completion promise
      new Promise<OfflineDownload>((resolveDownload, rejectDownload) => {
        let checkInProgress = false;
        const checkInterval = setInterval(async () => {
          if (checkInProgress) return;
          checkInProgress = true;

          try {
            if (cancellationToken?.cancelled) {
              clearInterval(checkInterval);
              download.status = "cancelled";
              download.updatedAt = Date.now();
              await saveDownload(download);
              resolveDownload(download);
              return;
            }

            const current = await getDownload(id);
            if (current?.status === "completed" || current?.status === "failed") {
              clearInterval(checkInterval);
              resolveDownload(current);
            }
          } finally {
            checkInProgress = false;
          }
        }, 500);
      }),
      // Timeout promise
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error("Download timed out after 10 minutes"));
        }, 10 * 60 * 1000);
      }),
    ]).finally(() => {
      // CRITICAL: Always remove listener, regardless of outcome
      navigator.serviceWorker.removeEventListener("message", messageHandler);
    });
  } catch (error) {
    download.status = "failed";
    download.errorMessage = error instanceof Error ? error.message : "Unknown error";
    download.updatedAt = Date.now();
    await saveDownload(download);
    throw error;
  }
}
```

### Verification
After deploying:
1. Start a download
2. Wait for timeout or completion
3. DevTools > Memory profiler
4. Check for event listeners: `navigator.serviceWorker.listeners`
5. Should only have active download listener(s), not accumulating

---

## FIX #4: Offline Database Not Auto-Initialized

**File:** `/lib/storage/offline-db.ts` and new/existing provider
**Lines:** 264 (singleton creation)
**Severity:** HIGH - Silently fails without user awareness

### Problem
```typescript
// offline-db.ts Line 264
export const offlineDb = new DMBOfflineDB();
// Database created but NOT opened!
// No auto-initialization in app

// Users must manually call:
const ready = await isOfflineDbReady();
```

### Root Cause
No app initialization hook opens the database on startup.

### Solution

**Step 1:** Check if `OfflineDataProvider` exists or create it

Check: `/components/pwa/OfflineDataProvider.tsx`

If it doesn't exist, create it:

```typescript
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isOfflineDbReady, offlineDb } from "@/lib/storage/offline-db";

interface OfflineDataProviderProps {
  children: ReactNode;
}

/**
 * OfflineDataProvider
 *
 * Initializes IndexedDB on app startup and loads initial data
 * Wraps children and ensures offline-first data is available
 */
export function OfflineDataProvider({ children }: OfflineDataProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Initialize offline database
    const initializeOfflineData = async () => {
      try {
        // Ensure database is open
        const ready = await isOfflineDbReady();

        if (!ready) {
          throw new Error("Failed to initialize offline database");
        }

        // Check if database is populated
        const isPopulated = await offlineDb.isPopulated();

        if (!isPopulated) {
          console.log("[OfflineData] Database empty, loading initial data...");
          // TODO: Call data-loader to populate initial data
          // await loadInitialData();
        }

        setIsReady(true);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error initializing offline DB");
        console.error("[OfflineData] Initialization failed:", error);
        setError(error);
        // Don't fail the entire app - graceful degradation
        setIsReady(true);
      }
    };

    initializeOfflineData();
  }, []);

  // Log error but continue rendering
  if (error) {
    console.warn("[OfflineData] Offline database unavailable, app will work online-only");
  }

  return <>{children}</>;
}
```

**Step 2:** Wire into app layout

Update `/app/layout.tsx` (around line 10-13):

```typescript
// Add import
import { OfflineDataProvider } from "@/components/pwa";

// In RootLayout function, wrap children:
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" style={fontVariables}>
      <head>
        {/* ... existing head content ... */}
      </head>
      <body>
        <PWAProvider>
          <OfflineDataProvider>
            <AppleSiliconInit />
            <DataProvider>
              {/* ... rest of layout ... */}
            </DataProvider>
          </OfflineDataProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
```

### Verification
After deploying:
1. Open DevTools > Application > IndexedDB
2. Expand database
3. On first load, check tables are initialized
4. Check browser console for "[OfflineData]" messages
5. No errors about database not being open

---

## FIX #5: iOS Detection Order Wrong

**File:** `/lib/sw/register.ts`
**Lines:** 222-239
**Severity:** MEDIUM - Minor UX issues on iOS

### Problem
```typescript
export function isInstalledPWA(): boolean {
  // Check 1: Display-mode media query (works on ALL platforms)
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  // Check 2: iOS standalone (iOS-specific)
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) {
    return true;
  }

  // Check 3: Query param (weak signal - could be false positive)
  if (window.location.search.includes("source=pwa")) {
    return true;
  }

  return false;
}
```

### Root Cause
Order is suboptimal:
1. Media query might not work on all iOS versions
2. Query param could be set for non-installed users
3. Type coercion is ugly

### Solution
Replace the function (lines 222-239):

```typescript
/**
 * Check if the app is running as an installed PWA
 *
 * Detection priority:
 * 1. iOS standalone mode (iOS-specific)
 * 2. Display-mode media query (standard, works on Chromium, Firefox)
 * 3. Query parameter (fallback hint)
 */
export function isInstalledPWA(): boolean {
  // iOS Safari PWA detection (most reliable for iOS)
  const nav = navigator as any;
  if (nav.standalone === true) {
    return true;
  }

  // Standard display-mode media query (Chromium, Firefox)
  if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  // Query parameter fallback (weak signal, only if explicitly set from manifest start_url)
  if (typeof window !== "undefined" && window.location.search.includes("source=pwa")) {
    // Only consider this true if also in standalone mode (prevent false positives)
    return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  }

  return false;
}
```

### Verification
After deploying:
1. Open app on iPhone Safari
2. Add to Home Screen
3. Launch from home screen
4. Should detect as installed
5. Open app in Safari browser
6. Should detect as NOT installed

---

## FIX #6: Network Timeout Too Aggressive

**File:** `/lib/sw/serwist.config.ts`
**Lines:** 112-145 (API routes config)
**Severity:** MEDIUM - Can cause false offline on slow networks

### Problem
```typescript
// Line 125: 5 second timeout
networkTimeoutSeconds: 5,

// Line 143: 3 second timeout (too short!)
networkTimeoutSeconds: 3,
```

3 seconds is too short for:
- 4G LTE networks (RTT ~50-100ms, request time 1-2s)
- Slow mobile networks
- Regional latency

### Solution
Replace runtime caching config (lines 112-145):

```typescript
// API routes - Network first with fallback
{
  urlPattern: /\/api\/.*/i,
  handler: "NetworkFirst",
  options: {
    cacheName: "api-cache",
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 60 * 60, // 1 hour
      purgeOnQuotaError: true,
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
    // Increased timeout from 3s to 8s to handle slow networks
    networkTimeoutSeconds: 8,
  },
},

// Main app pages - Network first for freshness
{
  urlPattern: /^\/(songs|venues|tours|stats|guests|liberation|shows|search).*$/i,
  handler: "NetworkFirst",
  options: {
    cacheName: "pages-cache",
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 60 * 60 * 24, // 24 hours
      purgeOnQuotaError: true,
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
    // Increased timeout from 3s to 5s
    networkTimeoutSeconds: 5,
  },
},
```

Also update `/public/sw.js` networkFirst function:

```javascript
// Line 207: Update default and specific timeouts
async function networkFirst(request, cacheName, timeout = 8000) {
  // ... rest of function unchanged
}
```

### Reasoning
- API routes: 8 seconds (critical, user waiting on page)
- Page navigation: 5 seconds (user already navigating)
- Images/static: use staleWhileRevalidate (no timeout)

### Verification
After deploying:
1. Throttle network: DevTools > Network > Slow 4G
2. Make API request
3. Should complete within 8 seconds
4. Should serve from cache if network doesn't respond
5. No premature timeout before cache is checked

---

## FIX #7: Download Progress Polling Too Frequent

**File:** `/lib/storage/offline-download.ts`
**Lines:** 334-369 (polling loop)
**Severity:** MEDIUM - High CPU usage, battery drain

### Problem
```typescript
// Line 369: 500ms polling interval
const checkInterval = setInterval(async () => {
  // Async operation with await
  if (checkInProgress) return;
  checkInProgress = true;

  try {
    // Database query (async)
    const current = await getDownload(id);
    // ...
  } finally {
    checkInProgress = false;
  }
}, 500); // TOO FREQUENT!
```

500ms interval causes:
- 120 database queries per minute per download
- CPU spinning on mobile devices
- Battery drain (especially on older devices)
- IndexedDB lock contention

### Solution
Replace the polling logic (lines 334-387):

```typescript
return new Promise((resolve, reject) => {
  let checkInProgress = false;

  // Increased from 500ms to 2000ms (2 second polling)
  // Still responsive for user feedback (< 2s updates)
  // Much lower CPU/battery impact
  const checkInterval = setInterval(async () => {
    // Prevent overlapping async checks
    if (checkInProgress) return;
    checkInProgress = true;

    try {
      // Check for cancellation first (no I/O)
      if (cancellationToken?.cancelled) {
        clearInterval(checkInterval);
        navigator.serviceWorker.removeEventListener("message", messageHandler);

        // Send cancel message to SW
        registration.active?.postMessage({
          type: "CANCEL_DOWNLOAD",
          downloadId: id,
        });

        download.status = "cancelled";
        download.updatedAt = Date.now();
        await saveDownload(download);
        onProgress?.(download.progress, "cancelled", download.cachedUrls, download.totalUrls);
        resolve(download);
        return;
      }

      // Check completion status
      const current = await getDownload(id);
      if (current?.status === "completed" || current?.status === "failed") {
        clearInterval(checkInterval);
        navigator.serviceWorker.removeEventListener("message", messageHandler);
        resolve(current);
      }
    } finally {
      checkInProgress = false;
    }
  }, 2000); // Changed from 500ms to 2000ms (2 seconds)

  // Timeout after 10 minutes
  const timeoutId = setTimeout(
    async () => {
      clearInterval(checkInterval);
      navigator.serviceWorker.removeEventListener("message", messageHandler);
      download.status = "failed";
      download.errorMessage = "Download timed out";
      try {
        await saveDownload(download);
      } catch (saveError) {
        console.error("[OfflineDownload] Failed to save timeout state:", saveError);
      }
      reject(new Error("Download timed out"));
    },
    10 * 60 * 1000
  );
});
```

### Why 2000ms Works
- User perceives < 2 second updates as responsive
- 30 database queries per minute per download (vs 120)
- Significant battery savings on mobile
- Still prevents missed completion notifications due to message handler

### Verification
After deploying:
1. Start a large download
2. Monitor DevTools > Performance tab
3. CPU usage should be minimal
4. Poll rate should be ~30 queries/min (check console logs)
5. Battery drain reduced on mobile devices

---

## Summary of Fixes

| # | Issue | File | Critical | Est. Fix Time |
|---|-------|------|----------|---------------|
| 1 | Missing cleanupExpiredCaches() | /public/sw.js | YES | 15 min |
| 2 | No skipWaiting() on install | /public/sw.js | YES | 5 min |
| 3 | Event listener leak on timeout | /lib/storage/offline-download.ts | YES | 20 min |
| 4 | IndexedDB not auto-init | Multiple | YES | 30 min |
| 5 | iOS detection order | /lib/sw/register.ts | NO | 5 min |
| 6 | Network timeout too short | /lib/sw/serwist.config.ts | NO | 10 min |
| 7 | Polling too frequent | /lib/storage/offline-download.ts | NO | 10 min |

**Total estimated time to fix all issues: ~95 minutes**

---

## Deployment Strategy

1. **Immediate (Critical fixes - same day):**
   - Fix #1, #2, #3
   - Deploy to staging, test offline SW lifecycle
   - Deploy to production

2. **Short-term (Data fixes - next day):**
   - Fix #4 (OfflineDataProvider)
   - Test IndexedDB initialization
   - Deploy to production

3. **Polish (Performance - same week):**
   - Fix #5, #6, #7
   - Performance testing on mobile
   - Deploy to production

