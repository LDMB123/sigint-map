/**
 * Hot Cache Integration Example
 *
 * Demonstrates how to integrate HotCache with route-table.ts and semantic-hash.ts
 * for high-performance routing with >70% cache hit rates.
 */

import { HotCache, createRoutingCache, type CacheEntry } from './hot-cache.js';
import { hashRequest, unpackHash, formatHash, analyzeRequest } from './semantic-hash.js';
import { RouteTable, type AgentRoute, type SemanticHash } from './route-table.js';

// ============================================================================
// Example 1: Basic Routing Cache Integration
// ============================================================================

/**
 * Agent route value with tier information
 */
interface RouteValue {
  agent: string;
  tier: 'opus' | 'sonnet' | 'haiku';
  confidence: number;
  avgLatency?: number;
  successRate?: number;
}

/**
 * Create a routing cache with semantic hash integration
 */
function createSmartRoutingCache() {
  const cache = createRoutingCache<RouteValue>(1000);

  return {
    /**
     * Route a request with automatic caching
     */
    route(request: string): RouteValue | null {
      // Try cache first (normalized key)
      const cached = cache.get(request);
      if (cached) {
        console.log(`✓ Cache hit: ${request.slice(0, 50)}...`);
        return cached;
      }

      console.log(`✗ Cache miss: ${request.slice(0, 50)}...`);

      // Generate semantic hash for routing
      const hash = hashRequest(request);
      const analysis = analyzeRequest(request);

      console.log(`  Hash: ${formatHash(hash)}`);
      console.log(`  Domain: ${analysis.breakdown.domain.name}`);
      console.log(`  Action: ${analysis.breakdown.action.name}`);

      // Route based on domain (simplified example)
      const route: RouteValue = (() => {
        switch (analysis.breakdown.domain.name) {
          case 'RUST':
            return { agent: 'rust-expert', tier: 'opus', confidence: 15 };
          case 'WASM':
            return { agent: 'wasm-specialist', tier: 'opus', confidence: 14 };
          case 'SECURITY':
            return { agent: 'security-engineer', tier: 'opus', confidence: 15 };
          case 'TYPESCRIPT':
            return { agent: 'typescript-type-wizard', tier: 'sonnet', confidence: 13 };
          case 'PRISMA':
            return { agent: 'prisma-schema-architect', tier: 'sonnet', confidence: 14 };
          case 'TRPC':
            return { agent: 'trpc-api-architect', tier: 'sonnet', confidence: 14 };
          case 'TESTING':
            return { agent: 'vitest-testing-specialist', tier: 'sonnet', confidence: 12 };
          default:
            return { agent: 'full-stack-developer', tier: 'sonnet', confidence: 10 };
        }
      })();

      // Cache with semantic hash
      cache.setWithHash(request, route, {
        metadata: {
          domain: analysis.breakdown.domain.name,
          action: analysis.breakdown.action.name,
          complexity: analysis.breakdown.complexity,
        },
      });

      return route;
    },

    /**
     * Get cache statistics
     */
    getStats() {
      return cache.getStats();
    },

    /**
     * Export cache for persistence
     */
    export() {
      return cache.export();
    },

    /**
     * Import cache from persistence
     */
    import(data: any) {
      cache.import(data);
    },

    /**
     * Clear cache
     */
    clear() {
      cache.clear();
    },

    /**
     * Destroy cache
     */
    destroy() {
      cache.destroy();
    },
  };
}

// ============================================================================
// Example 2: Enhanced RouteTable with HotCache
// ============================================================================

/**
 * Enhanced RouteTable that uses HotCache instead of built-in cache
 */
class EnhancedRouteTable extends RouteTable {
  private hotCache: HotCache<AgentRoute>;

  constructor(routeTablePath?: string) {
    super(routeTablePath);
    this.hotCache = createRoutingCache<AgentRoute>(1000);
  }

  /**
   * Override route method to use HotCache
   */
  override route(request: string, context?: Record<string, any>): AgentRoute {
    const startTime = performance.now();

    const normalizedRequest = this.normalizeRequest(request);

    // Check hot cache first
    const cached = this.hotCache.get(normalizedRequest);
    if (cached) {
      console.log(`[Hot Cache HIT] ${normalizedRequest.slice(0, 40)}... (${(performance.now() - startTime).toFixed(3)}ms)`);
      return cached;
    }

    // Cache miss - use parent routing logic
    console.log(`[Hot Cache MISS] ${normalizedRequest.slice(0, 40)}...`);
    const route = super.route(request, context);

    // Generate semantic hash and cache
    const hash = this.generateSemanticHash(request, context);
    const hashValue = this.packHash(hash);

    this.hotCache.setWithHash(normalizedRequest, route, {
      metadata: {
        hashValue,
        domain: hash.domain,
        action: hash.action,
        complexity: hash.complexity,
        confidence: hash.confidence,
      },
    });

    const elapsed = performance.now() - startTime;
    console.log(`[Route completed] ${elapsed.toFixed(3)}ms`);

    return route;
  }

  /**
   * Get hot cache statistics
   */
  getHotCacheStats() {
    return this.hotCache.getStats();
  }

  /**
   * Export hot cache data
   */
  exportHotCache() {
    return this.hotCache.export();
  }

  /**
   * Import hot cache data
   */
  importHotCache(data: any) {
    this.hotCache.import(data);
  }

  /**
   * Clear hot cache only (keep route table)
   */
  clearHotCache() {
    this.hotCache.clear();
  }

  /**
   * Normalize request (make public for testing)
   */
  normalizeRequest(request: string): string {
    return request
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
  }

  /**
   * Pack hash (make public for testing)
   */
  packHash(hash: SemanticHash): number {
    return (
      (hash.domain << 56) |
      (hash.complexity << 52) |
      (hash.action << 44) |
      (hash.subtype << 32) |
      (hash.confidence << 28) |
      hash.reserved
    );
  }
}

// ============================================================================
// Example 3: Practical Usage Demo
// ============================================================================

async function demonstrateHotCache() {
  console.log('='.repeat(80));
  console.log('Hot Cache Demo: High-Performance Routing');
  console.log('='.repeat(80));
  console.log();

  const routingCache = createSmartRoutingCache();

  // Simulate realistic routing patterns
  const requests = [
    'Fix borrow checker error in async Rust function',
    'Debug lifetime annotation issue in trait implementation',
    'Optimize database query performance for user lookup',
    'Create REST API endpoint for user authentication',
    'Fix borrow checker error in async Rust function', // Repeat
    'Debug lifetime annotation issue in trait implementation', // Repeat
    'Implement tRPC router for authentication',
    'Fix borrow checker error in async rust function', // Repeat (different case)
    'Write unit tests for authentication service',
    'Optimize database query performance for user lookup', // Repeat
    'Review security vulnerabilities in authentication flow',
    'Fix BORROW CHECKER error in ASYNC Rust function!!!', // Repeat (different formatting)
    'Create Prisma schema for user and posts',
    'Debug lifetime annotation issue in trait implementation', // Repeat
    'Implement WebAssembly module with Leptos SSR',
  ];

  console.log(`Processing ${requests.length} routing requests...\n`);

  // Process requests
  for (let i = 0; i < requests.length; i++) {
    console.log(`\n[${i + 1}/${requests.length}] ${requests[i]}`);
    const route = routingCache.route(requests[i]);
    console.log(`  → Routed to: ${route?.agent} (${route?.tier})`);
  }

  // Show statistics
  console.log('\n' + '='.repeat(80));
  console.log('Cache Statistics:');
  console.log('='.repeat(80));

  const stats = routingCache.getStats();
  console.log(`Total requests:     ${stats.gets}`);
  console.log(`Cache hits:         ${stats.hits}`);
  console.log(`Cache misses:       ${stats.misses}`);
  console.log(`Hit rate:           ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`Cache size:         ${stats.size}/${stats.capacity}`);
  console.log(`Avg hits per entry: ${stats.avgHitsPerEntry.toFixed(2)}`);
  console.log(`Memory usage:       ${(stats.memoryUsage / 1024).toFixed(2)} KB`);

  // Verify >70% hit rate target
  console.log();
  if (stats.hitRate >= 0.7) {
    console.log(`✓ SUCCESS: Hit rate ${(stats.hitRate * 100).toFixed(2)}% exceeds 70% target!`);
  } else {
    console.log(`✗ MISS: Hit rate ${(stats.hitRate * 100).toFixed(2)}% below 70% target`);
  }

  // Export cache for persistence
  console.log('\n' + '='.repeat(80));
  console.log('Exporting cache for persistence...');
  console.log('='.repeat(80));

  const exported = routingCache.export();
  console.log(`Exported ${exported.entries.length} cache entries`);
  console.log(`Cache version: ${exported.version}`);
  console.log();

  // Show top 5 most-hit entries
  const topEntries = exported.entries
    .sort((a, b) => b.entry.hits - a.entry.hits)
    .slice(0, 5);

  console.log('Top 5 most-hit patterns:');
  topEntries.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.entry.key.slice(0, 50)}... (${e.entry.hits} hits)`);
  });

  routingCache.destroy();
}

// ============================================================================
// Example 4: Enhanced RouteTable Demo
// ============================================================================

async function demonstrateEnhancedRouteTable() {
  console.log('\n\n' + '='.repeat(80));
  console.log('Enhanced RouteTable Demo with HotCache');
  console.log('='.repeat(80));
  console.log();

  const routeTable = new EnhancedRouteTable();

  const requests = [
    'Fix Rust borrow checker error',
    'Optimize Prisma database schema',
    'Create tRPC API endpoint',
    'Fix Rust borrow checker error', // Repeat
    'Debug TypeScript type inference',
    'Optimize Prisma database schema', // Repeat
    'Write Vitest unit tests',
    'Fix rust borrow checker error', // Repeat (normalized)
  ];

  console.log(`Processing ${requests.length} routing requests...\n`);

  for (const request of requests) {
    const route = routeTable.route(request);
    console.log(`${route.agent} (${route.tier})\n`);
  }

  const stats = routeTable.getHotCacheStats();
  console.log('='.repeat(80));
  console.log('Enhanced RouteTable Cache Statistics:');
  console.log('='.repeat(80));
  console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`Total gets: ${stats.gets}`);
  console.log(`Hits: ${stats.hits}`);
  console.log(`Misses: ${stats.misses}`);
  console.log();

  // Clean up
  routeTable.clearHotCache();
}

// ============================================================================
// Example 5: Cache Persistence
// ============================================================================

async function demonstratePersistence() {
  console.log('\n\n' + '='.repeat(80));
  console.log('Cache Persistence Demo');
  console.log('='.repeat(80));
  console.log();

  // Create cache and populate it
  const cache1 = createRoutingCache<RouteValue>(100);

  console.log('Populating cache...');
  cache1.setWithHash('Fix Rust error', { agent: 'rust-expert', tier: 'opus', confidence: 15 });
  cache1.setWithHash('Optimize database', { agent: 'prisma-schema-architect', tier: 'sonnet', confidence: 14 });
  cache1.setWithHash('Create API', { agent: 'trpc-api-architect', tier: 'sonnet', confidence: 13 });

  // Simulate usage
  cache1.get('Fix Rust error');
  cache1.get('Fix Rust error');
  cache1.get('Optimize database');

  const stats1 = cache1.getStats();
  console.log(`Cache 1 - Size: ${stats1.size}, Hits: ${stats1.hits}, Hit rate: ${(stats1.hitRate * 100).toFixed(2)}%`);

  // Export
  console.log('\nExporting cache...');
  const exported = cache1.export();
  console.log(`Exported ${exported.entries.length} entries`);

  // Create new cache and import
  console.log('\nCreating new cache and importing data...');
  const cache2 = createRoutingCache<RouteValue>(100);
  cache2.import(exported);

  const stats2 = cache2.getStats();
  console.log(`Cache 2 - Size: ${stats2.size}, Hits: ${stats2.hits}, Hit rate: ${(stats2.hitRate * 100).toFixed(2)}%`);

  // Verify data integrity
  console.log('\nVerifying data integrity...');
  const route1 = cache2.get('Fix Rust error');
  const route2 = cache2.get('Optimize database');
  console.log(`Route 1: ${route1?.agent} (${route1?.tier})`);
  console.log(`Route 2: ${route2?.agent} (${route2?.tier})`);

  cache1.destroy();
  cache2.destroy();

  console.log('\n✓ Persistence demo complete');
}

// ============================================================================
// Run All Demos
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await demonstrateHotCache();
      await demonstrateEnhancedRouteTable();
      await demonstratePersistence();

      console.log('\n' + '='.repeat(80));
      console.log('All demos completed successfully!');
      console.log('='.repeat(80));
    } catch (error) {
      console.error('Demo failed:', error);
      process.exit(1);
    }
  })();
}

// Export for use in other modules
export {
  createSmartRoutingCache,
  EnhancedRouteTable,
  demonstrateHotCache,
  demonstrateEnhancedRouteTable,
  demonstratePersistence,
};
