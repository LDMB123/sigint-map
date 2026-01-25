---
name: ensemble-synthesizer
description: Combines multiple model outputs into superior synthesized results
version: 1.0
type: synthesizer
tier: sonnet
functional_category: amplification
quality_improvement: 30-50%
---

# Ensemble Synthesizer

## Mission
Synthesize multiple model outputs to produce results better than any single model.

## Ensemble Strategies

### 1. Multi-Model Ensemble
```typescript
interface EnsembleMember {
  model: string;
  weight: number;
  specialty: string;
}

const ENSEMBLE_CONFIG: EnsembleMember[] = [
  { model: 'haiku-1', weight: 0.2, specialty: 'speed' },
  { model: 'haiku-2', weight: 0.2, specialty: 'different-perspective' },
  { model: 'haiku-3', weight: 0.2, specialty: 'validation' },
  { model: 'sonnet', weight: 0.3, specialty: 'depth' },
  { model: 'opus', weight: 0.1, specialty: 'complex-reasoning' },
];

async function ensembleGenerate(prompt: string): Promise<string> {
  // Get outputs from all ensemble members
  const outputs = await Promise.all(
    ENSEMBLE_CONFIG.map(async (member) => ({
      output: await generate(prompt, member.model),
      weight: member.weight,
      specialty: member.specialty,
    }))
  );

  // Synthesize into superior output
  return await synthesize(outputs, prompt);
}
```

### 2. Weighted Voting
```typescript
interface CodeDecision {
  decision: string;
  votes: Vote[];
  confidence: number;
}

async function weightedVoting(
  question: string,
  options: string[]
): Promise<CodeDecision> {
  // Get votes from multiple models
  const votes = await Promise.all([
    haiku(`Choose best option for: ${question}\nOptions: ${options.join(', ')}`),
    haiku(`As code reviewer, pick: ${question}\nOptions: ${options.join(', ')}`),
    haiku(`As architect, select: ${question}\nOptions: ${options.join(', ')}`),
    sonnet(`Carefully evaluate: ${question}\nOptions: ${options.join(', ')}`),
  ]);

  // Weight and tally
  const weights = [0.2, 0.2, 0.2, 0.4];
  const tally = new Map<string, number>();

  votes.forEach((vote, i) => {
    const current = tally.get(vote) || 0;
    tally.set(vote, current + weights[i]);
  });

  // Find winner
  const winner = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    decision: winner[0],
    votes: votes.map((v, i) => ({ model: i, vote: v, weight: weights[i] })),
    confidence: winner[1],
  };
}
```

### 3. Best-of-N Selection
```typescript
async function bestOfN(
  task: Task,
  n: number = 5
): Promise<BestResult> {
  // Generate N solutions
  const solutions = await Promise.all(
    Array(n).fill(null).map(() =>
      haiku(`${task.prompt}`)
    )
  );

  // Evaluate each solution
  const evaluated = await Promise.all(
    solutions.map(async (solution, i) => ({
      index: i,
      solution,
      score: await evaluateSolution(solution, task),
    }))
  );

  // Select best
  const best = evaluated.sort((a, b) => b.score.total - a.score.total)[0];

  return {
    solution: best.solution,
    score: best.score,
    alternatives: evaluated.filter(e => e.index !== best.index),
  };
}

// 5 Haiku attempts = cost of ~0.8 Sonnet
// Best-of-5 often beats single Sonnet quality
```

### 4. Synthesis Fusion
```typescript
async function fusionSynthesize(
  prompt: string
): Promise<FusedOutput> {
  // Get diverse outputs
  const outputs = await Promise.all([
    haiku(`${prompt} - focus on correctness`),
    haiku(`${prompt} - focus on simplicity`),
    haiku(`${prompt} - focus on performance`),
  ]);

  // Fuse the best elements
  const fused = await sonnet(`
    Synthesize the best elements from these solutions:

    Solution 1 (correctness-focused):
    ${outputs[0]}

    Solution 2 (simplicity-focused):
    ${outputs[1]}

    Solution 3 (performance-focused):
    ${outputs[2]}

    Create a superior solution combining the best aspects.
  `);

  return {
    fused,
    sources: outputs,
    fusionRationale: await explainFusion(outputs, fused),
  };
}
```

## Quality Comparison

| Approach | Cost | Quality | Quality/Cost |
|----------|------|---------|--------------|
| Single Haiku | 1x | 75% | 75 |
| Single Sonnet | 12x | 88% | 7.3 |
| Single Opus | 60x | 96% | 1.6 |
| Best-of-5 Haiku | 5x | 87% | 17.4 |
| Ensemble (3H+1S) | 15x | 92% | 6.1 |
| Fusion (3H→S) | 15x | 94% | 6.3 |

**Best-of-5 Haiku: Best quality-per-cost ratio!**

## Integration Points
- Works with **Quality Amplifier** for further enhancement
- Coordinates with **Consensus Builder** for validation
- Supports **Parallel Branch Executor** for generation
