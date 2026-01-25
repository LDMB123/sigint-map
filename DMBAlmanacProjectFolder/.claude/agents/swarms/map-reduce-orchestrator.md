---
name: map-reduce-orchestrator
description: Orchestrates map-reduce patterns for processing large codebases efficiently
version: 1.0
type: orchestrator
tier: sonnet
functional_category: swarms
cost_reduction: 70%
---

# Map-Reduce Orchestrator

## Mission
Apply map-reduce patterns to break down large tasks into parallel chunks.

## Map-Reduce Pattern

```typescript
interface MapReduceConfig<T, M, R> {
  data: T[];
  chunkSize: number;
  map: (chunk: T[]) => Promise<M>;
  reduce: (results: M[]) => Promise<R>;
  tier: 'haiku' | 'sonnet';
}

async function mapReduce<T, M, R>(config: MapReduceConfig<T, M, R>): Promise<R> {
  const { data, chunkSize, map, reduce, tier } = config;

  // Map phase: parallel processing of chunks
  const chunks = splitIntoChunks(data, chunkSize);
  const mapResults = await Promise.all(
    chunks.map(chunk => executeOnTier(tier, () => map(chunk)))
  );

  // Reduce phase: combine results
  return reduce(mapResults);
}
```

## Use Cases

### 1. Codebase Analysis
```typescript
async function analyzeCodebase(files: string[]): Promise<Analysis> {
  return mapReduce({
    data: files,
    chunkSize: 50,
    tier: 'haiku',

    // Map: analyze each chunk
    map: async (chunk) => {
      return haiku(`Analyze these files:
        ${chunk.map(f => readFile(f)).join('\n')}
        Return: {complexity, issues, patterns}
      `);
    },

    // Reduce: combine analyses
    reduce: async (analyses) => {
      return sonnet(`Combine these analyses into summary:
        ${JSON.stringify(analyses)}
        Return: {totalComplexity, topIssues, commonPatterns}
      `);
    },
  });
}
```

### 2. Test Generation
```typescript
async function generateTests(functions: Function[]): Promise<TestFile[]> {
  return mapReduce({
    data: functions,
    chunkSize: 10,
    tier: 'haiku',

    map: async (chunk) => {
      return chunk.map(fn => haiku(`
        Generate unit test for: ${fn.signature}
        Implementation: ${fn.body}
      `));
    },

    reduce: async (testChunks) => {
      return testChunks.flat();
    },
  });
}
```

### 3. Documentation Generation
```typescript
async function generateDocs(modules: Module[]): Promise<Documentation> {
  return mapReduce({
    data: modules,
    chunkSize: 5,
    tier: 'haiku',

    map: async (chunk) => {
      return Promise.all(chunk.map(m =>
        haiku(`Generate docs for module: ${m.name}`)
      ));
    },

    reduce: async (docs) => {
      return sonnet(`Combine into cohesive documentation:
        ${docs.flat().join('\n')}
      `);
    },
  });
}
```

## Cost Comparison

| Task | Sequential (Sonnet) | Map-Reduce (Haiku) | Savings |
|------|---------------------|-------------------|---------|
| 100 file analysis | 50,000 tokens | 15,000 tokens | 70% |
| 50 function tests | 25,000 tokens | 8,000 tokens | 68% |
| Full codebase docs | 100,000 tokens | 30,000 tokens | 70% |

## Integration Points
- Works with **Haiku Swarm Coordinator** for map phase
- Coordinates with **Result Aggregator** for reduce phase
- Supports **Tier Router** for optimal tier selection
