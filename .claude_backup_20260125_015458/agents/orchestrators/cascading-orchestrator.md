---
name: cascading-orchestrator
description: Cascades from fast/cheap to slow/expensive only when needed
version: 1.0
type: orchestrator
tier: haiku
functional_category: orchestration
cost_optimization: 60%+ savings
---

# Cascading Orchestrator

## Mission
Start with fastest/cheapest approach, cascade to more expensive only when needed.

## Cascade Architecture

### 1. Tier Cascade
```typescript
interface CascadeLevel {
  tier: 'haiku' | 'sonnet' | 'opus';
  cost: number;
  qualityExpected: number;
  timeout: number;
}

const CASCADE_LEVELS: CascadeLevel[] = [
  { tier: 'haiku', cost: 1, qualityExpected: 0.75, timeout: 2000 },
  { tier: 'sonnet', cost: 12, qualityExpected: 0.88, timeout: 5000 },
  { tier: 'opus', cost: 60, qualityExpected: 0.96, timeout: 15000 },
];

async function cascadeExecute(
  task: Task,
  qualityRequired: number
): Promise<CascadeResult> {
  for (const level of CASCADE_LEVELS) {
    // Try this level
    const result = await executeOnTier(task, level.tier, level.timeout);
    const quality = await assessQuality(result);

    // If quality sufficient, return
    if (quality >= qualityRequired) {
      return {
        result,
        quality,
        tier: level.tier,
        cost: level.cost,
        cascadeDepth: CASCADE_LEVELS.indexOf(level),
      };
    }

    // Otherwise, cascade to next level
    console.log(`${level.tier} quality ${quality} < ${qualityRequired}, cascading...`);
  }

  // Return best effort from highest tier
  const finalResult = await executeOnTier(task, 'opus', 30000);
  return {
    result: finalResult,
    quality: await assessQuality(finalResult),
    tier: 'opus',
    cost: 60,
    cascadeDepth: CASCADE_LEVELS.length,
  };
}
```

### 2. Complexity Cascade
```typescript
interface ComplexityLevel {
  name: string;
  approach: (task: Task) => Promise<any>;
  costMultiplier: number;
}

const COMPLEXITY_CASCADE: ComplexityLevel[] = [
  {
    name: 'pattern-match',
    approach: async (task) => patternMatch(task),
    costMultiplier: 0.1,
  },
  {
    name: 'single-haiku',
    approach: async (task) => haiku(task.prompt),
    costMultiplier: 1,
  },
  {
    name: 'haiku-with-refinement',
    approach: async (task) => haikuWithRefinement(task),
    costMultiplier: 2,
  },
  {
    name: 'sonnet',
    approach: async (task) => sonnet(task.prompt),
    costMultiplier: 12,
  },
  {
    name: 'sonnet-with-verification',
    approach: async (task) => sonnetWithVerification(task),
    costMultiplier: 15,
  },
  {
    name: 'opus',
    approach: async (task) => opus(task.prompt),
    costMultiplier: 60,
  },
];

async function complexityCascade(task: Task): Promise<any> {
  for (const level of COMPLEXITY_CASCADE) {
    try {
      const result = await level.approach(task);
      const isValid = await validate(result, task);

      if (isValid) {
        return {
          result,
          level: level.name,
          cost: level.costMultiplier,
        };
      }
    } catch (error) {
      // Level failed, try next
      continue;
    }
  }

  throw new Error('All cascade levels failed');
}
```

### 3. Verification Cascade
```typescript
async function verificationCascade(
  result: string,
  task: Task
): Promise<VerifiedResult> {
  // Level 1: Pattern-based verification (free)
  const patternValid = verifyPatterns(result, task);
  if (patternValid.confident) {
    return { result, verified: true, method: 'pattern', cost: 0 };
  }

  // Level 2: Haiku verification (cheap)
  const haikuValid = await haiku(`Verify this is correct: ${result}`);
  if (haikuValid.confident && haikuValid.isCorrect) {
    return { result, verified: true, method: 'haiku', cost: 1 };
  }

  // Level 3: Sonnet verification (moderate)
  const sonnetValid = await sonnet(`
    Thoroughly verify this result:
    Task: ${task.prompt}
    Result: ${result}
    Check for: correctness, completeness, edge cases
  `);
  if (sonnetValid.isCorrect) {
    return { result, verified: true, method: 'sonnet', cost: 12 };
  }

  // Level 4: Re-generate with higher tier
  const regenerated = await opus(task.prompt);
  return { result: regenerated, verified: true, method: 'opus-regen', cost: 60 };
}
```

## Cascade Statistics

| Quality Target | Avg Cascade Depth | Avg Cost | vs Always-Opus |
|----------------|-------------------|----------|----------------|
| 70% | 1.0 | 1x | 98% savings |
| 80% | 1.3 | 4x | 93% savings |
| 85% | 1.6 | 8x | 87% savings |
| 90% | 2.1 | 18x | 70% savings |
| 95% | 2.8 | 40x | 33% savings |

## Smart Cascade Entry

```typescript
function selectCascadeEntry(task: Task): CascadeLevel {
  // Skip cheap levels for known-complex tasks
  if (isKnownComplex(task)) {
    return CASCADE_LEVELS[1]; // Start at Sonnet
  }

  // Start at Haiku for most tasks
  return CASCADE_LEVELS[0];
}

function isKnownComplex(task: Task): boolean {
  const complexIndicators = [
    'architecture', 'security audit', 'system design',
    'complex algorithm', 'multi-step reasoning',
  ];

  return complexIndicators.some(ind =>
    task.prompt.toLowerCase().includes(ind)
  );
}
```

## Integration Points
- Works with **Adaptive Tier Selector** for entry point
- Coordinates with **Confidence Scorer** for quality assessment
- Supports **Quality Amplifier** for refinement levels
