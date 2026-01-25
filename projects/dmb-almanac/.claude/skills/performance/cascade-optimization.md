# Skill: Cascade Optimization

**ID**: `cascade-optimization`
**Category**: Performance
**Agents**: Cascading Orchestrator, Adaptive Tier Selector

---

## When to Use

- For all tasks to optimize cost/quality tradeoff
- When you want to minimize cost while meeting quality requirements
- For tasks with variable complexity

## Required Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Task | Yes | The task to execute |
| Quality target | Yes | Minimum acceptable quality (0-1) |
| Budget | Optional | Maximum token budget |

## Steps

### 1. Classify Task Complexity
```typescript
// Quick classification to select cascade entry
const complexity = await classifyComplexity(task);

// Select starting tier
const startTier = selectCascadeEntry(complexity);
// 'haiku' for simple, 'sonnet' for moderate, 'opus' for complex
```

### 2. Execute with Cascade
```typescript
// Start at selected tier
let result = await execute(task, startTier);
let quality = await assess(result);

// Cascade up if needed
while (quality < qualityTarget && canCascadeUp()) {
  const nextTier = getNextTier();
  result = await execute(task, nextTier);
  quality = await assess(result);
}
```

### 3. Verify and Return
```typescript
// Final verification
const verified = await verify(result, task);

return {
  result: verified.result,
  quality: verified.quality,
  tier: verified.finalTier,
  cascadeDepth: verified.cascadesUsed,
  cost: verified.totalCost,
};
```

## Cascade Levels

| Level | Tier | Cost | Expected Quality | Use When |
|-------|------|------|------------------|----------|
| 1 | Haiku | 1x | 75% | Simple tasks |
| 2 | Haiku + refine | 2x | 82% | Quality insufficient |
| 3 | Sonnet | 12x | 88% | Moderate complexity |
| 4 | Sonnet + verify | 15x | 92% | Higher quality needed |
| 5 | Opus | 60x | 96% | Complex/critical |

## Quality Targets by Task Type

| Task Type | Quality Target | Expected Cascade |
|-----------|----------------|------------------|
| Formatting | 70% | Level 1 |
| Simple fix | 80% | Level 1-2 |
| Feature | 85% | Level 2-3 |
| Review | 88% | Level 3 |
| Security | 95% | Level 4-5 |
| Architecture | 95% | Level 5 |

## Cost Savings

```
Without Cascade (always Sonnet): 12x cost
With Cascade:
- 70% tasks resolve at Level 1: 1x cost
- 20% tasks resolve at Level 2: 2x cost
- 8% tasks resolve at Level 3: 12x cost
- 2% tasks resolve at Level 5: 60x cost

Average: (0.7 * 1) + (0.2 * 2) + (0.08 * 12) + (0.02 * 60) = 3.26x

Savings vs always-Sonnet: 73%
```

## Output Template

```
Cascade Execution Report
========================
Task: Implement user validation
Quality Target: 85%
Final Quality: 87%

Cascade Path:
1. Haiku (Level 1): 72% quality - insufficient
2. Haiku + refine (Level 2): 79% quality - insufficient
3. Sonnet (Level 3): 87% quality ✓ meets target

Total Cost: 14x (vs 60x for always-Opus)
Savings: 77%
```

---

## Agent Performance Patterns

The following agents now implement cascade optimization using the `TierAware` interface:

### Technical Writer (v2.0)
**Location**: `.claude/agents/generation/technical-writer.md`

**Pattern**: Complexity-based tier selection for documentation

```typescript
// Simple docs (README, changelog) → Haiku
// Medium complexity (guides) → Sonnet
// Complex docs (API specs) → Sonnet with validation

// Example: 50 API endpoints
// - 30 simple CRUD: Haiku = $0.50
// - 15 medium: Sonnet = $5.00
// - 5 complex: Sonnet = $3.00
// Total: $8.50 (vs $25.00 all-Sonnet)
// Savings: 66%
```

### Review Orchestrator (v2.0)
**Location**: `.claude/agents/coordination/review-orchestrator.md`

**Pattern**: Progressive deepening with early termination

```typescript
// Stage 1: Quick Haiku scan (5s, $0.25)
// If clean → stop (80% of cases)
// If issues → Stage 2: Deep Sonnet review (15s, $1.75)

// 100 files, clean code:
// Savings: 95% cost ($5.00 → $0.25)
// Savings: 92% time (60s → 5s)
```

### Implementation Guide
See `.claude/AGENT_PERFORMANCE_OPTIMIZATION_GUIDE.md` for:
- Standard `TierAware` interface specification
- Tier selection decision trees
- Cost-benefit analysis examples
- Integration with existing agents

### Best Practices
1. **Always start at the cheapest tier** that might work (usually Haiku)
2. **Measure quality** before escalating to expensive tiers
3. **Cache results** to avoid repeated expensive operations
4. **Terminate early** when quality target is met
5. **Track actual vs estimated savings** to refine tier selection

### See Also
- `.claude/PERFORMANCE_OPTIMIZATION_SUMMARY.md` - Complete performance optimization overview
- `.claude/agents/analysis/tier-router.md` - Intelligent tier selection agent
- `.claude/agents/analysis/haiku-swarm-coordinator.md` - Parallel processing patterns
