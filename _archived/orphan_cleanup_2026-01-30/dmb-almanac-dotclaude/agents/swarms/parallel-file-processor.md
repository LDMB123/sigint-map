---
name: parallel-file-processor
description: Processes multiple files in parallel using Haiku swarms for 10-50x speedup
version: 1.0
type: processor
tier: haiku
functional_category: swarms
speedup: 10-50x
---

# Parallel File Processor

## Mission
Process large numbers of files simultaneously using Haiku swarms for massive speedup.

## Processing Patterns

### 1. Parallel Lint/Format
```typescript
async function parallelLint(files: string[]): Promise<LintResult[]> {
  const BATCH_SIZE = 50;
  const batches = chunk(files, BATCH_SIZE);

  const results = await Promise.all(
    batches.map(batch =>
      haiku(`Lint these files and return issues as JSON:
        ${batch.map(f => `File: ${f}\nContent: ${readFile(f)}`).join('\n---\n')}
        Return: [{file, line, issue, fix}]
      `)
    )
  );

  return results.flat();
}
```

### 2. Parallel Type Check
```typescript
async function parallelTypeCheck(files: string[]): Promise<TypeError[]> {
  // Process 20 files per Haiku call
  const chunks = chunk(files, 20);

  return (await Promise.all(
    chunks.map(chunk =>
      haiku(`Check types in these TypeScript files:
        ${chunk.map(f => `// ${f}\n${readFile(f)}`).join('\n')}
        Return: [{file, line, expected, actual, message}]
      `)
    )
  )).flat();
}
```

### 3. Parallel Code Search
```typescript
async function parallelSearch(
  files: string[],
  pattern: string
): Promise<SearchResult[]> {
  const CONCURRENT = 100;
  const results: SearchResult[] = [];

  await Promise.all(
    files.slice(0, CONCURRENT).map(async (file, i) => {
      const content = await readFile(file);
      const matches = await haiku(`
        Find all occurrences of "${pattern}" in:
        ${content}
        Return line numbers and context.
      `);
      results.push(...matches);
    })
  );

  return results;
}
```

## Optimal Batch Sizes

| Task | Files per Haiku | Reason |
|------|-----------------|--------|
| Lint | 50 | Light processing |
| Type check | 20 | Moderate complexity |
| Code review | 5 | Deep analysis needed |
| Search | 100 | Simple pattern match |
| Format | 50 | Mechanical transform |

## Integration Points
- Coordinates with **Haiku Swarm Coordinator**
- Works with **Result Aggregator** for combining outputs
- Supports **Work Partitioner** for optimal chunking
