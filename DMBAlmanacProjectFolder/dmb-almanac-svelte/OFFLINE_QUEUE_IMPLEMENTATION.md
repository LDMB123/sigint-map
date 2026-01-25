# Offline Mutation Queue Implementation

## Overview

A production-grade offline mutation queue service has been implemented for the DMB Almanac PWA. This service provides seamless offline-first mutation handling with automatic retry logic and Background Sync API support.

## Files Created

### Core Service

**Location**: `/src/lib/services/offlineMutationQueue.ts`

Main service file providing:
- Mutation queueing with automatic status tracking
- Queue processing with exponential backoff retry (max 3 retries)
- Online/offline state detection and monitoring
- Background Sync API integration
- SSR-safe implementation (guards against non-browser environments)
- Full TypeScript typing with strict mode support

**Key Functions**:
- `initializeQueue()` - Initialize service and event listeners
- `cleanupQueue()` - Cleanup and remove event listeners
- `queueMutation(url, method, body)` - Add mutation to queue
- `processQueue(options)` - Process all pending mutations
- `getQueuedMutations()` - Get all queued mutations
- `getMutationsByStatus(status)` - Filter mutations by status
- `getQueueStats()` - Get queue statistics
- `clearCompletedMutations()` - Cleanup completed mutations
- `registerBackgroundSync()` - Register with Background Sync API
- `getBackgroundSyncTag()` - Get sync tag for coordination

**Export**: `/src/lib/services/index.ts` - Main export point for convenient importing

### Documentation

**Location**: `/src/lib/services/README.md`

Comprehensive documentation covering:
- Feature overview and usage patterns
- Retry logic explanation
- API reference with examples
- Data structure specifications
- Configuration options
- Browser support matrix
- Performance characteristics
- Debugging guide
- Common patterns (optimistic updates, monitoring)
- Testing examples
- Limitations and future enhancements

### Examples and Integration

**Example Component**: `/src/lib/services/offlineMutationQueue.example.svelte`

Complete working example showing:
- Service initialization in component lifecycle
- Optimistic updates pattern
- Queue statistics monitoring
- Failed mutation inspection
- Real-world favorite songs feature
- Error and success messaging
- Offline status indicator

**Service Worker Integration**: `/src/lib/services/sw-integration.example.ts`

Complete guide for Background Sync integration including:
- Service worker sync event handler
- SvelteKit server routes for queue processing
- Status monitoring endpoint
- Client initialization code
- Advanced custom processing patterns
- Testing strategies
- Troubleshooting guide

### Tests

**Location**: `/src/lib/services/offlineMutationQueue.test.ts`

Comprehensive test suite covering:
- Service initialization and cleanup
- Mutation queueing operations
- Queue queries and filtering
- Deletion operations
- Queue processing (online/offline scenarios)
- Retry logic and exponential backoff
- Error handling (network, HTTP, timeouts)
- HTTP status code handling (4xx vs 5xx)
- Background Sync functionality
- Edge cases (large bodies, special characters, concurrent ops)
- Full lifecycle integration tests

## Architecture

### State Management

The service maintains internal state for:
- **isProcessing**: Flag to prevent concurrent processing
- **isOnline**: Current online status
- **nextRetryTimeout**: Scheduled next retry attempt
- **listeners**: Event listener cleanup functions

All persistence is handled through IndexedDB using Dexie.js.

### Data Storage

Mutations stored in `offlineMutationQueue` table:

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
  nextRetry?: number;       // Unix timestamp of next retry
}
```

**Indexes**: `++id, status, createdAt, nextRetry`

### Event Detection

The service monitors online status through multiple mechanisms:

1. **navigator.onLine** - Initial status
2. **'online' event** - Browser-fired when connectivity restored
3. **'offline' event** - Browser-fired when connectivity lost
4. **'visibilitychange' event** - Detects app returning to foreground with restored connectivity

### Retry Logic

Failed mutations follow exponential backoff with jitter:

- **First retry**: 1000ms + jitter
- **Second retry**: 2000ms + jitter
- **Third retry**: 4000ms + jitter
- **After 3 failures**: Marked as failed

Non-retryable errors (4xx status codes except 429) immediately fail.

Jitter (random 0-500ms) prevents thundering herd when multiple clients come online.

### Background Sync

When available, the service registers with the Background Sync API:

```typescript
await registerBackgroundSync(); // Uses tag "dmb-offline-mutation-queue"
```

The service worker then handles the sync event:

```typescript
self.addEventListener('sync', (event) => {
  if (event.tag === 'dmb-offline-mutation-queue') {
    event.waitUntil(processQueue()); // Process queue in background
  }
});
```

This allows the browser/OS to process queued mutations even when the app is closed.

## Integration Guide

### Step 1: Initialize Service

In your root layout component (`src/routes/+layout.svelte`):

```svelte
<script>
  import { onMount } from 'svelte';
  import { initializeQueue, cleanupQueue } from '$lib/services';

  onMount(() => {
    initializeQueue();

    return () => {
      cleanupQueue();
    };
  });
</script>
```

### Step 2: Use in Components

```svelte
<script>
  import { queueMutation, getQueueStats } from '$lib/services';

  async function addFavorite(songId) {
    // Optimistic update
    favorites.add(songId);

    try {
      const id = await queueMutation(
        `https://api.example.com/favorites`,
        'POST',
        JSON.stringify({ songId })
      );
      console.log(`Queued: ${id}`);
    } catch (error) {
      // Revert on error
      favorites.delete(songId);
      console.error('Failed to queue:', error);
    }
  }
</script>
```

### Step 3: Setup Background Sync (Optional)

In your service worker (`src/service-worker.ts`):

```typescript
self.addEventListener('sync', (event) => {
  if (event.tag === 'dmb-offline-mutation-queue') {
    event.waitUntil(
      fetch('/__queue/process', { method: 'POST' })
        .then(() => console.log('Queue processed'))
        .catch(error => { throw error; }) // Retry on error
    );
  }
});
```

Create a server route (`src/routes/__queue/process/+server.ts`):

```typescript
import { processQueue } from '$lib/services';
import { json } from '@sveltejs/kit';

export async function POST() {
  try {
    const result = await processQueue();
    return json(result);
  } catch (error) {
    throw error; // Service worker will retry
  }
}
```

## Key Features

### 1. Automatic Online Detection

- Monitors `navigator.onLine` property
- Listens to 'online'/'offline' events
- Detects visibility changes (app coming to foreground)
- Automatically processes queue when online

### 2. Exponential Backoff

- Prevents server overload after outages
- Configurable delays (1s, 2s, 4s base)
- Random jitter prevents thundering herd
- Maximum 3 retry attempts

### 3. Optimistic Updates

- Queue mutations while offline
- Update UI immediately
- Revert if mutation fails
- Better perceived performance

### 4. Status Tracking

- Pending: Queued, waiting to send
- Retrying: Failed, scheduled for retry
- Failed: Max retries exceeded
- Completed: Successfully sent

### 5. Background Sync

- Optional registration with Background Sync API
- Processes queue even when app closed
- Browser handles retry logic
- Gracefully degrades if unsupported

### 6. SSR Compatible

- Guards against non-browser environments
- Safe in SvelteKit server-side rendering
- Lazy initialization on client

### 7. Type Safe

- Full TypeScript support
- Strict mode compatible
- Comprehensive JSDoc documentation
- Self-documenting code

## Performance

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Queue mutation | O(1) | IndexedDB add operation |
| Process queue | O(n log n) | n = mutations, log n per fetch |
| Get stats | O(1) | Multiple O(1) index lookups |
| Get by status | O(log n) + k | Index lookup + return k results |
| Clear completed | O(k) | k = completed mutations |

### Storage

- Each mutation: ~500 bytes (url + body overhead)
- Example: 100 queued mutations = ~50KB
- IndexedDB quota: Typically 50% of available disk

### Network

- Fetch timeout: 30 seconds per request
- No timeout between retries (uses exponential backoff)
- Request includes standard headers (Content-Type)
- Supports all standard HTTP methods

## Browser Support

| Browser | Queue | Sync | Notes |
|---------|-------|------|-------|
| Chrome/Chromium 70+ | ✅ | ✅ | Full support |
| Edge 15+ | ✅ | ✅ | Full support |
| Firefox 55+ | ✅ | ❌ | Queue works, sync behind flag |
| Safari 11+ | ✅ | ❌ | Queue works, no sync API |

## Error Handling

### Retryable Errors

- Network timeouts
- 5xx HTTP errors (server errors)
- AbortErrors
- Generic network errors

### Non-Retryable Errors

- 4xx HTTP errors (except 429)
- 404 Not Found
- 401 Unauthorized
- 403 Forbidden

### Retry Strategy

1. Parse error type
2. Check if retryable
3. If retryable and retries < MAX_RETRIES:
   - Increment retry count
   - Calculate backoff delay
   - Schedule next retry
   - Update status to "retrying"
4. If not retryable or max retries exceeded:
   - Mark as "failed"
   - Store error message
   - Requires manual intervention

## Logging

All logging uses `[OfflineMutationQueue]` prefix for easy filtering:

```javascript
// View queue logs in console
console.log('Filter: [OfflineMutationQueue]');

// Or in production, filter by prefix
logs.filter(log => log.includes('[OfflineMutationQueue]'));
```

## Testing

Run tests with:

```bash
npm run test -- src/lib/services/offlineMutationQueue.test.ts
```

Test coverage includes:
- Initialization and cleanup
- Queueing operations
- Status queries
- Processing logic
- Retry behavior
- Error handling
- Edge cases
- Integration scenarios

## Configuration

Customize retry behavior by editing constants in `offlineMutationQueue.ts`:

```typescript
const MAX_RETRIES = 3;           // Maximum retry attempts
const BACKOFF_BASE_MS = 1000;    // Base delay (1s)
const BACKOFF_MULTIPLIER = 2;    // Exponential multiplier
const BACKOFF_JITTER_MS = 500;   // Maximum jitter
const FETCH_TIMEOUT_MS = 30000;  // Request timeout (30s)
```

## Future Enhancements

Potential improvements for future versions:

1. **Request Deduplication**: Prevent duplicate mutations for same resource
2. **Conflict Resolution**: Handle server-client data conflicts
3. **Priority Levels**: Process high-priority mutations first
4. **Batching**: Group related mutations for efficiency
5. **Analytics**: Track success rates and failure patterns
6. **UI Component**: Pre-built queue status display
7. **Metrics**: Instrument queue for performance monitoring
8. **Offline Indicators**: Built-in UI for offline state

## Files Summary

```
src/lib/services/
├── offlineMutationQueue.ts           # Main service (350+ lines)
├── offlineMutationQueue.test.ts      # Test suite (500+ lines)
├── offlineMutationQueue.example.svelte # Usage example (300+ lines)
├── sw-integration.example.ts         # SW integration guide (400+ lines)
├── index.ts                          # Main export
└── README.md                         # Full documentation
```

## Database Integration

The service integrates with the existing Dexie.js database:

```typescript
// Already defined in db.ts
offlineMutationQueue!: EntityTable<OfflineMutationQueueItem, "id">;

// Already defined in schema.ts
export interface OfflineMutationQueueItem {
  id?: number;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: string;
  status: "pending" | "retrying" | "failed" | "completed";
  retries: number;
  createdAt: number;
  lastError?: string;
  nextRetry?: number;
}

// Already in DEXIE_SCHEMA
offlineMutationQueue: "++id, status, createdAt, nextRetry"
```

## Security Considerations

1. **HTTPS Only**: Mutations should only work over HTTPS in production
2. **CSRF Protection**: Ensure API endpoints validate origin/CSRF tokens
3. **Authentication**: Include auth tokens in request headers
4. **Data Sanitization**: Validate/sanitize queued data before storing
5. **Storage Quota**: Monitor IndexedDB quota to prevent quota exceeded errors

## Troubleshooting

### Queue not processing

1. Check online status: `console.log(navigator.onLine)`
2. Verify event listeners: Search for `[OfflineMutationQueue]` in console
3. Check IndexedDB: DevTools > Application > Storage > IndexedDB > dmb-almanac

### Mutations stuck in retrying

1. Check network connectivity
2. Verify API endpoint is correct
3. Check API response codes (4xx = permanent failure)
4. Review error messages in mutation details

### Service Worker not syncing

1. Verify SW is active: DevTools > Application > Service Workers
2. Check Background Sync API support
3. Register sync: `await registerBackgroundSync()`
4. Manually trigger (Chrome): DevTools > Application > Service Workers > Replay sync

## Example Usage Flow

```typescript
// 1. Initialize on app load
onMount(() => {
  initializeQueue();
  registerBackgroundSync();
});

// 2. User adds favorite (offline)
async function addFavorite(songId) {
  favorites.add(songId); // Optimistic
  const id = await queueMutation(
    '/api/favorites',
    'POST',
    JSON.stringify({ songId })
  );
}

// 3. Queue stores mutation while offline
// Mutation: { id: 1, url: '/api/favorites', method: 'POST', status: 'pending', retries: 0, ... }

// 4. User comes online
// Service detects online, processes queue

// 5. API receives request, responds 200
// Mutation marked completed

// 6. Cleanup removes completed mutations
await clearCompletedMutations();
```

## Statistics

- **Total lines of code**: ~1,500
- **Documentation lines**: ~1,000
- **Test cases**: 40+
- **Exported functions**: 12
- **TypeScript interfaces**: 3
- **Configuration constants**: 5

## Maintenance

### Regular Tasks

1. Monitor queue processing success rates
2. Review failed mutations periodically
3. Check for storage quota issues
4. Update retry logic based on patterns
5. Clean up completed mutations regularly

### Monitoring Queries

```typescript
// Check queue health
const stats = await getQueueStats();
console.log(`Queue health: ${stats.pending} pending, ${stats.failed} failed`);

// Find problematic mutations
const failed = await getMutationsByStatus('failed');
failed.forEach(m => console.log(`Failed: ${m.url} - ${m.lastError}`));

// Monitor retry progress
const retrying = await getMutationsByStatus('retrying');
console.log(`${retrying.length} mutations scheduled for retry`);
```

## References

- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API)
- [IndexedDB/Dexie.js](https://dexie.org/)
- [Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [SvelteKit](https://kit.svelte.dev/)
