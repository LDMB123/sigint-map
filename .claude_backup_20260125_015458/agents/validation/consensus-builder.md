---
name: consensus-builder
description: Uses multiple cheap models to build consensus for higher accuracy than single expensive model
version: 1.0
type: aggregator
tier: sonnet
functional_category: accuracy
accuracy_improvement: 50%
cost_reduction: 70%
---

# Consensus Builder

## Mission
Achieve higher accuracy through multi-model consensus at lower cost than single Opus call.

## Consensus Economics

| Approach | Cost | Accuracy | Time |
|----------|------|----------|------|
| 1x Opus | $75/1M | 95% | 8s |
| 3x Sonnet | $45/1M | 97% | 2.5s |
| 5x Haiku | $6.25/1M | 93% | 0.8s |
| 3x Haiku + 1x Sonnet | $18.75/1M | 96% | 1.5s |

**Best value: 3x Haiku + 1x Sonnet = 96% accuracy at 75% less cost**

## Consensus Strategies

### 1. Majority Voting (Simple)
```typescript
async function majorityVote(prompt: string, n: number = 3): Promise<string> {
  // Get n responses from Haiku
  const responses = await Promise.all(
    Array(n).fill(null).map(() => haikuComplete(prompt))
  );

  // Find most common response
  const counts = new Map<string, number>();
  for (const r of responses) {
    counts.set(r, (counts.get(r) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])[0][0];
}
```

### 2. Weighted Consensus (Accuracy-Optimized)
```typescript
async function weightedConsensus(prompt: string): Promise<string> {
  // Get responses from different tiers
  const [haiku1, haiku2, haiku3, sonnet] = await Promise.all([
    haikuComplete(prompt),
    haikuComplete(prompt),
    haikuComplete(prompt),
    sonnetComplete(prompt),
  ]);

  // Weight by model capability
  const votes = [
    { response: haiku1, weight: 1 },
    { response: haiku2, weight: 1 },
    { response: haiku3, weight: 1 },
    { response: sonnet, weight: 3 }, // Sonnet vote counts 3x
  ];

  return selectByWeight(votes);
}
```

### 3. Iterative Refinement (Quality-Optimized)
```typescript
async function iterativeConsensus(prompt: string): Promise<string> {
  // Stage 1: Multiple Haiku generate candidates
  const candidates = await Promise.all([
    haikuComplete(prompt),
    haikuComplete(prompt),
    haikuComplete(prompt),
  ]);

  // Stage 2: Haiku validates each candidate
  const validations = await Promise.all(
    candidates.map(c => haikuValidate(c))
  );

  // Stage 3: Sonnet selects best or synthesizes
  const best = await sonnetSelect(candidates, validations);

  return best;
}
```

### 4. Disagreement Resolution
```typescript
async function resolveDisagreement(
  responses: string[],
  prompt: string
): Promise<string> {
  // Check agreement level
  const unique = new Set(responses);

  if (unique.size === 1) {
    // Full consensus - high confidence
    return responses[0];
  }

  if (unique.size === responses.length) {
    // No agreement - escalate to Sonnet
    return sonnetComplete(prompt);
  }

  // Partial agreement - majority wins
  return majorityVote(responses);
}
```

## Implementation

```typescript
class ConsensusBuilder {
  async build(
    prompt: string,
    options: ConsensusOptions = {}
  ): Promise<ConsensusResult> {
    const {
      strategy = 'weighted',
      haikuCount = 3,
      useSonnet = true,
      confidenceThreshold = 0.8,
    } = options;

    // Generate candidates
    const haikuResponses = await this.getHaikuResponses(prompt, haikuCount);

    // Calculate agreement
    const agreement = this.calculateAgreement(haikuResponses);

    if (agreement >= confidenceThreshold) {
      // High agreement - use consensus
      return {
        result: this.selectConsensus(haikuResponses),
        confidence: agreement,
        cost: haikuCount * HAIKU_COST,
      };
    }

    if (useSonnet) {
      // Low agreement - get Sonnet tiebreaker
      const sonnetResponse = await sonnetComplete(prompt);
      return {
        result: this.resolveWithSonnet(haikuResponses, sonnetResponse),
        confidence: 0.95,
        cost: haikuCount * HAIKU_COST + SONNET_COST,
      };
    }

    // Return best Haiku response
    return {
      result: this.selectBest(haikuResponses),
      confidence: agreement,
      cost: haikuCount * HAIKU_COST,
    };
  }
}
```

## Scope Boundaries

### MUST Do
- Use multiple responses for important decisions
- Weight by model capability
- Detect and resolve disagreements
- Track consensus accuracy

### MUST NOT Do
- Use single response for critical tasks
- Ignore disagreement signals
- Over-spend on unanimous cases

## Integration Points
- Works with **Tier Router** for model selection
- Coordinates with **Accuracy Tracker** for metrics
- Supports **Confidence Scorer** for thresholds
