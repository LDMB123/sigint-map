/**
 * Unit tests for Dexie query helpers
 *
 * Testing:
 * - Cached queries with TTL management
 * - Year aggregation and grouping
 * - Top N queries
 * - Search operations
 * - Bulk operations with chunking
 * - Transaction management
 * - Error handling
 *
 * Note: These tests mock Dexie and the cache layer to avoid
 * requiring a real IndexedDB instance.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cachedQuery,
  cachedQueryWithOptions,
  aggregateByYear,
  aggregateByYearAsync,
  aggregateByYearMap,
  aggregateByYearWithUniqueShows,
  getTopByField,
  searchByText,
  searchByTextWithSort,
  safeQuery,
  safeQueryWithTransform,
  countSongsFromEntries,
  makeCacheKey,
  getUniqueValues,
  countUniqueValues,
  getTopFromCounts,
  aggregateByKey,
  processInChunks,
  bulkGetInChunks,
} from '$db/dexie/query-helpers';
import { getQueryCache } from '$db/dexie/cache';
import { getDb } from '$db/dexie/db';

// ==================== MOCK SETUP ====================

vi.mock('$db/dexie/cache', () => ({
  getQueryCache: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  })),
  invalidateCache: vi.fn(),
  CacheKeys: {
    songStats: () => 'song-stats',
  },
  CacheTTL: {
    STATS: 60000,
    TOP_LISTS: 30000,
  },
}));

vi.mock('$db/dexie/db', () => ({
  getDb: vi.fn(() => ({
    handleError: vi.fn(),
    transaction: vi.fn((mode, tables, fn) => fn()),
    songs: {
      where: vi.fn().mockReturnThis(),
      above: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      bulkAdd: vi.fn(),
      bulkGet: vi.fn(),
      bulkDelete: vi.fn(),
      update: vi.fn(),
    },
    shows: {
      where: vi.fn().mockReturnThis(),
      above: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      bulkAdd: vi.fn(),
      bulkGet: vi.fn(),
      bulkDelete: vi.fn(),
      update: vi.fn(),
    },
    table: vi.fn(),
  })),
}));

// ==================== FIXTURES ====================

const mockShowWithYear = {
  id: 1,
  date: '2024-01-15',
  year: 2024,
};

// ==================== CACHING TESTS ====================

describe('cachedQuery', () => {
  let mockCache: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
    };
    vi.mocked(getQueryCache).mockReturnValue(mockCache as unknown as ReturnType<typeof getQueryCache>);
  });

  it('should return cached value if available', async () => {
    mockCache.get.mockReturnValue({ total: 100 });
    const queryFn = vi.fn();

    const result = await cachedQuery('test-key', 60000, queryFn);

    expect(result).toEqual({ total: 100 });
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('should execute query if cache miss', async () => {
    mockCache.get.mockReturnValue(undefined);
    const queryFn = vi.fn().mockResolvedValue({ total: 100 });

    const result = await cachedQuery('test-key', 60000, queryFn);

    expect(result).toEqual({ total: 100 });
    expect(queryFn).toHaveBeenCalled();
  });

  it('should store result in cache after query', async () => {
    mockCache.get.mockReturnValue(undefined);
    const queryFn = vi.fn().mockResolvedValue({ total: 100 });

    await cachedQuery('test-key', 60000, queryFn);

    expect(mockCache.set).toHaveBeenCalledWith('test-key', { total: 100 }, 60000);
  });
});

describe('cachedQueryWithOptions', () => {
  let mockCache: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
    };
    vi.mocked(getQueryCache).mockReturnValue(mockCache as unknown as ReturnType<typeof getQueryCache>);
  });

  it('should skip cache when skipCache is true', async () => {
    mockCache.get.mockReturnValue({ total: 100 });
    const queryFn = vi.fn().mockResolvedValue({ total: 200 });

    const result = await cachedQueryWithOptions('test-key', queryFn, { skipCache: true });

    expect(result).toEqual({ total: 200 });
    expect(mockCache.get).not.toHaveBeenCalled();
  });

  it('should use provided TTL', async () => {
    mockCache.get.mockReturnValue(undefined);
    const queryFn = vi.fn().mockResolvedValue({ total: 100 });

    await cachedQueryWithOptions('test-key', queryFn, { ttl: 30000 });

    expect(mockCache.set).toHaveBeenCalledWith('test-key', { total: 100 }, 30000);
  });
});

// ==================== YEAR AGGREGATION TESTS ====================

describe('aggregateByYear', () => {
  it('should group items by year', () => {
    const items = [
      { ...mockShowWithYear, id: 1, year: 2024 },
      { ...mockShowWithYear, id: 2, year: 2024 },
      { ...mockShowWithYear, id: 3, year: 2023 },
      { ...mockShowWithYear, id: 4, year: 2023 },
      { ...mockShowWithYear, id: 5, year: 2022 },
    ];

    const result = aggregateByYear(items);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ year: 2024, count: 2 });
    expect(result[1]).toEqual({ year: 2023, count: 2 });
    expect(result[2]).toEqual({ year: 2022, count: 1 });
  });

  it('should sort by year descending', () => {
    const items = [
      { year: 2020 },
      { year: 2024 },
      { year: 2022 },
    ];

    const result = aggregateByYear(items);

    expect(result[0].year).toBe(2024);
    expect(result[1].year).toBe(2022);
    expect(result[2].year).toBe(2020);
  });

  it('should handle empty array', () => {
    const result = aggregateByYear([]);

    expect(result).toEqual([]);
  });

  it('should handle single item', () => {
    const result = aggregateByYear([{ year: 2024 }]);

    expect(result).toEqual([{ year: 2024, count: 1 }]);
  });

  it('should handle many years', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      year: 1990 + (i % 35),
    }));

    const result = aggregateByYear(items);

    expect(result.length).toBeLessThanOrEqual(35);
    expect(result[0].year >= result[result.length - 1].year).toBe(true);
  });
});

describe('aggregateByYearAsync', () => {
  it('should group items by year asynchronously', async () => {
    const items = [
      { year: 2024 },
      { year: 2024 },
      { year: 2023 },
    ];

    const result = await aggregateByYearAsync(items);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ year: 2024, count: 2 });
  });

  it('should yield for large datasets', async () => {
    const items = Array.from({ length: 2000 }, (_, i) => ({
      year: 2000 + (i % 25),
    }));

    const result = await aggregateByYearAsync(items);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('year');
    expect(result[0]).toHaveProperty('count');
  });

  it('should handle empty array', async () => {
    const result = await aggregateByYearAsync([]);

    expect(result).toEqual([]);
  });
});

describe('aggregateByYearMap', () => {
  it('should return Map of year to count', () => {
    const items = [
      { year: 2024 },
      { year: 2024 },
      { year: 2023 },
    ];

    const result = aggregateByYearMap(items);

    expect(result instanceof Map).toBe(true);
    expect(result.get(2024)).toBe(2);
    expect(result.get(2023)).toBe(1);
  });

  it('should handle empty array', () => {
    const result = aggregateByYearMap([]);

    expect(result instanceof Map).toBe(true);
    expect(result.size).toBe(0);
  });
});

describe('aggregateByYearWithUniqueShows', () => {
  it('should count unique shows per year', () => {
    const items = [
      { year: 2024, showId: 1 },
      { year: 2024, showId: 1 }, // Duplicate show
      { year: 2024, showId: 2 },
      { year: 2023, showId: 3 },
    ];

    const result = aggregateByYearWithUniqueShows(items);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ year: 2024, count: 2 }); // 2 unique shows
    expect(result[1]).toEqual({ year: 2023, count: 1 });
  });

  it('should handle empty array', () => {
    const result = aggregateByYearWithUniqueShows([]);

    expect(result).toEqual([]);
  });

  it('should deduplicate shows within same year', () => {
    const items = [
      { year: 2024, showId: 1 },
      { year: 2024, showId: 1 },
      { year: 2024, showId: 1 },
    ];

    const result = aggregateByYearWithUniqueShows(items);

    expect(result[0].count).toBe(1); // Only 1 unique show
  });
});

// ==================== TOP N QUERY TESTS ====================

describe('getTopByField', () => {
  it('should return top items by numeric field', async () => {
    const mockTable = {
      where: vi.fn().mockReturnThis(),
      above: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([
        { id: 1, totalPerformances: 500 },
        { id: 2, totalPerformances: 450 },
      ]),
    };

    const result = await getTopByField(mockTable as any, 'totalPerformances', 10);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ entity: { id: 1, totalPerformances: 500 }, count: 500 });
  });

  it('should respect limit parameter', async () => {
    const mockTable = {
      where: vi.fn().mockReturnThis(),
      above: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    };

    await getTopByField(mockTable as any, 'totalPerformances', 5);

    expect(mockTable.limit).toHaveBeenCalledWith(5);
  });

  it('should use .where().above(0) for efficiency', async () => {
    const mockTable = {
      where: vi.fn().mockReturnThis(),
      above: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    };

    await getTopByField(mockTable as any, 'totalPerformances', 10);

    expect(mockTable.where).toHaveBeenCalledWith('totalPerformances');
    expect(mockTable.above).toHaveBeenCalledWith(0);
  });
});

// ==================== SEARCH TESTS ====================

describe('searchByText', () => {
  it('should return empty array for empty query', async () => {
    const mockTable = {
      where: vi.fn(),
    };

    const result = await searchByText(mockTable as any, '');

    expect(result).toEqual([]);
    expect(mockTable.where).not.toHaveBeenCalled();
  });

  it('should search with startsWithIgnoreCase', async () => {
    const mockTable = {
      where: vi.fn().mockReturnThis(),
      startsWithIgnoreCase: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([{ id: 1, searchText: 'crash into me' }]),
    };

    const result = await searchByText(mockTable as any, 'crash');

    expect(mockTable.where).toHaveBeenCalledWith('searchText');
    expect(mockTable.startsWithIgnoreCase).toHaveBeenCalledWith('crash');
    expect(result).toHaveLength(1);
  });

  it('should trim and lowercase search term', async () => {
    const mockTable = {
      where: vi.fn().mockReturnThis(),
      startsWithIgnoreCase: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    };

    await searchByText(mockTable as any, '  CRASH  ');

    expect(mockTable.startsWithIgnoreCase).toHaveBeenCalledWith('crash');
  });

  it('should respect limit parameter', async () => {
    const mockTable = {
      where: vi.fn().mockReturnThis(),
      startsWithIgnoreCase: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    };

    await searchByText(mockTable as any, 'crash', 50);

    expect(mockTable.limit).toHaveBeenCalledWith(50);
  });
});

describe('searchByTextWithSort', () => {
  it('should search and sort results', async () => {
    interface MockEntity {
      id: number;
      searchText?: string;
      totalPerformances: number;
    }

    const mockTable = {
      where: vi.fn().mockReturnThis(),
      startsWithIgnoreCase: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sortBy: vi.fn().mockResolvedValue([
        { id: 2, totalPerformances: 400 },
        { id: 1, totalPerformances: 500 },
      ]),
    };

    const result = await searchByTextWithSort<MockEntity>(
      mockTable as any,
      'crash',
      'totalPerformances' as keyof MockEntity & string,
      20
    );

    expect(mockTable.sortBy).toHaveBeenCalledWith('totalPerformances');
    expect(result[0].totalPerformances).toBe(500); // Reversed (descending)
  });
});

// ==================== SAFE QUERY TESTS ====================

describe('safeQuery', () => {
  it('should return query result on success', async () => {
    const queryFn = vi.fn().mockResolvedValue([{ id: 1 }]);
    const mockDb = { handleError: vi.fn() };
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const result = await safeQuery(queryFn, [], 'testQuery');

    expect(result).toEqual([{ id: 1 }]);
    expect(mockDb.handleError).not.toHaveBeenCalled();
  });

  it('should return fallback on error', async () => {
    const error = new Error('Query failed');
    const queryFn = vi.fn().mockRejectedValue(error);
    const mockDb = { handleError: vi.fn() };
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const result = await safeQuery(queryFn, [], 'testQuery');

    expect(result).toEqual([]);
    expect(mockDb.handleError).toHaveBeenCalledWith(error, 'testQuery');
  });
});

describe('safeQueryWithTransform', () => {
  it('should transform result on success', async () => {
    const queryFn = vi.fn().mockResolvedValue([1, 2, 3]);
    const transformFn = vi.fn((arr: number[]) => arr.length);
    const mockDb = { handleError: vi.fn() };
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const result = await safeQueryWithTransform(queryFn, transformFn, 0, 'test');

    expect(result).toBe(3);
    expect(transformFn).toHaveBeenCalled();
  });

  it('should return fallback on error', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('Failed'));
    const transformFn = vi.fn();
    const mockDb = { handleError: vi.fn() };
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const result = await safeQueryWithTransform(queryFn, transformFn, 0, 'test');

    expect(result).toBe(0);
    expect(transformFn).not.toHaveBeenCalled();
  });
});

// ==================== COUNT SONGS FROM ENTRIES TESTS ====================

describe('countSongsFromEntries', () => {
  it('should count occurrences of each song', () => {
    const entries = [
      { songId: 1 },
      { songId: 1 },
      { songId: 2 },
      { songId: 2 },
      { songId: 2 },
      { songId: 3 },
    ];

    const result = countSongsFromEntries(entries as any, 10);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ songId: 2, count: 3 });
    expect(result[1]).toEqual({ songId: 1, count: 2 });
  });

  it('should respect limit parameter', () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      songId: i % 30,
    }));

    const result = countSongsFromEntries(entries as any, 5);

    expect(result).toHaveLength(5);
  });

  it('should sort by count descending', () => {
    const entries = [
      { songId: 1 },
      { songId: 2 },
      { songId: 2 },
      { songId: 3 },
      { songId: 3 },
      { songId: 3 },
    ];

    const result = countSongsFromEntries(entries as any, 10);

    expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
  });

  it('should handle empty array', () => {
    const result = countSongsFromEntries([], 10);

    expect(result).toEqual([]);
  });
});

// ==================== UTILITY FUNCTION TESTS ====================

describe('makeCacheKey', () => {
  it('should create cache key from parts', () => {
    const key = makeCacheKey('song', 123, 'yearBreakdown');

    expect(key).toBe('song:123:yearBreakdown');
  });

  it('should handle numbers and strings', () => {
    const key = makeCacheKey('venue', 456, 'stats');

    expect(key).toContain('venue');
    expect(key).toContain('456');
    expect(key).toContain('stats');
  });
});

describe('getUniqueValues', () => {
  it('should extract unique values from field', () => {
    const items = [
      { id: 1, year: 2024 },
      { id: 2, year: 2024 },
      { id: 3, year: 2023 },
    ];

    const years = getUniqueValues(items, 'year');

    expect(years instanceof Set).toBe(true);
    expect(years.size).toBe(2);
    expect(years.has(2024)).toBe(true);
    expect(years.has(2023)).toBe(true);
  });
});

describe('countUniqueValues', () => {
  it('should count unique values in field', () => {
    const items = [
      { id: 1, year: 2024 },
      { id: 2, year: 2024 },
      { id: 3, year: 2023 },
    ];

    const count = countUniqueValues(items, 'year');

    expect(count).toBe(2);
  });
});

describe('getTopFromCounts', () => {
  it('should get top N from counts map', () => {
    const counts = new Map([
      [1, 500],
      [2, 450],
      [3, 400],
      [4, 350],
    ]);

    const result = getTopFromCounts(counts, 2);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([1, 500]);
    expect(result[1]).toEqual([2, 450]);
  });

  it('should sort by count descending', () => {
    const counts = new Map([
      [3, 100],
      [1, 500],
      [2, 300],
    ]);

    const result = getTopFromCounts(counts, 3);

    expect(result[0][1]).toBe(500);
    expect(result[1][1]).toBe(300);
    expect(result[2][1]).toBe(100);
  });
});

describe('aggregateByKey', () => {
  it('should aggregate by custom key function', () => {
    const items = [
      { id: 1, year: 2024 },
      { id: 2, year: 2024 },
      { id: 3, year: 2023 },
    ];

    const result = aggregateByKey(items, (item) => item.year);

    expect(result.get(2024)).toBe(2);
    expect(result.get(2023)).toBe(1);
  });

  it('should handle empty array', () => {
    const result = aggregateByKey([], (item) => (item as any).year);

    expect(result.size).toBe(0);
  });
});

describe('processInChunks', () => {
  it('should process items in chunks', async () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    const processFn = vi.fn().mockResolvedValue(undefined);

    const processed = await processInChunks(items, processFn, 10);

    expect(processed).toBe(30);
    expect(processFn).toHaveBeenCalledTimes(3); // 30 items / 10 per chunk
  });

  it('should call progress callback', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const processFn = vi.fn().mockResolvedValue(undefined);
    const onProgress = vi.fn();

    await processInChunks(items, processFn, 5, onProgress);

    expect(onProgress).toHaveBeenCalled();
  });

  it('should handle empty array', async () => {
    const processFn = vi.fn();

    const processed = await processInChunks([], processFn, 10);

    expect(processed).toBe(0);
    expect(processFn).not.toHaveBeenCalled();
  });
});

describe('bulkGetInChunks', () => {
  it('should get items in chunks', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => i);
    // CRITICAL FIX: Mock bulkGet to return only the chunk passed to it, not all IDs
    // This was the bug causing 90 items instead of 30 (3 chunks × 30 each)
    const mockTable = {
      bulkGet: vi.fn().mockImplementation((chunkIds: number[]) => 
        // Return only the items for the requested chunk
         Promise.resolve(
          chunkIds.map((id) => ({ id, data: `Item ${id}` }))
        )
      ),
    };

    const result = await bulkGetInChunks(mockTable as any, ids, 10);

    expect(result).toHaveLength(30);
    expect(mockTable.bulkGet).toHaveBeenCalledTimes(3); // 30 items / 10 per chunk
  });

  it('should filter out undefined entries', async () => {
    const ids = [1, 2, 3];
    const mockTable = {
      bulkGet: vi.fn().mockResolvedValue([
        { id: 1 },
        undefined,
        { id: 3 },
      ]),
    };

    const result = await bulkGetInChunks(mockTable as any, ids, 10);

    expect(result).toHaveLength(2);
  });
});
