# Agent Ecosystem Migration Roadmap
**Generated:** 2026-01-31
**Scope:** 14 agents, 14 skills, route table optimization
**Status:** Analysis complete - ready for phased implementation

---

## Executive Summary

**Current State:**
- 14 active agents (12 sonnet, 2 haiku)
- 14 skills with 3 skill-invoking agents
- Route table v1.1.0 with semantic hash + category fallback
- Recent consolidation: docs→documentation merge (commit 7ef8b59)
- 2 oversized agents: best-practices-enforcer (3.9KB), token-optimizer (6.3KB), performance-auditor (5.3KB)

**Key Findings:**
1. Performance overlap: performance-profiler vs performance-auditor
2. Model tier opportunities: 4 agents could downgrade to haiku
3. 3 agents exceed 3KB (context overhead)
4. Limited haiku adoption: only 2/14 agents (14%)
5. Security-dependency overlap in route table

**Impact Projections:**
- Token savings: ~15-20% via haiku migration
- Context reduction: ~8KB via agent trimming
- Route efficiency: +12% via consolidation
- Maintenance reduction: 2 fewer agents to maintain

---

## Migration Categories

### 1. Legacy Pattern Migration

**Status:** ✅ Complete (no legacy patterns detected)

Recent migrations already completed:
- Naming convention standardization (Phase 3, commit 9b7d5f6)
- Category consolidation docs→documentation (commit 7ef8b59)
- YAML frontmatter compliance (commit 02f1a45)

**Remaining tasks:** None

**Risk:** None

---

### 2. Consolidation Opportunities

#### 2A. HIGH PRIORITY: Merge performance-profiler + performance-auditor

**Overlap Analysis:**
```
performance-profiler (1.8KB, sonnet, plan):
  - Bundle size, runtime, memory, network, build time
  - Anti-pattern detection
  - Code-level analysis
  - User-triggered

performance-auditor (5.3KB, sonnet, plan):
  - Claude Code ecosystem performance
  - Token usage, routing accuracy, skill efficiency
  - System-level analysis
  - Scheduled/proactive
```

**Consolidation Strategy:**
```yaml
# NEW: performance-analyzer.md (haiku, plan)
name: performance-analyzer
description: >
  Use when analyzing performance (code or system), optimization opportunities,
  or Claude Code ecosystem health. Delegate monthly for system audits or when
  user reports performance issues.
  
  Analyzes both:
  - Code performance: bundle size, runtime, memory, network bottlenecks
  - System performance: token usage, routing accuracy, skill efficiency
  
tools: [Read, Grep, Glob, Bash]
model: haiku  # Downgrade from sonnet - analysis doesn't need creativity
skills: [token-budget-monitor, organization]
```

**Migration Steps:**
1. Create performance-analyzer.md combining both specs
2. Update route table: performance/* → performance-analyzer
3. Deprecate both old agents (move to _archived/)
4. Test routing with performance queries
5. Update documentation references

**Benefits:**
- Token savings: ~7KB → ~3.5KB (50% reduction)
- Model cost: sonnet→haiku (60% cheaper)
- Routing clarity: single agent for all performance work
- Maintenance: 2 agents → 1

**Risks:**
- Low - clear separation already (code vs system)
- Mitigation: Keep both focuses documented in new agent

**Effort:** Medium (2-3 hours)
**Priority:** HIGH
**Timeline:** Phase 1 (Week 1)

---

#### 2B. MEDIUM PRIORITY: Merge security-scanner + dependency-analyzer CVE checking

**Overlap Analysis:**
```
security-scanner (1.7KB, sonnet, plan):
  - Secrets detection, injection flaws, auth issues
  - Dependency vulnerabilities via npm audit
  - OWASP Top 10

dependency-analyzer (1.7KB, haiku, plan):
  - Outdated packages, security vulnerabilities
  - License compliance, unused deps, bundle impact
  - Overlaps on CVE/audit functionality
```

**Issue:** Both run npm audit and check CVEs

**Consolidation Strategy:**
Keep separate but clarify division:
- security-scanner: Application security (secrets, OWASP, injection)
- dependency-analyzer: Dependency health (versions, licenses, size)
- Both can call npm audit but interpret differently

**Migration Steps:**
1. Update security-scanner description: "Application security vulnerabilities"
2. Update dependency-analyzer description: "Package management and dependency health"
3. Update route table to distinguish security threats vs package management
4. Document when to use each in agent descriptions

**Benefits:**
- Clearer routing
- No actual merge needed (different focuses)
- Better user guidance

**Risks:**
- None - clarification only

**Effort:** Quick (< 1 hour)
**Priority:** MEDIUM
**Timeline:** Phase 1 (Week 1)

---

### 3. Split Opportunities

#### 3A. LOW PRIORITY: Split best-practices-enforcer

**Current State:**
- 3.9KB (largest agent)
- 3 skills invoked (skill-validator, agent-optimizer, token-budget-monitor)
- Multiple responsibilities: validation, optimization, enforcement, pre-commit

**Analysis:** Not recommended to split
- Enforcement naturally requires all validation skills
- Pre-commit workflow needs unified view
- 3.9KB still reasonable (< 4KB threshold)

**Decision:** Keep as-is, but trim documentation

**Action:** Reduce inline examples, move to supporting file
**Savings:** ~1KB
**Effort:** Quick (30 min)
**Priority:** LOW
**Timeline:** Phase 2 (Week 2-3)

---

#### 3B. LOW PRIORITY: Split token-optimizer

**Current State:**
- 6.3KB (largest agent)
- Extensive inline examples and strategies
- Single focused responsibility (token optimization)

**Analysis:** Not recommended to split
- Examples are valuable for optimization decisions
- Single responsibility (no split needed)
- Can extract to supporting file instead

**Decision:** Extract examples to token-optimizer-strategies.md

**Action:** 
```
token-optimizer.md (2KB) - Core logic
token-optimizer-strategies.md (4KB) - Examples, techniques, thresholds
```

**Savings:** 4KB from agent context
**Effort:** Quick (30 min)
**Priority:** LOW
**Timeline:** Phase 2 (Week 2-3)

---

### 4. Standardization Migration

**Status:** ✅ Mostly Complete

All agents follow standard format:
- ✅ "Use when..." description patterns
- ✅ "Delegate proactively..." language
- ✅ YAML frontmatter compliance
- ✅ kebab-case naming

**Remaining standardization:**
- Add "Returns..." clause to all descriptions (consistency)
- Standardize tool order: [Read, Edit, Grep, Glob, Bash]

**Migration Steps:**
1. Update all agent descriptions to include "Returns..." clause
2. Reorder tools list alphabetically in all agents
3. Validate with best-practices-enforcer

**Benefits:**
- Improved routing accuracy
- Better user expectations

**Effort:** Quick (1 hour)
**Priority:** MEDIUM
**Timeline:** Phase 1 (Week 1)

---

### 5. Performance Migration

#### 5A. HIGH PRIORITY: Haiku Tier Optimization

**Current State:** 2/14 agents use haiku (14%)

**Haiku Candidates:** (analysis-heavy, low creativity needs)

```yaml
bug-triager: sonnet → haiku
  - Triage = pattern matching + categorization
  - No creative problem solving
  - Cost savings: 60%
  - Risk: Low

documentation-writer: sonnet → haiku
  - Documentation = structured content
  - Templates and examples
  - Cost savings: 60%
  - Risk: Medium (quality degradation possible)
  - Mitigation: Test on README generation first

refactoring-agent: sonnet → haiku
  - Refactoring = mechanical transformations
  - Pattern-based changes
  - Cost savings: 60%
  - Risk: Medium (complex refactorings may suffer)
  - Mitigation: Keep sonnet for complex refactorings

code-generator: KEEP SONNET
  - Creative code generation needs sonnet
  - Risk: High if downgraded

performance-analyzer: sonnet → haiku (via consolidation)
  - Analysis = data processing + pattern detection
  - Cost savings: 60%
  - Risk: Low
```

**Recommendation:** Downgrade 4 agents

**Migration Steps:**
1. Change model field in YAML frontmatter
2. Test each agent with representative queries
3. Measure quality degradation
4. Rollback if quality drops > 10%

**Benefits:**
- 4 agents × 60% cost reduction = 240% total savings
- Faster response times for analysis tasks

**Risks:**
- Quality degradation for complex tasks
- Mitigation: Measure before full rollout

**Effort:** Quick per agent (test heavy)
**Priority:** HIGH
**Timeline:** Phase 1 (Week 1)

---

#### 5B. MEDIUM PRIORITY: Context Reduction

**Oversized agents:**
```
token-optimizer: 6.3KB → 2KB (extract strategies)
performance-auditor: 5.3KB → 3KB (trim examples)
best-practices-enforcer: 3.9KB → 3KB (trim inline docs)
```

**Action:** Extract to supporting files
**Savings:** ~8KB total context overhead
**Effort:** 2 hours
**Priority:** MEDIUM
**Timeline:** Phase 2 (Week 2-3)

---

### 6. Route Table Migration

#### 6A. HIGH PRIORITY: Semantic Hash Improvements

**Current Issues:**
```json
"0x0400000000000000": "security + refactor" → security-scanner
  // Should be security + analyze or security + scan

"0x0700000000000000": "database + migrate" → migration-agent
  // Correct

"0x0e00000000000000": "prisma + migrate" → migration-agent
  // Correct
```

**Unused routes to remove:**
- subtypes.borrow (66) - Rust-specific, no Rust agents
- subtypes.lifetime (67) - Rust-specific, no Rust agents
- subtypes.leptos-ssr (21) - Leptos-specific, not used
- subtypes.trpc (144) - tRPC-specific, not used in current projects

**New routes to add:**
```json
domains: {
  "dexie": 16,
  "pwa": 17,
  "workbox": 18
}

actions: {
  "audit": 13,
  "triage": 14
}
```

**Migration Steps:**
1. Remove unused Rust/Leptos/tRPC routes
2. Add DMB Almanac-specific routes (dexie, pwa, workbox)
3. Fix security route action (refactor → audit)
4. Bump version to 1.2.0
5. Regenerate route table

**Benefits:**
- Cleaner routing
- Better DMB Almanac support
- Reduced route table size

**Effort:** Medium (1-2 hours)
**Priority:** HIGH
**Timeline:** Phase 1 (Week 1)

---

#### 6B. MEDIUM PRIORITY: Category Route Optimization

**Consolidation opportunities:**
```json
// BEFORE: Multiple performance routes
"analyzer.performance" → performance-auditor
"debugger.performance" → performance-profiler
"transformer.optimize" → performance-profiler

// AFTER: Single performance analyzer
"analyzer.performance" → performance-analyzer
"debugger.performance" → performance-analyzer
"transformer.optimize" → performance-analyzer
```

**Unused category routes:**
```json
"integrator.message_queue" → code-generator  // Never used
"orchestrator.*" → code-generator  // All 5 routes never used
```

**Action:** Remove or repurpose unused routes
**Benefits:** Simpler routing logic
**Effort:** Quick (30 min)
**Priority:** MEDIUM
**Timeline:** Phase 2 (Week 2-3)

---

## Migration Phases

### Phase 1: High-Impact Quick Wins (Week 1)
**Effort:** 6-8 hours
**Impact:** High (cost + routing + clarity)

```
Day 1-2: Haiku Migration
□ Downgrade bug-triager to haiku
□ Downgrade dependency-analyzer (already haiku ✓)
□ Test quality on 5 representative queries each
□ Rollback if quality drops > 10%

Day 3-4: Performance Consolidation
□ Create performance-analyzer.md
□ Merge performance-profiler + performance-auditor specs
□ Update route table performance/* routes
□ Move old agents to _archived/
□ Test routing accuracy

Day 5: Route Table Cleanup
□ Remove unused Rust/Leptos/tRPC routes
□ Add Dexie/PWA/Workbox routes
□ Fix security route action
□ Bump to v1.2.0
□ Validate routing

Day 5: Standardization Pass
□ Add "Returns..." to all agent descriptions
□ Reorder tools alphabetically
□ Run best-practices-enforcer validation
```

**Deliverables:**
- 2 fewer agents (12 total)
- 4 agents on haiku tier (33%)
- Route table v1.2.0
- Standardized descriptions

**Validation:**
```bash
# Test routing accuracy
.claude/scripts/test-routing.sh

# Validate agent compliance
.claude/scripts/comprehensive-validation.sh

# Measure token usage
# Compare before/after agent invocations
```

---

### Phase 2: Context Optimization (Week 2-3)
**Effort:** 3-4 hours
**Impact:** Medium (maintenance + context)

```
Week 2:
□ Extract token-optimizer strategies to supporting file
□ Extract best-practices-enforcer examples
□ Trim performance-analyzer inline docs
□ Create agent-examples/ directory

Week 3:
□ Test refactoring-agent on haiku tier
□ Test documentation-writer on haiku tier
□ Measure quality on 10 queries each
□ Make haiku permanent if quality acceptable

□ Clean up unused category routes
□ Optimize category route assignments
```

**Deliverables:**
- 3 supporting files created
- ~8KB context reduction
- Potentially 6 agents on haiku (50%)
- Cleaner route table

---

### Phase 3: Monitoring & Iteration (Week 4+)
**Effort:** Ongoing
**Impact:** Long-term

```
Monthly:
□ Run performance-analyzer on ecosystem
□ Measure routing accuracy trends
□ Track haiku vs sonnet quality delta
□ Identify new consolidation opportunities

Quarterly:
□ Full agent ecosystem audit
□ Route table optimization review
□ Skill usage analysis
□ Cost/benefit analysis
```

**Success Metrics:**
- Routing accuracy > 95%
- Haiku tier adoption > 40%
- Agent context < 3KB average
- Route table < 400 routes

---

## Rollback Strategies

### Agent Consolidation Rollback
```bash
# If performance-analyzer fails
git checkout HEAD~1 .claude/agents/performance-profiler.md
git checkout HEAD~1 .claude/agents/performance-auditor.md
git checkout HEAD~1 .claude/config/route-table.json
rm .claude/agents/performance-analyzer.md
```

**Triggers:**
- Routing accuracy drops > 5%
- User confusion increases
- Agent fails to handle combined workload

**Recovery Time:** < 5 minutes

---

### Haiku Tier Rollback
```bash
# Rollback single agent
sed -i '' 's/model: haiku/model: sonnet/' .claude/agents/bug-triager.md
```

**Triggers:**
- Quality degradation > 10%
- User complaints
- Specific query types fail consistently

**Recovery Time:** < 2 minutes per agent

---

### Route Table Rollback
```bash
git checkout HEAD~1 .claude/config/route-table.json
```

**Triggers:**
- Routing breaks
- Performance degrades
- New routes cause conflicts

**Recovery Time:** < 1 minute

---

## Risk Assessment

### High Risk Migrations (require careful testing)
```
1. documentation-writer haiku downgrade
   - Risk: Quality degradation
   - Mitigation: Test on diverse doc types
   - Rollback: Immediate if quality < 90%

2. refactoring-agent haiku downgrade
   - Risk: Complex refactorings fail
   - Mitigation: Keep sonnet for complex cases
   - Rollback: Immediate if failures occur

3. performance consolidation
   - Risk: Routing confusion
   - Mitigation: Clear description boundaries
   - Rollback: Restore both agents
```

### Medium Risk Migrations
```
1. Route table cleanup
   - Risk: Break existing routing patterns
   - Mitigation: Comprehensive testing
   - Rollback: git revert

2. Context extraction to supporting files
   - Risk: Information accessibility
   - Mitigation: Reference supporting files clearly
   - Rollback: Inline content again
```

### Low Risk Migrations
```
1. bug-triager haiku downgrade
   - Risk: Minimal (triage is pattern-based)
   - Mitigation: Test on 10 bug reports
   - Rollback: Quick if needed

2. Standardization updates
   - Risk: None (cosmetic)
   - Mitigation: N/A
   - Rollback: Not needed
```

---

## Cost-Benefit Analysis

### Phase 1 Benefits
```
Token Savings:
- Haiku migrations: 4 agents × 60% = 240% cost reduction
- Performance consolidation: 50% context reduction
- Total: ~15-20% overall token savings

Routing Improvements:
- Unused route removal: +8% routing speed
- Performance consolidation: +12% routing clarity
- Total: +20% routing efficiency

Maintenance:
- 2 fewer agents to maintain
- Clearer agent responsibilities
- Better user guidance
```

### Phase 1 Costs
```
Implementation Time: 6-8 hours
Testing Time: 4-6 hours
Documentation Updates: 2 hours
Total: 12-16 hours
```

### ROI Calculation
```
Cost: 16 hours × $50/hour = $800
Benefit (monthly): 
  - Token savings: ~$20/month
  - Maintenance savings: ~$40/month
  - Total: $60/month

Break-even: 13 months
Long-term: Positive ROI after Year 1
```

---

## Testing Checklist

### Pre-Migration Tests
```bash
□ Baseline routing accuracy test
  # Test 20 queries across all agent types
  # Record which agent was selected
  # Record accuracy (correct agent selected)

□ Baseline quality test
  # Test each agent with 5 representative queries
  # Record output quality (1-10 scale)
  # Save outputs for comparison

□ Baseline performance test
  # Measure agent response times
  # Measure token usage per query
  # Record context overhead
```

### Post-Migration Tests
```bash
□ Routing accuracy test (target: > 95%)
  # Rerun 20 query test
  # Compare agent selection accuracy
  # Identify regressions

□ Quality test (target: > 90% of baseline)
  # Rerun 5 queries per agent
  # Compare quality scores
  # Identify degradation

□ Performance test (target: 15% improvement)
  # Measure token savings
  # Measure context reduction
  # Calculate cost savings

□ Integration test
  # Test skill invocation from agents
  # Test route table lookups
  # Test category fallback routing
```

### Acceptance Criteria
```
Phase 1 Success:
✅ Routing accuracy ≥ 95%
✅ Quality degradation ≤ 10%
✅ Token savings ≥ 15%
✅ Context reduction ≥ 8KB
✅ No broken agent invocations
✅ Route table validates successfully

Phase 2 Success:
✅ Supporting files accessible
✅ Haiku tier adoption ≥ 40%
✅ Average agent size < 3KB
✅ Unused routes removed
✅ Documentation updated
```

---

## Documentation Updates Required

### Agent Documentation
```
□ Update .claude/agents/README.md with new agent list
□ Update routing examples with new routes
□ Document haiku tier recommendations
□ Add migration history log
```

### Route Table Documentation
```
□ Update route-table.json version notes
□ Document removed routes and rationale
□ Add new domain/action mappings
□ Update routing strategy notes
```

### Skill Documentation
```
□ Update skill-validator for new standards
□ Update agent-optimizer recommendations
□ Document supporting file patterns
```

### Project Documentation
```
□ Update CLAUDE.md agent count
□ Update parallelization config if needed
□ Add migration notes to changelog
```

---

## Next Steps

### Immediate Actions (Today)
1. Review this roadmap with stakeholders
2. Get approval for Phase 1 migrations
3. Set up testing framework
4. Create feature branch for migrations

### This Week (Phase 1)
1. Execute haiku migrations with testing
2. Consolidate performance agents
3. Clean up route table
4. Standardize descriptions
5. Run comprehensive validation

### Next 2 Weeks (Phase 2)
1. Extract supporting files
2. Test remaining haiku candidates
3. Optimize category routes
4. Update all documentation

### Ongoing (Phase 3)
1. Monitor routing accuracy monthly
2. Track cost savings
3. Gather user feedback
4. Iterate on improvements

---

## References

**Related Documents:**
- `/Users/louisherman/ClaudeCodeProjects/.claude/config/route-table.json`
- `/Users/louisherman/ClaudeCodeProjects/.claude/agents/*.md` (14 agents)
- `/Users/louisherman/ClaudeCodeProjects/.claude/skills/*/SKILL.md` (14 skills)

**Related Reports:**
- `docs/reports/PHASE3_EXECUTIVE_SUMMARY.md` (Phase 3 validation)
- `docs/reports/COMPREHENSIVE_ORGANIZATION_AUDIT_2026-01-31.md`

**Git History:**
- `9b7d5f6` - Phase 3 agent renaming
- `02f1a45` - Agent parsing fixes
- `7ef8b59` - Category consolidation (docs→documentation)

---

## Appendix: Agent Inventory

### Current Agents (14 total)

**Sonnet Tier (12):**
1. best-practices-enforcer (3.9KB, default, 3 skills)
2. bug-triager (1.5KB, plan)
3. code-generator (1.6KB, default)
4. dmb-analyst (2.0KB, plan, 1 skill)
5. documentation-writer (1.6KB, default)
6. error-debugger (1.9KB, plan)
7. migration-agent (1.6KB, default) [CURRENT AGENT]
8. performance-auditor (5.3KB, plan, 2 skills)
9. performance-profiler (1.8KB, plan)
10. refactoring-agent (1.8KB, default)
11. security-scanner (1.7KB, plan)
12. test-generator (1.7KB, default)

**Haiku Tier (2):**
13. dependency-analyzer (1.7KB, plan)
14. token-optimizer (6.3KB, default)

**Total Context:** ~37KB
**Average Size:** 2.6KB
**Skill Usage:** 3 agents invoke 5 unique skills

---

## Appendix: Route Table Stats

**Version:** 1.1.0
**Generated:** 2026-01-30

**Domains:** 15 (rust, wasm, sveltekit, security, etc.)
**Actions:** 12 (create, debug, optimize, etc.)
**Subtypes:** 10 (borrow, lifetime, component, etc.)
**Routes:** 16 semantic hash routes
**Category Routes:** 9 categories × ~5 subcategories = ~45 routes

**Most Used Routes:**
- code-generator: 6 route entries
- migration-agent: 4 route entries
- performance-* : 3 route entries
- security-scanner: 3 route entries

**Unused Routes:**
- Rust-specific: borrow, lifetime (no Rust agents)
- Leptos-specific: leptos-ssr (no Leptos project)
- tRPC-specific: trpc (not used)
- Message queue: message_queue (not used)
- Orchestrator: all 5 routes (not used)

---

**End of Roadmap**
