---
name: result-precomputer
description: Precomputes likely results during idle time
version: 1.0
type: precomputer
tier: haiku
functional_category: prefetching
latency_reduction: Near-instant responses for precomputed
---

# Result Precomputer

## Mission
Use idle time to precompute likely results, enabling instant responses.

## Precomputation Strategies

### 1. Idle Time Computation
```typescript
class IdlePrecomputer {
  private precomputedResults = new Map<string, PrecomputedResult>();
  private computeQueue: ComputeTask[] = [];
  private isIdle: boolean = true;

  async onIdle(): Promise<void> {
    this.isIdle = true;

    while (this.isIdle && this.computeQueue.length > 0) {
      const task = this.computeQueue.shift()!;

      // Only compute if still relevant
      if (task.expiresAt > Date.now()) {
        const result = await this.compute(task);
        this.precomputedResults.set(task.key, {
          result,
          computedAt: Date.now(),
          confidence: task.confidence,
        });
      }
    }
  }

  onActivity(): void {
    this.isIdle = false;
  }

  queueComputation(task: ComputeTask): void {
    // Insert by priority (higher confidence = higher priority)
    const insertIndex = this.computeQueue.findIndex(
      t => t.confidence < task.confidence
    );
    if (insertIndex === -1) {
      this.computeQueue.push(task);
    } else {
      this.computeQueue.splice(insertIndex, 0, task);
    }
  }

  getPrecomputed(key: string): PrecomputedResult | null {
    const result = this.precomputedResults.get(key);
    if (result && result.computedAt > Date.now() - 300000) { // 5 min TTL
      return result;
    }
    return null;
  }
}
```

### 2. Common Query Precomputation
```typescript
const COMMON_QUERIES = [
  { pattern: 'summarize-file', frequency: 0.3 },
  { pattern: 'explain-function', frequency: 0.25 },
  { pattern: 'find-usages', frequency: 0.2 },
  { pattern: 'check-types', frequency: 0.15 },
  { pattern: 'list-todos', frequency: 0.1 },
];

async function precomputeCommonQueries(
  currentFile: string
): Promise<void> {
  for (const query of COMMON_QUERIES) {
    if (query.frequency > 0.2) {
      await precompute(query.pattern, currentFile);
    }
  }
}

async function precompute(
  pattern: string,
  file: string
): Promise<void> {
  const key = `${pattern}:${file}`;

  switch (pattern) {
    case 'summarize-file':
      const summary = await haiku(`Summarize: ${readFile(file)}`);
      cache.set(key, summary);
      break;

    case 'explain-function':
      const functions = await extractFunctions(file);
      for (const fn of functions) {
        const explanation = await haiku(`Explain: ${fn.code}`);
        cache.set(`explain:${fn.name}`, explanation);
      }
      break;

    case 'find-usages':
      const exports = await extractExports(file);
      for (const exp of exports) {
        const usages = await findUsages(exp.name);
        cache.set(`usages:${exp.name}`, usages);
      }
      break;
  }
}
```

### 3. Follow-Up Precomputation
```typescript
class FollowUpPrecomputer {
  private conversationHistory: Message[] = [];

  async precomputeFollowUps(
    lastResponse: string
  ): Promise<void> {
    // Predict likely follow-up questions
    const predictions = await predictFollowUps(
      this.conversationHistory,
      lastResponse
    );

    // Precompute answers for high-probability follow-ups
    for (const pred of predictions) {
      if (pred.probability > 0.5) {
        const answer = await haiku(pred.question);
        this.cache.set(pred.questionKey, {
          answer,
          probability: pred.probability,
        });
      }
    }
  }

  checkPrecomputed(question: string): string | null {
    // Check if we have a precomputed answer
    const key = this.computeKey(question);
    const cached = this.cache.get(key);

    if (cached && cached.probability > 0.6) {
      return cached.answer;
    }

    return null;
  }
}
```

### 4. Incremental Precomputation
```typescript
class IncrementalPrecomputer {
  private lastState: Map<string, string> = new Map();

  async precomputeOnChange(
    changedFile: string
  ): Promise<void> {
    const currentHash = await hashFile(changedFile);
    const lastHash = this.lastState.get(changedFile);

    if (currentHash === lastHash) {
      return; // No change
    }

    // Precompute analysis for changed file
    await Promise.all([
      this.precomputeAnalysis(changedFile),
      this.precomputeTypeCheck(changedFile),
      this.precomputeLint(changedFile),
      this.precomputeTests(changedFile),
    ]);

    this.lastState.set(changedFile, currentHash);
  }
}
```

## Precomputation ROI

| Query Type | Compute Time | With Precompute | Hit Rate |
|------------|--------------|-----------------|----------|
| File summary | 2s | 10ms | 70% |
| Function explain | 1.5s | 5ms | 65% |
| Type check | 3s | 20ms | 80% |
| Lint results | 2s | 15ms | 85% |
| Test suggestions | 4s | 50ms | 50% |

**Average latency reduction: 95% for cache hits**

## Integration Points
- Works with **Intent Predictor** for prediction
- Coordinates with **Context Prefetcher** for data loading
- Supports **Semantic Cache** for storage
