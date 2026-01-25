# IndexedDB Error Handling - Remediation Roadmap

**Project**: DMB Almanac Svelte
**Priority**: CRITICAL - Address within 2 sprints
**Estimated Effort**: 40-60 hours
**Risk Mitigation**: Prevents data loss and cross-tab corruption

---

## Phase 1: Foundation (Week 1)

### 1.1 Quota Management System

**File**: Create `/src/lib/db/dexie/quota-manager.ts`

**Why**: Prevent QuotaExceededError crashes during user data operations

**Implementation**:
```typescript
/**
 * Quota manager for proactive storage monitoring
 * Handles quota checks, warnings, and cleanup strategies
 */

export interface StorageEstimate {
  usage: number;
  quota: number;
  percentUsed: number;
  available: number;
}

export class QuotaManager {
  private warningThreshold = 0.80; // 80%
  private criticalThreshold = 0.95; // 95%
  private estimateCache: StorageEstimate | null = null;
  private lastUpdate = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  async getEstimate(): Promise<StorageEstimate> {
    // Cache estimate to avoid hammering navigator.storage.estimate()
    if (this.estimateCache && Date.now() - this.lastUpdate < this.CACHE_TTL) {
      return this.estimateCache;
    }

    try {
      const estimate = await navigator.storage.estimate();
      this.estimateCache = {
        usage: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
        percentUsed: estimate.quota ? ((estimate.usage ?? 0) / estimate.quota) * 100 : 0,
        available: (estimate.quota ?? 0) - (estimate.usage ?? 0),
      };
      this.lastUpdate = Date.now();
      return this.estimateCache;
    } catch (error) {
      console.error('[QuotaManager] Failed to estimate storage:', error);
      // Return worst-case estimate on error
      return {
        usage: 0,
        quota: 50 * 1024 * 1024, // 50MB default
        percentUsed: 100,
        available: 0,
      };
    }
  }

  async canAccommodate(sizeBytes: number): Promise<boolean> {
    const estimate = await this.getEstimate();
    return estimate.available > sizeBytes * 1.2; // 1.2x buffer
  }

  async checkStatus(): Promise<'ok' | 'warning' | 'critical'> {
    const estimate = await this.getEstimate();
    const percent = estimate.percentUsed / 100;

    if (percent >= this.criticalThreshold) return 'critical';
    if (percent >= this.warningThreshold) return 'warning';
    return 'ok';
  }

  async requestPersistent(): Promise<boolean> {
    if (!navigator.storage?.persist) return false;
    try {
      return await navigator.storage.persist();
    } catch (error) {
      console.warn('[QuotaManager] Failed to request persistent storage:', error);
      return false;
    }
  }
}

export const quotaManager = new QuotaManager();
```

**Testing**:
```typescript
test('detects storage at 80% capacity', async () => {
  // Mock navigator.storage.estimate to return 80% full
  const status = await quotaManager.checkStatus();
  expect(status).toBe('warning');
});

test('returns false for canAccommodate when full', async () => {
  const canAccommodate = await quotaManager.canAccommodate(1000000);
  expect(canAccommodate).toBe(false);
});
```

**Integration**: Update data-loader.ts and queries.ts to use quotaManager

---

### 1.2 Graceful Error Handler Registry

**File**: Create `/src/lib/db/dexie/error-handlers.ts`

**Why**: Centralize error handling logic for consistency and testability

**Implementation**:
```typescript
/**
 * Central error handler registry for IndexedDB operations
 * Provides typed error handlers and recovery strategies
 */

export type DexieErrorType =
  | 'QuotaExceededError'
  | 'VersionError'
  | 'VersionChangeError'
  | 'ConstraintError'
  | 'TransactionInactiveError'
  | 'DatabaseClosedError'
  | 'AbortError'
  | 'TimeoutError'
  | 'NetworkError'
  | 'UnknownError';

export interface ErrorContext {
  operation: string;
  table?: string;
  timestamp: number;
  duration?: number;
}

export interface ErrorRecoveryStrategy {
  recoverable: boolean;
  shouldRetry: boolean;
  maxRetries?: number;
  backoffMs?: number[];
  userMessage?: string;
  fallbackAction?: () => Promise<void>;
}

export class DexieErrorHandler {
  private static readonly strategies: Record<DexieErrorType, ErrorRecoveryStrategy> = {
    QuotaExceededError: {
      recoverable: true,
      shouldRetry: false, // Retrying won't help
      userMessage: 'Storage is full. Please clear some data.',
      fallbackAction: async () => {
        await quotaManager.requestPersistent();
      },
    },
    VersionError: {
      recoverable: false, // Must refresh page
      shouldRetry: false,
      userMessage: 'Database updated. Please refresh the page.',
    },
    ConstraintError: {
      recoverable: true,
      shouldRetry: false, // Different data needed
    },
    TransactionInactiveError: {
      recoverable: true,
      shouldRetry: true,
      maxRetries: 3,
      backoffMs: [100, 500, 2000],
    },
    AbortError: {
      recoverable: true,
      shouldRetry: true,
      maxRetries: 3,
      backoffMs: [100, 500, 2000],
    },
    TimeoutError: {
      recoverable: true,
      shouldRetry: true,
      maxRetries: 2,
      backoffMs: [500, 2000],
    },
    DatabaseClosedError: {
      recoverable: true,
      shouldRetry: true,
      maxRetries: 2,
      backoffMs: [100, 500],
    },
    NetworkError: {
      recoverable: true,
      shouldRetry: true,
      maxRetries: 3,
      backoffMs: [1000, 2000, 5000],
    },
    UnknownError: {
      recoverable: false,
      shouldRetry: false,
    },
  };

  static getStrategy(errorType: DexieErrorType): ErrorRecoveryStrategy {
    return this.strategies[errorType] || this.strategies.UnknownError;
  }

  static async handleError(
    error: unknown,
    context: ErrorContext
  ): Promise<ErrorRecoveryStrategy> {
    const errorType = this.classifyError(error);
    const strategy = this.getStrategy(errorType);

    // Dispatch error event
    this.dispatchErrorEvent({
      errorType,
      context,
      strategy,
      error: error instanceof Error ? error.message : String(error),
    });

    return strategy;
  }

  private static classifyError(error: unknown): DexieErrorType {
    if (!(error instanceof Error)) {
      return 'UnknownError';
    }

    const name = error.name as string;
    if (['QuotaExceededError', 'VersionError', 'VersionChangeError', 'ConstraintError',
      'TransactionInactiveError', 'DatabaseClosedError', 'AbortError', 'TimeoutError'
    ].includes(name)) {
      return name as DexieErrorType;
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'NetworkError';
    }

    return 'UnknownError';
  }

  private static dispatchErrorEvent(detail: {
    errorType: DexieErrorType;
    context: ErrorContext;
    strategy: ErrorRecoveryStrategy;
    error: string;
  }): void {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('dexie-error-classified', { detail }));
  }
}
```

**Testing**:
```typescript
test('classifies QuotaExceededError correctly', () => {
  const error = new Error('QuotaExceededError');
  error.name = 'QuotaExceededError';
  const strategy = DexieErrorHandler.getStrategy('QuotaExceededError');
  expect(strategy.shouldRetry).toBe(false);
});
```

---

### 1.3 Update db.ts Global Handlers

**File**: Modify `/src/lib/db/dexie/db.ts`

**Changes**:
```typescript
// Add to DMBAlmanacDB constructor (after line 294)
// Enhanced error handling with recovery strategies

constructor() {
  super(DB_NAME);

  // ... existing version and schema definitions ...

  // Add global error handler using new error handler registry
  this.on('error', async (event) => {
    const strategy = await DexieErrorHandler.handleError(event.error, {
      operation: 'database-operation',
      timestamp: Date.now(),
    });

    // Attempt recovery if strategy says to
    if (strategy.fallbackAction) {
      try {
        await strategy.fallbackAction();
      } catch (recoveryError) {
        console.error('[DexieDB] Recovery action failed:', recoveryError);
      }
    }
  });

  // ... existing versionchange and blocked handlers ...
}
```

---

## Phase 2: Cross-Tab Synchronization (Week 1-2)

### 2.1 Cross-Tab Mutation Broadcaster

**File**: Create `/src/lib/db/dexie/cross-tab-sync.ts`

**Why**: Keep user data consistent across multiple open tabs

**Implementation**:
```typescript
/**
 * Cross-tab synchronization for user mutations
 * Uses BroadcastChannel to coordinate changes across tabs
 */

export type MutationType =
  | 'attended-show-added'
  | 'attended-show-removed'
  | 'favorite-song-added'
  | 'favorite-song-removed'
  | 'favorite-venue-added'
  | 'favorite-venue-removed'
  | 'data-synced';

export interface CrossTabMutation {
  type: MutationType;
  timestamp: number;
  data: Record<string, unknown>;
  source: string; // Tab ID
}

export class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private tabId = Math.random().toString(36).substr(2, 9);
  private listeners: Set<(mutation: CrossTabMutation) => void> = new Set();

  constructor(private channelName = 'dmb-mutations') {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => this.handleMessage(event);
      } catch (error) {
        console.warn('[CrossTabSync] BroadcastChannel not available:', error);
      }
    }
  }

  broadcast(mutation: Omit<CrossTabMutation, 'timestamp' | 'source'>): void {
    if (!this.channel) return;

    const message: CrossTabMutation = {
      ...mutation,
      timestamp: Date.now(),
      source: this.tabId,
    };

    this.channel.postMessage(message);

    // Also handle locally
    this.handleMessage({ data: message } as any);
  }

  subscribe(listener: (mutation: CrossTabMutation) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleMessage(event: MessageEvent<CrossTabMutation>): void {
    const mutation = event.data;

    // Don't process messages from self
    if (mutation.source === this.tabId) return;

    // Notify all listeners
    for (const listener of this.listeners) {
      try {
        listener(mutation);
      } catch (error) {
        console.error('[CrossTabSync] Listener error:', error);
      }
    }
  }

  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const crossTabSync = new CrossTabSync();
```

### 2.2 Update User Data Stores

**File**: Modify `/src/lib/stores/dexie.ts`

**Changes**:
```typescript
// In createUserAttendedShowsStore (around line 704)
function createUserAttendedShowsStore() {
  const store = writable<UserAttendedShow[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;

  // Subscribe to liveQuery
  if (isBrowser) {
    getDb()
      .then((db) => {
        subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
          next: (value) => store.set(value),
          error: (err) => console.error('[dexie] userAttendedShows subscription error:', err)
        });

        // NEW: Subscribe to cross-tab mutations
        const unsubscribeMutations = crossTabSync.subscribe((mutation) => {
          if (mutation.type === 'attended-show-added' ||
            mutation.type === 'attended-show-removed') {
            // Invalidate and refresh
            invalidateUserDataCaches();
          }
        });

        // Store unsubscriber for cleanup
        originalUnsubscribe = unsubscribeMutations;
      })
      .catch((err) => console.error('[dexie] Failed to initialize userAttendedShows store:', err));
  }

  return {
    subscribe: store.subscribe,

    async add(showId: number, showDate?: string) {
      const db = await getDb();
      try {
        await db.userAttendedShows.add({
          showId,
          addedAt: Date.now(),
          notes: null,
          rating: null,
          showDate: showDate ?? '',
          venueName: '',
          venueCity: '',
          venueState: null,
          tourName: ''
        });

        // NEW: Broadcast to other tabs
        crossTabSync.broadcast({
          type: 'attended-show-added',
          data: { showId, showDate }
        });

        invalidateUserDataCaches();
      } catch (error) {
        if (error instanceof Dexie.ConstraintError) {
          console.warn('[dexie] Show already marked as attended:', showId);
          return;
        }
        throw error;
      }
    },

    // ... similar for remove and toggle ...
  };
}
```

---

## Phase 3: Quota-Aware Bulk Operations (Week 2)

### 3.1 Safe Bulk Insert Functions

**File**: Modify `/src/lib/db/dexie/queries.ts`

**Changes** (replace lines 1306-1342):
```typescript
/**
 * Bulk insert shows with quota awareness
 * Returns partial success with detailed failure info
 */
export async function bulkInsertShowsSafe(
  shows: DexieShow[],
  options: {
    chunkSize?: number;
    onProgress?: (loaded: number, total: number) => void;
    onWarning?: (warning: string) => void;
  } = {}
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
  quotaStatus: 'ok' | 'warning' | 'critical';
}> {
  const db = getDb();
  const { chunkSize = BULK_CHUNK_SIZE, onProgress, onWarning } = options;
  const errors: Array<{ index: number; error: string }> = [];
  let inserted = 0;

  // Check quota before starting
  const quotaStatus = await quotaManager.checkStatus();
  if (quotaStatus === 'critical') {
    onWarning?.('Storage is critically low. Some data may not be saved.');
  }

  for (let i = 0; i < shows.length; i += chunkSize) {
    const chunk = shows.slice(i, i + chunkSize);
    const chunkIndex = Math.floor(i / chunkSize);

    try {
      // Check quota for this chunk
      const canAccommodate = await quotaManager.canAccommodate(
        JSON.stringify(chunk).length
      );

      if (!canAccommodate) {
        // Continue with what fits
        onWarning?.(`Quota exceeded at chunk ${chunkIndex}. Saved ${inserted} of ${shows.length} items.`);
        break;
      }

      await db.transaction('rw', db.shows, async () => {
        await db.shows.bulkAdd(chunk, { allKeys: true });
      });

      inserted += chunk.length;
      onProgress?.(inserted, shows.length);

    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        onWarning?.(`Storage quota exceeded at chunk ${chunkIndex}`);
        // Save what we have and stop
        break;
      }

      // Track individual errors
      for (let j = 0; j < chunk.length; j++) {
        errors.push({
          index: i + j,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      onWarning?.(`Failed to insert chunk ${chunkIndex}: ${error}`);
      continue; // Try next chunk
    }
  }

  // Invalidate cache after successful inserts
  if (inserted > 0) {
    const { invalidateCache } = await import('./cache');
    invalidateCache(['shows']);
  }

  return {
    successful: inserted,
    failed: shows.length - inserted,
    errors,
    quotaStatus,
  };
}
```

### 3.2 Sync with Quota Management

**File**: Modify `/src/lib/db/dexie/sync.ts`

**Add to performSync** (around line 627):
```typescript
// Before writing to database
try {
  const quotaStatus = await quotaManager.checkStatus();

  if (quotaStatus === 'critical') {
    throw new Error('Storage quota is critical. Cannot sync now.');
  }

  // Check if we can fit the data
  const totalSize = JSON.stringify(data).length;
  const canFit = await quotaManager.canAccommodate(totalSize);

  if (!canFit) {
    // Try to make space
    await cleanupStaleData();

    // Check again
    const canFitAfterCleanup = await quotaManager.canAccommodate(totalSize);
    if (!canFitAfterCleanup) {
      throw new Error('Not enough storage for sync after cleanup');
    }
  }

  // Proceed with sync
  // ...
} catch (error) {
  // Handle quota errors specially
  if (error instanceof Error && error.name === 'QuotaExceededError') {
    // Trigger cleanup and retry once
    await cleanupStaleData();
    return performSync(options); // Recursive retry
  }
  throw error;
}
```

---

## Phase 4: Monitoring & Observability (Week 2)

### 4.1 Enhanced Error Event Types

**File**: Modify `/src/lib/db/dexie/db.ts`

**Add new event types**:
```typescript
// In constructor, add detailed error event dispatcher
private dispatchDetailedError(
  errorType: string,
  error: Error,
  context: string,
  recovery?: { shouldRetry: boolean; maxRetries?: number }
): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('dexie-error-detailed', {
    detail: {
      errorType,
      message: error.message,
      stack: error.stack,
      context,
      dbName: this.name,
      dbVersion: this.verno,
      recovery,
      timestamp: Date.now(),
    }
  }));
}
```

### 4.2 Error Telemetry Hook

**File**: Create `/src/lib/utils/dexie-telemetry.ts`

**Implementation**:
```typescript
/**
 * Dexie error telemetry for monitoring
 * Tracks error rates, types, and recovery patterns
 */

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  averageRecoveryTime: number;
  failureRate: number;
  lastError?: { type: string; timestamp: number };
}

export class DexieTelemetry {
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    averageRecoveryTime: 0,
    failureRate: 0,
  };

  private recoveryTimes: number[] = [];

  initialize(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('dexie-error-detailed', (event: any) => {
      this.recordError(event.detail);
    });
  }

  private recordError(detail: any): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByType[detail.errorType] =
      (this.metrics.errorsByType[detail.errorType] || 0) + 1;
    this.metrics.lastError = {
      type: detail.errorType,
      timestamp: detail.timestamp
    };
  }

  recordRecoveryTime(durationMs: number): void {
    this.recoveryTimes.push(durationMs);
    if (this.recoveryTimes.length > 100) {
      this.recoveryTimes.shift();
    }
    this.metrics.averageRecoveryTime =
      this.recoveryTimes.reduce((a, b) => a + b, 0) / this.recoveryTimes.length;
  }

  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByType: {},
      averageRecoveryTime: 0,
      failureRate: 0,
    };
    this.recoveryTimes = [];
  }
}

export const dexieTelemetry = new DexieTelemetry();
```

---

## Phase 5: Testing & Validation (Week 3)

### 5.1 Error Scenario Tests

**File**: Create `/src/lib/db/dexie/__tests__/error-handling.test.ts`

**Test cases**:
```typescript
describe('IndexedDB Error Handling', () => {
  describe('QuotaExceededError', () => {
    test('bulkInsertShowsSafe returns partial success on quota exceeded', async () => {
      // Mock quota to be nearly full
      const result = await bulkInsertShowsSafe(mockShows);
      expect(result.successful).toBeGreaterThan(0);
      expect(result.successful).toBeLessThan(mockShows.length);
      expect(result.quotaStatus).toBe('warning' | 'critical');
    });

    test('emits quota-exceeded event', async () => {
      const eventSpy = jest.fn();
      window.addEventListener('dexie-quota-exceeded', eventSpy);
      // Trigger quota exceeded
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Cross-Tab Synchronization', () => {
    test('broadcasts user mutations to other tabs', async () => {
      const mutation: CrossTabMutation = {
        type: 'attended-show-added',
        timestamp: Date.now(),
        data: { showId: 123 },
        source: 'tab-1'
      };
      crossTabSync.broadcast(mutation);
      // Verify broadcast channel received it
    });

    test('invalidates cache on mutation from other tab', async () => {
      const invalidateSpy = jest.fn();
      const unsubscribe = crossTabSync.subscribe((mutation) => {
        if (mutation.type === 'attended-show-added') {
          invalidateSpy();
        }
      });

      crossTabSync.broadcast({
        type: 'attended-show-added',
        data: { showId: 123 }
      });

      expect(invalidateSpy).toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe('Transaction Recovery', () => {
    test('retries transaction on AbortError', async () => {
      // Mock transaction to abort once then succeed
      const result = await transactionWithRetry(
        async () => db.userFavoriteSongs.add(mockSong),
        { maxRetries: 2 }
      );
      expect(result).toBeDefined();
    });

    test('respects max retries', async () => {
      // Mock transaction to always abort
      const result = await transactionWithRetry(
        async () => { throw new Error('AbortError'); },
        { maxRetries: 2 }
      );
      // Should fail after 2 retries
      expect(result).toThrow();
    });
  });

  describe('Version Change Handling', () => {
    test('closes database on version change', async () => {
      const closeSpy = jest.fn();
      db.close = closeSpy;

      // Simulate version change event
      const event = new Event('versionchange');
      db.dispatchEvent(event); // Pseudo-code

      expect(closeSpy).toHaveBeenCalled();
    });

    test('dispatches dexie-version-change event', async () => {
      const eventSpy = jest.fn();
      window.addEventListener('dexie-version-change', eventSpy);

      // Trigger version change
      expect(eventSpy).toHaveBeenCalled();
    });
  });
});
```

---

## Implementation Checklist

### Phase 1
- [ ] Create `quota-manager.ts`
- [ ] Create `error-handlers.ts`
- [ ] Update `db.ts` with error handler integration
- [ ] Add telemetry hook
- [ ] Write unit tests

### Phase 2
- [ ] Create `cross-tab-sync.ts`
- [ ] Update user data stores in `dexie.ts`
- [ ] Test cross-tab mutations with 2+ browser windows
- [ ] Verify cache invalidation across tabs

### Phase 3
- [ ] Replace `bulkInsertShowsSafe`, `bulkInsertSongs`, `bulkInsertSetlistEntries`
- [ ] Update data-loader.ts to use quota checks
- [ ] Update sync.ts with quota-aware operations
- [ ] Integration test bulk operations

### Phase 4
- [ ] Add detailed error event types
- [ ] Create DexieTelemetry class
- [ ] Hook telemetry in initialization
- [ ] Export metrics dashboard

### Phase 5
- [ ] Write comprehensive error scenario tests
- [ ] Cross-tab integration tests
- [ ] Quota exceeded stress tests
- [ ] Version change + concurrent operations tests

---

## Success Metrics

After implementation:

1. **QuotaExceededError**: 0 silent failures
   - All quota-related operations provide feedback
   - Partial success cases handled gracefully

2. **Cross-Tab Consistency**: 0 data mismatches
   - User mutations sync within 100ms across tabs
   - Cache invalidation verified

3. **Error Recovery**: 95%+ automatic recovery rate
   - TransactionInactiveError automatically retried
   - Network errors recovered with backoff

4. **User Experience**:
   - No "unexpected errors" messages
   - All errors have user-friendly messages
   - Graceful degradation when possible

---

## Risk Mitigation

### Data Loss Prevention
- Quota checks prevent write failures
- Partial success handling preserves data
- Transaction rollback on errors

### Cross-Tab Corruption
- BroadcastChannel coordinates mutations
- Cache invalidation prevents stale reads
- Version tracking prevents conflicts

### Silent Failures
- All error paths dispatch events
- Telemetry tracks error rates
- Monitoring alerts on anomalies

