# Workspace Agent Ecosystem

**Total Agents:** 3 (DMB project-specific)
**Purpose:** Workspace-coupled agents that require project paths
**Last audit:** 2026-02-01

## Agent Inventory

**DMB Almanac Project (3):**
1. dmb-analyst.md - Concert analysis and statistics
2. dmbalmanac-site-expert.md - Site structure and data organization
3. dmbalmanac-scraper.md - Web scraping specialist

## Relationship to HOME Directory

**HOME Location:** `~/.claude/agents/` (27 active agents)

**Architecture:**
- **Workspace:** 3 DMB project-specific agents (path-coupled)
- **HOME:** 16 general-purpose + 8 DMB domain agents + `dmb/` subdirectory
- **Archived:** 16 workspace agents moved to `_archived/` (duplicated user-scope agents)

**Conflict Resolution:** Workspace always wins for shared agents.

## Archived Agents

16 agents archived on 2026-02-01 (duplicated user-scope agents with minor YAML differences):
- best-practices-enforcer, bug-triager, code-generator, dependency-analyzer
- dexie-specialist, documentation-writer, error-debugger, migration-agent
- performance-auditor, performance-profiler, refactoring-agent, security-scanner
- svelte5-specialist, sveltekit-specialist, test-generator, token-optimizer

Last updated: 2026-02-01
