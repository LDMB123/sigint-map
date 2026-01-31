# Migration Quick Reference
**Generated:** 2026-01-31
**Full Report:** `docs/reports/AGENT_ECOSYSTEM_MIGRATION_ROADMAP.md`

---

## At-a-Glance

**Current:** 14 agents (12 sonnet, 2 haiku), 37KB context, route table v1.1.0
**Target:** 12 agents (6 sonnet, 6 haiku), 29KB context, route table v1.2.0
**Savings:** 15-20% tokens, 60% cost on migrated agents, 8KB context

---

## Phase 1: High-Impact Quick Wins (Week 1)

### Haiku Migrations (60% cost reduction each)
```bash
# HIGH CONFIDENCE
bug-triager: sonnet → haiku        # Pattern matching, low risk
performance-*: sonnet → haiku       # Data analysis, low risk

# TEST REQUIRED
documentation-writer: sonnet → haiku?   # Quality check needed
refactoring-agent: sonnet → haiku?      # Complex cases risky
```

### Agent Consolidation
```
performance-profiler + performance-auditor → performance-analyzer
  • Before: 7.1KB (2 agents, sonnet)
  • After: 3.5KB (1 agent, haiku)
  • Savings: 50% context, 60% cost
```

### Route Table Cleanup
```
Remove:
  - Rust routes (borrow, lifetime)
  - Leptos routes (leptos-ssr)
  - tRPC routes
  - Orchestrator routes (5 unused)

Add:
  - Dexie, PWA, Workbox domains
  - Audit, triage actions

Fix:
  - security + refactor → security + audit

Bump: v1.1.0 → v1.2.0
```

### Standardization
```
□ Add "Returns..." to all descriptions
□ Alphabetize tools list
□ Validate with best-practices-enforcer
```

---

## Phase 2: Context Optimization (Week 2-3)

### Extract to Supporting Files
```
token-optimizer.md (6.3KB → 2KB)
  → token-optimizer-strategies.md (4KB)

performance-auditor.md (5.3KB → 3KB)  [merged into performance-analyzer]
  → performance-examples.md (2KB)

best-practices-enforcer.md (3.9KB → 3KB)
  → best-practices-examples.md (1KB)
```

### Category Route Cleanup
```
Remove unused:
  - integrator.message_queue
  - orchestrator.* (5 routes)

Consolidate performance:
  - analyzer.performance → performance-analyzer
  - debugger.performance → performance-analyzer
  - transformer.optimize → performance-analyzer
```

---

## Quick Commands

### Test Routing
```bash
cd /Users/louisherman/ClaudeCodeProjects
.claude/scripts/test-routing.sh
```

### Validate Agents
```bash
.claude/scripts/comprehensive-validation.sh
```

### Rollback Agent
```bash
# Example: Rollback bug-triager haiku migration
sed -i '' 's/model: haiku/model: sonnet/' .claude/agents/bug-triager.md
```

### Rollback Consolidation
```bash
git checkout HEAD~1 .claude/agents/performance-profiler.md
git checkout HEAD~1 .claude/agents/performance-auditor.md
rm .claude/agents/performance-analyzer.md
```

---

## Risk Matrix

| Migration | Risk | Test Strategy | Rollback |
|-----------|------|---------------|----------|
| bug-triager → haiku | Low | 10 bug reports | 2 min |
| performance consolidation | Low | Route testing | 5 min |
| documentation-writer → haiku | Medium | 10 doc types | 2 min |
| refactoring-agent → haiku | Medium | Complex refactors | 2 min |
| Route table cleanup | Medium | Routing tests | 1 min |
| Context extraction | Low | Access tests | 30 min |

---

## Success Metrics

### Phase 1 Targets
- ✅ Routing accuracy ≥ 95%
- ✅ Quality degradation ≤ 10%
- ✅ Token savings ≥ 15%
- ✅ Context reduction ≥ 8KB

### Phase 2 Targets
- ✅ Haiku adoption ≥ 40%
- ✅ Average agent size < 3KB
- ✅ Route table < 400 routes

---

## File Paths

**Agents:** `/Users/louisherman/ClaudeCodeProjects/.claude/agents/`
**Route Table:** `/Users/louisherman/ClaudeCodeProjects/.claude/config/route-table.json`
**Skills:** `/Users/louisherman/ClaudeCodeProjects/.claude/skills/*/SKILL.md`
**Reports:** `/Users/louisherman/ClaudeCodeProjects/docs/reports/`

---

## Next Actions

1. Review full roadmap: `docs/reports/AGENT_ECOSYSTEM_MIGRATION_ROADMAP.md`
2. Get Phase 1 approval
3. Create feature branch: `git checkout -b agent-ecosystem-migration`
4. Run baseline tests
5. Execute Phase 1 migrations
6. Validate and merge

---

**Full Details:** See `AGENT_ECOSYSTEM_MIGRATION_ROADMAP.md` for complete migration plan, testing checklist, rollback strategies, and cost-benefit analysis.
