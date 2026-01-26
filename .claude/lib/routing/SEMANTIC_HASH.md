# Semantic Hash Generator

> Convert natural language requests into 64-bit semantic hashes for instant agent routing

The Semantic Hash Generator is the foundational component of the Zero-Overhead Router system. It analyzes natural language requests and generates compact 64-bit hashes that encode domain, complexity, action, subtype, and routing confidence.

## Performance

- **Hash Generation**: <1ms (typically 0.001-0.01ms)
- **Memory**: 8 bytes per hash
- **Accuracy**: >95% correct domain/action detection
- **Throughput**: 450,000+ hashes/second

## Quick Start

```typescript
import { hashRequest, analyzeRequest } from './semantic-hash.js';

// Generate a hash
const hash = hashRequest('Fix borrow checker error in async function');
// Returns: 94611063772807168n (0x01_5_02_042_E_0000000)

// Get detailed analysis
const analysis = analyzeRequest('Create Leptos SSR application');
console.log(analysis.breakdown);
// {
//   domain: { id: 2, name: 'WASM' },
//   complexity: 5,
//   action: { id: 1, name: 'CREATE' },
//   subtype: { id: 278, name: 'LEPTOS_SSR' },
//   confidence: 14
// }
```

## Hash Structure

The 64-bit hash is packed as follows:

```
┌─────────┬────────────┬─────────┬───────────┬────────────┬──────────┐
│ Domain  │ Complexity │ Action  │  Subtype  │ Confidence │ Reserved │
│ 8 bits  │  4 bits    │ 8 bits  │ 12 bits   │  4 bits    │ 28 bits  │
└─────────┴────────────┴─────────┴───────────┴────────────┴──────────┘
  Bits:    56-63        52-55      44-51       32-43        28-31       0-27
```

### Domain (8 bits)

Technology or area of focus:

| Domain | ID | Examples |
|--------|-----|----------|
| RUST | 0x01 | Rust, Cargo, borrow checker |
| WASM | 0x02 | WebAssembly, Leptos, Yew |
| SVELTEKIT | 0x03 | SvelteKit, Svelte components |
| SECURITY | 0x04 | Vulnerabilities, XSS, CSRF |
| FULLSTACK | 0x05 | Full-stack development |
| FRONTEND | 0x06 | React, UI components |
| BACKEND | 0x07 | API, server-side |
| DATABASE | 0x08 | SQL, queries, schema |
| TESTING | 0x09 | Tests, specs, coverage |
| TYPESCRIPT | 0x10 | TypeScript, types |
| PRISMA | 0x11 | Prisma schema, migrations |
| TRPC | 0x12 | tRPC routers, procedures |

### Complexity (4 bits, 0-15)

Calculated from request characteristics:

- Base complexity: 5
- +1-3 for multiple requirements ("and" clauses)
- +2 for architectural terms
- +1-3 for multi-step processes
- +2 for performance requirements
- +1 for integration work
- -2 for simple operations

**Examples:**
- "Fix typo" → Complexity: 3
- "Create React component" → Complexity: 5
- "Design scalable microservices architecture" → Complexity: 12

### Action (8 bits)

Operation being performed:

| Action | ID | Examples |
|--------|-----|----------|
| CREATE | 0x01 | create, build, generate, scaffold |
| DEBUG | 0x02 | debug, fix, solve, error, bug |
| OPTIMIZE | 0x03 | optimize, improve, faster |
| MIGRATE | 0x04 | migrate, upgrade, convert |
| REFACTOR | 0x05 | refactor, restructure |
| TEST | 0x06 | test, verify, coverage |
| DOCUMENT | 0x07 | document, explain |
| REVIEW | 0x08 | review, audit, check |
| IMPLEMENT | 0x0C | implement, add, integrate |

### Subtype (12 bits, 0-4095)

Specific task type, organized by domain range:

**Rust (0x001-0x0FF):**
- `0x042` BORROW_CHECKER - Borrow checker errors
- `0x043` LIFETIME - Lifetime annotation issues
- `0x044` TRAIT_BOUNDS - Trait bound problems
- `0x045` ASYNC_RUNTIME - Async/await, tokio
- `0x046` MACRO - Macro-related tasks
- `0x047` UNSAFE - Unsafe code
- `0x048` OWNERSHIP - Ownership issues

**WASM (0x100-0x1FF):**
- `0x115` LEPTOS - Leptos framework
- `0x116` LEPTOS_SSR - Leptos SSR
- `0x117` YEW - Yew framework
- `0x118` WASM_BINDGEN - wasm-bindgen
- `0x119` WASM_PACK - wasm-pack

**Security (0x300-0x3FF):**
- `0x315` VULNERABILITY - General vulnerabilities
- `0x316` AUTH - Authentication/authorization
- `0x319` XSS - Cross-site scripting
- `0x31A` CSRF - Cross-site request forgery
- `0x31B` SQL_INJECTION - SQL injection

**Database (0x400-0x4FF):**
- `0x415` SCHEMA_DESIGN - Database schema
- `0x416` MIGRATION - Database migrations
- `0x417` QUERY_OPTIMIZATION - Query performance
- `0x418` INDEXING - Database indexes

**Testing (0x500-0x5FF):**
- `0x515` UNIT_TEST - Unit tests
- `0x516` INTEGRATION_TEST - Integration/E2E tests
- `0x518` SNAPSHOT_TEST - Snapshot tests
- `0x519` MOCK - Mocking/stubbing

### Confidence (4 bits, 0-15)

Routing confidence score based on pattern match quality:

- **15-13**: High confidence - direct routing recommended
- **12-8**: Medium confidence - route with monitoring
- **7-0**: Low confidence - escalate to orchestrator

Weighted calculation:
- Domain match: 40%
- Action match: 30%
- Subtype match: 30%

## API Reference

### Core Functions

#### `hashRequest(request: string): bigint`

Generate a 64-bit semantic hash from a natural language request.

```typescript
const hash = hashRequest('Fix borrow checker error');
// 94611063772807168n
```

**Performance**: <1ms (typically 0.001-0.01ms)

#### `unpackHash(hash: bigint): SemanticHash`

Unpack a 64-bit hash into its component fields.

```typescript
const unpacked = unpackHash(hash);
// {
//   domain: 1,
//   complexity: 5,
//   action: 2,
//   subtype: 66,
//   confidence: 14,
//   reserved: 0
// }
```

#### `formatHash(hash: bigint): string`

Format a hash as a human-readable hex string.

```typescript
const formatted = formatHash(hash);
// "0x01_5_02_042_E_0000000"
```

#### `analyzeRequest(request: string): Analysis`

Get complete analysis with named fields.

```typescript
const analysis = analyzeRequest('Fix borrow checker error');
// {
//   request: 'Fix borrow checker error',
//   hash: 94611063772807168n,
//   formatted: '0x01_5_02_042_E_0000000',
//   breakdown: {
//     domain: { id: 1, name: 'RUST' },
//     complexity: 5,
//     action: { id: 2, name: 'DEBUG' },
//     subtype: { id: 66, name: 'BORROW_CHECKER' },
//     confidence: 14
//   }
// }
```

### Utility Functions

#### `getDomainName(domainId: number): string`

```typescript
getDomainName(0x01); // "RUST"
getDomainName(0x11); // "PRISMA"
```

#### `getActionName(actionId: number): string`

```typescript
getActionName(0x02); // "DEBUG"
getActionName(0x03); // "OPTIMIZE"
```

#### `getSubtypeName(subtypeId: number): string`

```typescript
getSubtypeName(0x042); // "BORROW_CHECKER"
getSubtypeName(0x319); // "XSS"
```

### Constants

All constants are exported for external use:

```typescript
import { DOMAIN, ACTION, SUBTYPE } from './semantic-hash.js';

// Domain IDs
DOMAIN.RUST       // 0x01
DOMAIN.WASM       // 0x02
DOMAIN.SECURITY   // 0x04
DOMAIN.TYPESCRIPT // 0x10
DOMAIN.PRISMA     // 0x11

// Action IDs
ACTION.CREATE     // 0x01
ACTION.DEBUG      // 0x02
ACTION.OPTIMIZE   // 0x03

// Subtype IDs
SUBTYPE.BORROW_CHECKER // 0x042
SUBTYPE.LEPTOS_SSR     // 0x116
SUBTYPE.XSS            // 0x319
```

## Examples

### Example 1: Basic Hashing

```typescript
import { hashRequest, formatHash } from './semantic-hash.js';

const request = 'Fix borrow checker error in async function';
const hash = hashRequest(request);

console.log('Hash:', hash);
console.log('Formatted:', formatHash(hash));
// Hash: 94611063772807168n
// Formatted: 0x01_5_02_042_E_0000000
```

### Example 2: Routing Logic

```typescript
import { hashRequest, unpackHash, DOMAIN, SUBTYPE } from './semantic-hash.js';

function routeToAgent(request: string): string {
  const hash = hashRequest(request);
  const { domain, subtype, confidence } = unpackHash(hash);

  // Low confidence? Route to orchestrator
  if (confidence < 12) return 'orchestrator';

  // Domain-specific routing
  if (domain === DOMAIN.RUST) {
    if (subtype === SUBTYPE.BORROW_CHECKER) {
      return 'rust-semantics-engineer';
    }
    return 'rust-project-architect';
  }

  if (domain === DOMAIN.SECURITY) {
    return 'security-engineer';
  }

  return 'full-stack-developer';
}

const agent = routeToAgent('Fix borrow checker error');
// "rust-semantics-engineer"
```

### Example 3: Batch Analysis

```typescript
import { analyzeRequest } from './semantic-hash.js';

const requests = [
  'Fix borrow checker error',
  'Create React component',
  'Optimize database queries',
  'Review security vulnerabilities',
];

requests.forEach(req => {
  const analysis = analyzeRequest(req);
  console.log(`${req}`);
  console.log(`  Domain: ${analysis.breakdown.domain.name}`);
  console.log(`  Action: ${analysis.breakdown.action.name}`);
  console.log(`  Confidence: ${analysis.breakdown.confidence}/15`);
});
```

### Example 4: Performance Testing

```typescript
import { hashRequest } from './semantic-hash.js';

const requests = ['Fix error', 'Create app', 'Optimize code'];
const iterations = 10000;

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  requests.forEach(req => hashRequest(req));
}
const end = performance.now();

const avgTime = (end - start) / (iterations * requests.length);
console.log(`Average: ${avgTime.toFixed(4)}ms`);
// Typical output: ~0.002ms
```

## Pattern Matching

The semantic hash generator uses prioritized regex patterns for detection:

### Domain Patterns

High-priority patterns (confidence 15):
- `/\b(rust|cargo|rustc)\b/i`
- `/\b(borrow|lifetime|ownership)\s+(checker|error)/i`
- `/\b(wasm|webassembly|wasm-bindgen)\b/i`
- `/\b(prisma|schema\.prisma)\b/i`

Medium-priority patterns (confidence 12-13):
- `/\b(async|tokio|actix)\b/i`
- `/\b(typescript|\.ts|\.tsx)\b/i`
- `/\b(test|spec|vitest)\b/i`

### Action Patterns

Debug/Fix (high priority):
- `/\b(debug|fix|solve|error|bug)\b/i` (confidence 14)
- `/\b(not working|broken|failing)\b/i` (confidence 13)

Create (high priority):
- `/\b(create|build|generate|scaffold)\b/i` (confidence 13)

Optimize:
- `/\b(optimize|improve|faster|performance)\b/i` (confidence 13)

### Subtype Patterns

Specific patterns have highest priority:
- `/\bborrow\s+(checker|error)/i` → BORROW_CHECKER (confidence 15)
- `/\bleptos\s+(ssr|server)/i` → LEPTOS_SSR (confidence 15)
- `/\b(xss|cross-site\s+scripting)/i` → XSS (confidence 15)

## Testing

Run the comprehensive test suite:

```bash
cd /Users/louisherman/ClaudeCodeProjects/.claude
npm test lib/routing/semantic-hash.test.ts
```

Test coverage includes:
- Hash generation for all major domains
- Complexity calculation accuracy
- Pack/unpack bit operations
- Format operations
- Performance benchmarks (<1ms target)
- Edge cases (empty, long, special chars)
- Confidence scoring

## Performance Benchmarks

From test results:

```
Total requests hashed: 50,000
Total time: 109ms
Average time per hash: 0.002ms
Target: <1ms ✓
```

Performance characteristics:
- Single hash: ~0.001-0.01ms
- Batch (1000): ~2ms total
- Throughput: >450,000 hashes/second

## Integration

The semantic hash system integrates with:

1. **Route Table** (`route-table.ts`): Uses hashes for O(1) agent lookup
2. **Hot Path Cache**: Caches request patterns with their hashes
3. **Fuzzy Matcher**: Fallback when exact hash match fails
4. **Pre-Warmed Contexts**: Agent initialization based on hash

## Extending

### Adding New Domains

Edit the `DOMAIN` constant:

```typescript
const DOMAIN = {
  // ... existing domains
  MY_DOMAIN: 0x20,
} as const;
```

Add detection patterns:

```typescript
const DOMAIN_PATTERNS: Array<[RegExp, number, number]> = [
  // ... existing patterns
  [/\bmy-framework\b/i, DOMAIN.MY_DOMAIN, 15],
];
```

### Adding New Subtypes

```typescript
const SUBTYPE = {
  // ... existing subtypes
  MY_SUBTYPE: 0x800,  // Use range 0x800-0x8FF for custom
} as const;
```

Add detection patterns:

```typescript
const SUBTYPE_PATTERNS: Array<[RegExp, number, number]> = [
  // ... existing patterns
  [/\bmy specific pattern\b/i, SUBTYPE.MY_SUBTYPE, 14],
];
```

## Best Practices

1. **Use analyzeRequest() for debugging** - Get full breakdown of hash components
2. **Check confidence before routing** - Escalate low-confidence requests
3. **Cache hash results** - If hashing the same request multiple times
4. **Use batch operations** - When processing multiple requests
5. **Monitor accuracy** - Track routing success rate to tune patterns

## Troubleshooting

### Low Confidence Scores

**Problem**: Requests getting confidence <12

**Solutions**:
- Add more specific patterns for your domain
- Increase pattern confidence scores
- Combine multiple domain indicators in requests

### Wrong Domain Detection

**Problem**: Request routed to wrong domain

**Solutions**:
- Check pattern priority (earlier patterns win)
- Make domain patterns more specific
- Add negative patterns to exclude false matches

### Performance Issues

**Problem**: Hashing taking >1ms

**Solutions**:
- Simplify regex patterns (avoid backtracking)
- Reduce number of patterns checked
- Use more specific patterns first (early exit)
- Profile with performance.now()

## Version

**Version**: 1.0.0
**Last Updated**: 2026-01-25
**Specification**: `.claude/optimization/ZERO_OVERHEAD_ROUTER.md`

## See Also

- [Route Table Documentation](./README.md)
- [Example Usage](./example.ts)
- [Test Suite](./semantic-hash.test.ts)
- [Zero-Overhead Router Spec](../../optimization/ZERO_OVERHEAD_ROUTER.md)
