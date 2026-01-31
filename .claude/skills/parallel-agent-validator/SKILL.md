---
name: parallel-agent-validator
description: >
  Validates parallel Task calls before execution to prevent "Sibling tool call errored".
  Pre-flight checks on agent names, parameters, dependencies, and resource limits.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Parallel Agent Validator

Pre-flight validation for parallel Task calls. Catches errors before execution.

## Checks

1. **Agent Name Validation** - Verify agents exist in `.claude/agents/`
2. **Parameter Completeness** - Require `subagent_type`, `description`, `prompt`
3. **Dependency Detection** - Flag tasks that reference each other's output
4. **Resource Check** - Warn on excessive parallelism (3-7 optimal, 16+ risky)

## Available Agents

Current valid agents: `best-practices-enforcer`, `bug-triager`, `code-generator`, `dependency-analyzer`, `dmb-analyst`, `documentation-writer`, `error-debugger`, `migration-agent`, `performance-auditor`, `performance-profiler`, `refactoring-agent`, `security-scanner`, `test-generator`, `token-optimizer`

## Common Fixes

- **Invalid agent name**: Check `.claude/agents/` for exact filenames
- **Missing description**: Add 3-5 word `description` parameter
- **Placeholder in prompt**: Replace `[path]` with actual file path
- **Dependencies detected**: Run dependent tasks sequentially, not parallel

## Output

Status (PASS/FAIL), per-agent validation (name, params, independence), issue list with fixes.

## When to Use

- Before launching 5+ parallel agents
- When debugging "Sibling tool call errored"
- After skill/agent updates
