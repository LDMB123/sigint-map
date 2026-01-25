# Skill: Intelligent Prefetching

**ID**: `intelligent-prefetching`
**Category**: Performance
**Agents**: Context Prefetcher, Result Precomputer, Dependency Warmer

---

## When to Use

- At session start to warm up context
- When opening a new file
- During idle time between requests
- Before predictable operations

## Required Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Current file | Optional | Active file being edited |
| Session phase | Optional | Current workflow phase |
| Idle status | Optional | Whether user is idle |

## Steps

### 1. Session Warmup
```typescript
// On session start, warm critical context
await dependencyWarmer.warmSession();

// This preloads:
// - Project structure
// - Package.json and tsconfig
// - Entry points and type definitions
// - Common patterns and conventions
```

### 2. File-Based Prefetch
```typescript
// When user opens a file
await contextPrefetcher.prefetchForFile(openedFile, {
  includeImports: true,
  includeTests: true,
  includeTypes: true,
  depth: 2, // 2 levels of dependencies
});
```

### 3. Idle Time Precomputation
```typescript
// During idle periods
if (isIdle) {
  await resultPrecomputer.precomputeCommon([
    'summarize-current-file',
    'list-todos',
    'check-types',
    'run-lint',
  ]);
}
```

### 4. Predictive Prefetch
```typescript
// Based on predicted next actions
const predictions = await intentPredictor.predict(context);

for (const pred of predictions.filter(p => p.confidence > 0.6)) {
  await contextPrefetcher.prefetchForTask(pred.task);
}
```

## Prefetch Priorities

| Context Type | Priority | When to Prefetch |
|--------------|----------|------------------|
| Direct imports | Highest | Immediately |
| Test files | High | On file open |
| Type definitions | High | On session start |
| Related files | Medium | During idle |
| Documentation | Low | Background |

## Cache Management

```typescript
// Cache configuration
const CACHE_CONFIG = {
  maxSize: 100 * 1024 * 1024, // 100MB
  ttl: {
    fileContent: 5 * 60 * 1000,    // 5 minutes
    analysis: 15 * 60 * 1000,      // 15 minutes
    types: 60 * 60 * 1000,         // 1 hour
    structure: 24 * 60 * 60 * 1000, // 1 day
  },
  evictionPolicy: 'lru',
};
```

## Output Template

```
Prefetch Status Report
======================
Session Warmup: Complete (1.2s)
Files Prefetched: 47
Cache Hit Rate: 85%

Prefetch Breakdown:
- Direct imports: 12 files
- Test files: 8 files
- Type definitions: 15 files
- Related files: 12 files

Estimated Latency Savings: 18.5s
Memory Used: 24MB / 100MB
```
