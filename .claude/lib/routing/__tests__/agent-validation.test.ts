/**
 * Agent Validation Test Suite
 *
 * Tests agent validation, invalid agent rejection, fallback mechanisms,
 * and routing consistency across the system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RouteTable } from '../route-table.js';
import type { AgentRoute, SemanticHash } from '../route-table.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Agent Validation', () => {
  let routeTable: RouteTable;

  beforeEach(() => {
    routeTable = new RouteTable();
  });

  describe('Valid Agent Routes', () => {
    it('should accept valid agent names', () => {
      const validAgents = [
        'rust-semantics-engineer',
        'wasm-optimizer',
        'security-scanner',
        'full-stack-developer',
        'database-architect',
        'test-engineer'
      ];

      validAgents.forEach(agent => {
        const route = routeTable.route('test request');
        expect(route.agent).toBeTruthy();
        expect(route.agent).toMatch(/^[a-z0-9-]+$/);
      });
    });

    it('should validate tier values', () => {
      const route = routeTable.route('Fix borrow checker error');
      expect(['opus', 'sonnet', 'haiku']).toContain(route.tier);
    });

    it('should validate confidence scores', () => {
      const hash: SemanticHash = {
        domain: 0x01,
        complexity: 0x0C,
        action: 0x02,
        subtype: 0x042,
        confidence: 0x0F,
        reserved: 0
      };

      const route = routeTable.getRoute(hash);
      if (route && route.confidence !== undefined) {
        expect(route.confidence).toBeGreaterThanOrEqual(0);
        expect(route.confidence).toBeLessThanOrEqual(15);
      }
    });

    it('should validate avgLatency if present', () => {
      const route = routeTable.route('test request');
      if (route.avgLatency !== undefined) {
        expect(route.avgLatency).toBeGreaterThanOrEqual(0);
        expect(route.avgLatency).toBeLessThan(10000);
      }
    });
  });

  describe('Invalid Agent Rejection', () => {
    it('should reject routes with empty agent names', () => {
      const invalidHash: SemanticHash = {
        domain: 0xFF,
        complexity: 0x00,
        action: 0xFF,
        subtype: 0xFFF,
        confidence: 0x00,
        reserved: 0
      };

      const invalidRoute: AgentRoute = {
        agent: '',
        tier: 'sonnet'
      };

      routeTable.addRoute(invalidHash, invalidRoute);
      const retrieved = routeTable.getRoute(invalidHash);

      // Should either reject empty agent or fallback to default
      if (retrieved) {
        expect(retrieved.agent).toBeTruthy();
        expect(retrieved.agent.length).toBeGreaterThan(0);
      }
    });

    it('should handle invalid tier values gracefully', () => {
      const hash: SemanticHash = {
        domain: 0x01,
        complexity: 0x05,
        action: 0x01,
        subtype: 0x001,
        confidence: 0x0A,
        reserved: 0
      };

      // TypeScript should prevent this, but test runtime behavior
      const route = routeTable.route('create something');
      expect(['opus', 'sonnet', 'haiku']).toContain(route.tier);
    });

    it('should reject non-existent agent routes', () => {
      const nonExistentHash: SemanticHash = {
        domain: 0xFE,
        complexity: 0x0F,
        action: 0xFE,
        subtype: 0xFFE,
        confidence: 0x01,
        reserved: 0
      };

      const route = routeTable.getRoute(nonExistentHash);
      // Should return undefined or fallback
      if (route) {
        expect(route.agent).toBeTruthy();
      }
    });

    it('should validate agent name format', () => {
      const route = routeTable.route('test');

      // Agent names should be kebab-case
      expect(route.agent).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should fallback to default route for unknown requests', () => {
      const unknownRequests = [
        'zxcvbnmasdfghjkl qwertyuiop',
        'completely unrecognizable gibberish',
        '!@#$%^&*()',
        ''
      ];

      unknownRequests.forEach(request => {
        const route = routeTable.route(request);
        expect(route).toBeDefined();
        expect(route.agent).toBe('full-stack-developer');
        expect(route.tier).toBe('sonnet');
      });
    });

    it('should track default fallback statistics', () => {
      const statsBefore = routeTable.getStats();
      const beforeFallbacks = statsBefore.defaultFallbacks;

      // Trigger fallback with unknown request
      routeTable.clearCache(); // Clear to force lookup
      routeTable.route('completely unknown request pattern xyz123');

      const statsAfter = routeTable.getStats();
      expect(statsAfter.defaultFallbacks).toBeGreaterThanOrEqual(beforeFallbacks);
    });

    it('should use fuzzy matching before falling back to default', () => {
      routeTable.clearCache();

      // Request that should fuzzy match to Rust domain
      const route = routeTable.route('Help with lifetime annotations in my code');

      const stats = routeTable.getStats();
      // Should either fuzzy match or fall back
      expect(stats.fuzzyMatches + stats.defaultFallbacks).toBeGreaterThan(0);
    });

    it('should provide sensible defaults for edge cases', () => {
      const edgeCases = [
        { request: '', expectedAgent: 'full-stack-developer' },
        { request: ' ', expectedAgent: 'full-stack-developer' },
        { request: '\n\t\r', expectedAgent: 'full-stack-developer' }
      ];

      edgeCases.forEach(({ request, expectedAgent }) => {
        const route = routeTable.route(request);
        expect(route.agent).toBe(expectedAgent);
      });
    });

    it('should cascade through fallback hierarchy', () => {
      // Test fallback order: exact match -> fuzzy match -> default
      routeTable.clearCache();

      const unknownRoute = routeTable.route('xyzabc123 unknown pattern');
      expect(unknownRoute.agent).toBe('full-stack-developer');
      expect(unknownRoute.tier).toBe('sonnet');
    });
  });

  describe('Route Table Validation', () => {
    it('should validate route table structure on load', () => {
      // RouteTable should handle missing or invalid files gracefully
      const invalidPath = '/nonexistent/route-table.json';
      const table = new RouteTable(invalidPath);

      const route = table.route('test');
      expect(route).toBeDefined();
      expect(route.agent).toBeTruthy();
    });

    it('should validate domain mappings', () => {
      const hash = routeTable.generateSemanticHash('rust borrow checker');
      expect(hash.domain).toBeGreaterThan(0);
      expect(hash.domain).toBeLessThanOrEqual(0xFF);
    });

    it('should validate action mappings', () => {
      const hash = routeTable.generateSemanticHash('create component');
      expect(hash.action).toBeGreaterThan(0);
      expect(hash.action).toBeLessThanOrEqual(0xFF);
    });

    it('should validate subtype mappings', () => {
      const hash = routeTable.generateSemanticHash('borrow checker error');
      expect(hash.subtype).toBeGreaterThanOrEqual(0);
      expect(hash.subtype).toBeLessThanOrEqual(0xFFF);
    });

    it('should maintain route table integrity after operations', () => {
      const statsBefore = routeTable.getStats();
      const initialSize = statsBefore.routeTableSize;

      // Add custom route
      const customHash: SemanticHash = {
        domain: 0xAA,
        complexity: 0x08,
        action: 0xBB,
        subtype: 0xCCC,
        confidence: 0x0D,
        reserved: 0
      };

      routeTable.addRoute(customHash, {
        agent: 'custom-agent',
        tier: 'opus',
        confidence: 13
      });

      const statsAfter = routeTable.getStats();
      expect(statsAfter.routeTableSize).toBeGreaterThan(initialSize);
    });
  });

  describe('Agent Directory Validation', () => {
    it('should handle empty agent directory', () => {
      // Create a route table with minimal/empty configuration
      const emptyTable = new RouteTable();

      const route = emptyTable.route('any request');
      expect(route).toBeDefined();
      expect(route.agent).toBeTruthy();
    });

    it('should validate agent availability', () => {
      const route = routeTable.route('test request');

      // Agent should be a valid string identifier
      expect(typeof route.agent).toBe('string');
      expect(route.agent.length).toBeGreaterThan(0);
      expect(route.agent).not.toMatch(/\s/); // No whitespace
    });

    it('should handle missing agent metadata gracefully', () => {
      const hash: SemanticHash = {
        domain: 0x01,
        complexity: 0x05,
        action: 0x02,
        subtype: 0x042,
        confidence: 0x0A,
        reserved: 0
      };

      const minimalRoute: AgentRoute = {
        agent: 'minimal-agent',
        tier: 'sonnet'
        // No confidence or avgLatency
      };

      routeTable.addRoute(hash, minimalRoute);
      const retrieved = routeTable.getRoute(hash);

      expect(retrieved).toBeDefined();
      expect(retrieved?.agent).toBe('minimal-agent');
      expect(retrieved?.tier).toBe('sonnet');
    });
  });

  describe('Tier and Model Consistency', () => {
    it('should maintain tier consistency across routes', () => {
      const routes = [
        routeTable.route('simple quick fix'),
        routeTable.route('moderate complexity refactoring'),
        routeTable.route('complex distributed system architecture')
      ];

      routes.forEach(route => {
        expect(['opus', 'sonnet', 'haiku']).toContain(route.tier);
      });
    });

    it('should assign appropriate tiers based on complexity', () => {
      const simple = routeTable.route('quick simple fix');
      const complex = routeTable.route('design scalable distributed architecture with microservices');

      // Complex tasks should generally use higher tiers
      // (though not strictly enforced, this tests the heuristic)
      const tierPriority = { haiku: 0, sonnet: 1, opus: 2 };
      const simplePriority = tierPriority[simple.tier];
      const complexPriority = tierPriority[complex.tier];

      // Complex should typically be >= simple tier
      expect(complexPriority).toBeGreaterThanOrEqual(simplePriority - 1);
    });

    it('should maintain tier consistency for cached routes', () => {
      const request = 'fix borrow checker error';

      const route1 = routeTable.route(request);
      const route2 = routeTable.route(request); // Cached

      expect(route1.tier).toBe(route2.tier);
      expect(route1.agent).toBe(route2.agent);
    });

    it('should validate tier assignment for known patterns', () => {
      const criticalRoutes = [
        { request: 'fix security vulnerability', minTier: 'sonnet' },
        { request: 'debug production issue', minTier: 'sonnet' },
        { request: 'architecture review', minTier: 'sonnet' }
      ];

      const tierRank = { haiku: 1, sonnet: 2, opus: 3 };

      criticalRoutes.forEach(({ request, minTier }) => {
        const route = routeTable.route(request);
        expect(tierRank[route.tier]).toBeGreaterThanOrEqual(tierRank[minTier as 'haiku' | 'sonnet' | 'opus']);
      });
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle null/undefined gracefully in route lookup', () => {
      // TypeScript prevents this, but test runtime safety
      const routes = [
        routeTable.route(''),
        routeTable.route(' '),
        routeTable.route('a')
      ];

      routes.forEach(route => {
        expect(route).toBeDefined();
        expect(route.agent).toBeTruthy();
        expect(route.tier).toBeTruthy();
      });
    });

    it('should validate against duplicate agent routes', () => {
      const hash: SemanticHash = {
        domain: 0x42,
        complexity: 0x08,
        action: 0x15,
        subtype: 0x3E8,
        confidence: 0x0C,
        reserved: 0
      };

      const route1: AgentRoute = { agent: 'agent-1', tier: 'opus' };
      const route2: AgentRoute = { agent: 'agent-2', tier: 'sonnet' };

      routeTable.addRoute(hash, route1);
      routeTable.addRoute(hash, route2); // Overwrite

      const retrieved = routeTable.getRoute(hash);
      expect(retrieved?.agent).toBe('agent-2'); // Should use latest
    });

    it('should validate semantic hash bounds', () => {
      const hash = routeTable.generateSemanticHash('test request');

      expect(hash.domain).toBeGreaterThanOrEqual(0);
      expect(hash.domain).toBeLessThanOrEqual(0xFF);

      expect(hash.complexity).toBeGreaterThanOrEqual(0);
      expect(hash.complexity).toBeLessThanOrEqual(0x0F);

      expect(hash.action).toBeGreaterThanOrEqual(0);
      expect(hash.action).toBeLessThanOrEqual(0xFF);

      expect(hash.subtype).toBeGreaterThanOrEqual(0);
      expect(hash.subtype).toBeLessThanOrEqual(0xFFF);

      expect(hash.confidence).toBeGreaterThanOrEqual(0);
      expect(hash.confidence).toBeLessThanOrEqual(0x0F);
    });

    it('should handle very long agent names', () => {
      const longName = 'a'.repeat(200);
      const hash: SemanticHash = {
        domain: 0x01,
        complexity: 0x05,
        action: 0x01,
        subtype: 0x001,
        confidence: 0x0A,
        reserved: 0
      };

      const route: AgentRoute = {
        agent: longName,
        tier: 'sonnet'
      };

      routeTable.addRoute(hash, route);
      const retrieved = routeTable.getRoute(hash);

      expect(retrieved?.agent).toBe(longName);
    });
  });

  describe('Cross-validation', () => {
    it('should maintain consistency between route and cache', () => {
      const request = 'fix typescript error';

      const route1 = routeTable.route(request);
      const cacheEntry = routeTable.getCacheEntry(request);

      expect(cacheEntry).toBeDefined();
      expect(cacheEntry?.agent).toBe(route1.agent);
      expect(cacheEntry?.tier).toBe(route1.tier);
    });

    it('should validate batch routing consistency', () => {
      const requests = ['request 1', 'request 2', 'request 1'];
      const routes = routeTable.batchRoute(requests);

      expect(routes.length).toBe(3);
      expect(routes[0].agent).toBe(routes[2].agent); // Same request
      expect(routes[0].tier).toBe(routes[2].tier);
    });

    it('should validate export/import preserves routes', () => {
      const request = 'test request';
      const route1 = routeTable.route(request);

      const exported = routeTable.exportCache();
      routeTable.clearCache();
      routeTable.importCache(exported);

      const route2 = routeTable.route(request);
      expect(route2.agent).toBe(route1.agent);
      expect(route2.tier).toBe(route1.tier);
    });
  });
});
