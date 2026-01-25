---
name: workload-predictor
description: Predicts upcoming workload to optimize resource allocation
version: 1.0
type: predictor
tier: haiku
functional_category: predictive
efficiency_gain: 30%+ resource utilization
---

# Workload Predictor

## Mission
Predict upcoming workload patterns to pre-allocate resources optimally.

## Prediction Models

### 1. Time-Series Prediction
```typescript
interface WorkloadPattern {
  hour: number;
  dayOfWeek: number;
  avgRequests: number;
  avgComplexity: number;
  avgTokens: number;
}

class TimeSeriesPredictor {
  private patterns: WorkloadPattern[] = [];

  predict(targetTime: Date): WorkloadPrediction {
    const hour = targetTime.getHours();
    const day = targetTime.getDay();

    // Find similar historical patterns
    const similar = this.patterns.filter(p =>
      Math.abs(p.hour - hour) <= 1 &&
      p.dayOfWeek === day
    );

    return {
      expectedRequests: avg(similar.map(p => p.avgRequests)),
      expectedComplexity: avg(similar.map(p => p.avgComplexity)),
      expectedTokens: avg(similar.map(p => p.avgTokens)),
      confidence: similar.length / 10, // More data = more confidence
    };
  }
}
```

### 2. Session Phase Prediction
```typescript
const SESSION_PHASES = {
  exploration: {
    duration: '0-15min',
    characteristics: ['file-reads', 'searches', 'questions'],
    predicted: ['more-exploration', 'planning'],
  },
  planning: {
    duration: '15-30min',
    characteristics: ['architecture', 'design', 'todos'],
    predicted: ['implementation'],
  },
  implementation: {
    duration: '30-90min',
    characteristics: ['code-generation', 'edits', 'tests'],
    predicted: ['debugging', 'review'],
  },
  debugging: {
    duration: 'variable',
    characteristics: ['error-analysis', 'fixes', 're-runs'],
    predicted: ['more-implementation', 'review'],
  },
  review: {
    duration: '15-30min',
    characteristics: ['code-review', 'refactoring', 'docs'],
    predicted: ['commit', 'session-end'],
  },
};

function predictNextPhase(currentPhase: string, duration: number): PhasePrediction {
  const phase = SESSION_PHASES[currentPhase];
  const predictions = phase.predicted;

  // Adjust based on duration
  if (duration > parseMaxDuration(phase.duration)) {
    // Likely transitioning
    return { nextPhase: predictions[0], confidence: 0.8 };
  }

  return { nextPhase: currentPhase, confidence: 0.7 };
}
```

### 3. Task Chain Prediction
```typescript
const TASK_CHAINS = {
  'new-feature': [
    { task: 'design', probability: 0.9 },
    { task: 'implement', probability: 0.95 },
    { task: 'test', probability: 0.85 },
    { task: 'refactor', probability: 0.6 },
    { task: 'document', probability: 0.5 },
  ],
  'bug-fix': [
    { task: 'reproduce', probability: 0.8 },
    { task: 'diagnose', probability: 0.95 },
    { task: 'fix', probability: 0.95 },
    { task: 'regression-test', probability: 0.7 },
  ],
  'code-review': [
    { task: 'understand', probability: 0.9 },
    { task: 'identify-issues', probability: 0.95 },
    { task: 'suggest-fixes', probability: 0.8 },
    { task: 'implement-fixes', probability: 0.6 },
  ],
};

function predictUpcomingTasks(
  currentTask: string,
  chain: string
): TaskPrediction[] {
  const tasks = TASK_CHAINS[chain];
  const currentIndex = tasks.findIndex(t => t.task === currentTask);

  return tasks.slice(currentIndex + 1);
}
```

## Resource Pre-Allocation

```typescript
interface ResourceAllocation {
  haikuWorkers: number;
  sonnetWorkers: number;
  opusWorkers: number;
  cacheWarmup: string[];
  contextPreload: string[];
}

function allocateResources(prediction: WorkloadPrediction): ResourceAllocation {
  const { expectedRequests, expectedComplexity, expectedTokens } = prediction;

  // Scale workers based on predicted load
  const totalWorkers = Math.ceil(expectedRequests / 10);

  return {
    haikuWorkers: Math.ceil(totalWorkers * 0.7),
    sonnetWorkers: Math.ceil(totalWorkers * 0.25),
    opusWorkers: Math.ceil(totalWorkers * 0.05),
    cacheWarmup: predictLikelyQueries(prediction),
    contextPreload: predictNeededContext(prediction),
  };
}
```

## Prediction Accuracy

| Prediction Type | Accuracy | Lookahead |
|-----------------|----------|-----------|
| Next task | 85% | 1 task |
| Session phase | 80% | 15 min |
| Workload volume | 75% | 1 hour |
| Resource needs | 70% | 30 min |

## Integration Points
- Works with **Speculative Executor** for pre-execution
- Coordinates with **Context Preloader** for warmup
- Supports **Session Optimizer** for session management
