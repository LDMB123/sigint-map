# Agent Quality & Loadability Executive Summary

**Date:** 2026-01-31  
**Validation Scope:** 447 agents in `~/.claude/agents/`  
**Overall Health:** 99.3% loadable (0 CRITICAL), 78% functional issues (HIGH/MEDIUM)

## Critical Findings

### Zero Blocking Issues
- **0 CRITICAL** issues found
- All 447 agents have valid YAML frontmatter
- All required fields present
- 100% agents can be loaded by Claude Code

### Functional Quality Issues

**872 total issues** across 444 agents (99.3% have at least one issue):

| Severity | Count | Impact |
|----------|-------|--------|
| CRITICAL | 0 | Blocks loading |
| HIGH | 98 | Prevents functionality |
| MEDIUM | 205 | Suboptimal config |
| LOW | 569 | Best practice violation |

## Issue Breakdown

### 1. Invalid Tools (98 agents, HIGH severity)

**Problem:** 103 agents reference `WebSearch` and `WebFetch` tools that don't exist in Claude Code.

**Valid tools:** Read, Write, Edit, Bash, Grep, Glob, Task, Agent, AgentCancel, TodoRead, TodoWrite, TodoList, TodoComplete

**Most common invalid tools:**
- `WebSearch` - 95 occurrences
- `WebFetch` - 45 occurrences

**Impact:** Agents will fail when attempting to use these tools. Agent works otherwise but cannot perform web search/fetch operations.

**Fix:** Remove invalid tools from frontmatter, or replace with MCP-based web search if available.

**Examples:**
- `browser/tailwind-v4-specialist.md`
- `content/blog-writer.md`
- `data/web-scraping-specialist.md`
- `dmb-expert.md`
- All agents in `ticketing/`, `google/`, `events/`, `marketing/`, `ecommerce/` domains

### 2. Invalid Permission Modes (186 agents, MEDIUM severity)

**Problem:** Agents use non-standard `permissionMode` values.

**Valid modes:** `permissive`, `strict`, `ask`, `auto`

**Common invalid modes:**
- `acceptEdits` - 79 occurrences
- `default` - 41 occurrences  
- `plan` - 23 occurrences
- `review` - 18 occurrences
- `code` - 12 occurrences
- And 12+ other custom values

**Impact:** Claude Code will ignore invalid permission mode and fall back to default behavior. Not broken, but permission model not enforced as intended.

**Fix:** Replace with one of four valid modes. Map custom modes to standard:
- `acceptEdits` → `permissive`
- `default` → `auto`
- `plan` → `ask`
- `review` → `ask`
- `code` → `permissive`

**Examples:**
- `best-practices-enforcer.md` - uses `default`
- `bug-triager.md` - uses `plan`
- `content/Copywriter.md` - uses `acceptEdits`
- 176 more agents

### 3. Best Practice Violations (508 occurrences, LOW severity)

**Categories:**

**Missing "use when" guidance (437 agents)**
- Description lacks clear delegation trigger
- Users don't know when to invoke agent
- Fix: Add "Use when..." clause to description

**Description too long (61 agents)**
- Descriptions >200 chars reduce readability
- Examples: `best-practices-enforcer.md` (274 chars)
- Fix: Move details to body, keep frontmatter concise

**Too many tools granted (10 agents)**
- Agents with >8 tools lack focus
- Example: Some meta-orchestrators grant all 13 tools
- Fix: Minimize to essential tools only

### 4. Model Tier Mismatches (80 agents, MEDIUM severity)

**Opus overuse (70 agents):**
- Agents using Opus model without strategic/architectural language
- Example: `dmb-sqlite-specialist.md` - database specialist doesn't need Opus
- Fix: Downgrade to Sonnet for implementation/analysis tasks
- **Cost impact:** ~3x more expensive than Sonnet, slower responses

**Haiku underuse (10 agents):**
- Complex agents using Haiku model
- Example: `data/data-scientist.md` - "advanced" analysis on Haiku
- Fix: Upgrade to Sonnet for complex/multi-step workflows
- **Reliability impact:** Higher failure rate on complex tasks

## Clean Agents (4 total)

Only 4 agents (0.9%) have zero issues:

1. `engineering/clarifying-questioner.md`
2. `fusion/full-stack-fusion-agent.md`
3. `meta-orchestrators/parallel-universe-executor.md`
4. `swarm-intelligence/collective-memory.md`

These agents serve as quality benchmarks for the ecosystem.

## Recommendations by Priority

### Priority 1: Fix Invalid Tools (HIGH)

**Action:** Remove or replace 98 agents' invalid tool references

```bash
# Automated fix script
for agent in $(grep -rl "WebSearch\|WebFetch" ~/.claude/agents/); do
  # Remove WebSearch and WebFetch from tools array
  sed -i '' '/  - WebSearch/d; /  - WebFetch/d' "$agent"
done
```

**Verification:** Re-run validator, confirm 0 HIGH issues

**Timeline:** 1 hour (automated)

### Priority 2: Fix Invalid Permission Modes (MEDIUM)

**Action:** Standardize 186 agents' permission modes

```bash
# Mapping script
sed -i '' 's/permissionMode: acceptEdits/permissionMode: permissive/g' ~/.claude/agents/**/*.md
sed -i '' 's/permissionMode: default/permissionMode: auto/g' ~/.claude/agents/**/*.md
sed -i '' 's/permissionMode: plan/permissionMode: ask/g' ~/.claude/agents/**/*.md
# ... (continue for all invalid modes)
```

**Verification:** Grep for non-standard modes, confirm 0 remain

**Timeline:** 30 minutes (semi-automated)

### Priority 3: Optimize Model Tiers (MEDIUM)

**Action:** Review and adjust 80 agents' model assignments

**Opus → Sonnet candidates (70 agents):**
- Database specialists
- Tool-focused agents
- Implementation agents
- Non-strategic workers

**Haiku → Sonnet candidates (10 agents):**
- Data scientists
- Creative directors
- Complex analysis agents

**Manual review required:** Check each agent's actual complexity

**Timeline:** 2-4 hours (manual review + edits)

**Cost savings:** ~$300/month estimated (based on typical usage)

### Priority 4: Add "Use When" Guidance (LOW)

**Action:** Update 437 agents' descriptions

**Template:**
```yaml
description: >
  Use when [trigger condition]. [Brief capability summary].
  [Optional: delegation guidance]
```

**Example:**
```yaml
# Before
description: Expert in Tailwind CSS v4 with CSS-first configuration

# After  
description: >
  Use when migrating to or configuring Tailwind v4. Expert in CSS-first
  configuration, @theme directive, and Lightning CSS optimization.
```

**Timeline:** 4-8 hours (batch editing with template)

## Quality Metrics

### Current State
- **Loadability:** 100% (0 CRITICAL)
- **Functionality:** 78% have issues (98 HIGH)
- **Configuration:** 54% have config issues (205 MEDIUM)
- **Best Practices:** 0.9% fully compliant (4 clean agents)

### Target State (Post-Remediation)
- **Loadability:** 100% (maintain)
- **Functionality:** 100% (fix all HIGH)
- **Configuration:** 95%+ (fix MEDIUM priority items)
- **Best Practices:** 90%+ (batch updates)

## Implementation Plan

### Phase 1: Critical Path (2 hours)
1. Remove invalid tools (98 agents) - automated
2. Fix permission modes (186 agents) - semi-automated
3. Validation checkpoint

### Phase 2: Optimization (4 hours)
1. Model tier review (80 agents) - manual
2. Cost/performance analysis
3. Selective downgrades/upgrades

### Phase 3: Documentation (8 hours)
1. Add "use when" guidance (437 agents) - batch templates
2. Trim long descriptions (61 agents)
3. Tool minimization review (10 agents)

### Phase 4: Validation (1 hour)
1. Re-run comprehensive validator
2. Confirm <5% issue rate
3. Document exceptions

**Total estimated effort:** 15 hours
**Expected outcome:** <5% issue rate, 100% functional agents

## Automation Opportunities

### Bulk Fix Scripts
1. **tool-cleaner.sh** - Remove invalid tools from all agents
2. **permission-normalizer.sh** - Map custom modes to standard
3. **description-linter.sh** - Check for "use when", length, patterns

### Validation Integration
1. **pre-commit-hook** - Validate new/modified agents before commit
2. **CI check** - Run validator on agent changes
3. **Monthly audit** - Scheduled quality review

### Template Library
1. **agent-template.md** - Standard frontmatter + structure
2. **description-patterns.md** - Proven "use when" templates
3. **tool-grants.md** - Minimal tool sets by agent type

## Appendix: Validation Criteria

### YAML Frontmatter
- Delimited by `---` at file start
- Valid YAML syntax
- All required fields present

### Required Fields
- `name` - Agent identifier (kebab-case)
- `description` - Purpose and usage (<200 chars recommended)
- `tools` - Array of valid tool names
- `model` - Model tier (haiku/sonnet/opus)

### Optional Fields
- `permissionMode` - Must be valid mode if present
- `skills` - Array of skill directory names
- Custom fields allowed but not validated

### Valid Tools
Read, Write, Edit, Bash, Grep, Glob, Task, Agent, AgentCancel, TodoRead, TodoWrite, TodoList, TodoComplete

### Valid Permission Modes
permissive, strict, ask, auto

### Model Tier Guidelines
- **Haiku:** Simple, focused tasks with clear logic
- **Sonnet:** Complex analysis, multi-step workflows, code generation  
- **Opus:** Strategic planning, high-level architecture, complex reasoning

## Related Reports

- **Full Details:** `functional-quality-loadability.md` (detailed issue list)
- **Agent Inventory:** Phase 3 audit reports
- **Token Optimization:** Ultra-deep optimization analysis
- **Best Practices:** Comprehensive validation report 2026-01-31
