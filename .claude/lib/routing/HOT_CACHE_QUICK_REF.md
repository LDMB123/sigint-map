# Hot Cache Quick Reference

## 30-Second Guide

```typescript
import { createRoutingCache } from './hot-cache.js';

// Create
const cache = createRoutingCache(1000);

// Use
cache.setWithHash('request', value);
const result = cache.get('request'); // Returns value or null

// Monitor
console.log(`Hit rate: ${(cache.hitRate * 100).toFixed(2)}%`);

// Persist
fs.writeFileSync('cache.json', JSON.stringify(cache.export()));
```

## Common Operations

### Create Cache

```typescript
// Routing cache (no TTL)
const cache = createRoutingCache(1000);

// Session cache (with TTL)
const sessionCache = createSessionCache(100, 3600000); // 1 hour

// Custom configuration
const cache = new HotCache({
  capacity: 1000,
  defaultTtl: 0,
  autoCleanup: false
});
```

### Get/Set

```typescript
// Set with auto-hash
cache.setWithHash('Fix Rust error', route);

// Set with options
cache.set('request', route, {
  ttl: 3600000,
  semanticHash: 0x123n,
  metadata: { agent: 'rust-expert' }
});

// Get (updates LRU)
const route = cache.get('request');

// Peek (no LRU update)
const entry = cache.peek('request');
```

### Check & Remove

```typescript
// Check existence
if (cache.has('request')) { /* ... */ }

// Remove
cache.remove('request');

// Clear all
cache.clear();
```

### Statistics

```typescript
const stats = cache.getStats();
// {
//   hitRate: 0.75,      // 75%
//   size: 500,          // Current size
//   capacity: 1000,     // Max size
//   hits: 750,
//   misses: 250,
//   evictions: 50,
//   memoryUsage: 102400 // bytes
// }
```

### Persistence

```typescript
// Export
const data = cache.export();
fs.writeFileSync('cache.json', JSON.stringify(data));

// Import
const data = JSON.parse(fs.readFileSync('cache.json', 'utf-8'));
cache.import(data);
```

### Cleanup

```typescript
// Manual cleanup (returns count removed)
const removed = cache.cleanup();

// Destroy (stops timers, clears memory)
cache.destroy();
```

## Integration Patterns

### With RouteTable

```typescript
class EnhancedRouteTable extends RouteTable {
  private hotCache = createRoutingCache(1000);

  override route(request: string): AgentRoute {
    const cached = this.hotCache.get(request);
    if (cached) return cached;

    const route = super.route(request);
    this.hotCache.setWithHash(request, route);
    return route;
  }
}
```

### Monitoring

```typescript
setInterval(() => {
  const stats = cache.getStats();
  if (stats.hitRate < 0.6) {
    console.warn('Low hit rate:', stats);
  }
}, 60000);
```

### Persistence on Exit

```typescript
process.on('SIGTERM', () => {
  const data = cache.export();
  fs.writeFileSync('.cache/hot-cache.json', JSON.stringify(data));
  cache.destroy();
  process.exit(0);
});
```

## Properties

```typescript
cache.size          // Current size
cache.maxSize       // Capacity
cache.isEmpty       // Is empty?
cache.isFull        // Is full?
cache.hitRate       // Hit rate (0-1)
```

## Key Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `get(key)` | Get value (updates LRU) | `T \| null` |
| `set(key, value, options?)` | Set value | `void` |
| `setWithHash(key, value, options?)` | Set with auto-hash | `void` |
| `peek(key)` | Get without LRU update | `CacheEntry<T> \| null` |
| `has(key)` | Check existence | `boolean` |
| `remove(key)` | Remove entry | `boolean` |
| `clear()` | Clear all entries | `void` |
| `cleanup()` | Remove expired entries | `number` |
| `getStats()` | Get statistics | `CacheStats` |
| `export()` | Export for persistence | `SerializedCache<T>` |
| `import(data)` | Import from persistence | `void` |
| `destroy()` | Cleanup resources | `void` |

## Performance

| Metric | Performance |
|--------|-------------|
| Get operation | <0.01ms (avg 0.005ms) |
| Set operation | <0.01ms (avg 0.008ms) |
| Hit rate | >70% (typically 75-85%) |
| Memory per entry | ~200 bytes |

## Tips

### Improve Hit Rate

```typescript
// 1. Increase capacity
const cache = createRoutingCache(2000);

// 2. Use custom normalization
const cache = new HotCache({
  normalizeKey: (key) => key.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
});

// 3. Monitor and adjust
const stats = cache.getStats();
if (stats.hitRate < 0.6) {
  // Increase capacity or improve normalization
}
```

### Debug Low Hit Rate

```typescript
// Find low-hit entries
const lowHit = cache.find(e => e.hits < 2);
console.log(`${lowHit.length} entries with <2 hits`);

// Check top patterns
const top = cache.entries()
  .sort((a, b) => b.hits - a.hits)
  .slice(0, 10);
console.log('Top patterns:', top);
```

### Optimize Memory

```typescript
// 1. Reduce capacity
const cache = createRoutingCache(500);

// 2. Use TTL to expire old entries
const cache = createSessionCache(1000, 3600000);

// 3. Monitor memory
const stats = cache.getStats();
console.log(`Memory: ${(stats.memoryUsage / 1024).toFixed(2)} KB`);
```

## Common Patterns

### Multi-Tier Caching

```typescript
const l1 = createSessionCache(100, 300000);   // 5 min hot cache
const l2 = createRoutingCache(1000);           // Persistent cache

function route(request: string) {
  return l1.get(request)
    || l2.get(request)
    || performRouting(request);
}
```

### Feedback Loop

```typescript
async function routeWithFeedback(request: string) {
  const route = cache.get(request) ?? performRouting(request);

  try {
    const result = await executeRoute(route);
    cache.set(request, route, {
      metadata: { success: true, latency: result.latency }
    });
  } catch (error) {
    cache.remove(request); // Evict failed routes
  }
}
```

### Batch Operations

```typescript
// Get multiple (use peek to avoid LRU thrashing)
const results = requests.map(req => ({
  request: req,
  cached: cache.peek(req)
}));

// Filter and process
results
  .filter(r => !r.cached)
  .forEach(r => {
    const route = performRouting(r.request);
    cache.setWithHash(r.request, route);
  });
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Low hit rate (<50%) | Increase capacity, improve normalization |
| High eviction rate | Increase capacity, add TTL |
| Memory usage too high | Reduce capacity, add TTL, truncate keys |
| Slow operations | Check cache size (<10k), verify O(1) |

## Files

- Implementation: `.claude/lib/routing/hot-cache.ts`
- Tests: `.claude/lib/routing/hot-cache.test.ts`
- Examples: `.claude/lib/routing/hot-cache-integration-example.ts`
- Full docs: `.claude/lib/routing/HOT_CACHE.md`

## Run Tests

```bash
cd .claude/lib/routing
npx vitest run hot-cache.test.ts
```

## Further Reading

- [Full Documentation](./HOT_CACHE.md)
- [Implementation Summary](./hot-cache-implementation-summary.md)
- [Integration Examples](./hot-cache-integration-example.ts)
