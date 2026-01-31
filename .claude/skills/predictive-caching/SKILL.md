---
name: predictive-caching
description: >
  Predicts likely file accesses and pre-caches content before it's needed.
  Analyzes task context, file relationships, and access patterns to
  proactively warm caches for 90%+ hit rates.
disable-model-invocation: false
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
---

# Predictive Caching Skill

Anticipates file needs and pre-caches them before requested.

**Detailed algorithms:** See [algorithms-reference.md](algorithms-reference.md)

## Prediction Strategies

### 1. Task-Based
Predict files needed based on task type:
- "Add API endpoint" -> routes.ts, types/api.ts, middleware/auth.ts
- "Fix auth bug" -> auth/*.ts, middleware/auth.ts, .env.example
- "Update docs" -> README.md, docs/**/*.md, package.json

### 2. Dependency Graph
When user accesses a file, predict imports and related files:
- Direct imports (90% probability)
- Type definitions (85%)
- Related utilities (70%)
- Test files (40%, wait for signal)

### 3. Pattern-Based
- Editing src/api/ -> likely needs types/, db/, tests
- Viewing test file -> likely needs source file, mocks
- Debugging error -> likely needs error handler, logger, env config

### 4. Temporal Sequences
Historical: package.json -> tsconfig.json (95%) -> README.md (80%)

## Cache Thresholds

| Probability | Action |
|-------------|--------|
| >= 80% | Cache immediately |
| 50-79% | Cache if budget allows |
| 30-49% | Wait for access signal |
| < 30% | Skip |

## Accuracy Tracking

- Target hit rate: > 80%
- Track: predictions, hits, misses, unexpected accesses
- Adjust thresholds dynamically based on hit rate

## Output

Prediction report: cached files with probabilities, reasons, sizes, estimated savings.

## Integration

Works with: cache-warmer, token-optimizer, context-compressor, token-budget-monitor
