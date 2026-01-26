---
name: quick
version: 1.0.0
description: import {
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: chromium-143
complexity: intermediate
tags:
  - chromium-143
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: .claude/lib/cache/QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# Semantic Encoder Quick Reference

## Import

```typescript
import {
  extractSemanticKey,
  hashSemanticKey,
  calculateSimilarity,
  findSimilar,
  type SemanticKey,
} from './.claude/lib/cache/semantic-encoder';
```

## Basic Usage

```typescript
// Extract semantic key from request
const request = 'Fix borrow error in src/lib.rs';
const semanticKey = extractSemanticKey(request);

// Generate cache key
const cacheKey = hashSemanticKey(semanticKey);

// Check cache
const cached = cache.get(cacheKey);
```

## SemanticKey Structure

```typescript
interface SemanticKey {
  intent: string;        // "borrow-fix", "component-create", etc.
  target: string;        // "src/lib.rs", "UserService", etc.
  context: string[];     // ["rust", "memory-management"]
  params: any;           // { flags: { tests: true } }
}
```

## Common Intent Patterns

| User Says | Intent | Category |
|-----------|--------|----------|
| "Fix error", "Debug issue", "Resolve bug" | `error-fix` | debug |
| "Fix borrow error", "Resolve borrowing" | `borrow-fix` | debug |
| "Create component", "Add widget", "Generate module" | `component-create` | create |
| "Create tests", "Add unit tests", "Write spec" | `test-create` | create |
| "Optimize performance", "Improve speed" | `performance-optimize` | optimize |
| "Refactor code", "Simplify", "Clean up" | `refactor` | refactor |
| "Explain", "Describe", "What does" | `explain` | analyze |
| "Update", "Modify", "Change" | `update` | modify |

## Similarity Thresholds

| Score | Meaning | Action |
|-------|---------|--------|
| 1.00 | Exact match | Cache hit |
| 0.90+ | Very high similarity | Cache hit |
| 0.85+ | High similarity | Cache hit (default threshold) |
| 0.70-0.85 | Moderate similarity | Consider adaptation |
| 0.50-0.70 | Low similarity | Cache miss |
| < 0.50 | Very low similarity | Cache miss |

## Similarity Weights

| Component | Weight | Impact |
|-----------|--------|--------|
| Intent | 50% | Most important |
| Target | 30% | Very important |
| Context | 20% | Additional signal |

## Examples

### Example 1: Exact Match

```typescript
const r1 = 'Fix borrow error in src/lib.rs';
const r2 = 'Resolve borrow checker issue in src/lib.rs';

const k1 = extractSemanticKey(r1);
const k2 = extractSemanticKey(r2);

hashSemanticKey(k1) === hashSemanticKey(k2); // true - same hash!
```

### Example 2: Similar Match

```typescript
const r1 = 'Fix borrow error in src/lib.rs';
const r2 = 'Fix borrow error in lib.rs'; // Same basename

const k1 = extractSemanticKey(r1);
const k2 = extractSemanticKey(r2);

calculateSimilarity(k1, k2); // 0.94 - high similarity
```

### Example 3: Finding Similar

```typescript
const targetKey = extractSemanticKey('Fix borrow error in src/lib.rs');
const cachedKeys = [/* array of cached semantic keys */];

const similar = findSimilar(targetKey, cachedKeys, 0.85);
// Returns matches with score >= 0.85, sorted by score
```

## Common Patterns

### Pattern 1: Cache Lookup

```typescript
function getCached(request: string) {
  const key = extractSemanticKey(request);
  const hash = hashSemanticKey(key);
  return cache.get(hash);
}
```

### Pattern 2: Cache with Fallback

```typescript
async function executeWithCache(request: string) {
  // Try exact match
  const key = extractSemanticKey(request);
  const hash = hashSemanticKey(key);
  const exact = cache.get(hash);
  if (exact) return exact;

  // Try similar match
  const similar = findSimilar(key, getAllCachedKeys(), 0.85);
  if (similar.length > 0) {
    return cache.get(hashSemanticKey(similar[0].key));
  }

  // Execute and cache
  const result = await execute(request);
  cache.set(hash, result);
  return result;
}
```

### Pattern 3: Batch Similarity Check

```typescript
function findBestCachedMatch(request: string) {
  const targetKey = extractSemanticKey(request);
  const cachedKeys = getAllCachedKeys();

  const matches = findSimilar(targetKey, cachedKeys, 0.85);

  if (matches.length === 0) return null;

  // Return best match
  return {
    key: matches[0].key,
    score: matches[0].score,
    cached: cache.get(hashSemanticKey(matches[0].key))
  };
}
```

## Debugging

### View Semantic Key

```typescript
import { semanticKeyToString } from './semantic-encoder';

const key = extractSemanticKey(request);
console.log(semanticKeyToString(key));
// "Intent: borrow-fix | Target: src/lib.rs | Context: [rust, memory-management]"
```

### Compare Two Requests

```typescript
const k1 = extractSemanticKey(request1);
const k2 = extractSemanticKey(request2);

console.log('Request 1:', semanticKeyToString(k1));
console.log('Request 2:', semanticKeyToString(k2));
console.log('Similarity:', calculateSimilarity(k1, k2));
console.log('Same hash?', hashSemanticKey(k1) === hashSemanticKey(k2));
```

## Testing

```bash
# Run all tests
npx vitest run .claude/lib/cache/semantic-encoder.test.ts

# Run with coverage
npx vitest run .claude/lib/cache/semantic-encoder.test.ts --coverage

# Run in watch mode
npx vitest watch .claude/lib/cache/semantic-encoder.test.ts
```

## Performance Tips

1. **Cache the extracted keys**: Don't re-extract for the same request
2. **Use exact matching first**: Always try hash-based lookup before similarity
3. **Limit candidate set**: Don't compare against all cached keys (use indexing)
4. **Set appropriate threshold**: 0.85 is good default, adjust based on your needs
5. **Monitor hit rates**: Track actual performance and adjust patterns

## Common Pitfalls

1. ❌ Extracting semantic key multiple times for same request
   ✅ Extract once and reuse

2. ❌ Using similarity matching for every request
   ✅ Use exact match first, similarity as fallback

3. ❌ Setting threshold too low (< 0.80)
   ✅ Use 0.85+ to avoid false positives

4. ❌ Not normalizing before comparison
   ✅ Use normalizeSemanticKey() when comparing manually

5. ❌ Ignoring context for better matching
   ✅ Include relevant context tags for more accurate keys

## Need Help?

- **API Docs**: See `README.md`
- **Examples**: See `semantic-encoder.example.ts`
- **Integration**: See `integration.example.ts`
- **Tests**: See `semantic-encoder.test.ts`
- **Summary**: See `IMPLEMENTATION_SUMMARY.md`
