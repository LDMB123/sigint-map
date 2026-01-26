# Escalation Engine

Automatic tier escalation system that detects quality failures and complexity mismatches, enabling intelligent fallback from Haiku → Sonnet → Opus while preserving context.

## Overview

The Escalation Engine monitors model execution quality and automatically escalates to higher tiers when:
- Output quality is below acceptable thresholds
- Model confidence is low
- Response is truncated or incomplete
- Task complexity exceeds current tier's capabilities
- Validation or parsing errors occur

**Target**: Maintain escalation rate <20% through accurate initial tier selection.

## Features

### Quality Detection
- **Confidence Analysis**: Detects when model expresses low confidence
- **Quality Scoring**: Validates output against quality thresholds
- **Truncation Detection**: Identifies incomplete or cut-off responses
- **Validation Checks**: Catches parsing and validation errors

### Complexity Mismatch Detection
- **Response Length Analysis**: Flags suspiciously short responses for complex tasks
- **Multi-domain Detection**: Recognizes when tasks span multiple technical domains
- **Abstraction Level Mismatch**: Detects architectural tasks given implementation responses
- **Question Density**: Analyzes decision-making complexity

### Context Preservation
- **Failed Attempt History**: Preserves partial work from lower tiers
- **Custom Context**: Maintains task-specific metadata
- **Escalation Chain**: Tracks full escalation history
- **Smart Retry**: Uses preserved context to inform higher tier attempts

### Performance Monitoring
- **Escalation Rate Tracking**: Monitors overall escalation rate vs target
- **Reason Analysis**: Breaks down escalations by cause
- **Transition Tracking**: Monitors tier-to-tier escalation patterns
- **Health Status**: Real-time alerts on escalation rate health

## Quick Start

### Basic Usage

```typescript
import { EscalationEngine, createExecutionResult } from '@claude/lib/tiers';

const engine = new EscalationEngine();

// Execute with Haiku
const result = await executeWithHaiku(task);

// Create execution result
const executionResult = createExecutionResult(
  'haiku',
  result.response,
  {
    durationMs: result.durationMs,
    tokenCount: result.tokenCount,
    truncated: result.truncated,
    confidence: result.confidence,
    qualityScore: calculateQuality(result)
  }
);

// Evaluate escalation
const decision = engine.evaluateEscalation(executionResult, 'haiku', task);

if (decision.shouldEscalate) {
  console.log(`Escalating to ${decision.nextTier}: ${decision.reason}`);

  // Preserve context
  const context = engine.preserveContext(executionResult, task);

  // Record escalation
  engine.recordEscalation('haiku', decision.nextTier!, decision.reason!, executionResult, context);

  // Retry with Sonnet
  const sonnetResult = await executeWithSonnet(task, context);
}
```

### Automatic Retry with Escalation

```typescript
import { escalateWithRetry } from '@claude/lib/tiers';

const task = {
  description: 'Implement user authentication with JWT'
};

// Executor function that calls your model
const executor = async (tier: ModelTier, context?: Record<string, any>) => {
  const result = await callModel(tier, task, context);

  return createExecutionResult(
    tier,
    result.response,
    {
      durationMs: result.durationMs,
      tokenCount: result.tokenCount,
      truncated: result.truncated,
      confidence: result.confidence,
      qualityScore: result.qualityScore
    }
  );
};

// Automatic escalation with retry
const { result, escalations } = await escalateWithRetry(
  task,
  executor,
  'haiku' // Start with Haiku
);

console.log(`Final tier: ${result.tier}`);
console.log(`Escalations: ${escalations}`);
```

## Escalation Reasons

### Quality Failures

#### Low Confidence
Model's self-reported confidence is below threshold (default: 0.7).

```typescript
// Detected when:
metadata.confidence < 0.7
```

**Example**: Model responds with "I'm not certain, but..." or hedging language.

#### Quality Threshold
Output quality score is below acceptable level (default: 0.75).

```typescript
// Detected when:
metadata.qualityScore < 0.75
```

**Example**: Response is syntactically correct but semantically weak.

#### Truncated Output
Response was incomplete or cut off due to length limits.

```typescript
// Detected when:
metadata.truncated === true
```

**Example**: Response ends mid-sentence or with "...".

### Validation Failures

#### Validation Error
Output failed validation checks (schema, format, required fields).

```typescript
// Detected when:
error.includes('validation')
```

**Example**: Expected JSON but received malformed data.

#### Parsing Failure
Output couldn't be parsed in expected format.

```typescript
// Detected when:
error.includes('parse')
```

**Example**: Expected structured data but received free text.

### Context Issues

#### Context Overflow
Task exceeded model's context window.

```typescript
// Detected when:
error.includes('context') || error.includes('token limit')
```

**Example**: Large codebase analysis that exceeds token limits.

#### Timeout
Execution exceeded time limit for the tier.

```typescript
// Detected when:
durationMs > timeoutMs[tier]
```

**Default Timeouts**:
- Haiku: 30s
- Sonnet: 60s
- Opus: 120s

### Complexity Mismatch

Detected when task complexity appears to exceed tier's capabilities.

```typescript
// Heuristics:
// 1. Response too short for complex task
// 2. Multiple technical domains in task
// 3. Architecture task with implementation response
// 4. Multiple questions with low quality response
```

**Example**: Architecture design task returning "Use microservices".

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  qualityThresholds: {
    minConfidence: 0.7,
    minQualityScore: 0.75,
    maxTruncationRatio: 0.05,
    minCompleteness: 0.9
  },
  maxEscalations: 2,
  preserveContext: true,
  targetEscalationRate: 0.20, // 20%
  timeoutMs: {
    haiku: 30000,
    sonnet: 60000,
    opus: 120000
  }
};
```

### Custom Configuration

```typescript
const engine = new EscalationEngine({
  qualityThresholds: {
    minConfidence: 0.85,    // Stricter
    minQualityScore: 0.85,  // Stricter
    maxTruncationRatio: 0.02,
    minCompleteness: 0.95
  },
  maxEscalations: 3,        // Allow more attempts
  targetEscalationRate: 0.15 // Lower target (15%)
});
```

### Dynamic Updates

```typescript
// Update config at runtime
engine.updateConfig({
  targetEscalationRate: 0.10,
  maxEscalations: 1
});
```

## Monitoring & Analytics

### Statistics Tracking

```typescript
const stats = engine.getStatistics();

console.log(stats);
// {
//   totalExecutions: 100,
//   totalEscalations: 15,
//   escalationRate: 0.15,
//   escalationsByTransition: {
//     'haiku-to-sonnet': 10,
//     'haiku-to-opus': 2,
//     'sonnet-to-opus': 3
//   },
//   escalationsByReason: {
//     'low-confidence': 5,
//     'truncated-output': 4,
//     'quality-threshold': 3,
//     'complexity-mismatch': 3
//   },
//   avgEscalationOverheadMs: 1250,
//   escalationSuccessRate: 0.93
// }
```

### Health Status

```typescript
const health = engine.getHealthStatus();

console.log(health);
// {
//   status: 'healthy' | 'warning' | 'critical',
//   message: 'Escalation rate 15.0% is within target 20.0%',
//   escalationRate: 0.15,
//   target: 0.20
// }

if (health.status === 'critical') {
  console.warn('Escalation rate significantly above target!');
  // Consider improving tier selection or quality thresholds
}
```

### Escalation History

```typescript
// Get recent escalations
const recent = engine.getHistory(10);

// Filter by reason
const lowConfidence = engine.getEscalationsByReason('low-confidence');

// Analyze patterns
for (const attempt of lowConfidence) {
  console.log(`${attempt.fromTier} → ${attempt.toTier}`);
  console.log(`Success: ${attempt.result?.success}`);
}
```

### Reason Analysis

```typescript
const stats = engine.getStatistics();

// Identify top issues
const topReasons = Object.entries(stats.escalationsByReason)
  .filter(([_, count]) => count > 0)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

for (const [reason, count] of topReasons) {
  const percentage = (count / stats.totalEscalations * 100).toFixed(1);
  console.log(`${reason}: ${count} (${percentage}%)`);
}

// Actionable insights
if (stats.escalationsByReason['truncated-output'] > stats.totalEscalations * 0.3) {
  console.log('⚠️  Consider increasing context windows');
}

if (stats.escalationsByReason['complexity-mismatch'] > stats.totalEscalations * 0.2) {
  console.log('⚠️  Improve initial tier selection accuracy');
}
```

## Context Preservation

### What Gets Preserved

```typescript
const preservedContext = {
  // Original task
  originalTask: {
    description: 'Refactor auth system',
    context: { fileCount: 5 }
  },

  // Failed attempt details
  failedAttempt: {
    tier: 'haiku',
    response: 'Partial refactoring...',
    error: undefined,
    metadata: {
      durationMs: 1500,
      tokenCount: 150,
      truncated: true
    }
  },

  // Custom context from result
  filesProcessed: ['auth.ts'],
  remainingFiles: ['user.ts', 'session.ts'],

  // Metadata
  preservedAt: 1706198400000
};
```

### Using Preserved Context

```typescript
const executor = async (tier: ModelTier, context?: Record<string, any>) => {
  const prompt = buildPrompt(task);

  if (context?.failedAttempt) {
    // Inform model of previous attempt
    prompt += `\n\nPrevious ${context.failedAttempt.tier} attempt was incomplete:`;
    prompt += `\n${context.failedAttempt.response}`;

    // Include custom context
    if (context.filesProcessed) {
      prompt += `\n\nFiles already processed: ${context.filesProcessed.join(', ')}`;
      prompt += `\nRemaining files: ${context.remainingFiles.join(', ')}`;
    }
  }

  return await callModel(tier, prompt);
};
```

## Persistence

### Export History

```typescript
// Export for persistence
const history = engine.exportHistory();
await saveToDatabase(history);

// Or save to file
fs.writeFileSync('escalation-history.json', JSON.stringify(history, null, 2));
```

### Import History

```typescript
// Load from persistence
const history = await loadFromDatabase();
engine.importHistory(history);

// Or load from file
const history = JSON.parse(fs.readFileSync('escalation-history.json', 'utf-8'));
engine.importHistory(history);
```

## Integration with Complexity Analyzer

```typescript
import { analyzeTier, EscalationEngine, escalateWithRetry } from '@claude/lib/tiers';

// Step 1: Analyze task complexity
const { tier, score, breakdown } = analyzeTier(task);

console.log(`Recommended tier: ${tier} (score: ${score})`);

// Step 2: Execute with automatic escalation
const { result, escalations } = await escalateWithRetry(
  task,
  executor,
  tier // Use recommended tier
);

console.log(`Final tier: ${result.tier}`);
console.log(`Escalations: ${escalations}`);

// Step 3: Monitor and optimize
if (escalations > 0) {
  console.log('Initial tier selection could be improved');
  console.log('Complexity signals:', breakdown.signals);
}
```

## Best Practices

### 1. Set Appropriate Quality Thresholds

```typescript
// Production: Balanced
const production = new EscalationEngine({
  qualityThresholds: {
    minConfidence: 0.7,
    minQualityScore: 0.75
  }
});

// High-stakes: Strict
const highStakes = new EscalationEngine({
  qualityThresholds: {
    minConfidence: 0.9,
    minQualityScore: 0.9
  }
});

// Development: Relaxed
const development = new EscalationEngine({
  qualityThresholds: {
    minConfidence: 0.6,
    minQualityScore: 0.65
  }
});
```

### 2. Monitor Escalation Rate

```typescript
// Check health regularly
setInterval(() => {
  const health = engine.getHealthStatus();

  if (health.status !== 'healthy') {
    console.warn(`Escalation health: ${health.status}`);
    console.warn(health.message);

    // Alert or take action
    if (health.status === 'critical') {
      notifyTeam('High escalation rate detected!');
    }
  }
}, 60000); // Every minute
```

### 3. Analyze Escalation Patterns

```typescript
// Daily analysis
const stats = engine.getStatistics();

// Identify trends
const topReasons = Object.entries(stats.escalationsByReason)
  .filter(([_, count]) => count > stats.totalEscalations * 0.15)
  .map(([reason]) => reason);

if (topReasons.length > 0) {
  console.log('Top escalation causes:', topReasons);

  // Take action
  if (topReasons.includes('complexity-mismatch')) {
    console.log('Action: Review complexity analyzer weights');
  }

  if (topReasons.includes('truncated-output')) {
    console.log('Action: Increase context window or chunk large tasks');
  }
}
```

### 4. Implement Quality Scoring

```typescript
function calculateQualityScore(result: any): number {
  let score = 1.0;

  // Check for hedging language
  const hedgingPhrases = ['maybe', 'possibly', 'might', 'could be', 'not sure'];
  for (const phrase of hedgingPhrases) {
    if (result.response.toLowerCase().includes(phrase)) {
      score -= 0.1;
    }
  }

  // Check for completeness
  if (result.response.endsWith('...')) score -= 0.2;
  if (result.response.length < 100) score -= 0.1;

  // Check for structured output
  if (task.expectsJSON && !isValidJSON(result.response)) {
    score -= 0.3;
  }

  return Math.max(0, score);
}
```

### 5. Context-Aware Escalation

```typescript
const executor = async (tier: ModelTier, context?: Record<string, any>) => {
  const systemPrompt = buildSystemPrompt(tier);

  let userPrompt = task.description;

  if (context?.failedAttempt) {
    // Learn from previous attempt
    userPrompt += `\n\nNote: Previous attempt with ${context.failedAttempt.tier} was insufficient.`;
    userPrompt += `\nPlease provide more comprehensive analysis.`;

    // Avoid repeating mistakes
    if (context.failedAttempt.response) {
      userPrompt += `\n\nPrevious response: ${context.failedAttempt.response}`;
      userPrompt += `\nPlease expand on this with more detail and depth.`;
    }
  }

  return await callModel(tier, { system: systemPrompt, user: userPrompt });
};
```

## Performance

- **Evaluation Time**: <1ms per decision
- **Memory Usage**: ~1KB per escalation attempt
- **History Limit**: 1000 entries (configurable)
- **Thread-Safe**: Yes (single-threaded JavaScript)

## Metrics to Track

### Operational Metrics
- **Escalation Rate**: Target <20%
- **Success Rate**: After escalation >90%
- **Avg Overhead**: Time added by escalation
- **Cache Hit Rate**: For similar patterns

### Quality Metrics
- **Confidence Distribution**: Across tiers
- **Quality Score Distribution**: Across tiers
- **Truncation Rate**: By tier and task type
- **Validation Error Rate**: By tier

### Business Metrics
- **Cost Per Task**: Including escalations
- **Latency P50/P95/P99**: Including retries
- **User Satisfaction**: Quality of final results
- **Efficiency Gain**: vs always using Opus

## Troubleshooting

### High Escalation Rate

**Symptom**: Escalation rate >30%

**Causes**:
1. Complexity analyzer under-estimating
2. Quality thresholds too strict
3. Tasks naturally complex

**Solutions**:
```typescript
// 1. Review complexity analyzer
const { breakdown } = analyzeTier(task);
console.log('Signals:', breakdown.signals);
console.log('Contributions:', breakdown.contributions);

// 2. Adjust thresholds
engine.updateConfig({
  qualityThresholds: {
    minConfidence: 0.65,  // Relax slightly
    minQualityScore: 0.70
  }
});

// 3. Start higher for complex domains
if (task.description.includes('architecture')) {
  startTier = 'sonnet'; // Skip Haiku
}
```

### Low Success Rate After Escalation

**Symptom**: Success rate <80% after escalation

**Causes**:
1. Context not being preserved
2. Task genuinely impossible
3. Quality scoring too lenient

**Solutions**:
```typescript
// 1. Verify context preservation
engine.updateConfig({ preserveContext: true });

// 2. Check if task is achievable
const attempts = engine.getHistory(100);
const impossible = attempts.filter(a =>
  a.toTier === 'opus' && !a.result?.success
);

// 3. Tighten quality standards
engine.updateConfig({
  qualityThresholds: {
    minQualityScore: 0.85
  }
});
```

## Version

**Version**: 1.0.0
**Last Updated**: 2025-01-25
**Specification**: `.claude/optimization/CASCADING_TIERS.md`

## Related

- [Complexity Analyzer](./README.md) - Initial tier selection
- [Tier Selector](./tier-selector.ts) - Distribution-aware selection
- [Route Table](../routing/route-table.ts) - Agent routing integration
