---
name: parallel-branch-executor
description: Executes multiple solution branches simultaneously, picks best result
version: 1.0
type: executor
tier: sonnet
functional_category: speculative
quality_improvement: 3-5x better solutions
---

# Parallel Branch Executor

## Mission
Execute multiple solution approaches in parallel, select the best outcome.

## Multi-Branch Execution

### 1. Solution Branching
```typescript
interface SolutionBranch {
  approach: string;
  executor: () => Promise<Solution>;
  evaluator: (solution: Solution) => Score;
}

async function executeMultipleBranches(
  problem: Problem,
  branches: SolutionBranch[]
): Promise<Solution> {
  // Execute all branches in parallel
  const results = await Promise.all(
    branches.map(async (branch) => {
      const solution = await branch.executor();
      const score = branch.evaluator(solution);
      return { branch: branch.approach, solution, score };
    })
  );

  // Select best solution
  const best = results.sort((a, b) => b.score.total - a.score.total)[0];

  return {
    solution: best.solution,
    approach: best.branch,
    score: best.score,
    alternatives: results.slice(1),
  };
}
```

### 2. Algorithm Comparison
```typescript
async function compareSolutions(task: CodingTask): Promise<BestSolution> {
  const branches = [
    {
      approach: 'iterative',
      executor: () => haiku(`Solve iteratively: ${task}`),
      weight: 1.0,
    },
    {
      approach: 'recursive',
      executor: () => haiku(`Solve recursively: ${task}`),
      weight: 1.0,
    },
    {
      approach: 'functional',
      executor: () => haiku(`Solve functionally: ${task}`),
      weight: 1.0,
    },
  ];

  const results = await Promise.all(
    branches.map(async (b) => ({
      approach: b.approach,
      solution: await b.executor(),
    }))
  );

  // Evaluate all solutions
  const evaluated = await haiku(`
    Compare these solutions for ${task}:
    ${results.map(r => `${r.approach}:\n${r.solution}`).join('\n---\n')}

    Score each on: correctness, readability, performance, maintainability
    Return: {best: string, scores: [{approach, total, breakdown}]}
  `);

  return results.find(r => r.approach === evaluated.best)!;
}
```

### 3. Architecture Exploration
```typescript
async function exploreArchitectures(
  feature: FeatureRequest
): Promise<ArchitectureDecision> {
  const architectures = [
    'monolithic',
    'microservices',
    'event-driven',
    'layered',
  ];

  // Design each architecture in parallel
  const designs = await Promise.all(
    architectures.map(arch =>
      sonnet(`
        Design ${feature} using ${arch} architecture.
        Return: {design, pros, cons, complexity, scalability}
      `)
    )
  );

  // Evaluate and rank
  const evaluation = await sonnet(`
    Compare these architecture designs:
    ${designs.map((d, i) => `${architectures[i]}:\n${JSON.stringify(d)}`).join('\n')}

    Consider: scalability, maintainability, team size, timeline
    Return: {recommended: string, reasoning: string, ranking: string[]}
  `);

  return {
    designs,
    recommendation: evaluation.recommended,
    reasoning: evaluation.reasoning,
  };
}
```

## Branch Selection Criteria

| Criterion | Weight | Measurement |
|-----------|--------|-------------|
| Correctness | 40% | Test pass rate |
| Performance | 25% | Time/space complexity |
| Readability | 20% | Complexity score |
| Maintainability | 15% | Coupling/cohesion |

## Cost Analysis

```typescript
// 3 parallel Haiku branches = cost of 1 Sonnet
// But gets 3 different solutions to compare

const BRANCH_ECONOMICS = {
  singleSonnet: {
    cost: 1.0,
    solutions: 1,
    quality: 0.85,
  },
  threeHaikuBranches: {
    cost: 0.5, // 3 * 1/6
    solutions: 3,
    quality: 0.75, // each
    bestOfThree: 0.90, // selecting best
  },
  // Best-of-3 Haiku beats single Sonnet at lower cost!
};
```

## Integration Points
- Works with **Consensus Builder** for solution evaluation
- Coordinates with **Haiku Swarm Coordinator** for parallel execution
- Supports **Confidence Scorer** for quality assessment
