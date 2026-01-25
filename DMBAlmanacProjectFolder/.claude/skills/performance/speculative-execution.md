# Skill: Speculative Execution

**ID**: `speculative-execution`
**Category**: Performance
**Agents**: Speculative Executor, Intent Predictor, Parallel Branch Executor

---

## When to Use

- When you want near-instant responses to predictable requests
- When working on iterative development with predictable patterns
- When the cost of wrong speculation is low (discardable results)
- When user patterns are consistent and learnable

## Required Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Current context | Yes | What the user is working on |
| Recent history | Yes | Last 5-10 interactions |
| Session phase | Yes | exploration/implementation/review |

## Steps

### 1. Predict Next Actions
```typescript
// Based on current context and history
const predictions = await intentPredictor.predict({
  currentFile: context.activeFile,
  recentActions: context.history.slice(-5),
  sessionPhase: context.phase,
});

// Filter to high-confidence predictions
const toExecute = predictions.filter(p => p.confidence > 0.7);
```

### 2. Execute Speculatively
```typescript
// Start executing predicted tasks in background
for (const pred of toExecute) {
  speculativeExecutor.execute(pred.task, {
    maxTokens: 2000,
    timeout: 5000,
    discardAfter: 60000, // 1 minute
  });
}
```

### 3. Use or Discard Results
```typescript
// When user makes actual request
const actualRequest = await getUserRequest();

// Check if we have it precomputed
const precomputed = speculativeExecutor.getResult(actualRequest);
if (precomputed) {
  return precomputed; // Instant response!
}

// Otherwise, compute normally
return await compute(actualRequest);
```

## Common Patterns

| After This | Predict These | Confidence |
|------------|---------------|------------|
| Read file | Edit file, explain code | 80% |
| See error | Fix error, explain error | 85% |
| Write test | Run test, see coverage | 75% |
| Implement feature | Test feature, document | 70% |

## Output Template

```
Speculative Execution Report
============================
Predictions Made: 5
Correct Predictions: 4 (80%)
Tokens Saved: 3,000
Time Saved: 8.5 seconds

Top Predictions:
1. Edit auth.ts (85% confidence) ✓ Used
2. Run tests (70% confidence) ✓ Used
3. Explain error (80% confidence) ✗ Discarded
```
