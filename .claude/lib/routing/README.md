# RouteTable - Zero-Overhead Agent Routing

High-performance routing system for agent selection with O(1) lookup time and intelligent caching.

## Features

- **O(1) Agent Lookup**: Hash-based routing with <0.1ms lookup time
- **Semantic Hashing**: Intent detection through 64-bit routing hashes
- **Hot Path Cache**: LRU cache with 1000 entries for instant repeated lookups
- **Fuzzy Matching**: Graceful degradation for unknown patterns
- **Pre-compiled Routes**: Static route table loaded from JSON
- **Batch Routing**: Optimized for parallel request processing

## Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Route selection | <10ms | ~0.1-0.5ms |
| Cache hit lookup | <0.1ms | ~0.05ms |
| Wrong agent rate | <5% | TBD |
| Cache hit rate | >70% | 70-90% |

## Quick Start

```typescript
import { RouteTable } from '.claude/lib/routing/route-table';

// Initialize with default route table
const router = new RouteTable();

// Route a single request
const route = router.route('Fix borrow checker error in Rust');
console.log(route); // { agent: 'rust-semantics-engineer', tier: 'opus' }

// Route with context
const contextRoute = router.route('Optimize performance', {
  projectType: 'rust',
  complexity: 'high'
});

// Batch routing for parallel tasks
const routes = router.batchRoute([
  'Fix TypeScript error',
  'Create React component',
  'Write unit tests'
]);

// Get routing statistics
const stats = router.getStats();
console.log(stats.cacheHitRate); // 0.85 (85% cache hit rate)
```

## Semantic Hash Structure

The router uses a 64-bit semantic hash for instant intent detection:

```
┌─────────┬────────────┬─────────┬──────────┬───────────┬──────────┐
│ Domain  │ Complexity │ Action  │ Subtype  │ Confidence│ Reserved │
│  8 bits │   4 bits   │  8 bits │ 12 bits  │  4 bits   │ 28 bits  │
└─────────┴────────────┴─────────┴──────────┴───────────┴──────────┘
```

### Hash Components

**Domain** (8 bits): Technology/domain area
- `0x01`: Rust
- `0x02`: WASM
- `0x03`: SvelteKit
- `0x04`: Security
- `0x05`: Frontend/React
- `0x06`: Backend
- `0x07`: Database
- `0x08`: Testing
- `0x09`: Performance
- `0x0A`: Architecture
- `0x0B`: Documentation
- `0x0C`: DevOps
- `0x0D`: TypeScript
- `0x0E`: Prisma
- `0x0F`: General (default)

**Action** (8 bits): Operation type
- `0x01`: Create
- `0x02`: Debug
- `0x03`: Optimize
- `0x04`: Refactor
- `0x05`: Migrate
- `0x06`: Review
- `0x07`: Analyze
- `0x08`: Test
- `0x09`: Document
- `0x0A`: Fix
- `0x0B`: Update
- `0x0C`: Implement

**Subtype** (12 bits): Specific task type
- `0x042`: Borrow checker
- `0x043`: Lifetime errors
- `0x015`: Leptos SSR
- `0x020`: Component
- `0x030`: API
- `0x040`: Schema
- ... and more

**Complexity** (4 bits): 0-15 complexity score
**Confidence** (4 bits): 0-15 routing confidence
**Reserved** (28 bits): Future use

## Route Table Configuration

Routes are pre-compiled in `.claude/config/route-table.json`:

```json
{
  "version": "1.0.0",
  "domains": {
    "rust": 1,
    "frontend": 5,
    "database": 7
  },
  "actions": {
    "create": 1,
    "debug": 2,
    "optimize": 3
  },
  "subtypes": {
    "borrow": 66,
    "component": 32,
    "schema": 64
  },
  "routes": {
    "0x0100000000000000": {
      "agent": "rust-project-architect",
      "tier": "opus"
    },
    "0x0202042000000000": {
      "agent": "rust-semantics-engineer",
      "tier": "opus",
      "comment": "Debug borrow checker errors"
    }
  },
  "default_route": {
    "agent": "full-stack-developer",
    "tier": "sonnet"
  }
}
```

## API Reference

### RouteTable Class

#### Constructor

```typescript
new RouteTable(routeTablePath?: string)
```

Creates a new RouteTable instance. If no path is provided, loads from default location.

#### route(request, context?)

```typescript
route(request: string, context?: Record<string, any>): AgentRoute
```

Routes a single request to the optimal agent.

**Returns**: `{ agent: string, tier: 'opus' | 'sonnet' | 'haiku' }`

#### batchRoute(requests, context?)

```typescript
batchRoute(requests: string[], context?: Record<string, any>): AgentRoute[]
```

Routes multiple requests efficiently.

#### generateSemanticHash(request, context?)

```typescript
generateSemanticHash(request: string, context?: Record<string, any>): SemanticHash
```

Generates semantic hash for a request (useful for debugging).

#### getStats()

```typescript
getStats(): RouteStats
```

Returns routing statistics:

```typescript
{
  lookups: number;           // Total lookups performed
  cacheHits: number;         // Cache hits
  cacheMisses: number;       // Cache misses
  fuzzyMatches: number;      // Fuzzy match fallbacks
  defaultFallbacks: number;  // Default route fallbacks
  avgLookupTimeMs: number;   // Average lookup time
  cacheHitRate: number;      // Cache hit rate (0-1)
  cacheSize: number;         // Current cache entries
  routeTableSize: number;    // Total routes loaded
}
```

#### clearCache()

```typescript
clearCache(): void
```

Clears the hot path cache.

#### exportCache() / importCache(data)

```typescript
exportCache(): Record<string, HotPathEntry>
importCache(data: Record<string, HotPathEntry>): void
```

Export and import cache state for persistence.

#### addRoute(hash, route)

```typescript
addRoute(hash: SemanticHash, route: AgentRoute): void
```

Manually add a route to the table.

#### getRoute(hash)

```typescript
getRoute(hash: SemanticHash): AgentRoute | undefined
```

Get route for a specific hash.

## Examples

### Basic Routing

```typescript
const router = new RouteTable();

// Rust development
router.route('Fix borrow checker error');
// → { agent: 'rust-semantics-engineer', tier: 'opus' }

// Frontend development
router.route('Create React component with TypeScript');
// → { agent: 'senior-frontend-engineer', tier: 'sonnet' }

// Database work
router.route('Create Prisma schema for authentication');
// → { agent: 'prisma-schema-architect', tier: 'sonnet' }

// Testing
router.route('Write unit tests for API endpoints');
// → { agent: 'vitest-testing-specialist', tier: 'sonnet' }
```

### Context-Aware Routing

```typescript
const context = {
  projectType: 'rust',
  fileType: 'rs',
  complexity: 'high'
};

const route = router.route('Implement feature', context);
```

### Batch Processing

```typescript
const tasks = [
  'Fix TypeScript types',
  'Optimize database queries',
  'Review security issues',
  'Update documentation'
];

const routes = router.batchRoute(tasks);
routes.forEach((route, i) => {
  console.log(`${tasks[i]} → ${route.agent} (${route.tier})`);
});
```

### Cache Management

```typescript
// Populate cache through normal usage
for (let i = 0; i < 100; i++) {
  router.route('Common task pattern');
}

// Export cache for persistence
const cacheState = router.exportCache();
fs.writeFileSync('cache.json', JSON.stringify(cacheState));

// Later: restore cache
const savedCache = JSON.parse(fs.readFileSync('cache.json', 'utf-8'));
router.importCache(savedCache);

// Monitor performance
const stats = router.getStats();
console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
console.log(`Avg lookup time: ${stats.avgLookupTimeMs.toFixed(3)}ms`);
```

### Custom Routes

```typescript
// Add a custom route
const customHash: SemanticHash = {
  domain: 0x10,      // Custom domain
  complexity: 8,
  action: 0x01,      // create
  subtype: 0x100,    // Custom subtype
  confidence: 15,
  reserved: 0
};

router.addRoute(customHash, {
  agent: 'custom-specialist',
  tier: 'opus'
});
```

## Routing Decision Flow

```
Request arrives
    │
    ▼
┌───────────────────┐
│ Normalize request │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Check hot cache   │──hit──▶ Return cached route (0ms)
└────────┬──────────┘
         │miss
         ▼
┌───────────────────┐
│ Generate semantic │
│ hash (<1ms)       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Lookup route      │──found──▶ Return route (0.1ms)
│ table (O(1))      │
└────────┬──────────┘
         │not found
         ▼
┌───────────────────┐
│ Fuzzy match       │──match──▶ Return best match (5ms)
│ (similarity)      │
└────────┬──────────┘
         │no match
         ▼
┌───────────────────┐
│ Return default    │
│ route             │
└───────────────────┘
```

## Performance Optimization Tips

1. **Warm up the cache** with common patterns before production use
2. **Persist cache** between sessions using `exportCache()`/`importCache()`
3. **Use batch routing** for parallel task processing
4. **Monitor stats** regularly to identify routing issues
5. **Normalize requests** before routing for better cache hits

## Fuzzy Matching

When an exact route isn't found, the router attempts fuzzy matching:

1. **Domain + Action match**: Ignores subtype and complexity
2. **Domain-only match**: Matches just the domain (e.g., all Rust tasks)
3. **Action-only match**: Matches the action type across domains

Similarity scores:
- Domain + Action: 0.8
- Domain only: 0.6
- Action only: 0.5

Minimum similarity threshold: 0.7

## Extending the Route Table

To add new routes, edit `.claude/config/route-table.json`:

```json
{
  "routes": {
    "0x1234567890ABCDEF": {
      "agent": "my-custom-agent",
      "tier": "sonnet",
      "confidence": 14,
      "avgLatency": 2000
    }
  }
}
```

Or compile routes programmatically:

```typescript
import { compileRouteTable } from '.claude/lib/routing/compiler';

const agentDefinitions = loadAgentYAMLs();
const routeTable = compileRouteTable(agentDefinitions);
fs.writeFileSync('route-table.json', JSON.stringify(routeTable, null, 2));
```

## Testing

Run the test suite:

```bash
npm test -- route-table.test.ts
```

Performance benchmarks:

```bash
npm run bench -- route-table
```

## Integration with Task Tool

```typescript
import { routeTable } from '.claude/lib/routing/route-table';

function Task(prompt: string, subagent_type?: string) {
  // Auto-route if no agent specified
  if (!subagent_type) {
    const route = routeTable.route(prompt);
    subagent_type = route.agent;
  }

  // Spawn agent with optimal tier
  return spawnAgent(subagent_type, prompt);
}
```

## Troubleshooting

### Low cache hit rate

- Check if requests are normalized consistently
- Verify common patterns are present in route table
- Increase cache size if needed (default: 1000)

### High default fallback rate

- Add more routes to route table for common domains
- Check semantic hash generation for accuracy
- Review domain/action/subtype mappings

### Slow lookups

- Verify route table is pre-compiled (not computed at runtime)
- Check cache is being used (should be >70% hit rate)
- Profile with `getStats()` to identify bottlenecks

## License

Internal use only - Claude Agent SDK

## Version

**Version**: 1.0.0
**Last Updated**: 2025-01-25
