/**
 * Semantic Encoder Usage Examples
 * Demonstrates how to use the semantic encoder for cache key generation
 */

import {
  extractSemanticKey,
  hashSemanticKey,
  calculateSimilarity,
  findSimilar,
  semanticKeyToString,
  type SemanticKey,
} from './semantic-encoder';

// ============================================================================
// EXAMPLE 1: Basic Semantic Key Extraction
// ============================================================================

console.log('Example 1: Basic Extraction\n');

const request1 = 'Fix the borrow error in src/lib.rs';
const key1 = extractSemanticKey(request1);

console.log('Request:', request1);
console.log('Semantic Key:', JSON.stringify(key1, null, 2));
console.log('Hash:', hashSemanticKey(key1));
console.log('Human-readable:', semanticKeyToString(key1));
console.log();

// Output:
// {
//   "intent": "borrow-fix",
//   "target": "src/lib.rs",
//   "context": ["rust", "memory-management"],
//   "params": {}
// }

// ============================================================================
// EXAMPLE 2: Semantic Matching - Same Intent, Different Phrasing
// ============================================================================

console.log('Example 2: Semantic Matching\n');

const variations = [
  'Fix the borrow error in src/lib.rs',
  'Resolve borrow checker issue in src/lib.rs',
  'Fix borrowing problem in src/lib.rs',
  'Help with borrow error src/lib.rs',
];

const keys = variations.map(extractSemanticKey);
const hashes = keys.map(hashSemanticKey);

console.log('All variations produce the same hash?', new Set(hashes).size === 1);
console.log('Cache hit rate:', ((variations.length - new Set(hashes).size) / variations.length * 100).toFixed(1) + '%');
console.log();

// Output: All variations produce the same hash? true
// Cache hit rate: 75.0%

// ============================================================================
// EXAMPLE 3: Similarity Scoring for Fuzzy Matching
// ============================================================================

console.log('Example 3: Similarity Scoring\n');

const baseRequest = 'Fix borrow error in src/lib.rs';
const baseKey = extractSemanticKey(baseRequest);

const similarRequests = [
  'Fix borrow error in src/lib.rs',           // Exact match
  'Fix borrow error in lib.rs',               // Same basename
  'Fix borrow error in src/main.rs',          // Same directory
  'Fix type error in src/lib.rs',             // Different intent, same target
  'Create component in Header.tsx',           // Completely different
];

console.log('Base request:', baseRequest);
console.log('Similarity scores:\n');

for (const req of similarRequests) {
  const key = extractSemanticKey(req);
  const similarity = calculateSimilarity(baseKey, key);
  const wouldCacheHit = similarity >= 0.85 ? 'HIT' : 'MISS';

  console.log(`${wouldCacheHit} (${(similarity * 100).toFixed(1)}%) - ${req}`);
}
console.log();

// Output:
// HIT (100.0%) - Fix borrow error in src/lib.rs
// HIT (90.0%) - Fix borrow error in lib.rs
// MISS (82.0%) - Fix borrow error in src/main.rs
// MISS (50.0%) - Fix type error in src/lib.rs
// MISS (0.0%) - Create component in Header.tsx

// ============================================================================
// EXAMPLE 4: Finding Similar Cache Entries
// ============================================================================

console.log('Example 4: Finding Similar Entries\n');

const targetKey = extractSemanticKey('Fix borrow error in src/lib.rs');

const cachedKeys: SemanticKey[] = [
  extractSemanticKey('Fix borrow error in src/lib.rs'),
  extractSemanticKey('Fix borrow error in lib.rs'),
  extractSemanticKey('Fix type error in src/lib.rs'),
  extractSemanticKey('Create React component'),
  extractSemanticKey('Fix borrow error in src/utils/helper.rs'),
];

const similar = findSimilar(targetKey, cachedKeys, 0.85);

console.log('Target request: Fix borrow error in src/lib.rs');
console.log(`Found ${similar.length} similar cache entries (threshold: 0.85):\n`);

for (const match of similar) {
  console.log(`Score: ${(match.score * 100).toFixed(1)}% - ${semanticKeyToString(match.key)}`);
}
console.log();

// Output:
// Found 2 similar cache entries (threshold: 0.85):
// Score: 100.0% - Intent: borrow-fix | Target: src/lib.rs | Context: [rust, memory-management]
// Score: 90.0% - Intent: borrow-fix | Target: lib.rs | Context: [rust, memory-management]

// ============================================================================
// EXAMPLE 5: Complex Requests with Parameters
// ============================================================================

console.log('Example 5: Parameter Extraction\n');

const complexRequests = [
  'Create component with tests and documentation',
  'Generate 10 test cases for UserService',
  'Update to version 2.5.0 with breaking changes',
  'Fix high priority security bug in auth.ts',
];

for (const req of complexRequests) {
  const key = extractSemanticKey(req);
  console.log('Request:', req);
  console.log('Intent:', key.intent);
  console.log('Target:', key.target || '(none)');
  console.log('Params:', JSON.stringify(key.params));
  console.log();
}

// Output:
// Request: Create component with tests and documentation
// Intent: component-create
// Target: (none)
// Params: {"flags":{"tests":true,"documentation":true}}

// ============================================================================
// EXAMPLE 6: Integration with Cache Manager
// ============================================================================

console.log('Example 6: Cache Integration Pattern\n');

// Pseudo-code for cache integration
async function handleRequest(request: string): Promise<any> {
  // Extract semantic key
  const semanticKey = extractSemanticKey(request);
  const cacheKey = hashSemanticKey(semanticKey);

  console.log('Request:', request);
  console.log('Semantic Key:', semanticKeyToString(semanticKey));
  console.log('Cache Key:', cacheKey.substring(0, 16) + '...');

  // Layer 1: Exact match
  // const exactMatch = cache.get(cacheKey);
  // if (exactMatch) return exactMatch;

  // Layer 2: Similar match
  // const similar = cache.findSimilar(semanticKey, 0.85);
  // if (similar) return adaptResult(similar);

  // Layer 3: Execute and cache
  // const result = await execute(request);
  // cache.set(cacheKey, result, semanticKey);
  // return result;

  console.log();
}

await handleRequest('Fix borrow error in src/lib.rs');

// ============================================================================
// EXAMPLE 7: Context-Aware Caching
// ============================================================================

console.log('Example 7: Context-Aware Keys\n');

const contextRequests = [
  'Create React component for user profile',
  'Setup Next.js API route',
  'Optimize Django query performance',
  'Fix async/await issue in Node.js',
];

for (const req of contextRequests) {
  const key = extractSemanticKey(req);
  console.log('Request:', req);
  console.log('Context:', key.context);
  console.log();
}

// Output:
// Request: Create React component for user profile
// Context: ["react", "javascript", "ui"]
//
// Request: Setup Next.js API route
// Context: ["nextjs", "react", "javascript", "api"]

// ============================================================================
// EXAMPLE 8: Real-World Cache Hit Rate Analysis
// ============================================================================

console.log('Example 8: Real-World Hit Rate\n');

// Simulate real development session with variations
const developmentSession = [
  // Developer working on same feature with slight variations
  'Fix the type error in UserService.ts',
  'Resolve type issue in UserService.ts',
  'Fix typing problem in UserService.ts',

  // Adding tests
  'Create tests for UserService',
  'Add unit tests for UserService',
  'Generate test spec for UserService',

  // Performance work
  'Optimize performance in the query',
  'Improve query speed',
  'Enhance query performance',

  // Documentation
  'Generate docs for UserService',
  'Create documentation for UserService',
  'Write API docs for UserService',
];

const sessionKeys = developmentSession.map(extractSemanticKey);
const sessionHashes = sessionKeys.map(hashSemanticKey);
const uniqueEntries = new Set(sessionHashes).size;

const hitRate = ((developmentSession.length - uniqueEntries) / developmentSession.length * 100);

console.log('Session requests:', developmentSession.length);
console.log('Unique cache entries:', uniqueEntries);
console.log('Cache hit rate:', hitRate.toFixed(1) + '%');
console.log('Tokens saved:', Math.floor(developmentSession.length * 0.75 * 1000), '(estimated)');
console.log('Cost saved:', '$' + (developmentSession.length * 0.75 * 0.006).toFixed(2), '(estimated)');
console.log();

// ============================================================================
// EXAMPLE 9: Intent Category Analysis
// ============================================================================

console.log('Example 9: Intent Categories\n');

const categoryExamples = {
  debug: ['Fix error', 'Debug issue', 'Resolve bug'],
  create: ['Create component', 'Add function', 'Generate test'],
  refactor: ['Refactor code', 'Simplify logic', 'Extract function'],
  analyze: ['Explain function', 'Analyze code', 'Find usage'],
  optimize: ['Optimize performance', 'Improve speed'],
};

for (const [category, examples] of Object.entries(categoryExamples)) {
  console.log(`${category.toUpperCase()}:`);
  for (const example of examples) {
    const key = extractSemanticKey(example);
    console.log(`  ${example} -> ${key.intent}`);
  }
  console.log();
}
