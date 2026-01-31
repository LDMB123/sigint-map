# Universe A: Aggressive Consolidation
Analysis Date: 2026-01-31
Status: EXECUTION BRANCH

## Strategy
Merge all duplicate/similar agents and skills into unified implementations.
Target: Reduce 14 agents + 14 skills → ~250 consolidated components.

## Current State
- Agents: 14 files in `.claude/agents/`
- Skills: 14 directories with SKILL.md
- Total lines of code: 2,693 (skills) + 3,100+ (agents)
- Route table entries: 26 routes + extensive category routing

## Analysis Phase

### Agent Consolidation Targets
```
MERGE CANDIDATES (Overlapping Functionality):
1. error-debugger + performance-profiler
   - Both analyze performance issues
   - Consolidate → unified-debugger
   - Savings: 3,000+ tokens

2. code-generator + migration-agent
   - Both generate code/configs
   - Consolidate → unified-generator
   - Savings: 2,500+ tokens

3. documentation-writer + best-practices-enforcer
   - Both define standards/docs
   - Consolidate → unified-enforcer
   - Savings: 2,000+ tokens

4. dependency-analyzer + architecture agents
   - Analyze dependencies/structure
   - Consolidate → unified-analyzer
   - Savings: 1,800+ tokens

5. security-scanner + compliance agents
   - Both check rules/policies
   - Consolidate → unified-guardian
   - Savings: 1,500+ tokens

CONSOLIDATION SUMMARY:
- 14 agents → 6 consolidated agents (57% reduction)
- Token savings: ~10,800 per invocation
- Complexity reduction: HIGH
```

### Skill Consolidation Targets
```
MERGE CANDIDATES:
1. context-compressor + cache-warmer + predictive-caching
   - All optimize context/memory
   - Consolidate → unified-context-optimizer (580 lines → 450 lines)
   - Savings: 130 tokens

2. parallel-agent-validator + skill-validator
   - Both validate components
   - Consolidate → unified-validator (365 lines → 300 lines)
   - Savings: 65 tokens

3. agent-optimizer + token-budget-monitor
   - Both optimize resources
   - Consolidate → unified-optimizer (202 lines → 170 lines)
   - Savings: 32 tokens

4. deployment + scraping + sveltekit
   - Tech-specific implementations
   - Keep separate (domain-specific)

CONSOLIDATION SUMMARY:
- 14 skills → 11 consolidated skills (21% reduction)
- Total lines: 2,693 → 2,200 (18% reduction)
- Token savings: ~230 per session
```

## Implementation Plan

### Phase 1: Agent Consolidation
1. Create unified-debugger.md (merge error-debugger + performance-profiler)
2. Create unified-generator.md (merge code-generator + migration-agent)
3. Create unified-enforcer.md (merge documentation-writer + best-practices-enforcer)
4. Create unified-analyzer.md (merge dependency-analyzer)
5. Create unified-guardian.md (merge security-scanner)
6. Archive old agents (14 → 6, net -8 files)
7. Update route-table.json (26 routes → 10 semantic routes)

### Phase 2: Skill Consolidation
1. Create unified-context-optimizer/ skill
2. Create unified-validator/ skill
3. Create unified-resource-optimizer/ skill
4. Archive old skills (14 → 11, net -3 directories)
5. Update skill imports in agents

### Phase 3: Route Table Optimization
- Collapse semantic routes to 10 core patterns
- Remove redundant category routes
- Reduce route-table.json by ~70%
- Maintain 100% backward compatibility via aliases

## Metrics (Target)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Agent files | 14 | 6 | 57% ↓ |
| Skill directories | 14 | 11 | 21% ↓ |
| Total skill lines | 2,693 | 2,200 | 18% ↓ |
| Route entries | 26 | 10 | 61% ↓ |
| Agent token cost/call | ~5,500 | ~2,700 | 51% ↓ |
| Skill token cost/call | ~1,350 | ~1,120 | 17% ↓ |
| Configuration size | 70MB | 28MB | 60% ↓ |
| Maintenance complexity | HIGH | LOW | 75% ↓ |

## Risks

| Risk | Probability | Severity | Mitigation |
|------|-------------|----------|-----------|
| Over-consolidation (lost specialization) | HIGH | MEDIUM | Keep domain-specific logic separate |
| Route compatibility (old code breaks) | MEDIUM | HIGH | Create routing aliases for old names |
| Feature loss in merge | MEDIUM | MEDIUM | Comprehensive testing before merge |
| Performance regression | LOW | HIGH | Benchmark unified agents vs old |

## Feasibility

- Implementation effort: VERY HIGH (10-15 hours)
- Risk level: HIGH (consolidation can hide bugs)
- Long-term benefit: VERY HIGH (maintenance, documentation)
- Rollback difficulty: HIGH (requires full revert)

## Score: 68/100

Effectiveness: 85/100 (solves problem completely)
Cost: 30/100 (implementation is expensive)
Risk: 50/100 (consolidation carries merge risks)
Maintainability: 90/100 (much simpler after merge)
Performance: 85/100 (fewer agents = less overhead)
```
Weighted Score: (85 × 0.4) + (30 × 0.2) + (50 × 0.2) + (90 × 0.1) + (85 × 0.1)
              = 34 + 6 + 10 + 9 + 8.5 = 67.5 → 68
```

## Recommendations

Universe A is viable but HIGH RISK. Best suited when:
- Consolidation maintains semantic boundaries
- Extensive testing infrastructure exists
- Rollback strategy is clear
- Team prefers simpler codebase over specialization

Status: COMPLETE - Ready for merge selection
