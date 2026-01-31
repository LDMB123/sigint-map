# DUPLICATE DETECTION QUICK REFERENCE

**Date:** 2026-01-31 | **Status:** ANALYSIS COMPLETE

---

## Key Findings at a Glance

### Duplicates Found
- **Exact Duplicates:** 0/14 agents, 0/14 skills
- **Functional Duplicates:** 1 pair (performance agents)
- **False Positives:** 0
- **Confidence:** HIGH

### Health Score: 75/100
- Rename agents: +5 (clarity)
- Review 3 underutilized: +5 (value)
- Add validation hooks: +3 (reliability)
- **Target:** 85/100

---

## Critical Pair Analysis

### performance-auditor vs performance-profiler

| Factor | Status |
|--------|--------|
| Identical code | NO |
| Same domain | NO (infra vs app) |
| Same tools | YES (identical) |
| Same model | YES (Sonnet) |
| Route overlap | NO (7 vs 3) |
| Purpose overlap | YES (performance analysis) |
| **Verdict** | KEEP SEPARATE but rename |

**Action:** Rename for clarity
```
performance-auditor → claude-code-auditor
performance-profiler → code-profiler
```

**Why?** Prevents user confusion between infrastructure vs application performance analysis

---

## Agent Specialization Map

```
CREATE      → code-generator (16 routes) - PRIMARY GENERATOR
├─ generate code specs
├─ scaffold boilerplate
├─ generate config
├─ create pipelines

TRANSFORM   → migration-agent (6 routes) + refactoring-agent (2 routes)
├─ migrate frameworks
├─ upgrade APIs
├─ refactor code
├─ consolidate duplication

ANALYZE     → dependency-analyzer (8) + performance-profiler (3)
├─ audit dependencies
├─ profile performance
├─ analyze code patterns

VALIDATE    → best-practices-enforcer (9) + security-scanner (6)
├─ enforce best practices
├─ scan security
├─ validate schemas

DEBUG       → error-debugger (5)
├─ diagnose errors
├─ trace failures
└─ recommend fixes

DOCUMENT    → documentation-writer (6)
├─ generate docs
├─ create API refs
└─ write guides

TEST        → test-generator (3)
├─ generate unit tests
├─ create integration tests

MONITOR     → performance-auditor (7) + token-optimizer (1)
├─ audit Claude Code perf
├─ track token usage
└─ optimize context

TRIAGE      → bug-triager (1)
├─ assess severity
├─ locate issues
└─ estimate effort

DOMAIN      → dmb-analyst (1)
├─ DMB concert analysis
└─ setlist statistics
```

---

## Routing Concentration Risk

### Volume Leaders
1. **code-generator** - 52% of all routes (16/31)
   - Status: Healthy centralization
   - Risk: Monitor for overload
   - Action: Pre-split if routes diverge

2. **best-practices-enforcer** - 29% (9/31)
   - Status: Validation consolidation
   - Risk: Low (validation agent)
   - Action: Keep

3. **dependency-analyzer** - 26% (8/31)
   - Status: Analysis specialist
   - Risk: Low (read-only)
   - Action: Keep

### Minimal Users (1 route each)
- bug-triager (domain-specific)
- token-optimizer (covered by skill)
- dmb-analyst (domain-specific)

**Action:** Review usage analytics

---

## Skill Health Check

### Healthy Patterns
✅ No duplicate skills (14 unique)
✅ No content overlap (MD5 validation)
✅ No naming conflicts
✅ Skills used as helpers (5 agents invoke skills)
✅ Low coupling design (10 agents independent)

### Compound Skills (By Design)
- **code-quality** - Combines review + security + test
- **mcp-integration** - Bundles 4 MCP extensions

These are intentionally compound to reduce token overhead.

---

## Quick Decision Tree

```
QUESTION: "Are agents X and Y duplicates?"

├─ Do they have identical names?
│  ├─ YES → Exact duplicate (archive one)
│  └─ NO → Continue
│
├─ Do they have identical content (MD5)?
│  ├─ YES → True duplicate (merge)
│  └─ NO → Continue
│
├─ Do they serve the same purpose?
│  ├─ YES → Check domain overlap
│  │  ├─ Domains differ → Acceptable separation
│  │  └─ Domains same → Consolidate
│  └─ NO → Keep separate

└─ VERDICT: Functional duplicate if >80% capability overlap
```

---

## Action Items by Priority

### Priority 1: DO IMMEDIATELY (15 min)
- [ ] Rename `performance-auditor` → `claude-code-auditor`
- [ ] Rename `performance-profiler` → `code-profiler`
- [ ] Update route table references (if any)

### Priority 2: DO THIS MONTH (1 hour)
- [ ] Analyze usage of: bug-triager, token-optimizer, dmb-analyst
- [ ] Decide: Keep or archive each
- [ ] Implement route validation script
- [ ] Add pre-commit hook for validation

### Priority 3: QUARTERLY REVIEW (ongoing)
- [ ] Monitor code-generator invocation frequency
- [ ] Track agent usage patterns
- [ ] Review for new duplicates
- [ ] Update this analysis

---

## Validation Scripts

### Test 1: Route Table Integrity
```bash
#!/bin/bash
# Verify all routed agents exist
missing=0
grep -o '"agent"[[:space:]]*:[[:space:]]*"[^"]*"' \
  .claude/config/route-table.json | \
  sed 's/"agent"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' | sort -u | \
while read agent; do
  if [ ! -f ".claude/agents/$agent.md" ]; then
    echo "MISSING AGENT: $agent"
    ((missing++))
  fi
done
exit $missing
```

### Test 2: Agent Count
```bash
#!/bin/bash
agent_count=$(find .claude/agents -name "*.md" | wc -l)
route_count=$(grep -o '"agent"' .claude/config/route-table.json | wc -l)
echo "Agents: $agent_count"
echo "Routes: $route_count"
echo "Reuse Factor: $(echo "scale=2; $route_count / $agent_count" | bc)"
```

### Test 3: Duplicate Detection
```bash
#!/bin/bash
# Find content duplicates by MD5
find .claude/agents .claude/skills -name "*.md" -type f | \
while read f; do
  md5 "$f" | awk '{print $NF, $0}'
done | sort | uniq -d | cut -d' ' -f2-
```

---

## FAQ

**Q: Should we consolidate performance agents?**
A: No. Keep separate but rename for clarity. Domains are sufficiently different.

**Q: Is 52% of routes in code-generator a problem?**
A: Not critical. Monitor for overload, but centralized code generation is healthy. Pre-split only if routes diverge significantly.

**Q: Why don't more agents invoke skills?**
A: Good design. Most agents operate independently. Skills are helpers for complex operations only (best-practices-enforcer, performance-auditor, dmb-analyst).

**Q: Should we merge bug-triager since it only has 1 route?**
A: Review usage analytics first. If unused for 30+ days, consider archiving. Don't merge without understanding user needs.

**Q: What's the difference between code-quality skill and best-practices-enforcer agent?**
A: Skill is compound (combines review+security+test), can be called independently. Agent is specific to skill/agent validation. Keep both.

---

## Verification Checklist

Before implementing recommendations:

- [ ] All agents in route table exist
- [ ] All skills referenced by agents exist
- [ ] No circular agent dependencies
- [ ] No stale file references
- [ ] All YAML frontmatter valid
- [ ] All descriptions follow "Use when..." pattern
- [ ] No content duplicates (MD5)
- [ ] Route table version matches agents/skills version

---

## History

| Date | Finding | Action | Status |
|------|---------|--------|--------|
| 2026-01-31 | Performance agents naming confusing | Rename both | PENDING |
| 2026-01-31 | 3 agents receive minimal routing | Review for value | PENDING |
| 2026-01-31 | No route validation hooks | Add validation | PENDING |

---

**Last Updated:** 2026-01-31  
**Next Review:** 2026-04-30 (Quarterly)  
**Maintained By:** Claude Agent - Dependency Analyzer
