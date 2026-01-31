# Comprehensive Agent Definition Analysis Report

**Analysis Date:** 2026-01-30
**Total Agents Analyzed:** 447
**Location:** ~/.claude/agents/

---

## Executive Summary

### Overall Compliance: 2.9%

- **Passed (No Issues):** 13 agents (2.9%)
- **Warnings Only:** 194 agents (43.4%)
- **Failed (Critical Issues):** 240 agents (53.7%)
- **Missing Frontmatter:** 1 agent (0.2%)

### Critical Finding

**240 agents (53.7%) have a critical YAML parsing issue** where the `tools` field is specified as a comma-separated string instead of a YAML list. This prevents proper tool configuration parsing.

---

## Issue Categories

### 1. CRITICAL: Malformed Tools Field (240 agents)

**Issue:** Tools specified as string instead of YAML list

**Examples:**
```yaml
# WRONG (current)
tools: Read, Write, Edit, Bash, Grep, Glob

# CORRECT (should be)
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
```

**Affected Agents (sample):**
- dmb-chromium-optimizer.md
- dmb-indexeddb-debugger.md
- DMB Expert.md
- All agents in engineering/ directory (177 files)
- All agents in design/ directory (6 files)
- All agents in content/ directory (5 files)
- And 50+ more

**Impact:** Agents cannot be properly loaded by the Claude Code agent system. Tools will not be available to these agents.

**Remediation:** Convert all `tools` fields from comma-separated strings to YAML list format.

---

### 2. Missing YAML Frontmatter (1 agent)

**Affected Agents:**
- `token-optimizer.md`

**Impact:** Agent cannot be loaded at all by the system.

**Remediation:** Add proper YAML frontmatter block with all required fields.

---

### 3. Naming Convention Violations (323 agents)

**Issue:** Filenames contain spaces instead of using kebab-case

**Examples:**
- `DMB Brand DNA Expert.md` → should be `dmb-brand-dna-expert.md`
- `LLM Cost Optimizer.md` → should be `llm-cost-optimizer.md`
- `Full-Stack Developer.md` → should be `full-stack-developer.md`

**Affected Categories:**
- engineering/ directory: 177 files with spaces
- design/ directory: 8 files with spaces
- content/ directory: 5 files with spaces
- data/ directory: 3 files with spaces
- And many more across all subdirectories

**Impact:** Inconsistent with documented best practices. May cause issues with automated tooling and route table generation.

**Remediation:** Rename all files to use kebab-case convention (all lowercase, hyphens instead of spaces).

---

### 4. Missing "Use when..." Routing Pattern (194 agents)

**Issue:** Description field missing recommended routing language

**Best Practice Pattern:**
```yaml
description: >
  Use when the user requests [specific task].
  Delegate proactively before [specific scenarios].
  [Brief description of capabilities and outputs].
```

**Examples Missing This Pattern:**
- ai-ml/LLM Cost Optimizer.md
- browser/apple-silicon-browser-optimizer.md
- All agents in cascading/ directory
- All agents in compiler/ directory
- Most agents in engineering/ directory

**Impact:** Reduces routing efficiency. Makes it harder for the system to automatically select the correct agent.

**Remediation:** Update all descriptions to include:
1. "Use when..." trigger conditions
2. "Delegate proactively..." guidance (optional but recommended)
3. Clear capability summary

---

### 5. Custom/Unknown Frontmatter Fields

**Issue:** Non-standard fields that may not be recognized by the agent system

**Common Custom Fields Found:**
- `collaboration` (found in dmb-* agents)
- `custom_instructions`
- Various domain-specific metadata

**Impact:** Unknown. These fields may be ignored by the system or could cause parsing issues depending on implementation.

**Remediation:** Verify with agent system documentation whether these fields are supported. Remove if not officially supported.

---

## Detailed Breakdown by Directory

### Root Level Agents
- Total: 13 agents
- Failed: 1 (token-optimizer.md - missing frontmatter)
- Warnings: 4
- Passed: 8

### engineering/ (177 agents)
- Failed: 177 (100% - all have tools string issue)
- All also have naming convention issues (spaces in filenames)
- Most missing "Use when..." pattern

### design/ (8 agents)
- Failed: 6 (tools string issue)
- All have naming convention issues

### dmb-* agents (26 agents)
- Failed: 24 (tools string issue)
- Most include `collaboration` custom field
- Good descriptions but missing "Use when..." pattern

### workers/ subdirectories (85+ agents)
- Failed: 50+ (tools string issue)
- Generally consistent kebab-case naming
- Missing routing patterns

### Other directories
- content/, data/, marketing/, product/, testing/ all have similar issues
- Fusion/, meta-orchestrators/, quantum-parallel/ have experimental patterns

---

## Remediation Priority

### Priority 1: CRITICAL - Fix Tools Field (240 agents)
**Effort:** Medium (can be scripted)
**Impact:** High (agents currently non-functional)

Script to fix:
```bash
# Convert tools string to YAML list
find ~/.claude/agents -name "*.md" -type f -exec sed -i '' \
  's/^tools: \(.*\)$/tools:\n  - \1/' {} \;
# Then manually format the list items
```

### Priority 2: HIGH - Fix Missing Frontmatter (1 agent)
**Effort:** Low
**Impact:** High

Add YAML frontmatter to `token-optimizer.md`

### Priority 3: MEDIUM - Rename Files (323 agents)
**Effort:** High (requires care with git history)
**Impact:** Medium (consistency and tooling compatibility)

```bash
# Example rename script (test thoroughly first)
find ~/.claude/agents -name "* *.md" | while read file; do
  newname=$(echo "$file" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  git mv "$file" "$newname"
done
```

### Priority 4: LOW - Add Routing Patterns (194 agents)
**Effort:** High (requires manual review of each agent)
**Impact:** Medium (improves routing efficiency)

Manual update of each description field

### Priority 5: LOW - Review Custom Fields
**Effort:** Low
**Impact:** Low (may be intentional)

Verify with system documentation

---

## Specific Remediation Examples

### Example 1: Fixing DMB Expert Agent

**Current (broken):**
```yaml
---
name: dmb-expert
description: Dave Matthews Band knowledge expert...
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch
permissionMode: acceptEdits
---
```

**Fixed:**
```yaml
---
name: dmb-expert
description: >
  Use when the user requests Dave Matthews Band information, history, or analysis.
  Delegate proactively when deep setlist analysis or data validation is needed.
  Expert in band history, members, discography, touring patterns, and song analysis.
model: sonnet
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - WebFetch
  - WebSearch
permissionMode: acceptEdits
---
```

### Example 2: Fixing Engineering Agent

**Current (broken):**
```yaml
---
name: full-stack-developer
description: Full stack development specialist...
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---
```

**Fixed:**
```yaml
---
name: full-stack-developer
description: >
  Use when the user needs full-stack application development or architecture.
  Delegate proactively for specialized frontend, backend, or infrastructure tasks.
  Expert in modern web frameworks, APIs, databases, and deployment.
model: sonnet
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
permissionMode: default
---
```

And rename file:
```bash
mv "Full-Stack Developer.md" "full-stack-developer.md"
```

---

## Validation Script

A Python validation script has been created at `/tmp/validate_agents.py` that can be run to check compliance:

```bash
python3 /tmp/validate_agents.py
```

This script checks:
- YAML frontmatter presence and validity
- Required field presence
- Field type validation
- Naming conventions
- Routing pattern presence
- Duplicate agent names

---

## Recommendations

### Immediate Actions (This Week)

1. **Fix the 240 agents with tools string issue** - This is blocking functionality
2. **Add frontmatter to token-optimizer.md** - Quick fix for missing agent
3. **Create automated tests** - Prevent regression of these issues

### Short-term Actions (This Month)

1. **Implement pre-commit hook** - Validate agent definitions before commit
2. **Rename files to kebab-case** - Improve consistency
3. **Document agent creation standards** - Prevent future issues

### Long-term Actions (This Quarter)

1. **Add routing patterns to all descriptions** - Improve agent selection
2. **Audit custom fields** - Verify or remove non-standard fields
3. **Create agent generator tool** - Ensure new agents follow best practices

---

## Success Metrics

**Current State:**
- 2.9% compliance rate
- 240 non-functional agents (tools issue)
- 323 naming violations

**Target State (30 days):**
- 95%+ compliance rate
- 0 non-functional agents
- <5% naming violations
- All new agents validated automatically

**Target State (90 days):**
- 100% compliance rate
- All agents follow routing patterns
- Automated validation in CI/CD
- Zero custom schema fields (or all documented)

---

## Appendix: Agent Counts by Directory

```
Total: 447 agents

Top-level: 13
agent-warming/: 2
ai-ml/: 3
batching/: 2
browser/: 15
cascading/: 3
circuit-breaker/: 3
compiler/: 3
compression/: 2
content/: 5
data/: 3
debug/: 13
design/: 8
devops/: 3
dmb/ (subdirectory): 3
dmb-* (prefix): 26
ecommerce/: 8
engineering/: 177
events/: 6
factory/: 4
fusion/: 5
fusion-compiler/: 3
google/: 7
growth/: 3
improvement/: 3
lazy-loading/: 3
marketing/: 8
meta/: 2
meta-orchestrators/: 5
observability/: 3
operations/: 7
optimization/: 1
orchestrators/: 9
predictive-cache/: 3
product/: 5
project_management/: 3
quantum-parallel/: 3
routing/: 4
self-healing/: 5
semantic-cache/: 3
speculative/: 1
swarm-intelligence/: 3
testing/: 7
ticketing/: 7
workers/: 85+
zero-shot/: 3
```

---

## Files Requiring Immediate Attention

### Critical (Must Fix)

1. `token-optimizer.md` - Missing frontmatter entirely
2. All 240 agents with tools as string instead of list

### High Priority (Should Fix Soon)

1. All 323 files with spaces in filename
2. All agents missing "Use when..." in description

### For Review

1. All agents with `collaboration` field (dmb-* agents) - verify if this is a supported field
2. All agents with non-standard permission modes
3. All agents with custom/unknown frontmatter fields

---

**Report Generated By:** Best Practices Enforcer Agent
**Validation Script:** /tmp/validate_agents.py
**Full Agent List:** Available at /tmp/agent_file_list.txt
