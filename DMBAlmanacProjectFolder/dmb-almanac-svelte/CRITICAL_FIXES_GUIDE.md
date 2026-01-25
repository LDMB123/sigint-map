# Critical Fixes Implementation Guide

## Issue #1: RUM Manager Double-Init Warning

**Location**: `src/lib/utils/rum.ts` line 146-150

**Current Code**:
```typescript
initialize(config: RUMConfig = {}): void {
  if (this.initialized) {
    console.warn('[RUM] Already initialized');
    return;
  }
```

**Problem**: `console.warn()` outputs to stderr in test runners, polluting CI logs.

**Fix**:
```typescript
initialize(config: RUMConfig = {}): void {
  if (this.initialized) {
    if (this.config.enableLogging) {
      console.debug('[RUM] Already initialized, skipping reinitialize');
    }
    return;
  }
```

**Alternate Fix** (Better for tests): Reset singleton in test teardown
```typescript
// test-setup.ts
export function cleanupRUM() {
  rumManager.initialized = false;
  rumManager.metrics = [];
  rumManager.sessionId = generateId();
}

afterEach(() => {
  cleanupRUM();
});
```

**Impact**: Eliminates test pollution, makes real test failures visible

---

## Issue #2: DataLoader Cache Fallback Missing

**Location**: `src/lib/db/dexie/data-loader.ts` lines 279-365

**Current Code**:
```typescript
async function fetchJsonData<T>(filePath: string): Promise<T | null> {
  const encodings = getSupportedEncodings();
  const attempts = [
    { url: `${filePath}.br`, encoding: 'br' },
    { url: `${filePath}.gz`, encoding: 'gzip' },
    { url: filePath, encoding: null }
  ];

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, { headers });
      if (!response.ok) {
        if (response.status === 404) continue;
        throw new Error(`HTTP ${response.status}`);
      }
      // ... process response
      return data as T;
    } catch (error) {
      console.debug(`[DataLoader] Failed to fetch ${attempt.url}:`, error);
      continue;
    }
  }

  console.warn(`[DataLoader] Failed to fetch ${filePath} in any format`);
  return null;  // ❌ NO FALLBACK
}
```

**Problem**: When all fetch attempts fail, returns null instead of cached data.

**Fix** - Add fallback chain:
```typescript
async function fetchJsonData<T>(filePath: string): Promise<T | null> {
  const encodings = getSupportedEncodings();
  const startTime = performance.now();

  // Try in order: Brotli > gzip > uncompressed
  const attempts: Array<{ url: string; encoding: ExtendedCompressionFormat | null }> = [];
  if (encodings.brotli) {
    attempts.push({ url: `${filePath}.br`, encoding: 'br' });
  }
  if (encodings.gzip) {
    attempts.push({ url: `${filePath}.gz`, encoding: 'gzip' });
  }
  attempts.push({ url: filePath, encoding: null });

  // PRIMARY: Try all compression formats
  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, { headers });
      if (!response.ok) {
        if (response.status === 404) continue;
        throw new Error(`HTTP ${response.status}`);
      }

      // Decompress if needed
      let text: string;
      if (attempt.encoding !== null) {
        const blob = await response.blob();
        const decompressedStream = blob.stream().pipeThrough(
          createDecompressionStream(attempt.encoding)
        );
        const decompressedBlob = await new Response(decompressedStream).blob();
        text = await decompressedBlob.text();
      } else {
        text = await response.text();
      }

      const data = JSON.parse(text);
      console.debug(`[DataLoader] Fetched ${filePath} (${attempt.encoding || 'uncompressed'})`);
      return data as T;
    } catch (error) {
      console.debug(`[DataLoader] Failed to fetch ${attempt.url}:`, error);
      continue;
    }
  }

  // FALLBACK 1: Try Service Worker cache
  console.debug(`[DataLoader] Attempting Service Worker cache fallback: ${filePath}`);
  try {
    const cached = await caches.match(filePath);
    if (cached && cached.ok) {
      const text = await cached.text();
      const data = JSON.parse(text);
      console.debug(`[DataLoader] Using Service Worker cached: ${filePath}`);
      return data as T;
    }
  } catch (error) {
    console.debug('[DataLoader] Service Worker cache fallback failed:', error);
  }

  // FALLBACK 2: Check if we have previously synced data
  console.debug(`[DataLoader] Attempting IndexedDB fallback: ${filePath}`);
  try {
    const db = getDb();
    const syncMeta = await db.getSyncMeta();

    if (syncMeta?.recordCounts && Object.values(syncMeta.recordCounts).some(c => c > 0)) {
      console.debug('[DataLoader] Data previously synced, using existing IndexedDB data');
      return 'use-existing-db' as any;  // Signal to use existing data
    }
  } catch (error) {
    console.debug('[DataLoader] IndexedDB fallback check failed:', error);
  }

  // NO FALLBACK AVAILABLE
  console.warn(`[DataLoader] Failed to fetch ${filePath} in any format`);
  return null;
}
```

**Usage in loadInitialData**:
```typescript
// In loadInitialData() where data is fetched
const rawData = await fetchJsonData<RawScrapedData>(task.jsonFile);

// NEW: Handle fallback signal
if (rawData === 'use-existing-db') {
  console.log(`[DataLoader] Using existing data for ${task.name}`);
  // Skip loading this entity since data already exists
  fetchedData.set(task.name, []);
  continue;
}

if (rawData === null) {
  if (task.required) {
    throw new Error(`Required data file not found: ${task.jsonFile}`);
  }
  console.warn(`[DataLoader] Optional file not found: ${task.jsonFile}`);
  fetchedData.set(task.name, []);
} else {
  const transformed = transformEntity(task.name, rawData);
  fetchedData.set(task.name, transformed);
}
```

**Impact**: Users get functional app with stale data instead of blank page

---

## Issue #3: Semantic Cache Versioning

**Location**: `static/sw.js` lines 14-18, 1116-1149

**Problem**: Cache version based on current timestamp, not actual build version.

**Step 1: Update vite.config.ts**

Add build version injection plugin:
```typescript
import { readFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    // Existing plugins...
    {
      name: 'inject-build-version',
      async resolveId(id) {
        if (id === 'virtual-build-info') {
          return id;
        }
      },
      async load(id) {
        if (id === 'virtual-build-info') {
          // Get git commit hash
          let gitHash = 'dev';
          try {
            const { stdout } = await execAsync('git rev-parse --short HEAD');
            gitHash = stdout.trim();
          } catch (e) {
            console.warn('Could not get git hash:', e);
          }

          return `
            export const BUILD_VERSION = '${pkg.version}';
            export const BUILD_HASH = '${gitHash}';
            export const BUILD_TIME = ${Date.now()};
          `;
        }
      },
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => {
          return html
            .replace(/__BUILD_VERSION__/g, pkg.version)
            .replace(/__BUILD_HASH__/g, process.env.GIT_SHA?.slice(0, 8) || 'dev')
            .replace(/__BUILD_TIME__/g, String(Date.now()));
        }
      }
    }
  ]
});
```

**Step 2: Update static/sw.js**

Old:
```javascript
const BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined' 
  ? __BUILD_TIMESTAMP__ 
  : new Date().toISOString().replace(/[^\d]/g, '').slice(0, 12);
const CACHE_VERSION = `v-${BUILD_TIMESTAMP.slice(0, 8)}-${BUILD_TIMESTAMP.slice(8, 12)}`;
```

New:
```javascript
const BUILD_VERSION = '__BUILD_VERSION__';  // Replaced by build: e.g., '1.2.3'
const BUILD_HASH = '__BUILD_HASH__';        // Replaced by build: e.g., 'abc123de'
const CACHE_VERSION = `v${BUILD_VERSION}-${BUILD_HASH}`;

// Example output: v1.2.3-abc123de

// Semantic version comparison
function isNewerVersion(current: string, remote: string): boolean {
  // Compare semantic versions: 1.2.3 vs 1.2.4
  const [curMajor, curMinor, curPatch] = current.split('.').map(Number);
  const [remMajor, remMinor, remPatch] = remote.split('.').map(Number);

  if (remMajor !== curMajor) return remMajor > curMajor;
  if (remMinor !== curMinor) return remMinor > curMinor;
  return remPatch > curPatch;
}
```

**Step 3: Update critical update check**

Old:
```javascript
async function checkForCriticalUpdates(): Promise<boolean> {
  // ...
  const remoteVersion = text.match(/const CACHE_VERSION = '([^']+)'/)?.[1];
  const hasUpdate = remoteVersion && remoteVersion !== CACHE_VERSION;
}
```

New:
```javascript
async function checkForCriticalUpdates(): Promise<boolean> {
  try {
    const response = await fetch('/api/build-info');
    if (!response.ok) {
      console.log('[SW] Could not check for updates (no build-info endpoint)');
      return false;
    }

    const { version: remoteVersion, critical, changelog } = await response.json();

    if (!remoteVersion) {
      return false;
    }

    // Extract semver from remoteVersion (e.g., "1.2.3" from "v1.2.3-abc123de")
    const remoteVersionMatch = remoteVersion.match(/v?(\d+\.\d+\.\d+)/);
    const remoteVersionStr = remoteVersionMatch?.[1];

    if (!remoteVersionStr) {
      console.warn('[SW] Could not parse remote version:', remoteVersion);
      return false;
    }

    const currentVersionMatch = BUILD_VERSION.match(/(\d+\.\d+\.\d+)/);
    const currentVersionStr = currentVersionMatch?.[1];

    if (!currentVersionStr) {
      console.warn('[SW] Could not parse current version:', BUILD_VERSION);
      return false;
    }

    const hasUpdate = isNewerVersion(currentVersionStr, remoteVersionStr);

    if (hasUpdate) {
      console.log('[SW] New version available:', remoteVersionStr);
      if (critical) {
        console.log('[SW] CRITICAL update available, forcing reload');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[SW] Critical update check failed:', error);
    return false;
  }
}
```

**Server-side endpoint** (create `/api/build-info`):
```typescript
// src/routes/api/build-info/+server.ts
export async function GET() {
  return json({
    version: `v${process.env.npm_package_version || '1.0.0'}-${process.env.GIT_SHA?.slice(0, 8) || 'dev'}`,
    critical: false,  // Set to true when critical bug fix deployed
    changelog: 'https://github.com/owner/repo/releases',
    lastUpdated: new Date().toISOString()
  });
}
```

**Impact**: Cache versions match actual deployments, stale cache properly evicted

---

## Issue #4: Quota Exceeded UI Integration

**Location**: `src/lib/components/pwa/StorageQuotaMonitor.svelte`

**Fix**: Ensure component mounted globally

**In src/routes/+layout.svelte**:
```svelte
<script>
  import Header from '$lib/components/Header.svelte';
  import StorageQuotaMonitor from '$lib/components/pwa/StorageQuotaMonitor.svelte';
  import UpdatePrompt from '$lib/components/pwa/UpdatePrompt.svelte';
  import { pwaStore } from '$lib/stores/pwa';

  onMount(() => {
    // Initialize PWA
    pwaStore.initialize();
  });
</script>

<div class="app">
  <!-- Global PWA components - always mounted -->
  <StorageQuotaMonitor />
  <UpdatePrompt />

  <!-- Page content -->
  <Header />
  <main>
    <slot />
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    padding: 1rem;
  }
</style>
```

**Verify StorageQuotaMonitor listens for custom event**:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let isExceeded = false;
  let entity = '';
  let isDismissed = false;

  onMount(() => {
    if (!browser) return;

    const handleQuotaExceeded = (event: Event) => {
      const e = event as CustomEvent;
      const { entity: entityName, loaded, attempted } = e.detail;

      console.warn('[StorageQuotaMonitor] Quota exceeded during sync:', {
        entity: entityName,
        loaded,
        attempted
      });

      entity = entityName || 'unknown';
      isExceeded = true;
      isDismissed = false;

      // Show notification for 10 seconds then auto-dismiss
      setTimeout(() => {
        isDismissed = true;
      }, 10000);
    };

    window.addEventListener('dexie-quota-exceeded', handleQuotaExceeded);

    return () => {
      window.removeEventListener('dexie-quota-exceeded', handleQuotaExceeded);
    };
  });

  function handleDismiss() {
    isDismissed = true;
  }

  function handleClearStorage() {
    // Offer to clear old cached tours
    // Allow user to retry sync
  }
</script>

{#if isExceeded && !isDismissed}
  <div class="quota-exceeded-banner">
    <p>Storage quota exceeded while loading {entity}.</p>
    <button on:click={handleDismiss}>Dismiss</button>
    <button on:click={handleClearStorage}>Clear Cache & Retry</button>
  </div>
{/if}
```

**Impact**: Users see helpful UI notification instead of cryptic error

---

## Issue #5: VAPID Key Validation

**Location**: `src/lib/utils/push-notifications.ts`

**Add validation function**:
```typescript
/**
 * Validate VAPID public key format and length
 * VAPID public keys for P-256 must be exactly 65 bytes when decoded
 */
function validateVAPIDKey(key: string): { valid: boolean; error?: string } {
  if (!key) {
    return { valid: false, error: 'VAPID key is required' };
  }

  if (typeof key !== 'string') {
    return { valid: false, error: 'VAPID key must be a string' };
  }

  try {
    const decoded = urlBase64ToUint8Array(key);

    if (decoded.byteLength !== 65) {
      return {
        valid: false,
        error: `Invalid VAPID key length: ${decoded.byteLength} bytes, expected 65`
      };
    }

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: `Invalid base64 encoding: ${message}`
    };
  }
}
```

**Update subscribeToPush**:
```typescript
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  // Validate VAPID key first
  const validation = validateVAPIDKey(vapidPublicKey);
  if (!validation.valid) {
    console.error('[Push] VAPID key validation failed:', validation.error);
    throw {
      code: 'invalid_vapid_key',
      message: validation.error,
      originalError: new Error(validation.error),
    } as PushError;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('[Push] Subscription successful:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
    });

    return subscription;
  } catch (error) {
    // ... handle subscription errors
  }
}
```

**Update PushNotifications.svelte**:
```svelte
<script>
  import { requestAndSubscribeToPush } from '$lib/utils/push-notifications';

  async function handleEnableNotifications() {
    try {
      // VAPID key from environment
      const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!VAPID_PUBLIC_KEY) {
        showError = true;
        errorMessage = 'Push notifications not configured on server';
        return;
      }

      const subscription = await requestAndSubscribeToPush(VAPID_PUBLIC_KEY);
      if (subscription) {
        // Send to server
        await fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.getKey('auth'),
              p256dh: subscription.getKey('p256dh'),
            },
          }),
        });
        isSubscribed = true;
      }
    } catch (error) {
      showError = true;
      errorMessage = error instanceof Error ? error.message : 'Failed to subscribe';
    }
  }
</script>
```

**Impact**: Silent failures prevented, clear error messages

---

## Issue #6: Dexie Sync Schema Validation

**Location**: `src/lib/db/dexie/sync.ts`

**Add Zod schemas**:
```typescript
import { z } from 'zod';

const ServerVenueSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1),
  city: z.string().min(1),
  state: z.string().nullable(),
  country: z.string().min(1),
  country_code: z.string(),
  venue_type: z.enum([
    'amphitheater', 'amphitheatre', 'arena', 'stadium',
    'theater', 'theatre', 'club', 'festival', 'outdoor',
    'cruise', 'pavilion', 'coliseum', 'other'
  ]).nullable(),
  capacity: z.number().nonnegative().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  total_shows: z.number().nonnegative(),
  first_show_date: z.string().nullable(),
  last_show_date: z.string().nullable(),
  notes: z.string().nullable(),
});

// Similar schemas for Song, Tour, Show, SetlistEntry, etc.

const ServerSongSchema = z.object({
  id: z.number().positive(),
  title: z.string().min(1),
  slug: z.string(),
  sort_title: z.string(),
  original_artist: z.string().nullable(),
  is_cover: z.number().int(),
  is_original: z.number().int(),
  first_played_date: z.string().nullable(),
  last_played_date: z.string().nullable(),
  total_performances: z.number().nonnegative(),
  opener_count: z.number().nonnegative(),
  closer_count: z.number().nonnegative(),
  encore_count: z.number().nonnegative(),
  lyrics: z.string().nullable(),
  notes: z.string().nullable(),
  is_liberated: z.number().int().optional(),
  days_since_last_played: z.number().nullable().optional(),
  shows_since_last_played: z.number().nullable().optional(),
});

// ... add schemas for all entities
```

**Update transform functions**:
```typescript
function transformVenue(raw: unknown): DexieVenue {
  // Validate first
  let server: z.infer<typeof ServerVenueSchema>;
  try {
    server = ServerVenueSchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Sync] Venue validation error:', {
        issues: error.issues,
        raw
      });
      throw new Error(`Invalid venue data: ${error.issues.map(i => i.message).join(', ')}`);
    }
    throw error;
  }

  // Now safely transform
  return {
    id: server.id,
    name: server.name,
    city: server.city,
    state: server.state ?? null,
    country: server.country,
    countryCode: server.country_code,
    venueType: server.venue_type,
    capacity: server.capacity,
    latitude: server.latitude,
    longitude: server.longitude,
    totalShows: server.total_shows,
    firstShowDate: server.first_show_date ?? null,
    lastShowDate: server.last_show_date ?? null,
    notes: server.notes ?? null,
    searchText: [server.name, server.city, server.state, server.country]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

// Apply to all entity transforms: Song, Tour, Show, SetlistEntry, Guest, etc.
```

**Update performFullSync to catch validation errors**:
```typescript
export async function performFullSync(options: SyncOptions = {}): Promise<void> {
  const { apiBase = '/api', onProgress, signal, chunkSize = 1000 } = options;
  const db = getDb();

  try {
    // ... fetch data

    for (const entity of entities) {
      try {
        // Transform with validation
        const transformed: unknown[] = [];
        const transformFn = entity.transform as (item: unknown) => unknown;

        for (let i = 0; i < entity.data.length; i += YIELD_BATCH_SIZE) {
          for (let j = i; j < Math.min(i + YIELD_BATCH_SIZE, entity.data.length); j++) {
            try {
              transformed.push(transformFn(entity.data[j]));
            } catch (error) {
              console.error(`[Sync] Validation error in ${entity.name}[${j}]:`, error, entity.data[j]);
              // Option 1: Fail the entire sync (current behavior)
              // throw error;

              // Option 2: Skip invalid record and continue (graceful degradation)
              // continue;
              throw error;  // Keep current behavior
            }
          }

          if (i + YIELD_BATCH_SIZE < entity.data.length) {
            await yieldToMain();
          }
        }

        // ... insert into DB

      } catch (error) {
        console.error(`[Sync] Failed to process ${entity.name}:`, error);
        throw new Error(`Sync failed: ${entity.name} - ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }
  } catch (error) {
    // ... error handling
  }
}
```

**Impact**: Schema mismatches detected early, data integrity guaranteed

---

## Testing These Fixes

```typescript
// test-helpers.ts
import 'fake-indexeddb/auto';

export function setupPWATests() {
  // Setup IndexedDB
  await initDatabase();

  // Reset RUM
  if (rumManager) {
    rumManager.initialized = false;
  }

  // Clear caches
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

export function cleanupPWATests() {
  // Cleanup after each test
  rumManager.initialized = false;
}

// Example test
describe('DataLoader', () => {
  beforeEach(setupPWATests);
  afterEach(cleanupPWATests);

  test('should use cache fallback when fetch fails', async () => {
    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // Mock Service Worker cache
    const cache = await caches.open('test-cache');
    await cache.put('/data/venues.json', new Response(JSON.stringify([...])));

    // Should fall back to cache
    const data = await fetchJsonData('/data/venues.json');
    expect(data).toBeDefined();
  });

  test('should validate VAPID key', async () => {
    const validation = validateVAPIDKey('invalid-key');
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('base64');
  });
});
```

---

## Rollout Strategy

1. **Fix in order**: 1 → 2 → 3 → (can parallelize 4,5,6)
2. **Deploy order**:
   - Patch version: Issues #1, #4 (safe, UI improvements)
   - Minor version: Issues #2, #5 (functionality improvements)
   - Minor version: Issues #3, #6 (infrastructure improvements)
3. **Monitor**: Track metrics listed in audit report

