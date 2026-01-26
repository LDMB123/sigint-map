/**
 * Result Adapter Example
 * Demonstrates adaptive caching for real-world scenarios
 */

import { ResultAdapter, TrackedResultAdapter, type AdaptationResult } from './result-adapter';
import type { SemanticKey } from './types';

// ============================================================================
// Example 1: File Rename Adaptation
// ============================================================================

console.log('='.repeat(70));
console.log('EXAMPLE 1: File Rename Adaptation');
console.log('='.repeat(70));
console.log();

const fileRenameAdapter = new ResultAdapter<any>();

// Original cached result for fixing borrow error in lib.rs
const borrowFixResult = {
  analysis: 'The borrow checker error in src/lib.rs occurs because...',
  solution: `
    // In src/lib.rs
    pub fn process_data<'a>(data: &'a str) -> &'a str {
        // Added explicit lifetime annotation
        data.trim()
    }
  `,
  files_modified: ['src/lib.rs'],
  explanation: 'Fixed by adding explicit lifetime annotations in src/lib.rs',
};

const originalKey: SemanticKey = {
  intent: 'borrow-fix',
  target: 'src/lib.rs',
  context: ['rust', 'memory-management'],
  params: {},
};

// User asks about same error in a different file
const newKey: SemanticKey = {
  intent: 'borrow-fix',
  target: 'src/main.rs',
  context: ['rust', 'memory-management'],
  params: {},
};

console.log('Original query: Fix borrow error in src/lib.rs');
console.log('New query:      Fix borrow error in src/main.rs');
console.log();

const adapted = fileRenameAdapter.adapt(borrowFixResult, originalKey, newKey);

console.log(`Adaptation successful: ${adapted.success}`);
console.log(`Confidence: ${(adapted.confidence * 100).toFixed(1)}%`);
console.log(`Transformations applied: ${adapted.transformations.length}`);
console.log();

for (const transform of adapted.transformations) {
  console.log(`  - ${transform.type}: ${transform.description}`);
  console.log(`    Confidence: ${(transform.confidence * 100).toFixed(1)}%`);
}

console.log();
console.log('Adapted result:');
console.log(JSON.stringify(adapted.result, null, 2));
console.log();

// ============================================================================
// Example 2: Parameter Interpolation
// ============================================================================

console.log('='.repeat(70));
console.log('EXAMPLE 2: Parameter Interpolation');
console.log('='.repeat(70));
console.log();

const paramAdapter = new ResultAdapter<any>();

// Cached result for creating a component with 3 props
const componentResult = {
  component: `
    interface UserCardProps {
      prop1: string;
      prop2: string;
      prop3: string;
    }

    export function UserCard({ prop1, prop2, prop3 }: UserCardProps) {
      // Component with 3 props
      return (
        <div>
          <span>{prop1}</span>
          <span>{prop2}</span>
          <span>{prop3}</span>
        </div>
      );
    }
  `,
  message: 'Created React component with 3 props',
  props: ['prop1', 'prop2', 'prop3'],
};

const originalComponentKey: SemanticKey = {
  intent: 'component-create',
  target: 'UserCard.tsx',
  context: ['react', 'typescript'],
  params: { propCount: 3, name: 'UserCard' },
};

// User wants similar component but with 5 props
const newComponentKey: SemanticKey = {
  intent: 'component-create',
  target: 'UserCard.tsx',
  context: ['react', 'typescript'],
  params: { propCount: 5, name: 'UserCard' },
};

console.log('Original query: Create React component with 3 props');
console.log('New query:      Create React component with 5 props');
console.log();

const adaptedComponent = paramAdapter.adapt(componentResult, originalComponentKey, newComponentKey);

console.log(`Adaptation successful: ${adaptedComponent.success}`);
console.log(`Confidence: ${(adaptedComponent.confidence * 100).toFixed(1)}%`);
console.log();

for (const transform of adaptedComponent.transformations) {
  console.log(`  - ${transform.type}: ${transform.description}`);
}

console.log();
console.log('Note: Parameter interpolation replaced "3" with "5" throughout the result');
console.log();

// ============================================================================
// Example 3: Combined Transformations
// ============================================================================

console.log('='.repeat(70));
console.log('EXAMPLE 3: Combined Transformations (File Rename + Parameters + Context)');
console.log('='.repeat(70));
console.log();

const combinedAdapter = new ResultAdapter<any>();

// Cached result for optimizing UserService
const optimizationResult = {
  analysis: 'Performance analysis of UserService revealed 5 bottlenecks',
  improvements: [
    'Added caching to UserService.getUser()',
    'Optimized database queries in UserService',
    'Implemented memoization for 5 expensive operations',
  ],
  files: ['src/services/UserService.ts', 'src/services/UserService.test.ts'],
  metrics: {
    before: '5 sec response time',
    after: '0.5 sec response time',
  },
};

const originalOptKey: SemanticKey = {
  intent: 'performance-optimize',
  target: 'src/services/UserService.ts',
  context: ['typescript', 'performance'],
  params: { bottlenecks: 5 },
};

// User wants to optimize a different service with different parameters
const newOptKey: SemanticKey = {
  intent: 'performance-optimize',
  target: 'src/services/ProfileService.ts',
  context: ['typescript', 'performance', 'async', 'database'],
  params: { bottlenecks: 8 },
};

console.log('Original query: Optimize UserService (5 bottlenecks)');
console.log('New query:      Optimize ProfileService (8 bottlenecks, with async/db context)');
console.log();

const adaptedOpt = combinedAdapter.adapt(optimizationResult, originalOptKey, newOptKey);

console.log(`Adaptation successful: ${adaptedOpt.success}`);
console.log(`Confidence: ${(adaptedOpt.confidence * 100).toFixed(1)}%`);
console.log(`Transformations applied: ${adaptedOpt.transformations.length}`);
console.log();

console.log('Transformations:');
for (const transform of adaptedOpt.transformations) {
  console.log(`  - ${transform.type}:`);
  console.log(`    ${transform.description}`);
  console.log(`    Confidence: ${(transform.confidence * 100).toFixed(1)}%`);
}

console.log();
console.log('Adapted result preview:');
console.log(`  Analysis: ${adaptedOpt.result.analysis}`);
console.log(`  Files: ${adaptedOpt.result.files.join(', ')}`);
if (adaptedOpt.result._metadata?.context) {
  console.log(`  Merged context: [${adaptedOpt.result._metadata.context.join(', ')}]`);
}
console.log();

// ============================================================================
// Example 4: Adaptation Failure (Confidence Too Low)
// ============================================================================

console.log('='.repeat(70));
console.log('EXAMPLE 4: Adaptation Failure (Different Intent)');
console.log('='.repeat(70));
console.log();

const strictAdapter = new ResultAdapter({ minConfidence: 0.7 });

const cachedFix = 'Fixed borrow error by adding lifetime annotations';

const fixKey: SemanticKey = {
  intent: 'borrow-fix',
  target: 'src/lib.rs',
  context: ['rust'],
  params: {},
};

// Completely different intent
const createKey: SemanticKey = {
  intent: 'component-create',
  target: 'Component.tsx',
  context: ['react'],
  params: {},
};

console.log('Original query: Fix borrow error in Rust');
console.log('New query:      Create React component');
console.log();

const failedAdaptation = strictAdapter.adapt(cachedFix, fixKey, createKey);

console.log(`Adaptation successful: ${failedAdaptation.success}`);
console.log(`Confidence: ${(failedAdaptation.confidence * 100).toFixed(1)}%`);
console.log(`Failure reason: ${failedAdaptation.failureReason}`);
console.log();
console.log('Result: Must re-execute original query (no cache hit)');
console.log();

// ============================================================================
// Example 5: Statistics Tracking
// ============================================================================

console.log('='.repeat(70));
console.log('EXAMPLE 5: Statistics Tracking');
console.log('='.repeat(70));
console.log();

const trackedAdapter = new TrackedResultAdapter<string>();

// Simulate a series of adaptations
const scenarios = [
  // Similar files - should succeed
  {
    cached: 'Fixed error in UserService.ts',
    from: { intent: 'error-fix', target: 'UserService.ts', context: ['typescript'], params: {} },
    to: { intent: 'error-fix', target: 'ProfileService.ts', context: ['typescript'], params: {} },
  },
  // Same file - should succeed with high confidence
  {
    cached: 'Updated lib.rs implementation',
    from: { intent: 'update', target: 'src/lib.rs', context: ['rust'], params: {} },
    to: { intent: 'update', target: 'lib.rs', context: ['rust'], params: {} },
  },
  // Similar intent, different context - should succeed
  {
    cached: 'Created test suite',
    from: { intent: 'test-create', target: 'service.test.ts', context: ['typescript'], params: {} },
    to: { intent: 'test-create', target: 'controller.test.ts', context: ['typescript', 'jest'], params: {} },
  },
  // Very different - should fail
  {
    cached: 'Refactored code',
    from: { intent: 'refactor', target: 'old.ts', context: ['typescript'], params: {} },
    to: { intent: 'component-create', target: 'new.tsx', context: ['react'], params: {} },
  },
];

console.log('Running adaptation scenarios...');
console.log();

for (const scenario of scenarios) {
  const result = trackedAdapter.adapt(scenario.cached, scenario.from, scenario.to);
  console.log(`${scenario.from.intent} → ${scenario.to.intent}: ${result.success ? '✓' : '✗'} (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
}

console.log();
console.log('Adaptation Statistics:');
const stats = trackedAdapter.getStats();
console.log(`  Total attempts: ${stats.attempts}`);
console.log(`  Successes: ${stats.successes}`);
console.log(`  Failures: ${stats.failures}`);
console.log(`  Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
console.log(`  Average confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
console.log(`  Total transformations: ${stats.totalTransformations}`);
console.log();
console.log('Transformation breakdown:');
console.log(`  File renames: ${stats.transformationBreakdown['file-rename']}`);
console.log(`  Parameter interpolations: ${stats.transformationBreakdown['parameter-interpolation']}`);
console.log(`  Context merges: ${stats.transformationBreakdown['context-merge']}`);
console.log();

// ============================================================================
// Example 6: Real-World Cache Integration
// ============================================================================

console.log('='.repeat(70));
console.log('EXAMPLE 6: Real-World Cache Integration');
console.log('='.repeat(70));
console.log();

interface CacheEntry {
  key: SemanticKey;
  result: any;
  timestamp: number;
}

class AdaptiveCache {
  private cache = new Map<string, CacheEntry>();
  private adapter = new ResultAdapter({ minConfidence: 0.75 });

  set(key: SemanticKey, result: any): void {
    const hash = JSON.stringify(key);
    this.cache.set(hash, { key, result, timestamp: Date.now() });
  }

  get(queryKey: SemanticKey): { result: any; adapted: boolean; confidence: number } | null {
    // Try exact match first
    const hash = JSON.stringify(queryKey);
    const exact = this.cache.get(hash);
    if (exact) {
      return { result: exact.result, adapted: false, confidence: 1.0 };
    }

    // Try adaptation from similar cached entries
    let bestMatch: { result: any; confidence: number } | null = null;

    for (const entry of this.cache.values()) {
      if (this.adapter.canAdapt(entry.key, queryKey)) {
        const adapted = this.adapter.adapt(entry.result, entry.key, queryKey);
        if (adapted.success && (!bestMatch || adapted.confidence > bestMatch.confidence)) {
          bestMatch = { result: adapted.result, confidence: adapted.confidence };
        }
      }
    }

    if (bestMatch) {
      return { result: bestMatch.result, adapted: true, confidence: bestMatch.confidence };
    }

    return null; // Cache miss
  }
}

const adaptiveCache = new AdaptiveCache();

// Populate cache with some results
adaptiveCache.set(
  { intent: 'borrow-fix', target: 'src/lib.rs', context: ['rust'], params: {} },
  { solution: 'Added lifetime annotations to src/lib.rs' }
);

adaptiveCache.set(
  { intent: 'error-fix', target: 'UserService.ts', context: ['typescript'], params: {} },
  { solution: 'Fixed async error in UserService.ts' }
);

// Query 1: Exact match
console.log('Query 1: Fix borrow error in src/lib.rs');
const query1 = adaptiveCache.get({
  intent: 'borrow-fix',
  target: 'src/lib.rs',
  context: ['rust'],
  params: {},
});
console.log(`  Result: ${query1 ? 'Cache hit' : 'Cache miss'}`);
console.log(`  Adapted: ${query1?.adapted ? 'Yes' : 'No'}`);
console.log(`  Confidence: ${query1 ? (query1.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
console.log();

// Query 2: Similar (adapted)
console.log('Query 2: Fix borrow error in src/main.rs');
const query2 = adaptiveCache.get({
  intent: 'borrow-fix',
  target: 'src/main.rs',
  context: ['rust'],
  params: {},
});
console.log(`  Result: ${query2 ? 'Cache hit' : 'Cache miss'}`);
console.log(`  Adapted: ${query2?.adapted ? 'Yes' : 'No'}`);
console.log(`  Confidence: ${query2 ? (query2.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
if (query2?.result) {
  console.log(`  Result: ${JSON.stringify(query2.result)}`);
}
console.log();

// Query 3: No match
console.log('Query 3: Create React component');
const query3 = adaptiveCache.get({
  intent: 'component-create',
  target: 'Component.tsx',
  context: ['react'],
  params: {},
});
console.log(`  Result: ${query3 ? 'Cache hit' : 'Cache miss'}`);
console.log();

// ============================================================================
// Summary
// ============================================================================

console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log();
console.log('The Result Adapter enables:');
console.log('  1. File rename adaptation - reuse solutions for similar files');
console.log('  2. Parameter interpolation - adjust numeric/string values in results');
console.log('  3. Context merging - add new context to cached results');
console.log('  4. Confidence scoring - know when adaptation is safe');
console.log('  5. Statistics tracking - monitor adaptation performance');
console.log();
console.log('Benefits:');
console.log('  - Increased cache hit rate (exact + adapted hits)');
console.log('  - Reduced LLM calls for similar queries');
console.log('  - Cost savings through intelligent reuse');
console.log('  - Quality preservation via confidence thresholds');
console.log();
console.log('Use cases:');
console.log('  - Fixing same error in different files');
console.log('  - Creating similar components with different parameters');
console.log('  - Applying same optimization to different services');
console.log('  - Reusing test patterns across modules');
console.log();
