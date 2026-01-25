---
name: smart-context-selector
description: Intelligently selects only relevant context for each task, reducing tokens by 70-90%
version: 1.0
type: selector
tier: haiku
functional_category: efficiency
cost_reduction: 70-90%
---

# Smart Context Selector

## Mission
Include only the context that matters for each specific task.

## Selection Strategies

### 1. Task-Based Selection
```typescript
interface TaskContext {
  taskType: string;
  requiredContext: string[];
  optionalContext: string[];
}

const TASK_CONTEXT_MAP: Record<string, TaskContext> = {
  'bug-fix': {
    taskType: 'bug-fix',
    requiredContext: ['error-message', 'stack-trace', 'affected-file'],
    optionalContext: ['related-files', 'recent-changes'],
  },
  'feature-add': {
    taskType: 'feature-add',
    requiredContext: ['target-file', 'similar-features', 'types'],
    optionalContext: ['style-guide', 'tests'],
  },
  'code-review': {
    taskType: 'code-review',
    requiredContext: ['diff', 'file-context'],
    optionalContext: ['author-history', 'related-issues'],
  },
  'refactor': {
    taskType: 'refactor',
    requiredContext: ['target-code', 'usages', 'tests'],
    optionalContext: ['similar-patterns'],
  },
};
```

### 2. Relevance Scoring
```typescript
function scoreRelevance(
  content: string,
  task: string,
  focus: string[]
): number {
  let score = 0;

  // Direct keyword matches
  for (const keyword of focus) {
    if (content.includes(keyword)) score += 10;
  }

  // Import/export relationships
  if (hasImportFrom(content, focus)) score += 20;

  // Type references
  if (hasTypeReference(content, focus)) score += 15;

  // Function calls
  if (hasFunctionCall(content, focus)) score += 15;

  return score;
}

function selectRelevantFiles(
  allFiles: string[],
  task: string,
  focus: string[],
  maxFiles: number = 5
): string[] {
  const scored = allFiles.map(file => ({
    file,
    score: scoreRelevance(readFile(file), task, focus),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)
    .map(s => s.file);
}
```

### 3. Dependency-Based Selection
```typescript
async function selectDependencyContext(
  targetFile: string,
  depth: number = 2
): Promise<string[]> {
  const context: Set<string> = new Set();
  const queue = [{ file: targetFile, currentDepth: 0 }];

  while (queue.length > 0) {
    const { file, currentDepth } = queue.shift()!;

    if (currentDepth > depth) continue;
    if (context.has(file)) continue;

    context.add(file);

    // Add imports
    const imports = await getImports(file);
    for (const imp of imports) {
      if (!context.has(imp)) {
        queue.push({ file: imp, currentDepth: currentDepth + 1 });
      }
    }
  }

  return Array.from(context);
}
```

### 4. Section Extraction
```typescript
function extractRelevantSections(
  fileContent: string,
  focus: string[]
): string {
  const ast = parse(fileContent);
  const relevantNodes: Node[] = [];

  visit(ast, (node) => {
    // Include if matches focus
    if (focus.some(f => nodeContains(node, f))) {
      relevantNodes.push(node);
    }
  });

  // Generate code for relevant nodes only
  return relevantNodes.map(n => generate(n)).join('\n\n');
}
```

## Context Budget Management

```typescript
class ContextBudget {
  private maxTokens: number;
  private usedTokens: number = 0;

  constructor(maxTokens: number = 4000) {
    this.maxTokens = maxTokens;
  }

  canAdd(content: string): boolean {
    const tokens = countTokens(content);
    return this.usedTokens + tokens <= this.maxTokens;
  }

  add(content: string, priority: number): boolean {
    if (!this.canAdd(content)) {
      return false;
    }
    this.usedTokens += countTokens(content);
    return true;
  }

  buildContext(items: ContextItem[]): string {
    // Sort by priority
    const sorted = items.sort((a, b) => b.priority - a.priority);

    const included: string[] = [];
    for (const item of sorted) {
      if (this.add(item.content, item.priority)) {
        included.push(item.content);
      }
    }

    return included.join('\n\n');
  }
}
```

## Token Reduction Examples

| Task | Full Context | Smart Selection | Reduction |
|------|--------------|-----------------|-----------|
| Fix bug in auth.ts | 10,000 tokens | 1,000 tokens | 90% |
| Add feature | 8,000 tokens | 2,000 tokens | 75% |
| Review PR | 5,000 tokens | 1,500 tokens | 70% |
| Refactor function | 6,000 tokens | 1,200 tokens | 80% |

## Integration Points
- Works with **Context Compressor** for further reduction
- Coordinates with **Token Optimizer** for budget
- Supports **Cache Manager** for reuse
