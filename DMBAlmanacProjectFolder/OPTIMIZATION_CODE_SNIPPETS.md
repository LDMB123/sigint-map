# IndexedDB Optimization - Code Snippets & Examples

## Ready-to-Implement Optimizations

### 1. Add scheduler.yield() to Bulk Operations

**File:** `/src/lib/db/dexie/queries.ts`

**Before:**
```typescript
export async function bulkUpdateShows(
  updates: Array<{ key: number; changes: Partial<DexieShow> }>,
  chunkSize: number = BULK_CHUNK_SIZE
): Promise<number> {
  const db = getDb();
  let updated = 0;

  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await db.transaction('rw', db.shows, async () => {
      for (const { key, changes } of chunk) {
        await db.shows.update(key, changes);
      }
    });
    updated += chunk.length;
    // NO YIELD - BLOCKS MAIN THREAD!
  }

  const { invalidateCache } = await import('./cache');
  invalidateCache(['shows']);

  return updated;
}
```

**After:**
```typescript
// Add helper function at top of file
async function yieldToMainThread(): Promise<void> {
  if (typeof scheduler !== 'undefined' && 'yield' in scheduler) {
    await scheduler.yield();
  } else {
    await new Promise(r => setTimeout(r, 0));
  }
}

export async function bulkUpdateShows(
  updates: Array<{ key: number; changes: Partial<DexieShow> }>,
  chunkSize: number = BULK_CHUNK_SIZE
): Promise<number> {
  const db = getDb();
  let updated = 0;

  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await db.transaction('rw', db.shows, async () => {
      for (const { key, changes } of chunk) {
        await db.shows.update(key, changes);
      }
    });
    updated += chunk.length;

    // ADDED: Yield every 2 chunks
    if ((i / chunkSize) % 2 === 0) {
      await yieldToMainThread();
    }
  }

  const { invalidateCache } = await import('./cache');
  invalidateCache(['shows']);

  return updated;
}
```

**Apply Same Pattern to:**
- `bulkDeleteByIds()` (line 1456-1477)

---

### 2. Add Deprecation Warnings to Unbounded Stores

**File:** `/src/lib/stores/dexie.ts`

**Before:**
```typescript
export const allSongs = createLiveQueryStore<DexieSong[]>(async () => {
  const db = await getDb();
  return db.transaction('r', db.songs, () => db.songs.orderBy('sortTitle').toArray());
});
```

**After:**
```typescript
/**
 * @deprecated Use createPaginatedSongsStore(pageSize) instead for better performance
 * WARNING: This store loads ALL songs into memory (~1500 objects, 100KB+)
 * Use pagination for production applications
 */
export const allSongs = createLiveQueryStore<DexieSong[]>(async () => {
  console.warn(
    '[DEPRECATED] allSongs store loads all songs into memory. ' +
    'Use createPaginatedSongsStore(50) instead for better performance.'
  );

  const db = await getDb();
  return db.transaction('r', db.songs, () =>
    // Add reasonable default limit
    db.songs.orderBy('sortTitle').limit(100).toArray()
  );
});
```

**Apply Same Pattern to:**
- `allShows` (line 294-297)
- `allVenues` (line 178-181)
- `allGuests` (line 397-400)

---

### 3. Add Memory Monitoring to databaseHealth Store

**File:** `/src/lib/stores/dexie.ts`

**Before:**
```typescript
export interface DatabaseHealthStatus {
  isOpen: boolean;
  hasFailed: boolean;
  version: number;
  name: string;
  lastCheck: number;
  storageUsage?: number;
  storageQuota?: number;
  percentUsed?: number;
  isPersisted?: boolean;
}
```

**After:**
```typescript
export interface DatabaseHealthStatus {
  isOpen: boolean;
  hasFailed: boolean;
  version: number;
  name: string;
  lastCheck: number;
  storageUsage?: number;
  storageQuota?: number;
  percentUsed?: number;
  isPersisted?: boolean;
  // NEW: Table-by-table breakdown
  tableSizes?: Record<string, number>;
  cacheStats?: {
    size: number;
    maxEntries: number;
    expiredCount: number;
  };
}

async function checkHealth(): Promise<DatabaseHealthStatus> {
  if (!isBrowser) {
    return { isOpen: false, hasFailed: false, version: 0, name: '', lastCheck: 0 };
  }

  try {
    const db = await getDb();
    const connectionState = db.getConnectionState();

    // Get storage info
    let storageInfo: { usage: number; quota: number; percentUsed: number } | undefined;
    let isPersisted: boolean | undefined;

    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      storageInfo = {
        usage: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
        percentUsed: estimate.quota ? ((estimate.usage ?? 0) / estimate.quota) * 100 : 0,
      };
    }

    if (navigator.storage?.persisted) {
      isPersisted = await navigator.storage.persisted();
    }

    // NEW: Get table-by-table breakdown
    const tableSizes: Record<string, number> = {};
    const tableNames = ['shows', 'songs', 'venues', 'guests', 'setlistEntries'];

    for (const tableName of tableNames) {
      try {
        const table = db.table(tableName);
        const count = await table.count();
        const sample = await table.limit(10).toArray();
        const avgSize = sample.length ? JSON.stringify(sample).length / sample.length : 0;
        tableSizes[tableName] = Math.round(count * avgSize);
      } catch {
        // Ignore errors for missing tables
      }
    }

    // NEW: Get cache statistics
    const cacheStats = getCacheStats();

    return {
      ...connectionState,
      lastCheck: Date.now(),
      storageUsage: storageInfo?.usage,
      storageQuota: storageInfo?.quota,
      percentUsed: storageInfo?.percentUsed,
      isPersisted,
      tableSizes,
      cacheStats,
    };
  } catch (error) {
    console.error('[DexieHealth] Health check failed:', error);
    return {
      isOpen: false,
      hasFailed: true,
      version: 0,
      name: 'dmb-almanac',
      lastCheck: Date.now(),
    };
  }
}
```

---

### 4. Implement Venue Pagination

**File:** `/src/lib/db/dexie/queries.ts` (add after line 1108)

```typescript
/**
 * Get paginated venues using cursor-based pagination.
 * More memory-efficient than offset-based pagination for large datasets.
 */
export async function getVenuesPaginated(
  pageSize: number = 50,
  cursor?: string
): Promise<PaginatedResult<DexieVenue>> {
  const db = getDb();

  let collection = db.venues.orderBy('name');

  // If cursor provided, start after that name
  if (cursor) {
    collection = db.venues.where('name').above(cursor);
  }

  const items = await collection.limit(pageSize + 1).toArray();
  const hasMore = items.length > pageSize;

  if (hasMore) {
    items.pop(); // Remove the extra item
  }

  const lastItem = items[items.length - 1];

  return {
    items,
    hasMore,
    cursor: lastItem?.name ?? null,
  };
}

/**
 * Get paginated guests using cursor-based pagination.
 */
export async function getGuestsPaginated(
  pageSize: number = 50,
  cursor?: string
): Promise<PaginatedResult<DexieGuest>> {
  const db = getDb();

  let collection = db.guests.orderBy('name');

  if (cursor) {
    collection = db.guests.where('name').above(cursor);
  }

  const items = await collection.limit(pageSize + 1).toArray();
  const hasMore = items.length > pageSize;

  if (hasMore) {
    items.pop();
  }

  const lastItem = items[items.length - 1];

  return {
    items,
    hasMore,
    cursor: lastItem?.name ?? null,
  };
}
```

---

### 5. Add Performance Monitoring Utility

**File:** `/src/lib/db/dexie/performance-monitor.ts` (new file)

```typescript
/**
 * Performance monitoring utilities for IndexedDB queries
 * Tracks query durations and identifies slow operations
 */

export interface QueryMetric {
  name: string;
  duration: number;
  recordCount?: number;
  timestamp: number;
  slow: boolean;
}

class PerformanceMonitor {
  private metrics: QueryMetric[] = [];
  private readonly maxMetrics = 1000;
  private readonly slowThreshold = 100; // ms

  /**
   * Record a query metric
   */
  recordQuery(
    name: string,
    duration: number,
    recordCount?: number
  ): void {
    const metric: QueryMetric = {
      name,
      duration,
      recordCount,
      timestamp: Date.now(),
      slow: duration > this.slowThreshold,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (metric.slow) {
      console.warn(`[SlowQuery] ${name}: ${duration.toFixed(2)}ms`, {
        recordCount,
        slow: true,
      });
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalQueries: number;
    slowQueries: number;
    avgDuration: number;
    slowByQuery: Record<string, { count: number; avgDuration: number }>;
  } {
    const slowQueries = this.metrics.filter(m => m.slow).length;
    const avgDuration = this.metrics.length
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length
      : 0;

    const slowByQuery: Record<string, { count: number; avgDuration: number }> = {};
    for (const metric of this.metrics.filter(m => m.slow)) {
      if (!slowByQuery[metric.name]) {
        slowByQuery[metric.name] = { count: 0, avgDuration: 0 };
      }
      slowByQuery[metric.name].count++;
      slowByQuery[metric.name].avgDuration += metric.duration;
    }

    // Calculate averages
    for (const key in slowByQuery) {
      slowByQuery[key].avgDuration /= slowByQuery[key].count;
    }

    return {
      totalQueries: this.metrics.length,
      slowQueries,
      avgDuration,
      slowByQuery,
    };
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// Singleton instance
let monitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitor) {
    monitor = new PerformanceMonitor();
  }
  return monitor;
}

/**
 * Wrapper to auto-measure query duration
 */
export async function measureQuery<T>(
  name: string,
  queryFn: () => Promise<T>,
  recordCount?: () => number
): Promise<T> {
  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    const count = recordCount?.();
    getPerformanceMonitor().recordQuery(name, duration, count);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Query Error] ${name}: ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}
```

**Usage:**
```typescript
// In queries.ts
import { measureQuery } from './performance-monitor';

export async function getShowsForSong(songId: number): Promise<DexieShow[]> {
  return measureQuery(
    `getShowsForSong(${songId})`,
    async () => {
      const db = getDb();
      return db.transaction('r', [db.setlistEntries, db.shows], async () => {
        const entries = await db.setlistEntries.where('songId').equals(songId).toArray();
        const showIds = [...new Set(entries.map((e) => e.showId))];

        if (showIds.length === 0) return [];

        const shows = await db.shows.bulkGet(showIds);
        return shows
          .filter((s): s is DexieShow => s !== undefined)
          .sort((a, b) => b.date.localeCompare(a.date));
      });
    },
    () => showIds.length
  );
}
```

---

### 6. Add Storage Quota Cleanup

**File:** `/src/lib/db/dexie/quota-manager.ts` (new file)

```typescript
/**
 * Storage quota management and cleanup strategies
 */

import { getDb } from './db';

export async function checkStorageHealth(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
  level: 'ok' | 'warning' | 'critical';
}> {
  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

  let level: 'ok' | 'warning' | 'critical' = 'ok';
  if (percentUsed > 95) level = 'critical';
  else if (percentUsed > 80) level = 'warning';

  return { usage, quota, percentUsed, level };
}

/**
 * Automatically cleanup storage when quota is high
 */
export async function cleanupIfNeeded(threshold = 80): Promise<number> {
  const health = await checkStorageHealth();
  if (health.percentUsed < threshold) return 0;

  const db = getDb();
  let freedBytes = 0;

  console.warn(`[QuotaManager] Storage at ${health.percentUsed.toFixed(1)}%, cleaning up...`);

  try {
    // Strategy 1: Clear cache entries (least destructive)
    const { clearAllCaches } = await import('./cache');
    clearAllCaches();
    console.debug('[QuotaManager] Cleared query cache');

    // Strategy 2: Delete old completed mutations
    const completed = await db.offlineMutationQueue
      .where('status')
      .equals('completed')
      .sortBy('createdAt');

    if (completed.length > 0) {
      const idsToDelete = completed.slice(0, Math.floor(completed.length / 2))
        .map(m => m.id)
        .filter((id): id is number => id !== undefined);

      await db.offlineMutationQueue.bulkDelete(idsToDelete);
      freedBytes += completed.length * 100; // Rough estimate
      console.debug(`[QuotaManager] Deleted ${idsToDelete.length} old mutations`);
    }

    // Check health again
    const newHealth = await checkStorageHealth();
    console.info(`[QuotaManager] Storage reduced to ${newHealth.percentUsed.toFixed(1)}%`);

    return freedBytes;
  } catch (error) {
    console.error('[QuotaManager] Cleanup failed:', error);
    throw error;
  }
}

/**
 * Estimate storage needed for a table
 */
export async function estimateTableSize(tableName: string): Promise<number> {
  const db = getDb();
  const table = db.table(tableName);

  const count = await table.count();
  const sample = await table.limit(100).toArray();

  if (sample.length === 0) return 0;

  const sampleSize = JSON.stringify(sample).length;
  const avgSize = sampleSize / sample.length;

  return Math.round(count * avgSize);
}
```

---

### 7. Create Performance Dashboard Component

**File:** `/src/lib/components/DatabaseHealthDashboard.svelte` (new file)

```svelte
<script lang="ts">
  import { databaseHealth, storageWarning } from '$lib/stores/dexie';
  import { getCacheStats } from '$lib/db/dexie/cache';
  import { checkStorageHealth } from '$lib/db/dexie/quota-manager';

  let storageHealth: Awaited<ReturnType<typeof checkStorageHealth>> | null = null;

  async function refreshHealth() {
    storageHealth = await checkStorageHealth();
    await databaseHealth.refresh();
  }

  onMount(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="dashboard">
  <h2>Database Health</h2>

  <!-- Storage Usage -->
  {#if storageHealth}
    <div class="metric">
      <label>Storage Usage</label>
      <div class="bar">
        <div
          class="fill {storageHealth.level}"
          style="width: {storageHealth.percentUsed}%"
        ></div>
      </div>
      <p>
        {(storageHealth.usage / 1024 / 1024).toFixed(1)}MB /
        {(storageHealth.quota / 1024 / 1024).toFixed(1)}MB
        ({storageHealth.percentUsed.toFixed(1)}%)
      </p>
      {#if storageHealth.level === 'critical'}
        <p class="warning">⚠️ Storage critical - cleanup recommended</p>
      {:else if storageHealth.level === 'warning'}
        <p class="warning">⚠️ Storage high - monitor usage</p>
      {/if}
    </div>
  {/if}

  <!-- Database Health -->
  {#if $databaseHealth}
    <div class="metric">
      <label>Database Status</label>
      <p>
        {$databaseHealth.isOpen ? '✓ Open' : '✗ Closed'}
        {$databaseHealth.hasFailed ? '(Failed)' : ''}
      </p>
      <p>Version: {$databaseHealth.version}</p>
      {#if $databaseHealth.isPersisted}
        <p>✓ Persistent storage enabled</p>
      {/if}
    </div>

    <!-- Table Breakdown -->
    {#if $databaseHealth.tableSizes}
      <div class="metric">
        <label>Table Sizes</label>
        <ul>
          {#each Object.entries($databaseHealth.tableSizes) as [name, size]}
            <li>{name}: {(size / 1024).toFixed(1)}KB</li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Cache Stats -->
    {#if $databaseHealth.cacheStats}
      <div class="metric">
        <label>Query Cache</label>
        <p>
          {$databaseHealth.cacheStats.size} / {$databaseHealth.cacheStats.maxEntries} entries
        </p>
        <p>{$databaseHealth.cacheStats.expiredCount} expired</p>
      </div>
    {/if}
  {/if}

  <button on:click={refreshHealth}>Refresh</button>
</div>

<style>
  .dashboard {
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .metric {
    margin-bottom: 1.5rem;
  }

  label {
    font-weight: bold;
    display: block;
    margin-bottom: 0.5rem;
  }

  .bar {
    height: 20px;
    background: #ddd;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .fill {
    height: 100%;
    transition: width 0.3s;

    &.ok {
      background: #4caf50;
    }

    &.warning {
      background: #ff9800;
    }

    &.critical {
      background: #f44336;
    }
  }

  .warning {
    color: #ff9800;
    font-weight: bold;
  }

  ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: #0056b3;
    }
  }
</style>
```

---

## Testing Performance

```typescript
// tests/performance.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '$lib/db/dexie/db';
import * as queries from '$lib/db/dexie/queries';

describe('IndexedDB Performance', () => {
  let db: ReturnType<typeof getDb>;

  beforeAll(async () => {
    db = getDb();
    await db.open();
  });

  it('should complete single ID lookup in < 5ms', async () => {
    const start = performance.now();
    await queries.getSongById(1);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5);
  });

  it('should complete indexed range query in < 50ms', async () => {
    const start = performance.now();
    await queries.getShowsByVenue(1);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });

  it('should complete global search in < 300ms', async () => {
    const start = performance.now();
    await queries.globalSearch('phish', 10);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(300);
  });

  it('should complete bulk insert of 1000 items in < 1000ms', async () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: 10000 + i,
      date: '2025-01-01',
      venueId: 1,
      tourId: 1,
      notes: null,
      soundcheck: null,
      attendanceCount: null,
      rarityIndex: null,
      songCount: 15,
      year: 2025,
      venue: { /* ... */ },
      tour: { /* ... */ },
    }));

    const start = performance.now();
    await queries.bulkInsertShows(items, 500);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000);
  });

  it('memory should not spike above 100MB during operations', async () => {
    const before = (performance.memory as any).usedJSHeapSize;

    // Simulate typical operations
    await queries.getAllShows();
    await queries.getAllSongs();
    await queries.globalSearch('song', 20);

    const after = (performance.memory as any).usedJSHeapSize;
    const increase = after - before;

    expect(increase).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});
```

---

## Summary

These code snippets provide:
- ✓ Main thread yield improvements (INP)
- ✓ Deprecation warnings (code cleanup)
- ✓ Memory monitoring (quota management)
- ✓ Pagination helpers (memory efficiency)
- ✓ Performance tracking (debugging)
- ✓ Storage cleanup (quota management)
- ✓ Dashboard component (visibility)
- ✓ Comprehensive tests (regression prevention)

Implement in order of priority for maximum impact with minimal effort.
