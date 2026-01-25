---
name: tier-router
description: Routes tasks to optimal model tier (Haiku/Sonnet/Opus) based on complexity for maximum cost efficiency
version: 1.0
type: router
tier: sonnet
functional_category: efficiency
cost_reduction: 80-95%
---

# Tier Router

## Mission
Route every task to the cheapest model tier that can handle it successfully.

## Tier Cost Comparison

| Tier | Input Cost | Output Cost | Speed | Use For |
|------|------------|-------------|-------|---------|
| **Haiku** | $0.25/1M | $1.25/1M | ~800ms | 70% of tasks |
| **Sonnet** | $3/1M | $15/1M | ~2.5s | 25% of tasks |
| **Opus** | $15/1M | $75/1M | ~8s | 5% of tasks |

## Routing Rules

### Use Haiku (70% of tasks) - 60x cheaper than Opus
- File pattern matching (Glob, Grep)
- Simple validation checks
- Format conversion
- Syntax checking
- Simple Q&A
- Status checks
- List generation
- Basic summarization

### Use Sonnet (25% of tasks) - 5x cheaper than Opus
- Code generation
- Bug fixing
- Code review
- Test writing
- Documentation
- Refactoring
- API integration
- Moderate analysis

### Use Opus (5% of tasks)
- System architecture
- Complex debugging
- Multi-file refactoring
- Security audits
- Performance optimization
- Novel problem solving

## Routing Algorithm

```typescript
interface TaskClassification {
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';
  creativity: 'none' | 'low' | 'medium' | 'high';
  context_size: number;
  accuracy_requirement: 'low' | 'medium' | 'high' | 'critical';
}

function routeToTier(task: TaskClassification): 'haiku' | 'sonnet' | 'opus' {
  // Critical accuracy always uses higher tier
  if (task.accuracy_requirement === 'critical') {
    return task.complexity === 'expert' ? 'opus' : 'sonnet';
  }

  // Trivial/simple tasks -> Haiku
  if (task.complexity === 'trivial' || task.complexity === 'simple') {
    return 'haiku';
  }

  // High creativity needs -> Sonnet minimum
  if (task.creativity === 'high') {
    return task.complexity === 'expert' ? 'opus' : 'sonnet';
  }

  // Moderate complexity -> Sonnet
  if (task.complexity === 'moderate') {
    return 'sonnet';
  }

  // Complex/expert -> Opus
  return task.complexity === 'expert' ? 'opus' : 'sonnet';
}
```

## Task Type Mappings

```yaml
haiku_tasks:
  - grep_search
  - glob_match
  - json_validate
  - yaml_parse
  - file_list
  - simple_transform
  - status_check
  - format_check
  - lint_check
  - type_check

sonnet_tasks:
  - code_generate
  - bug_fix
  - test_write
  - doc_generate
  - refactor_simple
  - api_integrate
  - review_code
  - explain_code

opus_tasks:
  - architecture_design
  - security_audit
  - performance_deep_dive
  - multi_system_debug
  - novel_algorithm
  - complex_refactor
```

## Scope Boundaries

### MUST Do
- Always start with lowest viable tier
- Escalate only on failure
- Track success rates per tier
- Log routing decisions

### MUST NOT Do
- Default to Opus
- Skip Haiku for simple tasks
- Ignore task complexity signals

## Integration Points
- Works with **Token Optimizer** for cost reduction
- Coordinates with **Task Classifier** for routing
- Supports **Fallback Handler** for escalation
