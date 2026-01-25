# Cascade Optimization

Cascade through model tiers and processing levels to optimize cost-performance tradeoffs dynamically.

## Usage

```
/cascade-optimization [task] [optimization-goal]
```

- `task`: The task to be processed through the cascade
- `optimization-goal`: speed | cost | quality | balanced

## Instructions

### Phase 1: Task Classification

1. **Complexity Assessment**
   ```
   complexity_score = analyze(
       task_length,
       domain_specificity,
       reasoning_depth_required,
       context_dependency,
       output_precision_needed
   )
   ```

2. **Tier Assignment Matrix**
   | Complexity | Tier | Use Case |
   |------------|------|----------|
   | Trivial | T1-Fast | Simple lookups, formatting |
   | Simple | T2-Efficient | Standard operations, common patterns |
   | Moderate | T3-Capable | Multi-step reasoning, synthesis |
   | Complex | T4-Advanced | Deep analysis, novel solutions |
   | Critical | T5-Maximum | High-stakes, requires verification |

### Phase 2: Cascade Architecture

**Progressive Escalation**
```
result = None
for tier in [T1, T2, T3, T4, T5]:
    result = process(task, tier)
    confidence = assess_confidence(result)
    if confidence >= threshold[tier]:
        return result
    # Escalate to next tier with context
    task = enrich(task, result, feedback)
```

**Parallel Validation**
```
primary_result = process(task, optimal_tier)
validation_result = process(validate_prompt(primary_result), lower_tier)
if validation_result.confirms(primary_result):
    return primary_result
else:
    escalate(task, higher_tier)
```

### Phase 3: Optimization Strategies

**Speed Optimization**
```
- Start at lowest viable tier
- Use cached patterns aggressively
- Parallelize independent subtasks
- Accept first sufficient result
```

**Cost Optimization**
```
- Maximize lower-tier utilization
- Batch similar tasks
- Cache and reuse results
- Escalate only when necessary
```

**Quality Optimization**
```
- Start at higher tier
- Multi-pass verification
- Cross-validate with different approaches
- Iterate until quality threshold met
```

**Balanced Optimization**
```
- Adaptive tier selection based on task
- Dynamic threshold adjustment
- Cost-quality Pareto optimization
- Continuous feedback integration
```

### Phase 4: Cascade Patterns

**Decomposition Cascade**
```
subtasks = decompose(complex_task)
results = {}
for subtask in subtasks:
    tier = classify(subtask)
    results[subtask] = process(subtask, tier)
final = synthesize(results, appropriate_tier)
```

**Verification Cascade**
```
draft = generate(task, efficient_tier)
critique = analyze(draft, same_or_lower_tier)
if critique.has_issues:
    refined = refine(draft, critique, higher_tier)
    return refined
return draft
```

**Speculative Cascade**
```
# Try fast path first
fast_result = process(task, fast_tier, timeout=short)
if fast_result.is_complete:
    return fast_result

# Fall back to thorough processing
return process(task, thorough_tier, context=fast_result)
```

### Phase 5: Monitoring and Adaptation

Track cascade metrics:
```
tier_distribution = count_by_tier(recent_tasks)
escalation_rate = escalations / total_tasks
quality_by_tier = measure_quality_per_tier()
cost_efficiency = quality_achieved / cost_incurred

adjust_thresholds(metrics)
```

## Response Format

### Cascade Optimization Report

**Task**: [Task description]
**Optimization Goal**: [Selected goal]

#### Task Classification
- Complexity Score: [X/10]
- Initial Tier Assignment: [Tier]
- Confidence Threshold: [X%]

#### Cascade Execution

| Step | Tier | Action | Confidence | Decision |
|------|------|--------|------------|----------|
| 1 | [Tier] | [Action] | [%] | [Continue/Escalate/Complete] |
| 2 | [Tier] | [Action] | [%] | [Continue/Escalate/Complete] |

#### Resource Usage
- Tiers Utilized: [List]
- Total Processing Units: [N]
- Estimated Cost: [$X]
- Time Elapsed: [Xms]

#### Result
- Final Tier: [Tier that produced result]
- Confidence: [X%]
- Quality Score: [X/10]

#### Optimization Metrics
- Cost Savings vs Max Tier: [X%]
- Speed Improvement: [X%]
- Quality Trade-off: [None/Minimal/Acceptable]

#### Output
[The actual result from the cascade]

#### Recommendations
- [Suggestions for future similar tasks]
- [Threshold adjustments if any]
