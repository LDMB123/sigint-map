# Initial Discovery Summary

**Date**: 2026-01-25
**Scale**: Massive custom Claude Code toolkit

---

## Quantified Scope

- **462 Agent Definition Files** (`.md` files in `*/.claude/agents/`)
- **536 Skill Definition Files** (`.md` files in `*/.claude/skills/`)
- **Total Custom Components**: ~1,000 files

This is an exceptionally large, sophisticated Claude Code system spanning:
- Rust development
- WebAssembly (WASM)
- SvelteKit
- Apple Silicon optimization
- MCP integration
- AI/ML workflows
- DevOps, Security, Testing, Documentation
- Parallel/swarm coordination patterns

---

## MCP Plugins Detected

**Active**:
- `puppeteer` (Browser automation MCP server)

**Resources Available**:
- `console://logs` (Browser console logs)

---

## Critical Findings (Pre-Audit)

### 1. Scale Complexity
With nearly 1,000 custom components, coordination is non-trivial:
- **Routing**: How does Claude select the right agent from 462 options?
- **Context Cost**: Loading 462 agent descriptions for routing consumes significant tokens
- **Maintenance**: Updates/changes ripple across many files

### 2. Suspected Redundancies

**Exact Filename Duplicates** (user vs project scope):
- `bundle-analyzer.md`
- `cache-debug.md`
- `dexie-migration-safety.md`
- `dexie-schema-audit.md`
- `offline-e2e-test-harness.md`
- `performance-trace-capture.md`
- `service-worker-integration.md`
- `sw-update-ux.md`
- `offline-navigation-strategy.md`
- `manifest-route-verification.md`
- `a11y-keyboard-test.md`
- `eslint-baseline-audit.md`
- `rollback-plan.md`
- `visual-regression-check.md`
- `implement-dialog-migration.md`
- `implement-details-migration.md`
- `inventory-unnecessary-js.md`
- `map-js-to-native.md`

Found in BOTH:
- `/Users/louisherman/ClaudeCodeProjects/.claude/skills/sveltekit/`
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/.claude/skills/`

**Question**: Are these intentional duplicates or accidental redundancy?

### 3. Multi-Level Coordination Patterns

**Orchestrators Detected**:
- rust-lead-orchestrator
- wasm-lead-orchestrator
- sveltekit-orchestrator
- (possibly more in other domains)

**Parallel Coordinators**:
- rust-parallel-coordinator
- sveltekit parallel-coordinator (as agent 10)
- shared/parallel-coordinator
- map-reduce-orchestrator, scatter-gather-coordinator

**Question**: How do these coordinate? Is there a hierarchy?

### 4. Scope Boundaries

**User-level** (`/Users/louisherman/ClaudeCodeProjects/.claude/`):
- Appears to be general-purpose, cross-project skills
- Organized by technology (Rust, WASM, SvelteKit, accessibility, CSS, PWA)

**Project-level** (`projects/dmb-almanac/app/.claude/`):
- Specific to DMB Almanac project
- Contains team structures (Rust team, WASM team, SvelteKit team, etc.)
- 462 agents suggests this is the main "toolkit"

**Implication**: User-level skills might be "templates" duplicated into projects?

---

## High-Priority Audit Areas

### A. Redundancy Clusters (Immediate ROI)

1. **SvelteKit PWA Skills** (18 exact duplicates between scopes)
2. **Parallel Coordination** (3-4 different parallel coordinators)
3. **QA/Testing** (rust-qa-engineer, sveltekit-qa-engineer, test-* agents)
4. **Documentation** (rust-documentation-specialist, documentation team agents)
5. **Performance** (rust-performance-engineer, performance-optimizer, m-series-performance-optimizer)

### B. Coordination Analysis

1. **Orchestrator Delegation**: Do orchestrators properly delegate to specialists?
2. **Skill Preloading**: Which agents preload skills? Is this efficient?
3. **Model Distribution**: Are 462 agents using appropriate models?
4. **Handoff Contracts**: Do agents return consistent formats?

### C. Context Optimization

1. **Auto-load vs On-demand**: Which skills load automatically?
2. **Description Brevity**: Are agent descriptions concise for routing?
3. **Consolidation Opportunities**: Can similar agents merge?

---

## Blocking Items (User Input Required)

To complete Phase 0 and proceed to Phase 1, need:

1. `/status` output (version, account type, current model)
2. `/usage` output (subscription limits, current usage)
3. `/model opusplan` result (can we use Opus for this audit?)
4. `/agents` output (full built-in + custom agent list with precedence)
5. `/context` output (current baseline context usage)
6. `/permissions` output (allow/ask/deny posture)

**Why this matters**:
- Account type affects model availability and routing behavior
- Context usage baseline helps measure improvement
- Permissions affect which skills can auto-invoke
- Full agent list reveals precedence/shadowing issues

---

## Recommended Audit Strategy

Given the scale (1,000 components), recommend:

### Phase 1: Build Coordination Map
- Parse all 462 agents + 536 skills programmatically
- Extract: name, scope, model, tools, dependencies
- Generate machine-readable JSON + human-readable Markdown

### Phase 2: Automated Redundancy Detection
- Cluster by description similarity (NLP/embedding)
- Flag exact name duplicates
- Identify overlapping tool requirements
- Find missing coordination links

### Phase 3: High-ROI Fixes
- Address top 10 redundancy clusters first
- Standardize handoff contracts
- Optimize model usage
- Reduce auto-load bloat

### Phase 4: Validation
- Build automated validation script
- Test coordination with demo workflows
- Measure context reduction

---

## Next Action

**STATUS**: Phase 0 - PAUSED for user input

Please run the following interactive commands in Claude Desktop and share the output:

```
/status
/usage
/model opusplan
/agents
/context
/permissions
```

Once received, I will:
1. Complete Phase 0 analysis
2. Build full coordination map (Phase 1)
3. Begin redundancy audit (Phase 2)
4. Present top 10 findings for approval before any edits

