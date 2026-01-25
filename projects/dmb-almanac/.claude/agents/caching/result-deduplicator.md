---
name: result-deduplicator
description: Detects and eliminates duplicate work across requests
version: 1.0
type: deduplicator
tier: haiku
functional_category: caching
cost_reduction: 40-60%
---

# Result Deduplicator

## Mission
Identify and eliminate duplicate or overlapping work to reduce wasted tokens.

## Deduplication Strategies

### 1. Request Deduplication
```typescript
class RequestDeduplicator {
  private inFlight = new Map<string, Promise<any>>();

  async dedupe<T>(
    key: string,
    compute: () => Promise<T>
  ): Promise<T> {
    // If same request is in flight, return existing promise
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }

    // Start new request
    const promise = compute().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}

// Example: Multiple components request same analysis
const deduper = new RequestDeduplicator();

// These 3 calls only trigger 1 actual analysis
await Promise.all([
  deduper.dedupe('analyze-auth', () => analyzeAuth()),
  deduper.dedupe('analyze-auth', () => analyzeAuth()),
  deduper.dedupe('analyze-auth', () => analyzeAuth()),
]);
```

### 2. Overlap Detection
```typescript
function detectOverlap(
  newRequest: Request,
  cachedRequests: Request[]
): OverlapResult {
  for (const cached of cachedRequests) {
    const overlap = calculateOverlap(newRequest, cached);

    if (overlap.percentage > 0.8) {
      // 80%+ overlap - use cached + small delta
      return {
        type: 'high-overlap',
        cached: cached,
        delta: extractDelta(newRequest, cached),
      };
    }

    if (overlap.percentage > 0.5) {
      // 50%+ overlap - partial reuse
      return {
        type: 'partial-overlap',
        reusable: overlap.common,
        needed: overlap.unique,
      };
    }
  }

  return { type: 'no-overlap' };
}
```

### 3. Subsumption Detection
```typescript
// Detect when one request subsumes another
function checkSubsumption(
  requests: Request[]
): SubsumptionResult {
  const sorted = requests.sort((a, b) => b.scope - a.scope);

  const results: SubsumptionResult[] = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (subsumes(sorted[i], sorted[j])) {
        // Larger request includes smaller one
        results.push({
          parent: sorted[i],
          child: sorted[j],
          action: 'skip-child',
        });
      }
    }
  }

  return results;
}

// Example:
// Request A: "Analyze entire auth module"
// Request B: "Analyze login function in auth"
// B is subsumed by A - skip B, extract from A's result
```

## Deduplication Metrics

| Scenario | Without Dedup | With Dedup | Savings |
|----------|---------------|------------|---------|
| 5 concurrent same requests | 5000 tokens | 1000 tokens | 80% |
| 3 overlapping analyses | 3000 tokens | 1500 tokens | 50% |
| Subsumption (large + small) | 2000 tokens | 1200 tokens | 40% |

## Common Duplicate Patterns

```typescript
const DUPLICATE_PATTERNS = [
  {
    pattern: 'same-file-multiple-times',
    detection: 'file-path-hash',
    action: 'cache-and-reuse',
  },
  {
    pattern: 'overlapping-code-review',
    detection: 'line-range-overlap',
    action: 'merge-requests',
  },
  {
    pattern: 'redundant-type-check',
    detection: 'import-graph',
    action: 'batch-check',
  },
];
```

## Integration Points
- Works with **Request Batcher** for combining requests
- Coordinates with **Semantic Cache** for similarity detection
- Supports **Memoization Manager** for caching results
