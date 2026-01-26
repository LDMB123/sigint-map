/**
 * RouteTable Usage Examples
 * Demonstrates zero-overhead agent routing in practice
 */

import { RouteTable } from './route-table';

// Initialize router with default route table
const router = new RouteTable();

console.log('=== Zero-Overhead Router Examples ===\n');

// Example 1: Basic routing
console.log('1. Basic Routing:');
const examples = [
  'Fix borrow checker error in Rust',
  'Create new React component with TypeScript',
  'Optimize database query performance',
  'Write unit tests for API endpoints',
  'Review security vulnerabilities',
  'Debug lifetime error in async function',
  'Implement tRPC API for user management',
  'Migrate Prisma schema to v5'
];

examples.forEach(request => {
  const route = router.route(request);
  console.log(`  "${request}"`);
  console.log(`  → ${route.agent} (${route.tier})\n`);
});

// Example 2: Performance demonstration
console.log('\n2. Performance Test (1000 lookups):');
const testRequests = [
  'Fix TypeScript error',
  'Debug API issue',
  'Create component',
  'Optimize performance',
  'Review code'
];

const startTime = performance.now();
for (let i = 0; i < 1000; i++) {
  const request = testRequests[i % testRequests.length];
  router.route(request);
}
const duration = performance.now() - startTime;

console.log(`  Total time: \${duration.toFixed(2)}ms`);
console.log(`  Avg per request: \${(duration / 1000).toFixed(3)}ms`);
console.log(`  Throughput: \${(1000 / duration * 1000).toFixed(0)} requests/sec\n`);

// Example 3: Cache statistics
console.log('3. Cache Performance:');
const stats = router.getStats();
console.log(`  Total lookups: \${stats.lookups}`);
console.log(`  Cache hits: \${stats.cacheHits}`);
console.log(`  Cache misses: \${stats.cacheMisses}`);
console.log(`  Hit rate: \${(stats.cacheHitRate * 100).toFixed(1)}%`);
console.log(`  Cache size: \${stats.cacheSize}/1000`);
console.log(`  Avg lookup time: \${stats.avgLookupTimeMs.toFixed(3)}ms`);
console.log(`  Fuzzy matches: \${stats.fuzzyMatches}`);
console.log(`  Default fallbacks: \${stats.defaultFallbacks}\n`);

console.log('\n=== Router Ready for Production ===\n');
