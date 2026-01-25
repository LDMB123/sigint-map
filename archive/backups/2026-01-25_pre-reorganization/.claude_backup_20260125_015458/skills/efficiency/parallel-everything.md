# Skill: Parallel Everything

**ID**: `parallel-everything`
**Category**: Efficiency
**Agent**: Haiku Swarm Coordinator

---

## When to Use
- Processing multiple files
- Running multiple validations
- Batch operations
- Any task that can be parallelized

## Parallelization Opportunities

### File Operations
```bash
# Sequential (slow): 100 files × 2s = 200s
for file in *.ts; do validate "$file"; done

# Parallel (fast): 100 files ÷ 200 workers = 0.5s
parallel-validate *.ts --workers 200
```

### Validation Tasks
| Sequential | Parallel (200) | Speedup |
|------------|----------------|---------|
| 100 files × 2s | 100 files ÷ 200 | 400x |
| 50 checks × 1s | 50 checks ÷ 50 | 50x |
| 20 tests × 3s | 20 tests ÷ 20 | 20x |

### Common Parallel Patterns

#### 1. Fan-Out Validation
```typescript
// Validate all files in parallel
const results = await Promise.all(
  files.map(f => haikuValidate(f))
);
```

#### 2. Map-Reduce Analysis
```typescript
// Map: Haiku analyzes each file
const analyses = await swarm.map(files, haikuAnalyze);

// Reduce: Sonnet synthesizes
const summary = await sonnetSynthesize(analyses);
```

#### 3. Parallel Search
```typescript
// Search across all files simultaneously
const matches = await swarm.search(files, pattern);
```

## Built-in Parallel Skills

| Skill | Workers | Speedup |
|-------|---------|---------|
| `/parallel-lint-fix` | 8 | 5-8x |
| `/parallel-type-check` | 6 | 4-6x |
| `/parallel-test` | 6 | 4-6x |
| `/parallel-security` | 6 | 5-6x |
| `/parallel-review` | 8 | 6-8x |
| `/parallel-audit` | 10 | 8-10x |

## When NOT to Parallelize

- Tasks with dependencies
- Sequential workflows
- State-dependent operations
- Single large file processing

## Output Format
```yaml
parallel_execution:
  total_tasks: 100
  workers_used: 200
  sequential_time: 200s
  parallel_time: 1s
  speedup: 200x

  results:
    passed: 95
    failed: 5

  failed_tasks:
    - file: src/broken.ts
      error: "Syntax error line 15"
```
