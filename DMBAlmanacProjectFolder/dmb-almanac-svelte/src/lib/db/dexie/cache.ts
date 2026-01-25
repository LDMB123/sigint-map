/**
 * DMB Almanac - Dexie Query Cache
 *
 * TTL-based caching for expensive Dexie queries.
 * Reduces repeated IndexedDB access for statistics and aggregations.
 *
 * Features:
 * - Time-based expiration (configurable TTL)
 * - Automatic invalidation on database changes
 * - Memory-efficient LRU-style cleanup
 * - Type-safe cache entries
 */

import { getDb } from './db';

// ==================== TYPES ====================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  /** Stale-while-revalidate window (ms after TTL where stale data can be returned) */
  staleWindow?: number;
  /** Whether a background revalidation is in progress */
  revalidating?: boolean;
}

interface CacheOptions {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Maximum cache entries (default: 100) */
  maxEntries?: number;
}

interface SWROptions {
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Stale window in milliseconds (data is served stale for this period while revalidating) */
  staleWindow?: number;
}

// ==================== CACHE IMPLEMENTATION ====================

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ENTRIES = 100;

class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;

  constructor(options: CacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  /**
   * Get a cached value if it exists and is not expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Re-verify entry still exists (race condition safety)
    if (!this.cache.has(key)) {
      return undefined;
    }

    return entry.data;
  }

  /**
   * Get a cached value with stale-while-revalidate semantics
   * Returns { data, isStale, needsRevalidation }
   */
  getSWR<T>(key: string): { data: T | undefined; isStale: boolean; needsRevalidation: boolean } {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return { data: undefined, isStale: false, needsRevalidation: true };
    }

    const age = Date.now() - entry.timestamp;
    const staleWindow = entry.staleWindow ?? 0;

    // Fresh: within TTL
    if (age <= entry.ttl) {
      return { data: entry.data, isStale: false, needsRevalidation: false };
    }

    // Stale but within stale window: serve stale, trigger revalidation
    if (age <= entry.ttl + staleWindow) {
      return {
        data: entry.data,
        isStale: true,
        needsRevalidation: !entry.revalidating
      };
    }

    // Expired: beyond stale window
    this.cache.delete(key);
    return { data: undefined, isStale: false, needsRevalidation: true };
  }

  /**
   * Mark an entry as currently revalidating (to prevent duplicate revalidations)
   */
  markRevalidating(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.revalidating = true;
    }
  }

  /**
   * Clear revalidating flag after revalidation completes
   */
  clearRevalidating(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.revalidating = false;
    }
  }

  /**
   * Set a cached value with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Set a cached value with stale-while-revalidate window
   */
  setSWR<T>(key: string, data: T, ttl: number, staleWindow: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      staleWindow,
      revalidating: false,
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all entries matching a prefix
   */
  deleteByPrefix(prefix: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxEntries: number; expiredCount: number } {
    let expiredCount = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      expiredCount,
    };
  }

  /**
   * Evict the oldest entry (LRU-style)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Remove all expired entries from the cache
   * Call this periodically to prevent unbounded growth
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Enforce maximum cache size by evicting oldest entries
   */
  enforceMaxSize(): number {
    let evicted = 0;

    while (this.cache.size > this.maxEntries) {
      this.evictOldest();
      evicted++;
    }

    return evicted;
  }
}

// ==================== SINGLETON INSTANCE ====================

let cacheInstance: QueryCache | null = null;

/**
 * Get the singleton cache instance
 */
export function getQueryCache(): QueryCache {
  if (!cacheInstance) {
    cacheInstance = new QueryCache();
  }
  return cacheInstance;
}

/**
 * Reset the cache instance (useful for testing)
 */
export function resetQueryCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
    cacheInstance = null;
  }
}

// ==================== CACHING UTILITIES ====================

/**
 * Cache key generators for common query patterns
 */
export const CacheKeys = {
  songStats: () => 'stats:songs',
  venueStats: () => 'stats:venues',
  globalStats: () => 'stats:global',
  globalStatsExtended: () => 'stats:global:extended',
  yearRange: () => 'stats:yearRange',
  showsByYearSummary: () => 'stats:showsByYear',

  venueYearBreakdown: (venueId: number) => `venue:${venueId}:yearBreakdown`,
  songYearBreakdown: (songId: number) => `song:${songId}:yearBreakdown`,
  guestYearBreakdown: (guestId: number) => `guest:${guestId}:yearBreakdown`,

  tourStatsByYear: (year: number) => `tour:${year}:stats`,
  topOpenersByYear: (year: number, limit: number) => `tour:${year}:openers:${limit}`,
  topClosersByYear: (year: number, limit: number) => `tour:${year}:closers:${limit}`,
  topEncoresByYear: (year: number, limit: number) => `tour:${year}:encores:${limit}`,
  avgSongsPerShowByYear: (year: number) => `tour:${year}:avgSongs`,

  topSongsByPerformances: (limit: number) => `songs:top:performances:${limit}`,
  topOpeningSongs: (limit: number) => `songs:top:openers:${limit}`,
  topClosingSongs: (limit: number) => `songs:top:closers:${limit}`,
  topEncoreSongs: (limit: number) => `songs:top:encores:${limit}`,

  topVenuesByShows: (limit: number) => `venues:top:shows:${limit}`,

  toursGroupedByDecade: () => 'tours:byDecade',

  liberationList: (limit: number) => `liberation:${limit}`,
  fullLiberationList: () => 'liberation:full',
} as const;

/**
 * TTL presets for different query types
 */
export const CacheTTL = {
  /** Statistics that rarely change (5 minutes) */
  STATS: 5 * 60 * 1000,

  /** Aggregations like year breakdowns (10 minutes) */
  AGGREGATION: 10 * 60 * 1000,

  /** Top lists that change infrequently (15 minutes) */
  TOP_LISTS: 15 * 60 * 1000,

  /** Static data like tours grouped by decade (30 minutes) */
  STATIC: 30 * 60 * 1000,

  /** Liberation list - updates daily but cache for 5 minutes */
  LIBERATION: 5 * 60 * 1000,
} as const;

/**
 * Higher-order function to add caching to any async query function
 */
export function withCache<TArgs extends unknown[], TResult>(
  keyFn: (...args: TArgs) => string,
  queryFn: (...args: TArgs) => Promise<TResult>,
  ttl: number = DEFAULT_TTL
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const cache = getQueryCache();
    const key = keyFn(...args);

    // Check cache first
    const cached = cache.get<TResult>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Execute query and cache result
    const result = await queryFn(...args);
    cache.set(key, result, ttl);

    return result;
  };
}

/**
 * Higher-order function to add stale-while-revalidate caching
 * Returns stale data immediately while refreshing in the background
 *
 * Usage:
 *   const getStatsWithSWR = withSWRCache(
 *     () => 'stats:global',
 *     getGlobalStats,
 *     { ttl: 5 * 60 * 1000, staleWindow: 10 * 60 * 1000 }
 *   );
 */
export function withSWRCache<TArgs extends unknown[], TResult>(
  keyFn: (...args: TArgs) => string,
  queryFn: (...args: TArgs) => Promise<TResult>,
  options: SWROptions
): (...args: TArgs) => Promise<TResult> {
  const { ttl, staleWindow = ttl } = options;

  return async (...args: TArgs): Promise<TResult> => {
    const cache = getQueryCache();
    const key = keyFn(...args);

    // Check cache with SWR semantics
    const { data, isStale, needsRevalidation } = cache.getSWR<TResult>(key);

    // If we have data (fresh or stale), return it
    if (data !== undefined) {
      // If stale and needs revalidation, trigger background refresh
      if (isStale && needsRevalidation) {
        cache.markRevalidating(key);

        // Background revalidation - don't await
        queryFn(...args)
          .then((freshData) => {
            cache.setSWR(key, freshData, ttl, staleWindow);
          })
          .catch((error) => {
            console.warn(`[SWRCache] Background revalidation failed for ${key}:`, error);
            cache.clearRevalidating(key);
          });
      }

      return data;
    }

    // No cached data - must fetch fresh
    const result = await queryFn(...args);
    cache.setSWR(key, result, ttl, staleWindow);

    return result;
  };
}

/**
 * SWR TTL presets - includes stale window for background revalidation
 */
export const SWRCacheTTL = {
  /** Statistics: 5min fresh, 10min stale window */
  STATS: { ttl: 5 * 60 * 1000, staleWindow: 10 * 60 * 1000 },

  /** Aggregations: 10min fresh, 20min stale window */
  AGGREGATION: { ttl: 10 * 60 * 1000, staleWindow: 20 * 60 * 1000 },

  /** Top lists: 15min fresh, 30min stale window */
  TOP_LISTS: { ttl: 15 * 60 * 1000, staleWindow: 30 * 60 * 1000 },

  /** Static data: 30min fresh, 1hr stale window */
  STATIC: { ttl: 30 * 60 * 1000, staleWindow: 60 * 60 * 1000 },

  /** Liberation list: 5min fresh, 1hr stale window (changes daily) */
  LIBERATION: { ttl: 5 * 60 * 1000, staleWindow: 60 * 60 * 1000 },
} as const;

/**
 * Invalidate cache entries when data changes
 *
 * Important: This function must invalidate ALL cache keys that could be
 * affected by changes to a given table. Missing invalidations can cause
 * stale data to be displayed to users.
 */
export function invalidateCache(
  tables: Array<'songs' | 'venues' | 'shows' | 'guests' | 'tours' | 'setlistEntries' | 'liberation'>
): void {
  const cache = getQueryCache();

  for (const table of tables) {
    switch (table) {
      case 'songs':
        cache.deleteByPrefix('songs:');
        cache.deleteByPrefix('stats:songs');
        cache.deleteByPrefix('song:');
        cache.deleteByPrefix('songsByYear:'); // Year-filtered song queries
        break;
      case 'venues':
        cache.deleteByPrefix('venues:');
        cache.deleteByPrefix('stats:venues');
        cache.deleteByPrefix('venue:');
        cache.deleteByPrefix('venueYearBreakdown:'); // Venue year breakdown stats
        break;
      case 'shows':
        cache.deleteByPrefix('stats:');
        cache.deleteByPrefix('tour:');
        cache.deleteByPrefix('showsByYear:'); // Year-filtered show queries
        break;
      case 'guests':
        cache.deleteByPrefix('guest:');
        cache.deleteByPrefix('guests:');
        break;
      case 'tours':
        cache.deleteByPrefix('tours:');
        cache.deleteByPrefix('tour:');
        cache.deleteByPrefix('tourStats:'); // Tour statistics queries
        break;
      case 'setlistEntries':
        cache.deleteByPrefix('stats:');
        cache.deleteByPrefix('song:');
        cache.deleteByPrefix('tour:');
        cache.deleteByPrefix('songsByYear:'); // Setlist affects year breakdowns
        cache.deleteByPrefix('tourStats:'); // Setlist affects tour stats
        break;
      case 'liberation':
        cache.deleteByPrefix('liberation:');
        break;
    }
  }

  // Always invalidate global stats on any change
  cache.delete(CacheKeys.globalStats());
  cache.delete(CacheKeys.globalStatsExtended());
}

/**
 * Clear all cache entries
 * Use when user data changes that may affect derived data
 */
export function clearAllCaches(): void {
  const cache = getQueryCache();
  cache.clear();
}

/**
 * Invalidate user-data related caches
 * Called when favorites or attended shows change
 */
export function invalidateUserDataCaches(): void {
  const cache = getQueryCache();

  // User favorites may affect song/venue/show displays
  cache.deleteByPrefix('songs:');
  cache.deleteByPrefix('song:');
  cache.deleteByPrefix('venues:');
  cache.deleteByPrefix('venue:');
  cache.deleteByPrefix('stats:');
  cache.delete(CacheKeys.globalStats());
  cache.delete(CacheKeys.globalStatsExtended());
}

// ==================== CHANGE LISTENERS ====================

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInitialized = false;

/**
 * Set up automatic cache invalidation when Dexie tables change.
 * Subscribes to Dexie's 'storagemutated' event (Dexie 4.x) and debounces
 * invalidation to avoid excessive clearing during bulk operations.
 *
 * Call this function once during application initialization.
 * Safe to call multiple times - will only initialize once.
 */
export function setupCacheInvalidationListeners(): void {
  // Skip on server-side rendering
  if (typeof window === 'undefined') {
    return;
  }

  // Prevent multiple initializations
  if (listenersInitialized) {
    return;
  }

  listenersInitialized = true;

  try {
    const db = getDb();

    // Use Dexie's table hooks for change detection
    // This is more reliable than storagemutated event
    const tableHookHandler = (tableName: string) => {
      // CRITICAL FIX: Invalidate immediately to prevent stale data visibility
      // Previously, debouncing caused a 100ms window where stale cached data remained visible
      // Map table name to cache groups
      const tablesToInvalidate = mapTableToInvalidationGroups(tableName);

      if (tablesToInvalidate.length > 0) {
        // Immediate invalidation for data integrity - no debounce
        invalidateCache(tablesToInvalidate);
      } else if (['userFavoriteSongs', 'userFavoriteVenues', 'userAttendedShows'].includes(tableName)) {
        invalidateUserDataCaches();
      }

      // Debounce only the event dispatch for UI notification (not the actual invalidation)
      // This prevents excessive event spam during bulk operations while keeping data fresh
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        // Dispatch event for UI notification (debounced to avoid spam)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dexie-cache-invalidated', {
            detail: { tables: tablesToInvalidate, tableName }
          }));
        }
      }, 100);
    };

    /**
     * Map table name to cache invalidation groups
     */
    function mapTableToInvalidationGroups(tableName: string): Array<
      'songs' | 'venues' | 'shows' | 'guests' | 'tours' | 'setlistEntries' | 'liberation'
    > {
      switch (tableName) {
        case 'songs':
          return ['songs'];
        case 'venues':
          return ['venues'];
        case 'shows':
          return ['shows'];
        case 'tours':
          return ['tours'];
        case 'guests':
        case 'guestAppearances':
          return ['guests'];
        case 'setlistEntries':
          return ['setlistEntries'];
        case 'liberationList':
          return ['liberation'];
        case 'songStatistics':
          return ['songs'];
        default:
          return [];
      }
    }

    // Hook into creating/updating/deleting for core tables
    const coreTables = ['songs', 'venues', 'shows', 'tours', 'guests', 'setlistEntries', 'liberationList', 'songStatistics', 'guestAppearances', 'userFavoriteSongs', 'userFavoriteVenues', 'userAttendedShows'] as const;

    for (const tableName of coreTables) {
      const table = db.table(tableName);
      if (table) {
         
        table.hook('creating', function(_primKey, _obj, _trans) {
          tableHookHandler(tableName);
        });
         
        table.hook('updating', function(_modifications, _primKey, _obj, _trans) {
          tableHookHandler(tableName);
        });
         
        table.hook('deleting', function(_primKey, _obj, _trans) {
          tableHookHandler(tableName);
        });
      }
    }

    console.debug('[QueryCache] Cache invalidation listeners initialized');
  } catch (error) {
    console.error('[QueryCache] Error setting up cache invalidation listeners:', error);
  }
}

/**
 * Teardown cache invalidation listeners
 * Call when resetting the database or on app cleanup
 */
export function teardownCacheInvalidationListeners(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
  listenersInitialized = false;
}

// ==================== PERIODIC CACHE CLEANUP ====================

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
const CLEANUP_INTERVAL = 60 * 1000; // Run cleanup every 60 seconds

/**
 * Start periodic cache cleanup to remove expired entries
 * Call this once during application initialization
 */
export function startPeriodicCacheCleanup(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (cleanupIntervalId) {
    return; // Already running
  }

  cleanupIntervalId = setInterval(() => {
    const cache = getQueryCache();
    const cleaned = cache.cleanup();
    const enforced = cache.enforceMaxSize();

    if (cleaned > 0 || enforced > 0) {
      console.debug(`[QueryCache] Cleanup: removed ${cleaned} expired, ${enforced} over-limit entries`);
    }
  }, CLEANUP_INTERVAL);

  // Run initial cleanup
  const cache = getQueryCache();
  cache.cleanup();
  cache.enforceMaxSize();
}

/**
 * Stop periodic cache cleanup
 */
export function stopPeriodicCacheCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * Get current cache statistics
 */
export function getCacheStats(): { size: number; maxEntries: number; expiredCount: number } {
  return getQueryCache().stats();
}

// ==================== EXPORTS ====================

export { QueryCache };
export default getQueryCache;
