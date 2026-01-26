/**
 * Hot Cache Tests - Comprehensive test suite for LRU cache
 *
 * Test coverage:
 * - Basic get/set/remove operations
 * - LRU eviction policy
 * - Key normalization
 * - Hit rate tracking
 * - TTL expiration
 * - Export/import persistence
 * - Edge cases and performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HotCache, createRoutingCache, createSessionCache, type CacheEntry } from './hot-cache';

describe('HotCache - Basic Operations', () => {
  let cache: HotCache<string>;

  beforeEach(() => {
    cache = new HotCache({ capacity: 3 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should set and get values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should normalize keys for better hit rates', () => {
    cache.set('Fix Borrow Checker Error!', 'value1');
    expect(cache.get('fix borrow checker error')).toBe('value1');
    expect(cache.get('FIX  BORROW  CHECKER  ERROR')).toBe('value1');
  });

  it('should update existing entries', () => {
    cache.set('key1', 'value1');
    cache.set('key1', 'value2');
    expect(cache.get('key1')).toBe('value2');
    expect(cache.size).toBe(1);
  });

  it('should remove entries', () => {
    cache.set('key1', 'value1');
    expect(cache.remove('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
    expect(cache.remove('key1')).toBe(false);
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should peek without updating LRU', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    const entry = cache.peek('key1');
    expect(entry?.value).toBe('value1');

    // Add one more to trigger eviction
    cache.set('key4', 'value4');

    // key1 should be evicted since peek doesn't update LRU
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('key1')).toBeNull();
  });
});

describe('HotCache - LRU Eviction', () => {
  let cache: HotCache<string>;

  beforeEach(() => {
    cache = new HotCache({ capacity: 3 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should evict least recently used entry when at capacity', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    // Cache is now full, next set should evict key1
    cache.set('key4', 'value4');

    expect(cache.get('key1')).toBeNull(); // Evicted
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should update LRU order on get', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    // Access key1 to make it most recent
    cache.get('key1');

    // Add key4, should evict key2 (now LRU)
    cache.set('key4', 'value4');

    expect(cache.get('key1')).toBe('value1'); // Still exists
    expect(cache.get('key2')).toBeNull(); // Evicted
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should update LRU order on set of existing key', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    // Update key1 to make it most recent
    cache.set('key1', 'value1-updated');

    // Add key4, should evict key2 (now LRU)
    cache.set('key4', 'value4');

    expect(cache.get('key1')).toBe('value1-updated');
    expect(cache.get('key2')).toBeNull(); // Evicted
  });

  it('should track eviction count', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4');
    cache.set('key5', 'value5');

    const stats = cache.getStats();
    expect(stats.evictions).toBe(2);
  });
});

describe('HotCache - Statistics', () => {
  let cache: HotCache<string>;

  beforeEach(() => {
    cache = new HotCache({ capacity: 10 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should track get operations', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('key2');
    cache.get('key1');

    const stats = cache.getStats();
    expect(stats.gets).toBe(3);
  });

  it('should track cache hits and misses', () => {
    cache.set('key1', 'value1');
    cache.get('key1'); // Hit
    cache.get('key2'); // Miss
    cache.get('key1'); // Hit

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
  });

  it('should calculate hit rate correctly', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    // 3 hits, 2 misses
    cache.get('key1'); // Hit
    cache.get('key1'); // Hit
    cache.get('key2'); // Hit
    cache.get('key3'); // Miss
    cache.get('key4'); // Miss

    const stats = cache.getStats();
    expect(stats.hitRate).toBeCloseTo(0.6, 2); // 3/5 = 60%
  });

  it('should track hits per entry', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('key1');
    cache.get('key1');

    const entry = cache.peek('key1');
    expect(entry?.hits).toBe(3);

    const stats = cache.getStats();
    expect(stats.avgHitsPerEntry).toBe(3);
  });

  it('should estimate memory usage', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    const stats = cache.getStats();
    expect(stats.memoryUsage).toBeGreaterThan(0);
  });

  it('should reset statistics', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('key2');

    cache.resetStats();

    const stats = cache.getStats();
    expect(stats.gets).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it('should achieve >70% hit rate on repeated patterns', () => {
    const patterns = [
      'Fix borrow checker error',
      'Debug lifetime issue',
      'Optimize database query',
      'Create REST API endpoint',
      'Test authentication flow',
    ];

    // Prime the cache
    patterns.forEach((pattern, i) => {
      cache.set(pattern, `result-${i}`);
    });

    // Simulate realistic usage with pattern repetition
    const requests = [
      ...patterns,
      ...patterns,
      ...patterns, // 3x each pattern
      'New pattern 1',
      'New pattern 2',
      ...patterns.slice(0, 3),
      ...patterns.slice(0, 3), // More repetitions
    ];

    requests.forEach(pattern => {
      cache.get(pattern);
    });

    const stats = cache.getStats();
    expect(stats.hitRate).toBeGreaterThan(0.7); // >70% target
  });
});

describe('HotCache - TTL Expiration', () => {
  let cache: HotCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new HotCache({ capacity: 10, defaultTtl: 1000 });
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  it('should expire entries after TTL', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    // Advance time past TTL
    vi.advanceTimersByTime(1001);

    expect(cache.get('key1')).toBeNull();
  });

  it('should support per-entry TTL', () => {
    cache.set('key1', 'value1', { ttl: 500 });
    cache.set('key2', 'value2', { ttl: 2000 });

    // After 600ms, key1 expired but key2 still valid
    vi.advanceTimersByTime(600);

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should track expirations', () => {
    cache.set('key1', 'value1', { ttl: 100 });
    cache.set('key2', 'value2', { ttl: 100 });

    vi.advanceTimersByTime(150);

    cache.get('key1'); // Triggers expiration check
    cache.get('key2'); // Triggers expiration check

    const stats = cache.getStats();
    expect(stats.expirations).toBe(2);
  });

  it('should handle TTL of 0 (no expiration)', () => {
    cache.set('key1', 'value1', { ttl: 0 });

    vi.advanceTimersByTime(10000);

    expect(cache.get('key1')).toBe('value1'); // Still valid
  });

  it('should cleanup expired entries automatically', () => {
    cache = new HotCache({
      capacity: 10,
      defaultTtl: 1000,
      autoCleanup: true,
      cleanupInterval: 500,
    });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    expect(cache.size).toBe(2);

    // Advance past TTL
    vi.advanceTimersByTime(1100);

    // Trigger cleanup
    vi.advanceTimersByTime(500);

    expect(cache.size).toBe(0);
  });

  it('should manually cleanup expired entries', () => {
    cache.set('key1', 'value1', { ttl: 100 });
    cache.set('key2', 'value2', { ttl: 100 });
    cache.set('key3', 'value3', { ttl: 2000 });

    vi.advanceTimersByTime(150);

    const removed = cache.cleanup();
    expect(removed).toBe(2);
    expect(cache.size).toBe(1);
    expect(cache.get('key3')).toBe('value3');
  });
});

describe('HotCache - Export/Import', () => {
  let cache: HotCache<string>;

  beforeEach(() => {
    cache = new HotCache({ capacity: 10 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should export cache data', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.get('key1'); // Add a hit - this moves key1 to head (most recent)

    const exported = cache.export();

    expect(exported.version).toBe('1.0.0');
    expect(exported.capacity).toBe(10);
    expect(exported.entries).toHaveLength(2);
    expect(exported.entries[0].key).toBe('key1'); // Most recent first (accessed via get)
    expect(exported.entries[1].key).toBe('key2'); // Least recent
    expect(exported.stats.hits).toBe(1);
  });

  it('should import cache data', () => {
    const data = {
      version: '1.0.0',
      capacity: 10,
      entries: [
        {
          key: 'key1',
          entry: {
            key: 'key1',
            value: 'value1',
            semanticHash: 0,
            lastUsed: Date.now(),
            hits: 5,
            createdAt: Date.now(),
            ttl: 0,
          },
        },
        {
          key: 'key2',
          entry: {
            key: 'key2',
            value: 'value2',
            semanticHash: 0,
            lastUsed: Date.now(),
            hits: 3,
            createdAt: Date.now(),
            ttl: 0,
          },
        },
      ],
      stats: { gets: 10, hits: 8, misses: 2, evictions: 0, expirations: 0 },
      exportedAt: Date.now(),
    };

    cache.import(data);

    expect(cache.size).toBe(2);
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');

    const stats = cache.getStats();
    expect(stats.hits).toBe(10); // 8 from import + 2 from gets above
  });

  it('should preserve LRU order on import', () => {
    const now = Date.now();
    const data = {
      version: '1.0.0',
      capacity: 3,
      entries: [
        {
          key: 'key3',
          entry: {
            key: 'key3',
            value: 'value3',
            semanticHash: 0,
            lastUsed: now,
            hits: 0,
            createdAt: now,
            ttl: 0,
          },
        },
        {
          key: 'key2',
          entry: {
            key: 'key2',
            value: 'value2',
            semanticHash: 0,
            lastUsed: now - 1000,
            hits: 0,
            createdAt: now - 1000,
            ttl: 0,
          },
        },
        {
          key: 'key1',
          entry: {
            key: 'key1',
            value: 'value1',
            semanticHash: 0,
            lastUsed: now - 2000,
            hits: 0,
            createdAt: now - 2000,
            ttl: 0,
          },
        },
      ],
      stats: { gets: 0, hits: 0, misses: 0, evictions: 0, expirations: 0 },
      exportedAt: now,
    };

    cache.import(data);

    // Add one more entry to trigger eviction
    cache.set('key4', 'value4');

    // key1 should be evicted (LRU)
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should skip expired entries on import', () => {
    vi.useFakeTimers();
    const now = Date.now();

    const data = {
      version: '1.0.0',
      capacity: 10,
      entries: [
        {
          key: 'key1',
          entry: {
            key: 'key1',
            value: 'value1',
            semanticHash: 0,
            lastUsed: now,
            hits: 0,
            createdAt: now - 2000,
            ttl: 1000, // Expired
          },
        },
        {
          key: 'key2',
          entry: {
            key: 'key2',
            value: 'value2',
            semanticHash: 0,
            lastUsed: now,
            hits: 0,
            createdAt: now,
            ttl: 5000, // Still valid
          },
        },
      ],
      stats: { gets: 0, hits: 0, misses: 0, evictions: 0, expirations: 0 },
      exportedAt: now,
    };

    cache.import(data);

    expect(cache.size).toBe(1);
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');

    vi.useRealTimers();
  });

  it('should handle version mismatch', () => {
    const data = {
      version: '2.0.0',
      capacity: 10,
      entries: [],
      stats: { gets: 0, hits: 0, misses: 0, evictions: 0, expirations: 0 },
      exportedAt: Date.now(),
    };

    expect(() => cache.import(data)).toThrow('Incompatible cache version');
  });

  it('should support round-trip export/import', () => {
    cache.set('key1', 'value1', { semanticHash: 123n, metadata: { agent: 'test' } });
    cache.set('key2', 'value2', { semanticHash: 456n });
    cache.get('key1');
    cache.get('key1');

    const exported = cache.export();
    const newCache = new HotCache<string>({ capacity: 10 });
    newCache.import(exported);

    expect(newCache.size).toBe(2);

    // Note: get() increments hits, so we verify with peek first
    const entryBeforeGet = newCache.peek('key1');
    expect(entryBeforeGet?.hits).toBe(2); // Preserved from export
    expect(entryBeforeGet?.semanticHash).toBe(123n);
    expect(entryBeforeGet?.metadata?.agent).toBe('test');

    // Now verify values are correct
    expect(newCache.get('key1')).toBe('value1');
    expect(newCache.get('key2')).toBe('value2');

    newCache.destroy();
  });
});

describe('HotCache - Semantic Hash Integration', () => {
  let cache: HotCache<string>;

  beforeEach(() => {
    cache = new HotCache({ capacity: 10 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should store semantic hash with entry', () => {
    cache.set('Fix borrow checker error', 'rust-expert', { semanticHash: 0x010C02042F0000000n });

    const entry = cache.peek('Fix borrow checker error');
    expect(entry?.semanticHash).toBe(0x010C02042F0000000n);
  });

  it('should automatically generate semantic hash with setWithHash', () => {
    cache.setWithHash('Fix borrow checker error', 'rust-expert');

    const entry = cache.peek('fix borrow checker error');
    expect(entry?.semanticHash).toBeTruthy();
    expect(typeof entry?.semanticHash).toBe('bigint');
  });

  it('should store metadata with entry', () => {
    cache.set('key1', 'value1', {
      metadata: {
        agent: 'rust-expert',
        tier: 'opus',
        confidence: 15,
      },
    });

    const entry = cache.peek('key1');
    expect(entry?.metadata?.agent).toBe('rust-expert');
    expect(entry?.metadata?.tier).toBe('opus');
    expect(entry?.metadata?.confidence).toBe(15);
  });
});

describe('HotCache - Utility Methods', () => {
  let cache: HotCache<string>;

  beforeEach(() => {
    cache = new HotCache({ capacity: 10 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should get all entries in LRU order', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    const entries = cache.entries();
    expect(entries).toHaveLength(3);
    expect(entries[0].key).toBe('key3'); // Most recent
    expect(entries[2].key).toBe('key1'); // Least recent
  });

  it('should get all keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    const keys = cache.keys();
    expect(keys).toEqual(['key2', 'key1']);
  });

  it('should get all values', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    const values = cache.values();
    expect(values).toEqual(['value2', 'value1']);
  });

  it('should find entries matching predicate', () => {
    cache.set('key1', 'value1', { metadata: { type: 'rust' } });
    cache.set('key2', 'value2', { metadata: { type: 'js' } });
    cache.set('key3', 'value3', { metadata: { type: 'rust' } });

    const rustEntries = cache.find(entry => entry.metadata?.type === 'rust');
    expect(rustEntries).toHaveLength(2);
  });

  it('should report cache state properties', () => {
    expect(cache.isEmpty).toBe(true);
    expect(cache.isFull).toBe(false);

    cache.set('key1', 'value1');
    expect(cache.isEmpty).toBe(false);
    expect(cache.size).toBe(1);
    expect(cache.maxSize).toBe(10);
  });

  it('should calculate hit rate property', () => {
    cache.set('key1', 'value1');
    cache.get('key1'); // Hit
    cache.get('key2'); // Miss

    expect(cache.hitRate).toBeCloseTo(0.5, 2);
  });
});

describe('HotCache - Factory Functions', () => {
  it('should create routing cache with correct defaults', () => {
    const cache = createRoutingCache(500);

    expect(cache.maxSize).toBe(500);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    cache.destroy();
  });

  it('should create session cache with TTL', () => {
    vi.useFakeTimers();

    const cache = createSessionCache(100, 1000);

    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(1100);
    expect(cache.get('key1')).toBeNull();

    cache.destroy();
    vi.useRealTimers();
  });
});

describe('HotCache - Edge Cases', () => {
  it('should handle zero capacity', () => {
    const cache = new HotCache({ capacity: 0 });

    cache.set('key1', 'value1');
    expect(cache.size).toBe(0);
    expect(cache.get('key1')).toBeNull();

    cache.destroy();
  });

  it('should handle capacity of 1', () => {
    const cache = new HotCache({ capacity: 1 });

    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    cache.set('key2', 'value2');
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');

    cache.destroy();
  });

  it('should handle empty string keys', () => {
    const cache = new HotCache({ capacity: 10 });

    cache.set('', 'value1');
    expect(cache.get('')).toBe('value1');

    cache.destroy();
  });

  it('should handle very long keys', () => {
    const cache = new HotCache({ capacity: 10 });
    const longKey = 'a'.repeat(1000);

    cache.set(longKey, 'value1');
    // Key should be truncated to 500 chars
    expect(cache.get(longKey)).toBe('value1');

    cache.destroy();
  });

  it('should handle special characters in keys', () => {
    const cache = new HotCache({ capacity: 10 });

    cache.set('key!@#$%^&*()', 'value1');
    expect(cache.get('key')).toBe('value1'); // Punctuation removed
    expect(cache.get('KEY!!!!!')).toBe('value1');

    cache.destroy();
  });

  it('should handle complex object values', () => {
    const cache = new HotCache<{ data: any }>({ capacity: 10 });

    const value = {
      data: {
        nested: {
          array: [1, 2, 3],
          object: { foo: 'bar' },
        },
      },
    };

    cache.set('key1', value);
    const retrieved = cache.get('key1');

    expect(retrieved).toEqual(value);
    expect(retrieved?.data.nested.array).toEqual([1, 2, 3]);

    cache.destroy();
  });
});

describe('HotCache - Performance', () => {
  it('should handle large cache size', () => {
    const cache = new HotCache({ capacity: 10000 });

    const start = Date.now();

    // Add 10000 entries
    for (let i = 0; i < 10000; i++) {
      cache.set(`key-${i}`, `value-${i}`);
    }

    const setTime = Date.now() - start;
    expect(setTime).toBeLessThan(1000); // <1s for 10k sets

    // Random access pattern
    const accessStart = Date.now();
    for (let i = 0; i < 1000; i++) {
      const key = `key-${Math.floor(Math.random() * 10000)}`;
      cache.get(key);
    }
    const accessTime = Date.now() - accessStart;
    expect(accessTime).toBeLessThan(100); // <100ms for 1k random gets

    cache.destroy();
  });

  it('should maintain O(1) performance for get operations', () => {
    const cache = new HotCache({ capacity: 1000 });

    // Fill cache
    for (let i = 0; i < 1000; i++) {
      cache.set(`key-${i}`, `value-${i}`);
    }

    // Measure get performance
    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      cache.get(`key-${i % 1000}`);
    }

    const elapsed = performance.now() - start;
    const avgTime = elapsed / iterations;

    expect(avgTime).toBeLessThan(0.01); // <0.01ms per get

    cache.destroy();
  });
});
