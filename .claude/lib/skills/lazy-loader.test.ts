/**
 * Test suite for SkillLazyLoader
 *
 * Run: npx tsx lazy-loader.test.ts
 */

import {
  SkillLazyLoader,
  LoadLevel,
  createLoader,
  type LoaderConfig,
  type CompressedSkill,
  type SkillHeader,
} from './lazy-loader';

// ============================================================================
// Mock Data
// ============================================================================

const mockSkills: Record<string, CompressedSkill> = {
  'rust-borrow-checker': {
    level1: {
      skill: 'rust-borrow-checker',
      domain: 'rust',
      keywords: ['borrow', 'mutable', 'reference', 'lifetime'],
      errors: ['E0502', 'E0499', 'E0503'],
      version: '1.0.0',
    },
    level2: {
      skill: 'rust-borrow-checker',
      domain: 'rust',
      keywords: ['borrow', 'mutable', 'reference', 'lifetime'],
      errors: ['E0502', 'E0499', 'E0503'],
      version: '1.0.0',
      quick_fixes: {
        E0502: 'separate scopes or use RefCell',
        E0499: 'split into fns or use interior mutability',
        E0503: 'use clone or restructure ownership',
      },
      patterns: [
        { match: 'cannot borrow.*mutable', suggest: ['RefCell', 'split scope'] },
        { match: 'cannot borrow.*immutable', suggest: ['clone', 'Arc'] },
      ],
    },
    level3: {
      skill: 'rust-borrow-checker',
      domain: 'rust',
      keywords: ['borrow', 'mutable', 'reference', 'lifetime'],
      errors: ['E0502', 'E0499', 'E0503'],
      version: '1.0.0',
      quick_fixes: {
        E0502: 'separate scopes or use RefCell',
        E0499: 'split into fns or use interior mutability',
        E0503: 'use clone or restructure ownership',
      },
      patterns: [
        { match: 'cannot borrow.*mutable', suggest: ['RefCell', 'split scope'] },
        { match: 'cannot borrow.*immutable', suggest: ['clone', 'Arc'] },
      ],
      error_details: {
        E0502: {
          cause: 'mut+immut ref overlap',
          fix: 'scope separation|RefCell|clone',
          example: 'let r = &v; let m = &mut v; // E0502',
        },
        E0499: {
          cause: 'multiple mut refs to same data',
          fix: 'split into functions|interior mutability',
          example: 'let m1 = &mut v; let m2 = &mut v; // E0499',
        },
      },
      edge_cases: [
        'Closure captures create implicit refs',
        'Method calls may borrow self mutably',
        'Loop iterations create new scopes',
      ],
      related: ['rust-ownership', 'rust-lifetimes'],
      references: ['doc.rust-lang.org/book/ch04-02'],
    },
    meta: {
      original_tokens: 1000,
      compressed_tokens: {
        level1: 50,
        level2: 150,
        level3: 300,
      },
      compression_ratio: 0.7,
      compressed_at: new Date().toISOString(),
    },
  },
  'typescript-types': {
    level1: {
      skill: 'typescript-types',
      domain: 'typescript',
      keywords: ['type', 'interface', 'generic', 'union'],
      errors: ['TS2345', 'TS2322', 'TS2339'],
      version: '1.0.0',
    },
    level2: {
      skill: 'typescript-types',
      domain: 'typescript',
      keywords: ['type', 'interface', 'generic', 'union'],
      errors: ['TS2345', 'TS2322', 'TS2339'],
      version: '1.0.0',
      quick_fixes: {
        TS2345: 'check arg types match param types',
        TS2322: 'check assignment type compatibility',
        TS2339: 'property does not exist on type',
      },
    },
    level3: {
      skill: 'typescript-types',
      domain: 'typescript',
      keywords: ['type', 'interface', 'generic', 'union'],
      errors: ['TS2345', 'TS2322', 'TS2339'],
      version: '1.0.0',
      quick_fixes: {
        TS2345: 'check arg types match param types',
        TS2322: 'check assignment type compatibility',
        TS2339: 'property does not exist on type',
      },
      error_details: {
        TS2345: {
          cause: 'arg type != param type',
          fix: 'cast|change type|use generic',
        },
      },
    },
    meta: {
      original_tokens: 800,
      compressed_tokens: {
        level1: 45,
        level2: 120,
        level3: 250,
      },
      compression_ratio: 0.69,
      compressed_at: new Date().toISOString(),
    },
  },
  'debug-workflow': {
    level1: {
      skill: 'debug-workflow',
      domain: 'debug',
      keywords: ['debug', 'troubleshoot', 'error', 'fix'],
      version: '1.0.0',
    },
    level2: {
      skill: 'debug-workflow',
      domain: 'debug',
      keywords: ['debug', 'troubleshoot', 'error', 'fix'],
      version: '1.0.0',
      quick_fixes: {
        'compile error': 'read error msg|check syntax|check types',
        'runtime error': 'add logging|use debugger|check state',
      },
      priority: ['reproduce', 'isolate', 'fix', 'test'],
    },
    level3: {
      skill: 'debug-workflow',
      domain: 'debug',
      keywords: ['debug', 'troubleshoot', 'error', 'fix'],
      version: '1.0.0',
      quick_fixes: {
        'compile error': 'read error msg|check syntax|check types',
        'runtime error': 'add logging|use debugger|check state',
      },
      priority: ['reproduce', 'isolate', 'fix', 'test'],
      detailed_patterns: [
        {
          match: 'intermittent failure',
          context: 'race condition or timing issue',
          suggest: ['add logging', 'reduce concurrency', 'add delays'],
          examples: ['await Promise.all() race', 'setTimeout timing'],
        },
      ],
    },
    meta: {
      original_tokens: 900,
      compressed_tokens: {
        level1: 40,
        level2: 140,
        level3: 280,
      },
      compression_ratio: 0.69,
      compressed_at: new Date().toISOString(),
    },
  },
};

// ============================================================================
// Mock Loader with In-Memory Storage
// ============================================================================

class MockSkillLoader extends SkillLazyLoader {
  private mockStorage: Record<string, CompressedSkill>;

  constructor(mockStorage: Record<string, CompressedSkill>, config?: Partial<LoaderConfig>) {
    super(config);
    this.mockStorage = mockStorage;
  }

  // Override to use in-memory storage
  protected async loadCompressedSkill(skillId: string): Promise<CompressedSkill | null> {
    return this.mockStorage[skillId] || null;
  }

  protected async discoverSkills(): Promise<string[]> {
    return Object.keys(this.mockStorage);
  }
}

// ============================================================================
// Test Utilities
// ============================================================================

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`
    );
  }
}

function assertGte(actual: number, expected: number, message: string): void {
  if (actual < expected) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected >= ${expected}\n  Actual: ${actual}`
    );
  }
}

function assertLte(actual: number, expected: number, message: string): void {
  if (actual > expected) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected <= ${expected}\n  Actual: ${actual}`
    );
  }
}

// ============================================================================
// Tests
// ============================================================================

async function testBasicLoading(): Promise<void> {
  console.log('\n=== Test: Basic Loading ===');

  const loader = new MockSkillLoader(mockSkills, { debug: true });

  // Load header
  const header = await loader.loadHeader('rust-borrow-checker');
  assert(header !== null, 'Should load header');
  assertEq(header!.skill, 'rust-borrow-checker', 'Header should match');

  // Load quick reference
  const quick = await loader.loadQuick('rust-borrow-checker');
  assert(quick !== null, 'Should load quick reference');
  assert('quick_fixes' in quick!, 'Should have quick_fixes');
  assertEq(quick!.quick_fixes['E0502'], 'separate scopes or use RefCell', 'Quick fix should match');

  // Load full skill
  const full = await loader.loadFull('rust-borrow-checker');
  assert(full !== null, 'Should load full skill');
  assert('error_details' in full!, 'Should have error_details');

  const stats = loader.getStats();
  assertEq(stats.totalSkills, 1, 'Should have 1 skill loaded');

  console.log('✓ Basic loading works');
}

async function testCaching(): Promise<void> {
  console.log('\n=== Test: Caching ===');

  const loader = new MockSkillLoader(mockSkills, { debug: true });

  // Load same skill multiple times
  await loader.loadHeader('rust-borrow-checker');
  await loader.loadHeader('rust-borrow-checker');
  await loader.loadHeader('rust-borrow-checker');

  const stats = loader.getStats();
  assertGte(stats.hitRatio, 0.66, 'Should have high cache hit ratio');

  console.log(`✓ Caching works (hit ratio: ${(stats.hitRatio * 100).toFixed(1)}%)`);
}

async function testTokenBudget(): Promise<void> {
  console.log('\n=== Test: Token Budget ===');

  const loader = new MockSkillLoader(mockSkills, {
    maxTokens: 500,
    evictionThreshold: 100,
    debug: true,
  });

  // Load multiple skills
  await loader.loadFull('rust-borrow-checker'); // 300 tokens
  await loader.loadFull('typescript-types'); // 250 tokens (total: 550, exceeds 500)

  const stats = loader.getStats();
  assertLte(stats.currentTokens, 500, 'Should stay within budget');
  assertGte(stats.evictions, 1, 'Should have evicted skills');

  console.log(`✓ Token budget enforced (${stats.currentTokens}/${stats.maxTokens} tokens)`);
}

async function testLevelUpgrade(): Promise<void> {
  console.log('\n=== Test: Level Upgrade ===');

  const loader = new MockSkillLoader(mockSkills, { debug: true });

  // Load at header level
  await loader.loadHeader('rust-borrow-checker');
  let stats = loader.getStats();
  assertEq(stats.levelCounts.header, 1, 'Should have 1 header');
  const headerTokens = stats.currentTokens;

  // Upgrade to quick
  await loader.loadQuick('rust-borrow-checker');
  stats = loader.getStats();
  assertEq(stats.levelCounts.quick, 1, 'Should have 1 quick');
  assertEq(stats.levelCounts.header, 0, 'Should have 0 headers');
  assertGte(stats.currentTokens, headerTokens, 'Tokens should increase');

  // Upgrade to full
  const quickTokens = stats.currentTokens;
  await loader.loadFull('rust-borrow-checker');
  stats = loader.getStats();
  assertEq(stats.levelCounts.full, 1, 'Should have 1 full');
  assertGte(stats.currentTokens, quickTokens, 'Tokens should increase again');

  console.log('✓ Level upgrade works');
}

async function testDowngrade(): Promise<void> {
  console.log('\n=== Test: Downgrade ===');

  const loader = new MockSkillLoader(mockSkills, { debug: true });

  // Load at full level
  await loader.loadFull('rust-borrow-checker');
  let stats = loader.getStats();
  const fullTokens = stats.currentTokens;

  // Downgrade to quick
  await loader.downgrade('rust-borrow-checker', LoadLevel.QUICK);
  stats = loader.getStats();
  assertEq(stats.levelCounts.quick, 1, 'Should be at quick level');
  assertLte(stats.currentTokens, fullTokens, 'Tokens should decrease');

  // Downgrade to header
  await loader.downgrade('rust-borrow-checker', LoadLevel.HEADER);
  stats = loader.getStats();
  assertEq(stats.levelCounts.header, 1, 'Should be at header level');
  assertLte(stats.currentTokens, 50, 'Should be minimal tokens');

  console.log('✓ Downgrade works');
}

async function testUnload(): Promise<void> {
  console.log('\n=== Test: Unload ===');

  const loader = new MockSkillLoader(mockSkills, { debug: true });

  // Load skills
  await loader.loadFull('rust-borrow-checker');
  await loader.loadFull('typescript-types');
  let stats = loader.getStats();
  assertEq(stats.totalSkills, 2, 'Should have 2 skills');

  // Unload one
  loader.unload('rust-borrow-checker');
  stats = loader.getStats();
  assertEq(stats.totalSkills, 1, 'Should have 1 skill');

  // Unload all
  loader.unloadAll();
  stats = loader.getStats();
  assertEq(stats.totalSkills, 0, 'Should have 0 skills');
  assertEq(stats.currentTokens, 0, 'Should have 0 tokens');

  console.log('✓ Unload works');
}

async function testPreload(): Promise<void> {
  console.log('\n=== Test: Preload ===');

  const loader = new MockSkillLoader(mockSkills, { debug: true });

  // Preload multiple skills at header level
  await loader.preload(['rust-borrow-checker', 'typescript-types', 'debug-workflow']);

  const stats = loader.getStats();
  assertEq(stats.totalSkills, 3, 'Should have 3 skills preloaded');
  assertEq(stats.levelCounts.header, 3, 'All should be at header level');

  console.log('✓ Preload works');
}

async function testLRUEviction(): Promise<void> {
  console.log('\n=== Test: LRU Eviction ===');

  const loader = new MockSkillLoader(mockSkills, {
    maxTokens: 600,
    evictionThreshold: 50,
    debug: true,
  });

  // Load skills in order
  await loader.loadFull('rust-borrow-checker'); // 300 tokens
  await new Promise(resolve => setTimeout(resolve, 10)); // Ensure time difference

  await loader.loadHeader('typescript-types'); // 45 tokens (total: 345)
  await new Promise(resolve => setTimeout(resolve, 10));

  await loader.loadHeader('debug-workflow'); // 40 tokens (total: 385)
  await new Promise(resolve => setTimeout(resolve, 10));

  // Access first skill again to make it more recent
  await loader.loadHeader('rust-borrow-checker');

  // Load another full skill - typescript-types is upgrading from header to full
  // Already loaded at header (45 tokens), upgrading to full (250 tokens) = +205 tokens
  // Current: 385, need +205 = 590 total (within 600 budget, no eviction needed)
  await loader.loadFull('typescript-types'); // 250 tokens total

  let stats = loader.getStats();
  assertLte(stats.currentTokens, 600, 'Should stay within budget');

  // Now load another full skill that WILL require eviction
  // We have 590 tokens, need 300 more for rust-borrow-checker full = would be 890
  // This should trigger eviction of LRU skill (debug-workflow is oldest)
  await loader.loadFull('debug-workflow'); // 280 tokens, requires eviction

  stats = loader.getStats();
  assertLte(stats.currentTokens, 600, 'Should stay within budget after eviction');
  assertGte(stats.evictions, 1, 'Should have performed evictions');

  console.log(`✓ LRU eviction works (${stats.evictions} evictions, ${stats.currentTokens}/${stats.maxTokens} tokens)`);
}

async function testStats(): Promise<void> {
  console.log('\n=== Test: Statistics ===');

  const loader = new MockSkillLoader(mockSkills, {
    maxTokens: 8000,
    debug: true,
  });

  await loader.loadHeader('rust-borrow-checker');
  await loader.loadQuick('typescript-types');
  await loader.loadFull('debug-workflow');

  const stats = loader.getStats();

  console.log('\nLoader Statistics:');
  console.log(`  Total Skills: ${stats.totalSkills}`);
  console.log(`  Level Counts: H=${stats.levelCounts.header} Q=${stats.levelCounts.quick} F=${stats.levelCounts.full}`);
  console.log(`  Token Usage: ${stats.currentTokens}/${stats.maxTokens} (${stats.utilization.toFixed(1)}%)`);
  console.log(`  Hit Ratio: ${(stats.hitRatio * 100).toFixed(1)}%`);
  console.log(`  Evictions: ${stats.evictions}`);

  assert(stats.totalSkills > 0, 'Should have skills loaded');
  assert(stats.utilization >= 0 && stats.utilization <= 100, 'Utilization should be valid');

  console.log('✓ Statistics tracking works');
}

async function testRealWorldScenario(): Promise<void> {
  console.log('\n=== Test: Real World Scenario ===');

  const loader = new MockSkillLoader(mockSkills, {
    maxTokens: 1000,
    evictionThreshold: 200,
    debug: false, // Less verbose for this test
  });

  // Simulate real workflow:
  // 1. Load all headers for routing
  const headers = await loader.loadAllHeaders();
  console.log(`  Loaded ${headers.length} skill headers`);

  let stats = loader.getStats();
  console.log(`  Token usage after headers: ${stats.currentTokens} tokens`);

  // 2. User encounters rust borrow checker error
  console.log('\n  User encounters E0502 error...');
  const quick = await loader.loadQuick('rust-borrow-checker');
  if (quick && 'quick_fixes' in quick) {
    console.log(`  Quick fix: ${quick.quick_fixes['E0502']}`);
  }

  stats = loader.getStats();
  console.log(`  Token usage after quick load: ${stats.currentTokens} tokens`);

  // 3. User needs more details
  console.log('\n  User needs more details...');
  const full = await loader.loadFull('rust-borrow-checker');
  if (full && 'error_details' in full) {
    console.log(`  Full details: ${full.error_details!['E0502'].fix}`);
  }

  stats = loader.getStats();
  console.log(`  Token usage after full load: ${stats.currentTokens} tokens`);

  // 4. Load more skills (triggers eviction)
  console.log('\n  Loading more skills...');
  await loader.loadFull('typescript-types');
  await loader.loadFull('debug-workflow');

  stats = loader.getStats();
  console.log(`  Final token usage: ${stats.currentTokens}/${stats.maxTokens} tokens`);
  console.log(`  Total evictions: ${stats.evictions}`);
  console.log(`  Cache hit ratio: ${(stats.hitRatio * 100).toFixed(1)}%`);

  assertLte(stats.currentTokens, 1000, 'Should stay within budget');

  console.log('\n✓ Real world scenario works');
}

// ============================================================================
// Test Runner
// ============================================================================

async function runTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('SkillLazyLoader Test Suite');
  console.log('='.repeat(60));

  const tests = [
    testBasicLoading,
    testCaching,
    testTokenBudget,
    testLevelUpgrade,
    testDowngrade,
    testUnload,
    testPreload,
    testLRUEviction,
    testStats,
    testRealWorldScenario,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`\n✗ Test failed: ${error}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { runTests };
