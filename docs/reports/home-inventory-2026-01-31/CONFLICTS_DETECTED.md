# Version Conflicts: Workspace vs HOME Agents

**Generated:** 2026-01-31
**Workspace agents:** 14
**HOME agents:** 447

## Summary

- **Conflicts:** 4
- **Identical:** 10
- **Workspace-only:** 0

## Resolution Strategy

- Workspace versions are curated and token-optimized; they take precedence
- HOME versions should be updated to match workspace or removed if redundant

## Detailed Conflicts

### `best-practices-enforcer.md`

- **Status:** CONFLICT
- size: workspace=1625B vs home=3851B (diff=-2226B)
- **Resolution:** Use workspace version (token-optimized)

### `dependency-analyzer.md`

- **Status:** CONFLICT
- model: workspace='sonnet' vs home='haiku'
- size: workspace=1672B vs home=1671B (diff=+1B)
- **Resolution:** Use workspace version (token-optimized)

### `performance-auditor.md`

- **Status:** CONFLICT
- size: workspace=1717B vs home=5247B (diff=-3530B)
- **Resolution:** Use workspace version (token-optimized)

### `token-optimizer.md`

- **Status:** CONFLICT
- size: workspace=1730B vs home=6090B (diff=-4360B)
- **Resolution:** Use workspace version (token-optimized)

## Identical Files (No Action Needed)

- `bug-triager.md`
- `code-generator.md`
- `dmb-analyst.md`
- `documentation-writer.md`
- `error-debugger.md`
- `migration-agent.md`
- `performance-profiler.md`
- `refactoring-agent.md`
- `security-scanner.md`
- `test-generator.md`

## Workspace-Only Files

