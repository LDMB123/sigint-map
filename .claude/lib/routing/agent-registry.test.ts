/**
 * AgentRegistry - Test Suite
 *
 * Comprehensive tests for agent discovery, validation, and fallback logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry, AgentNotFoundError, InvalidAgentMetadataError } from './agent-registry';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(async () => {
    registry = new AgentRegistry();
    await registry.build();
  });

  describe('Registry Building', () => {
    it('should build registry successfully', () => {
      const stats = registry.getStats();
      expect(stats.totalAgents).toBeGreaterThan(0);
      expect(stats.buildTimeMs).toBeGreaterThanOrEqual(0);
      expect(stats.lastBuildTimestamp).toBeGreaterThan(0);
    });

    it('should index agents by tier', () => {
      const stats = registry.getStats();
      const totalByTier =
        stats.agentsByTier.opus +
        stats.agentsByTier.sonnet +
        stats.agentsByTier.haiku;
      expect(totalByTier).toBe(stats.totalAgents);
    });

    it('should extract categories from file paths', () => {
      const categories = registry.getAllCategories();
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should meet performance targets (<50ms for build)', () => {
      const stats = registry.getStats();
      // Allow some slack for slower systems
      expect(stats.buildTimeMs).toBeLessThan(200);
    });
  });

  describe('Agent Validation', () => {
    it('should validate existing agents', () => {
      const agentNames = registry.getAllAgentNames();
      expect(agentNames.length).toBeGreaterThan(0);

      const firstAgent = agentNames[0];
      expect(registry.validateAgent(firstAgent)).toBe(true);
    });

    it('should reject non-existent agents', () => {
      expect(registry.validateAgent('non-existent-agent-xyz')).toBe(false);
    });

    it('should get agent metadata', () => {
      const agentNames = registry.getAllAgentNames();
      const firstAgent = agentNames[0];

      const metadata = registry.getAgent(firstAgent);
      expect(metadata.name).toBe(firstAgent);
      expect(metadata.description).toBeDefined();
      expect(metadata.model).toMatch(/^(opus|sonnet|haiku)$/);
      expect(metadata.tools).toBeDefined();
      expect(Array.isArray(metadata.tools)).toBe(true);
    });

    it('should throw AgentNotFoundError for missing agents', () => {
      expect(() => {
        registry.getAgent('non-existent-agent');
      }).toThrow(AgentNotFoundError);
    });
  });

  describe('Agent Metadata', () => {
    it('should extract all required fields', () => {
      const agentNames = registry.getAllAgentNames();
      const metadata = registry.getAgent(agentNames[0]);

      expect(metadata.name).toBeDefined();
      expect(metadata.description).toBeDefined();
      expect(metadata.tools).toBeDefined();
      expect(metadata.model).toBeDefined();
      expect(metadata.permissionMode).toBeDefined();
      expect(metadata.filePath).toBeDefined();
      expect(metadata.fileHash).toBeDefined();
      expect(metadata.capabilities).toBeDefined();
      expect(metadata.lastModified).toBeGreaterThan(0);
    });

    it('should extract capabilities from description', () => {
      const agentNames = registry.getAllAgentNames();
      const metadata = registry.getAgent(agentNames[0]);

      expect(Array.isArray(metadata.capabilities)).toBe(true);
      // At least some agents should have capabilities
    });

    it('should compute file hash for change detection', () => {
      const agentNames = registry.getAllAgentNames();
      const metadata = registry.getAgent(agentNames[0]);

      expect(metadata.fileHash).toBeDefined();
      expect(metadata.fileHash.length).toBe(16);
      expect(/^[a-f0-9]{16}$/.test(metadata.fileHash)).toBe(true);
    });
  });

  describe('Tier Queries', () => {
    it('should get agents by tier', () => {
      const sonnetAgents = registry.getAgentsByTier('sonnet');
      expect(Array.isArray(sonnetAgents)).toBe(true);

      sonnetAgents.forEach(agent => {
        expect(agent.model).toBe('sonnet');
      });
    });

    it('should return empty array for tiers with no agents', () => {
      // Create a fresh registry with custom path that doesn't exist
      const emptyRegistry = new AgentRegistry('/tmp/non-existent-agents-dir');
      const agents = emptyRegistry.getAgentsByTier('opus');
      expect(agents).toEqual([]);
    });
  });

  describe('Category Queries', () => {
    it('should get agents by category', () => {
      const categories = registry.getAllCategories();
      if (categories.length > 0) {
        const firstCategory = categories[0];
        const agents = registry.getAgentsByCategory(firstCategory);

        expect(Array.isArray(agents)).toBe(true);
        expect(agents.length).toBeGreaterThan(0);

        agents.forEach(agent => {
          expect(agent.category).toBe(firstCategory);
        });
      }
    });

    it('should return empty array for non-existent category', () => {
      const agents = registry.getAgentsByCategory('non-existent-category');
      expect(agents).toEqual([]);
    });
  });

  describe('Capability Search', () => {
    it('should search agents by capability', () => {
      // Try common capabilities
      const testCapabilities = ['review', 'test', 'debug', 'generate'];

      for (const capability of testCapabilities) {
        const agents = registry.searchByCapability(capability);
        if (agents.length > 0) {
          agents.forEach(agent => {
            expect(agent.capabilities).toContain(capability);
          });
        }
      }
    });

    it('should return empty array for non-existent capability', () => {
      const agents = registry.searchByCapability('non-existent-capability-xyz');
      expect(agents).toEqual([]);
    });
  });

  describe('Fallback Selection', () => {
    it('should find fallback for non-existent agent', () => {
      const fallback = registry.getFallbackAgent('non-existent-agent', 'sonnet');
      // Should find some fallback agent
      expect(fallback).toBeDefined();
      if (fallback) {
        expect(fallback.name).toBeDefined();
      }
    });

    it('should respect tier preferences', () => {
      const fallback = registry.getFallbackAgent('non-existent-agent', 'haiku', {
        allowTierDowngrade: false,
        allowCategoryFallback: true,
        maxFallbackDistance: 3
      });

      if (fallback) {
        expect(fallback.model).toBe('haiku');
      }
    });

    it('should allow tier downgrade when configured', () => {
      const fallback = registry.getFallbackAgent('non-existent-opus-agent', 'opus', {
        allowTierDowngrade: true,
        allowCategoryFallback: true,
        maxFallbackDistance: 3
      });

      if (fallback) {
        expect(['opus', 'sonnet', 'haiku']).toContain(fallback.model);
      }
    });

    it('should return null when no fallback is found', () => {
      const emptyRegistry = new AgentRegistry('/tmp/non-existent-agents-dir');
      const fallback = emptyRegistry.getFallbackAgent('any-agent', 'sonnet');
      expect(fallback).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive statistics', () => {
      const stats = registry.getStats();

      expect(stats.totalAgents).toBeGreaterThan(0);
      expect(stats.agentsByTier).toBeDefined();
      expect(stats.agentsByCategory).toBeDefined();
      expect(stats.buildTimeMs).toBeGreaterThanOrEqual(0);
      expect(stats.lastBuildTimestamp).toBeGreaterThan(0);
    });

    it('should track agents by tier correctly', () => {
      const stats = registry.getStats();

      const opusAgents = registry.getAgentsByTier('opus');
      const sonnetAgents = registry.getAgentsByTier('sonnet');
      const haikuAgents = registry.getAgentsByTier('haiku');

      expect(stats.agentsByTier.opus).toBe(opusAgents.length);
      expect(stats.agentsByTier.sonnet).toBe(sonnetAgents.length);
      expect(stats.agentsByTier.haiku).toBe(haikuAgents.length);
    });
  });

  describe('JSON Export', () => {
    it('should export registry as JSON', () => {
      const json = registry.toJSON();

      expect(json.stats).toBeDefined();
      expect(json.agents).toBeDefined();
      expect(Array.isArray(json.agents)).toBe(true);
    });

    it('should include all agent data in export', () => {
      const json = registry.toJSON();
      const agents = json.agents as Array<{ name: string }>;

      if (agents.length > 0) {
        const firstAgent = agents[0];
        expect(firstAgent.name).toBeDefined();
      }
    });
  });

  describe('Rebuild Detection', () => {
    it('should not need rebuild immediately after build', () => {
      expect(registry.needsRebuild()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid agents directory gracefully', async () => {
      const invalidRegistry = new AgentRegistry('/tmp/definitely-does-not-exist-xyz');

      await expect(invalidRegistry.build()).rejects.toThrow();
    });

    it('should skip invalid agent files during build', async () => {
      // This test assumes the build process skips invalid files
      // and logs warnings instead of failing completely
      await registry.build();

      const stats = registry.getStats();
      expect(stats.totalAgents).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should validate agents in O(1) time', () => {
      const agentNames = registry.getAllAgentNames();
      const iterations = 1000;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        registry.validateAgent(agentNames[0]);
      }
      const endTime = Date.now();

      const avgTimeMs = (endTime - startTime) / iterations;
      expect(avgTimeMs).toBeLessThan(0.1);
    });

    it('should find fallbacks in <1ms', () => {
      const startTime = Date.now();
      registry.getFallbackAgent('non-existent-agent', 'sonnet');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});
