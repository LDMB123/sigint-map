---
name: adaptive-tier-selector
description: Dynamically selects optimal model tier based on task complexity and quality requirements
version: 1.0
type: selector
tier: haiku
functional_category: predictive
optimization: Quality-per-token maximization
---

# Adaptive Tier Selector

## Mission
Maximize quality-per-token by dynamically routing to the optimal model tier.

## Adaptive Selection Algorithm

### 1. Multi-Factor Scoring
```typescript
interface TaskFactors {
  complexity: number;      // 0-1
  novelty: number;         // 0-1
  criticality: number;     // 0-1
  contextSize: number;     // tokens
  outputExpected: number;  // tokens
  timeConstraint: number;  // ms
  qualityFloor: number;    // minimum acceptable quality
}

function selectTier(factors: TaskFactors): TierDecision {
  // Compute composite score
  const complexityScore = factors.complexity * 0.3 +
                          factors.novelty * 0.25 +
                          factors.criticality * 0.25 +
                          (factors.contextSize / 100000) * 0.1 +
                          (factors.outputExpected / 10000) * 0.1;

  // Tier thresholds with hysteresis
  if (complexityScore > 0.8 || factors.qualityFloor > 0.95) {
    return { tier: 'opus', confidence: 0.9, reasoning: 'High complexity/criticality' };
  }

  if (complexityScore > 0.5 || factors.qualityFloor > 0.85) {
    return { tier: 'sonnet', confidence: 0.85, reasoning: 'Moderate complexity' };
  }

  // Check if Haiku can meet quality floor
  const haikuQuality = estimateHaikuQuality(factors);
  if (haikuQuality >= factors.qualityFloor) {
    return { tier: 'haiku', confidence: 0.9, reasoning: 'Haiku sufficient' };
  }

  return { tier: 'sonnet', confidence: 0.7, reasoning: 'Quality floor requires Sonnet' };
}
```

### 2. Task Classification
```typescript
const TASK_COMPLEXITY_MAP = {
  // Haiku-appropriate (complexity < 0.4)
  simple: [
    'format-code',
    'lint-check',
    'type-validation',
    'simple-refactor',
    'documentation-update',
    'test-generation-simple',
    'syntax-check',
  ],

  // Sonnet-appropriate (0.4 < complexity < 0.75)
  moderate: [
    'bug-fix',
    'feature-implementation',
    'code-review',
    'performance-optimization',
    'api-design',
    'test-generation-complex',
  ],

  // Opus-appropriate (complexity > 0.75)
  complex: [
    'architecture-design',
    'security-audit',
    'complex-debugging',
    'algorithm-design',
    'system-design',
    'migration-planning',
  ],
};

function classifyTask(task: string): ComplexityLevel {
  for (const [level, tasks] of Object.entries(TASK_COMPLEXITY_MAP)) {
    if (tasks.some(t => task.toLowerCase().includes(t))) {
      return level as ComplexityLevel;
    }
  }
  return 'moderate'; // Default to middle tier
}
```

### 3. Quality-Aware Routing
```typescript
interface QualityRequirements {
  minAccuracy: number;
  maxLatency: number;
  budgetRemaining: number;
}

function routeWithQuality(
  task: Task,
  requirements: QualityRequirements
): RoutingDecision {
  const tiers = [
    { tier: 'haiku', quality: 0.75, latency: 500, cost: 1 },
    { tier: 'sonnet', quality: 0.88, latency: 1500, cost: 12 },
    { tier: 'opus', quality: 0.96, latency: 3000, cost: 60 },
  ];

  // Filter by constraints
  const viable = tiers.filter(t =>
    t.quality >= requirements.minAccuracy &&
    t.latency <= requirements.maxLatency &&
    t.cost <= requirements.budgetRemaining
  );

  if (viable.length === 0) {
    // Relax constraints progressively
    return selectWithRelaxation(task, requirements);
  }

  // Choose most cost-effective viable option
  return viable.sort((a, b) => a.cost - b.cost)[0];
}
```

## Adaptive Learning

```typescript
class AdaptiveTierLearner {
  private history: TaskOutcome[] = [];

  recordOutcome(
    task: Task,
    tier: string,
    quality: number,
    tokens: number
  ): void {
    this.history.push({ task, tier, quality, tokens, timestamp: Date.now() });
    this.updateModel();
  }

  // Learn which tasks perform better on which tier
  getRecommendedTier(task: Task): TierRecommendation {
    const similar = this.findSimilarTasks(task);

    const tierPerformance = {
      haiku: this.avgQuality(similar, 'haiku'),
      sonnet: this.avgQuality(similar, 'sonnet'),
      opus: this.avgQuality(similar, 'opus'),
    };

    // Quality-per-cost optimization
    const efficiency = {
      haiku: tierPerformance.haiku / 1,
      sonnet: tierPerformance.sonnet / 12,
      opus: tierPerformance.opus / 60,
    };

    // Select tier with best efficiency above quality threshold
    return this.selectOptimal(tierPerformance, efficiency, task.qualityFloor);
  }
}
```

## Tier Selection Matrix

| Task Type | Default Tier | Upgrade Trigger | Downgrade Trigger |
|-----------|--------------|-----------------|-------------------|
| Validation | Haiku | Complex rules | Simple check |
| Generation | Sonnet | Novel domain | Standard pattern |
| Analysis | Sonnet | Security/arch | Surface-level |
| Debugging | Sonnet | Multi-system | Single function |
| Design | Opus | System-wide | Component-level |

## Integration Points
- Works with **Intent Predictor** for task classification
- Coordinates with **Token Optimizer** for budget awareness
- Supports **Quality Amplifier** for quality enhancement
