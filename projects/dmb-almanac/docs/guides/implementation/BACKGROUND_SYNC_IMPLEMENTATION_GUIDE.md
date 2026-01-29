# Background Sync API - Implementation Guide

## Overview

The DMB Almanac app now supports the Background Sync API, enabling offline-first functionality that syncs automatically when connectivity returns—even if the user has closed the app or browser.

### Key Features

✅ **Automatic Offline Mutation Sync**: Favorites, notes, and other changes sync automatically when online
✅ **Periodic Background Sync**: Daily data updates even when app is closed (Chrome/Edge only)
✅ **Queue Management**: Failed syncs retry with exponential backoff
✅ **User Control**: Settings UI for managing sync preferences
✅ **Graceful Degradation**: Falls back to immediate sync on unsupported browsers

### Browser Support

| Browser | Background Sync | Periodic Sync |
|---------|----------------|---------------|
| Chrome 49+ | ✅ Supported | ✅ Supported (min interval: 12 hours) |
| Edge 79+ | ✅ Supported | ✅ Supported |
| Opera 36+ | ✅ Supported | ✅ Supported |
| Safari | ❌ Not supported | ❌ Not supported |
| Firefox | ❌ Not supported | ❌ Not supported |

**Fallback**: On unsupported browsers, mutations sync immediately when online (standard fetch).

---

## Architecture

### Component Structure

```
app/src/lib/pwa/
├── background-sync.ts                 # Main API for registering syncs
├── sw-background-sync-handler.ts      # Service worker event handlers
└── components/
    └── BackgroundSyncSettings.svelte  # UI for sync settings
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Action                              │
│                   (e.g., favorite show offline)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  queueMutation()     │
              │  - Save to IndexedDB │
              │  - Register sync tag │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Service Worker      │
              │  - Wait for online   │
              │  - Fire 'sync' event │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  handleBackgroundSync│
              │  - Read queue        │
              │  - Send to API       │
              │  - Update local DB   │
              │  - Clear queue       │
              └──────────────────────┘
```

---

## Usage

### 1. Queue an Offline Mutation

```typescript
import { queueMutation } from '$lib/pwa/background-sync';

// User favorites a show while offline
async function favoriteShow(showId: string) {
  const mutation = {
    id: showId,
    favorited: true,
    timestamp: Date.now(),
  };

  // Queue mutation - will sync automatically when online
  await queueMutation('update', 'favorites', mutation);

  // Update UI optimistically
  updateUIOptimistically(showId);
}
```

**What happens:**
1. Mutation saved to `offlineMutations` table in IndexedDB
2. Background sync registered with tag `mutation-favorites`
3. Service worker fires `sync` event when connectivity returns
4. Mutation sent to API and local database updated
5. Queue entry removed on success

### 2. Register Periodic Sync

```typescript
import { requestPeriodicSyncPermission } from '$lib/pwa/background-sync';

// User clicks "Enable Daily Updates" button
async function enableDailyUpdates() {
  const success = await requestPeriodicSyncPermission();

  if (success) {
    console.log('Daily updates enabled');
    // Service worker will check for updates every 24 hours
  } else {
    console.error('Failed to enable periodic sync');
    // Show error message to user
  }
}
```

**Requirements:**
- Must be called in response to user interaction (button click)
- Requires `periodic-background-sync` permission
- Browser may revoke permission if app engagement is low

### 3. Check Sync Status

```typescript
import { getBackgroundSyncStatus } from '$lib/pwa/background-sync';

const status = await getBackgroundSyncStatus();

console.log('Background Sync supported:', status.supported);
console.log('Periodic Sync supported:', status.periodicSupported);
console.log('Pending syncs:', status.tags);
console.log('Periodic syncs:', status.periodicTags);
```

### 4. Initialize on App Start

```typescript
// src/routes/+layout.svelte
import { onMount } from 'svelte';
import { initializeBackgroundSync } from '$lib/pwa/background-sync';

onMount(() => {
  initializeBackgroundSync();
});
```

---

## Service Worker Integration

### 1. Add Event Listeners

In your service worker (`static/sw.js`):

```javascript
import {
  handleBackgroundSync,
  handlePeriodicSync
} from './sw-background-sync-handler';

// One-time background sync
self.addEventListener('sync', handleBackgroundSync);

// Periodic background sync
self.addEventListener('periodicsync', handlePeriodicSync);
```

### 2. Predefined Sync Tags

The handler recognizes these tags automatically:

| Tag | Type | Purpose |
|-----|------|---------|
| `offline-mutations` | One-time | Sync all queued mutations |
| `mutation-{entity}` | One-time | Sync specific entity mutations |
| `sync-preferences` | One-time | Sync user preferences |
| `data-update-check` | Periodic | Check for new show data |
| `fetch-shows` | Periodic | Prefetch recent shows |

### 3. Custom Sync Handlers

Add custom logic in `sw-background-sync-handler.ts`:

```typescript
export async function handleBackgroundSync(event: SyncEventWithTag): Promise<void> {
  const syncPromise = (async () => {
    switch (event.tag) {
      // ... existing cases ...

      case 'my-custom-sync':
        return await myCustomSyncLogic();

      default:
        console.warn('[SW] Unknown sync tag:', event.tag);
    }
  })();

  event.waitUntil(syncPromise);
}
```

---

## UI Integration

### Add Settings Component

```svelte
<!-- src/routes/settings/+page.svelte -->
<script>
  import BackgroundSyncSettings from '$lib/components/pwa/BackgroundSyncSettings.svelte';
</script>

<section>
  <h2>Sync Settings</h2>
  <BackgroundSyncSettings />
</section>
```

### Show Sync Status Indicator

```svelte
<script>
  import { getQueuedMutations } from '$lib/pwa/background-sync';

  let pendingCount = 0;

  onMount(async () => {
    const mutations = await getQueuedMutations();
    pendingCount = mutations.length;
  });
</script>

{#if pendingCount > 0}
  <div class="sync-indicator">
    {pendingCount} change{pendingCount === 1 ? '' : 's'} waiting to sync
  </div>
{/if}
```

---

## Database Schema

### Required Tables

Background Sync requires these IndexedDB tables:

```typescript
// src/lib/db/dexie/schema.ts

export interface OfflineMutation {
  id: string;                // UUID
  type: 'create' | 'update' | 'delete';
  entity: string;            // Table name (e.g., 'favorites')
  data: unknown;             // Mutation payload
  timestamp: number;         // When queued
  retryCount: number;        // Failed retry attempts
  lastError?: string;        // Last error message
}

// Dexie schema
offlineMutations: '++id, timestamp, entity'
```

### Migration

Add to your Dexie migration:

```typescript
db.version(2).stores({
  // ... existing tables ...
  offlineMutations: '++id, timestamp, entity',
});
```

---

## Error Handling

### Retry Logic

Failed syncs retry automatically with exponential backoff:

1. **Attempt 1**: Immediate (when online)
2. **Attempt 2**: After 2 seconds
3. **Attempt 3**: After 4 seconds
4. **Attempt 4**: After 8 seconds (final attempt)

After 4 failed attempts, a notification is shown to the user.

### Conflict Resolution

If a mutation conflicts with server state:

```typescript
// In sw-background-sync-handler.ts

async function processMutation(mutation: QueuedMutation): Promise<void> {
  try {
    const response = await fetch(url, { ... });

    if (response.status === 409) {
      // Conflict - server has newer version
      await handleConflict(mutation, await response.json());
      return;
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    // Success - update local database
    await updateLocalDatabase(db, mutation);
  } catch (error) {
    // Re-throw for retry logic
    throw error;
  }
}
```

---

## Testing

### Manual Testing

#### Test One-Time Sync

1. Open DevTools → Application → Service Workers
2. Check "Offline" to simulate offline mode
3. Favorite a show (mutation queued)
4. Uncheck "Offline" to go back online
5. Watch Network tab - mutation should sync automatically
6. Check IndexedDB - mutation should be removed from queue

#### Test Periodic Sync

1. Open DevTools → Application → Service Workers
2. Click "Periodicss Sync" section
3. Find tag `data-update-check`
4. Click "Simulate" to trigger periodic sync event
5. Check Console for sync logs

### Automated Testing

```typescript
// tests/e2e/background-sync.spec.ts

import { test, expect } from '@playwright/test';

test('should queue mutation when offline', async ({ page, context }) => {
  await context.route('**/*', (route) => route.abort());

  await page.goto('/');
  await page.click('[data-favorite-button]');

  const mutations = await page.evaluate(() => {
    return indexedDB.databases().then((dbs) => {
      // Query offlineMutations table
    });
  });

  expect(mutations).toHaveLength(1);
});

test('should sync mutation when online', async ({ page }) => {
  // Queue mutation while offline
  await context.setOffline(true);
  await page.click('[data-favorite-button]');

  // Go back online
  await context.setOffline(false);

  // Wait for sync event
  await page.waitForEvent('sync');

  // Verify mutation synced
  const pending = await page.evaluate(() => {
    // Check offlineMutations table is empty
  });

  expect(pending).toHaveLength(0);
});
```

---

## Performance Considerations

### Batch Mutations

For multiple mutations of the same type:

```typescript
// Don't: Register sync for each mutation individually
for (const show of shows) {
  await queueMutation('update', 'favorites', show);
}

// Do: Batch mutations under single sync tag
await queueBatchMutations(shows, 'favorites');
await registerBackgroundSync({ tag: 'mutation-favorites' });
```

### Sync Timing

Browsers control when background sync fires based on:
- Network conditions (only on Wi-Fi by default)
- Battery status (may delay on low battery)
- Site engagement (less used sites sync less frequently)

**Best Practice**: Don't rely on immediate sync. Show optimistic UI updates.

### Storage Quota

Monitor offline queue size:

```typescript
const mutations = await getQueuedMutations();

if (mutations.length > 100) {
  console.warn('Large sync queue - consider batch processing');
}

// Auto-cleanup old mutations (>7 days)
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
await db.offlineMutations
  .where('timestamp')
  .below(sevenDaysAgo)
  .delete();
```

---

## Common Issues

### Issue: Periodic sync not firing

**Cause**: Browser engagement score too low

**Solution**:
- Ensure user visits app regularly (weekly minimum)
- Verify `periodic-background-sync` permission is granted
- Check Chrome flags: `chrome://flags/#enable-experimental-web-platform-features`

### Issue: Sync tag registered but event not firing

**Cause**: Service worker not active

**Solution**:
```typescript
// Ensure SW is ready before registering sync
const registration = await navigator.serviceWorker.ready;
await registration.sync.register(tag);
```

### Issue: Mutations not syncing

**Cause**: Service worker missing event listener

**Solution**:
- Verify `self.addEventListener('sync', handler)` in SW
- Check SW console for errors
- Rebuild SW after changes

### Issue: Permission denied for periodic sync

**Cause**: Requires user interaction

**Solution**:
```typescript
// ❌ Bad: Called on page load
onMount(() => {
  registerPeriodicSync(tag, interval); // Will fail
});

// ✅ Good: Called from button click
<button on:click={enablePeriodicSync}>
  Enable Daily Updates
</button>
```

---

## Security Considerations

### Authentication

Background sync runs in service worker without user context:

```typescript
// Store auth token in IndexedDB for SW access
await db.syncMeta.put({
  key: 'auth-token',
  value: authToken,
  lastUpdated: Date.now(),
});

// In service worker
const token = await getAuthToken(db);
await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Data Validation

Validate mutations before queuing:

```typescript
async function queueMutation(type, entity, data) {
  // Validate schema
  if (!validateSchema(entity, data)) {
    throw new Error('Invalid mutation data');
  }

  // Sanitize user input
  const sanitized = sanitizeData(data);

  // Queue sanitized mutation
  await db.offlineMutations.add({ type, entity, data: sanitized, ... });
}
```

---

## Next Steps

1. **Monitor Sync Success Rate**: Track sync failures in analytics
2. **Optimize Batch Sizes**: Adjust based on typical queue sizes
3. **Add Conflict Resolution UI**: Let users resolve merge conflicts
4. **Implement Delta Sync**: Only sync changed fields, not full records
5. **Add Sync Progress UI**: Show real-time sync progress

---

## Resources

- [Background Sync API Spec](https://wicg.github.io/background-sync/spec/)
- [Periodic Background Sync Explainer](https://github.com/WICG/periodic-background-sync)
- [Chrome Platform Status](https://chromestatus.com/feature/6170807885627392)
- [Web.dev Article](https://web.dev/periodic-background-sync/)

---

**Status**: Production Ready ✅
**Browser Coverage**: 75%+ (Chrome, Edge, Opera)
**Performance Impact**: Minimal (sync occurs in background)
