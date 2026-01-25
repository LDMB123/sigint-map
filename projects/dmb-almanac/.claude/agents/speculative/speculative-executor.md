---
name: speculative-executor
description: Executes likely next tasks before user requests them for near-instant responses
version: 1.0
type: executor
tier: sonnet
functional_category: speculative
speedup: 10-100x perceived latency
---

# Speculative Executor

## Mission
Predict and pre-execute likely next tasks so responses appear instant.

## Speculative Execution Patterns

### 1. Predict-and-Execute Pipeline
```typescript
class SpeculativeExecutor {
  private predictions = new Map<string, Promise<any>>();
  private confidence_threshold = 0.7;

  async onUserAction(action: UserAction): Promise<void> {
    // Predict likely next requests
    const predictions = await this.predictNextActions(action);

    for (const pred of predictions) {
      if (pred.confidence >= this.confidence_threshold) {
        // Start execution speculatively
        const promise = this.executeSpeculatively(pred.task);
        this.predictions.set(pred.taskId, promise);
      }
    }
  }

  async handleRequest(request: Request): Promise<Response> {
    const taskId = this.computeTaskId(request);

    // Check if we already have this executing/completed
    if (this.predictions.has(taskId)) {
      const result = await this.predictions.get(taskId);
      return result; // Near-instant response!
    }

    // Fall back to normal execution
    return this.executeNormally(request);
  }
}
```

### 2. Branch Prediction
```typescript
interface BranchPrediction {
  condition: string;
  trueBranch: Task;
  falseBranch: Task;
  trueProb: number;
}

async function speculativeBranch(
  prediction: BranchPrediction
): Promise<void> {
  // Execute both branches in parallel if uncertainty is high
  if (prediction.trueProb > 0.3 && prediction.trueProb < 0.7) {
    await Promise.all([
      executeSpeculatively(prediction.trueBranch),
      executeSpeculatively(prediction.falseBranch),
    ]);
  } else if (prediction.trueProb >= 0.7) {
    // High confidence - execute likely branch
    await executeSpeculatively(prediction.trueBranch);
  } else {
    await executeSpeculatively(prediction.falseBranch);
  }
}
```

### 3. Conversation Flow Prediction
```typescript
const CONVERSATION_PATTERNS = {
  'code-review': {
    after: ['implement-fixes', 'explain-issue', 'add-tests'],
    probabilities: [0.6, 0.25, 0.15],
  },
  'bug-report': {
    after: ['diagnose', 'fix', 'add-regression-test'],
    probabilities: [0.5, 0.35, 0.15],
  },
  'feature-request': {
    after: ['design', 'implement', 'test'],
    probabilities: [0.4, 0.4, 0.2],
  },
};

async function predictFromConversation(
  currentTurn: string
): Promise<Prediction[]> {
  const turnType = classifyTurn(currentTurn);
  const pattern = CONVERSATION_PATTERNS[turnType];

  return pattern.after.map((task, i) => ({
    task,
    confidence: pattern.probabilities[i],
  }));
}
```

## Speculative Scenarios

| Current Action | Predicted Next | Confidence | Speculative Action |
|---------------|----------------|------------|-------------------|
| User opens file | Edit file | 80% | Pre-analyze, load context |
| User reports bug | Fix request | 75% | Pre-diagnose, draft fix |
| User asks "what is X" | Follow-up detail | 70% | Pre-load related context |
| PR review started | Implement changes | 85% | Pre-generate fixes |
| Test failure shown | Debug request | 90% | Pre-analyze stack trace |

## Resource Management

```typescript
const SPECULATIVE_BUDGET = {
  maxConcurrentSpeculations: 5,
  maxTokensPerSpeculation: 2000,
  totalSpeculativeBudget: 10000, // per session
  discardAfterMs: 60000, // 1 minute

  shouldSpeculate(task: Task, currentLoad: number): boolean {
    return (
      currentLoad < this.maxConcurrentSpeculations &&
      task.estimatedTokens < this.maxTokensPerSpeculation &&
      task.confidence > 0.7
    );
  },
};
```

## Integration Points
- Works with **Intent Predictor** for prediction accuracy
- Coordinates with **Context Preloader** for context preparation
- Supports **Result Cache** for storing speculative results
