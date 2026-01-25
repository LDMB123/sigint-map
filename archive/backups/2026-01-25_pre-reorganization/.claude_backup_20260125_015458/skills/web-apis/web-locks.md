---
title: Web Locks API
category: Web APIs
tags: [concurrency, coordination, async, chromium143+]
description: Coordinating async operations across tabs and workers with navigator.locks
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Web Locks API

Provides a way to acquire locks that prevent reentrancy and coordinate operations across tabs, workers, and the same context.

## When to Use

- **Cross-tab coordination** — Only one tab performs expensive operation
- **Preventing race conditions** — Serialize access to shared resources
- **IndexedDB transaction coordination** — Queue database operations
- **Exclusive resource access** — Prevent concurrent modifications
- **Startup synchronization** — Ensure one tab initializes shared state

## Core Concepts

```typescript
interface LockManager {
  request(
    name: string,
    callback: (lock: Lock) => Promise<void>,
    options?: LockManagerRequestOptions
  ): Promise<void>;

  query(): Promise<LockManagerSnapshot>;
}

interface Lock {
  name: string;
}

interface LockManagerRequestOptions {
  mode?: 'exclusive' | 'shared';
  ifAvailable?: boolean;
  steal?: boolean;
  signal?: AbortSignal;
}
```

## Basic Usage

### Exclusive Lock (Only One Holder)

```typescript
async function updateSharedState(newValue: unknown): Promise<void> {
  await navigator.locks.request('shared-state', async (lock) => {
    // Only this context holds the lock
    console.log('Lock acquired:', lock.name);

    // Safe to modify shared resource
    const current = await getFromIndexedDB('state-key');
    await saveToIndexedDB('state-key', newValue);

    // Lock automatically released when callback returns
  });
}

// Call from any tab
updateSharedState({ timestamp: Date.now(), data: 'value' });
```

### Shared Lock (Multiple Readers)

```typescript
async function readSharedState(): Promise<unknown> {
  return navigator.locks.request(
    'shared-state',
    async (lock) => {
      // Multiple tabs can hold shared locks simultaneously
      console.log('Shared lock acquired');
      return getFromIndexedDB('state-key');
    },
    { mode: 'shared' }
  );
}

// Multiple tabs can read concurrently
Promise.all([
  readSharedState(),
  readSharedState(),
  readSharedState()
]);
```

## Advanced Patterns

### Non-Blocking Lock Attempt

```typescript
async function tryQuickUpdate(): Promise<boolean> {
  try {
    await navigator.locks.request(
      'quick-operation',
      async (lock) => {
        console.log('Performing quick operation');
        await performUpdate();
      },
      { ifAvailable: true }  // Don't wait if locked
    );
    return true;
  } catch (error) {
    console.log('Lock not available, operation skipped');
    return false;
  }
}

// Non-blocking usage
const updated = await tryQuickUpdate();
if (!updated) {
  console.log('Will retry later');
}
```

### Lock with Timeout

```typescript
async function updateWithTimeout(value: unknown): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    await navigator.locks.request(
      'critical-section',
      async (lock) => {
        await performLongOperation(value);
      },
      { signal: controller.signal }
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Lock timeout - operation cancelled');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Preemptive Lock (Steal Behavior)

```typescript
async function forcefulUpdate(value: unknown): Promise<void> {
  await navigator.locks.request(
    'critical-section',
    async (lock) => {
      // This lock steals from any existing locks with same name
      console.log('Forcefully acquired lock');
      await performUpdate(value);
    },
    { steal: true }  // Release other holders
  );
}

// Use sparingly - only for critical operations
forcefulUpdate({ emergency: true });
```

## Cross-Tab Coordination

### Single Tab Initialization

```typescript
async function ensureInitialization(): Promise<void> {
  // Only one tab performs expensive initialization
  await navigator.locks.request(
    'app-init',
    async (lock) => {
      const isInitialized = localStorage.getItem('app:initialized');

      if (!isInitialized) {
        console.log('Performing app initialization');

        // Expensive operations (load config, seed cache, etc.)
        await loadConfiguration();
        await warmupCache();
        await initializeAnalytics();

        localStorage.setItem('app:initialized', 'true');
      } else {
        console.log('App already initialized by another tab');
      }
    }
  );
}

// All tabs call this, but only one actually initializes
await ensureInitialization();
```

### Synchronized Theme Update

```typescript
async function broadcastThemeChange(theme: 'light' | 'dark'): Promise<void> {
  await navigator.locks.request(
    'theme-update',
    async (lock) => {
      // Update local storage
      localStorage.setItem('theme', theme);

      // Update DOM
      document.documentElement.setAttribute('data-theme', theme);

      // Notify other contexts via BroadcastChannel
      const channel = new BroadcastChannel('theme-updates');
      channel.postMessage({ theme });
    }
  );
}

// Listen for remote updates
const themeChannel = new BroadcastChannel('theme-updates');
themeChannel.onmessage = (event) => {
  document.documentElement.setAttribute('data-theme', event.data.theme);
};
```

### Deferred Shared Worker Pattern

```typescript
async function coordinateDatabaseAccess(
  operation: () => Promise<void>
): Promise<void> {
  const myId = Math.random().toString(36);
  const startTime = performance.now();

  return navigator.locks.request(
    'idb-access',
    async (lock) => {
      const acquireTime = performance.now() - startTime;
      console.log(`Context ${myId} acquired lock after ${acquireTime}ms`);

      try {
        await operation();
      } finally {
        console.log(`Context ${myId} releasing lock`);
      }
    }
  );
}

// Multiple contexts coordinate database access
Promise.all([
  coordinateDatabaseAccess(async () => {
    await saveRecord({ id: 1, data: 'first' });
  }),
  coordinateDatabaseAccess(async () => {
    await saveRecord({ id: 2, data: 'second' });
  }),
  coordinateDatabaseAccess(async () => {
    await saveRecord({ id: 3, data: 'third' });
  })
]);
```

## Monitoring Locks

### Query Lock Status

```typescript
async function describeLockState(): Promise<void> {
  const snapshot = await navigator.locks.query();

  console.log('Held locks:', snapshot.held.map(lock => ({
    name: lock.name,
    mode: lock.mode,
    clientId: lock.clientId
  })));

  console.log('Pending requests:', snapshot.pending.map(lock => ({
    name: lock.name,
    mode: lock.mode,
    clientId: lock.clientId
  })));
}

// Check periodically
setInterval(describeLockState, 5000);
```

### Deadlock Detection

```typescript
async function detectDeadlock(): Promise<boolean> {
  const snapshot = await navigator.locks.query();

  // Shared + Exclusive modes waiting on same lock = potential deadlock
  const locksByName = new Map<string, typeof snapshot.held>();

  for (const lock of snapshot.pending) {
    const others = snapshot.held.filter(h => h.name === lock.name);
    if (others.length > 0 && lock.mode === 'exclusive') {
      console.warn(`Deadlock detected: ${lock.name} has ${others.length} holders`);
      return true;
    }
  }

  return false;
}

// Monitor for deadlock conditions
setInterval(async () => {
  if (await detectDeadlock()) {
    console.error('System in deadlock state');
    // Recovery strategy: page reload, error reporting, etc.
  }
}, 10000);
```

## IndexedDB Transaction Coordination

```typescript
async function transactWithLocking(
  storeName: string,
  operation: (store: IDBObjectStore) => Promise<void>
): Promise<void> {
  await navigator.locks.request(
    `idb:${storeName}`,
    async (lock) => {
      const db = await openDatabase();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      await operation(store);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  );
}

// Usage
await transactWithLocking('users', async (store) => {
  await new Promise<void>((resolve, reject) => {
    const request = store.add({ id: 1, name: 'Alice' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
});
```

## Performance Considerations

```typescript
interface LockPerformanceMetrics {
  acquireLatency: number;
  holdDuration: number;
  contentionLevel: number;
}

async function measureLockPerformance(
  lockName: string
): Promise<LockPerformanceMetrics> {
  const acquireStart = performance.now();

  let acquireLatency = 0;
  let holdDuration = 0;

  await navigator.locks.request(lockName, async (lock) => {
    acquireLatency = performance.now() - acquireStart;
    const holdStart = performance.now();

    // Simulate work
    await new Promise(r => setTimeout(r, 100));

    holdDuration = performance.now() - holdStart;
  });

  const snapshot = await navigator.locks.query();
  const contentionLevel = snapshot.pending.filter(
    lock => lock.name === lockName
  ).length;

  return {
    acquireLatency,
    holdDuration,
    contentionLevel
  };
}

// Profile lock behavior
const metrics = await measureLockPerformance('my-lock');
console.log('Lock performance:', metrics);
```

## Browser Support

**Chromium 143+ baseline** — Web Locks API is widely supported in modern Chromium versions and available in all web workers, service workers, and windows.

## Related APIs

- **BroadcastChannel API** — Send messages between contexts
- **Shared Workers** — Shared state coordination
- **IndexedDB** — Persistent storage requiring coordination
- **Storage Manager API** — Persistent storage requests
