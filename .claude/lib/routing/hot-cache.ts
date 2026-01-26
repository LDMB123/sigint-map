/**
 * Hot Path LRU Cache - High-Performance Routing Cache
 *
 * Implements a Least Recently Used (LRU) cache with:
 * - O(1) get/set operations using Map + doubly-linked list
 * - Configurable capacity (default: 1000 entries)
 * - Automatic key normalization for better hit rates
 * - Comprehensive hit rate tracking and statistics
 * - Persistence support (export/import)
 * - TTL support for time-based expiration
 * - Memory-efficient eviction
 *
 * Target: >70% cache hit rate on repeated patterns
 * Performance: <0.01ms per operation
 *
 * @version 1.0.0
 */

import { hashRequest, formatHash, type SemanticHash } from './semantic-hash.js';

/**
 * Cache entry with metadata for LRU tracking
 */
export interface CacheEntry<T> {
  /** Normalized cache key */
  key: string;
  /** Cached value */
  value: T;
  /** Semantic hash for routing */
  semanticHash: number | bigint;
  /** Timestamp of last access (ms) */
  lastUsed: number;
  /** Number of cache hits */
  hits: number;
  /** Timestamp of creation (ms) */
  createdAt: number;
  /** TTL in milliseconds (0 = no expiration) */
  ttl: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Doubly-linked list node for LRU tracking
 */
class LRUNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: LRUNode<T> | null = null;
  next: LRUNode<T> | null = null;

  constructor(key: string, entry: CacheEntry<T>) {
    this.key = key;
    this.entry = entry;
  }
}

/**
 * Cache statistics for monitoring and optimization
 */
export interface CacheStats {
  /** Total number of get operations */
  gets: number;
  /** Total number of cache hits */
  hits: number;
  /** Total number of cache misses */
  misses: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Current cache size */
  size: number;
  /** Maximum cache capacity */
  capacity: number;
  /** Total number of evictions */
  evictions: number;
  /** Total number of expirations */
  expirations: number;
  /** Average hits per entry */
  avgHitsPerEntry: number;
  /** Total memory usage estimate (bytes) */
  memoryUsage: number;
  /** Timestamp of stats generation */
  timestamp: number;
}

/**
 * Cache configuration options
 */
export interface HotCacheOptions {
  /** Maximum number of entries (default: 1000) */
  capacity?: number;
  /** Default TTL in milliseconds (0 = no expiration, default: 0) */
  defaultTtl?: number;
  /** Enable automatic cleanup of expired entries (default: true) */
  autoCleanup?: boolean;
  /** Cleanup interval in milliseconds (default: 60000 = 1 minute) */
  cleanupInterval?: number;
  /** Key normalization function (default: built-in) */
  normalizeKey?: (key: string) => string;
}

/**
 * Serializable cache data for persistence
 */
export interface SerializedCache<T> {
  version: string;
  capacity: number;
  entries: Array<{
    key: string;
    entry: CacheEntry<T>;
  }>;
  stats: {
    gets: number;
    hits: number;
    misses: number;
    evictions: number;
    expirations: number;
  };
  exportedAt: number;
}

/**
 * HotCache - High-Performance LRU Cache for Routing
 *
 * Uses a doubly-linked list + hash map for O(1) operations:
 * - Map provides O(1) lookups
 * - Doubly-linked list maintains LRU order
 * - Head = most recently used
 * - Tail = least recently used (eviction target)
 *
 * @example
 * ```typescript
 * const cache = new HotCache<AgentRoute>({ capacity: 1000 });
 *
 * // Set with automatic normalization
 * cache.set("Fix borrow checker error", { agent: "rust-expert", tier: "opus" });
 *
 * // Get with hit tracking
 * const route = cache.get("fix borrow checker error"); // Cache hit!
 *
 * // Export for persistence
 * const data = cache.export();
 * fs.writeFileSync('cache.json', JSON.stringify(data));
 * ```
 */
export class HotCache<T = any> {
  private capacity: number;
  private defaultTtl: number;
  private autoCleanup: boolean;
  private cleanupInterval: number;
  private normalizeKeyFn: (key: string) => string;

  // Core data structures
  private cache: Map<string, LRUNode<T>>;
  private head: LRUNode<T> | null = null;
  private tail: LRUNode<T> | null = null;

  // Statistics
  private stats = {
    gets: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };

  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: HotCacheOptions = {}) {
    this.capacity = options.capacity ?? 1000;
    this.defaultTtl = options.defaultTtl ?? 0;
    this.autoCleanup = options.autoCleanup ?? true;
    this.cleanupInterval = options.cleanupInterval ?? 60000;
    this.normalizeKeyFn = options.normalizeKey ?? this.defaultNormalizeKey;

    this.cache = new Map();

    // Start automatic cleanup if enabled
    if (this.autoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * Default key normalization for better hit rates
   * - Convert to lowercase
   * - Normalize whitespace
   * - Remove punctuation (except hyphens/underscores)
   * - Truncate to 500 chars
   */
  private defaultNormalizeKey(key: string): string {
    return key
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s-]/g, '') // Remove punctuation
      .slice(0, 500); // Truncate for performance
  }

  /**
   * Get a value from the cache
   * - O(1) operation
   * - Updates LRU position
   * - Checks expiration
   * - Tracks hit/miss stats
   */
  get(key: string): T | null {
    this.stats.gets++;

    const normalizedKey = this.normalizeKeyFn(key);
    const node = this.cache.get(normalizedKey);

    if (!node) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(node.entry)) {
      this.remove(normalizedKey);
      this.stats.misses++;
      this.stats.expirations++;
      return null;
    }

    // Update stats and LRU position
    this.stats.hits++;
    node.entry.hits++;
    node.entry.lastUsed = Date.now();
    this.moveToHead(node);

    return node.entry.value;
  }

  /**
   * Set a value in the cache
   * - O(1) operation
   * - Automatically normalizes key
   * - Evicts LRU entry if at capacity
   * - Optionally generates semantic hash
   */
  set(
    key: string,
    value: T,
    options: {
      ttl?: number;
      semanticHash?: number | bigint;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    const normalizedKey = this.normalizeKeyFn(key);
    const now = Date.now();

    // Check if entry already exists
    const existingNode = this.cache.get(normalizedKey);
    if (existingNode) {
      // Update existing entry
      existingNode.entry.value = value;
      existingNode.entry.lastUsed = now;
      existingNode.entry.ttl = options.ttl ?? this.defaultTtl;
      if (options.semanticHash !== undefined) {
        existingNode.entry.semanticHash = options.semanticHash;
      }
      if (options.metadata) {
        existingNode.entry.metadata = options.metadata;
      }
      this.moveToHead(existingNode);
      return;
    }

    // Don't add if capacity is zero
    if (this.capacity === 0) {
      return;
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      key: normalizedKey,
      value,
      semanticHash: options.semanticHash ?? 0,
      lastUsed: now,
      hits: 0,
      createdAt: now,
      ttl: options.ttl ?? this.defaultTtl,
      metadata: options.metadata,
    };

    const node = new LRUNode(normalizedKey, entry);

    // Evict if at capacity
    if (this.cache.size >= this.capacity) {
      this.evictLRU();
    }

    // Add to cache and head of list
    this.cache.set(normalizedKey, node);
    this.addToHead(node);
  }

  /**
   * Set with automatic semantic hash generation
   */
  setWithHash(
    key: string,
    value: T,
    options: {
      ttl?: number;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    const semanticHash = hashRequest(key);
    this.set(key, value, { ...options, semanticHash });
  }

  /**
   * Check if a key exists in the cache (without updating LRU)
   */
  has(key: string): boolean {
    const normalizedKey = this.normalizeKeyFn(key);
    const node = this.cache.get(normalizedKey);

    if (!node) return false;

    // Check expiration
    if (this.isExpired(node.entry)) {
      this.remove(normalizedKey);
      this.stats.expirations++;
      return false;
    }

    return true;
  }

  /**
   * Remove a specific entry from the cache
   */
  remove(key: string): boolean {
    const normalizedKey = this.normalizeKeyFn(key);
    const node = this.cache.get(normalizedKey);

    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(normalizedKey);
    return true;
  }

  /**
   * Get cache entry with full metadata (without updating LRU)
   */
  peek(key: string): CacheEntry<T> | null {
    const normalizedKey = this.normalizeKeyFn(key);
    const node = this.cache.get(normalizedKey);

    if (!node) return null;

    // Check expiration
    if (this.isExpired(node.entry)) {
      this.remove(normalizedKey);
      this.stats.expirations++;
      return null;
    }

    return node.entry;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Reset statistics (without clearing cache)
   */
  resetStats(): void {
    this.stats = {
      gets: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.gets > 0 ? this.stats.hits / this.stats.gets : 0;

    let totalHits = 0;
    let memoryUsage = 0;

    for (const [key, node] of this.cache) {
      totalHits += node.entry.hits;
      // Rough memory estimate: key + value + metadata
      memoryUsage += key.length * 2; // UTF-16 chars
      memoryUsage += JSON.stringify(node.entry.value).length * 2;
      if (node.entry.metadata) {
        memoryUsage += JSON.stringify(node.entry.metadata).length * 2;
      }
      memoryUsage += 128; // Overhead for entry object and node
    }

    const avgHitsPerEntry = this.cache.size > 0 ? totalHits / this.cache.size : 0;

    return {
      gets: this.stats.gets,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      size: this.cache.size,
      capacity: this.capacity,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
      avgHitsPerEntry,
      memoryUsage,
      timestamp: Date.now(),
    };
  }

  /**
   * Export cache data for persistence
   * - Preserves LRU order (most recent first)
   * - Includes statistics
   * - Returns serializable JSON
   */
  export(): SerializedCache<T> {
    const entries: Array<{ key: string; entry: CacheEntry<T> }> = [];

    // Traverse from tail (least recent) to head (most recent)
    // Then reverse to get most recent first
    let current = this.tail;
    while (current) {
      entries.push({
        key: current.key,
        entry: { ...current.entry },
      });
      current = current.prev;
    }

    // Reverse to get most recent first
    entries.reverse();

    return {
      version: '1.0.0',
      capacity: this.capacity,
      entries,
      stats: { ...this.stats },
      exportedAt: Date.now(),
    };
  }

  /**
   * Import cache data from persistence
   * - Validates version compatibility
   * - Restores LRU order
   * - Skips expired entries
   * - Preserves statistics
   */
  import(data: SerializedCache<T>): void {
    // Validate version
    if (data.version !== '1.0.0') {
      throw new Error(`Incompatible cache version: ${data.version}`);
    }

    // Clear existing cache
    this.clear();

    // Update capacity if changed
    if (data.capacity !== this.capacity) {
      this.capacity = data.capacity;
    }

    // Restore statistics
    this.stats = { ...data.stats };

    // Restore entries in reverse order (oldest to newest)
    // This ensures the LRU list maintains correct order
    const now = Date.now();
    for (let i = data.entries.length - 1; i >= 0; i--) {
      const { key, entry } = data.entries[i];

      // Skip if expired
      if (this.isExpired(entry, now)) {
        this.stats.expirations++;
        continue;
      }

      // Skip if would exceed capacity
      if (this.cache.size >= this.capacity) {
        break;
      }

      const node = new LRUNode(key, entry);
      this.cache.set(key, node);
      this.addToHead(node);
    }
  }

  /**
   * Get all cache entries as an array (most recent first)
   */
  entries(): CacheEntry<T>[] {
    const result: CacheEntry<T>[] = [];
    let current = this.head;

    while (current) {
      if (!this.isExpired(current.entry)) {
        result.push({ ...current.entry });
      }
      current = current.next;
    }

    return result;
  }

  /**
   * Get all cache keys (most recent first)
   */
  keys(): string[] {
    const result: string[] = [];
    let current = this.head;

    while (current) {
      if (!this.isExpired(current.entry)) {
        result.push(current.key);
      }
      current = current.next;
    }

    return result;
  }

  /**
   * Get all cache values (most recent first)
   */
  values(): T[] {
    const result: T[] = [];
    let current = this.head;

    while (current) {
      if (!this.isExpired(current.entry)) {
        result.push(current.entry.value);
      }
      current = current.next;
    }

    return result;
  }

  /**
   * Find entries matching a predicate
   */
  find(predicate: (entry: CacheEntry<T>) => boolean): CacheEntry<T>[] {
    const result: CacheEntry<T>[] = [];
    let current = this.head;

    while (current) {
      if (!this.isExpired(current.entry) && predicate(current.entry)) {
        result.push({ ...current.entry });
      }
      current = current.next;
    }

    return result;
  }

  /**
   * Manually trigger cleanup of expired entries
   * - Removes all expired entries
   * - Returns number of entries removed
   */
  cleanup(): number {
    const before = this.cache.size;
    const now = Date.now();
    const toRemove: string[] = [];

    // Collect expired entries
    for (const [key, node] of this.cache) {
      if (this.isExpired(node.entry, now)) {
        toRemove.push(key);
      }
    }

    // Remove them
    for (const key of toRemove) {
      const node = this.cache.get(key);
      if (node) {
        this.removeNode(node);
        this.cache.delete(key);
      }
    }

    const removed = before - this.cache.size;
    this.stats.expirations += removed;

    return removed;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // Allow Node.js to exit even if timer is active
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop automatic cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
    this.resetStats();
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<T>, now: number = Date.now()): boolean {
    if (entry.ttl === 0) return false;
    return now - entry.createdAt > entry.ttl;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    if (!this.tail) return;

    const key = this.tail.key;
    this.removeNode(this.tail);
    this.cache.delete(key);
    this.stats.evictions++;
  }

  /**
   * Add a node to the head of the list (most recent)
   */
  private addToHead(node: LRUNode<T>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Move an existing node to the head of the list
   */
  private moveToHead(node: LRUNode<T>): void {
    if (node === this.head) return;

    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Remove a node from the list
   */
  private removeNode(node: LRUNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Get current size of the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache capacity
   */
  get maxSize(): number {
    return this.capacity;
  }

  /**
   * Check if cache is empty
   */
  get isEmpty(): boolean {
    return this.cache.size === 0;
  }

  /**
   * Check if cache is full
   */
  get isFull(): boolean {
    return this.cache.size >= this.capacity;
  }

  /**
   * Get current hit rate (0-1)
   */
  get hitRate(): number {
    return this.stats.gets > 0 ? this.stats.hits / this.stats.gets : 0;
  }
}

/**
 * Create a routing-optimized cache with default settings
 */
export function createRoutingCache<T = any>(capacity: number = 1000): HotCache<T> {
  return new HotCache<T>({
    capacity,
    defaultTtl: 0, // No expiration for routing patterns
    autoCleanup: false, // Not needed without TTL
  });
}

/**
 * Create a session cache with TTL
 */
export function createSessionCache<T = any>(
  capacity: number = 100,
  ttlMs: number = 3600000 // 1 hour default
): HotCache<T> {
  return new HotCache<T>({
    capacity,
    defaultTtl: ttlMs,
    autoCleanup: true,
    cleanupInterval: 60000, // Clean every minute
  });
}
