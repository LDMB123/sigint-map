---
name: context-preloader
description: Preloads and caches project context to avoid repeated expensive context building
version: 1.0
type: preloader
tier: haiku
functional_category: efficiency
cost_reduction: 80%
---

# Context Preloader

## Mission
Build and cache project context once, reuse for all subsequent requests.

## Preloadable Context Types

### 1. Project Structure
```typescript
interface ProjectContext {
  structure: {
    rootDir: string;
    srcDirs: string[];
    testDirs: string[];
    configFiles: string[];
  };
  fileCount: number;
  languages: string[];
  frameworks: string[];
}

async function preloadProjectStructure(): Promise<ProjectContext> {
  // Scan once, cache forever (until file change)
  return {
    structure: await scanDirectories(),
    fileCount: await countFiles(),
    languages: await detectLanguages(),
    frameworks: await detectFrameworks(),
  };
}
```

### 2. Code Style Guide
```typescript
interface CodeStyle {
  formatting: {
    indent: 'spaces' | 'tabs';
    indentSize: number;
    semicolons: boolean;
    quotes: 'single' | 'double';
  };
  naming: {
    components: 'PascalCase';
    functions: 'camelCase';
    constants: 'UPPER_SNAKE';
    files: 'kebab-case' | 'camelCase';
  };
  patterns: string[];
}

async function preloadCodeStyle(): Promise<CodeStyle> {
  // Learn from existing code once
  const samples = await sampleCodeFiles(10);
  return analyzeCodeStyle(samples);
}
```

### 3. API Signatures
```typescript
interface APISignatures {
  endpoints: Array<{
    path: string;
    method: string;
    params: string[];
    returns: string;
  }>;
  functions: Array<{
    name: string;
    file: string;
    signature: string;
  }>;
}

async function preloadAPISignatures(): Promise<APISignatures> {
  // Extract all signatures once
  return {
    endpoints: await extractEndpoints(),
    functions: await extractFunctionSignatures(),
  };
}
```

### 4. Type Definitions
```typescript
async function preloadTypeDefinitions(): Promise<Map<string, string>> {
  const types = new Map();

  // Extract all type/interface definitions
  const typeFiles = await glob('**/*.d.ts');
  for (const file of typeFiles) {
    const content = await readFile(file);
    const extracted = extractTypes(content);
    for (const [name, def] of extracted) {
      types.set(name, def);
    }
  }

  return types;
}
```

## Preload Strategy

```typescript
class ContextPreloader {
  private cache = new Map<string, PreloadedContext>();
  private loading = new Map<string, Promise<PreloadedContext>>();

  async preloadAll(): Promise<void> {
    // Preload in parallel at session start
    await Promise.all([
      this.preload('project-structure'),
      this.preload('code-style'),
      this.preload('api-signatures'),
      this.preload('type-definitions'),
      this.preload('dependencies'),
    ]);
  }

  async get(type: string): Promise<PreloadedContext> {
    // Return cached if available
    if (this.cache.has(type)) {
      return this.cache.get(type)!;
    }

    // Wait for loading if in progress
    if (this.loading.has(type)) {
      return this.loading.get(type)!;
    }

    // Load on demand
    const promise = this.load(type);
    this.loading.set(type, promise);
    const result = await promise;
    this.cache.set(type, result);
    this.loading.delete(type);
    return result;
  }

  buildPromptContext(): string {
    // Combine all cached contexts efficiently
    const parts = [];

    if (this.cache.has('project-structure')) {
      parts.push(`Project: ${this.summarize('project-structure')}`);
    }

    if (this.cache.has('code-style')) {
      parts.push(`Style: ${this.summarize('code-style')}`);
    }

    // Keep it minimal - just references
    return parts.join('\n');
  }
}
```

## Cache Invalidation

```typescript
// Watch for changes that invalidate context
const watcher = chokidar.watch(['src/**', 'package.json', 'tsconfig.json']);

watcher.on('change', (path) => {
  if (path.endsWith('package.json')) {
    preloader.invalidate('dependencies');
  }
  if (path.endsWith('.ts') || path.endsWith('.tsx')) {
    preloader.invalidate('api-signatures');
    preloader.invalidate('type-definitions');
  }
});
```

## Token Savings

| Context Type | Build Cost | Cached Cost | Savings |
|--------------|------------|-------------|---------|
| Project structure | 500 tokens | 0 tokens | 100% |
| Code style | 300 tokens | 0 tokens | 100% |
| API signatures | 1000 tokens | 0 tokens | 100% |
| Type definitions | 2000 tokens | 0 tokens | 100% |
| **Total** | **3800 tokens** | **0 tokens** | **100%** |

## Integration Points
- Works with **Response Cache** for full caching
- Coordinates with **File Watcher** for invalidation
- Supports **Token Optimizer** for efficiency
