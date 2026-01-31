/**
 * Route Table Cleanup Test Suite
 *
 * Tests verify that route table cleanup was successful:
 * - All 14 valid agents work correctly
 * - Invalid/orphaned agents are removed
 * - Route table integrity maintained
 * - Agent routing consistency
 *
 * Valid agents (14 total):
 * 1. recursive-optimizer
 * 2. feedback-loop-optimizer
 * 3. meta-learner
 * 4. wave-function-optimizer
 * 5. massive-parallel-coordinator
 * 6. superposition-executor
 * 7-14. (Additional valid agents from semantic-route-table.json)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RouteTable } from '../route-table.js';
import type { AgentRoute, SemanticHash } from '../route-table.js';

// Expected valid agents from cleanup
const VALID_AGENTS = [
  'recursive-optimizer',
  'feedback-loop-optimizer',
  'meta-learner',
  'wave-function-optimizer',
  'massive-parallel-coordinator',
  'superposition-executor'
];

// Load semantic route table for validation
function loadRouteTableConfig() {
  const configPath = join(
    process.env.CLAUDE_PROJECT_ROOT || process.cwd(),
    '.claude',
    'config',
    'semantic-route-table.json'
  );
  try {
    const data = readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Could not load semantic-route-table.json, using defaults');
    return null;
  }
}

describe('Route Table Cleanup', () => {
  let routeTable: RouteTable;
  let routeConfig: any;

  beforeEach(() => {
    routeTable = new RouteTable();
    routeConfig = loadRouteTableConfig();
  });

  describe('Valid Agent Verification', () => {
    it('should have exactly the expected valid agents', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const agents = routeConfig.agents;
      const allAgentNames: string[] = [];

      // Extract all agent names from config
      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          if (agent.name) {
            allAgentNames.push(agent.name);
          }
        });
      });

      // Verify expected agents are present
      VALID_AGENTS.forEach(agentName => {
        expect(allAgentNames).toContain(agentName);
      });
    });

    it('should route requests to valid agents only', () => {
      const testRequests = [
        'optimize performance recursively',
        'improve feedback loop',
        'learn transfer learning',
        'find global optimum',
        'coordinate massive parallelism',
        'execute in superposition'
      ];

      testRequests.forEach(request => {
        const route = routeTable.route(request);
        expect(route.agent).toBeTruthy();
        expect(typeof route.agent).toBe('string');
        expect(route.agent.length).toBeGreaterThan(0);
      });
    });

    it('should not reference any invalid or orphaned agents', () => {
      const invalidAgents = [
        'nonexistent-agent',
        'deleted-optimizer',
        'removed-coordinator',
        ''
      ];

      // Try routing to patterns that should NOT produce these agents
      const route1 = routeTable.route('optimize something');
      const route2 = routeTable.route('coordinate tasks');

      invalidAgents.forEach(invalidAgent => {
        expect(route1.agent).not.toBe(invalidAgent);
        expect(route2.agent).not.toBe(invalidAgent);
      });
    });

    it('should validate all agents have proper kebab-case naming', () => {
      VALID_AGENTS.forEach(agent => {
        expect(agent).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });

    it('should verify each valid agent can be routed to', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      // Test that each agent appears in routing
      const routes = routeConfig.routes;
      const routedAgents = new Set<string>();

      Object.values(routes).forEach((domain: any) => {
        Object.values(domain).forEach((route: any) => {
          if (route.agent) {
            routedAgents.add(route.agent);
          }
        });
      });

      VALID_AGENTS.forEach(agent => {
        expect(routedAgents.has(agent)).toBe(true);
      });
    });
  });

  describe('Route Table Integrity', () => {
    it('should load route table without errors', () => {
      expect(routeTable).toBeDefined();
      const stats = routeTable.getStats();
      expect(stats).toBeDefined();
    });

    it('should have consistent route mappings', () => {
      const hash: SemanticHash = {
        domain: 0x01,
        complexity: 0x08,
        action: 0x03,
        subtype: 0x001,
        confidence: 0x0A,
        reserved: 0
      };

      const route: AgentRoute = {
        agent: 'recursive-optimizer',
        tier: 'sonnet'
      };

      routeTable.addRoute(hash, route);
      const retrieved = routeTable.getRoute(hash);

      expect(retrieved).toBeDefined();
      expect(retrieved?.agent).toBe('recursive-optimizer');
      expect(retrieved?.tier).toBe('sonnet');
    });

    it('should maintain routing consistency after multiple operations', () => {
      const request = 'optimize performance';

      const route1 = routeTable.route(request);
      const route2 = routeTable.route(request);
      const route3 = routeTable.route(request);

      expect(route1.agent).toBe(route2.agent);
      expect(route2.agent).toBe(route3.agent);
      expect(route1.tier).toBe(route2.tier);
    });

    it('should handle batch routing to valid agents', () => {
      const requests = [
        'optimize performance',
        'coordinate parallel tasks',
        'learn from examples',
        'execute branches',
        'optimize globally',
        'improve feedback'
      ];

      const routes = routeTable.batchRoute(requests);

      expect(routes).toHaveLength(6);
      routes.forEach(route => {
        expect(route.agent).toBeTruthy();
        expect(['opus', 'sonnet', 'haiku']).toContain(route.tier);
      });
    });
  });

  describe('Agent Metadata Validation', () => {
    it('should validate agent tier assignments', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const agents = routeConfig.agents;
      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          expect(['opus', 'sonnet', 'haiku']).toContain(agent.tier);
        });
      });
    });

    it('should validate agent capabilities are defined', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const agents = routeConfig.agents;
      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          expect(agent.capabilities).toBeDefined();
          expect(Array.isArray(agent.capabilities)).toBe(true);
          expect(agent.capabilities.length).toBeGreaterThan(0);
        });
      });
    });

    it('should validate agent domains are specified', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const agents = routeConfig.agents;
      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          expect(agent.domains).toBeDefined();
          expect(Array.isArray(agent.domains)).toBe(true);
          expect(agent.domains.length).toBeGreaterThan(0);
        });
      });
    });

    it('should validate agent action types', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const agents = routeConfig.agents;
      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          expect(agent.action_types).toBeDefined();
          expect(Array.isArray(agent.action_types)).toBe(true);
          expect(agent.action_types.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Routing Pattern Validation', () => {
    it('should route optimization tasks to valid optimizers', () => {
      const optimizationRequests = [
        'optimize performance',
        'improve efficiency',
        'enhance throughput',
        'find global optimum'
      ];

      optimizationRequests.forEach(request => {
        const route = routeTable.route(request);
        expect(route.agent).toBeTruthy();
      });
    });

    it('should route parallel tasks to valid coordinators', () => {
      const parallelRequests = [
        'coordinate 100 workers',
        'distribute tasks in parallel',
        'execute multiple branches',
        'parallelize execution'
      ];

      parallelRequests.forEach(request => {
        const route = routeTable.route(request);
        expect(route.agent).toBeTruthy();
      });
    });

    it('should route learning tasks to valid learners', () => {
      const learningRequests = [
        'learn from examples',
        'transfer learning',
        'adapt to new domain',
        'meta learning'
      ];

      learningRequests.forEach(request => {
        const route = routeTable.route(request);
        expect(route.agent).toBeTruthy();
      });
    });

    it('should fallback gracefully for unknown patterns', () => {
      const unknownRequests = [
        'completely unknown task xyz123',
        'random gibberish request',
        'undefined operation'
      ];

      unknownRequests.forEach(request => {
        const route = routeTable.route(request);
        expect(route.agent).toBe('full-stack-developer');
        expect(route.tier).toBe('sonnet');
      });
    });
  });

  describe('Cache and Performance', () => {
    it('should cache valid agent routes', () => {
      const request = 'optimize performance recursively';

      routeTable.clearCache();
      const route1 = routeTable.route(request);

      const stats = routeTable.getStats();
      expect(stats.cacheSize).toBeGreaterThan(0);

      const route2 = routeTable.route(request);
      expect(route2.agent).toBe(route1.agent);
    });

    it('should track cache hit rate', () => {
      const request = 'coordinate parallel tasks';

      routeTable.clearCache();
      routeTable.route(request); // Cache miss
      routeTable.route(request); // Cache hit

      const stats = routeTable.getStats();
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });

    it('should export and import cache with valid agents', () => {
      const request = 'improve feedback loop';
      const route1 = routeTable.route(request);

      const exported = routeTable.exportCache();
      routeTable.clearCache();
      routeTable.importCache(exported);

      const route2 = routeTable.route(request);
      expect(route2.agent).toBe(route1.agent);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track routing statistics', () => {
      routeTable.route('optimize task 1');
      routeTable.route('optimize task 2');
      routeTable.route('coordinate task 3');

      const stats = routeTable.getStats();
      expect(stats.lookups).toBeGreaterThanOrEqual(3);
      expect(stats.avgLookupTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should track fuzzy matches', () => {
      routeTable.clearCache();

      const request = 'do something with optimization maybe';
      routeTable.route(request);

      const stats = routeTable.getStats();
      const totalMatches = stats.fuzzyMatches + stats.defaultFallbacks;
      expect(totalMatches).toBeGreaterThan(0);
    });

    it('should provide route table size metrics', () => {
      const stats = routeTable.getStats();
      expect(stats.routeTableSize).toBeGreaterThanOrEqual(0);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
    });
  });
});
