# PWA Audit Fixes - Implementation Guide

**Purpose:** Step-by-step implementation of identified PWA audit issues
**Estimated Total Time:** 4-5 hours
**Complexity:** Low to Medium

---

## HIGH PRIORITY FIX #1: Service Worker Registration (SvelteKit Pattern)

**File:** `/src/lib/sw/register.ts`
**Time:** 15 minutes
**Impact:** High - Critical for SvelteKit compatibility

### Issue
The code uses Next.js environment variable patterns instead of SvelteKit's approach.

### Current Code (Lines 42-46)
```typescript
// Only register in production or when explicitly enabled
if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ENABLE_SW_DEV) {
  console.log('[SW] Skipping SW registration in development');
  return;
}
```

### Problem
- `process.env.NODE_ENV` is Next.js pattern
- SvelteKit uses `import { dev } from '$app/environment'`
- Environment variables should use `VITE_` prefix
- Pattern name `NEXT_PUBLIC_` is Next.js specific

### Fixed Code
```typescript
import { dev } from '$app/environment';

export async function registerServiceWorker(
  config: ServiceWorkerConfig = {}
): Promise<ServiceWorkerRegistration | undefined> {
  if (!isServiceWorkerSupported()) {
    console.log('[SW] Service workers not supported');
    return;
  }

  // Only register in production or when explicitly enabled
  if (dev && !import.meta.env.VITE_ENABLE_SW_DEV) {
    console.log('[SW] Skipping SW registration in development');
    return;
  }

  try {
    // ... rest of code unchanged ...
  }
}
```

### How to Enable in Development
```bash
# Option 1: Command line
VITE_ENABLE_SW_DEV=true npm run dev

# Option 2: Create .env.local file
echo "VITE_ENABLE_SW_DEV=true" > .env.local
npm run dev
```

### Testing
```javascript
// In browser console during development
console.log('dev mode:', await navigator.serviceWorker.getRegistrations());
```

---

## MEDIUM PRIORITY FIX #1: Implement Cache Cleanup (Automatic + Manual)

**File:** `/src/lib/stores/pwa.ts` and `/static/sw.js`
**Time:** 45 minutes
**Impact:** Medium - Prevents unbounded cache growth

### Issue
The `triggerCacheCleanup()` function exists but is never called. Caches can grow indefinitely.

### Solution: Part 1 - Add Periodic Cleanup to PWA Store

**File:** `/src/lib/stores/pwa.ts`

Add this property to the `pwaStore` object after the `checkForUpdates` method:

```typescript
  /**
   * Start periodic cache cleanup (runs in background)
   * @param intervalMinutes - How often to clean up caches (default: 60 minutes)
   */
  async startPeriodicCacheCleanup(intervalMinutes = 60) {
    if (!browser) return;

    // Initial cleanup on start
    await this.triggerCacheCleanup();

    // Schedule periodic cleanup
    const cleanupInterval = setInterval(async () => {
      try {
        await this.triggerCacheCleanup();
      } catch (error) {
        console.error('[PWA] Periodic cleanup failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Return cleanup function for store shutdown
    return () => {
      clearInterval(cleanupInterval);
    };
  },

  /**
   * Trigger immediate cache cleanup
   */
  async triggerCacheCleanup() {
    const reg = get(registration);
    if (reg?.active) {
      reg.active.postMessage({ type: 'CLEANUP_CACHES' });
      console.log('[PWA] Cache cleanup triggered');
    }
  },
```

### Solution: Part 2 - Enhanced Cache Cleanup in Service Worker

**File:** `/static/sw.js`

Replace the existing `handleCleanupCaches` function (lines 505-534) with this enhanced version:

```javascript
/**
 * CLEANUP_CACHES - Manually purge old/expired caches and enforce size limits
 */
async function handleCleanupCaches(event) {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = Object.values(CACHES_CONFIG);
    const deleted = [];

    // Delete old cache versions not in CACHES_CONFIG
    for (const cacheName of cacheNames) {
      if (!currentCaches.includes(cacheName)) {
        await caches.delete(cacheName);
        deleted.push(cacheName);
        console.log('[SW] Deleted old cache:', cacheName);
      }
    }

    // Clean expired entries from runtime caches
    await cleanExpiredEntries(CACHES_CONFIG.API_CACHE, EXPIRATION_TIMES.API);
    await cleanExpiredEntries(CACHES_CONFIG.PAGES_CACHE, EXPIRATION_TIMES.PAGES);
    await cleanExpiredEntries(CACHES_CONFIG.IMAGE_CACHE, EXPIRATION_TIMES.IMAGES);

    // Enforce size limits per cache
    await limitCacheSize(CACHES_CONFIG.API_CACHE, 50);
    await limitCacheSize(CACHES_CONFIG.PAGES_CACHE, 50);
    await limitCacheSize(CACHES_CONFIG.IMAGE_CACHE, 100);
    await limitCacheSize(CACHES_CONFIG.STATIC_ASSETS, 75);

    const stats = {
      success: true,
      deletedCaches: deleted,
      timestamp: new Date().toISOString()
    };

    if (event.ports[0]) {
      event.ports[0].postMessage(stats);
    }

    console.log('[SW] Cache cleanup complete:', stats);
  } catch (error) {
    console.error('[SW] CLEANUP_CACHES failed:', error);
    if (event.ports[0]) {
      event.ports[0].postMessage({
        success: false,
        error: error.message,
      });
    }
  }
}

/**
 * Enforce maximum entry count per cache
 * Removes oldest entries when limit is exceeded
 */
async function limitCacheSize(cacheName, maxEntries = 50) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxEntries) {
      const keysToDelete = keys.slice(0, keys.length - maxEntries);
      let deletedCount = 0;

      for (const key of keysToDelete) {
        try {
          await cache.delete(key);
          deletedCount++;
        } catch (err) {
          console.error('[SW] Failed to delete cached entry:', key, err);
        }
      }

      if (deletedCount > 0) {
        console.log(
          `[SW] Limited ${cacheName} to ${maxEntries} entries, deleted ${deletedCount}`
        );
      }
    }
  } catch (error) {
    console.error('[SW] Cache size limit enforcement failed:', cacheName, error);
  }
}
```

### Solution: Part 3 - Start Cleanup in Layout

**File:** `/src/routes/+layout.svelte`

Modify the `onMount` function (around line 25) to start periodic cleanup:

```typescript
onMount(() => {
  mounted = true;

  // Initialize PWA
  const cleanupFunction = pwaStore.initialize();

  // Start periodic cache cleanup (runs every hour)
  pwaStore.startPeriodicCacheCleanup(60);

  // Initialize data loading
  dataStore.initialize();

  // Initialize cache invalidation listeners
  setupCacheInvalidationListeners();

  // Initialize offline mutation queue
  initializeQueue();

  // ... rest of initialization ...

  // Cleanup function
  return () => {
    cleanupQueue();
    cleanupFunction?.();
  };
});
```

### Testing Cleanup

```javascript
// In browser console to test manual cleanup
const reg = await navigator.serviceWorker.ready;
reg.active.postMessage({ type: 'CLEANUP_CACHES' });

// Wait 2 seconds then check caches
setTimeout(() => {
  caches.keys().then(names => {
    console.log('After cleanup:', names);
    names.forEach(name => {
      caches.open(name).then(cache => {
        cache.keys().then(keys => {
          console.log(`${name}: ${keys.length} entries`);
        });
      });
    });
  });
}, 2000);
```

---

## MEDIUM PRIORITY FIX #2: Add Cache Size Limits (Already in Fix #1)

This is included in Fix #1 above with the `limitCacheSize()` function.

**Configuration options to adjust:**
```javascript
// In the cleanup handler, adjust max entries:
await limitCacheSize(CACHES_CONFIG.API_CACHE, 50);        // Max 50 API responses
await limitCacheSize(CACHES_CONFIG.PAGES_CACHE, 50);      // Max 50 pages
await limitCacheSize(CACHES_CONFIG.IMAGE_CACHE, 100);     // Max 100 images
await limitCacheSize(CACHES_CONFIG.STATIC_ASSETS, 75);    // Max 75 static files
```

Adjust based on your storage requirements.

---

## MEDIUM PRIORITY FIX #3: Add Stale Cache Indication

**File:** `/static/sw.js`
**Time:** 60 minutes
**Impact:** Medium - Improves data accuracy awareness

### Issue
When cache expires but is still served offline, users don't know the data is stale.

### Solution: Part 1 - Mark Stale Responses in Service Worker

Replace the expiration check in `networkFirstWithExpiration` function (around line 330-341):

```javascript
// Old code (lines 330-341):
if (age > maxAgeSeconds) {
  console.log('[SW] Cache expired:', request.url, `age: ${age}s`);
  // Cache expired, but still return it while network is down
  // In a real app, you might want to show a staleness indicator
}

console.log('[SW] NetworkFirst CACHE FALLBACK:', request.url);
return cachedResponse;

// New code:
if (age > maxAgeSeconds) {
  console.log('[SW] Cache expired:', request.url, `age: ${age}s`);
  // Mark response as stale but return it while offline
  const staleResponse = cachedResponse.clone();
  const headers = new Headers(staleResponse.headers);
  headers.set('X-Cache-Status', 'stale');
  headers.set('X-Cache-Age-Seconds', String(age));
  headers.set('X-Cache-Max-Age-Seconds', String(maxAgeSeconds));

  const markedStaleResponse = new Response(staleResponse.body, {
    status: staleResponse.status,
    statusText: staleResponse.statusText,
    headers: headers
  });

  console.log('[SW] NetworkFirst CACHE FALLBACK (STALE):', request.url);
  return markedStaleResponse;
}

console.log('[SW] NetworkFirst CACHE FALLBACK:', request.url);
return cachedResponse;
```

### Solution: Part 2 - Detect Stale Responses in App

**File:** `/src/lib/utils/cacheStatus.ts` (create new file)

```typescript
/**
 * Check if a fetch response is from stale cache
 */
export function isCacheStale(response: Response): boolean {
  return response.headers.get('X-Cache-Status') === 'stale';
}

/**
 * Get cache age information
 */
export function getCacheAgeInfo(response: Response): {
  isStale: boolean;
  ageSeconds: number | null;
  maxAgeSeconds: number | null;
} {
  const ageStr = response.headers.get('X-Cache-Age-Seconds');
  const maxAgeStr = response.headers.get('X-Cache-Max-Age-Seconds');
  const status = response.headers.get('X-Cache-Status');

  return {
    isStale: status === 'stale',
    ageSeconds: ageStr ? parseInt(ageStr, 10) : null,
    maxAgeSeconds: maxAgeStr ? parseInt(maxAgeStr, 10) : null
  };
}

/**
 * Format cache age for display
 */
export function formatCacheAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s old`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m old`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h old`;
  return `${Math.floor(seconds / 86400)}d old`;
}
```

### Solution: Part 3 - Create Stale Data Warning Component

**File:** `/src/lib/components/pwa/StaleDataWarning.svelte` (create new file)

```svelte
<script lang="ts">
  import { getCacheAgeInfo, formatCacheAge } from '$lib/utils/cacheStatus';

  let { response }: { response: Response } = $props();

  let isVisible = $state(false);
  let ageInfo = $state<ReturnType<typeof getCacheAgeInfo> | null>(null);

  $effect(() => {
    if (response) {
      ageInfo = getCacheAgeInfo(response);
      isVisible = ageInfo.isStale;
    }
  });
</script>

{#if isVisible && ageInfo}
  <div class="stale-warning" role="alert">
    <svg
      class="warning-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M12 2L2 20h20L12 2Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
    <div class="warning-content">
      <p class="warning-title">Showing cached data</p>
      <p class="warning-text">
        This data is {formatCacheAge(ageInfo.ageSeconds ?? 0)} old and may not be current.
      </p>
    </div>
  </div>
{/if}

<style>
  .stale-warning {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    padding: 1rem;
    background-color: oklch(from var(--color-warning, #fbbf24) l c h / 0.1);
    border-left: 4px solid var(--color-warning, #fbbf24);
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .warning-icon {
    width: 20px;
    height: 20px;
    color: var(--color-warning, #fbbf24);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .warning-content {
    flex: 1;
  }

  .warning-title {
    font-weight: 600;
    font-size: 0.875rem;
    margin: 0 0 0.25rem 0;
    color: var(--foreground);
  }

  .warning-text {
    font-size: 0.8125rem;
    color: var(--foreground-secondary);
    margin: 0;
  }
</style>
```

### Solution: Part 4 - Use Warning Component in Routes

Example usage in a data-fetching component:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import StaleDataWarning from '$lib/components/pwa/StaleDataWarning.svelte';

  let response: Response | null = null;
  let data: any = null;

  onMount(async () => {
    response = await fetch('/api/shows');
    data = await response.json();
  });
</script>

{#if response}
  <StaleDataWarning {response} />
{/if}

{#if data}
  <!-- Display data -->
{/if}
```

---

## LOW PRIORITY FIX #1: Preload Web Manifest

**File:** `/src/app.html`
**Time:** 5 minutes
**Impact:** Low - Minor performance improvement

### Current Code (Line 15)
```html
<link rel="manifest" href="%sveltekit.assets%/manifest.json" />
```

### Fixed Code
```html
<!-- Preload manifest for faster PWA detection -->
<link rel="preload" as="fetch" href="%sveltekit.assets%/manifest.json" />
<link rel="manifest" href="%sveltekit.assets%/manifest.json" />
```

### Why
- Manifest is critical for PWA installability
- Preloading ensures it's fetched with high priority
- Improves install prompt detection speed

---

## LOW PRIORITY FIX #2: Add VAPID Key Validation

**File:** `/src/lib/sw/register.ts`
**Time:** 20 minutes
**Impact:** Low - Improves error handling for push notifications

### Issue
No validation of VAPID public key format before subscription.

### Solution: Replace `subscribeToPush` Function

Replace lines 195-222 with:

```typescript
/**
 * Subscribe to push notifications
 * @param vapidPublicKey - VAPID public key (base64url encoded, 65 bytes)
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isServiceWorkerSupported() || !('PushManager' in window)) {
    console.log('[SW] Push notifications not supported');
    return null;
  }

  // Validate VAPID key
  if (!vapidPublicKey || typeof vapidPublicKey !== 'string') {
    console.error('[SW] VAPID public key is required and must be a string');
    return null;
  }

  if (vapidPublicKey.trim().length === 0) {
    console.error('[SW] VAPID public key cannot be empty');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('[SW] Using existing push subscription');
      return existingSubscription;
    }

    // Validate and convert VAPID key
    let applicationServerKey: BufferSource;
    try {
      applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    } catch (error) {
      console.error('[SW] Invalid VAPID public key format:', error);
      return null;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    console.log('[SW] Push subscription created:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      expirationTime: subscription.expirationTime
    });
    return subscription;
  } catch (error) {
    console.error('[SW] Push subscription failed:', error);
    if (error instanceof Error) {
      // Provide specific error messages
      if (error.message.includes('NotAllowedError')) {
        console.error('[SW] Permission required. Request notification permission first.');
      } else if (error.message.includes('NotSupportedError')) {
        console.error('[SW] Push notifications not supported on this browser/OS.');
      }
    }
    return null;
  }
}

/**
 * Convert VAPID key to Uint8Array with validation
 * @throws Error if key is invalid
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Validate input
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('VAPID public key must be a non-empty string');
  }

  try {
    // Standard base64url -> base64 conversion
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Decode base64
    const rawData = window.atob(base64);

    // VAPID keys must be exactly 65 bytes
    if (rawData.length !== 65) {
      throw new Error(
        `VAPID public key must be 65 bytes (got ${rawData.length} bytes). ` +
        'Make sure you are using the correct public key from your VAPID key pair.'
      );
    }

    // Convert to Uint8Array
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  } catch (error) {
    if (error instanceof Error && error.message.includes('65 bytes')) {
      throw error;
    }
    throw new Error(
      `Invalid VAPID public key format: ${error instanceof Error ? error.message : String(error)}. ` +
      'VAPID key should be base64url encoded.'
    );
  }
}
```

### Usage Example
```typescript
// When subscribing
const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

if (!vapidKey) {
  console.error('VITE_VAPID_PUBLIC_KEY environment variable is not set');
} else {
  const subscription = await subscribeToPush(vapidKey);
  if (subscription) {
    console.log('Successfully subscribed to push notifications');
  }
}
```

---

## Implementation Checklist

- [ ] **HIGH PRIORITY** Fix SvelteKit environment variable pattern
  - [ ] Import `dev` from `$app/environment`
  - [ ] Use `import.meta.env.VITE_ENABLE_SW_DEV`
  - [ ] Test in both dev and production modes

- [ ] **MEDIUM PRIORITY** Implement cache cleanup
  - [ ] Add `startPeriodicCacheCleanup()` to pwa.ts
  - [ ] Add `limitCacheSize()` function to sw.js
  - [ ] Update `handleCleanupCaches()` in sw.js
  - [ ] Call cleanup on layout mount
  - [ ] Test cleanup runs periodically

- [ ] **MEDIUM PRIORITY** Add stale cache indication
  - [ ] Update service worker expiration logic
  - [ ] Create `cacheStatus.ts` utility
  - [ ] Create `StaleDataWarning.svelte` component
  - [ ] Test stale warnings display correctly

- [ ] **LOW PRIORITY** Preload manifest
  - [ ] Add preload link in app.html
  - [ ] Verify manifest loads faster

- [ ] **LOW PRIORITY** Add VAPID validation
  - [ ] Replace `subscribeToPush()` function
  - [ ] Replace `urlBase64ToUint8Array()` function
  - [ ] Test with invalid keys
  - [ ] Test with valid keys

---

## Testing Verification

After implementing all fixes:

```javascript
// Test 1: Verify cleanup runs
console.log('Testing periodic cleanup...');
// Wait 5 minutes and check caches

// Test 2: Verify cache size limits
caches.open('dmb-api-v-20250122-1430').then(cache => {
  cache.keys().then(keys => {
    console.log('API cache entries:', keys.length, '(should be <= 50)');
  });
});

// Test 3: Verify stale response marking
fetch('/api/shows').then(res => {
  console.log('Cache status:', res.headers.get('X-Cache-Status'));
  console.log('Cache age:', res.headers.get('X-Cache-Age-Seconds'));
});

// Test 4: Verify SvelteKit pattern (check browser console)
// Should show proper SW registration messages

// Test 5: Verify VAPID validation
navigator.serviceWorker.ready.then(reg => {
  // Try invalid key
  subscribeToPush('invalid-key').then(sub => {
    console.log('Invalid key test:', sub ? 'FAILED' : 'PASSED');
  });
});
```

---

## Quick Start

**Minimum fixes for next release (2 hours):**
1. Fix SvelteKit pattern (15 min)
2. Implement cache cleanup (45 min)
3. Preload manifest (5 min)

**Full implementation (4-5 hours):**
All of the above plus:
4. Add stale cache indication (60 min)
5. Add VAPID validation (20 min)

---

**Next Review:** After implementation is complete, run full PWA test suite.
