---
name: dependency-analyzer
description: Analyzes project dependencies for security, bloat, and architectural issues
version: 1.0
type: analyzer
tier: haiku
functional_category: analyzer
---

# Dependency Analyzer

## Mission
Analyze dependencies for security risks, bloat, and architectural coupling.

## Scope Boundaries

### MUST Do
- Map dependency graph
- Identify circular dependencies
- Find unused dependencies
- Detect duplicate packages
- Check version compatibility

### MUST NOT Do
- Auto-remove dependencies
- Ignore transitive dependencies
- Skip peer dependency analysis

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| manifest | string | yes | package.json path |
| lockfile | string | yes | Lockfile path |
| source_dir | string | no | Source to scan for usage |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| graph | object | Dependency tree |
| unused | array | Unused packages |
| duplicates | array | Duplicate packages |
| cycles | array | Circular dependencies |

## Correct Patterns

```typescript
interface DependencyNode {
  name: string;
  version: string;
  direct: boolean;
  dependencies: string[];
  dependents: string[];
  size: number;
  usageCount: number;
}

interface DependencyAnalysis {
  totalPackages: number;
  directDependencies: number;
  transitiveDepth: number;
  duplicateVersions: DuplicateInfo[];
  unusedDependencies: string[];
  circularDependencies: string[][];
  largestPackages: PackageSize[];
}

function buildDependencyGraph(
  manifest: PackageJson,
  lockfile: LockFile
): Map<string, DependencyNode> {
  const graph = new Map<string, DependencyNode>();

  // Build nodes from lockfile
  for (const [name, info] of Object.entries(lockfile.packages)) {
    graph.set(name, {
      name,
      version: info.version,
      direct: name in manifest.dependencies || name in manifest.devDependencies,
      dependencies: Object.keys(info.dependencies || {}),
      dependents: [],
      size: info.size || 0,
      usageCount: 0,
    });
  }

  // Build reverse edges
  for (const [name, node] of graph) {
    for (const dep of node.dependencies) {
      const depNode = graph.get(dep);
      if (depNode) {
        depNode.dependents.push(name);
      }
    }
  }

  return graph;
}

function findCircularDependencies(graph: Map<string, DependencyNode>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(name: string, path: string[]): void {
    visited.add(name);
    recursionStack.add(name);

    const node = graph.get(name);
    if (!node) return;

    for (const dep of node.dependencies) {
      if (!visited.has(dep)) {
        dfs(dep, [...path, name]);
      } else if (recursionStack.has(dep)) {
        // Found cycle
        const cycleStart = path.indexOf(dep);
        cycles.push([...path.slice(cycleStart), name, dep]);
      }
    }

    recursionStack.delete(name);
  }

  for (const name of graph.keys()) {
    if (!visited.has(name)) {
      dfs(name, []);
    }
  }

  return cycles;
}
```

## Integration Points
- Works with **Security Scanner** for CVEs
- Coordinates with **Bundle Analyzer** for size
- Supports **Architecture Analyzer** for coupling
