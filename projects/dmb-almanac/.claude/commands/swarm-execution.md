# Swarm Execution

Execute tasks with coordinated agent swarms for massive parallelization and collaborative problem-solving.

## Usage

```
/swarm-execution [task] [swarm-size]
```

- `task`: Complex task requiring parallel execution
- `swarm-size`: small(3-5) | medium(6-10) | large(11-20) | massive(20+)

## Instructions

### Phase 1: Swarm Architecture

1. **Agent Role Definition**
   ```
   roles = {
       'coordinator': 1,      # Orchestrates swarm
       'explorer': N,         # Investigates problem space
       'builder': N,          # Constructs solutions
       'validator': N,        # Verifies correctness
       'optimizer': N,        # Improves solutions
       'synthesizer': 1,      # Combines results
   }
   ```

2. **Communication Topology**
   ```
   topologies = {
       'star': coordinator_centric,
       'mesh': peer_to_peer,
       'hierarchical': tree_structure,
       'ring': sequential_passing,
       'hybrid': adaptive_topology,
   }
   ```

### Phase 2: Task Decomposition

**Work Distribution Strategies**
```
strategies = {
    'spatial': divide_by_codebase_region,
    'functional': divide_by_capability,
    'temporal': divide_by_phase,
    'speculative': explore_alternatives,
}

work_units = decompose(task, strategy)
assign(work_units, agents)
```

**Load Balancing**
```
while work_remaining():
    for agent in idle_agents():
        unit = dequeue_highest_priority()
        agent.assign(unit)

    redistribute_if_imbalanced()
```

### Phase 3: Coordination Protocol

**Message Types**
```
messages = {
    'task_assignment': coordinator -> worker,
    'progress_update': worker -> coordinator,
    'result_submission': worker -> synthesizer,
    'collaboration_request': worker <-> worker,
    'conflict_resolution': coordinator -> workers,
    'termination_signal': coordinator -> all,
}
```

**Synchronization Points**
```
barriers = [
    'initial_exploration_complete',
    'solution_candidates_ready',
    'validation_complete',
    'optimization_done',
    'final_synthesis',
]
```

### Phase 4: Collaborative Patterns

**Divide and Conquer**
```
def swarm_divide_conquer(task, agents):
    if is_atomic(task):
        return single_agent_solve(task)

    subtasks = divide(task)
    sub_swarms = partition(agents, len(subtasks))

    results = parallel([
        swarm_divide_conquer(st, sw)
        for st, sw in zip(subtasks, sub_swarms)
    ])

    return merge(results)
```

**Competitive Evolution**
```
population = [agent.generate_solution() for agent in explorers]
for generation in range(max_generations):
    fitness = [evaluate(solution) for solution in population]
    selected = select_fittest(population, fitness)
    population = crossover_mutate(selected)
    if converged(population):
        break
return best(population)
```

**Collaborative Refinement**
```
draft = builders.create_initial()
for round in range(refinement_rounds):
    critiques = parallel([v.critique(draft) for v in validators])
    improvements = optimizers.improve(draft, critiques)
    draft = synthesizer.merge(draft, improvements)
return draft
```

### Phase 5: Conflict Resolution

**Merge Strategies**
```
on_conflict(solutions):
    if compatible(solutions):
        return merge_compatible(solutions)
    elif one_dominant(solutions):
        return select_dominant(solutions)
    else:
        return escalate_to_coordinator(solutions)
```

**Consensus Protocol**
```
proposals = gather(all_agent_proposals)
votes = parallel([agent.vote(proposals) for agent in swarm])
consensus = weighted_majority(votes)
if consensus.confidence < threshold:
    iterate_voting()
```

### Phase 6: Result Synthesis

**Aggregation Methods**
```
methods = {
    'union': combine_all_findings,
    'intersection': common_agreements,
    'weighted_merge': importance_based_combination,
    'hierarchical': tree_structured_merge,
}
```

**Quality Assurance**
```
final_result = synthesizer.merge(all_results)
validation = validators.verify(final_result)
if not validation.passed:
    gaps = validation.identify_gaps()
    additional_work = coordinator.assign_remediation(gaps)
    final_result = synthesizer.incorporate(additional_work)
```

## Response Format

### Swarm Execution Report

**Task**: [Task description]
**Swarm Size**: [N agents]
**Topology**: [Selected topology]

#### Swarm Composition

| Role | Count | Responsibilities |
|------|-------|------------------|
| Coordinator | 1 | [Tasks] |
| Explorer | [N] | [Tasks] |
| Builder | [N] | [Tasks] |
| Validator | [N] | [Tasks] |
| Optimizer | [N] | [Tasks] |
| Synthesizer | 1 | [Tasks] |

#### Work Distribution
- Total Work Units: [N]
- Distribution Strategy: [Strategy]
- Load Balance Score: [X%]

#### Execution Timeline
```
[T+0]     Swarm initialized
[T+Xms]   Exploration phase complete
[T+Xms]   Initial solutions generated
[T+Xms]   Validation round 1
[T+Xms]   Optimization pass
[T+Xms]   Final synthesis
[T+Xms]   Complete
```

#### Agent Activity

| Agent | Work Units | Conflicts | Contributions |
|-------|------------|-----------|---------------|
| [ID] | [N] | [N] | [Summary] |

#### Collaboration Metrics
- Messages Exchanged: [N]
- Conflicts Resolved: [N]
- Consensus Rounds: [N]
- Parallel Efficiency: [X%]

#### Synthesized Result
[The final combined output from the swarm]

#### Quality Verification
- Validation Status: [Pass/Fail]
- Coverage: [X%]
- Confidence: [X%]

#### Swarm Performance
- Total Agent-Time: [Xms]
- Wall-Clock Time: [Xms]
- Speedup Factor: [X]x
