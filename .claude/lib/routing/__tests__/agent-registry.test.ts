/**
 * Agent Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from '../agent-registry';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('AgentRegistry', () => {
  const testDir = join(__dirname, '__test-agents__');
  let registry: AgentRegistry;

  beforeEach(async () => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}

    // Create test directory
    mkdirSync(testDir, { recursive: true });

    // Create test agent files
    writeFileSync(
      join(testDir, 'test-agent.md'),
      `---
tier: sonnet
description: Test agent for unit tests
---

# Test Agent

This is a test agent.
`
    );

    writeFileSync(
      join(testDir, 'haiku-agent.md'),
      `---
tier: haiku
---

# Haiku Agent

Fast and cheap agent.
`
    );

    registry = new AgentRegistry(testDir);
    await registry.initialize();
  });

  describe('initialization', () => {
    it('should scan directory and find agents', () => {
      const stats = registry.getStats();
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });

    it('should extract tier from frontmatter', () => {
      const agent = registry.getAgent('test-agent');
      expect(agent?.tier).toBe('sonnet');
    });

    it('should extract description', () => {
      const agent = registry.getAgent('test-agent');
      expect(agent?.description).toBe('Test agent for unit tests');
    });
  });

  describe('validation', () => {
    it('should validate existing agents', () => {
      expect(registry.validateAgent('test-agent')).toBe(true);
      expect(registry.validateAgent('haiku-agent')).toBe(true);
    });

    it('should reject non-existent agents', () => {
      expect(registry.validateAgent('invalid-agent')).toBe(false);
      expect(registry.validateAgent('context-compression-specialist')).toBe(false);
    });
  });

  describe('fallback', () => {
    it('should return fallback for invalid agent', () => {
      const fallback = registry.getFallbackAgent('invalid-agent', 'sonnet');
      expect(fallback).toBe('general-purpose');
    });

    it('should find similar agent', () => {
      const similar = registry.getFallbackAgent('testagent', 'sonnet');
      // Should find 'test-agent' as similar
      expect(similar).toBeTruthy();
    });
  });

  describe('similarity matching', () => {
    it('should match agents with similar names', () => {
      // Add agent with hyphenated name
      writeFileSync(
        join(testDir, 'error-debugger.md'),
        '# Error Debugger\n\nDebugs errors.'
      );

      const newRegistry = new AgentRegistry(testDir);
      await newRegistry.initialize();

      // Should match 'errordebugger' to 'error-debugger'
      const fallback = newRegistry.getFallbackAgent('errordebugger');
      expect(fallback).toBe('error-debugger');
    });
  });

  describe('statistics', () => {
    it('should return correct stats', () => {
      const stats = registry.getStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byTier.sonnet).toBeGreaterThan(0);
      expect(stats.byTier.haiku).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty directory', async () => {
      const emptyDir = join(__dirname, '__empty__');
      mkdirSync(emptyDir, { recursive: true });

      const emptyRegistry = new AgentRegistry(emptyDir);
      await emptyRegistry.initialize();

      expect(emptyRegistry.getStats().total).toBe(0);
      expect(emptyRegistry.getAvailableAgents()).toEqual([]);

      rmSync(emptyDir, { recursive: true });
    });

    it('should handle malformed agent files', async () => {
      writeFileSync(
        join(testDir, 'bad-agent.md'),
        'Invalid content without proper structure'
      );

      const newRegistry = new AgentRegistry(testDir);
      await newRegistry.initialize();

      // Should still work despite bad file
      expect(newRegistry.getStats().total).toBeGreaterThan(0);
    });
  });
});
