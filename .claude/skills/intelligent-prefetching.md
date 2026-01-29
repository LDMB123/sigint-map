---
skill: intelligent-prefetching
description: Intelligent Prefetching
---

# Intelligent Prefetching

Prefetch context intelligently by predicting information needs and loading relevant data before explicit requests.

## Usage

```
/intelligent-prefetching [task-context] [depth]
```

- `task-context`: Description of the upcoming task or goal
- `depth`: shallow | medium | deep | exhaustive

## Instructions

### Phase 1: Context Prediction

1. **Task Analysis**
   - Parse task intent and requirements
   - Identify primary and secondary information needs
   - Map task to known patterns and their dependencies

2. **Dependency Graph Construction**
   ```
   task -> [direct_deps] -> [transitive_deps]
        -> [likely_needs] -> [speculative_needs]
   ```

3. **Priority Scoring**
   ```
   score(item) = relevance * probability_of_need * 1/fetch_cost
   ```

### Phase 2: Prefetch Strategy

**Tiered Prefetching**
```
Tier 1 (Immediate): Items with >90% need probability
Tier 2 (Eager): Items with >70% need probability
Tier 3 (Speculative): Items with >40% need probability
Tier 4 (Background): Items with >20% need probability
```

**Parallel Fetch Orchestration**
```
parallel_groups = partition_by_independence(prefetch_items)
for group in parallel_groups:
    async_fetch_all(group)
    cache_results(group)
```

### Phase 3: Context Categories

Prefetch based on task type:

| Task Type | Prefetch Targets |
|-----------|------------------|
| Bug Fix | Error logs, related code, test files, git history |
| Feature | Related modules, API contracts, schemas, examples |
| Refactor | All usages, test coverage, dependency graph |
| Review | Changed files, context files, style guides |
| Debug | Stack traces, state snapshots, recent changes |

### Phase 4: Intelligent Caching

1. **Cache Hierarchy**
   ```
   L1: Current session context (immediate)
   L2: Project-level cache (fast)
   L3: Cross-project patterns (slower)
   ```

2. **Cache Invalidation**
   - File modification timestamps
   - Git commit hashes
   - Semantic change detection

3. **Predictive Warming**
   ```
   on_file_open(file):
       predict_next_files(file)
       warm_cache(predicted_files)
   ```

### Phase 5: Adaptive Learning

Track prefetch effectiveness:
```
hit_rate = prefetched_and_used / total_prefetched
miss_penalty = needed_but_not_prefetched * fetch_latency
adjust_thresholds(hit_rate, miss_penalty)
```

### Patterns

**Breadth-First Context Expansion**
```
queue = [initial_context]
while queue and budget_remaining:
    item = queue.pop()
    related = find_related(item)
    queue.extend(prioritize(related))
    prefetch(item)
```

**Semantic Clustering**
```
clusters = semantic_cluster(codebase)
active_cluster = identify_cluster(current_context)
prefetch(cluster_members(active_cluster))
```

**Change Ripple Analysis**
```
changed_files = get_recent_changes()
impact_graph = analyze_ripple_effects(changed_files)
prefetch(high_impact_nodes(impact_graph))
```

## Response Format

### Prefetch Analysis Report

**Task Context**: [Provided context]
**Prefetch Depth**: [Selected depth]

#### Predicted Information Needs

| Priority | Item | Probability | Rationale |
|----------|------|-------------|-----------|
| P1 | [Item] | [%] | [Why needed] |
| P2 | [Item] | [%] | [Why needed] |
| P3 | [Item] | [%] | [Why needed] |

#### Prefetch Execution Plan

**Tier 1 (Immediate)**
- [List of items to fetch immediately]

**Tier 2 (Eager)**
- [List of items to fetch proactively]

**Tier 3 (Speculative)**
- [List of items to fetch in background]

#### Context Loaded
```
Files: [N files, X KB]
Symbols: [N symbols resolved]
Dependencies: [N deps mapped]
History: [N commits analyzed]
```

#### Cache Status
- Hit Rate: [X%]
- Items Cached: [N]
- Cache Size: [X KB]

#### Ready for Task
- Primary Context: [Loaded/Pending]
- Secondary Context: [Loaded/Pending]
- Speculative Context: [Loaded/Pending]
