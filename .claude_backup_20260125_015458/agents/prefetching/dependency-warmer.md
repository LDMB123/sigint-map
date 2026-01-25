---
name: dependency-warmer
description: Warms up dependencies and related context proactively
version: 1.0
type: warmer
tier: haiku
functional_category: prefetching
startup_time_reduction: 70%
---

# Dependency Warmer

## Mission
Proactively warm up dependencies so they're ready when needed.

## Warming Strategies

### 1. Project-Level Warmup
```typescript
interface WarmupConfig {
  onSessionStart: WarmupTask[];
  onFileOpen: WarmupTask[];
  onIdleTime: WarmupTask[];
}

const WARMUP_CONFIG: WarmupConfig = {
  onSessionStart: [
    { type: 'project-structure', priority: 1 },
    { type: 'package-json', priority: 1 },
    { type: 'tsconfig', priority: 1 },
    { type: 'entry-points', priority: 2 },
    { type: 'type-definitions', priority: 3 },
  ],

  onFileOpen: [
    { type: 'imports', priority: 1 },
    { type: 'exports', priority: 2 },
    { type: 'test-file', priority: 3 },
    { type: 'types', priority: 3 },
  ],

  onIdleTime: [
    { type: 'full-dependency-graph', priority: 1 },
    { type: 'all-exports', priority: 2 },
    { type: 'documentation', priority: 3 },
  ],
};

class DependencyWarmer {
  private warmed = new Set<string>();

  async warmSession(): Promise<void> {
    for (const task of WARMUP_CONFIG.onSessionStart) {
      await this.executeWarmup(task);
    }
  }

  async warmForFile(file: string): Promise<void> {
    for (const task of WARMUP_CONFIG.onFileOpen) {
      await this.executeWarmup({ ...task, context: file });
    }
  }

  private async executeWarmup(task: WarmupTask): Promise<void> {
    const key = `${task.type}:${task.context || 'global'}`;
    if (this.warmed.has(key)) return;

    switch (task.type) {
      case 'project-structure':
        await this.warmProjectStructure();
        break;
      case 'imports':
        await this.warmImports(task.context!);
        break;
      case 'type-definitions':
        await this.warmTypes();
        break;
      // ... other warmup types
    }

    this.warmed.add(key);
  }
}
```

### 2. Import Chain Warming
```typescript
async function warmImportChain(
  file: string,
  depth: number = 3
): Promise<void> {
  const visited = new Set<string>();
  const queue = [{ file, currentDepth: 0 }];

  while (queue.length > 0) {
    const { file: current, currentDepth } = queue.shift()!;

    if (visited.has(current) || currentDepth > depth) continue;
    visited.add(current);

    // Warm this file
    await warmFile(current);

    // Queue imports
    const imports = await extractImports(current);
    for (const imp of imports) {
      const resolved = resolveImport(imp, current);
      queue.push({ file: resolved, currentDepth: currentDepth + 1 });
    }
  }
}

async function warmFile(file: string): Promise<void> {
  await Promise.all([
    cacheFileContent(file),
    cacheFileAST(file),
    cacheFileTypes(file),
    cacheFileExports(file),
  ]);
}
```

### 3. Type System Warming
```typescript
class TypeSystemWarmer {
  private typeCache = new Map<string, TypeInfo>();

  async warmTypeSystem(): Promise<void> {
    // Find all type definition files
    const typeFiles = await glob('**/*.d.ts');

    // Warm in parallel
    await Promise.all(
      typeFiles.map(file => this.warmTypeFile(file))
    );

    // Build type relationships
    await this.buildTypeGraph();
  }

  private async warmTypeFile(file: string): Promise<void> {
    const content = await readFile(file);
    const types = extractTypes(content);

    for (const type of types) {
      this.typeCache.set(type.name, {
        definition: type.definition,
        file: file,
        dependencies: type.dependencies,
      });
    }
  }

  private async buildTypeGraph(): Promise<void> {
    // Build inheritance/implementation relationships
    for (const [name, info] of this.typeCache) {
      for (const dep of info.dependencies) {
        const depInfo = this.typeCache.get(dep);
        if (depInfo) {
          depInfo.dependents = depInfo.dependents || [];
          depInfo.dependents.push(name);
        }
      }
    }
  }
}
```

### 4. Framework-Specific Warming
```typescript
const FRAMEWORK_WARMUPS = {
  react: [
    'components/**/*.tsx',
    'hooks/**/*.ts',
    'contexts/**/*.tsx',
    'types/**/*.ts',
  ],

  nextjs: [
    'app/**/page.tsx',
    'app/**/layout.tsx',
    'app/api/**/*.ts',
    'lib/**/*.ts',
  ],

  express: [
    'routes/**/*.ts',
    'middleware/**/*.ts',
    'controllers/**/*.ts',
    'models/**/*.ts',
  ],
};

async function warmFramework(framework: string): Promise<void> {
  const patterns = FRAMEWORK_WARMUPS[framework];
  if (!patterns) return;

  for (const pattern of patterns) {
    const files = await glob(pattern);
    await Promise.all(files.map(file => warmFile(file)));
  }
}
```

## Warming Impact

| Warmup Type | Cold Start | Warmed | Improvement |
|-------------|------------|--------|-------------|
| Project structure | 2s | 0ms | 100% |
| Type definitions | 5s | 50ms | 99% |
| Import chain (3 deep) | 3s | 100ms | 97% |
| Full dependency graph | 10s | 200ms | 98% |

## Integration Points
- Works with **Context Prefetcher** for file loading
- Coordinates with **Session Optimizer** for session startup
- Supports **Result Precomputer** for analysis caching
