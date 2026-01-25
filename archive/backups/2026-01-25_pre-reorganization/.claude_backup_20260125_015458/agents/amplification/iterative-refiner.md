---
name: iterative-refiner
description: Iteratively refines outputs until quality threshold is met
version: 1.0
type: refiner
tier: haiku
functional_category: amplification
quality_guarantee: Meets target or reports inability
---

# Iterative Refiner

## Mission
Keep refining output until it meets quality threshold or max iterations reached.

## Refinement Loop

### 1. Quality-Gated Iteration
```typescript
interface RefinementConfig {
  qualityThreshold: number;
  maxIterations: number;
  earlyStopImprovement: number;
}

async function refineUntilQuality(
  initial: string,
  config: RefinementConfig
): Promise<RefinementResult> {
  let current = initial;
  let currentQuality = await assessQuality(current);
  const history: RefinementStep[] = [];

  for (let i = 0; i < config.maxIterations; i++) {
    // Check if quality threshold met
    if (currentQuality >= config.qualityThreshold) {
      return {
        output: current,
        quality: currentQuality,
        iterations: i,
        history,
        status: 'threshold-met',
      };
    }

    // Identify weaknesses
    const weaknesses = await identifyWeaknesses(current);

    // Refine to address weaknesses
    const refined = await haiku(`
      Improve this output by addressing these issues:
      Issues: ${weaknesses.join(', ')}

      Current output:
      ${current}

      Return improved version.
    `);

    const newQuality = await assessQuality(refined);

    // Track progress
    history.push({
      iteration: i,
      quality: newQuality,
      improvement: newQuality - currentQuality,
      weaknessesAddressed: weaknesses,
    });

    // Early stop if no improvement
    if (newQuality - currentQuality < config.earlyStopImprovement) {
      return {
        output: refined,
        quality: newQuality,
        iterations: i + 1,
        history,
        status: 'improvement-stalled',
      };
    }

    current = refined;
    currentQuality = newQuality;
  }

  return {
    output: current,
    quality: currentQuality,
    iterations: config.maxIterations,
    history,
    status: 'max-iterations',
  };
}
```

### 2. Targeted Refinement
```typescript
const REFINEMENT_TARGETS = {
  code: {
    targets: ['bugs', 'security', 'performance', 'readability'],
    assessors: {
      bugs: assessBugs,
      security: assessSecurity,
      performance: assessPerformance,
      readability: assessReadability,
    },
  },
  documentation: {
    targets: ['accuracy', 'completeness', 'clarity', 'examples'],
    assessors: {
      accuracy: assessAccuracy,
      completeness: assessCompleteness,
      clarity: assessClarity,
      examples: assessExamples,
    },
  },
};

async function targetedRefinement(
  output: string,
  type: string
): Promise<string> {
  const config = REFINEMENT_TARGETS[type];
  let current = output;

  for (const target of config.targets) {
    const score = await config.assessors[target](current);

    if (score < 0.8) {
      current = await haiku(`
        Improve the ${target} of this ${type}:
        Current score: ${score}/1.0
        Target: 0.9/1.0

        ${current}
      `);
    }
  }

  return current;
}
```

### 3. Self-Critique Loop
```typescript
async function selfCritiqueLoop(
  output: string,
  maxRounds: number = 3
): Promise<string> {
  let current = output;

  for (let round = 0; round < maxRounds; round++) {
    // Self-critique
    const critique = await haiku(`
      Critically evaluate this output. List specific issues:
      ${current}
    `);

    // Check if critique found issues
    if (critique.toLowerCase().includes('no issues') ||
        critique.toLowerCase().includes('looks good')) {
      break; // Quality achieved
    }

    // Address critique
    current = await haiku(`
      Address this feedback:
      ${critique}

      Original:
      ${current}

      Return improved version.
    `);
  }

  return current;
}
```

## Refinement Metrics

| Iteration | Typical Quality | Cumulative Cost |
|-----------|-----------------|-----------------|
| 0 (initial) | 75% | 1.0x |
| 1 | 82% | 1.5x |
| 2 | 87% | 2.0x |
| 3 | 90% | 2.5x |
| 4 | 92% | 3.0x |
| 5 | 93% | 3.5x |

**Diminishing returns after iteration 3**

## Smart Stopping

```typescript
function shouldContinueRefining(
  history: RefinementStep[]
): boolean {
  if (history.length === 0) return true;

  // Stop if quality threshold met
  const latest = history[history.length - 1];
  if (latest.quality >= TARGET_QUALITY) return false;

  // Stop if improvement stalled (3 iterations with < 1% gain)
  if (history.length >= 3) {
    const recent = history.slice(-3);
    const avgImprovement = avg(recent.map(s => s.improvement));
    if (avgImprovement < 0.01) return false;
  }

  // Stop if max iterations
  if (history.length >= MAX_ITERATIONS) return false;

  return true;
}
```

## Integration Points
- Works with **Quality Amplifier** for enhancement strategies
- Coordinates with **Confidence Scorer** for quality assessment
- Supports **Self-Consistency Checker** for validation
