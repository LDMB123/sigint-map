# Escalation Engine

**Original**: 683 lines, 17KB (~4.1K tokens)
**Compressed**: ~140 lines, 3.3KB (~0.82K tokens)
**Ratio**: 80% reduction
**Date**: 2026-02-02

---

## Overview

Automatic tier escalation detecting quality failures and complexity mismatches: Haiku → Sonnet → Opus with context preservation.

**Target**: <20% escalation rate through accurate tier selection.

## Features

### Quality Detection
- Confidence analysis (< 0.7 → escalate)
- Quality scoring (< 0.75 → escalate)
- Truncation detection (incomplete responses)
- Validation/parsing errors

### Complexity Mismatch
- Response length analysis (too short for complex task)
- Multi-domain detection (multiple technical domains)
- Abstraction mismatch (architecture vs implementation)
- Question density (decision-making complexity)

### Context Preservation
- Failed attempt history
- Custom context metadata
- Escalation chain tracking
- Smart retry with context

### Performance Monitoring
- Escalation rate tracking (vs <20% target)
- Reason analysis by cause
- Tier-to-tier transition patterns
- Real-time health status

## Escalation Reasons

### Quality Failures
- **Low Confidence**: metadata.confidence < 0.7
- **Quality Threshold**: qualityScore < 0.75
- **Truncated Output**: metadata.truncated === true

### Validation Failures
- **Validation Error**: Output fails schema/format checks
- **Parsing Failure**: Can't parse expected format

### Context Issues
- **Context Overflow**: Exceeds context window
- **Timeout**: Exceeds tier timeout (Haiku: 30s, Sonnet: 60s, Opus: 120s)

### Complexity Mismatch
- Response too short for complex task
- Multiple technical domains
- Architecture task with implementation response
- Multiple questions with low quality

## Quick Start

```typescript
const engine = new EscalationEngine();

// Execute with Haiku
const result = createExecutionResult('haiku', response, {
  durationMs: 1500,
  truncated: false,
  confidence: 0.65,
  qualityScore: 0.70
});

// Evaluate escalation
const decision = engine.evaluateEscalation(result, 'haiku', task);

if (decision.shouldEscalate) {
  const context = engine.preserveContext(result, task);
  engine.recordEscalation('haiku', decision.nextTier, decision.reason, result, context);
  
  // Retry with Sonnet
  const sonnetResult = await executeWithSonnet(task, context);
}
```

## Configuration

```typescript
{
  qualityThresholds: {
    minConfidence: 0.7,
    minQualityScore: 0.75,
    maxTruncationRatio: 0.05,
    minCompleteness: 0.9
  },
  maxEscalations: 2,
  preserveContext: true,
  targetEscalationRate: 0.20,  // 20%
  timeoutMs: {
    haiku: 30000,
    sonnet: 60000,
    opus: 120000
  }
}
```

## Statistics & Monitoring

```typescript
const stats = engine.getStatistics();
// {
//   totalExecutions: 100,
//   totalEscalations: 15,
//   escalationRate: 0.15,
//   escalationsByReason: {
//     'low-confidence': 5,
//     'truncated-output': 4,
//     'quality-threshold': 3,
//     'complexity-mismatch': 3
//   }
// }

const health = engine.getHealthStatus();
// { status: 'healthy'|'warning'|'critical', escalationRate, target }
```

## Context Preservation

### What Gets Preserved
```typescript
{
  originalTask: { description, context },
  failedAttempt: { tier, response, error, metadata },
  customContext: { filesProcessed, remainingFiles, ... },
  preservedAt: timestamp
}
```

### Using Preserved Context
```typescript
const executor = async (tier, context) => {
  let prompt = buildPrompt(task);
  
  if (context?.failedAttempt) {
    prompt += `\nPrevious ${context.failedAttempt.tier} was incomplete:`;
    prompt += `\n${context.failedAttempt.response}`;
    
    if (context.filesProcessed) {
      prompt += `\nProcessed: ${context.filesProcessed.join(', ')}`;
      prompt += `\nRemaining: ${context.remainingFiles.join(', ')}`;
    }
  }
  
  return await callModel(tier, prompt);
};
```

## Integration with Complexity Analyzer

```typescript
const { tier } = analyzeTier(task);

const { result, escalations } = await escalateWithRetry(
  task,
  executor,
  tier  // Use recommended tier
);

console.log(`Final: ${result.tier}, Escalations: ${escalations}`);
```

## Best Practices

### 1. Appropriate Quality Thresholds
```typescript
// Production: Balanced
{ minConfidence: 0.7, minQualityScore: 0.75 }

// High-stakes: Strict
{ minConfidence: 0.9, minQualityScore: 0.9 }

// Development: Relaxed
{ minConfidence: 0.6, minQualityScore: 0.65 }
```

### 2. Monitor Escalation Rate
```typescript
setInterval(() => {
  const health = engine.getHealthStatus();
  if (health.status !== 'healthy') {
    console.warn(health.message);
  }
}, 60000);
```

### 3. Analyze Patterns
```typescript
const stats = engine.getStatistics();
const topReasons = Object.entries(stats.escalationsByReason)
  .filter(([_, count]) => count > 0)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
```

### 4. Implement Quality Scoring
```typescript
function calculateQualityScore(result) {
  let score = 1.0;
  
  // Check hedging language
  const hedges = ['maybe', 'possibly', 'might', 'could'];
  for (const h of hedges) {
    if (result.response.includes(h)) score -= 0.1;
  }
  
  // Check completeness
  if (result.response.endsWith('...')) score -= 0.2;
  if (result.response.length < 100) score -= 0.1;
  
  return Math.max(0, score);
}
```

## Persistence

```typescript
// Export
const history = engine.exportHistory();
fs.writeFileSync('history.json', JSON.stringify(history));

// Import
const history = JSON.parse(fs.readFileSync('history.json'));
engine.importHistory(history);
```

## Performance

- Evaluation time: <1ms per decision
- Memory: ~1KB per attempt
- History limit: 1000 entries (configurable)

## Metrics to Track

### Operational
- Escalation Rate (target: <20%)
- Success Rate (target: >90%)
- Avg Overhead (added time)
- Cache Hit Rate

### Quality
- Confidence distribution
- Quality score distribution
- Truncation rate
- Validation error rate

### Business
- Cost per task (including escalations)
- Latency P50/P95/P99
- User satisfaction
- Efficiency vs always using Opus

## Troubleshooting

### High Escalation Rate (>30%)
1. Review complexity analyzer signals
2. Adjust quality thresholds (relax)
3. Start higher tier for complex domains

### Low Success After Escalation (<80%)
1. Verify context preservation enabled
2. Check if task achievable
3. Tighten quality standards

---

**Version**: 1.0.0 | **Updated**: 2025-01-25
**Spec**: `.claude/optimization/CASCADING_TIERS.md`
**Related**: Complexity Analyzer, Tier Selector, Route Table
