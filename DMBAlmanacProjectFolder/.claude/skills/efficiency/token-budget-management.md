# Skill: Token Budget Management

**ID**: `token-budget-management`
**Category**: Efficiency
**Agent**: Token Optimizer

---

## When to Use
- Managing Claude Max subscription limits
- Optimizing for weekly token budgets
- Reducing costs while maintaining quality
- Planning large projects within limits

## Token Budget Calculator

### Claude Max Weekly Limits (Estimated)
| Tier | Approx Weekly Tokens | Daily Average |
|------|---------------------|---------------|
| Standard | ~5M tokens | ~700K/day |
| Heavy Use | ~10M tokens | ~1.4M/day |

### Cost Per Task (Approximate)
| Task Type | Tokens | % of Daily |
|-----------|--------|------------|
| Simple Q&A | 500 | 0.07% |
| Code review | 2,000 | 0.3% |
| Feature impl | 10,000 | 1.4% |
| Full file gen | 5,000 | 0.7% |
| Debug session | 15,000 | 2.1% |
| Architecture | 25,000 | 3.6% |

## Budget Optimization Steps

### 1. Measure Current Usage
```bash
# Track token usage per task type
# Log format: timestamp,task_type,input_tokens,output_tokens
```

### 2. Identify High-Cost Tasks
| Task | Before | After | Savings |
|------|--------|-------|---------|
| Full file reads | 2000/file | 200/file | 90% |
| Verbose prompts | 500/prompt | 50/prompt | 90% |
| Regenerations | 1000/retry | 100/refine | 90% |

### 3. Apply Reduction Strategies

#### Use Haiku for Simple Tasks (60x cheaper)
```
Instead of: Ask Opus to validate JSON
Do: Use Haiku for validation, Sonnet only if needed
```

#### Compress Context (80% reduction)
```
Instead of: Include full file contents
Do: Include only relevant functions/sections
```

#### Batch Similar Requests (50% reduction)
```
Instead of: 10 separate validation calls
Do: 1 batch validation call
```

#### Use References (90% reduction)
```
Instead of: Repeat project context each time
Do: Reference "see previous context" or use session memory
```

## Weekly Budget Plan

### Day 1-2: High-Value Work
- Architecture decisions (use budget)
- Complex feature planning
- Difficult debugging

### Day 3-5: Efficient Execution
- Use Haiku swarms for validation
- Batch similar operations
- Compress all contexts

### Day 6-7: Conservation Mode
- Quick fixes only
- Reference previous context
- Minimal token prompts

## Output Template
```yaml
budget_report:
  weekly_limit: 5000000
  used_today: 125000
  remaining: 4875000
  daily_target: 700000
  on_track: true

  savings_achieved:
    context_compression: 45%
    tier_routing: 60%
    batching: 30%
    total: 70%

  recommendations:
    - "Use /parallel-* skills for bulk operations"
    - "Compress code context before sending"
    - "Batch validation requests"
```
