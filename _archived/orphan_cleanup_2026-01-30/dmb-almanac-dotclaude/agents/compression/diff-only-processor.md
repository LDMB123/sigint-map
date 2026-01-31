---
name: diff-only-processor
description: Processes only diffs instead of full files for 90%+ token savings
version: 1.0
type: processor
tier: haiku
functional_category: compression
cost_reduction: 90%+
---

# Diff-Only Processor

## Mission
Process only what changed (diffs) instead of full content for massive token savings.

## Diff Processing Patterns

### 1. Git Diff Processing
```typescript
async function processGitDiff(
  file: string,
  baseRef: string = 'HEAD~1'
): Promise<ReviewResult> {
  // Get only changed lines
  const diff = await exec(`git diff ${baseRef} -- ${file}`);

  if (!diff) {
    return { noChanges: true, file };
  }

  // Process only the diff (not full file)
  return await haiku(`
    Review these changes in ${file}:
    ${diff}

    Return: [{line, issue, severity, fix}]
  `);
}

// Full file: 2000 tokens
// Diff only: 150 tokens (92% reduction)
```

### 2. Incremental Analysis
```typescript
class IncrementalAnalyzer {
  private previousState = new Map<string, FileState>();

  async analyze(file: string): Promise<Analysis> {
    const currentContent = await readFile(file);
    const currentHash = hash(currentContent);

    const previous = this.previousState.get(file);

    if (!previous) {
      // First time - full analysis (rare)
      const analysis = await fullAnalyze(currentContent);
      this.previousState.set(file, { hash: currentHash, analysis });
      return analysis;
    }

    if (previous.hash === currentHash) {
      // No changes - return cached
      return previous.analysis;
    }

    // Changed - analyze only diff
    const diff = createDiff(previous.content, currentContent);
    const deltaAnalysis = await analyzeDeltas(diff);

    // Merge with previous analysis
    const merged = mergeAnalysis(previous.analysis, deltaAnalysis);
    this.previousState.set(file, { hash: currentHash, analysis: merged });

    return merged;
  }
}
```

### 3. Hunks-Only Processing
```typescript
interface DiffHunk {
  startLine: number;
  endLine: number;
  oldContent: string;
  newContent: string;
  context: string; // 3 lines before/after
}

async function processHunks(hunks: DiffHunk[]): Promise<HunkResult[]> {
  // Process each hunk independently (parallelizable!)
  return await Promise.all(
    hunks.map(hunk =>
      haiku(`
        Review this change (lines ${hunk.startLine}-${hunk.endLine}):

        Before:
        ${hunk.oldContent}

        After:
        ${hunk.newContent}

        Context:
        ${hunk.context}

        Return: {valid: bool, issues: [{line, issue}]}
      `)
    )
  );
}
```

### 4. Semantic Diff
```typescript
// Beyond text diff - understand semantic changes
async function semanticDiff(
  oldCode: string,
  newCode: string
): Promise<SemanticChanges> {
  const oldAST = parse(oldCode);
  const newAST = parse(newCode);

  return {
    addedFunctions: findAdded(oldAST, newAST, 'function'),
    removedFunctions: findRemoved(oldAST, newAST, 'function'),
    modifiedFunctions: findModified(oldAST, newAST, 'function'),
    addedImports: findAdded(oldAST, newAST, 'import'),
    typeChanges: findTypeChanges(oldAST, newAST),
  };
}

// Process only semantic changes, not line-by-line
```

## Token Savings by Scenario

| Scenario | Full Processing | Diff-Only | Savings |
|----------|-----------------|-----------|---------|
| Small change (5 lines) | 2000 tokens | 100 tokens | 95% |
| Medium change (50 lines) | 2000 tokens | 400 tokens | 80% |
| Large change (200 lines) | 2000 tokens | 800 tokens | 60% |
| Refactor (many files) | 10000 tokens | 1500 tokens | 85% |

## When to Use Diff vs Full

```typescript
function shouldUseDiff(context: ProcessingContext): boolean {
  // Always use diff for code review
  if (context.task === 'review') return true;

  // Use diff for incremental validation
  if (context.task === 'validate' && context.hasBaseline) return true;

  // Use full for initial analysis
  if (!context.hasBaseline) return false;

  // Use diff if changes are < 30% of file
  const changeRatio = context.diffLines / context.totalLines;
  return changeRatio < 0.3;
}
```

## Integration Points
- Works with **Incremental Processor** for change detection
- Coordinates with **Git Watcher** for baseline tracking
- Supports **Parallel File Processor** for hunk parallelization
