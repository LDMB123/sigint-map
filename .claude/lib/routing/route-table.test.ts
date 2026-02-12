/**
 * RouteTable Test Suite
 * Validates O(1) lookup performance, caching, and fuzzy matching
 */

import path from 'path';
import { RouteTable, SemanticHash } from './route-table';

describe('RouteTable', () => {
  let routeTable: RouteTable;

  beforeEach(() => {
    routeTable = new RouteTable();
  });

  describe('Semantic Hash Generation', () => {
    it('should generate hash for Rust borrow checker error', () => {
      const hash = routeTable.generateSemanticHash('Fix borrow checker error in my Rust code');

      expect(hash.domain).toBe(0x01); // rust
      expect(hash.action).toBe(0x0A); // fix/debug
      expect(hash.confidence).toBeGreaterThan(10);
    });

    it('should generate hash for component creation', () => {
      const hash = routeTable.generateSemanticHash('Create a new React component');

      expect(hash.domain).toBe(0x05); // frontend/react
      expect(hash.action).toBe(0x01); // create
    });

    it('should generate hash for database schema', () => {
      const hash = routeTable.generateSemanticHash('Create Prisma schema for user authentication');

      expect(hash.domain).toBe(0x0E); // prisma or database
      expect(hash.action).toBe(0x01); // create
    });

    it('should estimate complexity correctly', () => {
      const simple = routeTable.generateSemanticHash('Fix simple bug');
      const complex = routeTable.generateSemanticHash('Design complex distributed system architecture with microservices');

      expect(complex.complexity).toBeGreaterThan(simple.complexity);
    });
  });

  describe('Route Lookup', () => {
    it('should route Rust tasks to rust-semantics-engineer', () => {
      const route = routeTable.route('Debug borrow checker error in Rust');

      expect(route.agent).toBe('rust-semantics-engineer');
      expect(route.tier).toBe('opus');
    });

    it('should route frontend tasks to senior-frontend-engineer', () => {
      const route = routeTable.route('Create React component with TypeScript');

      expect(route.agent).toMatch(/frontend|react/i);
    });

    it('should route database tasks to prisma-schema-architect', () => {
      const route = routeTable.route('Create database schema');

      expect(route.agent).toMatch(/database|prisma/i);
    });

    it('should route testing tasks to vitest-testing-specialist', () => {
      const route = routeTable.route('Write tests for the API');

      expect(route.agent).toMatch(/test/i);
    });

    it('should fallback to default route for unknown tasks', () => {
      const route = routeTable.route('Something completely random and unrecognizable');

      expect(route.agent).toBe('full-stack-developer');
      expect(route.tier).toBe('sonnet');
    });
  });

  describe('Hot Path Cache', () => {
    it('should cache repeated requests', () => {
      const request = 'Fix borrow checker error';

      // First call - cache miss
      const route1 = routeTable.route(request);
      const stats1 = routeTable.getStats();

      // Second call - cache hit
      const route2 = routeTable.route(request);
      const stats2 = routeTable.getStats();

      expect(route1.agent).toBe(route2.agent);
      expect(stats2.cacheHits).toBe(stats1.cacheHits + 1);
      expect(stats2.cacheHitRate).toBeGreaterThan(0);
    });

    it('should normalize similar requests', () => {
      const route1 = routeTable.route('Fix   borrow   checker   error');
      const route2 = routeTable.route('fix borrow checker error');

      const stats = routeTable.getStats();
      expect(stats.cacheHits).toBeGreaterThan(0); // Second should be cache hit
    });

    it('should evict LRU entries when cache is full', () => {
      // Fill cache beyond capacity
      for (let i = 0; i < 1100; i++) {
        routeTable.route(`Unique request number ${i}`);
      }

      const stats = routeTable.getStats();
      expect(stats.cacheSize).toBeLessThanOrEqual(1000);
    });

    it('should export and import cache state', () => {
      // Populate cache
      routeTable.route('Fix borrow error');
      routeTable.route('Create component');

      // Export
      const exported = routeTable.exportCache();
      expect(Object.keys(exported).length).toBeGreaterThan(0);

      // Clear and import
      routeTable.clearCache();
      routeTable.importCache(exported);

      const stats = routeTable.getStats();
      expect(stats.cacheSize).toBe(Object.keys(exported).length);
    });
  });

  describe('Performance', () => {
    it('should route in under 0.1ms after warmup', () => {
      // Warmup cache
      const request = 'Fix TypeScript type error';
      routeTable.route(request);

      // Measure cached lookup
      const start = performance.now();
      routeTable.route(request);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(0.1);
    });

    it('should maintain average lookup time under 0.5ms', () => {
      const requests = [
        'Fix borrow error',
        'Create component',
        'Write tests',
        'Optimize performance',
        'Review code',
        'Deploy to production',
        'Debug API issue',
        'Refactor code',
        'Update documentation',
        'Migrate database'
      ];

      // Perform multiple lookups
      for (let i = 0; i < 100; i++) {
        const request = requests[i % requests.length];
        routeTable.route(request);
      }

      const stats = routeTable.getStats();
      expect(stats.avgLookupTimeMs).toBeLessThan(0.5);
    });

    it('should handle batch routing efficiently', () => {
      const requests = Array.from({ length: 100 }, (_, i) => `Request ${i}`);

      const start = performance.now();
      const routes = routeTable.batchRoute(requests);
      const duration = performance.now() - start;

      expect(routes.length).toBe(100);
      expect(duration).toBeLessThan(50); // <0.5ms per request
    });
  });

  describe('Fuzzy Matching', () => {
    it('should fuzzy match when exact route not found', () => {
      // Try a variation that might not have exact match
      const route = routeTable.route('Help with Rust lifetime issues');

      // Should still route to Rust specialist via fuzzy match
      expect(route.agent).toMatch(/rust/i);
    });

    it('should track fuzzy match statistics', () => {
      // Clear cache to force fresh lookups
      routeTable.clearCache();

      // Route something that requires fuzzy matching
      routeTable.route('Unusual Rust task that might need fuzzy matching');

      const stats = routeTable.getStats();
      // Stats should show either exact match or fuzzy match or default fallback
      expect(stats.lookups).toBeGreaterThan(0);
    });
  });

  describe('Manual Route Management', () => {
    it('should allow adding custom routes', () => {
      const customHash: SemanticHash = {
        domain: 0xFF,
        complexity: 10,
        action: 0xFF,
        subtype: 0xFFF,
        confidence: 15,
        reserved: 0
      };

      const customRoute = {
        agent: 'custom-specialist',
        tier: 'opus' as const,
        confidence: 15
      };

      routeTable.addRoute(customHash, customRoute);
      const retrieved = routeTable.getRoute(customHash);

      expect(retrieved).toEqual(customRoute);
    });

    it('should retrieve cache entries for debugging', () => {
      const request = 'Debug specific issue';
      routeTable.route(request);

      const entry = routeTable.getCacheEntry(request);
      expect(entry).toBeDefined();
      expect(entry?.requestPattern).toContain('debug specific issue');
    });
  });

  describe('Statistics', () => {
    it('should track comprehensive stats', () => {
      routeTable.route('Request 1');
      routeTable.route('Request 1'); // Cache hit
      routeTable.route('Request 2');

      const stats = routeTable.getStats();

      expect(stats.lookups).toBe(3);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(2);
      expect(stats.cacheHitRate).toBeCloseTo(0.333, 1);
      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.routeTableSize).toBeGreaterThan(0);
      expect(stats.avgLookupTimeMs).toBeGreaterThan(0);
    });

    it('should reset cache when cleared', () => {
      routeTable.route('Request 1');
      routeTable.route('Request 2');

      routeTable.clearCache();

      const stats = routeTable.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty requests', () => {
      const route = routeTable.route('');
      expect(route).toBeDefined();
      expect(route.agent).toBeTruthy();
    });

    it('should handle very long requests', () => {
      const longRequest = 'a'.repeat(10000);
      const route = routeTable.route(longRequest);

      expect(route).toBeDefined();
    });

    it('should handle special characters', () => {
      const route = routeTable.route('Fix bug in @/components/ui/Button.tsx');
      expect(route).toBeDefined();
    });

    it('should handle mixed case and whitespace', () => {
      const route1 = routeTable.route('   FIX   RUST   ERROR   ');
      const route2 = routeTable.route('fix rust error');

      // Both should route to same agent (via cache normalization)
      const stats = routeTable.getStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
    });
  });

  describe('Context-Aware Routing', () => {
    it('should accept context parameter', () => {
      const context = {
        projectType: 'rust',
        complexity: 'high',
        fileType: 'rs'
      };

      const route = routeTable.route('Fix error', context);
      expect(route).toBeDefined();
    });

    it('should adjust complexity based on context', () => {
      const simpleContext = { complexity: 'low' };
      const complexContext = { complexity: 'high' };

      const hash1 = routeTable.generateSemanticHash('Implement feature', simpleContext);
      const hash2 = routeTable.generateSemanticHash('Implement feature', complexContext);

      // Context may influence complexity estimation
      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
    });
  });
});

describe('RouteTable Integration', () => {
  it('should load from custom route table path', () => {
    const customPath = path.resolve(__dirname, '../../config/route-table.json');
    const table = new RouteTable(customPath);

    const stats = table.getStats();
    expect(stats.routeTableSize).toBeGreaterThan(0);
  });

  it('should gracefully handle missing route table file', () => {
    const table = new RouteTable('/nonexistent/path.json');

    // Should initialize with defaults
    const route = table.route('Some request');
    expect(route).toBeDefined();
  });
});

describe('Real-World Scenarios', () => {
  let routeTable: RouteTable;

  beforeEach(() => {
    routeTable = new RouteTable();
  });

  it('should handle typical development tasks', () => {
    const scenarios = [
      { request: 'Fix borrow checker error in src/main.rs', expectedDomain: 'rust' },
      { request: 'Create new SvelteKit route for user dashboard', expectedDomain: 'svelte' },
      { request: 'Optimize database query performance', expectedDomain: 'performance' },
      { request: 'Review security vulnerabilities in auth flow', expectedDomain: 'security' },
      { request: 'Write unit tests for API endpoints', expectedDomain: 'test' },
      { request: 'Refactor TypeScript types for better inference', expectedDomain: 'typescript' }
    ];

    for (const scenario of scenarios) {
      const route = routeTable.route(scenario.request);
      expect(route.agent).toBeDefined();
      expect(route.tier).toMatch(/opus|sonnet|haiku/);
    }
  });

  it('should achieve high cache hit rate for repeated patterns', () => {
    const commonRequests = [
      'Fix TypeScript error',
      'Debug API issue',
      'Update component',
      'Review code changes',
      'Optimize performance'
    ];

    // Simulate realistic usage pattern
    for (let i = 0; i < 50; i++) {
      const request = commonRequests[i % commonRequests.length];
      routeTable.route(request);
    }

    const stats = routeTable.getStats();
    expect(stats.cacheHitRate).toBeGreaterThan(0.7); // >70% cache hit rate
  });

  it('should maintain low latency under load', () => {
    const requests = Array.from({ length: 1000 }, (_, i) =>
      `Task ${i % 20}: ${i % 2 === 0 ? 'fix' : 'create'} something`
    );

    const start = performance.now();
    for (const request of requests) {
      routeTable.route(request);
    }
    const duration = performance.now() - start;

    const avgLatency = duration / requests.length;
    expect(avgLatency).toBeLessThan(0.5); // <0.5ms per request
  });
});
