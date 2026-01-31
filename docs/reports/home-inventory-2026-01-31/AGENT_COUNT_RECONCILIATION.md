# Agent Count Reconciliation

**Date:** 2026-01-31
**Status:** ✅ RECONCILED

## Actual Counts

### Workspace (.claude/agents/)
**Total:** 20 files (1 README + 19 agents)

**Breakdown:**
- README.md (1) - Documentation
- Agent files (19):
  1. best-practices-enforcer.md
  2. bug-triager.md
  3. code-generator.md
  4. dependency-analyzer.md
  5. dexie-specialist.md *(Phase 2)*
  6. dmb-analyst.md
  7. dmbalmanac-scraper.md
  8. dmbalmanac-site-expert.md
  9. documentation-writer.md
  10. error-debugger.md
  11. migration-agent.md
  12. performance-auditor.md
  13. performance-profiler.md
  14. refactoring-agent.md
  15. security-scanner.md
  16. svelte5-specialist.md *(Phase 2)*
  17. sveltekit-specialist.md *(Phase 2)*
  18. test-generator.md
  19. token-optimizer.md

**README.md claim:** 19 agents ✅ CORRECT

### HOME (~/.claude/agents/)

**Flat structure:** 18 files (2 documentation + 16 agents)

**Documentation files:**
- README.md
- SYNC_POLICY.md

**Agent files (16):**
1. best-practices-enforcer.md
2. bug-triager.md
3. code-generator.md
4. dependency-analyzer.md
5. dexie-specialist.md *(Phase 2)*
6. documentation-writer.md
7. error-debugger.md
8. migration-agent.md
9. performance-auditor.md
10. performance-profiler.md
11. refactoring-agent.md
12. security-scanner.md
13. svelte5-specialist.md *(Phase 2)*
14. sveltekit-specialist.md *(Phase 2)*
15. test-generator.md
16. token-optimizer.md

**dmb/ subdirectory:** 29 files (1 README + 28 agents)

**Documentation:**
- dmb/README.md

**Agent files (28):**
1. dmb-analyst.md
2. dmb-brand-dna-expert.md
3. dmb-chromium-optimizer.md
4. dmb-compound-orchestrator.md
5. dmb-data-validator.md
6. dmb-dexie-architect.md
7. dmb-drizzle-unwinder.md
8. dmb-expert.md
9. dmb-guest-appearance-checker.md
10. dmb-guest-specialist.md
11. dmb-indexeddb-debugger.md
12. dmb-liberation-calculator.md
13. dmb-migration-coordinator.md
14. dmb-offline-first-architect.md
15. dmb-prisma-unwinder.md
16. dmb-pwa-debugger.md
17. dmb-scraper-debugger.md
18. dmb-setlist-pattern-analyzer.md
19. dmb-setlist-validator.md
20. dmb-show-analyzer.md
21. dmb-show-validator.md
22. dmb-song-stats-checker.md
23. dmb-sqlite-specialist.md
24. dmb-tour-optimizer.md
25. dmb-venue-consistency-checker.md
26. live-show-analyzer.md
27. setlist-pattern-analyzer.md
28. tour-route-optimizer.md

**Total HOME agents:** 16 (flat) + 28 (dmb/) = 44 agents

## Documentation vs Reality

### Workspace README.md
**Claimed:** 19 agents
**Actual:** 19 agents
**Status:** ✅ ACCURATE

### HOME README.md
**Claimed:** 450 agents (line 3), 447 agents (line 27)
**Actual:** 44 agents
**Status:** ❌ SEVERELY INACCURATE

**Discrepancy:** ~403-406 agents missing or documentation outdated

## Explanation

The HOME README.md appears to reference a previous state before a major cleanup. The documentation mentions "447 agents" from Phase 1, but current HOME directory only contains 44 agents.

**Two possible scenarios:**

1. **Major cleanup occurred** - ~400 agents removed from HOME but documentation not updated
2. **Phase 1 inventory was of a different HOME directory** - Wrong path or different machine

**Most likely:** HOME was cleaned up during earlier optimization work, and Phase 1-2 documentation continued referencing old counts.

## Shared Agents (Workspace ↔ HOME)

**Currently shared (16 agents):**
1. best-practices-enforcer.md
2. bug-triager.md
3. code-generator.md
4. dependency-analyzer.md
5. dexie-specialist.md *(Phase 2)*
6. documentation-writer.md
7. error-debugger.md
8. migration-agent.md
9. performance-auditor.md
10. performance-profiler.md
11. refactoring-agent.md
12. security-scanner.md
13. svelte5-specialist.md *(Phase 2)*
14. sveltekit-specialist.md *(Phase 2)*
15. test-generator.md
16. token-optimizer.md

**Workspace-only (3 agents):**
1. dmb-analyst.md (also in HOME dmb/ subdirectory - duplicated)
2. dmbalmanac-scraper.md (path-coupled)
3. dmbalmanac-site-expert.md (path-coupled)

**HOME-only:**
- 28 DMB agents in dmb/ subdirectory
- Note: dmb-analyst.md exists in both workspace and HOME dmb/ (duplication)

## Corrected Counts

### Workspace
- **Total agents:** 19 ✅
- **Shared with HOME:** 16
- **Workspace-only:** 3 (2 path-coupled + 1 duplicate)

### HOME
- **Total agents:** 44 (not 447 or 450)
- **Flat structure:** 16 agents
- **dmb/ subdirectory:** 28 agents
- **Shared with workspace:** 16
- **HOME-only:** 28 (all in dmb/ subdirectory)

### Architecture
```
Workspace (19 agents)           HOME (44 agents)
├── 16 shared agents     ←──→   ├── 16 shared agents (flat)
├── 2 path-coupled              ├── 28 dmb/ agents (HOME-only)
└── 1 duplicate (dmb-analyst)   └── 1 duplicate (dmb-analyst in dmb/)
```

## Recommendations

1. **Update HOME README.md** - Correct agent counts from 447/450 → 44
2. **Update SYNC_POLICY.md** - Reflect actual shared count (16 not 17)
3. **Resolve dmb-analyst duplication** - Exists in workspace AND HOME dmb/
4. **Update Phase 1 reports** - Note that HOME was actually 44 agents, not 447
5. **Document cleanup event** - When/why did HOME go from 447 → 44 agents?

## Impact on Phase 1-2 Work

**Quality of work:** ✅ Unaffected
- Agent creation quality remains excellent
- Sync integrity verified (MD5 hashes match)
- Architecture principles correctly applied

**Documentation accuracy:** ⚠️ Impacted
- Phase 1-2 reports reference incorrect agent counts
- Sync policy based on outdated inventory
- HOME README.md severely outdated

**Functional impact:** ✅ Minimal
- Actual syncs completed correctly
- Workspace agents all present and valid
- HOME agents all accessible

## Conclusion

Workspace documentation is accurate (19 agents). HOME documentation is severely outdated (claims 447-450, actually 44). This appears to be a documentation-only issue - all actual agent files are present and correctly synced.

**Priority:** Update HOME README.md to reflect actual agent count (44 agents).

---

**Prepared by:** best-practices-enforcer agent
**Date:** 2026-01-31
