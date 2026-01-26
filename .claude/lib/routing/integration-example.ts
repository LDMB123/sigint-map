/**
 * Integration Example: RouteTable with existing semantic-hash module
 * Shows how RouteTable can leverage external semantic hash generation
 */

import { RouteTable } from './route-table';

// Example 1: Using RouteTable standalone (built-in hash generation)
console.log('=== Standalone RouteTable ===\n');
const router = new RouteTable();

const requests = [
  'Fix borrow checker error in Rust',
  'Create React component',
  'Optimize database performance',
  'Review security vulnerabilities'
];

requests.forEach(request => {
  const route = router.route(request);
  console.log(`${request}`);
  console.log(`  → ${route.agent} (${route.tier})\n`);
});

// Example 2: Performance test
console.log('\n=== Performance Test ===\n');
const iterations = 1000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  router.route(requests[i % requests.length]);
}

const duration = performance.now() - start;
console.log(`${iterations} lookups in ${duration.toFixed(2)}ms`);
console.log(`Average: ${(duration / iterations).toFixed(3)}ms per lookup`);
console.log(`Target: <0.5ms per lookup`);
console.log(`Status: ${duration / iterations < 0.5 ? '✓ PASS' : '⚠ NEEDS OPTIMIZATION'}\n`);

// Example 3: Statistics
console.log('\n=== Router Statistics ===\n');
const stats = router.getStats();
console.log(`Total lookups: ${stats.lookups}`);
console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
console.log(`Avg lookup time: ${stats.avgLookupTimeMs.toFixed(3)}ms`);
console.log(`Cache size: ${stats.cacheSize}/1000`);
console.log(`Route table size: ${stats.routeTableSize} routes\n`);

// Example 4: Semantic hash inspection
console.log('\n=== Semantic Hash Inspection ===\n');
const testRequest = 'Fix complex borrow checker error in async Rust code';
const hash = router.generateSemanticHash(testRequest);

console.log(`Request: "${testRequest}"\n`);
console.log('Hash components:');
console.log(`  Domain: 0x${hash.domain.toString(16).padStart(2, '0')} (${getDomainName(hash.domain)})`);
console.log(`  Action: 0x${hash.action.toString(16).padStart(2, '0')} (${getActionName(hash.action)})`);
console.log(`  Subtype: 0x${hash.subtype.toString(16).padStart(3, '0')}`);
console.log(`  Complexity: ${hash.complexity}/15`);
console.log(`  Confidence: ${hash.confidence}/15\n`);

// Helper functions
function getDomainName(domain: number): string {
  const domains: Record<number, string> = {
    0x01: 'rust',
    0x02: 'wasm',
    0x03: 'sveltekit',
    0x04: 'security',
    0x05: 'frontend',
    0x06: 'backend',
    0x07: 'database',
    0x08: 'testing',
    0x09: 'performance',
    0x0A: 'architecture',
    0x0B: 'documentation',
    0x0C: 'devops',
    0x0D: 'typescript',
    0x0E: 'prisma',
    0x0F: 'general'
  };
  return domains[domain] || 'unknown';
}

function getActionName(action: number): string {
  const actions: Record<number, string> = {
    0x01: 'create',
    0x02: 'debug',
    0x03: 'optimize',
    0x04: 'refactor',
    0x05: 'migrate',
    0x06: 'review',
    0x07: 'analyze',
    0x08: 'test',
    0x09: 'document',
    0x0A: 'fix',
    0x0B: 'update',
    0x0C: 'implement'
  };
  return actions[action] || 'unknown';
}

console.log('=== Integration Test Complete ===\n');
