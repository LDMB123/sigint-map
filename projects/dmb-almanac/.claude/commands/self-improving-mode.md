# Self-Improving Mode

Enable self-improvement patterns through feedback loops, performance analysis, and continuous optimization.

## Usage

```
/self-improving-mode [scope] [improvement-focus]
```

- `scope`: session | project | workflow | system
- `improvement-focus`: accuracy | speed | efficiency | quality | all

## Instructions

### Phase 1: Performance Baseline

1. **Metrics Collection**
   ```
   metrics = {
       'accuracy': measure_correctness_rate(),
       'speed': measure_response_latency(),
       'efficiency': measure_resource_usage(),
       'quality': measure_output_quality(),
       'satisfaction': measure_user_feedback(),
   }
   ```

2. **Pattern Analysis**
   ```
   patterns = analyze(
       successful_interactions,
       failed_interactions,
       edge_cases,
       user_corrections,
   )
   ```

### Phase 2: Feedback Integration

**Explicit Feedback**
```
on_user_correction(original, correction):
    delta = diff(original, correction)
    pattern = extract_pattern(delta)
    add_to_learning_queue(pattern)
    update_behavior(pattern)
```

**Implicit Feedback**
```
signals = {
    'accepted_immediately': positive,
    'modified_slightly': neutral_positive,
    'significantly_changed': needs_improvement,
    'rejected_entirely': negative,
    'follow_up_questions': clarification_needed,
}
```

**Outcome Tracking**
```
for task in completed_tasks:
    outcome = measure_outcome(task)
    approach = extract_approach(task)
    correlation = correlate(approach, outcome)
    update_approach_weights(correlation)
```

### Phase 3: Improvement Strategies

**Error Pattern Learning**
```
errors = collect_errors(recent_period)
clusters = cluster_by_type(errors)
for cluster in clusters:
    root_cause = analyze_root_cause(cluster)
    mitigation = develop_mitigation(root_cause)
    apply_mitigation(mitigation)
    monitor_effectiveness(mitigation)
```

**Success Pattern Amplification**
```
successes = collect_successes(recent_period)
patterns = extract_patterns(successes)
for pattern in patterns:
    generalize(pattern)
    increase_weight(pattern)
    apply_more_broadly(pattern)
```

**Adaptive Thresholds**
```
for threshold in adjustable_thresholds:
    performance = measure_with_threshold(threshold)
    if performance.improving:
        continue_direction()
    else:
        reverse_direction()
    apply_new_threshold()
```

### Phase 4: Continuous Optimization

**A/B Testing**
```
experiment = {
    'control': current_approach,
    'treatment': new_approach,
    'metric': target_metric,
    'duration': experiment_duration,
}
run_experiment(experiment)
if treatment_wins(significance=0.95):
    adopt(treatment)
```

**Incremental Refinement**
```
while improvement_possible():
    component = identify_weakest_component()
    variants = generate_variants(component)
    best_variant = evaluate_variants(variants)
    if better_than_current(best_variant):
        replace(component, best_variant)
```

### Phase 5: Meta-Learning

**Strategy Selection**
```
context = analyze_current_context()
historical = find_similar_contexts(context)
successful_strategies = extract_strategies(historical, outcome=success)
strategy = select_best_match(successful_strategies, context)
apply_strategy(strategy)
```

**Transfer Learning**
```
domain_knowledge = extract_from_successful_domains()
target_domain = current_domain()
transferable = identify_transferable(domain_knowledge, target_domain)
adapt(transferable, target_domain)
apply(adapted_knowledge)
```

### Phase 6: Improvement Monitoring

**Progress Tracking**
```
dashboard = {
    'baseline': initial_metrics,
    'current': current_metrics,
    'trend': calculate_trend(metric_history),
    'improvement_rate': delta / time,
    'projected': extrapolate(trend),
}
```

**Regression Detection**
```
on_metric_update(metric):
    if regression_detected(metric):
        alert(metric)
        rollback_recent_changes()
        investigate_cause()
```

## Response Format

### Self-Improvement Report

**Scope**: [Selected scope]
**Improvement Focus**: [Selected focus]

#### Performance Baseline

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Accuracy | [X%] | [X%] | [+/-X%] |
| Speed | [Xms] | [Xms] | [+/-X%] |
| Efficiency | [X] | [X] | [+/-X%] |
| Quality | [X/10] | [X/10] | [+/-X] |

#### Patterns Identified

**Success Patterns**
1. [Pattern description and frequency]
2. [Pattern description and frequency]

**Error Patterns**
1. [Pattern description and mitigation]
2. [Pattern description and mitigation]

#### Improvements Applied

| Improvement | Type | Impact | Status |
|-------------|------|--------|--------|
| [Description] | [Type] | [Expected impact] | [Applied/Testing] |

#### Learning Queue
- [Pending patterns to integrate]
- [Experiments in progress]

#### Optimization Experiments

| Experiment | Control | Treatment | Result |
|------------|---------|-----------|--------|
| [Name] | [Baseline] | [Variant] | [Outcome] |

#### Meta-Learning Insights
- [Cross-domain insights applied]
- [Strategy adaptations made]

#### Progress Trajectory
```
Baseline ----[improvement points]----> Current ----> Projected
   |                                      |              |
  [X]                                    [Y]           [Z]
```

#### Recommendations
- [High-impact improvement opportunities]
- [Areas needing attention]
- [Suggested experiments]

#### Next Improvement Cycle
- Focus: [Next focus area]
- Target: [Specific improvement target]
- Timeline: [Expected timeframe]
