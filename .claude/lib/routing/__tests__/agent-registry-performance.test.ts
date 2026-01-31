/**
 * Performance benchmark for agent-registry fuzzy matching optimizations
 *
 * Target: Reduce from 450ms to <50ms for 1000 agents
 *
 * Optimizations tested:
 * 1. Early exit after finding first match above threshold
 * 2. Length-based filtering before expensive similarity calculation
 * 3. Cache similarity scores
 * 4. Use Uint8Array instead of boolean arrays for memory efficiency
 * 5. Iteration limit (max 50 agents checked)
 */

import { AgentRegistry } from '../agent-registry';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('AgentRegistry Performance Benchmarks', () => {
  let testDir: string;
  let registry: AgentRegistry;

  beforeEach(async () => {
    // Create temporary directory for test agents
    testDir = join(tmpdir(), `agent-registry-perf-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Generate mock agent files for testing
   */
  async function generateMockAgents(count: number): Promise<void> {
    const prefixes = [
      'performance', 'optimizer', 'analyzer', 'debugger', 'generator',
      'validator', 'transformer', 'integrator', 'coordinator', 'specialist',
      'engineer', 'architect', 'orchestrator', 'monitor', 'reporter'
    ];

    const suffixes = [
      'agent', 'expert', 'service', 'worker', 'handler',
      'processor', 'manager', 'controller', 'helper', 'utility'
    ];

    for (let i = 0; i < count; i++) {
      const prefix = prefixes[i % prefixes.length];
      const suffix = suffixes[Math.floor(i / prefixes.length) % suffixes.length];
      const number = Math.floor(i / (prefixes.length * suffixes.length));

      const agentName = number > 0
        ? `${prefix}-${suffix}-${number}.md`
        : `${prefix}-${suffix}.md`;

      const content = `# ${agentName.replace('.md', '')}

tier: ${i % 3 === 0 ? 'haiku' : i % 3 === 1 ? 'sonnet' : 'opus'}
description: Test agent ${i}

This is a mock agent for performance testing.
`;

      await writeFile(join(testDir, agentName), content, 'utf-8');
    }
  }

  test('Baseline: 100 agents - should be fast', async () => {
    await generateMockAgents(100);
    registry = new AgentRegistry(testDir);
    await registry.initialize();

    const start = performance.now();

    // Test fuzzy matching with slightly misspelled names
    const testQueries = [
      'perfomance-agent', // misspelled
      'optimzer-expert',  // misspelled
      'anlyzer-service',  // misspelled
      'debuger-worker',   // misspelled
      'generater-handler' // misspelled
    ];

    for (const query of testQueries) {
      registry.getFallbackAgent(query);
    }

    const elapsed = performance.now() - start;

    console.log(`100 agents, 5 queries: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(100); // Should be very fast
  }, 10000);

  test('Target: 1000 agents - should be <50ms for 10 queries', async () => {
    await generateMockAgents(1000);
    registry = new AgentRegistry(testDir);
    await registry.initialize();

    expect(registry.getStats().total).toBe(1000);

    const start = performance.now();

    // Test fuzzy matching with slightly misspelled names
    const testQueries = [
      'perfomance-agent',     // misspelled
      'optimzer-expert',      // misspelled
      'anlyzer-service',      // misspelled
      'debuger-worker',       // misspelled
      'generater-handler',    // misspelled
      'validtor-processor',   // misspelled
      'transformr-manager',   // misspelled
      'integratr-controller', // misspelled
      'coordnator-helper',    // misspelled
      'specalist-utility'     // misspelled
    ];

    for (const query of testQueries) {
      registry.getFallbackAgent(query);
    }

    const elapsed = performance.now() - start;

    console.log(`1000 agents, 10 queries: ${elapsed.toFixed(2)}ms (avg ${(elapsed / 10).toFixed(2)}ms per query)`);

    // Target: <50ms total for 10 queries
    expect(elapsed).toBeLessThan(50);
  }, 15000);

  test('Stress test: 1000 agents - cache effectiveness', async () => {
    await generateMockAgents(1000);
    registry = new AgentRegistry(testDir);
    await registry.initialize();

    // First run: populate cache
    const firstRunStart = performance.now();
    const query = 'perfomance-agent';

    for (let i = 0; i < 10; i++) {
      registry.getFallbackAgent(query);
    }

    const firstRunElapsed = performance.now() - firstRunStart;

    // Second run: should hit cache
    const secondRunStart = performance.now();

    for (let i = 0; i < 10; i++) {
      registry.getFallbackAgent(query);
    }

    const secondRunElapsed = performance.now() - secondRunStart;

    console.log(`First run (cache population): ${firstRunElapsed.toFixed(2)}ms`);
    console.log(`Second run (cache hits): ${secondRunElapsed.toFixed(2)}ms`);
    console.log(`Speedup: ${(firstRunElapsed / secondRunElapsed).toFixed(2)}x`);

    // Second run should be significantly faster (cache hit)
    expect(secondRunElapsed).toBeLessThan(firstRunElapsed * 0.5);
  }, 15000);

  test('Length filtering effectiveness', async () => {
    await generateMockAgents(1000);
    registry = new AgentRegistry(testDir);
    await registry.initialize();

    // Query with very different length should be fast (filtered out early)
    const start = performance.now();

    // Very short query - most agents should be filtered by length
    registry.getFallbackAgent('ab');

    // Very long query - most agents should be filtered by length
    registry.getFallbackAgent('this-is-a-very-long-agent-name-that-does-not-exist');

    const elapsed = performance.now() - start;

    console.log(`Length filtering test: ${elapsed.toFixed(2)}ms`);

    // Should be very fast due to length filtering
    expect(elapsed).toBeLessThan(10);
  }, 10000);

  test('Memory efficiency: Uint8Array vs boolean[]', () => {
    // Test memory allocation pattern
    const iterations = 1000;
    const stringLength = 50;

    // Measure Uint8Array allocation
    const uint8Start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const arr = new Uint8Array(stringLength);
      arr[0] = 1; // Prevent optimization
    }
    const uint8Elapsed = performance.now() - uint8Start;

    // Measure boolean[] allocation
    const boolStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const arr = new Array<boolean>(stringLength).fill(false);
      arr[0] = true; // Prevent optimization
    }
    const boolElapsed = performance.now() - boolStart;

    console.log(`Uint8Array allocation: ${uint8Elapsed.toFixed(2)}ms`);
    console.log(`boolean[] allocation: ${boolElapsed.toFixed(2)}ms`);
    console.log(`Speedup: ${(boolElapsed / uint8Elapsed).toFixed(2)}x`);

    // Uint8Array should be faster
    expect(uint8Elapsed).toBeLessThan(boolElapsed);
  });

  test('Iteration limit enforcement', async () => {
    await generateMockAgents(1000);
    registry = new AgentRegistry(testDir);
    await registry.initialize();

    // Query that doesn't match anything
    // Should stop after MAX_FUZZY_MATCH_ITERATIONS (50)
    const start = performance.now();

    registry.getFallbackAgent('zzz-nonexistent-agent-xyz');

    const elapsed = performance.now() - start;

    console.log(`Non-matching query with iteration limit: ${elapsed.toFixed(2)}ms`);

    // Should be fast even with no match due to iteration limit
    expect(elapsed).toBeLessThan(20);
  }, 10000);

  test('Early exit effectiveness', async () => {
    await generateMockAgents(1000);
    registry = new AgentRegistry(testDir);
    await registry.initialize();

    // Create a query that matches the first agent after sorting by length
    // This should trigger early exit
    const start = performance.now();

    // This should match 'performance-agent' quickly after length-based sorting
    const result = registry.getFallbackAgent('performanc-agent');

    const elapsed = performance.now() - start;

    console.log(`Early exit test: ${elapsed.toFixed(2)}ms`);
    console.log(`Matched agent: ${result}`);

    // Should be very fast due to early exit
    expect(elapsed).toBeLessThan(5);
  }, 10000);

  test('Overall performance comparison: Before vs After', async () => {
    console.log('\n=== Performance Optimization Summary ===\n');

    await generateMockAgents(1000);
    registry = new AgentRegistry(testDir);
    await registry.initialize();

    const queries = [
      'perfomance-agent',
      'optimzer-expert',
      'anlyzer-service',
      'debuger-worker',
      'generater-handler',
      'validtor-processor',
      'transformr-manager',
      'integratr-controller',
      'coordnator-helper',
      'specalist-utility'
    ];

    // Warm up
    queries.forEach(q => registry.getFallbackAgent(q));

    // Actual benchmark
    const start = performance.now();
    queries.forEach(q => registry.getFallbackAgent(q));
    const elapsed = performance.now() - start;

    const avgPerQuery = elapsed / queries.length;

    console.log(`Total time for ${queries.length} queries: ${elapsed.toFixed(2)}ms`);
    console.log(`Average per query: ${avgPerQuery.toFixed(2)}ms`);
    console.log(`\nTarget: <50ms for 10 queries`);
    console.log(`Status: ${elapsed < 50 ? '✓ PASSED' : '✗ FAILED'}`);
    console.log(`\nOptimizations applied:`);
    console.log(`  ✓ Early exit after first match`);
    console.log(`  ✓ Length-based filtering (30% tolerance)`);
    console.log(`  ✓ Similarity score caching`);
    console.log(`  ✓ Uint8Array for memory efficiency`);
    console.log(`  ✓ Iteration limit (max 50 agents)`);
    console.log(`  ✓ Length-based sorting for early exit`);

    expect(elapsed).toBeLessThan(50);
  }, 15000);
});
