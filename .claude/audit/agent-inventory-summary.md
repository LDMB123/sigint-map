# Agent Inventory Report
**Generated**: 2026-01-25

---

## Executive Summary

- **Total Agent Files**: 470
- **Successfully Parsed**: 470
- **Parse Errors**: 0
- **Name Collisions**: 2
- **Dangling Agent References**: 15

### Agents by Scope

| Scope | Count |
|-------|-------|
| project | 15 |
| user | 455 |

---

## Model Distribution

| Model | Count | % of Total |
|-------|-------|------------|
| haiku | 341 | 72.6% |
| sonnet | 108 | 23.0% |
| Gemini 3 Pro | 11 | 2.3% |
| opus | 5 | 1.1% |
| gemini-3-pro | 4 | 0.9% |
| unknown | 1 | 0.2% |

### ⚠️  Model Naming Issues Detected

The inventory shows multiple model naming conventions:
- `haiku` (341 agents)
- `sonnet` (108 agents)
- `opus` (5 agents)
- `Gemini 3 Pro` (11 agents) - **Capitalized, project agents**
- `gemini-3-pro` (4 agents) - **Kebab-case**
- `unknown` (1 agent)

**Action Required**: Verify that Claude Code correctly interprets all model name variations.

---

## Format Distribution

| Format | Count |
|--------|-------|
| markdown | 12 |
| yaml | 458 |

**Format Notes**:
- **yaml** (458): YAML frontmatter with `name`, `description`, `model`, etc.
- **markdown** (12): Plain markdown with bold key-value pairs (project agents)

---

## Subdirectory Organization (User Agents)

| Subdirectory | Agent Count |
|--------------|-------------|
| `engineering` | 138 |
| `debug` | 14 |
| `browser` | 13 |
| `ecommerce` | 10 |
| `orchestrators` | 10 |
| `design` | 8 |
| `operations` | 8 |
| `ai-ml` | 8 |
| `marketing` | 8 |
| `workers` | 8 |
| `workers/data` | 8 |
| `google` | 7 |
| `testing` | 7 |
| `ticketing` | 7 |
| `workers/dx` | 7 |
| `events` | 6 |
| `workers/ai-ml-validation` | 6 |
| `workers/infra` | 6 |
| `workers/ai-ml` | 6 |
| `fusion` | 5 |
| `self-healing` | 5 |
| `content` | 5 |
| `product` | 5 |
| `data-engineering` | 5 |
| `meta-orchestrators` | 5 |
| `devops` | 4 |
| `dmb` | 4 |
| `swarm-intelligence` | 4 |
| `improvement` | 4 |
| `routing` | 4 |
| `factory` | 4 |
| `workers/perf-extended` | 4 |
| `workers/security` | 4 |
| `workers/observability` | 4 |
| `workers/cloud` | 4 |
| `workers/api` | 4 |
| `workers/perf` | 4 |
| `fusion-compiler` | 3 |
| `zero-shot` | 3 |
| `circuit-breaker` | 3 |
| `cascading` | 3 |
| `project_management` | 3 |
| `lazy-loading` | 3 |
| `observability` | 3 |
| `growth` | 3 |
| `batching` | 3 |
| `compression` | 3 |
| `predictive-cache` | 3 |
| `quantum-parallel` | 3 |
| `semantic-cache` | 3 |
| `speculative` | 3 |
| `data` | 3 |
| `compiler` | 3 |
| `workers/js` | 3 |
| `workers/npm` | 3 |
| `workers/testing-extended` | 3 |
| `meta` | 2 |
| `agent-warming` | 2 |
| `workers/feature-flags` | 2 |
| `workers/chaos` | 2 |
| `optimization` | 1 |

---

## Name Collisions

⚠️  **2 Name Collisions Detected**

These agents have the same `name` across different scopes (user/project). Claude Code will load only ONE based on precedence rules (usually project > user).


### `qa-engineer`
- **user**: `/Users/louisherman/.claude/agents/testing/QA Engineer.md`
- **project**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/.claude/agents/08-qa-engineer.md`

### `performance-optimizer`
- **user**: `/Users/louisherman/.claude/agents/engineering/Performance Optimizer.md`
- **project**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/.claude/agents/07-performance-optimizer.md`

---

## Collaboration Graph Analysis

**Total agents with collaboration metadata**: 101

**Agents referenced in collaboration**: 196

**Dangling references** (referenced but don't exist): **15**

### ⚠️  Dangling Agent References

These agents are referenced in `collaboration` sections but don't exist in the filesystem:

- `All orchestrators`
- `any-sonnet-orchestrator`
- `build-debugger`
- `compliance-checker`
- `dependency-analyzer`
- `documentation-generator`
- `domain-specific-experts`
- `haiku-swarm-coordinator`
- `junior-developers`
- `migration-transformer`
- `risk-assessor`
- `secret-detector`
- `static-analyzer`
- `system`
- `test-validator`

---

## Top 20 Most Referenced Agents

Agents that are most frequently delegated to:

| Agent | Times Referenced |
|-------|------------------|
| `swarm-commander` | 36 |
| `engineering-manager` | 29 |
| `system-architect` | 24 |
| `code-reviewer` | 21 |
| `senior-frontend-engineer` | 20 |
| `dmb-compound-orchestrator` | 19 |
| `performance-optimizer` | 15 |
| `dmb-data-validator` | 14 |
| `refactoring-guru` | 14 |
| `product-manager` | 13 |
| `full-stack-developer` | 13 |
| `senior-backend-engineer` | 12 |
| `vitest-testing-specialist` | 12 |
| `full-stack-auditor` | 12 |
| `bundle-size-analyzer` | 11 |
| `security-engineer` | 10 |
| `test-coverage-orchestrator` | 10 |
| `security-hardening-orchestrator` | 9 |
| `performance-optimization-orchestrator` | 9 |

---

## Next Steps: Orphan Detection

The following checks are required to identify orphaned agents:

1. **Not Loaded**: Compare filesystem inventory with `/agents` command output
2. **Shadowed**: The 2 name collisions need resolution
3. **Disabled**: Check settings for `Task(<agent-name>)` deny rules
4. **Broken**: Run delegation smoke tests
5. **Dangling References**: Fix or remove the 15 dangling agent references
6. **Unreachable**: Identify agents never referenced anywhere

---

## Detailed Agent List

_See `orphaned-agents-inventory.json` for full details on all 470 agents._
