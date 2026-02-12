# Hot Cache - LRU Cache for Routing

**Original**: 982 lines, 25KB (~6.3K tokens)
**Compressed**: ~160 lines, 3.8KB (~0.95K tokens)
**Ratio**: 85% reduction
**Date**: 2026-02-02

---

## Overview

Production-grade LRU cache for routing: **>70% hit rate** with **<0.01ms** operations.

## Architecture

O(1) HashMap + Doubly-Linked List (LRU order):
- Lookup: O(1)
- Insert/Update: O(1) + eviction if full
- TTL support: Auto-cleanup
- Key normalization: Better hit rates

## Core Features

### 1. LRU Eviction
- Automatic eviction when capacity reached
- Most recently used entries kept longest

### 2. Key Normalization
```
"Fix Borrow Checker Error!" = "fix borrow checker error" = "FIX BORROW CHECKER ERROR"
```
- Lowercase, normalize whitespace, remove punctuation
- Truncate to 500 chars

### 3. Hit Rate Tracking
```
stats = cache.getStats()
→ { hits, misses, hitRate, size, capacity, evictions, memoryUsage }
```

### 4. Semantic Hash Integration
```typescript
cache.setWithHash('Fix Rust borrow', route, {
  metadata: { domain: 'RUST', action: 'DEBUG' }
});
```

### 5. TTL Support
```typescript
cache.set('session-token', token, { ttl: 3600000 });  // 1 hour
const sessionCache = new HotCache({
  defaultTtl: 1800000,
  autoCleanup: true,
  cleanupInterval: 60000
});
```

## API

### Constructor
```typescript
new HotCache<T>(options?: {
  capacity?: 1000,
  defaultTtl?: 0,
  autoCleanup?: true,
  cleanupInterval?: 60000,
  normalizeKey?: (key: string) => string
})
```

### Core Methods
- `get(key)` - Get value (updates LRU)
- `set(key, value, options)` - Set with optional TTL/metadata
- `setWithHash(key, value, options)` - Auto-generate hash
- `peek(key)` - Get without LRU update
- `has(key)` - Check existence
- `remove(key)` - Delete entry
- `entries()` - All entries in LRU order
- `find(predicate)` - Find entries matching condition

### Monitoring
- `getStats()` - Cache statistics
- `resetStats()` - Reset metrics
- `cleanup()` - Remove expired entries (returns count)
- `clear()` - Clear all entries
- `destroy()` - Cleanup resources

### Persistence
- `export()` - Serialize for storage
- `import(data)` - Load from serialization

## Factory Functions

```typescript
createRoutingCache<T>(capacity?)           // No TTL, no cleanup
createSessionCache<T>(capacity?, ttlMs?)   // With TTL & cleanup
```

## Performance

| Operation | Time | Target |
|-----------|------|--------|
| Get | ~0.005ms | <0.01ms ✓ |
| Set | ~0.008ms | <0.01ms ✓ |
| Hit rate | 75-85% | >70% ✓ |
| Memory per entry | ~200 bytes | <256 bytes ✓ |

## Integration

### With RouteTable
```typescript
private hotCache = new HotCache<AgentRoute>({ capacity: 1000 });

route(request) {
  const cached = this.hotCache.get(request);
  if (cached) return cached;
  
  const route = super.route(request);
  this.hotCache.setWithHash(request, route);
  return route;
}
```

### Multi-Tier Caching
```typescript
const l1 = createSessionCache(100, 300000);   // 5 min
const l2 = createRoutingCache(1000);          // No TTL

route(request) {
  let r = l1.get(request);
  if (r) return r;
  
  r = l2.get(request);
  if (r) { l1.setWithHash(request, r); return r; }
  
  r = performRouting(request);
  l1.setWithHash(request, r);
  l2.setWithHash(request, r);
  return r;
}
```

## Best Practices

1. **Capacity**: 1000 optimal for routing
2. **Batch**: Use `find()` instead of multiple `get()`
3. **Monitor**: Check hit rate regularly
4. **Normalization**: Balance generalization vs precision
5. **TTL**: Match data lifetime expectations
6. **Cleanup**: Call `destroy()` on shutdown

## Troubleshooting

**Low hit rate (<50%)**
- Check key normalization is working
- Increase capacity
- Analyze request patterns

**High memory usage**
- Reduce capacity
- Use TTL to expire stale entries
- Truncate keys in normalization

**High eviction rate**
- Increase capacity
- Use TTL for auto-expiration

## Testing

```bash
cd .claude/lib/routing
npx vitest run hot-cache.test.ts
```

Coverage: Basic ops, LRU policy, normalization, TTL, persistence, semantics, edge cases.

---

## Changelog

**v1.0.0** (2026-01-25)
- LRU eviction, O(1) operations
- Key normalization
- Hit tracking
- TTL + auto-cleanup
- Semantic hash integration
- Factory functions
- 50 tests

---

See Also: `route-table.ts`, `semantic-hash.ts`, `IMPLEMENTATION_SUMMARY.md`
