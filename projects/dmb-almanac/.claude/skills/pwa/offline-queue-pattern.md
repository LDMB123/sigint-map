# Skill: Offline Request Queue Pattern

**ID**: `offline-queue-pattern`
**Category**: PWA / Offline
**Agent**: PWA Specialist

---

## When to Use

- Implementing offline request queuing
- Building Background Sync with IndexedDB
- Queueing form submissions while offline
- Implementing optimistic UI updates with sync tracking
- Creating offline-first applications with sync strategies
- Managing queued actions with retry logic
- Tracking sync status for UI feedback

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |
| queue_type | enum | No | `form-submission`, `api-requests`, `analytics`, `user-actions` |
| db_library | enum | No | `indexeddb`, `dexie`, `localStorage` (default: dexie) |
| sync_strategy | enum | No | `background-sync`, `manual`, `periodic` |
| retry_policy | object | No | Max retries, backoff strategy |

---

## Steps

### Step 1: Design Offline Queue Architecture

**Components:**

```
┌─────────────────────────────────────┐
│   User Action (Form Submit)         │
│   └─> Optimistic UI Update          │
│   └─> Queue in IndexedDB            │
│   └─> Return success to user        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Background Sync (Service Worker)  │
│   └─> Process queue items           │
│   └─> Retry on failure              │
│   └─> Update UI status              │
│   └─> Remove on success             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Server API                        │
│   └─> Persist data                  │
│   └─> Return confirmation           │
└─────────────────────────────────────┘
```

**Queue Entry Structure:**

```typescript
interface QueueEntry {
  id: string;                  // Unique ID for deduplication
  timestamp: number;           // When queued
  url: string;                 // Endpoint
  method: string;              // GET, POST, PUT, DELETE
  body?: unknown;              // Request body
  headers?: Record<string, string>; // Custom headers
  retryCount: number;          // Current retry count
  maxRetries: number;          // Max attempts
  status: 'pending' | 'retrying' | 'failed';
  lastError?: string;          // Error message
  lastAttempt?: number;        // Last attempt timestamp
  backoffMs?: number;          // Next retry delay
}
```

### Step 2: Setup IndexedDB Schema with Dexie

**Install Dexie.js:**

```bash
npm install dexie
```

**Define Database Schema:**

```typescript
// src/lib/db/sync-db.ts
import Dexie, { Table } from 'dexie';

export interface QueueEntry {
  id?: number;
  uuid: string;
  timestamp: number;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'retrying' | 'failed';
  lastError?: string;
  lastAttempt?: number;
  backoffMs: number;
}

export interface SyncStatus {
  id?: number;
  uuid: string;
  itemId: string;
  localId: string;       // ID returned to UI for optimistic update
  serverId?: string;     // ID assigned by server after sync
  status: 'pending' | 'syncing' | 'synced' | 'error';
  syncedAt?: number;
  error?: string;
}

export class SyncDatabase extends Dexie {
  queue!: Table<QueueEntry>;
  syncStatus!: Table<SyncStatus>;

  constructor() {
    super('offline-sync-db');
    this.version(1).stores({
      queue: '++id, uuid, timestamp, status',
      syncStatus: '++id, uuid, itemId, status'
    });
  }
}

export const db = new SyncDatabase();
```

### Step 3: Implement Offline Queue in Store

**SvelteKit Example:**

```typescript
// src/lib/stores/offline-queue.ts
import { writable, derived } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { db, type QueueEntry } from '$lib/db/sync-db';

// ========== STATE ==========
interface OfflineQueueState {
  items: QueueEntry[];
  isSyncing: boolean;
  syncProgress: number;
  lastSyncTime?: number;
  error?: string;
}

const initialState: OfflineQueueState = {
  items: [],
  isSyncing: false,
  syncProgress: 0
};

export const offlineQueueStore = writable<OfflineQueueState>(initialState);

// Derived store for pending count
export const pendingCount = derived(
  offlineQueueStore,
  $queue => $queue.items.filter(i => i.status === 'pending').length
);

// ========== QUEUE MANAGEMENT ==========

/**
 * Add request to offline queue
 * Returns UUID for tracking
 */
export async function queueRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    maxRetries?: number;
  }
): Promise<string> {
  const uuid = uuidv4();
  const now = Date.now();

  const entry: QueueEntry = {
    uuid,
    timestamp: now,
    url,
    method: options.method || 'POST',
    body: options.body,
    headers: options.headers,
    retryCount: 0,
    maxRetries: options.maxRetries || 3,
    status: 'pending',
    backoffMs: 1000
  };

  // Store in IndexedDB
  await db.queue.add(entry);

  // Update store
  offlineQueueStore.update(state => ({
    ...state,
    items: [...state.items, entry]
  }));

  // Trigger sync if online
  if (navigator.onLine) {
    processSyncQueue();
  }

  return uuid;
}

/**
 * Get sync status for queued item
 */
export async function getSyncStatus(uuid: string) {
  const statuses = await db.syncStatus.where('uuid').equals(uuid).toArray();
  return statuses[0] || null;
}

/**
 * Get all pending items
 */
export async function getPendingItems(): Promise<QueueEntry[]> {
  return db.queue
    .where('status')
    .anyOf('pending', 'retrying')
    .sortBy('timestamp');
}

/**
 * Process the sync queue (main function)
 */
export async function processSyncQueue() {
  offlineQueueStore.update(state => ({ ...state, isSyncing: true, error: undefined }));

  try {
    const items = await getPendingItems();

    if (items.length === 0) {
      offlineQueueStore.update(state => ({ ...state, isSyncing: false }));
      return;
    }

    let processed = 0;

    for (const item of items) {
      try {
        // Check if should retry based on backoff
        const now = Date.now();
        const timeSinceLastAttempt = item.lastAttempt ? now - item.lastAttempt : 0;

        if (item.lastAttempt && timeSinceLastAttempt < item.backoffMs) {
          console.log(`Skipping ${item.url}, backoff not elapsed`);
          continue;
        }

        // Update status to retrying
        await db.queue.update(item.id!, {
          status: 'retrying',
          lastAttempt: now
        });

        // Execute request
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            ...item.headers
          },
          body: item.body ? JSON.stringify(item.body) : undefined
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Remove from queue on success
        await db.queue.delete(item.id!);

        // Update sync status
        await db.syncStatus.put({
          uuid: item.uuid,
          itemId: item.uuid,
          serverId: data.id,
          status: 'synced',
          syncedAt: Date.now()
        });

        processed++;

        // Update progress
        const progress = Math.round((processed / items.length) * 100);
        offlineQueueStore.update(state => ({
          ...state,
          syncProgress: progress
        }));

        console.log(`✓ Synced: ${item.url}`);

      } catch (error) {
        // Exponential backoff for retry
        const backoffMs = item.backoffMs * Math.pow(1.5, item.retryCount);

        if (item.retryCount < item.maxRetries) {
          // Retry
          await db.queue.update(item.id!, {
            status: 'retrying',
            retryCount: item.retryCount + 1,
            lastError: String(error),
            backoffMs: Math.min(backoffMs, 60000) // Max 1 minute
          });

          console.log(`⟳ Retry queued: ${item.url} (attempt ${item.retryCount + 1})`);

        } else {
          // Give up
          await db.queue.update(item.id!, {
            status: 'failed',
            lastError: String(error)
          });

          await db.syncStatus.put({
            uuid: item.uuid,
            itemId: item.uuid,
            status: 'error',
            error: String(error)
          });

          console.error(`✗ Failed: ${item.url}`, error);
        }
      }
    }

    // Update last sync time
    offlineQueueStore.update(state => ({
      ...state,
      isSyncing: false,
      lastSyncTime: Date.now(),
      syncProgress: 100
    }));

  } catch (error) {
    console.error('Queue processing error:', error);
    offlineQueueStore.update(state => ({
      ...state,
      isSyncing: false,
      error: String(error)
    }));
  }
}

/**
 * Manual retry of failed items
 */
export async function retryFailedItems() {
  await db.queue
    .where('status')
    .equals('failed')
    .modify(item => ({
      status: 'pending' as const,
      retryCount: 0,
      backoffMs: 1000
    }));

  return processSyncQueue();
}

/**
 * Clear all queue items (careful!)
 */
export async function clearQueue() {
  await db.queue.clear();
  offlineQueueStore.set(initialState);
}
```

### Step 4: Register Background Sync in Service Worker

**Configure Service Worker:**

```javascript
// static/sw.js
const SYNC_TAG = 'sync-queue';

// Install: Register for sync
self.addEventListener('install', (event) => {
  console.log('SW installing...');
  self.skipWaiting();
});

// Activate: Claim clients
self.addEventListener('activate', (event) => {
  console.log('SW activating...');
  self.clients.claim();

  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names
          .filter(name => !name.startsWith('active-cache'))
          .map(name => caches.delete(name))
      );
    })
  );
});

// Background Sync event
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    console.log('Background sync triggered');

    event.waitUntil(
      (async () => {
        // Send message to client to process queue
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: 'SYNC_QUEUE'
          });
        }
      })()
    );
  }
});

// Handle periodic sync if supported
self.addEventListener('periodicsync', (event) => {
  if (event.tag === SYNC_TAG) {
    console.log('Periodic sync triggered');

    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: 'SYNC_QUEUE'
          });
        }
      })()
    );
  }
});

// Fetch: Don't cache POST/PUT/DELETE
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip caching for mutations
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache GET requests
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        const clone = response.clone();
        caches.open('page-cache').then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});
```

### Step 5: Integrate with App Layout

**Setup Message Listener and Trigger Sync:**

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import { offlineQueueStore, processSyncQueue } from '$lib/stores/offline-queue';

  onMount(() => {
    // Listen for sync messages from SW
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_QUEUE') {
        console.log('Received sync message from SW');
        processSyncQueue();
      }
    });

    // Listen for online/offline
    const handleOnline = () => {
      console.log('Back online, processing queue...');
      processSyncQueue();
    };

    window.addEventListener('online', handleOnline);

    // Trigger sync when online
    if (navigator.onLine) {
      processSyncQueue();
    }

    // Register for background sync (if SW ready)
    registerBackgroundSync();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  });

  async function registerBackgroundSync() {
    if (!('serviceWorker' in navigator)) return;
    if (!('SyncManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-queue');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
</script>

{#if $offlineQueueStore.isSyncing}
  <div class="sync-indicator">
    Syncing... {$offlineQueueStore.syncProgress}%
  </div>
{/if}

{#if $offlineQueueStore.error}
  <div class="sync-error">
    Sync error: {$offlineQueueStore.error}
  </div>
{/if}

<slot />
```

### Step 6: Use Queue in Forms

**Example: Form Submission with Optimistic Update:**

```svelte
<!-- src/routes/notes/+page.svelte -->
<script>
  import { queueRequest, getSyncStatus } from '$lib/stores/offline-queue';
  import { offlineQueueStore } from '$lib/stores/offline-queue';

  let notes = $state([]);
  let newNote = $state('');
  let syncing = $derived($offlineQueueStore.isSyncing);

  async function addNote(e) {
    e.preventDefault();

    const optimisticId = `local-${Date.now()}`;
    const noteContent = newNote;
    newNote = '';

    // Optimistic update: Add to UI immediately
    notes = [
      ...notes,
      {
        id: optimisticId,
        content: noteContent,
        createdAt: new Date(),
        syncing: true,
        syncError: null
      }
    ];

    // Queue the request
    const queueUuid = await queueRequest('/api/notes', {
      method: 'POST',
      body: { content: noteContent }
    });

    // Track sync status
    let note = notes.find(n => n.id === optimisticId);
    if (note) note.queueUuid = queueUuid;

    // Poll for sync completion
    const maxWait = 30000; // 30s timeout
    const startTime = Date.now();

    const pollInterval = setInterval(async () => {
      const status = await getSyncStatus(queueUuid);

      if (status?.status === 'synced') {
        // Update with server ID
        if (note) {
          note.id = status.serverId || optimisticId;
          note.syncing = false;
        }
        clearInterval(pollInterval);
      } else if (status?.status === 'error') {
        if (note) {
          note.syncing = false;
          note.syncError = status.error;
        }
        clearInterval(pollInterval);
      } else if (Date.now() - startTime > maxWait) {
        clearInterval(pollInterval);
      }
    }, 500);
  }
</script>

<form on:submit={addNote}>
  <input bind:value={newNote} placeholder="New note..." required />
  <button disabled={syncing || !newNote}>
    {syncing ? 'Syncing...' : 'Add Note'}
  </button>
</form>

<div class="notes">
  {#each notes as note (note.id)}
    <div class="note" class:syncing={note.syncing} class:error={note.syncError}>
      <p>{note.content}</p>
      {#if note.syncing}
        <span class="status">Syncing...</span>
      {/if}
      {#if note.syncError}
        <span class="status error">{note.syncError}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .note {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .note.syncing {
    opacity: 0.7;
    border-color: #ffc107;
  }

  .note.error {
    border-color: #dc3545;
  }

  .status {
    display: block;
    font-size: 0.875rem;
    color: #ffc107;
    margin-top: 0.5rem;
  }

  .status.error {
    color: #dc3545;
  }
</style>
```

### Step 7: UI Components for Queue Status

**Queue Status Indicator:**

```svelte
<!-- src/components/QueueStatus.svelte -->
<script>
  import { offlineQueueStore, pendingCount, retryFailedItems } from '$lib/stores/offline-queue';

  let showDetails = $state(false);
  let failedCount = $derived(
    $offlineQueueStore.items.filter(i => i.status === 'failed').length
  );
</script>

{#if $pendingCount > 0 || $offlineQueueStore.isSyncing}
  <div class="queue-status">
    <div class="status-bar">
      <span class="icon">
        {#if $offlineQueueStore.isSyncing}
          ⟳
        {:else}
          ✓
        {/if}
      </span>
      <span class="text">
        {#if $offlineQueueStore.isSyncing}
          Syncing: {$offlineQueueStore.syncProgress}%
        {:else if $pendingCount > 0}
          {$pendingCount} pending changes
        {:else}
          All synced
        {/if}
      </span>
      <button
        type="button"
        class="details-btn"
        on:click={() => (showDetails = !showDetails)}
      >
        {showDetails ? '▼' : '▶'}
      </button>
    </div>

    {#if showDetails}
      <div class="details">
        <div class="summary">
          <div>Pending: {$pendingCount}</div>
          <div>Failed: {failedCount}</div>
          {#if $offlineQueueStore.lastSyncTime}
            <div class="last-sync">
              Last sync: {new Date($offlineQueueStore.lastSyncTime).toLocaleTimeString()}
            </div>
          {/if}
        </div>

        {#if failedCount > 0}
          <button type="button" on:click={retryFailedItems}>
            Retry {failedCount} failed items
          </button>
        {/if}

        {#if $offlineQueueStore.items.length > 0}
          <div class="queue-items">
            {#each $offlineQueueStore.items as item (item.uuid)}
              <div class="item" class:failed={item.status === 'failed'}>
                <div class="url">{item.url}</div>
                <div class="status">{item.status}</div>
                {#if item.lastError}
                  <div class="error">{item.lastError}</div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .queue-status {
    position: fixed;
    bottom: 0;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px 4px 0 0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
    max-width: 400px;
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    cursor: pointer;
  }

  .icon {
    font-size: 1.25rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .details-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    margin-left: auto;
  }

  .details {
    padding: 0 1rem 1rem;
    border-top: 1px solid #eee;
    max-height: 300px;
    overflow-y: auto;
  }

  .summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .last-sync {
    grid-column: 1 / -1;
    color: #666;
  }

  .queue-items {
    font-size: 0.75rem;
  }

  .item {
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: #f5f5f5;
    border-radius: 2px;
    border-left: 3px solid #ffc107;
  }

  .item.failed {
    border-left-color: #dc3545;
  }

  .url {
    font-weight: bold;
    word-break: break-all;
  }

  .status {
    color: #666;
  }

  .error {
    color: #dc3545;
  }
</style>
```

### Step 8: Test Offline Functionality

**Manual Testing:**

```javascript
// 1. Add a note (online)
// 2. DevTools > Network > Offline
// 3. Add another note (should be queued)
// 4. Check DevTools > Storage > IndexedDB > offline-sync-db > queue
// 5. Should see 1 pending item
// 6. DevTools > Network > Back online
// 7. Should see automatic sync
// 8. Queue should be empty
```

**Automated Test:**

```typescript
// test/offline-queue.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { queueRequest, getPendingItems, processSyncQueue, db } from '$lib/stores/offline-queue';

describe('Offline Queue', () => {
  beforeEach(async () => {
    await db.queue.clear();
    await db.syncStatus.clear();
  });

  it('should queue requests when offline', async () => {
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const uuid = await queueRequest('/api/notes', {
      method: 'POST',
      body: { content: 'Test note' }
    });

    const pending = await getPendingItems();
    expect(pending).toHaveLength(1);
    expect(pending[0].uuid).toBe(uuid);
  });

  it('should process queue when online', async () => {
    await queueRequest('/api/notes', {
      method: 'POST',
      body: { content: 'Test' }
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'server-123' })
    });

    await processSyncQueue();

    const pending = await getPendingItems();
    expect(pending).toHaveLength(0);
  });

  it('should retry failed requests with exponential backoff', async () => {
    await queueRequest('/api/notes', {
      method: 'POST',
      body: { content: 'Test' },
      maxRetries: 2
    });

    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await processSyncQueue();

    const items = await db.queue.toArray();
    expect(items[0].retryCount).toBe(1);
    expect(items[0].status).toBe('retrying');
    expect(items[0].backoffMs).toBeGreaterThan(1000);
  });
});
```

---

## Expected Output

### Success Case

```markdown
## Offline Queue Implementation Complete ✓

### Architecture
- **Database**: Dexie.js with IndexedDB
- **Strategy**: Background Sync with fallback polling
- **Retry Policy**: 3 attempts, exponential backoff (1s, 1.5s, 2.25s)
- **UI Feedback**: Real-time sync status indicator

### Components
- Queue store in `src/lib/stores/offline-queue.ts`
- Database schema in `src/lib/db/sync-db.ts`
- Status component in `src/components/QueueStatus.svelte`
- Background Sync registered in Service Worker

### Features
- [x] Queue requests when offline
- [x] Process queue when online
- [x] Optimistic UI updates
- [x] Retry with exponential backoff
- [x] Real-time sync status
- [x] Failed item retry
- [x] IndexedDB persistence
- [x] Background Sync integration

### Test Results
- Queue stores items correctly
- Sync processes all pending items
- Retry logic works with backoff
- UI updates reflect sync state
- No memory leaks on repeated syncs

### Performance
- 100 queued items sync in < 5s
- Memory impact: +2MB for queue
- Backoff reduces server load by 60%
```

### Problem Case

```markdown
## Issues Requiring Fix

### Issue 1: Background Sync Not Triggered
- Service Worker registered but `SyncManager` not used
- Fix: Call `registration.sync.register('sync-queue')`
- Impact: MEDIUM - fallback polling works but less efficient

### Issue 2: MessageChannel Port Leak
- Sync requests holding ports open
- Fix: Close ports after message received
- Impact: HIGH - memory leak over time

### Issue 3: Duplicate Queue Entries
- Same request queued multiple times
- Fix: Deduplicate by URL + timestamp in 5s window
- Impact: MEDIUM - wastes network bandwidth
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| offline-queue-store.ts | `.claude/artifacts/` | Complete queue implementation |
| sync-db-schema.ts | `.claude/artifacts/` | IndexedDB schema |
| queue-status-component.svelte | `.claude/artifacts/` | UI component |
| background-sync-registration.js | `.claude/artifacts/` | Service Worker setup |
| queue-integration-guide.md | `.claude/artifacts/` | Step-by-step integration |

---

## Common Patterns

### Pattern 1: Form Submission Queue
```svelte
<form on:submit={async (e) => {
  const uuid = await queueRequest('/api/form', {
    method: 'POST',
    body: new FormData(e.target)
  });
  // Show optimistic confirmation
}}>
```

### Pattern 2: Analytics Queue
```typescript
export function trackEvent(name: string, data: unknown) {
  queueRequest('/api/analytics', {
    method: 'POST',
    body: { event: name, data }
  });
}
```

### Pattern 3: Auto-Retry on Connection Recovery
```javascript
window.addEventListener('online', () => {
  retryFailedItems();
});
```

---

## References

- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API)
- [Dexie.js Documentation](https://dexie.org/)
- [IndexedDB Best Practices](https://web.dev/indexeddb-best-practices/)
- [Offline Cookbook](https://jakearchibald.com/2014/offline-cookbook/)
- [Service Worker Message Passing](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/controller)
