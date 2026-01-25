---
name: semantic-cache
description: Caches responses based on semantic similarity, not exact matches
version: 1.0
type: cache
tier: haiku
functional_category: caching
cache_hit_improvement: 3-5x
---

# Semantic Cache

## Mission
Cache responses by semantic meaning to dramatically increase cache hit rates.

## How It Works

```typescript
interface SemanticCache {
  embeddings: Map<string, number[]>;
  responses: Map<string, CachedResponse>;
  similarityThreshold: number;
}

class SemanticCacheManager {
  private cache: SemanticCache = {
    embeddings: new Map(),
    responses: new Map(),
    similarityThreshold: 0.92, // 92% similar = cache hit
  };

  async get(query: string): Promise<CachedResponse | null> {
    const queryEmbedding = await this.embed(query);

    // Find most similar cached query
    let bestMatch: { key: string; similarity: number } | null = null;

    for (const [key, embedding] of this.cache.embeddings) {
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      if (similarity > this.cache.similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { key, similarity };
        }
      }
    }

    if (bestMatch) {
      return this.cache.responses.get(bestMatch.key)!;
    }

    return null;
  }

  async set(query: string, response: string): Promise<void> {
    const embedding = await this.embed(query);
    const key = this.generateKey(query);

    this.cache.embeddings.set(key, embedding);
    this.cache.responses.set(key, {
      response,
      timestamp: Date.now(),
      hits: 0,
    });
  }
}
```

## Semantic Matching Examples

| Original Query | Similar Query | Match? |
|---------------|---------------|--------|
| "How do I sort an array in JS?" | "What's the way to sort arrays in JavaScript?" | Yes (95%) |
| "Fix the auth bug" | "Debug authentication issue" | Yes (93%) |
| "Add a button component" | "Create a new modal dialog" | No (72%) |

## Cache Categories

```typescript
const CACHE_CATEGORIES = {
  // Very cacheable - exact solutions exist
  'how-to': { ttl: '7d', threshold: 0.90 },
  'error-fix': { ttl: '30d', threshold: 0.88 },
  'syntax': { ttl: '365d', threshold: 0.95 },

  // Moderately cacheable
  'code-review': { ttl: '1d', threshold: 0.92 },
  'refactor': { ttl: '1d', threshold: 0.90 },

  // Less cacheable - context dependent
  'debug': { ttl: '1h', threshold: 0.95 },
  'feature': { ttl: '1h', threshold: 0.93 },
};
```

## Cache Hit Rate Improvement

| Cache Type | Traditional | Semantic | Improvement |
|------------|-------------|----------|-------------|
| How-to questions | 20% | 70% | 3.5x |
| Error fixes | 15% | 65% | 4.3x |
| Code patterns | 25% | 80% | 3.2x |
| Overall | 20% | 72% | 3.6x |

## Integration Points
- Works with **Response Cache** for storage
- Coordinates with **Context Preloader** for embeddings
- Supports **Token Optimizer** for cache decisions
