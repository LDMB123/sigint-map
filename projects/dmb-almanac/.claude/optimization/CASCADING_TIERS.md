# Cascading Tier System

> 5-10x cost reduction through intelligent model tier selection

---

## Principle

**Start cheap, escalate only when necessary.**

```
Request → Haiku (attempt) → Success? Return
                    ↓
                  Failure
                    ↓
           Sonnet (attempt) → Success? Return
                    ↓
                  Failure
                    ↓
           Opus (guaranteed)
```

---

## Tier Definitions

| Tier | Model | Cost | Speed | Use Case |
|------|-------|------|-------|----------|
| **T1** | Haiku | $0.25/M | 50ms | Simple tasks, validation, routing |
| **T2** | Sonnet | $3/M | 200ms | Implementation, debugging, analysis |
| **T3** | Opus | $15/M | 500ms | Architecture, complex reasoning |

**Cost ratios: Haiku:Sonnet:Opus = 1:12:60**

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                      CASCADING TIER ENGINE                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐                                                   │
│  │   Request   │                                                   │
│  └──────┬──────┘                                                   │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │
│  │ Complexity  │────▶│ Tier        │────▶│ Execution   │          │
│  │ Analyzer    │     │ Selector    │     │ Engine      │          │
│  └─────────────┘     └─────────────┘     └──────┬──────┘          │
│         │                   │                    │                  │
│         │                   │                    ▼                  │
│         │                   │           ┌─────────────┐            │
│         │                   │           │ Quality     │            │
│         │                   │           │ Validator   │            │
│         │                   │           └──────┬──────┘            │
│         │                   │                  │                    │
│         │                   │         Pass?────┴────Fail?          │
│         │                   │           │              │            │
│         │                   │           ▼              ▼            │
│         │                   │       Return        Escalate          │
│         │                   │                     to T+1            │
│         │                   │                                       │
└─────────┴───────────────────┴───────────────────────────────────────┘
```

---

## Complexity Analysis

### Automatic Tier Assignment

```typescript
interface ComplexitySignals {
  // Task complexity
  tokenCount: number;           // Prompt length
  questionCount: number;        // Number of questions
  stepCount: number;            // Implied steps
  domainCount: number;          // Cross-domain refs

  // Context complexity
  fileCount: number;            // Files involved
  dependencyDepth: number;      // Dependency chains
  abstractionLevel: number;     // Concept abstraction

  // Historical data
  previousTierUsed: string;     // What worked before
  similarTaskSuccess: number;   // Success rate at each tier
}

function calculateComplexity(signals: ComplexitySignals): number {
  // 0-100 complexity score
  return weightedSum([
    [signals.tokenCount / 1000, 0.15],
    [signals.questionCount * 10, 0.20],
    [signals.stepCount * 8, 0.20],
    [signals.domainCount * 15, 0.15],
    [signals.fileCount * 5, 0.10],
    [signals.abstractionLevel * 20, 0.20],
  ]);
}
```

### Tier Thresholds

```typescript
const TIER_THRESHOLDS = {
  haiku: { max: 30 },      // Simple: 0-30
  sonnet: { min: 25, max: 70 },  // Medium: 25-70
  opus: { min: 65 },       // Complex: 65+
};

// Overlap zones for graceful degradation
// Score 25-30: Try Haiku first, escalate if needed
// Score 65-70: Try Sonnet first, escalate if needed
```

---

## Task Classification

### Tier 1 (Haiku) Tasks - 60% of workload

```yaml
haiku_tasks:
  validation:
    - syntax checking
    - format verification
    - type validation
    - lint rule checking

  simple_queries:
    - file location
    - symbol lookup
    - pattern matching
    - config reading

  routing:
    - agent selection
    - skill matching
    - domain classification

  generation:
    - boilerplate code
    - simple templates
    - documentation stubs
```

### Tier 2 (Sonnet) Tasks - 35% of workload

```yaml
sonnet_tasks:
  implementation:
    - feature development
    - bug fixes
    - refactoring
    - test writing

  debugging:
    - error analysis
    - stack trace interpretation
    - performance investigation

  analysis:
    - code review
    - security scanning
    - dependency auditing
```

### Tier 3 (Opus) Tasks - 5% of workload

```yaml
opus_tasks:
  architecture:
    - system design
    - migration planning
    - API design

  complex_reasoning:
    - multi-step debugging
    - performance optimization strategy
    - security threat modeling

  orchestration:
    - multi-agent coordination
    - complex workflow management
```

---

## Escalation Protocol

### Automatic Escalation Triggers

```typescript
interface EscalationTriggers {
  // Quality failures
  confidenceBelowThreshold: boolean;  // Output confidence < 0.7
  validationFailed: boolean;          // Output doesn't pass checks
  userRejected: boolean;              // User asked for redo

  // Complexity mismatch
  outputTruncated: boolean;           // Hit token limit
  contextOverflow: boolean;           // Needed more context
  multipleAttempts: boolean;          // Retried > 2 times

  // Explicit signals
  taskEscalated: boolean;             // Task marked complex
  userRequested: boolean;             // User asked for better model
}

function shouldEscalate(triggers: EscalationTriggers): boolean {
  return Object.values(triggers).some(v => v === true);
}
```

### Escalation with Context Preservation

```typescript
async function escalate(
  task: Task,
  currentTier: Tier,
  previousResult: Result
): Promise<Result> {
  const nextTier = getNextTier(currentTier);

  // Preserve context from failed attempt
  const escalatedTask = {
    ...task,
    context: {
      ...task.context,
      previousAttempt: previousResult,
      escalationReason: identifyReason(previousResult),
      hints: extractHints(previousResult),
    }
  };

  return execute(escalatedTask, nextTier);
}
```

---

## Cost Optimization Results

### Before Cascading (all Sonnet)

```
100 tasks × $3/M × 2000 tokens = $0.60
```

### After Cascading

```
60 tasks (Haiku)  × $0.25/M × 1500 tokens = $0.0225
35 tasks (Sonnet) × $3/M × 2000 tokens    = $0.21
5 tasks (Opus)    × $15/M × 3000 tokens   = $0.225

Total: $0.4575 (24% savings)
```

### With Speculation (Haiku for pre-compute)

```
140 speculative × $0.25/M × 1000 tokens = $0.035
60 tasks (Haiku)  × $0.25/M × 1500 tokens = $0.0225
30 tasks (Sonnet) × $3/M × 2000 tokens    = $0.18
5 tasks (Opus)    × $15/M × 3000 tokens   = $0.225

Total: $0.4625 (speculation nearly free!)
```

---

## Quality Assurance

### Per-Tier Validation

```typescript
const VALIDATORS = {
  haiku: {
    // Fast, simple checks
    syntaxValid: (r) => parseable(r.output),
    notEmpty: (r) => r.output.length > 10,
    confidenceOk: (r) => r.confidence > 0.6,
  },

  sonnet: {
    // Comprehensive checks
    ...VALIDATORS.haiku,
    logicalFlow: (r) => checkLogic(r.output),
    completeness: (r) => checkComplete(r.output, r.task),
    confidenceOk: (r) => r.confidence > 0.75,
  },

  opus: {
    // Strict quality
    ...VALIDATORS.sonnet,
    architecturalSoundness: (r) => checkArchitecture(r.output),
    edgeCasesCovered: (r) => checkEdgeCases(r.output),
    confidenceOk: (r) => r.confidence > 0.85,
  }
};
```

### Feedback Loop

```typescript
// Track tier success rates
interface TierMetrics {
  tier: string;
  taskType: string;
  successRate: number;
  escalationRate: number;
  avgLatency: number;
}

// Adjust thresholds based on metrics
function recalibrateThresholds(metrics: TierMetrics[]) {
  // If Haiku escalation rate > 20% for task type,
  // lower the complexity threshold for that task type
}
```

---

## Integration

### With Zero-Overhead Router

```typescript
router.config = {
  defaultTier: 'haiku',          // Start cheap
  complexityAnalysis: true,       // Enable analysis
  autoEscalation: true,           // Enable cascading
};
```

### With Speculative Execution

```typescript
speculator.config = {
  speculationTier: 'haiku',       // Always use Haiku
  refinementTier: 'sonnet',       // Upgrade if needed
  maxSpeculations: 5,             // Limit parallel specs
};
```

---

## Version

**Version**: 1.0.0
**Last Updated**: 2025-01-22
