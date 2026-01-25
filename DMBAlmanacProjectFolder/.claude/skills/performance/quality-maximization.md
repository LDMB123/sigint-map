# Skill: Quality Maximization

**ID**: `quality-maximization`
**Category**: Performance
**Agents**: Quality Amplifier, Ensemble Synthesizer, Iterative Refiner

---

## When to Use

- When quality is more important than cost
- For production-critical code
- For security-sensitive implementations
- When you want the best possible output

## Required Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Initial output | Yes | First-pass result to amplify |
| Quality target | Yes | Minimum quality score (0-1) |
| Max iterations | Optional | Limit on refinement passes |
| Quality aspects | Optional | Specific aspects to optimize |

## Steps

### 1. Generate Multiple Solutions (Best-of-N)
```typescript
// Generate 5 solutions in parallel using Haiku
const solutions = await Promise.all(
  Array(5).fill(null).map(() =>
    haiku(task.prompt)
  )
);

// Evaluate and select best
const evaluated = await evaluateAll(solutions);
const best = evaluated.sort((a, b) => b.score - a.score)[0];
```

### 2. Amplify Quality
```typescript
// Run through quality amplification pipeline
const amplified = await qualityAmplifier.amplify(best, {
  passes: ['correctness', 'completeness', 'clarity', 'performance'],
  targetQuality: 0.95,
});
```

### 3. Ensemble Synthesis (Optional)
```typescript
// If still below target, use ensemble
if (amplified.quality < 0.95) {
  const ensemble = await ensembleSynthesizer.synthesize([
    haiku(`${task.prompt} - focus on correctness`),
    haiku(`${task.prompt} - focus on edge cases`),
    haiku(`${task.prompt} - focus on performance`),
  ]);
}
```

### 4. Iterative Refinement
```typescript
// Keep refining until quality threshold met
const final = await iterativeRefiner.refine(result, {
  threshold: 0.95,
  maxIterations: 5,
  earlyStopImprovement: 0.01,
});
```

## Quality Levels

| Level | Target | Cost Multiplier | Use Case |
|-------|--------|-----------------|----------|
| Standard | 75% | 1x | Most tasks |
| High | 85% | 3x | Important features |
| Critical | 95% | 7x | Production, security |
| Maximum | 98% | 15x | Mission-critical |

## Output Template

```
Quality Maximization Report
===========================
Initial Quality: 75%
Final Quality: 96%
Improvement: +28%

Pipeline Used:
1. Best-of-5 selection (75% → 82%)
2. Correctness pass (82% → 88%)
3. Completeness pass (88% → 92%)
4. Performance pass (92% → 94%)
5. Final refinement (94% → 96%)

Total Cost: 4.2x baseline
Quality/Cost Ratio: 6.85
```
