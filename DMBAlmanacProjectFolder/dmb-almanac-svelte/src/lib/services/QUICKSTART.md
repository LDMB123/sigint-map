# Offline Mutation Queue - Quick Start Guide

Get the offline mutation queue working in 5 minutes.

## Installation (Already Done)

The service is implemented and ready to use:

```
src/lib/services/
├── offlineMutationQueue.ts       # Main service
├── index.ts                      # Exports
└── README.md                     # Full documentation
```

## 1. Initialize Service (5 seconds)

Add to your root layout (`src/routes/+layout.svelte`):

```svelte
<script>
  import { onMount } from 'svelte';
  import { initializeQueue, cleanupQueue } from '$lib/services';

  onMount(() => {
    initializeQueue();
    return () => cleanupQueue();
  });
</script>
```

## 2. Queue Mutations (30 seconds)

Use in any component:

```svelte
<script>
  import { queueMutation } from '$lib/services';

  async function addFavorite(songId) {
    try {
      const id = await queueMutation(
        'https://api.example.com/favorites',
        'POST',
        JSON.stringify({ songId })
      );
      console.log(`Queued mutation: ${id}`);
    } catch (error) {
      console.error('Failed to queue:', error);
    }
  }
</script>

<button on:click={() => addFavorite(123)}>
  Add to Favorites
</button>
```

## 3. Monitor Queue (1 minute)

```svelte
<script>
  import { getQueueStats } from '$lib/services';

  let stats = $state(null);

  $effect.pre(() => {
    const interval = setInterval(async () => {
      stats = await getQueueStats();
    }, 5000);
    return () => clearInterval(interval);
  });
</script>

{#if stats}
  <div>Pending: {stats.pending}</div>
  <div>Failed: {stats.failed}</div>
  <div>Retrying: {stats.retrying}</div>
{/if}
```

## 4. Background Sync (Optional - 2 minutes)

### Add to Service Worker

Create or update `src/service-worker.ts`:

```typescript
// Service Worker Background Sync Handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'dmb-offline-mutation-queue') {
    event.waitUntil(
      fetch('/__queue/process', { method: 'POST' })
        .catch(error => { throw error; })
    );
  }
});
```

### Create Server Route

Create `src/routes/__queue/process/+server.ts`:

```typescript
import { processQueue } from '$lib/services/offlineMutationQueue';
import { json } from '@sveltejs/kit';

export async function POST() {
  try {
    const result = await processQueue();
    return json(result);
  } catch (error) {
    throw error;
  }
}
```

### Register from App

```typescript
import { registerBackgroundSync } from '$lib/services';

// Call once when app initializes
registerBackgroundSync().catch(error => {
  console.warn('Background sync not available:', error);
});
```

## API Reference

### Core Functions

```typescript
// Initialize service (call once on app load)
initializeQueue(): void

// Cleanup service (call on unmount)
cleanupQueue(): void

// Queue a mutation
queueMutation(url, method, body): Promise<number>

// Process all pending mutations
processQueue(options?): Promise<ProcessQueueResult>

// Get all queued mutations
getQueuedMutations(): Promise<OfflineMutationQueueItem[]>

// Get statistics
getQueueStats(): Promise<{
  total: number;
  pending: number;
  retrying: number;
  failed: number;
  completed: number;
  oldestMutation: OfflineMutationQueueItem | null;
}>

// Get mutations by status
getMutationsByStatus(status): Promise<OfflineMutationQueueItem[]>

// Clear completed mutations
clearCompletedMutations(): Promise<number>

// Delete specific mutation
deleteMutation(id): Promise<void>

// Register Background Sync
registerBackgroundSync(): Promise<void>
```

## Common Patterns

### Optimistic Updates

```typescript
async function toggleFavorite(songId) {
  // Update immediately for better UX
  favorites.add(songId);

  try {
    await queueMutation(
      `/api/favorites/${songId}`,
      'POST',
      JSON.stringify({ songId })
    );
  } catch (error) {
    // Revert if queueing fails
    favorites.delete(songId);
  }
}
```

### Handle Failed Mutations

```typescript
async function showFailedMutations() {
  const failed = await getMutationsByStatus('failed');
  if (failed.length > 0) {
    console.log('Failed mutations:');
    failed.forEach(m => {
      console.log(`${m.method} ${m.url}: ${m.lastError}`);
    });
  }
}
```

### Auto-Retry Monitoring

```typescript
$effect.pre(() => {
  const interval = setInterval(async () => {
    const stats = await getQueueStats();

    if (stats.failed > 0) {
      console.warn(`${stats.failed} mutations failed`);
    }

    if (stats.retrying > 0 && navigator.onLine) {
      console.log('Processing queue...');
      await processQueue();
    }
  }, 10000);

  return () => clearInterval(interval);
});
```

## Testing

### Simulate Offline

```javascript
// In browser console
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: false
});

// Make mutations
// Switch online
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});
window.dispatchEvent(new Event('online'));
```

### Check Queue

```javascript
// In browser console
import { getQueuedMutations, getQueueStats } from '/src/lib/services';
const mutations = await getQueuedMutations();
const stats = await getQueueStats();
console.log({ mutations, stats });
```

## Files Reference

| File | Purpose |
|------|---------|
| `offlineMutationQueue.ts` | Main service implementation |
| `offlineMutationQueue.test.ts` | Test suite |
| `offlineMutationQueue.example.svelte` | Usage example |
| `sw-integration.example.ts` | Background Sync guide |
| `index.ts` | Main exports |
| `README.md` | Full documentation |

## Troubleshooting

### Queue not processing when online

1. Check online status: `console.log(navigator.onLine)`
2. Verify initializeQueue() was called
3. Check browser console for errors
4. Manually trigger: `processQueue()`

### Service Worker sync not working

1. Check SW is registered: DevTools > Application > Service Workers
2. Verify Background Sync API support (Chrome only)
3. Check service worker console logs
4. Manually trigger: DevTools > Service Workers > Replay sync

### Mutations marked as failed

- Check error message: `mutation.lastError`
- Review HTTP status code
- Verify API endpoint is correct
- Check authentication/CSRF tokens

## Configuration

To customize retry behavior, edit constants in `offlineMutationQueue.ts`:

```typescript
const MAX_RETRIES = 3;           // Maximum retry attempts
const BACKOFF_BASE_MS = 1000;    // Base delay in ms
const BACKOFF_MULTIPLIER = 2;    // Exponential multiplier
const BACKOFF_JITTER_MS = 500;   // Random jitter in ms
const FETCH_TIMEOUT_MS = 30000;  // Request timeout in ms
```

## Next Steps

1. Initialize service in root layout
2. Add mutations to your app
3. Test offline functionality
4. (Optional) Setup Background Sync with service worker
5. Monitor queue statistics
6. Clean up completed mutations periodically

## Resources

- **Full Documentation**: `README.md`
- **Examples**: `offlineMutationQueue.example.svelte`
- **Integration Guide**: `sw-integration.example.ts`
- **Tests**: `offlineMutationQueue.test.ts`
- **Implementation Details**: `OFFLINE_QUEUE_IMPLEMENTATION.md`

## Support

For detailed documentation, see:
- `src/lib/services/README.md` - Full reference
- `OFFLINE_QUEUE_IMPLEMENTATION.md` - Architecture details
- `offlineMutationQueue.example.svelte` - Real-world example
- `sw-integration.example.ts` - Background Sync setup

## Performance Targets

| Metric | Target |
|--------|--------|
| Queue mutation | < 10ms |
| Get stats | < 5ms |
| Process 100 mutations | < 10s |
| Backoff delay | 1-4s + jitter |
| Fetch timeout | 30s |

Done! Your offline mutation queue is ready to use.
