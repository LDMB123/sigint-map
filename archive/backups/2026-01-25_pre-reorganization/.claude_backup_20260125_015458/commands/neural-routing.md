# Neural Routing

Smart task routing using intelligent classification, capability matching, and dynamic path optimization.

## Usage

```
/neural-routing [task] [routing-strategy]
```

- `task`: Task to be routed to optimal handler
- `routing-strategy`: fastest | cheapest | highest-quality | adaptive

## Instructions

### Phase 1: Task Classification

1. **Feature Extraction**
   ```
   features = extract(
       task_type,           # query, generation, analysis, transformation
       complexity_level,    # trivial, simple, moderate, complex, expert
       domain,              # code, docs, data, system, creative
       required_context,    # none, local, project, global
       output_format,       # text, code, structured, mixed
       precision_needed,    # approximate, standard, exact, verified
       time_sensitivity,    # async, normal, urgent, real-time
   )
   ```

2. **Classification Model**
   ```
   task_vector = encode(features)
   category = classify(task_vector)
   confidence = softmax(category_scores)
   ```

### Phase 2: Capability Registry

**Handler Profiles**
```
handlers = {
    'fast_lookup': {
        'capabilities': ['simple_query', 'retrieval'],
        'latency': 'very_low',
        'cost': 'minimal',
        'quality': 'standard',
    },
    'code_specialist': {
        'capabilities': ['code_generation', 'refactoring', 'debugging'],
        'latency': 'medium',
        'cost': 'moderate',
        'quality': 'high',
    },
    'deep_analyzer': {
        'capabilities': ['complex_analysis', 'architecture', 'optimization'],
        'latency': 'high',
        'cost': 'high',
        'quality': 'maximum',
    },
    'parallel_swarm': {
        'capabilities': ['large_scale', 'exploration', 'validation'],
        'latency': 'variable',
        'cost': 'scalable',
        'quality': 'ensemble',
    },
}
```

### Phase 3: Routing Algorithm

**Score Calculation**
```
def route_score(task, handler, strategy):
    capability_match = match_score(task.requirements, handler.capabilities)

    if strategy == 'fastest':
        return capability_match * (1 / handler.latency)
    elif strategy == 'cheapest':
        return capability_match * (1 / handler.cost)
    elif strategy == 'highest_quality':
        return capability_match * handler.quality
    elif strategy == 'adaptive':
        return capability_match * weighted_balance(
            latency=task.urgency,
            cost=task.budget,
            quality=task.precision
        )
```

**Routing Decision**
```
scores = {h: route_score(task, h, strategy) for h in handlers}
primary = max(scores, key=scores.get)
fallback = second_max(scores, key=scores.get)
return RoutingDecision(primary, fallback, scores)
```

### Phase 4: Dynamic Path Optimization

**Load-Aware Routing**
```
available_handlers = filter(handlers, is_available)
load_adjusted_scores = {
    h: score * availability_factor(h)
    for h, score in scores.items()
    if h in available_handlers
}
```

**Predictive Routing**
```
predicted_load = forecast_load(next_window)
for handler in handlers:
    if will_be_overloaded(handler, predicted_load):
        preemptive_redirect(handler.queue, alternative_handler)
```

**Feedback Loop**
```
on_task_complete(task, handler, outcome):
    actual_latency = measure_latency()
    actual_quality = measure_quality()
    update_handler_profile(handler, actual_latency, actual_quality)
    adjust_routing_weights(task_type, handler, outcome)
```

### Phase 5: Multi-Path Strategies

**Speculative Routing**
```
if uncertainty_high(task):
    candidates = top_k_handlers(task, k=3)
    results = parallel_execute(task, candidates, timeout=aggressive)
    return first_acceptable(results)
```

**Hierarchical Routing**
```
coarse_category = classify_coarse(task)
handler_pool = handlers_for_category(coarse_category)
fine_category = classify_fine(task, handler_pool)
optimal_handler = select_from_pool(fine_category, handler_pool)
```

**Composite Routing**
```
subtasks = decompose(task)
routing_plan = []
for subtask in subtasks:
    optimal = route(subtask)
    routing_plan.append((subtask, optimal))
return ParallelExecutionPlan(routing_plan)
```

### Phase 6: Routing Policies

**Cost Constraints**
```
if task.budget:
    eligible = filter(handlers, cost <= task.budget)
    route_within(eligible)
```

**SLA Guarantees**
```
if task.sla:
    eligible = filter(handlers, latency_p99 <= task.sla)
    route_within(eligible)
```

**Quality Floors**
```
if task.min_quality:
    eligible = filter(handlers, quality >= task.min_quality)
    route_within(eligible)
```

## Response Format

### Neural Routing Report

**Task**: [Task description]
**Routing Strategy**: [Selected strategy]

#### Task Classification

| Feature | Value | Confidence |
|---------|-------|------------|
| Type | [Type] | [X%] |
| Complexity | [Level] | [X%] |
| Domain | [Domain] | [X%] |
| Context Needed | [Level] | [X%] |
| Precision | [Level] | [X%] |

**Task Vector**: [Encoded representation]

#### Handler Evaluation

| Handler | Capability Match | Latency | Cost | Quality | Score |
|---------|------------------|---------|------|---------|-------|
| [Handler1] | [X%] | [Xms] | [$X] | [X/10] | [Score] |
| [Handler2] | [X%] | [Xms] | [$X] | [X/10] | [Score] |
| [Handler3] | [X%] | [Xms] | [$X] | [X/10] | [Score] |

#### Routing Decision
- **Primary Handler**: [Selected handler]
- **Fallback Handler**: [Backup handler]
- **Confidence**: [X%]

#### Route Optimization
- Load Adjustment: [Applied/Not needed]
- Speculative Paths: [N paths considered]
- Composite Routing: [Yes/No - N subtasks]

#### Execution Path
```
Task -> Classification -> [Handler Selection] -> Execution -> Result
                              |
                              v
                         [Fallback if needed]
```

#### Constraints Applied
- Budget: [Limit if any]
- SLA: [Latency requirement if any]
- Quality Floor: [Minimum quality if any]

#### Routing Metrics
- Classification Time: [Xms]
- Routing Decision Time: [Xms]
- Expected Handler Latency: [Xms]
- Total Expected Time: [Xms]

#### Result
[Routed to: Handler X]
[Execution output from selected handler]

#### Feedback
- Actual Latency: [Xms]
- Actual Quality: [X/10]
- Routing Accuracy: [Optimal/Suboptimal/Feedback recorded]
