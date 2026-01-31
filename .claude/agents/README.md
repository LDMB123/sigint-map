# Workspace Agent Ecosystem

**Total Agents:** 19 (curated subset)
**Purpose:** Production-ready agents for active development
**Optimization:** Token-optimized, high-quality, tested

## Agent Inventory

**Core Engineering (8):**
1. best-practices-enforcer.md
2. bug-triager.md
3. code-generator.md
4. error-debugger.md
5. migration-agent.md
6. refactoring-agent.md
7. security-scanner.md
8. test-generator.md

**Performance & Analysis (4):**
9. dependency-analyzer.md
10. performance-auditor.md
11. performance-profiler.md
12. token-optimizer.md

**Documentation (1):**
13. documentation-writer.md

**Tech Stack Specialists (3):**
14. sveltekit-specialist.md - SvelteKit 2 routing, load functions, form actions
15. svelte5-specialist.md - Svelte 5 runes, reactivity, component patterns
16. dexie-specialist.md - Dexie.js 4.x IndexedDB, offline-first, client database

**Project-Specific (3):**
17. dmb-analyst.md - Concert analysis and statistics
18. **dmbalmanac-site-expert.md** - Site structure and data organization
19. **dmbalmanac-scraper.md** - Web scraping specialist

## Relationship to HOME Directory

**HOME Location:** `~/.claude/agents/` (447 agents + dmb/ subdirectory)

**Workspace is a CURATED SUBSET:**
- **Workspace:** 16 production-ready agents (token-optimized, tested)
- **HOME:** 447 comprehensive library (all available agents)
- **Shared:** 14 agents exist in both locations
- **Workspace-only:** 2 dmbalmanac-* agents (path-coupled to workspace project)
- **HOME-only:** 433 agents including 28 in `dmb/` subdirectory

**Architecture Pattern:**
```
Workspace (.claude/agents/)     HOME (~/.claude/agents/)
├── 14 shared agents           ├── 14 shared agents (synced from workspace)
├── 2 workspace-only agents    ├── 433 HOME-only agents
└── (curated, optimized)       └── dmb/ (28 DMB agents organized by category)
```

**Conflict Resolution:** Workspace always wins
- YAML differs → Use workspace version
- Content differs → Use workspace version
- Model tier differs → Use workspace version
- Size differs → Use workspace version (token-optimized)

**Sync Policy:**
- **Workspace → HOME:** Manual sync within 24 hours of workspace changes
- **HOME → Workspace:** Never auto-sync (workspace is curated subset)
- **Conflict detection:** Monthly review
- **Last sync:** 2026-01-31 (4 agents synced)
- **Full policy:** `~/.claude/agents/SYNC_POLICY.md`

## Project-Specific Agents

**DMB Almanac agents (2):**
- `dmbalmanac-site-expert.md` - Site structure and data organization
- `dmbalmanac-scraper.md` - Web scraping specialist for dmbalmanac.com

These agents have hardcoded paths to the dmb-almanac project and must remain in workspace. They were moved from HOME on 2026-01-31 due to path coupling.

## Adding New Agents

1. Create in workspace first (token-optimized)
2. Test thoroughly
3. Copy to HOME within 24 hours
4. Update this README

Last updated: 2026-01-31
