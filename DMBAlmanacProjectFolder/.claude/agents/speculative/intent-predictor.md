---
name: intent-predictor
description: Predicts user intent from context to enable proactive execution
version: 1.0
type: predictor
tier: haiku
functional_category: speculative
accuracy: 85%+
---

# Intent Predictor

## Mission
Accurately predict what the user will ask for next to enable speculative execution.

## Prediction Signals

### 1. Context-Based Prediction
```typescript
interface ContextSignals {
  recentFiles: string[];
  recentErrors: Error[];
  recentQueries: string[];
  currentTask: string;
  timeOfDay: string;
  sessionPhase: 'start' | 'middle' | 'end';
}

function predictFromContext(signals: ContextSignals): Intent[] {
  const intents: Intent[] = [];

  // File context signals
  if (signals.recentFiles.some(f => f.includes('.test.'))) {
    intents.push({ type: 'run-tests', confidence: 0.8 });
  }

  // Error context signals
  if (signals.recentErrors.length > 0) {
    intents.push({ type: 'fix-error', confidence: 0.9 });
    intents.push({ type: 'explain-error', confidence: 0.7 });
  }

  // Session phase signals
  if (signals.sessionPhase === 'end') {
    intents.push({ type: 'commit', confidence: 0.75 });
    intents.push({ type: 'summarize', confidence: 0.6 });
  }

  return intents;
}
```

### 2. Pattern-Based Prediction
```typescript
const USER_PATTERNS = {
  // Sequential patterns
  sequences: [
    { pattern: ['read', 'edit'], next: 'test', confidence: 0.8 },
    { pattern: ['test', 'fail'], next: 'debug', confidence: 0.9 },
    { pattern: ['debug', 'fix'], next: 'test', confidence: 0.85 },
    { pattern: ['implement', 'test'], next: 'refactor', confidence: 0.6 },
  ],

  // Time-based patterns
  timePatterns: [
    { time: 'morning', likely: ['review', 'plan'], confidence: 0.7 },
    { time: 'afternoon', likely: ['implement', 'debug'], confidence: 0.75 },
    { time: 'evening', likely: ['commit', 'document'], confidence: 0.65 },
  ],
};

function matchPattern(history: Action[]): Prediction | null {
  for (const seq of USER_PATTERNS.sequences) {
    if (endsWith(history, seq.pattern)) {
      return { task: seq.next, confidence: seq.confidence };
    }
  }
  return null;
}
```

### 3. Semantic Intent Analysis
```typescript
async function analyzeSemanticIntent(
  userMessage: string
): Promise<IntentAnalysis> {
  // Quick Haiku analysis of intent
  return await haiku(`
    Analyze user intent from: "${userMessage}"

    Return JSON:
    {
      primary_intent: string,
      secondary_intents: string[],
      implied_followups: string[],
      confidence: number
    }
  `);
}

// Example:
// Input: "This function is slow"
// Output: {
//   primary_intent: "optimize-performance",
//   secondary_intents: ["profile", "benchmark"],
//   implied_followups: ["implement-optimization", "verify-improvement"],
//   confidence: 0.85
// }
```

## Intent Categories

| Category | Signals | Confidence Boost |
|----------|---------|-----------------|
| Error Resolution | Stack trace, error message | +20% |
| Code Completion | Partial code, TODO comment | +25% |
| Test Execution | Test file open, recent changes | +15% |
| Documentation | New function, public API | +10% |
| Refactoring | Code smell, complexity warning | +15% |

## Prediction Accuracy Tracking

```typescript
class PredictionTracker {
  private predictions: Prediction[] = [];
  private outcomes: Map<string, boolean> = new Map();

  recordPrediction(pred: Prediction): void {
    this.predictions.push(pred);
  }

  recordOutcome(predId: string, wasCorrect: boolean): void {
    this.outcomes.set(predId, wasCorrect);
    this.updateModel(predId, wasCorrect);
  }

  getAccuracy(): number {
    const correct = [...this.outcomes.values()].filter(v => v).length;
    return correct / this.outcomes.size;
  }

  // Adaptive confidence adjustment
  adjustConfidence(baseConfidence: number, category: string): number {
    const categoryAccuracy = this.getCategoryAccuracy(category);
    return baseConfidence * categoryAccuracy;
  }
}
```

## Integration Points
- Works with **Speculative Executor** for pre-execution
- Coordinates with **Context Preloader** for context signals
- Supports **Session Optimizer** for session-aware prediction
