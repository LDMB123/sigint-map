---
name: incremental-processor
description: Processes only what changed instead of full content, reducing tokens by 80%+
version: 1.0
type: processor
tier: haiku
functional_category: efficiency
cost_reduction: 80%+
---

# Incremental Processor

## Mission
Process only changes, not entire files/codebases, for massive token savings.

## Incremental Strategies

### 1. Diff-Based Processing
```typescript
// Instead of reviewing entire file
// Review only the diff

async function reviewChanges(file: string): Promise<ReviewResult> {
  // Get diff since last review
  const diff = await git.diff(file, 'HEAD~1');

  if (!diff) {
    return { noChanges: true };
  }

  // Only review the changed lines
  return await haiku(`
    Review these changes:
    ${diff}

    Context: File is ${file}
    Return: {issues: [{line, issue, fix}]}
  `);
}

// Token savings: 2000 tokens -> 200 tokens (90% reduction)
```

### 2. Chunk-Based Processing
```typescript
// Process large files in chunks, cache results
class ChunkProcessor {
  private chunkCache = new Map<string, ProcessedChunk>();

  async process(file: string): Promise<ProcessedFile> {
    const content = await readFile(file);
    const chunks = this.splitIntoChunks(content, 500); // 500 line chunks
    const results: ProcessedChunk[] = [];

    for (const chunk of chunks) {
      const hash = this.hashChunk(chunk);

      // Use cached result if chunk unchanged
      if (this.chunkCache.has(hash)) {
        results.push(this.chunkCache.get(hash)!);
        continue;
      }

      // Process new/changed chunk
      const result = await this.processChunk(chunk);
      this.chunkCache.set(hash, result);
      results.push(result);
    }

    return this.combineResults(results);
  }
}
```

### 3. Function-Level Processing
```typescript
// Track which functions changed
async function processChangedFunctions(file: string): Promise<void> {
  const currentAST = parse(await readFile(file));
  const previousAST = parse(await getLastVersion(file));

  // Find changed functions
  const changedFunctions = findChangedFunctions(previousAST, currentAST);

  // Only process changed functions
  for (const fn of changedFunctions) {
    await processSingleFunction(fn);
  }
}
```

### 4. Incremental Test Generation
```typescript
// Generate tests only for new/changed code
async function generateIncrementalTests(
  changedFiles: string[]
): Promise<TestFile[]> {
  const tests: TestFile[] = [];

  for (const file of changedFiles) {
    // Get only new functions
    const newFunctions = await getNewFunctions(file);

    if (newFunctions.length > 0) {
      // Generate tests only for new functions
      const fileTests = await generateTestsForFunctions(newFunctions);
      tests.push(fileTests);
    }
  }

  return tests;
}
```

## State Management

```typescript
interface ProcessingState {
  fileHashes: Map<string, string>;
  chunkHashes: Map<string, string>;
  functionHashes: Map<string, string>;
  lastProcessed: Map<string, number>;
}

class IncrementalState {
  private state: ProcessingState;

  async hasChanged(file: string): Promise<boolean> {
    const currentHash = await hashFile(file);
    const previousHash = this.state.fileHashes.get(file);
    return currentHash !== previousHash;
  }

  async getChangedChunks(file: string): Promise<Chunk[]> {
    const chunks = await splitIntoChunks(file);
    const changed: Chunk[] = [];

    for (const chunk of chunks) {
      const hash = hashChunk(chunk);
      if (!this.state.chunkHashes.has(hash)) {
        changed.push(chunk);
      }
    }

    return changed;
  }

  updateState(file: string, hash: string): void {
    this.state.fileHashes.set(file, hash);
    this.state.lastProcessed.set(file, Date.now());
  }
}
```

## Token Savings Analysis

| Processing Type | Full | Incremental | Savings |
|-----------------|------|-------------|---------|
| File review | 2000 tokens | 200 tokens | 90% |
| Codebase analysis | 50000 tokens | 5000 tokens | 90% |
| Test generation | 10000 tokens | 1000 tokens | 90% |
| Documentation | 5000 tokens | 500 tokens | 90% |

## Implementation

```typescript
class IncrementalProcessor {
  private state = new IncrementalState();

  async process(
    files: string[],
    processor: (content: string) => Promise<ProcessResult>
  ): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];

    for (const file of files) {
      // Skip unchanged files
      if (!await this.state.hasChanged(file)) {
        results.push(this.state.getCachedResult(file));
        continue;
      }

      // Get only changed chunks
      const changedChunks = await this.state.getChangedChunks(file);

      if (changedChunks.length === 0) {
        results.push(this.state.getCachedResult(file));
        continue;
      }

      // Process only changed chunks
      const chunkResults = await Promise.all(
        changedChunks.map(chunk => processor(chunk.content))
      );

      // Merge with cached results
      const merged = this.mergeResults(
        this.state.getCachedResult(file),
        chunkResults
      );

      // Update cache
      this.state.updateState(file, await hashFile(file));
      results.push(merged);
    }

    return results;
  }
}
```

## Integration Points
- Works with **Git Watcher** for change detection
- Coordinates with **Response Cache** for result caching
- Supports **Chunk Manager** for splitting
