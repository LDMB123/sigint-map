# DMB Almanac Services

This directory contains business logic services for the DMB Almanac application.

## Offline Mutation Queue Service

The offline mutation queue service provides robust offline-first mutation handling with automatic retry logic and Background Sync API support.

### Overview

When users make mutations (POST, PUT, PATCH, DELETE requests) while offline, the service:

1. **Queues** the mutation to IndexedDB automatically
2. **Monitors** online status via `navigator.onLine` and 'online' event listeners
3. **Processes** queued mutations when back online
4. **Retries** failed mutations with exponential backoff (max 3 retries)
5. **Cleans up** completed mutations to keep IndexedDB lean

### Features

- **Offline-First**: Mutations work seamlessly offline
- **Automatic Detection**: Uses navigator.onLine + 'online' event + visibility change events
- **Smart Retry**: Exponential backoff with jitter to prevent thundering herd
- **Background Sync**: Optional registration with Browser Background Sync API
- **Type-Safe**: Full TypeScript support with strict types
- **SSR Compatible**: Guards against non-browser environments
- **Non-Blocking**: Queue processing runs in background, doesn't block UI

### Retry Logic

When a mutation fails to send:

1. **First retry**: ~1000ms + jitter
2. **Second retry**: ~2000ms + jitter
3. **Third retry**: ~4000ms + jitter
4. **After 3 retries**: Marked as failed, requires manual intervention

Non-retryable errors (4xx HTTP status codes, except 429) immediately fail without retry.

### Usage

#### Initialize Service

```typescript
// In +layout.svelte or main.ts, during app initialization
import { initializeQueue, cleanupQueue } from '$lib/services/offlineMutationQueue';

onMount(() => {
  initializeQueue();

  return () => {
    cleanupQueue();
  };
});
```

#### Queue a Mutation

```typescript
import { queueMutation, processQueue } from '$lib/services/offlineMutationQueue';

// Add a mutation to the queue
const id = await queueMutation(
  'https://api.example.com/favorites',
  'POST',
  JSON.stringify({ songId: 123 })
);

console.log(`Queued mutation with ID: ${id}`);
```

#### Process Queue Manually

```typescript
const result = await processQueue();
console.log(`Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`);
```

#### Get Queue Status

```typescript
import { getQueuedMutations, getQueueStats } from '$lib/services/offlineMutationQueue';

// Get all queued mutations
const mutations = await getQueuedMutations();
console.log(`Total queued: ${mutations.length}`);

// Get statistics
const stats = await getQueueStats();
console.log(`Pending: ${stats.pending}, Retrying: ${stats.retrying}, Failed: ${stats.failed}`);
```

#### Get Failed Mutations

```typescript
import { getMutationsByStatus } from '$lib/services/offlineMutationQueue';

const failed = await getMutationsByStatus('failed');
failed.forEach((m) => {
  console.log(`Failed mutation: ${m.method} ${m.url} - ${m.lastError}`);
});
```

#### Clean Up Completed

```typescript
import { clearCompletedMutations } from '$lib/services/offlineMutationQueue';

const deleted = await clearCompletedMutations();
console.log(`Cleaned up ${deleted} completed mutations`);
```

#### Background Sync Registration

```typescript
import { registerBackgroundSync, getBackgroundSyncTag } from '$lib/services/offlineMutationQueue';

try {
  await registerBackgroundSync();
  console.log('Background sync enabled');
} catch (error) {
  console.warn('Background sync unavailable:', error);
}
```

### Service Worker Integration

For full Background Sync support, your service worker should handle the sync event:

```typescript
// sw.ts or service-worker.js
self.addEventListener('sync', (event) => {
  const tag = 'dmb-offline-mutation-queue';

  if (event.tag === tag) {
    event.waitUntil(
      fetch('/__queue/process', { method: 'POST' })
        .then(() => console.log('Queue processed in background sync'))
        .catch((error) => {
          console.error('Background sync processing failed:', error);
          // Service worker will retry automatically
          throw error;
        })
    );
  }
});
```

Or create an endpoint in your SvelteKit app to process the queue:

```typescript
// src/routes/__queue/process/+server.ts
import { processQueue } from '$lib/services/offlineMutationQueue';
import { json } from '@sveltejs/kit';

export async function POST() {
  try {
    const result = await processQueue();
    return json(result);
  } catch (error) {
    console.error('Error processing queue:', error);
    throw error; // Service worker will retry
  }
}
```

### Data Structure

Mutations are stored in IndexedDB with this schema:

```typescript
interface OfflineMutationQueueItem {
  id?: number;              // Auto-incremented primary key
  url: string;              // Full API endpoint URL
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: string;             // Request body as JSON string
  status: "pending" | "retrying" | "failed" | "completed";
  retries: number;          // Current retry count (0-3)
  createdAt: number;        // Unix timestamp when queued
  lastError?: string;       // Last error message
  nextRetry?: number;       // Unix timestamp of next retry attempt
}
```

### Configuration

To customize retry behavior, edit these constants in `offlineMutationQueue.ts`:

```typescript
const MAX_RETRIES = 3;           // Maximum retry attempts
const BACKOFF_BASE_MS = 1000;    // Base delay in milliseconds
const BACKOFF_MULTIPLIER = 2;    // Exponential multiplier
const BACKOFF_JITTER_MS = 500;   // Maximum jitter
const FETCH_TIMEOUT_MS = 30000;  // Request timeout
```

### Events and Logging

The service logs to console with `[OfflineMutationQueue]` prefix:

- Queue initialization and cleanup
- Mutations added to queue
- Online/offline status changes
- Retry scheduling
- Processing results (succeeded/failed)
- Errors and edge cases

### Error Handling

The service handles:

1. **Network errors**: Retried with backoff
2. **Timeout errors**: Retried with backoff
3. **4xx HTTP errors** (except 429): Immediately failed
4. **5xx HTTP errors**: Retried with backoff
5. **Max retries exceeded**: Moved to failed status

### Performance Characteristics

- **Queue operations**: O(1) - uses IndexedDB indexes
- **Processing**: O(n) - linear in number of queued mutations
- **Memory**: Minimal - all data in IndexedDB
- **Network**: Respects backoff delays to avoid overwhelming server

### Browser Support

- **Chrome/Chromium**: 70+ (full support including Background Sync)
- **Firefox**: 55+ (offline queue, no Background Sync)
- **Safari**: 11+ (offline queue, no Background Sync)
- **Edge**: 15+ (full support)

Background Sync API requires:
- Chrome/Chromium 49+
- Edge 15+
- Firefox 54+ (behind flag)
- Safari: Not supported

### Debugging

Enable verbose logging by setting a flag in DevTools console:

```javascript
// Show all queue operations
window.__dmb_queue_debug = true;
```

View queue contents:

```javascript
// In browser console
const { getQueuedMutations, getQueueStats } = await import('/src/lib/services/offlineMutationQueue.ts');
const mutations = await getQueuedMutations();
const stats = await getQueueStats();
console.log({ mutations, stats });
```

### Common Patterns

#### Add Favorite Song (Optimistic Update)

```typescript
// Assume Svelte store: let favorites = $state(new Set());

async function addFavorite(songId: number) {
  // Optimistic update
  favorites.add(songId);

  try {
    const id = await queueMutation(
      `https://api.example.com/favorites/${songId}`,
      'POST',
      JSON.stringify({ songId })
    );
    console.log(`Added to queue: ${id}`);
  } catch (error) {
    // Revert on error
    favorites.delete(songId);
    console.error('Failed to queue favorite:', error);
  }
}
```

#### Remove Favorite (Optimistic Update)

```typescript
async function removeFavorite(songId: number) {
  // Optimistic update
  favorites.delete(songId);

  try {
    const id = await queueMutation(
      `https://api.example.com/favorites/${songId}`,
      'DELETE',
      JSON.stringify({ songId })
    );
    console.log(`Deletion queued: ${id}`);
  } catch (error) {
    // Revert on error
    favorites.add(songId);
    console.error('Failed to queue deletion:', error);
  }
}
```

#### Monitor Queue Status

```typescript
import { getQueueStats } from '$lib/services/offlineMutationQueue';

let queueStats = $state(null);

$effect.pre(async () => {
  // Poll queue stats every 5 seconds
  const interval = setInterval(async () => {
    queueStats = await getQueueStats();
  }, 5000);

  return () => clearInterval(interval);
});
```

### Testing

```typescript
import { queueMutation, processQueue, getQueueStats } from '$lib/services/offlineMutationQueue';

// Test offline queueing
vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
await queueMutation('/api/test', 'POST', JSON.stringify({ test: true }));

let stats = await getQueueStats();
expect(stats.pending).toBe(1);

// Test processing when online
vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
const result = await processQueue();
expect(result.succeeded).toBeGreaterThan(0);
```

### Limitations

1. **Browser Storage**: IndexedDB has storage quotas (typically 50% of available disk)
2. **No Server Sync**: Queue is client-only; server conflicts must be resolved by API
3. **No Deduplication**: Duplicate mutations in queue will both be sent
4. **No Scheduling**: Mutations process FIFO in order queued
5. **Mobile Background**: Background Sync may not work when app is fully closed on some platforms

### Future Enhancements

- [ ] Request deduplication (prevent duplicate mutations for same resource)
- [ ] Conflict resolution strategies
- [ ] Priority levels for mutations
- [ ] Analytics/metrics on mutation success rates
- [ ] UI component for queue status display
- [ ] Batch mutation support
