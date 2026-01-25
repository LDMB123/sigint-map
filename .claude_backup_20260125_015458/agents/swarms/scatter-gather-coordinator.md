---
name: scatter-gather-coordinator
description: Distributes work to specialized workers and gathers results efficiently
version: 1.0
type: coordinator
tier: haiku
functional_category: swarms
speedup: 5-15x
---

# Scatter-Gather Coordinator

## Mission
Scatter work to specialized parallel workers, gather and synthesize results.

## Pattern Implementation

```typescript
interface ScatterGatherConfig {
  task: string;
  specialists: Specialist[];
  gatherStrategy: 'merge' | 'vote' | 'best' | 'consensus';
}

interface Specialist {
  name: string;
  focus: string;
  tier: 'haiku' | 'sonnet';
}

async function scatterGather(config: ScatterGatherConfig): Promise<Result> {
  const { task, specialists, gatherStrategy } = config;

  // Scatter: send to all specialists in parallel
  const responses = await Promise.all(
    specialists.map(s =>
      executeOnTier(s.tier, `
        As a ${s.name} focused on ${s.focus}:
        ${task}
      `)
    )
  );

  // Gather: combine based on strategy
  return gather(responses, gatherStrategy);
}
```

## Specialist Teams

### Code Review Team
```typescript
const CODE_REVIEW_SPECIALISTS: Specialist[] = [
  { name: 'Security Reviewer', focus: 'vulnerabilities', tier: 'haiku' },
  { name: 'Performance Reviewer', focus: 'efficiency', tier: 'haiku' },
  { name: 'Style Reviewer', focus: 'conventions', tier: 'haiku' },
  { name: 'Logic Reviewer', focus: 'correctness', tier: 'haiku' },
  { name: 'Test Reviewer', focus: 'coverage', tier: 'haiku' },
];

async function parallelCodeReview(code: string): Promise<Review> {
  return scatterGather({
    task: `Review this code:\n${code}`,
    specialists: CODE_REVIEW_SPECIALISTS,
    gatherStrategy: 'merge',
  });
}
// 5 parallel Haiku = same cost as 1 Sonnet, 5x more perspectives
```

### Bug Analysis Team
```typescript
const BUG_ANALYSIS_SPECIALISTS: Specialist[] = [
  { name: 'Root Cause Analyst', focus: 'why it happened', tier: 'haiku' },
  { name: 'Impact Assessor', focus: 'what it affects', tier: 'haiku' },
  { name: 'Fix Generator', focus: 'how to fix', tier: 'haiku' },
  { name: 'Test Designer', focus: 'how to verify', tier: 'haiku' },
];
```

## Gather Strategies

```typescript
function gather(
  responses: Response[],
  strategy: 'merge' | 'vote' | 'best' | 'consensus'
): Result {
  switch (strategy) {
    case 'merge':
      // Combine all findings
      return { findings: responses.flatMap(r => r.findings) };

    case 'vote':
      // Majority vote on recommendations
      return { recommendation: majorityVote(responses) };

    case 'best':
      // Pick highest confidence response
      return responses.sort((a, b) => b.confidence - a.confidence)[0];

    case 'consensus':
      // Find common ground
      return findConsensus(responses);
  }
}
```

## Cost Analysis

| Approach | Tokens | Perspectives | Cost |
|----------|--------|--------------|------|
| 1x Opus | 1000 | 1 | $0.015 |
| 1x Sonnet | 1000 | 1 | $0.003 |
| 5x Haiku | 5000 | 5 | $0.00125 |

**5 Haiku specialists = 58% cheaper than Sonnet, 5x more perspectives**

## Integration Points
- Works with **Haiku Swarm Coordinator** for scatter phase
- Coordinates with **Consensus Builder** for consensus gather
- Supports **Result Aggregator** for merge gather
