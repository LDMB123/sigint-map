# Route Table Quick Reference

## File Location
```
/Users/louisherman/ClaudeCodeProjects/.claude/config/route-table.json
```

## Hash Format
```
domain:action:complexity:context
```

## Quick Agent Lookup

| Agent | Tier | Cost | Best For |
|-------|------|------|----------|
| **recursive-optimizer** | Sonnet | $0.03-0.08 | Performance analysis, recursive optimization, strategy evolution |
| **feedback-loop-optimizer** | Haiku | $0.001-0.01 | Feedback loops, A/B testing, continuous improvement |
| **meta-learner** | Sonnet | $0.01-0.08 | Transfer learning, few-shot learning, curriculum design |
| **wave-function-optimizer** | Sonnet | $0.01-0.08 | Global optimization, multi-objective, avoiding local minima |
| **massive-parallel-coordinator** | Sonnet/Opus | $0.10-0.30 | 100-1000x parallelism, distributed coordination |
| **superposition-executor** | Sonnet | $0.01-0.08 | 10-100x parallel branches, quantum-inspired execution |

## Common Hash Patterns

### Optimization
- `optimization:analyze:high:performance` → recursive-optimizer
- `optimization:search:high:global` → wave-function-optimizer
- `optimization:evolve:high:strategy` → recursive-optimizer

### Learning
- `learning:learn:medium:transfer` → meta-learner
- `learning:learn:low:few_shot` → meta-learner
- `learning:feedback:low:continuous` → feedback-loop-optimizer

### Feedback
- `feedback:test:medium:ab` → feedback-loop-optimizer
- `feedback:optimize:low:gradient` → feedback-loop-optimizer
- `feedback:compound:medium:improvement` → feedback-loop-optimizer

### Parallel
- `parallel:coordinate:high:massive` → massive-parallel-coordinator
- `parallel:execute:medium:superposition` → superposition-executor
- `parallel:distribute:high:load_balance` → massive-parallel-coordinator

### Execution
- `execution:execute:medium:superposition` → superposition-executor
- `execution:collapse:medium:best` → superposition-executor
- `execution:entangle:high:correlated` → superposition-executor

## Confidence Thresholds

| Level | Range | Action |
|-------|-------|--------|
| **High** | 0.90-1.00 | Direct routing |
| **Medium** | 0.75-0.89 | Proceed with confidence |
| **Low** | 0.60-0.74 | Acceptable, monitor |
| **Escalate** | < 0.60 | Human review |

## Complexity Levels

| Level | Tier | Cost Range | Agents |
|-------|------|------------|--------|
| **Low** | Haiku | $0.001-0.01 | feedback-loop-optimizer |
| **Medium** | Sonnet | $0.01-0.08 | recursive-optimizer, meta-learner, superposition-executor, wave-function-optimizer |
| **High** | Sonnet | $0.01-0.30 | recursive-optimizer, wave-function-optimizer, massive-parallel-coordinator |
| **Expert** | Opus | $0.03-0.30 | recursive-optimizer, massive-parallel-coordinator |

## Fuzzy Keywords

### Optimization
`optimize, improve, enhance, tune, refine` → recursive-optimizer, wave-function-optimizer

### Learning
`learn, train, adapt, transfer, meta` → meta-learner, feedback-loop-optimizer

### Feedback
`feedback, loop, iterate, compound, reinforce` → feedback-loop-optimizer

### Parallel
`parallel, concurrent, distribute, coordinate, swarm` → massive-parallel-coordinator, superposition-executor

### Quantum/Search
`search, explore, global, anneal, wave, quantum` → wave-function-optimizer, superposition-executor

## Domain Coverage

1. **optimization** - Recursive and global optimization
2. **learning** - Meta-learning, transfer, few-shot
3. **feedback** - Loops, A/B testing, reinforcement
4. **parallel** - Massive coordination, superposition
5. **execution** - Branch execution, quantum-inspired
6. **performance** - Analysis, monitoring, improvement
7. **coordination** - Distributed systems, load balancing

## Quick Decision Tree

```
Is it optimization?
├─ Global/quantum? → wave-function-optimizer
├─ Recursive/self-improving? → recursive-optimizer
└─ Gradient-based? → feedback-loop-optimizer

Is it learning?
├─ Transfer/few-shot? → meta-learner
├─ Continuous/online? → feedback-loop-optimizer
└─ Meta-learning? → meta-learner

Is it parallel?
├─ 100-1000x workers? → massive-parallel-coordinator
├─ 10-100x branches? → superposition-executor
└─ Load balancing? → massive-parallel-coordinator

Is it feedback?
├─ A/B testing? → feedback-loop-optimizer
├─ Reinforcement? → feedback-loop-optimizer
└─ Compounding? → feedback-loop-optimizer

Is it execution?
├─ Superposition? → superposition-executor
├─ Quantum-inspired? → superposition-executor
└─ Distributed? → massive-parallel-coordinator
```

## Integration Code Snippet

```javascript
// Load route table
const routeTable = require('./route-table.json');

// Parse task to semantic hash
function parseTaskToHash(task) {
  // Extract: domain, action, complexity, context
  return `${domain}:${action}:${complexity}:${context}`;
}

// Find best agent
function routeTask(hash) {
  const [domain] = hash.split(':');

  // Try exact match
  if (routeTable.routes[domain]?.[hash]) {
    return routeTable.routes[domain][hash];
  }

  // Try wildcard match
  const wildcard = hash.replace(/:[^:]+/g, ':*');
  if (routeTable.routes[domain]?.[wildcard]) {
    return routeTable.routes[domain][wildcard];
  }

  // Fuzzy match fallback
  return fuzzyMatch(hash);
}

// Example usage
const hash = "optimization:analyze:high:performance";
const route = routeTask(hash);
console.log(route.agent); // "recursive-optimizer"
console.log(route.confidence); // 0.95
```

## Cost Optimization Tips

1. **Use Haiku** for simple feedback loops and testing (cheapest)
2. **Use Sonnet** for most production workloads (balanced)
3. **Use massive-parallel-coordinator** only for 100+ parallel tasks
4. **Batch similar tasks** to same agent for efficiency
5. **Monitor confidence scores** - low confidence = potential waste

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Hash format wrong | Use exact format: `domain:action:complexity:context` |
| Confidence too low | Check fuzzy patterns, adjust complexity level |
| Wrong agent selected | Verify domain and action are appropriate |
| High cost | Check if lower tier agent available for task |
| No route found | Use wildcard or fuzzy matching |

## Statistics

- **Total Routes**: 50+
- **Fuzzy Patterns**: 10
- **Domains**: 7
- **Agents**: 6
- **Confidence Range**: 0.65-0.96

## Version

**Current**: v1.0.0 (2026-01-25)

## Related Files

- **Full Documentation**: `route-table.md`
- **Route Table JSON**: `route-table.json`
- **Agent Definitions**: `.claude/agents/*/`
- **Model Tiers Config**: `model_tiers.yaml`
- **Parallelization Config**: `parallelization.yaml`
