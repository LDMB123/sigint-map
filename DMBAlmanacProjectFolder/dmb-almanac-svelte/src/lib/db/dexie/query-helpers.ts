/**
 * DMB Almanac - Dexie Query Helpers
 *
 * Reusable utility functions that reduce duplication across queries.ts
 * These helpers encapsulate common patterns:
 * - Caching with TTL management
 * - Year aggregation and grouping
 * - WASM bridge acceleration with fallback
 * - Search query execution
 * - Bulk operations with chunking
 * - Transaction management
 * - Top N queries by numeric fields
 * - Safe query execution with error handling
 * - Related entity fetching through join tables
 */

import Dexie, { type EntityTable, type Table } from 'dexie';
import { getQueryCache, CacheTTL } from './cache';
import { getDb } from './db';
import { getWasmBridge } from '$lib/wasm/bridge';
import type { SongWithCount } from '$lib/wasm/queries';
import type {
  DexieSetlistEntry,
  DexieShow,
} from './schema';

// ==================== TYPES ====================

/**
 * Result of a "top N" query with entity and count
 */
export interface TopResult<T> {
  entity: T;
  count: number;
}

/**
 * Year count aggregation result
 */
export interface YearCount {
  year: number;
  count: number;
}

/**
 * Options for cached queries
 */
export interface CachedQueryOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Whether to skip cache and always execute query */
  skipCache?: boolean;
}

/**
 * Options for search queries
 */
export interface SearchOptions {
  /** Maximum results to return */
  limit?: number;
  /** Field to sort results by (for secondary sort) */
  sortBy?: string;
  /** Sort in descending order */
  descending?: boolean;
}

// ==================== CACHING HELPERS ====================

/**
 * Execute a cached query with automatic TTL-based expiration.
 * Checks cache first, executes queryFn if miss, then caches result.
 *
 * Usage:
 * ```
 * const stats = await cachedQuery(
 *   CacheKeys.songStats(),
 *   CacheTTL.STATS,
 *   async () => {
 *     const total = await db.songs.count();
 *     return { total };
 *   }
 * );
 * ```
 */
export async function cachedQuery<T>(
  cacheKey: string,
  ttl: number,
  queryFn: () => Promise<T>
): Promise<T> {
  const cache = getQueryCache();

  // Check cache first
  const cached = cache.get<T>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Execute query and cache result
  const result = await queryFn();
  cache.set(cacheKey, result, ttl);

  return result;
}

/**
 * Execute a cached query with options object for more control.
 *
 * @param cacheKey - Unique cache key for this query
 * @param queryFn - Async function that executes the query
 * @param options - Cache options (ttl, skipCache)
 * @returns Query result
 */
export async function cachedQueryWithOptions<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  options: CachedQueryOptions = {}
): Promise<T> {
  const { ttl = CacheTTL.STATS, skipCache = false } = options;

  if (skipCache) {
    return queryFn();
  }

  return cachedQuery(cacheKey, ttl, queryFn);
}

// ==================== YEAR AGGREGATION HELPERS ====================

/**
 * Aggregate items by year from a collection with `year` field.
 * Returns sorted array of {year, count} pairs (newest first).
 *
 * For large datasets (>10k items), consider using aggregateByYearAsync with yielding.
 *
 * Usage:
 * ```
 * const shows = await db.shows.toArray();
 * const yearCounts = aggregateByYear(shows);
 * // => [{year: 2024, count: 42}, {year: 2023, count: 38}, ...]
 * ```
 */
export function aggregateByYear<T extends { year: number }>(
  items: T[]
): Array<{ year: number; count: number }> {
  const yearCounts = new Map<number, number>();

  for (const item of items) {
    yearCounts.set(item.year, (yearCounts.get(item.year) ?? 0) + 1);
  }

  return Array.from(yearCounts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
}

/**
 * Aggregate items by year with yielding for large datasets (async version).
 * Yields every 1000 items to maintain INP responsiveness.
 *
 * Use this for:
 * - Large datasets (>10k items)
 * - User-initiated aggregations where responsiveness matters
 * - Operations that might block the UI
 *
 * @param items - Array of items with year field
 * @returns Promise resolving to sorted array of {year, count} pairs
 *
 * @example
 * ```typescript
 * const allEntries = await db.setlistEntries.toArray();
 * const yearCounts = await aggregateByYearAsync(allEntries);
 * ```
 */
export async function aggregateByYearAsync<T extends { year: number }>(
  items: T[]
): Promise<Array<{ year: number; count: number }>> {
  const yearCounts = new Map<number, number>();
  // PERF: Cache length outside loop condition
  const len = items.length;

  // Yield every 1000 items to prevent long tasks
  for (let i = 0; i < len; i++) {
    // PERF: Cache items[i] to avoid repeated array indexing
    const item = items[i];
    yearCounts.set(item.year, (yearCounts.get(item.year) ?? 0) + 1);

    if (i % 1000 === 0 && i > 0) {
      if (typeof scheduler !== 'undefined' && 'yield' in scheduler) {
        await scheduler.yield();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  return Array.from(yearCounts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
}

/**
 * Aggregate entries by year into a Map for efficient lookup.
 * Returns Map<year, count> in descending year order.
 */
export function aggregateByYearMap<T extends { year: number }>(items: T[]): Map<number, number> {
  const yearCounts = new Map<number, number>();

  for (const item of items) {
    yearCounts.set(item.year, (yearCounts.get(item.year) ?? 0) + 1);
  }

  return yearCounts;
}

/**
 * Aggregate entries by year, grouping shows by unique year->id mapping.
 * Useful for deduplicating multiple appearances per show (e.g., guest appearances).
 *
 * Usage:
 * ```
 * const appearances = await db.guestAppearances.toArray();
 * const yearCounts = aggregateByYearWithUniqueShows(appearances);
 * // => [{year: 2024, count: 3}, ...]
 * ```
 */
export function aggregateByYearWithUniqueShows<
  T extends { year: number; showId: number }
>(items: T[]): Array<{ year: number; count: number }> {
  const showsByYear = new Map<number, Set<number>>();

  for (const item of items) {
    const shows = showsByYear.get(item.year) ?? new Set();
    shows.add(item.showId);
    showsByYear.set(item.year, shows);
  }

  return Array.from(showsByYear.entries())
    .map(([year, shows]) => ({ year, count: shows.size }))
    .sort((a, b) => b.year - a.year);
}

// ==================== TOP N QUERY HELPERS ====================

/**
 * Get top N entities by a numeric field value.
 * Uses indexed retrieval with .where().above(0) for efficiency.
 *
 * @param table - Dexie table to query
 * @param field - Numeric field to sort by (must be indexed)
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of entities with their counts
 *
 * @example
 * ```typescript
 * const topSongs = await getTopByField(
 *   db.songs,
 *   'totalPerformances',
 *   10
 * );
 * // Returns: [{ entity: Song, count: 500 }, ...]
 * ```
 */
export async function getTopByField<T extends Record<string, unknown>>(
  table: EntityTable<T, 'id'> | Table<T>,
  field: keyof T & string,
  limit: number = 10
): Promise<Array<TopResult<T>>> {
  const entities = await table
    .where(field)
    .above(0)
    .reverse()
    .limit(limit)
    .toArray();

  return entities.map((entity) => ({
    entity,
    count: entity[field] as number,
  }));
}

/**
 * Get top N entities by a numeric field with caching.
 *
 * @param table - Dexie table to query
 * @param field - Numeric field to sort by (must be indexed)
 * @param limit - Maximum number of results
 * @param cacheKey - Cache key for this query
 * @param ttl - Cache TTL in milliseconds (default: TOP_LISTS TTL)
 * @returns Array of entities with their counts
 */
export async function getTopByFieldCached<T extends Record<string, unknown>>(
  table: EntityTable<T, 'id'> | Table<T>,
  field: keyof T & string,
  limit: number,
  cacheKey: string,
  ttl: number = CacheTTL.TOP_LISTS
): Promise<Array<TopResult<T>>> {
  return cachedQuery(cacheKey, ttl, () => getTopByField(table, field, limit));
}

// ==================== SEARCH HELPERS (NEW) ====================

/**
 * Search entities by their searchText field using prefix matching.
 * Uses startsWithIgnoreCase for O(log n) performance with index.
 *
 * @param table - Dexie table to search
 * @param query - Search query string
 * @param limit - Maximum results to return (default: 20)
 * @returns Array of matching entities
 *
 * @example
 * ```typescript
 * const songs = await searchByText(db.songs, 'crash', 20);
 * ```
 */
export async function searchByText<T extends { id: number; searchText?: string }>(
  table: EntityTable<T, 'id'> | Table<T>,
  query: string,
  limit: number = 20
): Promise<T[]> {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase().trim();

  return table
    .where('searchText' as any)
    .startsWithIgnoreCase(searchTerm)
    .limit(limit)
    .toArray();
}

/**
 * Search entities with sorting by a popularity field.
 * Useful for showing most relevant results first.
 *
 * @param table - Dexie table to search
 * @param query - Search query string
 * @param sortField - Field to sort results by (descending)
 * @param limit - Maximum results to return (default: 20)
 * @returns Array of matching entities sorted by popularity
 */
export async function searchByTextWithSort<T extends { id: number; searchText?: string }>(
  table: EntityTable<T, 'id'> | Table<T>,
  query: string,
  sortField: keyof T & string,
  limit: number = 20
): Promise<T[]> {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase().trim();

  const results = await table
    .where('searchText' as any)
    .startsWithIgnoreCase(searchTerm)
    .limit(limit)
    .sortBy(sortField);

  // Reverse for descending order (most popular first)
  return results.reverse();
}

// ==================== SAFE QUERY EXECUTION ====================

/**
 * Execute a query with error handling, retry logic, and fallback value.
 * CRITICAL FIX: Added retry mechanism for transaction deadlocks and timeout errors.
 * Logs errors to the database error handler and returns fallback on final failure.
 *
 * @param queryFn - Async function that executes the query
 * @param fallback - Value to return if query fails
 * @param context - Error context for logging (e.g., function name)
 * @param maxRetries - Maximum retry attempts for recoverable errors (default: 3)
 * @returns Query result or fallback value
 *
 * @example
 * ```typescript
 * const songs = await safeQuery(
 *   () => db.songs.toArray(),
 *   [],
 *   'getAllSongs'
 * );
 * ```
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  context: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable (transaction deadlock, timeout, busy)
      const isRetryable =
        error instanceof Error &&
        (error.name === 'AbortError' ||
         error.name === 'TransactionInactiveError' ||
         error.message?.includes('deadlock') ||
         error.message?.includes('timeout') ||
         error.message?.includes('busy'));

      // If not retryable or max retries reached, bail out
      if (!isRetryable || attempt === maxRetries) {
        getDb().handleError(error, context);
        return fallback;
      }

      // Exponential backoff: 10ms, 20ms, 40ms
      const backoffMs = 10 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, backoffMs));

      console.debug(`[safeQuery] Retrying ${context} (attempt ${attempt + 1}/${maxRetries}) after ${backoffMs}ms`);
    }
  }

  // Should never reach here, but TypeScript needs it
  getDb().handleError(lastError, context);
  return fallback;
}

/**
 * Execute a query with optional transformation on success.
 * Useful for queries that need post-processing.
 *
 * @param queryFn - Async function that executes the query
 * @param transformFn - Function to transform successful result
 * @param fallback - Value to return if query fails
 * @param context - Error context for logging
 * @returns Transformed result or fallback value
 */
export async function safeQueryWithTransform<T, R>(
  queryFn: () => Promise<T>,
  transformFn: (result: T) => R,
  fallback: R,
  context: string
): Promise<R> {
  try {
    const result = await queryFn();
    return transformFn(result);
  } catch (error) {
    getDb().handleError(error, context);
    return fallback;
  }
}

// ==================== WASM BRIDGE HELPERS ====================

/**
 * Execute with WASM acceleration, fallback to JS.
 * Calls WASM bridge if available, returns fallback result on error.
 *
 * Usage:
 * ```
 * const result = await wasmOrFallback<SongWithCount[]>(
 *   'count_openers_by_year',
 *   [JSON.stringify(entries), year],
 *   () => countSongsFromEntriesJS(entries, limit)
 * );
 * ```
 */
export async function wasmOrFallback<T>(
  wasmMethod: string,
  wasmArgs: unknown[],
  fallbackFn: () => Promise<T> | T
): Promise<T> {
  const bridge = getWasmBridge?.();
  if (!bridge) {
    return fallbackFn();
  }

  try {
    // Cast wasmMethod to any since it's a dynamic string parameter
    const result = await bridge.call<string>(wasmMethod as any, ...wasmArgs);

    if (result.success && result.data) {
      const parsed =
        typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
      return parsed as T;
    }
  } catch (error) {
    console.warn(`[WASM] ${wasmMethod} failed, using fallback:`, error);
  }

  return fallbackFn();
}

/**
 * Helper to count songs from setlist entries (JS fallback for WASM).
 * Returns top N songs by performance count.
 */
export function countSongsFromEntries(
  entries: DexieSetlistEntry[],
  limit: number
): SongWithCount[] {
  const songCounts = new Map<number, number>();

  for (const entry of entries) {
    songCounts.set(entry.songId, (songCounts.get(entry.songId) ?? 0) + 1);
  }

  return [...songCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([songId, count]) => ({ songId, count }));
}

// ==================== SEARCH HELPERS ====================

/**
 * Execute a startsWithIgnoreCase search on a table with error handling.
 * Returns empty array on error (graceful degradation).
 *
 * Usage:
 * ```
 * const songs = await searchTableByPrefix<DexieSong>(
 *   'searchSongs',
 *   db.songs,
 *   'searchText',
 *   query,
 *   'totalPerformances',
 *   20
 * );
 * ```
 */
export async function searchTableByPrefix<T extends { [key: string]: unknown }>(
  functionName: string,
  collection: Dexie.Table<T>,
  indexName: string,
  query: string,
  sortBy?: keyof T,
  limit = 20
): Promise<T[]> {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase().trim();
  const db = getDb();

  try {
    // Ensure sortBy is a string for Dexie's sortBy method
    const sortKey = (sortBy ?? indexName) as string;

    const results = await collection
      .where(indexName)
      .startsWithIgnoreCase(searchTerm)
      .limit(limit)
      .sortBy(sortKey);

    return results.reverse();
  } catch (error) {
    db.handleError(error, functionName);
    return [];
  }
}

// ==================== BULK OPERATION HELPERS ====================

const BULK_CHUNK_SIZE = 500;

/**
 * Execute bulk operation with chunking, error handling, and yielding for INP optimization.
 * Splits large arrays into chunks to prevent transaction timeouts.
 * Yields between chunks using scheduler.yield() to maintain UI responsiveness.
 * Invalidates cache after completion.
 *
 * INP optimization:
 * - Yields every 2 chunks (configurable) to stay below 50ms blocking time
 * - Uses scheduler.yield() on Chrome 129+ for ~50% faster yielding
 * - On Apple Silicon, allows P-cores to handle user input during bulk operations
 *
 * Usage:
 * ```
 * const inserted = await bulkOperation<DexieShow>(
 *   'bulkInsertShows',
 *   shows,
 *   async (db, chunk) => {
 *     await db.shows.bulkAdd(chunk);
 *   },
 *   ['shows']
 * );
 * ```
 */
export async function bulkOperation<T>(
  operationName: string,
  items: T[],
  executor: (
    db: ReturnType<typeof getDb>,
    chunk: T[],
    index: number
  ) => Promise<void>,
  tablesToInvalidate: Array<
    'songs' | 'venues' | 'shows' | 'guests' | 'tours' | 'setlistEntries' | 'liberation'
  > = [],
  chunkSize: number = BULK_CHUNK_SIZE
): Promise<number> {
  const db = getDb();
  let processed = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkIndex = Math.floor(i / chunkSize);

    try {
      await executor(db, chunk, chunkIndex);
      processed += chunk.length;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error(`[Queries] Storage quota exceeded during ${operationName}:`, {
          processed,
          attempted: items.length,
          batchIndex: chunkIndex,
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dexie-quota-exceeded', {
              detail: {
                entity: tablesToInvalidate[0] ?? 'unknown',
                loaded: processed,
                attempted: items.length,
              },
            })
          );
        }
      }

      throw error;
    }

    // Yield every 2 chunks to maintain INP responsiveness
    // This keeps blocking time under 50ms while minimizing yield overhead
    if (chunkIndex % 2 === 0 && i + chunkSize < items.length) {
      if (typeof scheduler !== 'undefined' && 'yield' in scheduler) {
        await scheduler.yield();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  // Invalidate cache after bulk operation
  if (tablesToInvalidate.length > 0) {
    const { invalidateCache } = await import('./cache');
    invalidateCache(tablesToInvalidate);
  }

  return processed;
}

/**
 * Bulk insert with automatic chunking.
 * Provides type-safe wrapper around bulkOperation.
 */
export async function bulkInsert<T>(
  operationName: string,
  collection: Dexie.Table<T>,
  items: T[],
  tableName: 'songs' | 'venues' | 'shows' | 'guests' | 'tours' | 'setlistEntries',
  chunkSize?: number
): Promise<number> {
  return bulkOperation(
    operationName,
    items,
    async (db, chunk) => {
      await db.transaction('rw', collection, async () => {
        await collection.bulkAdd(chunk);
      });
    },
    [tableName],
    chunkSize
  );
}

/**
 * Bulk delete by IDs with automatic chunking.
 */
export async function bulkDelete<
  T extends 'shows' | 'songs' | 'setlistEntries' | 'venues'
>(table: T, ids: number[], chunkSize?: number): Promise<number> {
  const db = getDb();

  return bulkOperation(
    `bulkDelete${table}`,
    ids,
    async (_, chunk) => {
      await db.transaction('rw', db[table], async () => {
        await db[table].bulkDelete(chunk);
      });
    },
    [table],
    chunkSize
  );
}

/**
 * Bulk update with automatic chunking.
 */
export async function bulkUpdate<T extends { key: number; changes: Partial<DexieShow> }>(
  updates: T[],
  chunkSize?: number
): Promise<number> {
  const db = getDb();

  return bulkOperation(
    'bulkUpdateShows',
    updates,
    async (_, chunk) => {
      await db.transaction('rw', db.shows, async () => {
        for (const { key, changes } of chunk as any) {
          await db.shows.update(key, changes);
        }
      });
    },
    ['shows'],
    chunkSize
  );
}

// ==================== PAGINATION HELPERS ====================

/**
 * Result type for paginated queries.
 */
export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  cursor: string | null;
}

/**
 * Execute paginated query using cursor-based pagination.
 * More memory-efficient than offset-based for large datasets.
 *
 * Usage:
 * ```
 * const result = await paginatedQuery(
 *   db.shows.orderBy('date').reverse(),
 *   (collection, cursor) => {
 *     if (cursor) {
 *       return collection.where('date').below(cursor).reverse();
 *     }
 *     return collection;
 *   },
 *   (item) => item.date,
 *   50
 * );
 * ```
 */
export async function paginatedQuery<T>(
  collection: Dexie.Collection<T, any>,
  cursorFn: (
    collection: Dexie.Collection<T, any>,
    cursor: string | undefined
  ) => Dexie.Collection<T, any>,
  getCursorValue: (item: T) => string | null,
  pageSize: number = 50,
  cursor?: string
): Promise<PaginatedResult<T>> {
  const collection2 = cursorFn(collection, cursor);
  const items = await collection2.limit(pageSize + 1).toArray();
  const hasMore = items.length > pageSize;

  if (hasMore) {
    items.pop();
  }

  const lastItem = items[items.length - 1];

  return {
    items,
    hasMore,
    cursor: lastItem ? getCursorValue(lastItem) : null,
  };
}

// ==================== STREAMING HELPERS ====================

/**
 * Stream items from a collection using cursor-based iteration.
 * Memory-efficient for processing large datasets.
 *
 * Usage:
 * ```
 * const count = await streamCollection(
 *   db.shows.orderBy('date'),
 *   (show) => {
 *     console.log(show.date);
 *   }
 * );
 * ```
 */
export async function streamCollection<T>(
  collection: Dexie.Collection<T, any>,
  callback: (item: T) => void | Promise<void>
): Promise<number> {
  let processed = 0;

  await collection.each(async (item) => {
    await callback(item);
    processed++;
  });

  return processed;
}

/**
 * Aggregate collection items by streaming them through the callback.
 * Useful for computing statistics without loading all data into memory.
 */
export async function aggregateByStreaming<T, R>(
  collection: Dexie.Collection<T, any>,
  aggregator: (accum: R, item: T) => void,
  initialValue: R
): Promise<R> {
  const result = initialValue;

  await collection.each((item) => {
    aggregator(result, item);
  });

  return result;
}

// ==================== TRANSACTION HELPERS ====================

/**
 * Execute a read-only transaction with bulkGet for efficiency.
 * Useful when you need data from multiple tables atomically.
 *
 * Usage:
 * ```
 * const shows = await readTransaction(['shows', 'venues'], async (db) => {
 *   const shows = await db.shows.toArray();
 *   const venues = await db.venues.toArray();
 *   return shows;
 * });
 * ```
 */
export async function readTransaction<T>(
  tableNames: string[],
  fn: (db: ReturnType<typeof getDb>) => Promise<T>
): Promise<T> {
  const db = getDb();
  const tables = tableNames.map((name) => db.table(name));

  return db.transaction('r', tables, () => fn(db));
}

/**
 * Safely get multiple items by IDs with deduplication.
 * Filters out undefined results.
 */
export async function getSafeByIds<T extends { id: number }>(
  table: Dexie.Table<T>,
  ids: number[]
): Promise<T[]> {
  const uniqueIds = [...new Set(ids)];
  const items = await table.bulkGet(uniqueIds);
  return items.filter((item): item is T => item !== undefined);
}

/**
 * Get show-indexed results safely.
 * Collects unique show IDs from entries, fetches shows, returns deduplicated results.
 */
export async function getShowsByIds(
  ids: number[],
  sortByDate = true
): Promise<DexieShow[]> {
  const uniqueIds = [...new Set(ids)];
  const shows = await getDb().shows.bulkGet(uniqueIds);
  const filtered = shows.filter((s): s is DexieShow => s !== undefined);

  if (sortByDate) {
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }

  return filtered;
}

// ==================== RELATIONSHIP HELPERS ====================

/**
 * Get related entities through a join table.
 * Efficiently fetches related entities using bulkGet.
 *
 * @param joinTable - Table containing the relationship
 * @param joinField - Field in join table that references the source entity
 * @param sourceId - ID of the source entity
 * @param targetTable - Table containing the target entities
 * @param targetIdField - Field in join table that references the target entity
 * @returns Array of related target entities
 *
 * @example
 * ```typescript
 * // Get all shows where a song was played
 * const shows = await getRelatedEntities(
 *   db.setlistEntries,
 *   'songId',
 *   songId,
 *   db.shows,
 *   'showId'
 * );
 * ```
 */
export async function getRelatedEntities<
  TJoin extends Record<string, unknown> & { id: number },
  TTarget extends { id: number },
>(
  joinTable: EntityTable<TJoin, 'id'> | Table<TJoin>,
  joinField: keyof TJoin & string,
  sourceId: number,
  targetTable: EntityTable<TTarget, 'id'> | Table<TTarget>,
  targetIdField: keyof TJoin & string
): Promise<TTarget[]> {
  const db = getDb();

  return db.transaction('r', [joinTable, targetTable], async () => {
    const joinEntries = await joinTable.where(joinField as any).equals(sourceId).toArray();
    const targetIds = [...new Set(joinEntries.map((e) => e[targetIdField] as number))];

    if (targetIds.length === 0) return [];

    const targets = await targetTable.bulkGet(targetIds as any);
    return targets.filter((t): t is TTarget => t !== undefined);
  });
}

/**
 * Get related entities with sorting.
 *
 * @param joinTable - Table containing the relationship
 * @param joinField - Field in join table that references the source entity
 * @param sourceId - ID of the source entity
 * @param targetTable - Table containing the target entities
 * @param targetIdField - Field in join table that references the target entity
 * @param sortField - Field to sort results by
 * @param descending - Sort in descending order (default: true)
 * @returns Array of related target entities, sorted
 */
export async function getRelatedEntitiesSorted<
  TJoin extends Record<string, unknown> & { id: number },
  TTarget extends Record<string, unknown> & { id: number },
>(
  joinTable: EntityTable<TJoin, 'id'> | Table<TJoin>,
  joinField: keyof TJoin & string,
  sourceId: number,
  targetTable: EntityTable<TTarget, 'id'> | Table<TTarget>,
  targetIdField: keyof TJoin & string,
  sortField: keyof TTarget & string,
  descending: boolean = true
): Promise<TTarget[]> {
  const entities = await getRelatedEntities(
    joinTable,
    joinField,
    sourceId,
    targetTable,
    targetIdField
  );

  entities.sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return descending ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return descending ? bVal - aVal : aVal - bVal;
    }

    return 0;
  });

  return entities;
}

// ==================== UTILITY HELPERS ====================

/**
 * Create a cache key from multiple parts.
 * Ensures consistent cache key formatting.
 *
 * @param parts - Parts of the cache key
 * @returns Formatted cache key
 *
 * @example
 * ```typescript
 * const key = makeCacheKey('song', songId, 'yearBreakdown');
 * // Returns: 'song:123:yearBreakdown'
 * ```
 */
export function makeCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

/**
 * Get unique values from an array of objects by a specific field.
 *
 * @param items - Array of objects
 * @param field - Field to extract unique values from
 * @returns Set of unique values
 */
export function getUniqueValues<T, K extends keyof T>(
  items: T[],
  field: K
): Set<T[K]> {
  return new Set(items.map((item) => item[field]));
}

/**
 * Count unique values in an array of objects by a specific field.
 *
 * @param items - Array of objects
 * @param field - Field to count unique values of
 * @returns Number of unique values
 */
export function countUniqueValues<T, K extends keyof T>(
  items: T[],
  field: K
): number {
  return getUniqueValues(items, field).size;
}

/**
 * Get the top N items from a map of counts.
 *
 * @param counts - Map of key to count
 * @param limit - Number of top items to return
 * @returns Array of [key, count] tuples sorted by count descending
 */
export function getTopFromCounts<K>(
  counts: Map<K, number>,
  limit: number
): Array<[K, number]> {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/**
 * Aggregate items by a custom grouping key.
 * Generic version of aggregateByYear for any field.
 *
 * @param items - Array of items to aggregate
 * @param keyFn - Function to extract grouping key from item
 * @returns Map of key to count
 *
 * @example
 * ```typescript
 * const songCounts = aggregateByKey(
 *   setlistEntries,
 *   entry => entry.songId
 * );
 * ```
 */
export function aggregateByKey<T, K>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, number> {
  const counts = new Map<K, number>();

  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

/**
 * Default chunk size for bulk operations.
 * 500 is optimal for IndexedDB performance without blocking the main thread.
 */
export const DEFAULT_CHUNK_SIZE = 500;

/**
 * Process items in chunks to avoid memory issues and transaction timeouts.
 * Yields to the main thread between chunks using scheduler.yield() (Chrome 129+).
 *
 * @param items - Array of items to process
 * @param processFn - Async function to process each chunk
 * @param chunkSize - Number of items per chunk (default: 500)
 * @param onProgress - Optional callback for progress updates
 * @returns Total number of items processed
 *
 * @example
 * ```typescript
 * await processInChunks(
 *   songs,
 *   async (chunk) => {
 *     await db.songs.bulkAdd(chunk);
 *   },
 *   500,
 *   (processed, total) => console.log(`${processed}/${total}`)
 * );
 * ```
 */
export async function processInChunks<T>(
  items: T[],
  processFn: (chunk: T[]) => Promise<void>,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  onProgress?: (processed: number, total: number) => void
): Promise<number> {
  let processed = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await processFn(chunk);
    processed += chunk.length;

    if (onProgress) {
      onProgress(processed, items.length);
    }

    // Yield to main thread between chunks using scheduler.yield() (Chrome 129+)
    // Falls back to setTimeout(0) for older browsers
    if (typeof scheduler !== 'undefined' && 'yield' in scheduler) {
      await scheduler.yield();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return processed;
}

/**
 * Bulk get entities by IDs with chunking to avoid memory issues.
 * CRITICAL FIX: Properly passes only the chunk slice to bulkGet, not all IDs.
 * Previously caused test failure where 30 items returned 90 (3 chunks × 30 items each).
 *
 * @param table - Dexie table to query
 * @param ids - Array of IDs to fetch
 * @param chunkSize - Number of IDs per chunk (default: 500)
 * @returns Array of entities (undefined entries filtered out)
 */
export async function bulkGetInChunks<T extends { id: number }>(
  table: EntityTable<T, 'id'> | Table<T>,
  ids: number[],
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunkIds = ids.slice(i, i + chunkSize);
    // CRITICAL: Pass only chunkIds, not the full ids array
    const entities = await table.bulkGet(chunkIds as any);

    // Filter out undefined entries
    for (const entity of entities) {
      if (entity !== undefined) {
        results.push(entity);
      }
    }

    // Yield to main thread between chunks
    if (i + chunkSize < ids.length) {
      if (typeof scheduler !== 'undefined' && 'yield' in scheduler) {
        await scheduler.yield();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  return results;
}

// ==================== EXPORTS ====================

// Re-export commonly used items for convenience
export { CacheKeys, CacheTTL, getQueryCache } from './cache';
export { getDb } from './db';
