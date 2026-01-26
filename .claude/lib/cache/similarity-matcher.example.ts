/**
 * Similarity Matcher Usage Examples
 * Demonstrates fuzzy cache matching with vector similarity search
 */

import { SimilarityMatcher, findSimilar, batchFindSimilar } from './similarity-matcher';
import type { SemanticKey } from './types';

// ============================================================================
// Example 1: Basic Similarity Matching
// ============================================================================

console.log('\n=== Example 1: Basic Similarity Matching ===\n');

const matcher = new SimilarityMatcher();

const query: SemanticKey = {
  intent: 'borrow-fix',
  target: 'src/lib.rs',
  context: ['rust', 'memory-management'],
  params: {},
};

const cachedKeys: SemanticKey[] = [
  {
    intent: 'borrow-fix',
    target: 'lib.rs', // Different path, same file
    context: ['rust'],
    params: {},
  },
  {
    intent: 'error-fix', // Different but related intent
    target: 'src/lib.rs',
    context: ['rust'],
    params: {},
  },
  {
    intent: 'component-create', // Very different intent
    target: 'Button.tsx',
    context: ['react'],
    params: {},
  },
];

const matches = matcher.findMatches(query, cachedKeys);

console.log('Query:', query);
console.log(`\nFound ${matches.length} matches above threshold (0.85):\n`);
matches.forEach((match, i) => {
  console.log(`${i + 1}. Score: ${match.score.toFixed(3)}`);
  console.log(`   Intent: ${match.key.intent}`);
  console.log(`   Target: ${match.key.target}`);
  console.log(`   Context: [${match.key.context.join(', ')}]\n`);
});

// ============================================================================
// Example 2: React Component Variations
// ============================================================================

console.log('\n=== Example 2: React Component Variations ===\n');

const componentQuery: SemanticKey = {
  intent: 'component-create',
  target: 'src/components/Button.tsx',
  context: ['react', 'typescript'],
  params: {},
};

const componentCandidates: SemanticKey[] = [
  {
    intent: 'component-create',
    target: 'Button.tsx', // Just filename
    context: ['react', 'typescript'],
    params: {},
  },
  {
    intent: 'component-create',
    target: 'components/Button.tsx', // Partial path
    context: ['react'],
    params: {},
  },
  {
    intent: 'component-create',
    target: 'src/components/Button.jsx', // Different extension
    context: ['react', 'javascript'],
    params: {},
  },
  {
    intent: 'component-create',
    target: 'src/components/Input.tsx', // Same directory, different file
    context: ['react', 'typescript'],
    params: {},
  },
];

const componentMatches = matcher.findMatches(componentQuery, componentCandidates);

console.log('Query:', componentQuery.target);
console.log(`\nMatches for React component (threshold: 0.85):\n`);
componentMatches.forEach((match) => {
  console.log(`${match.key.target.padEnd(30)} Score: ${match.score.toFixed(3)}`);
});

// ============================================================================
// Example 3: Performance Measurement
// ============================================================================

console.log('\n=== Example 3: Performance Measurement ===\n');

const performanceQuery: SemanticKey = {
  intent: 'error-fix',
  target: 'src/utils/helpers.ts',
  context: ['typescript'],
  params: {},
};

// Generate 1000 candidates
const largeCandidateSet: SemanticKey[] = Array(1000)
  .fill(null)
  .map((_, i) => ({
    intent: i % 3 === 0 ? 'error-fix' : i % 3 === 1 ? 'component-create' : 'test-create',
    target: `src/file${i}.ts`,
    context: ['typescript'],
    params: {},
  }));

const start = performance.now();
const perfMatches = matcher.findMatches(performanceQuery, largeCandidateSet);
const elapsed = performance.now() - start;

console.log(`Searched ${largeCandidateSet.length} candidates in ${elapsed.toFixed(2)}ms`);
console.log(`Found ${perfMatches.length} matches`);
console.log(`Average: ${(elapsed / largeCandidateSet.length).toFixed(4)}ms per comparison`);

// ============================================================================
// Example 4: Custom Configuration
// ============================================================================

console.log('\n=== Example 4: Custom Configuration ===\n');

// Create matcher with custom weights favoring intent over target
const customMatcher = new SimilarityMatcher({
  threshold: 0.80, // Lower threshold
  weights: {
    intent: 0.70, // Higher weight for intent
    target: 0.20, // Lower weight for target
    context: 0.10, // Lower weight for context
  },
  maxResults: 5, // Limit to top 5 results
});

const customQuery: SemanticKey = {
  intent: 'test-create',
  target: 'UserService.ts',
  context: ['typescript'],
  params: {},
};

const customCandidates: SemanticKey[] = [
  {
    intent: 'test-create',
    target: 'AuthService.ts', // Different file, same intent
    context: ['typescript'],
    params: {},
  },
  {
    intent: 'test-create',
    target: 'UserService.test.ts', // Related file
    context: ['typescript', 'testing'],
    params: {},
  },
  {
    intent: 'component-create',
    target: 'UserService.ts', // Same file, different intent
    context: ['typescript'],
    params: {},
  },
];

const customMatches = customMatcher.findMatches(customQuery, customCandidates);

console.log('Custom weights (intent: 0.70, target: 0.20, context: 0.10):');
console.log(`Query: ${customQuery.intent} @ ${customQuery.target}\n`);
customMatches.forEach((match) => {
  console.log(`${match.key.intent.padEnd(20)} ${match.key.target.padEnd(25)} Score: ${match.score.toFixed(3)}`);
});

// ============================================================================
// Example 5: Convenience Functions
// ============================================================================

console.log('\n=== Example 5: Convenience Functions ===\n');

const key1: SemanticKey = {
  intent: 'refactor',
  target: 'src/legacy/old-code.ts',
  context: ['typescript', 'legacy'],
  params: {},
};

const key2: SemanticKey = {
  intent: 'refactor',
  target: 'legacy/old-code.ts',
  context: ['typescript'],
  params: {},
};

// One-off similarity calculation
const score = matcher.calculateSimilarity(key1, key2);
console.log('One-off similarity calculation:');
console.log(`${key1.target} vs ${key2.target}: ${score.toFixed(3)}`);

// One-off findSimilar
const quickMatches = findSimilar(key1, [key2], 0.85);
console.log(`\nQuick search found ${quickMatches.length} matches`);

// ============================================================================
// Example 6: Batch Processing
// ============================================================================

console.log('\n=== Example 6: Batch Processing ===\n');

const queries: SemanticKey[] = [
  {
    intent: 'error-fix',
    target: 'app.ts',
    context: ['typescript'],
    params: {},
  },
  {
    intent: 'component-create',
    target: 'Header.tsx',
    context: ['react'],
    params: {},
  },
  {
    intent: 'test-create',
    target: 'utils.ts',
    context: ['typescript'],
    params: {},
  },
];

const candidates: SemanticKey[] = Array(100)
  .fill(null)
  .map((_, i) => ({
    intent: i % 3 === 0 ? 'error-fix' : i % 3 === 1 ? 'component-create' : 'test-create',
    target: `file${i}.ts`,
    context: ['typescript'],
    params: {},
  }));

const batchStart = performance.now();
const batchResults = batchFindSimilar(queries, candidates, 0.85);
const batchElapsed = performance.now() - batchStart;

console.log(`Batch processed ${queries.length} queries against ${candidates.length} candidates`);
console.log(`Total time: ${batchElapsed.toFixed(2)}ms`);
console.log(`Average per query: ${(batchElapsed / queries.length).toFixed(2)}ms\n`);

for (const [query, matches] of batchResults.entries()) {
  console.log(`Query: ${query.intent} @ ${query.target} - Found ${matches.length} matches`);
}

// ============================================================================
// Example 7: Cache Management
// ============================================================================

console.log('\n=== Example 7: Cache Management ===\n');

const cacheMatcher = new SimilarityMatcher();

// Perform some searches to populate cache
for (let i = 0; i < 10; i++) {
  cacheMatcher.findMatches(
    { intent: 'test', target: `file${i}.ts`, context: ['typescript'], params: {} },
    [{ intent: 'test', target: `file${i}.ts`, context: ['typescript'], params: {} }]
  );
}

const stats = cacheMatcher.getCacheStats();
console.log('Cache Statistics:');
console.log(`  Vector cache size: ${stats.vectorCacheSize}`);
console.log(`  Similarity cache size: ${stats.similarityCacheSize}`);

// Clear caches to free memory
cacheMatcher.clearCaches();
const clearedStats = cacheMatcher.getCacheStats();
console.log('\nAfter clearing:');
console.log(`  Vector cache size: ${clearedStats.vectorCacheSize}`);
console.log(`  Similarity cache size: ${clearedStats.similarityCacheSize}`);

// ============================================================================
// Example 8: Real-World Cache Hit Scenario
// ============================================================================

console.log('\n=== Example 8: Real-World Cache Hit Scenario ===\n');

// Simulate a cache with previous requests
const cache: Array<{ key: SemanticKey; result: string }> = [
  {
    key: {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust', 'memory-management'],
      params: {},
    },
    result: 'Fixed borrow checker error by adding lifetime annotation',
  },
  {
    key: {
      intent: 'component-create',
      target: 'src/components/Button.tsx',
      context: ['react', 'typescript'],
      params: {},
    },
    result: 'Created reusable Button component with TypeScript',
  },
  {
    key: {
      intent: 'test-create',
      target: 'src/utils/helpers.ts',
      context: ['typescript', 'testing'],
      params: {},
    },
    result: 'Generated unit tests for helper functions',
  },
];

// New request comes in
const newRequest: SemanticKey = {
  intent: 'borrow-fix',
  target: 'lib.rs', // Slightly different path
  context: ['rust'], // Less context
  params: {},
};

// Search cache
const cacheMatches = matcher.findMatches(
  newRequest,
  cache.map((entry) => entry.key)
);

if (cacheMatches.length > 0) {
  const bestMatch = cacheMatches[0];
  const cachedResult = cache.find((entry) => entry.key === bestMatch.key)?.result;

  console.log('Cache hit!');
  console.log(`Similarity score: ${bestMatch.score.toFixed(3)}`);
  console.log(`Cached result: "${cachedResult}"`);
  console.log('\nCache saved expensive LLM call!');
} else {
  console.log('Cache miss - would invoke LLM');
}

// ============================================================================
// Example 9: Threshold Comparison
// ============================================================================

console.log('\n=== Example 9: Threshold Comparison ===\n');

const thresholdQuery: SemanticKey = {
  intent: 'error-fix',
  target: 'src/app.ts',
  context: ['typescript'],
  params: {},
};

const thresholdCandidate: SemanticKey = {
  intent: 'type-fix', // Related but different intent
  target: 'src/app.ts',
  context: ['typescript'],
  params: {},
};

const thresholds = [0.95, 0.90, 0.85, 0.80, 0.75, 0.70];

console.log('Testing different thresholds:');
console.log(`Query: ${thresholdQuery.intent} @ ${thresholdQuery.target}`);
console.log(`Candidate: ${thresholdCandidate.intent} @ ${thresholdCandidate.target}\n`);

const actualScore = matcher.calculateSimilarity(thresholdQuery, thresholdCandidate);
console.log(`Actual similarity score: ${actualScore.toFixed(3)}\n`);

thresholds.forEach((threshold) => {
  const matches = matcher.findMatches(thresholdQuery, [thresholdCandidate], threshold);
  const status = matches.length > 0 ? '✓ MATCH' : '✗ NO MATCH';
  console.log(`Threshold ${threshold.toFixed(2)}: ${status}`);
});

console.log('\n=== All Examples Complete ===\n');
