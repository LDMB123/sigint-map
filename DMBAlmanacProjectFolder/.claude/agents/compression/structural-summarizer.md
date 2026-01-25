---
name: structural-summarizer
description: Creates structural summaries that preserve code meaning with 80%+ compression
version: 1.0
type: summarizer
tier: haiku
functional_category: compression
cost_reduction: 80%+
---

# Structural Summarizer

## Mission
Create structural summaries of code that preserve meaning while drastically reducing tokens.

## Summarization Strategies

### 1. Function Signature Summary
```typescript
// Instead of full function body, just signature + intent
function summarizeFunction(fn: FunctionNode): string {
  return `
${fn.name}(${fn.params.map(p => p.name).join(', ')}) -> ${fn.returnType}
// ${fn.docstring || inferIntent(fn)}
`;
}

// Before (full function): 200 tokens
// After (signature): 20 tokens (90% reduction)
```

### 2. File Structure Summary
```typescript
interface FileSummary {
  path: string;
  type: 'component' | 'util' | 'api' | 'config';
  exports: string[];
  imports: string[];
  publicAPI: string[];
}

function summarizeFile(file: string): FileSummary {
  const ast = parse(file);

  return {
    path: file,
    type: inferFileType(ast),
    exports: extractExports(ast).map(e => e.name),
    imports: extractImports(ast).map(i => i.source),
    publicAPI: extractPublicAPI(ast).map(a => a.signature),
  };
}

// Before (500 line file): 2000 tokens
// After (summary): 100 tokens (95% reduction)
```

### 3. Hierarchical Summary
```typescript
interface CodebaseHierarchy {
  modules: ModuleSummary[];
  dependencies: DependencyGraph;
  entryPoints: string[];
}

function createHierarchy(codebase: string[]): CodebaseHierarchy {
  // Level 1: Module names only
  const moduleNames = codebase.map(f => getModuleName(f));

  // Level 2: Module summaries (on demand)
  const moduleSummaries = new Map<string, ModuleSummary>();

  // Level 3: Full code (only when needed)

  return {
    modules: moduleNames.map(name => ({
      name,
      getSummary: () => moduleSummaries.get(name) || computeSummary(name),
      getCode: () => readFile(name),
    })),
    dependencies: buildDepGraph(codebase),
    entryPoints: findEntryPoints(codebase),
  };
}
```

### 4. Intent-Based Summary
```typescript
const INTENT_PATTERNS = {
  'CRUD': /create|read|update|delete|get|set|add|remove/i,
  'Transform': /convert|transform|map|reduce|filter/i,
  'Validate': /validate|check|verify|assert|ensure/i,
  'Format': /format|render|display|stringify/i,
  'Auth': /auth|login|logout|permission|role/i,
};

function summarizeByIntent(code: string): IntentSummary {
  const intent = detectIntent(code, INTENT_PATTERNS);

  return {
    intent,
    inputs: extractInputs(code),
    outputs: extractOutputs(code),
    sideEffects: detectSideEffects(code),
  };
}

// "Function that validates user input and returns errors"
// Instead of 100 lines of validation code
```

## Compression Examples

| Code Type | Original | Structural Summary | Reduction |
|-----------|----------|-------------------|-----------|
| React Component | 300 tokens | `<UserProfile props={user,onUpdate} state={editing}>` | 95% |
| API Handler | 400 tokens | `POST /users -> createUser(body) -> User \| Error` | 92% |
| Utility Module | 500 tokens | `utils: [formatDate, parseJSON, debounce, throttle]` | 90% |
| Config File | 200 tokens | `config: {db:postgres, cache:redis, port:3000}` | 85% |

## When to Use Full Code vs Summary

```typescript
function shouldUseSummary(
  task: Task,
  codeSize: number,
  relevance: number
): boolean {
  // Always use summary for large, low-relevance code
  if (codeSize > 500 && relevance < 0.5) return true;

  // Use full code for small, high-relevance code
  if (codeSize < 100 && relevance > 0.8) return false;

  // Use summary for context, full code for target
  if (task.type === 'context') return true;
  if (task.type === 'target') return false;

  // Default: use summary for efficiency
  return true;
}
```

## Integration Points
- Works with **Smart Context Selector** for relevance scoring
- Coordinates with **Token Minimizer** for additional compression
- Supports **Context Preloader** for pre-built summaries
