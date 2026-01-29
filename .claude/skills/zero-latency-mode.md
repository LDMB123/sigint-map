---
skill: zero-latency-mode
description: Zero Latency Mode
---

# Zero Latency Mode

Minimize response latency through aggressive caching, predictive execution, speculative processing, and optimized workflows.

## Usage

```
/zero-latency-mode [context] [latency-budget]
```

- `context`: Current task or workflow context
- `latency-budget`: instant(<100ms) | fast(<500ms) | responsive(<2s) | standard

## Instructions

### Phase 1: Latency Analysis

1. **Critical Path Identification**
   ```
   workflow_steps = analyze_workflow(task)
   critical_path = find_longest_dependency_chain(workflow_steps)
   parallelizable = find_independent_steps(workflow_steps)
   ```

2. **Latency Budget Allocation**
   ```
   total_budget = latency_budget
   for step in critical_path:
       step.budget = total_budget * step.relative_importance
       step.fallback = prepare_fast_alternative(step)
   ```

### Phase 2: Aggressive Caching

**Multi-Level Cache Strategy**
```
L0: In-memory instant cache (sub-ms)
    - Recent computations
    - Parsed ASTs
    - Resolved symbols

L1: Session cache (1-10ms)
    - File contents
    - Analysis results
    - Dependency graphs

L2: Persistent cache (10-100ms)
    - Cross-session patterns
    - Compiled artifacts
    - Model embeddings
```

**Cache Warming Protocol**
```
on_context_enter(context):
    predicted_needs = predict_information_needs(context)
    parallel_warm_cache(predicted_needs)

on_idle():
    speculative_cache_common_patterns()
```

### Phase 3: Predictive Execution

**Speculative Processing**
```
likely_next_actions = predict_user_intent(current_state)
for action in likely_next_actions[:3]:
    if probability(action) > 0.3:
        background_execute(action)
        cache_result(action, result)
```

**Incremental Computation**
```
on_change(delta):
    affected = identify_affected_components(delta)
    for component in affected:
        if cached(component):
            incremental_update(component, delta)
        else:
            schedule_recompute(component, priority=high)
```

### Phase 4: Parallel Optimization

**Dependency-Aware Parallelization**
```
graph = build_dependency_graph(tasks)
levels = topological_levels(graph)
for level in levels:
    parallel_execute(level)  # All tasks in level run concurrently
```

**Speculative Branching**
```
if uncertain(condition):
    result_true = async_execute(true_branch)
    result_false = async_execute(false_branch)
    actual = evaluate(condition)
    return result_true if actual else result_false
    cancel_other()
```

### Phase 5: Fast Paths

**Common Pattern Detection**
```
patterns = {
    'simple_query': instant_lookup,
    'format_code': cached_formatter,
    'type_check': incremental_checker,
    'lint_file': cached_linter,
}

if matches_pattern(request, patterns):
    return fast_path(request)
```

**Degraded Mode Fallbacks**
```
try:
    result = full_analysis(timeout=budget)
except Timeout:
    result = fast_approximation()
    schedule_full_analysis_background()
    return result.with_refinement_pending()
```

### Phase 6: Response Streaming

**Progressive Rendering**
```
stream_start(response_header)
for chunk in generate_incrementally():
    stream_chunk(chunk)
    if user_satisfied():
        break
stream_end()
```

**Priority-Based Ordering**
```
results = parallel_gather([
    (high_priority, quick_essential),
    (medium_priority, helpful_context),
    (low_priority, nice_to_have),
])
stream_in_completion_order(results)
```

### Patterns

**Race Pattern**
```
result = race([
    cache_lookup(query),
    fast_compute(query),
    full_compute(query),
])
# Returns first to complete
```

**Timeout Cascade**
```
for timeout in [50ms, 200ms, 1000ms]:
    try:
        return compute(timeout=timeout)
    except Timeout:
        continue
return fallback_result()
```

## Response Format

### Zero Latency Report

**Context**: [Task context]
**Latency Budget**: [Selected budget]

#### Latency Analysis
- Critical Path Length: [N steps]
- Parallelizable Steps: [N steps]
- Estimated Baseline: [Xms]

#### Optimizations Applied

| Optimization | Latency Saved | Applied |
|--------------|---------------|---------|
| Cache Hit | [Xms] | [Yes/No] |
| Parallel Execution | [Xms] | [Yes/No] |
| Predictive Prefetch | [Xms] | [Yes/No] |
| Fast Path | [Xms] | [Yes/No] |
| Incremental Update | [Xms] | [Yes/No] |

#### Execution Timeline
```
[0ms]   Start
[Xms]   Cache check complete
[Xms]   Parallel tasks launched
[Xms]   First results available
[Xms]   Response streaming started
[Xms]   Complete
```

#### Performance Metrics
- Actual Latency: [Xms]
- Budget Utilization: [X%]
- Cache Hit Rate: [X%]
- Parallel Efficiency: [X%]

#### Result
[Response content - streamed progressively if applicable]

#### Background Tasks
- [Tasks scheduled for later completion]
- [Refinements pending]
