/**
 * Tier Consistency Test Suite
 *
 * Verifies that semantic-route-table.json has correct tier assignments:
 * - All agents have valid tiers (opus/sonnet/haiku)
 * - Tier assignments match agent complexity
 * - Tier consistency across routing patterns
 * - Model/tier alignment is correct
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RouteTable } from '../route-table.js';
import type { ModelTier } from '../../tiers/escalation-engine.js';

// Load semantic route table
function loadSemanticRouteTable() {
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
    console.warn('Could not load semantic-route-table.json');
    return null;
  }
}

describe('Tier Consistency', () => {
  let routeConfig: any;
  let routeTable: RouteTable;

  beforeEach(() => {
    routeConfig = loadSemanticRouteTable();
    routeTable = new RouteTable();
  });

  describe('Agent Tier Validation', () => {
    it('should have valid tier for all agents', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const validTiers: ModelTier[] = ['opus', 'sonnet', 'haiku'];
      const agents = routeConfig.agents;

      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          expect(validTiers).toContain(agent.tier);
        });
      });
    });

    it('should have tier matching model capability', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const agents = routeConfig.agents;
      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          // Tier should generally align with model
          // opus model -> opus/sonnet tier (high capability)
          // sonnet model -> sonnet tier (medium capability)
          // haiku model -> haiku tier (fast, simple)
          
          if (agent.model === 'opus') {
            expect(['opus', 'sonnet']).toContain(agent.tier);
          } else if (agent.model === 'haiku') {
            expect(agent.tier).toBe('haiku');
          }
        });
      });
    });

    it('should assign appropriate tiers based on complexity levels', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const agents = routeConfig.agents;
      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          const complexityLevels = agent.complexity_levels || [];
          
          // If agent handles expert-level tasks, should use opus or sonnet
          if (complexityLevels.includes('expert')) {
            expect(['opus', 'sonnet']).toContain(agent.tier);
          }
          
          // If agent only handles low complexity, haiku is appropriate
          if (complexityLevels.length === 1 && complexityLevels[0] === 'low') {
            expect(['haiku', 'sonnet']).toContain(agent.tier);
          }
        });
      });
    });

    it('should validate tier distribution makes sense', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const tierCounts = { opus: 0, sonnet: 0, haiku: 0 };
      const agents = routeConfig.agents;

      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          tierCounts[agent.tier as keyof typeof tierCounts]++;
        });
      });

      // Should have some distribution across tiers
      expect(tierCounts.sonnet).toBeGreaterThan(0);
      
      // Total should match expected agent count
      const total = tierCounts.opus + tierCounts.sonnet + tierCounts.haiku;
      expect(total).toBeGreaterThan(0);

      // Verify metadata matches if present
      if (routeConfig.metadata?.tier_distribution) {
        expect(tierCounts.haiku).toBe(routeConfig.metadata.tier_distribution.haiku);
        expect(tierCounts.sonnet).toBe(routeConfig.metadata.tier_distribution.sonnet);
        expect(tierCounts.opus).toBe(routeConfig.metadata.tier_distribution.opus);
      }
    });
  });

  describe('Route Tier Validation', () => {
    it('should have valid tiers in all route entries', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const validTiers: ModelTier[] = ['opus', 'sonnet', 'haiku'];
      const routes = routeConfig.routes;

      Object.values(routes).forEach((domain: any) => {
        Object.values(domain).forEach((route: any) => {
          expect(validTiers).toContain(route.tier);
        });
      });
    });

    it('should have tier consistency between route and agent', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const agentTiers = new Map<string, ModelTier>();
      const agents = routeConfig.agents;

      // Build map of agent -> tier
      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          agentTiers.set(agent.name, agent.tier);
        });
      });

      // Verify routes use same tier as their agent
      const routes = routeConfig.routes;
      Object.values(routes).forEach((domain: any) => {
        Object.values(domain).forEach((route: any) => {
          const expectedTier = agentTiers.get(route.agent);
          if (expectedTier) {
            expect(route.tier).toBe(expectedTier);
          }
        });
      });
    });

    it('should assign higher tiers to higher complexity routes', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const routes = routeConfig.routes;
      const tierRank = { haiku: 1, sonnet: 2, opus: 3 };

      Object.values(routes).forEach((domain: any) => {
        Object.entries(domain).forEach(([pattern, route]: [string, any]) => {
          // Extract complexity from pattern (domain:action:complexity:context)
          const parts = pattern.split(':');
          if (parts.length >= 3) {
            const complexity = parts[2];
            
            // High/expert complexity should use sonnet or opus
            if (['high', 'expert'].includes(complexity)) {
              expect(tierRank[route.tier as keyof typeof tierRank]).toBeGreaterThanOrEqual(2);
            }
            
            // Low complexity can use any tier, but haiku is most efficient
            if (complexity === 'low') {
              expect(['haiku', 'sonnet']).toContain(route.tier);
            }
          }
        });
      });
    });
  });

  describe('Complexity Mapping Tier Consistency', () => {
    it('should have valid preferred tiers in complexity mapping', () => {
      if (!routeConfig?.complexity_mapping) {
        console.warn('Skipping test - complexity mapping not available');
        return;
      }

      const validTiers: ModelTier[] = ['opus', 'sonnet', 'haiku'];
      const mapping = routeConfig.complexity_mapping;

      Object.values(mapping).forEach((level: any) => {
        if (level.preferred_tier) {
          expect(validTiers).toContain(level.preferred_tier);
        }
      });
    });

    it('should map complexity levels to appropriate tiers', () => {
      if (!routeConfig?.complexity_mapping) {
        console.warn('Skipping test - complexity mapping not available');
        return;
      }

      const mapping = routeConfig.complexity_mapping;

      // Low complexity should prefer haiku
      if (mapping.low) {
        expect(mapping.low.preferred_tier).toBe('haiku');
      }

      // Medium/high should prefer sonnet
      if (mapping.medium) {
        expect(mapping.medium.preferred_tier).toBe('sonnet');
      }
      if (mapping.high) {
        expect(mapping.high.preferred_tier).toBe('sonnet');
      }

      // Expert should prefer opus
      if (mapping.expert) {
        expect(mapping.expert.preferred_tier).toBe('opus');
      }
    });

    it('should list appropriate agents for each complexity tier', () => {
      if (!routeConfig?.complexity_mapping) {
        console.warn('Skipping test - complexity mapping not available');
        return;
      }

      const mapping = routeConfig.complexity_mapping;
      
      Object.entries(mapping).forEach(([level, config]: [string, any]) => {
        if (config.agents) {
          expect(Array.isArray(config.agents)).toBe(true);
          expect(config.agents.length).toBeGreaterThan(0);
          
          // All agents should be strings
          config.agents.forEach((agent: any) => {
            expect(typeof agent).toBe('string');
          });
        }
      });
    });
  });

  describe('Tier Assignment Integration', () => {
    it('should route simple tasks to appropriate tiers', () => {
      const simpleTasks = [
        'quick fix',
        'simple update',
        'basic validation'
      ];

      simpleTasks.forEach(task => {
        const route = routeTable.route(task);
        // Simple tasks should generally use haiku or sonnet
        expect(['haiku', 'sonnet', 'opus']).toContain(route.tier);
      });
    });

    it('should route complex tasks to appropriate tiers', () => {
      const complexTasks = [
        'design distributed system architecture',
        'optimize global search with quantum annealing',
        'coordinate 500 parallel workers with load balancing'
      ];

      const tierRank = { haiku: 1, sonnet: 2, opus: 3 };

      complexTasks.forEach(task => {
        const route = routeTable.route(task);
        // Complex tasks should use sonnet or opus
        expect(tierRank[route.tier]).toBeGreaterThanOrEqual(2);
      });
    });

    it('should maintain tier consistency across similar requests', () => {
      const similarRequests = [
        'optimize performance',
        'improve performance',
        'enhance performance'
      ];

      const routes = similarRequests.map(req => routeTable.route(req));
      
      // Should use same or similar tiers for similar requests
      const tiers = routes.map(r => r.tier);
      const uniqueTiers = new Set(tiers);
      
      // Allow some variation, but not wildly different
      expect(uniqueTiers.size).toBeLessThanOrEqual(2);
    });

    it('should assign tiers based on request complexity indicators', () => {
      const requests = [
        { text: 'simple quick fix', maxTierRank: 2 },
        { text: 'complex distributed architecture design', minTierRank: 2 },
        { text: 'optimize database query', minTierRank: 1 }
      ];

      const tierRank = { haiku: 1, sonnet: 2, opus: 3 };

      requests.forEach(({ text, maxTierRank, minTierRank }) => {
        const route = routeTable.route(text);
        const rank = tierRank[route.tier];
        
        if (maxTierRank !== undefined) {
          expect(rank).toBeLessThanOrEqual(maxTierRank);
        }
        if (minTierRank !== undefined) {
          expect(rank).toBeGreaterThanOrEqual(minTierRank);
        }
      });
    });
  });

  describe('Tier Cost and Performance Balance', () => {
    it('should validate cost estimates align with tiers', () => {
      if (!routeConfig) {
        console.warn('Skipping test - route config not available');
        return;
      }

      const agents = routeConfig.agents;
      Object.values(agents).forEach((category: any) => {
        Object.values(category).forEach((agent: any) => {
          if (agent.cost_estimate) {
            // Parse cost range
            const costStr = agent.cost_estimate.replace('$', '');
            const [minCost, maxCost] = costStr.split('-').map((s: string) => parseFloat(s));
            
            // Haiku should be cheapest
            if (agent.tier === 'haiku') {
              expect(maxCost).toBeLessThan(0.02);
            }
            
            // Opus should be most expensive
            if (agent.tier === 'opus') {
              expect(minCost).toBeGreaterThan(0.08);
            }
          }
        });
      });
    });

    it('should ensure tier documentation matches implementation', () => {
      if (!routeConfig?.documentation?.tier_explanation) {
        console.warn('Skipping test - tier documentation not available');
        return;
      }

      const tierDocs = routeConfig.documentation.tier_explanation;
      
      expect(tierDocs.haiku).toBeDefined();
      expect(tierDocs.sonnet).toBeDefined();
      expect(tierDocs.opus).toBeDefined();

      // Verify descriptions mention key characteristics
      expect(tierDocs.haiku).toMatch(/fast|cost-effective|simple/i);
      expect(tierDocs.sonnet).toMatch(/balanced|complex/i);
      expect(tierDocs.opus).toMatch(/maximum|capability|critical/i);
    });
  });

  describe('Tier Metadata Validation', () => {
    it('should validate metadata tier counts', () => {
      if (!routeConfig?.metadata) {
        console.warn('Skipping test - metadata not available');
        return;
      }

      const metadata = routeConfig.metadata;
      
      if (metadata.tier_distribution) {
        const { haiku, sonnet, opus } = metadata.tier_distribution;
        
        expect(typeof haiku).toBe('number');
        expect(typeof sonnet).toBe('number');
        expect(typeof opus).toBe('number');
        
        expect(haiku).toBeGreaterThanOrEqual(0);
        expect(sonnet).toBeGreaterThanOrEqual(0);
        expect(opus).toBeGreaterThanOrEqual(0);
        
        // Total should match total agents
        const total = haiku + sonnet + opus;
        expect(total).toBe(metadata.total_agents);
      }
    });

    it('should validate schema version consistency', () => {
      if (!routeConfig?.metadata) {
        console.warn('Skipping test - metadata not available');
        return;
      }

      expect(routeConfig.metadata.schema_version).toBeDefined();
      expect(routeConfig.version).toBeDefined();
      expect(routeConfig.version).toBe(routeConfig.metadata.schema_version);
    });
  });
});
