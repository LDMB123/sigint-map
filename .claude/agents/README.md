# Workspace Agent Ecosystem

**Total Agents:** 10 (3 DMB + 7 Safari)
**Purpose:** Workspace-coupled agents that require project paths
**Last audit:** 2026-02-06

## Agent Inventory

**Safari 26.0-26.2 (7):**
1. safari-expert.md - Orchestrator: full-stack Safari browser expert (Sonnet)
2. safari-css-specialist.md - Sub-agent: CSS features (Haiku)
3. safari-api-specialist.md - Sub-agent: Web APIs (Haiku)
4. safari-js-specialist.md - Sub-agent: JavaScript/Wasm (Haiku)
5. safari-pwa-specialist.md - Sub-agent: PWA/Extensions/Platform (Haiku)
6. safari-gpu-specialist.md - Sub-agent: Media/GPU/WebXR (Haiku)
7. safari-debug-specialist.md - Sub-agent: DevTools/SafariDriver (Haiku)

**DMB Almanac Project (3):**
1. dmb-analyst.md - Concert analysis and statistics
2. dmbalmanac-site-expert.md - Site structure and data organization
3. dmbalmanac-scraper.md - Web scraping specialist

## Safari Agent Architecture

```
safari-expert (Sonnet orchestrator)
├── safari-css-specialist (Haiku) ─── safari-css-modern skill
├── safari-api-specialist (Haiku) ─── safari-web-apis skill
├── safari-js-specialist (Haiku)  ─── safari-javascript skill
├── safari-pwa-specialist (Haiku) ─── safari-pwa-platform skill
├── safari-gpu-specialist (Haiku) ─── safari-media-gpu skill
└── safari-debug-specialist (Haiku) ─ safari-devtools skill
```

## Relationship to HOME Directory

**HOME Location:** `~/.claude/agents/` (27 active agents)

**Architecture:**
- **Workspace:** 3 DMB project-specific + 7 Safari browser agents
- **HOME:** 16 general-purpose + 8 DMB domain agents + `dmb/` subdirectory
- **Archived:** 16 workspace agents moved to `_archived/` (duplicated user-scope agents)

**Conflict Resolution:** Workspace always wins for shared agents.

## Archived Agents

16 agents archived on 2026-02-01 (duplicated user-scope agents with minor YAML differences):
- best-practices-enforcer, bug-triager, code-generator, dependency-analyzer
- dexie-specialist, documentation-writer, error-debugger, migration-agent
- performance-auditor, performance-profiler, refactoring-agent, security-scanner
- svelte5-specialist, sveltekit-specialist, test-generator, token-optimizer

Last updated: 2026-02-06
