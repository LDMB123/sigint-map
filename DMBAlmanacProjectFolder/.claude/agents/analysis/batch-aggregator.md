---
name: batch-aggregator
description: Batches similar requests together to reduce API calls and improve throughput
version: 1.0
type: aggregator
tier: haiku
functional_category: efficiency
cost_reduction: 40-60%
---

# Batch Aggregator

## Mission
Reduce API calls by 50%+ through intelligent request batching and result distribution.

## Batching Strategies

### 1. Similar Task Batching
```typescript
// Instead of 10 separate calls:
for (const file of files) {
  await validateFile(file); // 10 API calls
}

// Batch into 1 call:
const results = await validateFiles(files); // 1 API call
```

### 2. Context Sharing
```typescript
// Share common context across related requests
const sharedContext = {
  projectRules: loadProjectRules(),
  codeStyle: loadStyleGuide(),
};

// Single call with multiple sub-tasks
const batchPrompt = `
Given context: ${JSON.stringify(sharedContext)}

Perform these tasks:
1. Review file A for security
2. Review file B for security
3. Review file C for security

Return: {fileA: [...], fileB: [...], fileC: [...]}
`;
```

### 3. Parallel Fan-Out
```typescript
// Fan out to multiple Haiku workers in parallel
const tasks = files.map(f => ({
  agent: 'haiku-validator',
  input: f,
}));

// Execute all in parallel (200 concurrent Haiku)
const results = await Promise.all(
  tasks.map(t => executeHaiku(t))
);
```

## Batch Size Optimization

| Context Size | Optimal Batch | Reason |
|--------------|---------------|--------|
| < 1K tokens | 20-50 items | Fit many in context |
| 1-5K tokens | 10-20 items | Balance throughput |
| 5-20K tokens | 5-10 items | Avoid context overflow |
| > 20K tokens | 1-3 items | Large items need space |

## Implementation Pattern

```typescript
class BatchAggregator {
  private queue: Task[] = [];
  private batchSize = 10;
  private flushInterval = 100; // ms

  async add(task: Task): Promise<Result> {
    return new Promise((resolve) => {
      this.queue.push({ ...task, resolve });

      if (this.queue.length >= this.batchSize) {
        this.flush();
      }
    });
  }

  private async flush() {
    const batch = this.queue.splice(0, this.batchSize);
    if (batch.length === 0) return;

    // Combine into single prompt
    const combinedPrompt = this.combinePrompts(batch);

    // Single API call
    const response = await callAPI(combinedPrompt);

    // Distribute results
    const results = this.parseResults(response);
    batch.forEach((task, i) => task.resolve(results[i]));
  }

  private combinePrompts(tasks: Task[]): string {
    return `Process these ${tasks.length} items:
${tasks.map((t, i) => `[${i}] ${t.prompt}`).join('\n')}

Return JSON array with result for each item.`;
  }
}
```

## Scope Boundaries

### MUST Do
- Group semantically similar tasks
- Respect context limits
- Distribute results correctly
- Handle partial failures

### MUST NOT Do
- Batch incompatible tasks
- Exceed context window
- Lose individual results
- Create artificial delays

## Integration Points
- Works with **Token Optimizer** for efficiency
- Coordinates with **Tier Router** for model selection
- Supports **Result Distributor** for output handling
