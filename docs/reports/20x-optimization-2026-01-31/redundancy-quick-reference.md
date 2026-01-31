# Agent Redundancy - Quick Reference
**Date**: 2026-01-31

## Top 10 Immediate Actions

### Exact Duplicates (Eliminate Today)
1. **secret-scanner** + **secrets-exposure-scanner** → Keep secret-scanner
2. **dockerfile-best-practices** + **dockerfile-linter** → Keep dockerfile-linter

### High-Impact Merges (This Week)
3. **JavaScript debugging cluster** (5 agents → 1) — Biggest routing confusion source
4. **Testing validation cluster** (7 agents → 1) — Single test quality entry point
5. **Security scanning cluster** (5 agents → 1) — Unifies security checks

### Medium-Impact Merges (Next Week)
6. **Database validation cluster** (6 agents → 1) — Consolidates DB analysis
7. **Bundle analysis cluster** (4 agents → 1) — Simplifies bundle optimization
8. **API validation cluster** (4 agents → 1) — Unifies API schema validation

### Quick Fixes
9. **PWA debuggers** (2 → 1) — pwa-debugger + pwa-devtools-debugger
10. **Release orchestrators** (2 → 1) — production-readiness + release-validator

---

## By The Numbers

| Metric | Current | After Consolidation | Improvement |
|--------|---------|---------------------|-------------|
| **Total Agents** | 447 | 360 | -87 (-19.5%) |
| **Routing Overhead** | Baseline | -20% | Faster selection |
| **Exact Duplicates** | 2 | 0 | Immediate win |
| **Major Clusters** | 10 | 0 | Clarity boost |

---

## Consolidation Map

### JavaScript/Error Debugging
```
javascript-debugger ──┐
nodejs-debugger ──────┼──→ javascript-debugger-unified (Sonnet)
async-debugging ──────┤
runtime-error ────────┤
error-debugger ───────┘
```

### Testing
```
test-coverage-gap ────┐
e2e-test-gap ─────────┤
flaky-test ───────────┤
mock-signature ───────┼──→ test-quality-analyzer (Haiku)
assertion-quality ────┤
test-isolation ───────┤
snapshot-drift ───────┘
```

### Security
```
secret-scanner ───────┐ (keep)
secrets-exposure ─────┘ (DELETE - duplicate)
cve-dependency ───────┐
sql-injection ────────┼──→ security-scanner (enhanced)
xss-pattern ──────────┘
```

### Database
```
null-safety ──────────┐
data-type-checker ────┤
schema-diff ──────────┼──→ database-schema-analyzer (Haiku)
foreign-key ──────────┤
index-usage ──────────┤
query-plan ───────────┘
```

### Bundle Analysis
```
bundle-chunk ─────────┐
bundle-treemap ───────┼──→ bundle-size-analyzer (enhanced Sonnet)
bundle-entry ─────────┘
```

### API Validation
```
api-contract ─────────┐
openapi-spec ─────────┤
grpc-proto ───────────┼──→ api-schema-validator (Haiku)
graphql-schema ───────┘
```

---

## Dead Code to Archive

**Quantum/Experimental** (8 agents with zero usage):
- emergent-behavior-monitor
- superposition-executor
- entanglement-manager
- knowledge-distiller
- cross-domain-transferer
- super-agent-generator
- result-predictor
- request-similarity-detector

**Action**: Move to `_archived/experimental/` or delete

---

## Migration Checklist

### Phase 1: Exact Duplicates (Day 1)
- [ ] Merge secret-scanner + secrets-exposure-scanner
- [ ] Merge dockerfile-best-practices + dockerfile-linter
- [ ] Update 12 delegation references
- [ ] Test routing still works
- [ ] Archive old agents

### Phase 2: Critical Clusters (Week 1)
- [ ] Create javascript-debugger-unified
- [ ] Create test-quality-analyzer
- [ ] Create security-scanner (enhanced)
- [ ] Migrate delegation chains (47 updates)
- [ ] Validate all delegations work
- [ ] Archive 13 old agents

### Phase 3: High-Value (Week 2)
- [ ] Create database-schema-analyzer
- [ ] Enhance bundle-size-analyzer
- [ ] Create api-schema-validator
- [ ] Migrate delegation chains (31 updates)
- [ ] Archive 11 old agents

### Phase 4: Cleanup (Week 3)
- [ ] Consolidate DMB validators (7 agents)
- [ ] Merge orchestrator duplicates (2 agents)
- [ ] Archive experimental agents (8 agents)
- [ ] Update route table
- [ ] Regenerate fast-path cache

---

## Validation Tests

After each consolidation:
```bash
# Test routing still works
.claude/scripts/test-agent-routing.sh

# Verify delegation chains
.claude/scripts/validate-delegations.sh

# Check for broken references
.claude/scripts/find-broken-agents.sh

# Regenerate route table
.claude/scripts/compile-route-table.sh
```

---

## Rollback Plan

Each phase creates backups:
```
_archived/pre-consolidation-2026-01-31/
  ├── phase1-exact-duplicates/
  ├── phase2-critical-clusters/
  ├── phase3-high-value/
  └── phase4-cleanup/
```

If issues found:
1. Stop consolidation
2. Restore from backup
3. Identify broken delegation
4. Fix and retry

---

## Success Metrics

**Track Before/After**:
- Agent selection time (expect -20%)
- Failed delegations (expect 0)
- Routing errors (expect -30%)
- Developer feedback (expect positive)

**Green Light Criteria**:
- All tests pass
- Zero delegation errors
- Routing time improved
- No task quality regression

---

## Communication

**Notify**:
- Engineering team: "Agent consolidation in progress"
- Update CLAUDE.md with new agent names
- Document new delegation patterns
- Update agent quick reference

**Timeline**:
- Week 1: Duplicates + critical clusters
- Week 2: High-value merges
- Week 3: Cleanup + validation
- Week 4: Documentation + retrospective

---

## Questions?

See full analysis: `docs/reports/20x-optimization-2026-01-31/performance-redundancy.md`
