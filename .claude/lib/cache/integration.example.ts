/**
 * Integration Example: Semantic Encoder with Cache Manager
 * Demonstrates end-to-end caching workflow
 */

import {
  extractSemanticKey,
  hashSemanticKey,
  calculateSimilarity,
  semanticKeyToString,
  type SemanticKey,
} from './semantic-encoder';

// ============================================================================
// Simulated Cache Store
// ============================================================================

interface CacheEntry {
  semanticKey: SemanticKey;
  hash: string;
  result: any;
  timestamp: number;
  hits: number;
}

class SemanticCacheStore {
  private cache = new Map<string, CacheEntry>();
  private stats = { hits: 0, misses: 0, similarHits: 0 };

  /**
   * Get from cache with exact match
   */
  getExact(request: string): any | null {
    const semanticKey = extractSemanticKey(request);
    const hash = hashSemanticKey(semanticKey);

    const entry = this.cache.get(hash);
    if (entry) {
      entry.hits++;
      this.stats.hits++;
      console.log(`  CACHE HIT (exact) - ${semanticKeyToString(semanticKey)}`);
      return entry.result;
    }

    return null;
  }

  /**
   * Get from cache with similarity matching
   */
  getSimilar(request: string, threshold: number = 0.85): any | null {
    const semanticKey = extractSemanticKey(request);

    // Check all cached entries for similarity
    let bestMatch: CacheEntry | null = null;
    let bestScore = 0;

    for (const entry of this.cache.values()) {
      const score = calculateSimilarity(semanticKey, entry.semanticKey);
      if (score >= threshold && score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hits++;
      this.stats.similarHits++;
      console.log(`  CACHE HIT (similar, ${(bestScore * 100).toFixed(1)}%) - ${semanticKeyToString(bestMatch.semanticKey)}`);
      return bestMatch.result;
    }

    return null;
  }

  /**
   * Set in cache
   */
  set(request: string, result: any): void {
    const semanticKey = extractSemanticKey(request);
    const hash = hashSemanticKey(semanticKey);

    this.cache.set(hash, {
      semanticKey,
      hash,
      result,
      timestamp: Date.now(),
      hits: 0,
    });

    console.log(`  CACHED - ${semanticKeyToString(semanticKey)}`);
  }

  /**
   * Execute with semantic caching
   */
  async execute(request: string, executor: () => Promise<any>): Promise<any> {
    console.log(`\nRequest: "${request}"`);

    // Try exact match first
    const exact = this.getExact(request);
    if (exact) return exact;

    // Try similar match
    const similar = this.getSimilar(request, 0.85);
    if (similar) return similar;

    // Cache miss - execute and store
    this.stats.misses++;
    console.log(`  CACHE MISS - executing...`);

    const result = await executor();
    this.set(request, result);

    return result;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.similarHits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits + this.stats.similarHits) / total : 0;

    return {
      ...this.stats,
      total,
      hitRate: (hitRate * 100).toFixed(1) + '%',
      cacheSize: this.cache.size,
    };
  }
}

// ============================================================================
// Simulation
// ============================================================================

async function simulateSession() {
  const cache = new SemanticCacheStore();

  // Simulated expensive operation (e.g., LLM call)
  const execute = async (result: string) => {
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate latency
    return result;
  };

  console.log('='.repeat(70));
  console.log('SEMANTIC CACHING SIMULATION');
  console.log('='.repeat(70));

  // Session 1: Working on Rust borrow checker issues
  console.log('\n--- Session 1: Rust Borrow Checker Work ---');

  await cache.execute(
    'Fix the borrow error in src/lib.rs',
    () => execute('Added explicit lifetime annotations')
  );

  await cache.execute(
    'Resolve borrow checker issue in src/lib.rs', // Same semantic intent
    () => execute('Should not execute - cache hit!')
  );

  await cache.execute(
    'Help with borrowing problem in src/lib.rs', // Same semantic intent
    () => execute('Should not execute - cache hit!')
  );

  await cache.execute(
    'Fix borrow error in lib.rs', // Similar (same basename)
    () => execute('Added lifetime annotations (similar match)')
  );

  // Session 2: Creating React components
  console.log('\n--- Session 2: React Component Creation ---');

  await cache.execute(
    'Create a new React component for user profile',
    () => execute('Created UserProfile.tsx component')
  );

  await cache.execute(
    'Add a React component for user settings', // Similar intent, different target
    () => execute('Created UserSettings.tsx component')
  );

  await cache.execute(
    'Generate a new component for header', // Similar intent
    () => execute('Should not execute if similar match!')
  );

  // Session 3: Performance optimization
  console.log('\n--- Session 3: Performance Work ---');

  await cache.execute(
    'Optimize performance in UserService',
    () => execute('Added caching and memoization')
  );

  await cache.execute(
    'Improve speed in UserService', // Same semantic intent
    () => execute('Should not execute - cache hit!')
  );

  await cache.execute(
    'Enhance performance of UserService', // Same semantic intent
    () => execute('Should not execute - cache hit!')
  );

  // Session 4: Test creation
  console.log('\n--- Session 4: Test Creation ---');

  await cache.execute(
    'Create tests for UserService',
    () => execute('Generated comprehensive test suite')
  );

  await cache.execute(
    'Add unit tests for UserService', // Same semantic intent
    () => execute('Should not execute - cache hit!')
  );

  await cache.execute(
    'Write tests for UserService', // Same semantic intent
    () => execute('Should not execute - cache hit!')
  );

  // Statistics
  console.log('\n' + '='.repeat(70));
  console.log('CACHE STATISTICS');
  console.log('='.repeat(70));

  const stats = cache.getStats();
  console.log('\nPerformance:');
  console.log(`  Total requests: ${stats.total}`);
  console.log(`  Exact hits: ${stats.hits}`);
  console.log(`  Similar hits: ${stats.similarHits}`);
  console.log(`  Misses: ${stats.misses}`);
  console.log(`  Cache entries: ${stats.cacheSize}`);
  console.log(`  Hit rate: ${stats.hitRate}`);

  console.log('\nCost Savings (estimated):');
  const avgTokensPerRequest = 1000;
  const costPerMillion = 3.0; // $3 per 1M input tokens (Sonnet)
  const tokensSaved = (stats.hits + stats.similarHits) * avgTokensPerRequest;
  const costSaved = (tokensSaved / 1_000_000) * costPerMillion;

  console.log(`  Tokens saved: ${tokensSaved.toLocaleString()}`);
  console.log(`  Cost saved: $${costSaved.toFixed(3)}`);
  console.log(`  Cost without cache: $${((stats.total * avgTokensPerRequest / 1_000_000) * costPerMillion).toFixed(3)}`);

  console.log('\n');
}

// Run simulation
simulateSession().catch(console.error);
