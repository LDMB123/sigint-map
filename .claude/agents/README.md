# Workspace Agent Ecosystem

**Total Agents:** 16 (curated subset)
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

**Project-Specific (3):**
14. dmb-analyst.md - Concert analysis and statistics
15. **dmbalmanac-site-expert.md** - Site structure and data organization (NEW)
16. **dmbalmanac-scraper.md** - Web scraping specialist (NEW)

## Relationship to HOME Directory

**HOME Location:** `~/.claude/agents/` (447 agents)

**Workspace is a CURATED SUBSET:**
- Workspace: 16 production-ready agents
- HOME: 447 comprehensive library
- 14 agents exist in both (workspace wins on conflicts)
- 2 agents workspace-only (dmbalmanac-* are project-specific)

**Sync Policy:**
- Workspace changes propagate to HOME
- HOME changes DO NOT auto-sync to workspace
- Monthly conflict detection
- See: `~/.claude/agents/SYNC_POLICY.md`

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
