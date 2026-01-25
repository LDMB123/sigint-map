---
name: streaming-processor
description: Processes and returns results as they stream, eliminating wait time
version: 1.0
type: processor
tier: haiku
functional_category: zero-latency
latency_reduction: 90%+ time-to-first-token
---

# Streaming Processor

## Mission
Eliminate perceived latency by streaming results as they're generated.

## Streaming Patterns

### 1. Progressive Result Streaming
```typescript
interface StreamingResult {
  partial: string;
  complete: boolean;
  confidence: number;
  canUseNow: boolean;
}

async function* streamingProcess(
  task: Task
): AsyncGenerator<StreamingResult> {
  // Start processing
  const processor = startProcessing(task);

  while (!processor.complete) {
    const partial = processor.getPartialResult();

    yield {
      partial,
      complete: false,
      confidence: processor.currentConfidence,
      canUseNow: processor.currentConfidence > 0.8,
    };

    await processor.processNextChunk();
  }

  yield {
    partial: processor.getFinalResult(),
    complete: true,
    confidence: 1.0,
    canUseNow: true,
  };
}

// Usage: User sees results appearing in real-time
for await (const result of streamingProcess(task)) {
  displayToUser(result.partial);
  if (result.canUseNow) {
    enableUserAction(); // User can act before fully complete
  }
}
```

### 2. Parallel Stream Merging
```typescript
class ParallelStreamMerger {
  async* mergeStreams(
    tasks: Task[]
  ): AsyncGenerator<MergedResult> {
    // Start all tasks streaming in parallel
    const streams = tasks.map(t => streamingProcess(t));

    // Merge results as they arrive
    const results = new Map<number, string>();

    while (true) {
      const updates = await Promise.race(
        streams.map((s, i) => s.next().then(r => ({ index: i, result: r })))
      );

      if (updates.result.done) {
        streams.splice(updates.index, 1);
        if (streams.length === 0) break;
        continue;
      }

      results.set(updates.index, updates.result.value.partial);

      yield {
        results: [...results.values()],
        completedCount: tasks.length - streams.length,
        totalCount: tasks.length,
      };
    }
  }
}
```

### 3. Speculative Stream Branching
```typescript
async function* speculativeStream(
  task: Task
): AsyncGenerator<SpeculativeResult> {
  // Start multiple approaches simultaneously
  const approaches = [
    streamingProcess({ ...task, approach: 'fast' }),
    streamingProcess({ ...task, approach: 'thorough' }),
    streamingProcess({ ...task, approach: 'creative' }),
  ];

  // Stream the fastest results first
  let bestResult: string = '';
  let bestConfidence: number = 0;

  while (approaches.length > 0) {
    const { index, result } = await Promise.race(
      approaches.map((s, i) => s.next().then(r => ({ index: i, result: r })))
    );

    if (result.done) {
      approaches.splice(index, 1);
      continue;
    }

    // Update best if this one is better
    if (result.value.confidence > bestConfidence) {
      bestResult = result.value.partial;
      bestConfidence = result.value.confidence;

      yield {
        result: bestResult,
        confidence: bestConfidence,
        approach: index,
        complete: false,
      };
    }
  }

  yield {
    result: bestResult,
    confidence: bestConfidence,
    approach: -1,
    complete: true,
  };
}
```

### 4. Chunked Streaming for Large Outputs
```typescript
interface ChunkConfig {
  chunkSize: number;
  overlapSize: number;
  prioritizeStart: boolean;
}

async function* chunkedStream(
  task: Task,
  config: ChunkConfig
): AsyncGenerator<Chunk> {
  const chunks = divideTask(task, config.chunkSize);

  // Process first chunk immediately (often most important)
  if (config.prioritizeStart) {
    yield await processChunk(chunks[0]);
  }

  // Stream remaining chunks in parallel
  const remaining = config.prioritizeStart ? chunks.slice(1) : chunks;
  const processing = remaining.map(c => processChunk(c));

  for (const chunkPromise of processing) {
    yield await chunkPromise;
  }
}
```

## Streaming Metrics

| Metric | Traditional | Streaming | Improvement |
|--------|-------------|-----------|-------------|
| Time to first token | 2000ms | 100ms | 20x |
| User can act | 2000ms | 500ms | 4x |
| Perceived complete | 2000ms | 800ms | 2.5x |
| Actual complete | 2000ms | 2000ms | Same |

## User Experience Impact

```
Traditional:
[████████████████████] 2s wait → Full result

Streaming:
[█] 100ms → First chunk visible
[████] 300ms → User can start reading
[████████] 600ms → User can act on partial
[████████████████████] 2s → Complete

User is engaged from 100ms instead of waiting 2s!
```

## Integration Points
- Works with **Pipeline Orchestrator** for stage streaming
- Coordinates with **Parallel Branch Executor** for multi-stream
- Supports **Quality Amplifier** for progressive refinement
