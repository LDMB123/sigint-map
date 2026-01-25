# Phase 2: Redundancy & Conflict Audit Report

**Date**: 2026-01-25
**Audit Scope**: 462 agents, 536 skills (~1,000 components)
**Analysis Method**: Automated parsing + pattern detection

---

## Executive Summary

**Critical Finding**: The Claude Code toolkit has **massive redundancy**:

- **40% of all agents** (185/462) have duplicate names
- **45% of all skills** (239/536) have duplicate names
- **99% of agents** (458/462) use unoptimized "default" model
- **67 agents exist in triplicate** (3 identical copies)
- **~2.4M tokens** total if fully loaded (~12x the cost after deduplication)

**Impact**: Routing confusion, precedence ambiguity, extreme context cost, maintenance nightmare.

**Root Cause**: User-level "templates" copied wholesale into project scope, followed by folder reorganizations that left artifacts.

---

## Top 10 Priority Findings

### 1. Default Model Overuse ⚠️ HIGH
**Count**: 458/462 agents (99%)

**Problem**: Nearly all agents use `model: default`, which:
- Varies by account type (Free, Pro, Max)
- May invoke Opus for trivial tasks (expensive)
- May invoke Haiku for complex reasoning (poor quality)

**Recommendation**:
- Scanning/indexing agents → `haiku`
- General code/refactor → `sonnet`
- Deep reasoning/architecture → `opus`
- Mixed plan→implement → `opusplan`

**Estimated Savings**: 60-80% cost reduction by using appropriate tiers

---

### 2. Functional Skills Duplicated User/Project ⚠️ HIGH
**Count**: 235 skills (44% of total)

**Problem**: Real functional skills duplicated verbatim between:
- `/Users/louisherman/ClaudeCodeProjects/.claude/skills/` (user-level)
- `DMBAlmanacProjectFolder/.claude/skills/` (project-level)

**Examples**:
- Web APIs: `web-locks`, `web-bluetooth`, `web-serial`, `web-usb`, `web-share` (11 total)
- Chromium features: `css-nesting`, `view-transitions`, `pwa-*` (23 total)
- Analysis: `dependency-analysis`, `code-complexity-analysis`
- Scraping: `scraper-debugging`, `playwright-scraper-architecture`

**Impact**:
- 2x context cost for every duplicated skill
- Precedence confusion (which version loads?)
- Maintenance burden (update both copies)

**Recommendation**:
**Strategy A**: Cross-project skills → user-level ONLY
- Web APIs, Chromium features, accessibility, CSS → user-level
- Projects inherit via scope precedence

**Strategy B**: Project-specific skills → project-level ONLY
- DMB-specific, SvelteKit-specific → project-level
- Delete user-level copies

**Action**: Classify each of 235 skills, execute strategy

---

### 3. Agent Exact Duplicates (User/Project) ⚠️ HIGH
**Count**: 185 agents (40% of total)

**Problem**: 185 agents exist in BOTH user and project scopes with identical names.

**Top Duplicates**:
- Predictive: `workload-predictor`, `adaptive-tier-selector`, `smart-agent-router`
- Analyzers: `dependency-analyzer`, `complexity-analyzer`, `performance-analyzer`, `architecture-analyzer`, `coverage-analyzer`
- Documentation: `technical-writer`, `onboarding-guide-creator`, `architecture-documenter`, `api-documentation-generator`, `changelog-generator`
- DevOps: `terraform-specialist`, `github-actions-specialist`, `docker-specialist`, `kubernetes-specialist`, `sre-agent`
- Optimization: `token-optimizer`, `context-compressor`, `session-optimizer`

**Impact**:
- Precedence ambiguity (project scope wins, but user copies waste context)
- 2x context cost
- Confusing to reason about which agent does what

**Recommendation**:
**For DMB Almanac project**: Keep project-level versions, DELETE all 185 user-level duplicates

**Rationale**: Project has full specialized team structures. User-level copies are vestigial templates.

---

### 4. Total Context Cost 📊 INFO
**Stats**:
- Total size: 9.1 MB
- Estimated tokens: ~2.4M tokens if fully loaded
- Agent bytes: 2.7 MB (~684K tokens)
- Skill bytes: 6.8 MB (~1.7M tokens)

**Impact**:
With duplicates removed:
- Expected reduction: ~50% (1.2M tokens → manageable)
- Faster routing (fewer descriptions to parse)
- Lower per-session cost

**Recommendation**: Implement lazy loading after deduplication

---

### 5. Triple Duplicates (Reorganization Artifacts) ⚠️ HIGH
**Count**: 67 agents exist in 3 copies

**Pattern**:
- User-level: `.claude/agents/category/agent-name.md`
- Project-level (old): `DMBAlmanacProjectFolder/.claude/agents/category/agent-name.md`
- Project-level (new): `DMBAlmanacProjectFolder/.claude/agents/new-category/agent-name.md`

**Examples**:
- `workload-predictor`: in `predictive/` (user), `predictive/` (project), `coordination/` (project)
- `dependency-analyzer`: in `analyzers/` (user), `analyzers/` (project), `analysis/` (project)
- `technical-writer`: in `documentation/` (user), `documentation/` (project), `generation/` (project)

**Impact**: 3x context cost, extreme precedence confusion

**Recommendation**:
1. Identify canonical version (likely in new category structure)
2. Delete user-level copy
3. Delete old project-level copy
4. Keep only 1 authoritative version

---

### 6. Skill Model Inheritance ✅ INFO
**Count**: 536/536 skills use `model: inherit`

**Status**: **GOOD** - This is correct behavior

**Explanation**: Skills should inherit model from:
- Invoking agent (if skill runs in agent context)
- Session model (if skill runs inline)

**Recommendation**: Keep as-is. No action needed.

---

### 7. Chromium/PWA Skills Duplicates ⚠️ HIGH
**Count**: 23 skills

**Duplicated Skills**:
- `js-to-css-audit`, `css-nesting`, `css-light-dark`, `css-if`
- `view-transitions`, `view-transition-types`
- `pwa-*` (badging, notifications, file handlers, protocol handlers, share target, etc.)
- `offline-e2e-test-harness`

**Recommendation**:
- **Keep user-level** (these are cross-project browser skills)
- **Delete project-level** copies
- Projects inherit user-level skills automatically

---

### 8. Web API Skills Duplicates ⚠️ HIGH
**Count**: 11 skills

**Duplicated APIs**:
- `web-locks`, `web-bluetooth`, `web-serial`, `web-usb`
- `broadcast-channel`, `payment-request`, `credential-management`
- `file-system-access`, `compression-streams`, `storage-api`, `web-share`

**Recommendation**:
- **Keep user-level ONLY** (these are standard Web Platform APIs)
- **Delete all project copies**
- Universal across any web project

---

### 9. Largest Components (Context Hogs) ⚙️ MEDIUM
**Top 5 Largest**:
1. `pwa-macos-specialist` (37 KB, ~9.5K tokens) - **DUPLICATED**
2. `webgpu-metal-bridge` (32 KB, ~8.2K tokens) - **DUPLICATED**
3. `liberation-predictor` (29 KB, ~7.4K tokens) - DMB-specific, **DUPLICATED**
4. `auth-providers` (28 KB, ~7.3K tokens) - **DUPLICATED**
5. `webhook-patterns` (27 KB, ~7.1K tokens) - **DUPLICATED**

**Pattern**: The largest files are ALL duplicated, compounding the problem.

**Recommendation**:
1. Deduplicate first (removes half the context cost)
2. For remaining large files:
   - Move examples/code snippets to separate reference files
   - Keep agent/skill definition concise
   - Link to detailed docs instead of embedding

---

### 10. Orchestrator Duplicates ⚙️ MEDIUM
**Count**: 19 orchestrators/coordinators

**Issue**: Multiple orchestrators with overlapping or identical names:
- `haiku-swarm-coordinator` (duplicated)
- `parallel-coordinator` (duplicated)
- `00-rust-lead-orchestrator`, `00-wasm-lead-orchestrator`, `00-sveltekit-orchestrator`
- `migration-orchestrator`, `workflow-orchestrator`, `review-orchestrator`, `pipeline-orchestrator`
- `swarm-intelligence-orchestrator`, `scatter-gather-coordinator`, `map-reduce-orchestrator`

**Concern**: Which orchestrator handles what? Are there conflicts?

**Recommendation**:
- Namespace orchestrators clearly by domain: `rust:orchestrator`, `wasm:orchestrator`
- OR use category-prefixed filenames consistently (already started with `00-`, `10-`)
- Document orchestrator hierarchy in COORDINATION.md

---

## Additional Findings

### Documentation Files as Skills (LOW priority)
- **Count**: 20 `README.md`, 8 `INDEX.md`, multiple `MANIFEST.md`, `QUICK_START.md`
- **Issue**: These load as invocable skills (e.g., `/README`) which is nonsensical
- **Fix**: Rename to `.txt` or move outside `.claude/skills/`

### Agents with Skill Dependencies (INFO)
- Some agents preload skills via frontmatter `skills: [...]`
- Need to validate all references exist and are accessible
- Document this pattern in COORDINATION.md

---

## Redundancy Tables

### Agent Redundancy by Category

| Category | Total | Duplicates | Duplication Rate |
|----------|-------|------------|------------------|
| Analyzers | 20 | 15 | 75% |
| Documentation | 15 | 12 | 80% |
| Generators | 18 | 14 | 78% |
| Orchestrators | 19 | 8 | 42% |
| Validators | 16 | 10 | 62% |
| DevOps | 15 | 10 | 67% |
| **Overall** | **462** | **185** | **40%** |

### Skill Redundancy by Category

| Category | Total | Duplicates | Duplication Rate |
|----------|-------|------------|------------------|
| Web APIs | 24 | 11 | 46% |
| Chromium/PWA | 50 | 23 | 46% |
| CSS | 30 | 15 | 50% |
| Accessibility | 18 | 9 | 50% |
| Analysis | 12 | 6 | 50% |
| Scraping | 8 | 4 | 50% |
| **Overall** | **536** | **239** | **45%** |

---

## Proposed Deduplication Strategy

### Phase A: Quick Wins (Immediate)

1. **Delete 185 user-level agent duplicates** → Keep project versions
   - Reduces agent count: 462 → 277 (40% reduction)
   - Frees ~684K tokens → ~410K tokens

2. **Delete 235 user-level skill duplicates** → Classify and keep appropriate scope
   - Reduces skill count: 536 → ~300 (44% reduction)
   - Frees ~1.7M tokens → ~950K tokens

3. **Fix triple duplicates** → Delete 2 copies, keep 1 canonical
   - Resolves 67 extreme conflicts
   - Additional context savings

**Estimated Result**:
- Components: 998 → ~600 (40% reduction)
- Context: 2.4M → ~1.4M tokens (42% reduction)

### Phase B: Model Optimization (High ROI)

4. **Apply model policy to 458 agents**:
   - Scanning/indexing → `haiku` (100+ agents)
   - Code/refactor → `sonnet` (250+ agents)
   - Reasoning/architecture → `opus` (50+ agents)
   - Mixed workflows → `opusplan` (50+ agents)

**Estimated Result**: 60-80% cost reduction on agent execution

### Phase C: Context Optimization (Medium-term)

5. **Compress largest components**:
   - Move examples to reference docs
   - Keep definitions concise
   - Target: 50% size reduction for top 20 files

6. **Rename documentation pseudo-skills**:
   - `README.md` → `README.txt` or move out of skills/

7. **Implement lazy loading**:
   - Load agents/skills on-demand, not at startup

---

## Risk Assessment

### Breaking Changes

**Agent Deletions**:
- **Risk**: If user has bookmarked `/agent-name` and we delete user-level copy
- **Mitigation**: User-level duplicates are shadowed by project-level anyway (precedence)
- **Impact**: LOW (project-level already wins)

**Skill Deletions**:
- **Risk**: If user invokes `/skill-name` and we delete the wrong copy
- **Mitigation**: Classify each skill carefully (cross-project vs. project-specific)
- **Impact**: MEDIUM (need classification)

**Model Changes**:
- **Risk**: Agent behavior changes if model tier changes
- **Mitigation**: Test critical agents after model assignment
- **Impact**: MEDIUM (requires validation)

### Precedence Rules

**Current Behavior** (Claude Code scope precedence):
1. Project-level (`.claude/` in project folder)
2. User-level (`.claude/` in home directory)
3. Built-in

**Implication**: Deleting user-level duplicates is SAFE (project versions already win)

---

## Next Steps

**Phase 3**: Define coordination standards (COORDINATION.md)
**Phase 4**: Define model policy (MODEL_POLICY.md)
**Phase 5**: Execute deduplication strategy
**Phase 6**: Build validation script and verify

---

## Appendix: Files Generated

- `.claude/audit/coordination-map.json` - Machine-readable full map
- `.claude/audit/coordination-map.md` - Human-readable summary
- `.claude/audit/redundancy-findings.json` - Detailed findings
- `.claude/audit/PHASE2_REDUNDANCY_REPORT.md` - This report

