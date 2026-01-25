# Phase 2: Orphan Detection Results
**Generated**: 2026-01-25

---

## Executive Summary

**Total Agents Analyzed**: 470
**Total Issues Found**: 284

| Issue Category | Count | Severity |
|----------------|-------|----------|
| Shadowed | 2 | 🔴 Critical |
| Disabled | 0 | 🟡 Warning |
| Dangling References | 14 | 🟡 Warning |
| Model Issues | 12 | 🟡 Warning |
| Unreachable | 252 | 🟢 Info |
| Format Issues | 4 | 🟢 Info |

---

## 1. Shadowed Agents (Critical)

**Count**: 2

These agents exist in multiple scopes. The project-scoped version will override the user-scoped version.

### `qa-engineer`
- **Shadowed File**: `/Users/louisherman/.claude/agents/testing/QA Engineer.md`
- **Shadowed By**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/.claude/agents/08-qa-engineer.md`
- **Reason**: Project-scoped agent with same name takes precedence

### `performance-optimizer`
- **Shadowed File**: `/Users/louisherman/.claude/agents/engineering/Performance Optimizer.md`
- **Shadowed By**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/.claude/agents/07-performance-optimizer.md`
- **Reason**: Project-scoped agent with same name takes precedence

---

## 2. Disabled Agents (Warning)

**Count**: 0

✅ No agents are explicitly disabled by permission rules.

---

## 3. Dangling References (Warning)

**Count**: 14

These agent names are referenced in `collaboration` metadata but don't exist in the filesystem.

### `any-sonnet-orchestrator`
- **Referenced by**: 3 agent(s)
- **Agents**: `file-pattern-finder`, `batch-formatter`, `code-pattern-matcher`

### `All orchestrators`
- **Referenced by**: 1 agent(s)
- **Agents**: `adaptive-strategy-executor`

### `build-debugger`
- **Referenced by**: 1 agent(s)
- **Agents**: `migration-orchestrator`

### `compliance-checker`
- **Referenced by**: 1 agent(s)
- **Agents**: `security-hardening-orchestrator`

### `dependency-analyzer`
- **Referenced by**: 1 agent(s)
- **Agents**: `migration-orchestrator`

### `documentation-generator`
- **Referenced by**: 1 agent(s)
- **Agents**: `api-evolution-orchestrator`

### `domain-specific-experts`
- **Referenced by**: 1 agent(s)
- **Agents**: `first-principles-thinker`

### `haiku-swarm-coordinator`
- **Referenced by**: 1 agent(s)
- **Agents**: `code-pattern-matcher`

### `junior-developers`
- **Referenced by**: 1 agent(s)
- **Agents**: `rubber-duck-debugger`

### `migration-transformer`
- **Referenced by**: 1 agent(s)
- **Agents**: `migration-orchestrator`

### `risk-assessor`
- **Referenced by**: 1 agent(s)
- **Agents**: `expert-planner`

### `secret-detector`
- **Referenced by**: 1 agent(s)
- **Agents**: `security-hardening-orchestrator`

### `static-analyzer`
- **Referenced by**: 1 agent(s)
- **Agents**: `migration-orchestrator`

### `test-validator`
- **Referenced by**: 1 agent(s)
- **Agents**: `test-coverage-orchestrator`

---

## 4. Model Issues (Warning)

**Count**: 12

Agents with missing or inconsistent model naming.

### Missing Model Field

- `e-commerce-analyst` — /Users/louisherman/.claude/agents/ecommerce/E-commerce Analyst.md

### Inconsistent Model Naming

- `sveltekit-engineer` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `caching-specialist` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `pwa-engineer` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `vite-build-engineer` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `local-first-steward` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `lead-orchestrator` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `performance-optimizer` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `parallel-coordinator` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `qa-engineer` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `eslint-typescript-steward` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`
- `svelte-component-engineer` — Current: `Gemini 3 Pro`, Suggested: `gemini-3-pro`

---

## 5. Unreachable Agents (Info)

**Count**: 252

These agents are not referenced in any `collaboration` metadata and have no collaborations defined themselves.

**Note**: This doesn't mean they're broken—they may be invoked directly by users or documented elsewhere.

### Top 20 Unreachable Agents

- `dmb-brand-dna-expert` (user) — /Users/louisherman/.claude/agents/DMB Brand DNA Expert.md
- `ai-product-fusion-agent` (user) — /Users/louisherman/.claude/agents/fusion/AI Product Fusion Agent.md
- `performance-security-fusion-agent` (user) — /Users/louisherman/.claude/agents/fusion/Performance Security Fusion Agent.md
- `security-devops-fusion-agent` (user) — /Users/louisherman/.claude/agents/fusion/Security DevOps Fusion Agent.md
- `full-stack-fusion-agent` (user) — /Users/louisherman/.claude/agents/fusion/Full Stack Fusion Agent.md
- `data-analytics-fusion-agent` (user) — /Users/louisherman/.claude/agents/fusion/Data Analytics Fusion Agent.md
- `super-agent-generator` (user) — /Users/louisherman/.claude/agents/fusion-compiler/Super Agent Generator.md
- `runtime-fuser` (user) — /Users/louisherman/.claude/agents/fusion-compiler/Runtime Fuser.md
- `ux-researcher` (user) — /Users/louisherman/.claude/agents/design/UX Researcher.md
- `creative-director` (user) — /Users/louisherman/.claude/agents/design/Creative Director.md
- `ui-designer` (user) — /Users/louisherman/.claude/agents/design/UI Designer.md
- `brand-designer` (user) — /Users/louisherman/.claude/agents/design/Brand Designer.md
- `web-designer` (user) — /Users/louisherman/.claude/agents/design/Web Designer.md
- `motion-designer` (user) — /Users/louisherman/.claude/agents/design/Motion Designer.md
- `platform-engineer` (user) — /Users/louisherman/.claude/agents/devops/Platform Engineer.md
- `finops-specialist` (user) — /Users/louisherman/.claude/agents/devops/FinOps Specialist.md
- `e-commerce-analyst` (user) — /Users/louisherman/.claude/agents/ecommerce/E-commerce Analyst.md
- `etsy-specialist` (user) — /Users/louisherman/.claude/agents/ecommerce/Etsy Specialist.md
- `ecommerce-strategist` (user) — /Users/louisherman/.claude/agents/ecommerce/E-commerce Strategist.md
- `inventory-manager` (user) — /Users/louisherman/.claude/agents/ecommerce/inventory-manager.md

_(... and 232 more. See JSON for full list.)_

---

## 6. Format Issues (Info)

**Count**: 4

### `modern-css-architect`
- **File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/.claude/agents/12-modern-css-architect.md`
- **Issue**: Project agent uses YAML frontmatter instead of plain markdown (unlike others)

### `lint-regression-debugger`
- **File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/.claude/agents/14-lint-regression-debugger.md`
- **Issue**: Project agent uses YAML frontmatter instead of plain markdown (unlike others)

### `ui-regression-debugger`
- **File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/.claude/agents/13-ui-regression-debugger.md`
- **Issue**: Project agent uses YAML frontmatter instead of plain markdown (unlike others)

### `semantic-html-engineer`
- **File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/.claude/agents/11-semantic-html-engineer.md`
- **Issue**: Project agent uses YAML frontmatter instead of plain markdown (unlike others)

---

## Next Steps

Proceeding to **PHASE 3: Fix Plan** with the following priorities:

1. **High Priority**:
   - Resolve 2 shadowed agents (name collisions)
   - Fix or remove 14 dangling references

2. **Medium Priority**:
   - Normalize 12 agents with model naming issues
   - Fix 4 format inconsistencies

3. **Low Priority (Informational)**:
   - Document 252 unreachable agents (may be intentionally standalone)

---

_Full details in `orphan-detection-results.json`_
