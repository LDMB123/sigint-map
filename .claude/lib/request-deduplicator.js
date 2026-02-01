#!/usr/bin/env node
/**
 * SWARM 8 - Task 4: Request Deduplication Layer
 * Prevents duplicate concurrent requests to the same agent
 */

const crypto = require('crypto');

class RequestDeduplicator {
  constructor(options = {}) {
    this.pendingRequests = new Map();
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes default
    this.maxCacheSize = options.maxCacheSize || 1000;

    // Start cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Generate unique key for request
   */
  generateRequestKey(agentId, input, context = {}) {
    const payload = JSON.stringify({
      agentId,
      input,
      context: this.normalizeContext(context)
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Normalize context to ignore volatile fields
   */
  normalizeContext(context) {
    const { timestamp, requestId, ...stable } = context;
    return stable;
  }

  /**
   * Execute request with deduplication
   */
  async executeWithDedup(agentId, input, context, executeFn) {
    const requestKey = this.generateRequestKey(agentId, input, context);

    // Check cache first
    const cached = this.getFromCache(requestKey);
    if (cached) {
      console.log(`[DEDUP] Cache hit for ${agentId} (key: ${requestKey.substring(0, 12)}...)`);
      return {
        ...cached,
        fromCache: true
      };
    }

    // Check if request is already in flight
    if (this.pendingRequests.has(requestKey)) {
      console.log(`[DEDUP] Deduplicating concurrent request for ${agentId}`);
      return await this.pendingRequests.get(requestKey);
    }

    // Execute new request
    console.log(`[DEDUP] Executing new request for ${agentId}`);
    const requestPromise = this.executeRequest(requestKey, executeFn);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;

      // Cache result
      this.addToCache(requestKey, result);

      return {
        ...result,
        fromCache: false
      };
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Execute the actual request
   */
  async executeRequest(requestKey, executeFn) {
    try {
      return await executeFn();
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }

  /**
   * Get from cache
   */
  getFromCache(key) {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Add to cache
   */
  addToCache(key, result) {
    // Evict oldest if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Start periodic cache cleanup
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.cacheTTL) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[DEDUP] Cleaned ${cleaned} expired cache entries`);
      }
    }, 60000); // Clean every minute
  }

  /**
   * Get deduplication statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      pendingRequests: this.pendingRequests.size,
      cacheTTL: this.cacheTTL
    };
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('[DEDUP] All caches cleared');
  }
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RequestDeduplicator;
}

// Demo usage
if (require.main === module) {
  const deduplicator = new RequestDeduplicator({
    cacheTTL: 5 * 60 * 1000,
    maxCacheSize: 1000
  });

  console.log('Request Deduplication Layer - Active');
  console.log('====================================');
  console.log('Features:');
  console.log('- Concurrent request deduplication');
  console.log('- Result caching with TTL');
  console.log('- Automatic cache eviction');
  console.log('- Request key normalization');
  console.log('');
  console.log('Stats:', deduplicator.getStats());
  console.log('');
  console.log('✓ SWARM 8 Task 4: Request deduplication layer deployed');
}
