---
name: token-budget-monitor
description: >
  Use when analyzing context token usage, monitoring skill budgets, or optimizing
  context loading. Tracks which skills/agents consume most context, identifies
  optimization opportunities, and reports token savings from disable-model-invocation.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
hooks:
  SessionStart:
    - description: "Report current token budget usage"
      continueOnError: true
---

# Token Budget Monitor

Tracks and reports context token usage across skills and agents to ensure
optimal performance and identify optimization opportunities.

## Monitoring Areas

1. **Skill Token Usage**
   - Total characters loaded per skill
   - Percentage of 15,000 character budget
   - Skills exceeding budget threshold
   - Skills without `disable-model-invocation`

2. **Agent Context Impact**
   - Agent description lengths
   - Agent instruction body sizes
   - Total agent context overhead
   - Routing efficiency metrics

3. **Optimization Opportunities**
   - Skills that should use `disable-model-invocation: true`
   - Large reference content to extract to supporting files
   - Duplicate content across skills
   - Unused skills consuming context

4. **Token Savings Tracking**
   - Before/after optimization comparisons
   - Savings from `disable-model-invocation`
   - Context reduction from supporting files
   - Historical token usage trends

## Monitoring Process

1. Glob all skills and agents
2. Read and measure each file
3. Calculate character counts and percentages
4. Identify skills loaded on every request
5. Compare against 15K budget per skill
6. Track total context overhead
7. Generate budget usage report
8. Suggest optimizations

## Budget Thresholds

- **Green**: < 5,000 chars (33% of budget)
- **Yellow**: 5,000-10,000 chars (33-66% of budget)
- **Orange**: 10,000-15,000 chars (66-100% of budget)
- **Red**: > 15,000 chars (exceeds budget)

## Output Format

### Per-Skill Report
- **Skill Name**
- **Characters**: Total count
- **Budget %**: Percentage of 15K limit
- **Status**: Green/Yellow/Orange/Red
- **Model Invocation**: Enabled/Disabled
- **Recommendation**: Optimization suggestion

### Summary Dashboard
- **Total Skills**: Count
- **Total Context**: All skills combined
- **Average Size**: Mean characters per skill
- **Budget Compliance**: Percentage within limits
- **Savings**: From disable-model-invocation

### Optimization Recommendations
- Skills to disable model invocation
- Large skills to refactor
- Duplicate content to consolidate
- Estimated token savings

## Usage

```
/token-budget-monitor
```

Or auto-runs on SessionStart hook to report budget status.

## Historical Tracking

Optional: Log usage metrics to `.claude/logs/token-usage.log` for trend analysis.

**Metrics**:
- Timestamp
- Total skills
- Total context characters
- Skills over budget
- Optimization status
