# Telemetry Queue System

## Overview

The telemetry queue system provides reliable delivery of performance metrics (RUM - Real User Monitoring) with automatic retry, exponential backoff, and Background Sync API integration.

## Features

1. **Automatic Queuing**: Failed telemetry submissions are automatically queued to IndexedDB
2. **Exponential Backoff**: Retries use exponential backoff (1s, 2s, 4s) with jitter to prevent thundering herd
3. **Structured Error Logging**: All failures are logged with error codes for debugging
4. **Background Sync**: Integrates with Background Sync API for offline resilience
5. **Max Retry Limit**: Prevents infinite retry loops (max 3 retries)
6. **Retry Tracking**: Each telemetry entry tracks retry attempts and error history

## Architecture

```
RUM Manager (rum.ts)
    |
    v
Try Direct Send
    |
    +--[Success]---> Done
    |
    +--[Failure]---> Telemetry Queue Service (telemetryQueue.ts)
                          |
                          v
                    IndexedDB Storage
                          |
                          v
                    Background Processing:
                    - Online event triggers
                    - Background Sync API
                    - Manual processQueue()
                    - Scheduled retry timers
```

## Usage

### Initialization

The telemetry queue is automatically initialized when RUM tracking starts:

```typescript
import { initRUM } from '$lib/utils/rum';
import { initializeTelemetryQueue } from '$lib/services/telemetryQueue';

// Initialize telemetry queue first
initializeTelemetryQueue();

// Then initialize RUM tracking
initRUM({
  batchInterval: 10000,
  maxBatchSize: 10,
  endpoint: '/api/telemetry/performance'
});
```

### Automatic Queueing

When a telemetry submission fails, it's automatically queued:

```typescript
// RUM manager automatically handles failures
// No manual intervention needed

// Behind the scenes:
// 1. Fetch fails or times out
// 2. Payload is queued to IndexedDB
// 3. Background processing picks it up when online
```

### Manual Queue Processing

You can manually trigger queue processing:

```typescript
import { processQueue, getQueueStats } from '$lib/services/telemetryQueue';

// Process all pending entries
const result = await processQueue();
console.log(`Processed: ${result.succeeded}, Failed: ${result.failed}, Retrying: ${result.retrying}`);

// Get queue statistics
const stats = await getQueueStats();
console.log(`Pending: ${stats.pending}, Retrying: ${stats.retrying}`);
```

### Background Sync Integration

Register for Background Sync API (Chrome 93+):

```typescript
import { registerBackgroundSync } from '$lib/services/telemetryQueue';

// Register on service worker ready
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(() => {
    registerBackgroundSync().catch(console.error);
  });
}
```

The service worker will automatically process the queue when:
- The browser comes back online
- The Background Sync API fires
- The app becomes visible again

## Error Codes

The system uses structured error codes for debugging:

- `TELEMETRY_NETWORK_TIMEOUT`: Request timed out
- `TELEMETRY_NETWORK_OFFLINE`: Browser is offline
- `TELEMETRY_SERVER_ERROR`: 5xx server error
- `TELEMETRY_CLIENT_ERROR`: 4xx client error (non-retryable except 429)
- `TELEMETRY_VALIDATION_ERROR`: Invalid payload (non-retryable)
- `TELEMETRY_STORAGE_FULL`: IndexedDB quota exceeded
- `TELEMETRY_UNKNOWN_ERROR`: Unknown error

## Configuration

Key configuration constants in `telemetryQueue.ts`:

```typescript
const MAX_RETRIES = 3;                 // Maximum retry attempts
const BACKOFF_BASE_MS = 1000;         // Base delay for exponential backoff
const BACKOFF_MULTIPLIER = 2;         // Exponential multiplier
const BACKOFF_JITTER_MS = 500;        // Random jitter to prevent thundering herd
const MAX_QUEUE_SIZE = 500;           // Maximum entries in queue
const MAX_PARALLEL_REQUESTS = 2;      // Maximum parallel telemetry requests
const FETCH_TIMEOUT_MS = 10000;       // Timeout for individual requests
```

## IndexedDB Schema

The `telemetryQueue` table stores queued entries:

```typescript
interface TelemetryQueueItem {
  id?: number;                          // Auto-increment
  payload: PerformanceTelemetry;        // The telemetry payload
  endpoint: string;                     // API endpoint
  status: 'pending' | 'retrying' | 'completed' | 'failed';
  retries: number;                      // Current retry count
  createdAt: number;                    // Creation timestamp
  lastError?: string;                   // Last error message
  lastErrorCode?: string;               // Last error code
  nextRetry?: number;                   // Timestamp for next retry
}
```

Indexes:
- `++id`: Primary key (auto-increment)
- `status`: For filtering by status
- `createdAt`: For FIFO ordering
- `nextRetry`: For scheduling retries
- `[status+createdAt]`: Compound index for efficient FIFO queries

## Queue Management

### Get Queue Statistics

```typescript
const stats = await getQueueStats();
// {
//   total: 10,
//   pending: 5,
//   retrying: 3,
//   failed: 1,
//   completed: 1,
//   oldestEntry: {...}
// }
```

### Clear Completed Entries

```typescript
const deleted = await clearCompletedTelemetry();
console.log(`Cleared ${deleted} completed entries`);
```

### Delete Specific Entry

```typescript
await deleteTelemetryEntry(123);
```

### Get Entries by Status

```typescript
const pending = await getTelemetryByStatus('pending');
const failed = await getTelemetryByStatus('failed');
```

## Service Worker Integration

The service worker handles Background Sync events:

```javascript
// static/sw.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'dmb-telemetry-queue') {
    event.waitUntil(processTelemetryQueue());
  }
});
```

The `processTelemetryQueue()` function:
1. Opens IndexedDB
2. Gets all pending/retrying entries
3. Attempts to send each entry
4. Updates status based on response
5. Applies exponential backoff for retries
6. Marks as failed after max retries

## Monitoring and Debugging

### Enable Debug Logging

All telemetry queue operations are logged via the `errorLogger`:

```typescript
import { errorLogger } from '$lib/errors/logger';

// Logs are automatically created at appropriate levels:
// - debug: Queue processing details
// - info: Successful operations
// - warn: Retryable failures
// - error: Non-retryable failures
```

### View Queue in DevTools

Use the Application tab in Chrome DevTools:
1. Open DevTools → Application
2. IndexedDB → dmb-almanac → telemetryQueue
3. View all queued entries with status and retry info

### Test Offline Behavior

```typescript
// Simulate offline
window.dispatchEvent(new Event('offline'));

// RUM will queue metrics automatically

// Simulate back online
window.dispatchEvent(new Event('online'));

// Queue will process automatically
```

## Performance Considerations

1. **Queue Size Limit**: Max 500 entries prevents unbounded growth
2. **Parallel Requests**: Max 2 parallel requests prevents overwhelming the server
3. **Batch Processing**: Processes entries in batches for efficiency
4. **Indexed Queries**: Compound index `[status+createdAt]` enables efficient FIFO queries
5. **Memory Efficiency**: Only active entries are kept in memory during processing

## Best Practices

1. **Initialize Early**: Call `initializeTelemetryQueue()` in your root layout
2. **Monitor Queue Size**: Clear completed entries periodically
3. **Handle Storage Quota**: Implement quota monitoring and cleanup
4. **Test Offline Scenarios**: Verify retry logic works when offline
5. **Monitor Failed Entries**: Alert on high failure rates

## Troubleshooting

### Queue Not Processing

1. Check if service worker is registered
2. Verify Background Sync API is supported
3. Check browser console for errors
4. Verify online/offline event listeners are registered

### High Retry Rate

1. Check server logs for 4xx/5xx errors
2. Verify endpoint is correct
3. Check CSRF token is present
4. Review error codes in failed entries

### Queue Growing Too Large

1. Check `clearCompletedTelemetry()` is called periodically
2. Verify max queue size enforcement
3. Check for non-retryable errors being retried
4. Monitor storage quota

## Example: Complete Integration

```typescript
// src/routes/+layout.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { initRUM } from '$lib/utils/rum';
  import { initializeTelemetryQueue, registerBackgroundSync } from '$lib/services/telemetryQueue';

  onMount(() => {
    // Initialize telemetry queue
    initializeTelemetryQueue();

    // Initialize RUM tracking
    initRUM({
      batchInterval: 10000,
      maxBatchSize: 10,
      endpoint: '/api/telemetry/performance',
      enableLogging: true
    });

    // Register Background Sync
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        registerBackgroundSync().catch(console.error);
      });
    }

    // Cleanup on unmount
    return () => {
      const { cleanupTelemetryQueue } = await import('$lib/services/telemetryQueue');
      cleanupTelemetryQueue();
    };
  });
</script>
```

## Testing

Test the telemetry queue with:

```bash
# Start dev server
npm run dev

# Open browser console
# Simulate network failure
fetch('/api/telemetry/performance', { method: 'POST' }).catch(() => {})

# Check queue
import { getQueueStats } from '$lib/services/telemetryQueue';
const stats = await getQueueStats();
console.log(stats);

# Process queue manually
import { processQueue } from '$lib/services/telemetryQueue';
const result = await processQueue();
console.log(result);
```
