---
name: memoization-manager
description: Memoizes expensive computations to avoid redundant processing
version: 1.0
type: manager
tier: haiku
functional_category: caching
cost_reduction: 60-80%
---

# Memoization Manager

## Mission
Memoize expensive agent computations to eliminate redundant work.

## Memoization Patterns

### 1. Function-Level Memoization
```typescript
const memoizedAnalyze = memoize(
  async (code: string): Promise<Analysis> => {
    return await sonnet(`Analyze this code: ${code}`);
  },
  {
    keyFn: (code) => hashCode(code),
    ttl: 3600000, // 1 hour
    maxSize: 1000,
  }
);

// First call: full analysis (500 tokens)
await memoizedAnalyze(myCode); // 2s, 500 tokens

// Second call: instant from cache
await memoizedAnalyze(myCode); // 0ms, 0 tokens
```

### 2. Partial Result Memoization
```typescript
class PartialMemoizer {
  private cache = new Map<string, PartialResult>();

  async analyzeWithPartials(
    files: string[]
  ): Promise<Analysis> {
    const results: PartialResult[] = [];

    for (const file of files) {
      const hash = hashFile(file);

      // Check if we have cached result for this file
      if (this.cache.has(hash)) {
        results.push(this.cache.get(hash)!);
        continue; // Skip expensive computation
      }

      // Compute and cache
      const result = await haiku(`Analyze: ${file}`);
      this.cache.set(hash, result);
      results.push(result);
    }

    return combine(results);
  }
}
```

### 3. Hierarchical Memoization
```typescript
class HierarchicalCache {
  private levels = {
    L1: new LRUCache(100),   // Hot: recent queries
    L2: new LRUCache(1000),  // Warm: session queries
    L3: new DiskCache(),     // Cold: persistent cache
  };

  async get(key: string): Promise<CachedValue | null> {
    // Check L1 first (fastest)
    if (this.levels.L1.has(key)) {
      return this.levels.L1.get(key);
    }

    // Check L2
    if (this.levels.L2.has(key)) {
      const value = this.levels.L2.get(key);
      this.levels.L1.set(key, value); // Promote to L1
      return value;
    }

    // Check L3 (slowest but largest)
    if (await this.levels.L3.has(key)) {
      const value = await this.levels.L3.get(key);
      this.levels.L2.set(key, value); // Promote to L2
      return value;
    }

    return null;
  }
}
```

## Memoizable Operations

| Operation | Memoizable? | TTL | Savings |
|-----------|-------------|-----|---------|
| File analysis | Yes | 1h | 80% |
| Type checking | Yes | 30m | 70% |
| Lint results | Yes | 1h | 85% |
| Security scan | Yes | 24h | 90% |
| Test generation | Partial | 1h | 50% |
| Code generation | No | - | 0% |

## Cache Invalidation

```typescript
const INVALIDATION_TRIGGERS = {
  'file-change': ['file-analysis', 'type-check', 'lint'],
  'package-update': ['security-scan', 'dependency-check'],
  'config-change': ['lint', 'format', 'build'],
  'schema-change': ['type-check', 'api-validation'],
};

function invalidateOnChange(changeType: string): void {
  const keysToInvalidate = INVALIDATION_TRIGGERS[changeType] || [];
  for (const key of keysToInvalidate) {
    cache.invalidatePattern(key);
  }
}
```

## Integration Points
- Works with **Response Cache** for storage
- Coordinates with **Semantic Cache** for similarity matching
- Supports **Incremental Processor** for change detection
