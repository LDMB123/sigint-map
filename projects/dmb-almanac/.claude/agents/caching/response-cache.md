---
name: response-cache
description: Caches responses to avoid redundant API calls for identical or similar requests
version: 1.0
type: cache
tier: haiku
functional_category: efficiency
cost_reduction: 90%+
---

# Response Cache

## Mission
Eliminate redundant API calls through intelligent caching of responses.

## Cache Strategies

### 1. Exact Match Cache
```typescript
const cache = new Map<string, CachedResponse>();

function getCacheKey(prompt: string, model: string): string {
  return crypto.createHash('sha256')
    .update(`${model}:${prompt}`)
    .digest('hex');
}

async function cachedComplete(prompt: string, model: string): Promise<string> {
  const key = getCacheKey(prompt, model);

  // Check cache
  const cached = cache.get(key);
  if (cached && !isExpired(cached)) {
    return cached.response; // FREE!
  }

  // Call API
  const response = await complete(prompt, model);

  // Cache response
  cache.set(key, {
    response,
    timestamp: Date.now(),
    ttl: 3600000, // 1 hour
  });

  return response;
}
```

### 2. Semantic Cache (Similar Prompts)
```typescript
// Use embedding similarity for cache hits
async function semanticCache(prompt: string): Promise<string | null> {
  const embedding = await getEmbedding(prompt);

  // Find similar cached prompts
  for (const [cachedPrompt, cached] of cache) {
    const similarity = cosineSimilarity(embedding, cached.embedding);
    if (similarity > 0.95) {
      // Close enough - return cached response
      return cached.response;
    }
  }

  return null; // Cache miss
}
```

### 3. Partial Cache (Reuse Components)
```typescript
// Cache common components separately
const componentCache = {
  projectContext: null,
  fileStructure: null,
  codeStyle: null,
};

async function buildPromptWithCache(task: string): Promise<string> {
  // Reuse cached components
  const context = componentCache.projectContext ??
    await cacheProjectContext();

  const structure = componentCache.fileStructure ??
    await cacheFileStructure();

  // Only the task is new
  return `Context: ${context}\nStructure: ${structure}\nTask: ${task}`;
}
```

## Cache Hit Scenarios

| Scenario | Without Cache | With Cache | Savings |
|----------|---------------|------------|---------|
| Same file review | API call | Instant | 100% |
| Similar code check | API call | Instant | 100% |
| Repeated validation | API call | Instant | 100% |
| Context rebuild | 2000 tokens | 0 tokens | 100% |

## Cache Invalidation

```typescript
interface CachePolicy {
  // Time-based
  ttl: number; // milliseconds

  // Content-based
  invalidateOn: string[]; // file patterns that invalidate

  // Event-based
  invalidateEvents: ('file-change' | 'git-commit' | 'manual')[];
}

function shouldInvalidate(
  cached: CachedResponse,
  policy: CachePolicy
): boolean {
  // Check TTL
  if (Date.now() - cached.timestamp > policy.ttl) {
    return true;
  }

  // Check file changes
  for (const pattern of policy.invalidateOn) {
    if (hasFileChanged(pattern, cached.timestamp)) {
      return true;
    }
  }

  return false;
}
```

## Implementation

```typescript
class ResponseCache {
  private cache = new Map<string, CachedResponse>();
  private embeddings = new Map<string, number[]>();

  async get(prompt: string, options: CacheOptions = {}): Promise<string | null> {
    const { exactMatch = true, semantic = false, similarity = 0.95 } = options;

    // Try exact match first (free)
    if (exactMatch) {
      const key = this.getKey(prompt);
      const cached = this.cache.get(key);
      if (cached && !this.isExpired(cached)) {
        return cached.response;
      }
    }

    // Try semantic match (cheap embedding lookup)
    if (semantic) {
      const similar = await this.findSimilar(prompt, similarity);
      if (similar) {
        return similar.response;
      }
    }

    return null; // Cache miss
  }

  async set(prompt: string, response: string, options: CacheOptions = {}): Promise<void> {
    const key = this.getKey(prompt);

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl: options.ttl || 3600000,
    });

    // Also store embedding for semantic search
    if (options.semantic) {
      const embedding = await this.getEmbedding(prompt);
      this.embeddings.set(key, embedding);
    }
  }
}
```

## Integration Points
- Works with **Token Optimizer** for cost reduction
- Coordinates with **File Watcher** for invalidation
- Supports **Session Manager** for persistence
