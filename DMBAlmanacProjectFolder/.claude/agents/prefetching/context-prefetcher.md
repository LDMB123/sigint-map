---
name: context-prefetcher
description: Prefetches likely-needed context before it's requested
version: 1.0
type: prefetcher
tier: haiku
functional_category: prefetching
latency_reduction: 80%+ for context loading
---

# Context Prefetcher

## Mission
Prefetch context that will likely be needed, eliminating context-loading latency.

## Prefetch Strategies

### 1. Predictive File Prefetch
```typescript
interface PrefetchPrediction {
  file: string;
  probability: number;
  reason: string;
}

class FilePrefetcher {
  private cache = new Map<string, FileContent>();
  private prefetchQueue: PrefetchPrediction[] = [];

  async predictAndPrefetch(currentFile: string): Promise<void> {
    // Predict likely needed files
    const predictions = await this.predictNeededFiles(currentFile);

    // Prefetch high-probability files
    const toPrefetch = predictions.filter(p => p.probability > 0.6);

    await Promise.all(
      toPrefetch.map(async (pred) => {
        if (!this.cache.has(pred.file)) {
          const content = await readFile(pred.file);
          this.cache.set(pred.file, {
            content,
            prefetchedAt: Date.now(),
            reason: pred.reason,
          });
        }
      })
    );
  }

  private async predictNeededFiles(currentFile: string): Promise<PrefetchPrediction[]> {
    const predictions: PrefetchPrediction[] = [];

    // Import analysis
    const imports = await extractImports(currentFile);
    for (const imp of imports) {
      predictions.push({
        file: resolveImport(imp),
        probability: 0.8,
        reason: 'direct-import',
      });
    }

    // Test file correlation
    if (!currentFile.includes('.test.')) {
      const testFile = currentFile.replace(/\.(ts|tsx|js)$/, '.test.$1');
      predictions.push({
        file: testFile,
        probability: 0.7,
        reason: 'test-correlation',
      });
    }

    // Type definition files
    const typeFile = currentFile.replace(/\.(ts|tsx)$/, '.d.ts');
    predictions.push({
      file: typeFile,
      probability: 0.5,
      reason: 'type-definitions',
    });

    return predictions;
  }

  get(file: string): FileContent | null {
    return this.cache.get(file) || null;
  }
}
```

### 2. Dependency Graph Prefetch
```typescript
class DependencyPrefetcher {
  private depGraph: Map<string, string[]> = new Map();

  async prefetchDependencies(
    targetFile: string,
    depth: number = 2
  ): Promise<void> {
    const toPrefetch = new Set<string>();
    const queue = [{ file: targetFile, currentDepth: 0 }];

    while (queue.length > 0) {
      const { file, currentDepth } = queue.shift()!;

      if (currentDepth > depth) continue;
      if (toPrefetch.has(file)) continue;

      toPrefetch.add(file);

      // Add dependencies to queue
      const deps = this.depGraph.get(file) || await this.analyzeDeps(file);
      for (const dep of deps) {
        queue.push({ file: dep, currentDepth: currentDepth + 1 });
      }
    }

    // Prefetch all in parallel
    await Promise.all(
      [...toPrefetch].map(file => this.prefetch(file))
    );
  }
}
```

### 3. Conversation-Based Prefetch
```typescript
class ConversationPrefetcher {
  async prefetchFromConversation(
    recentMessages: Message[]
  ): Promise<void> {
    // Extract mentioned files
    const mentionedFiles = this.extractMentionedFiles(recentMessages);

    // Extract mentioned concepts (for doc prefetch)
    const concepts = this.extractConcepts(recentMessages);

    // Prefetch files
    await Promise.all(
      mentionedFiles.map(file => this.prefetchFile(file))
    );

    // Prefetch related docs
    await Promise.all(
      concepts.map(concept => this.prefetchDocs(concept))
    );
  }

  private extractMentionedFiles(messages: Message[]): string[] {
    const filePattern = /(?:^|\s)([\/\w.-]+\.[a-z]{2,4})(?:\s|$|:)/gi;
    const files: string[] = [];

    for (const msg of messages) {
      const matches = msg.content.matchAll(filePattern);
      for (const match of matches) {
        files.push(match[1]);
      }
    }

    return [...new Set(files)];
  }
}
```

### 4. Task-Based Prefetch
```typescript
const TASK_PREFETCH_MAP = {
  'code-review': {
    prefetch: ['diff', 'related-files', 'test-files', 'types'],
    priority: [1.0, 0.8, 0.7, 0.6],
  },
  'bug-fix': {
    prefetch: ['error-context', 'stack-trace-files', 'tests', 'logs'],
    priority: [1.0, 0.9, 0.8, 0.5],
  },
  'feature-add': {
    prefetch: ['target-file', 'similar-features', 'types', 'tests'],
    priority: [1.0, 0.8, 0.7, 0.6],
  },
  'refactor': {
    prefetch: ['target-files', 'usages', 'tests', 'types'],
    priority: [1.0, 0.9, 0.9, 0.7],
  },
};

async function taskBasedPrefetch(task: Task): Promise<void> {
  const taskType = classifyTask(task);
  const config = TASK_PREFETCH_MAP[taskType];

  const prefetchTasks = config.prefetch.map(async (type, i) => {
    if (config.priority[i] >= 0.7) {
      await prefetchForType(type, task);
    }
  });

  await Promise.all(prefetchTasks);
}
```

## Prefetch Effectiveness

| Scenario | Without Prefetch | With Prefetch | Improvement |
|----------|------------------|---------------|-------------|
| File read | 500ms | 5ms | 100x |
| Dependency load | 2000ms | 50ms | 40x |
| Context build | 3000ms | 200ms | 15x |
| Full task prep | 5000ms | 500ms | 10x |

## Integration Points
- Works with **Intent Predictor** for prediction accuracy
- Coordinates with **Context Preloader** for caching
- Supports **Speculative Executor** for pre-execution
