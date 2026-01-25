---
name: confidence-scorer
description: Scores confidence in outputs to decide when to verify vs trust
version: 1.0
type: scorer
tier: haiku
functional_category: accuracy
accuracy_improvement: 25%
cost_reduction: 30%
---

# Confidence Scorer

## Mission
Determine confidence in outputs to optimize verification effort.

## Confidence Indicators

### High Confidence (Skip Verification)
- Exact match to known pattern
- Simple transformation
- Format conversion
- List generation
- Status checks

### Medium Confidence (Quick Verify)
- Code generation with tests
- Analysis with examples
- Documentation updates
- Configuration changes

### Low Confidence (Full Verify)
- Complex logic generation
- Security-sensitive code
- Novel algorithms
- Multi-step reasoning

## Scoring Algorithm

```typescript
interface ConfidenceFactors {
  taskComplexity: number;      // 0-1, lower is simpler
  outputLength: number;        // Token count
  modelTier: 'haiku' | 'sonnet' | 'opus';
  hasExamples: boolean;
  isWellDefined: boolean;
  isReversible: boolean;
}

function calculateConfidence(factors: ConfidenceFactors): number {
  let confidence = 1.0;

  // Task complexity reduces confidence
  confidence -= factors.taskComplexity * 0.4;

  // Long outputs have more potential errors
  if (factors.outputLength > 1000) confidence -= 0.1;
  if (factors.outputLength > 5000) confidence -= 0.2;

  // Model tier affects base confidence
  const tierBonus = {
    haiku: 0,
    sonnet: 0.1,
    opus: 0.2,
  };
  confidence += tierBonus[factors.modelTier];

  // Examples increase confidence
  if (factors.hasExamples) confidence += 0.15;

  // Well-defined tasks are more reliable
  if (factors.isWellDefined) confidence += 0.1;

  // Reversible operations can afford lower confidence
  if (factors.isReversible) confidence += 0.1;

  return Math.max(0, Math.min(1, confidence));
}
```

## Confidence-Based Actions

```typescript
interface ConfidenceThresholds {
  trustDirectly: 0.9;     // No verification needed
  quickVerify: 0.7;       // Simple syntax/type check
  fullVerify: 0.5;        // Run tests, check logic
  rejectAndRetry: 0.3;    // Too risky, regenerate
}

async function handleOutput(
  output: string,
  confidence: number,
  context: TaskContext
): Promise<FinalOutput> {
  if (confidence >= 0.9) {
    // High confidence - trust directly
    return { output, verified: false, confidence };
  }

  if (confidence >= 0.7) {
    // Medium confidence - quick verify
    const valid = await quickVerify(output);
    if (valid) return { output, verified: true, confidence };
  }

  if (confidence >= 0.5) {
    // Lower confidence - full verification
    const result = await fullVerify(output, context);
    if (result.valid) return { output, verified: true, confidence };

    // Try to fix issues
    const fixed = await refineOutput(output, result.issues);
    return { output: fixed, verified: true, confidence: confidence + 0.1 };
  }

  // Very low confidence - regenerate
  return regenerate(context);
}
```

## Confidence Signals

```typescript
const CONFIDENCE_SIGNALS = {
  // Positive signals
  positive: [
    { signal: 'matches_pattern', boost: 0.2 },
    { signal: 'has_tests', boost: 0.15 },
    { signal: 'simple_task', boost: 0.2 },
    { signal: 'well_specified', boost: 0.15 },
    { signal: 'has_examples', boost: 0.1 },
  ],

  // Negative signals
  negative: [
    { signal: 'complex_logic', penalty: 0.3 },
    { signal: 'security_sensitive', penalty: 0.2 },
    { signal: 'ambiguous_requirements', penalty: 0.2 },
    { signal: 'novel_problem', penalty: 0.25 },
    { signal: 'long_output', penalty: 0.1 },
  ],
};

function detectSignals(task: Task, output: string): Signal[] {
  const signals: Signal[] = [];

  // Check positive signals
  if (matchesKnownPattern(output)) {
    signals.push({ type: 'positive', name: 'matches_pattern' });
  }

  // Check negative signals
  if (output.includes('TODO') || output.includes('FIXME')) {
    signals.push({ type: 'negative', name: 'incomplete_output' });
  }

  return signals;
}
```

## Verification Cost Optimization

| Confidence | Verification | Cost | Time |
|------------|--------------|------|------|
| > 0.9 | None | 0 tokens | 0ms |
| 0.7-0.9 | Quick (Haiku) | 50 tokens | 100ms |
| 0.5-0.7 | Full (Haiku) | 200 tokens | 500ms |
| < 0.5 | Regenerate | 500 tokens | 2s |

## Integration Points
- Works with **First-Pass Validator** for verification
- Coordinates with **Output Refiner** for fixes
- Supports **Consensus Builder** for low confidence cases
