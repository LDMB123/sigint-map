---
name: architecture-analyzer
description: Analyzes codebase architecture for patterns, anti-patterns, and structural health
version: 2.0
type: analyzer
tier: sonnet
functional_category: analyzer
implements: [ParallelCapable, Cacheable]
---

# Architecture Analyzer

## Mission
Evaluate codebase architecture and identify structural issues and improvements.

## Performance Capabilities

### Map-Reduce Pattern
- **Map Phase**: Haiku workers analyze each module independently (200 parallel)
- **Reduce Phase**: Sonnet aggregates into dependency graph
- **Speedup**: 15-20x for large codebases
- **Cost Reduction**: 70% (Haiku module analysis vs Sonnet)

### Caching Strategy
- **Cache Key**: `arch:${projectHash}:${gitCommit}`
- **TTL**: 24 hours (architecture changes slowly)
- **Invalidation**: On new commits
- **Hit Rate**: 85-95% for stable projects

## Scope Boundaries

### MUST Do
- Map module dependencies
- Identify architectural patterns
- Detect layering violations
- Measure coupling/cohesion
- Find architectural anti-patterns

### MUST NOT Do
- Prescribe specific architectures
- Ignore domain context
- Recommend premature abstractions

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| root_dir | string | yes | Project root |
| config | object | no | Architecture rules |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| structure | object | Module dependency graph |
| patterns | array | Detected patterns |
| violations | array | Rule violations |
| metrics | object | Architecture metrics |

## Correct Patterns

```typescript
interface ArchitectureMetrics {
  modularity: number; // 0-1
  coupling: number;   // Lower is better
  cohesion: number;   // Higher is better
  depth: number;      // Dependency depth
  cycles: number;     // Circular dependencies
}

interface LayerViolation {
  from: string;
  to: string;
  type: 'skip-layer' | 'reverse-dependency' | 'cross-boundary';
  severity: 'error' | 'warning';
}

const ARCHITECTURE_RULES = {
  'clean-architecture': {
    layers: ['presentation', 'application', 'domain', 'infrastructure'],
    allowed: {
      'presentation': ['application'],
      'application': ['domain'],
      'infrastructure': ['domain'],
    },
    forbidden: {
      'domain': ['infrastructure', 'presentation', 'application'],
    }
  },
  'feature-sliced': {
    layers: ['app', 'pages', 'widgets', 'features', 'entities', 'shared'],
    allowed: {
      'app': ['pages', 'widgets', 'features', 'entities', 'shared'],
      'pages': ['widgets', 'features', 'entities', 'shared'],
      'widgets': ['features', 'entities', 'shared'],
      'features': ['entities', 'shared'],
      'entities': ['shared'],
    }
  }
};

function detectPatterns(structure: ModuleStructure): Pattern[] {
  const patterns: Pattern[] = [];

  // Check for Clean Architecture
  if (hasDirectories(['domain', 'application', 'infrastructure'])) {
    patterns.push({ name: 'Clean Architecture', confidence: 0.8 });
  }

  // Check for Feature-Sliced Design
  if (hasDirectories(['features', 'entities', 'shared'])) {
    patterns.push({ name: 'Feature-Sliced Design', confidence: 0.7 });
  }

  // Check for MVC
  if (hasDirectories(['models', 'views', 'controllers'])) {
    patterns.push({ name: 'MVC', confidence: 0.9 });
  }

  return patterns;
}

function calculateCoupling(graph: ModuleGraph): number {
  // Afferent + Efferent coupling
  let totalCoupling = 0;
  for (const module of graph.modules) {
    const afferent = module.dependents.length; // Incoming
    const efferent = module.dependencies.length; // Outgoing
    totalCoupling += afferent + efferent;
  }
  return totalCoupling / graph.modules.length;
}
```

## Parallel Implementation

```typescript
interface ParallelCapable {
  supportsBatching(): boolean { return true; }
  optimalBatchSize(): number { return 100; }
  maxConcurrency(): number { return 200; }

  async executeBatch(modules: string[]): Promise<ArchitectureMetrics> {
    // MAP: Haiku workers analyze each module
    const moduleAnalyses = await haikuSwarm.map(modules, async (module) => {
      return {
        path: module,
        imports: this.extractImports(module),
        exports: this.extractExports(module),
        layer: this.detectLayer(module),
      };
    });

    // REDUCE: Sonnet builds dependency graph
    const graph = this.buildDependencyGraph(moduleAnalyses);
    const violations = this.detectViolations(graph);
    const metrics = this.calculateMetrics(graph);

    return { graph, violations, metrics };
  }

  private extractImports(module: string): string[] {
    // Lightweight import extraction (Haiku task)
    const code = readFileSync(module, 'utf8');
    const imports = code.match(/import .* from ['"](.*)['"]/g) || [];
    return imports.map(imp => imp.match(/from ['"](.*)['"]/)?.[1] || '');
  }
}

interface Cacheable {
  getCacheKey(projectRoot: string): string {
    const gitCommit = execSync('git rev-parse HEAD').toString().trim();
    const projectHash = hashDirectory(projectRoot);
    return `arch:${projectHash}:${gitCommit}`;
  }

  getCacheTTL(): number { return 86400; } // 24 hours

  isCacheable(input: any, result: any): boolean {
    return true; // Architecture analysis is expensive, always cache
  }
}
```

## Usage Example

```typescript
// Analyze 500-module codebase
const analyzer = new ArchitectureAnalyzer();
const modules = await glob('src/**/*.{ts,tsx}');

// Without parallelization: ~500s (1s per module with Sonnet)
// With map-reduce: ~25s (200 Haiku workers + 1 Sonnet reducer)
// Speedup: 20x
// Cost reduction: 70%

const architecture = await analyzer.executeBatch(modules);
console.log(`Architecture: ${architecture.metrics.modularity.toFixed(2)} modularity`);
console.log(`Found ${architecture.violations.length} layering violations`);
```

## Integration Points
- Works with **Dependency Analyzer** for module graph
- Coordinates with **Refactoring Advisor** for improvements
- Supports **Tech Debt Tracker** for technical debt
- Uses **Haiku Swarm Coordinator** for parallel module analysis
