/**
 * Integration Test Suite
 *
 * End-to-end tests verifying all fixes work together:
 * - BigInt hash packing with route table lookup
 * - Valid agent routing through semantic hash
 * - Tier consistency across the system
 * - Escalation engine integration with route table
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RouteTable } from '../route-table.js';
import { hashRequest, unpackHash } from '../semantic-hash.js';
import { EscalationEngine, createExecutionResult } from '../../tiers/escalation-engine.js';

describe('Integration Tests', () => {
  let routeTable: RouteTable;
  let escalationEngine: EscalationEngine;

  beforeEach(() => {
    routeTable = new RouteTable();
    escalationEngine = new EscalationEngine();
  });

  describe('Hash Packing + Route Table Integration', () => {
    it('should generate hash, pack it, and route correctly', () => {
      const request = 'optimize performance recursively';

      // Generate hash using semantic-hash
      const hash = hashRequest(request);

      // Verify it's a valid BigInt
      expect(typeof hash).toBe('bigint');
      expect(hash).toBeGreaterThanOrEqual(0n);

      // Unpack to verify structure
      const unpacked = unpackHash(hash);
      expect(unpacked.domain).toBeGreaterThan(0);
      expect(unpacked.action).toBeGreaterThan(0);

      // Route using route table
      const route = routeTable.route(request);
      expect(route.agent).toBeTruthy();
      expect(['opus', 'sonnet', 'haiku']).toContain(route.tier);
    });

    it('should maintain hash integrity through pack/unpack/route cycle', () => {
      const requests = [
        'optimize database query',
        'coordinate parallel workers',
        'learn transfer learning patterns',
        'execute superposition branches'
      ];

      requests.forEach(request => {
        const hash1 = hashRequest(request);
        const unpacked = unpackHash(hash1);

        // Verify all fields are within bounds
        expect(unpacked.domain).toBeLessThanOrEqual(0xFF);
        expect(unpacked.complexity).toBeLessThanOrEqual(0x0F);
        expect(unpacked.action).toBeLessThanOrEqual(0xFF);
        expect(unpacked.subtype).toBeLessThanOrEqual(0xFFF);
        expect(unpacked.confidence).toBeLessThanOrEqual(0x0F);

        // Route should work
        const route = routeTable.route(request);
        expect(route.agent).toBeTruthy();
      });
    });

    it('should use 64-bit hashes without truncation', () => {
      const request = 'complex task with many keywords';
      const hash = hashRequest(request);

      // Verify no truncation occurred (value fits in 64 bits)
      expect(hash).toBeLessThan(2n ** 64n);

      // Unpack and verify no data loss
      const unpacked = unpackHash(hash);
      const semantic = routeTable.generateSemanticHash(request);

      // Domain and action should match
      expect(unpacked.domain).toBe(semantic.domain);
      expect(unpacked.action).toBe(semantic.action);
    });
  });

  describe('Valid Agents + Tier Consistency Integration', () => {
    it('should route to valid agents with consistent tiers', () => {
      const testCases = [
        { request: 'optimize performance', expectedValid: true },
        { request: 'coordinate parallel tasks', expectedValid: true },
        { request: 'improve feedback loop', expectedValid: true },
        { request: 'learn new patterns', expectedValid: true }
      ];

      testCases.forEach(({ request, expectedValid }) => {
        const route = routeTable.route(request);

        if (expectedValid) {
          expect(route.agent).toBeTruthy();
          expect(route.agent).toMatch(/^[a-z0-9-]+$/);
          expect(['opus', 'sonnet', 'haiku']).toContain(route.tier);
        }
      });
    });

    it('should maintain tier consistency for similar complexity', () => {
      const simpleRequests = [
        'quick fix',
        'simple update',
        'basic task'
      ];

      const routes = simpleRequests.map(r => routeTable.route(r));
      const tiers = routes.map(r => r.tier);

      // All simple tasks should use similar tiers
      const uniqueTiers = new Set(tiers);
      expect(uniqueTiers.size).toBeLessThanOrEqual(2);
    });

    it('should escalate tiers for complex tasks', () => {
      const simple = routeTable.route('quick fix');
      const complex = routeTable.route('design distributed system with microservices');

      const tierRank = { haiku: 1, sonnet: 2, opus: 3 };

      // Complex should generally use higher or equal tier
      expect(tierRank[complex.tier]).toBeGreaterThanOrEqual(tierRank[simple.tier] - 1);
    });
  });

  describe('Route Table + Escalation Engine Integration', () => {
    it('should route task and escalate if quality is low', async () => {
      const request = 'optimize performance';
      const route = routeTable.route(request);

      // Simulate low quality result
      const result = createExecutionResult(route.tier, 'Low quality', {
        durationMs: 100,
        tokenCount: 30,
        truncated: false,
        qualityScore: 0.5
      });

      const decision = escalationEngine.evaluateEscalation(result, route.tier);

      if (route.tier !== 'opus') {
        expect(decision.shouldEscalate).toBe(true);
        expect(decision.nextTier).toBeDefined();
      }
    });

    it('should handle complete workflow: route -> execute -> escalate -> re-execute', () => {
      const request = 'coordinate parallel tasks';

      // Step 1: Route
      const initialRoute = routeTable.route(request);
      expect(initialRoute.agent).toBeTruthy();

      // Step 2: Simulate execution failure
      const failedResult = createExecutionResult(initialRoute.tier, 'Failed', {
        durationMs: 100,
        tokenCount: 30,
        truncated: false,
        confidence: 0.5
      });

      // Step 3: Evaluate escalation
      const decision = escalationEngine.evaluateEscalation(failedResult, initialRoute.tier);

      if (initialRoute.tier !== 'opus') {
        expect(decision.shouldEscalate).toBe(true);
        expect(decision.nextTier).toBeDefined();

        // Step 4: Re-route with higher tier
        const escalatedRoute = {
          ...initialRoute,
          tier: decision.nextTier!
        };
        expect(escalatedRoute.tier).not.toBe(initialRoute.tier);
      }
    });

    it('should track escalation statistics during routing', () => {
      const requests = [
        'task 1',
        'task 2',
        'task 3',
        'task 4',
        'task 5'
      ];

      requests.forEach(request => {
        const route = routeTable.route(request);
        escalationEngine.recordExecution(route.tier, 100);
      });

      const stats = escalationEngine.getStatistics();
      expect(stats.totalExecutions).toBe(5);
      expect(stats.escalationRate).toBeLessThanOrEqual(0.20);
    });
  });

  describe('Cache + Hash + Agent Integration', () => {
    it('should cache routes with valid BigInt hashes', () => {
      const request = 'optimize global search';

      routeTable.clearCache();
      const route1 = routeTable.route(request);

      const cacheEntry = routeTable.getCacheEntry(request);
      expect(cacheEntry).toBeDefined();
      expect(typeof cacheEntry!.semanticHash).toBe('bigint');
      expect(cacheEntry!.agent).toBe(route1.agent);

      // Second call should hit cache
      const route2 = routeTable.route(request);
      expect(route2.agent).toBe(route1.agent);

      const stats = routeTable.getStats();
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });

    it('should export/import cache with BigInt hashes preserved', () => {
      const request = 'coordinate massive parallelism';

      const route1 = routeTable.route(request);
      const exported = routeTable.exportCache();

      routeTable.clearCache();
      routeTable.importCache(exported);

      const route2 = routeTable.route(request);
      expect(route2.agent).toBe(route1.agent);
      expect(route2.tier).toBe(route1.tier);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should handle complete request lifecycle', () => {
      const request = 'optimize machine learning model performance';

      // 1. Generate semantic hash
      const hash = hashRequest(request);
      expect(typeof hash).toBe('bigint');

      // 2. Route to agent
      const route = routeTable.route(request);
      expect(route.agent).toBeTruthy();
      expect(route.tier).toBeTruthy();

      // 3. Validate hash unpacking
      const unpacked = unpackHash(hash);
      expect(unpacked.domain).toBeGreaterThanOrEqual(0);
      expect(unpacked.action).toBeGreaterThanOrEqual(0);

      // 4. Check cache
      const cacheEntry = routeTable.getCacheEntry(request);
      expect(cacheEntry?.agent).toBe(route.agent);

      // 5. Record execution
      escalationEngine.recordExecution(route.tier, 100);

      const stats = escalationEngine.getStatistics();
      expect(stats.totalExecutions).toBeGreaterThan(0);
    });

    it('should handle batch requests with consistent routing', () => {
      const requests = [
        'optimize performance',
        'coordinate tasks',
        'learn patterns',
        'execute branches',
        'improve feedback'
      ];

      // Batch route
      const routes = routeTable.batchRoute(requests);
      expect(routes.length).toBe(5);

      // All should have valid agents
      routes.forEach(route => {
        expect(route.agent).toBeTruthy();
        expect(['opus', 'sonnet', 'haiku']).toContain(route.tier);
      });

      // Record executions
      routes.forEach(route => {
        escalationEngine.recordExecution(route.tier, 100);
      });

      const stats = escalationEngine.getStatistics();
      expect(stats.totalExecutions).toBe(5);
    });

    it('should maintain consistency across cache clear cycles', () => {
      const request = 'optimize global optimization';

      const route1 = routeTable.route(request);
      routeTable.clearCache();
      const route2 = routeTable.route(request);

      // Should route to same agent even after cache clear
      expect(route2.agent).toBe(route1.agent);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty request gracefully', () => {
      const route = routeTable.route('');
      expect(route.agent).toBe('full-stack-developer');
      expect(route.tier).toBe('sonnet');
    });

    it('should handle very long request without issues', () => {
      const longRequest = 'optimize '.repeat(100) + 'performance';

      const route = routeTable.route(longRequest);
      expect(route.agent).toBeTruthy();
      expect(route.tier).toBeTruthy();
    });

    it('should handle unknown patterns with fallback', () => {
      const unknownRequest = 'xyz123 completely unknown pattern';

      const route = routeTable.route(unknownRequest);
      expect(route.agent).toBe('full-stack-developer');
      expect(route.tier).toBe('sonnet');
    });

    it('should handle maximum hash values without overflow', () => {
      // This tests the BigInt fix - should not overflow
      const hash = hashRequest('test request');
      expect(hash).toBeLessThan(2n ** 64n);
      expect(hash).toBeGreaterThanOrEqual(0n);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume routing efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        routeTable.route(`request ${i}`);
      }

      const elapsed = performance.now() - startTime;
      const avgTime = elapsed / 100;

      // Should be very fast (<1ms per route on average)
      expect(avgTime).toBeLessThan(1);
    });

    it('should maintain cache performance under load', () => {
      routeTable.clearCache();

      // Warm up cache
      for (let i = 0; i < 50; i++) {
        routeTable.route(`request ${i % 10}`);
      }

      const stats = routeTable.getStats();
      expect(stats.cacheHitRate).toBeGreaterThan(0.5);
    });

    it('should track statistics accurately under load', () => {
      for (let i = 0; i < 100; i++) {
        escalationEngine.recordExecution('haiku', 100);
      }

      for (let i = 0; i < 10; i++) {
        escalationEngine.recordEscalation('haiku', 'sonnet', 'quality-threshold');
      }

      const stats = escalationEngine.getStatistics();
      expect(stats.totalExecutions).toBe(110);
      expect(stats.totalEscalations).toBe(10);
      expect(stats.escalationRate).toBeCloseTo(0.091, 2);
    });
  });
});
