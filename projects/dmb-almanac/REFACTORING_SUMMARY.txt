╔═══════════════════════════════════════════════════════════════════════════╗
║             DMB ALMANAC - REFACTORING ANALYSIS SUMMARY                    ║
║                     Weeks 8+ Implementation Plan                          ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────┐
│ TOP 5 REFACTORING OPPORTUNITIES (Ranked by Impact)                      │
└─────────────────────────────────────────────────────────────────────────┘

┏━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━┳━━━━━━━━┳━━━━━━━┳━━━━━━━━━┓
┃ #  ┃ Opportunity                ┃ Impact ┃ Effort ┃ Risk  ┃ Week    ┃
┣━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━╋━━━━━━━╋━━━━━━━━━┫
┃ 1  ┃ Selector Fallback Chain    ┃ -150L  ┃ 4-6h   ┃ LOW   ┃ Week 8  ┃
┃    ┃ (Scraper duplication)      ┃        ┃        ┃       ┃ Day 1-2 ┃
┣━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━╋━━━━━━━╋━━━━━━━━━┫
┃ 2  ┃ PageParser Base Class      ┃ -200L  ┃ 6-8h   ┃ LOW   ┃ Week 8  ┃
┃    ┃ (HTML parsing pattern)     ┃        ┃        ┃       ┃ Day 2-3 ┃
┣━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━╋━━━━━━━╋━━━━━━━━━┫
┃ 3  ┃ PWA Feature Detector       ┃ -120L  ┃ 4-5h   ┃ LOW   ┃ Week 9  ┃
┃    ┃ (Feature detection)        ┃        ┃        ┃       ┃ Day 1-2 ┃
┣━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━╋━━━━━━━╋━━━━━━━━━┫
┃ 4  ┃ BackgroundQueue Abstract   ┃ -220L  ┃ 8-10h  ┃ MED   ┃ Week 9  ┃
┃    ┃ (Queue management)         ┃        ┃        ┃       ┃ Day 3-5 ┃
┣━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━╋━━━━━━━╋━━━━━━━━━┫
┃ 5  ┃ Query Helper Extensions    ┃ -126L  ┃ 3-4h   ┃ LOW   ┃ Week 10 ┃
┃    ┃ (IndexedDB patterns)       ┃        ┃        ┃       ┃ Day 1   ┃
┗━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━┻━━━━━━━━┻━━━━━━━┻━━━━━━━━━┛

TOTAL IMPACT: -816 lines (net) | 25-33 hours effort | 80% LOW risk


┌─────────────────────────────────────────────────────────────────────────┐
│ CODE DUPLICATION HOTSPOTS                                               │
└─────────────────────────────────────────────────────────────────────────┘

SCRAPER SIDE:
  ▸ Selector Fallback Chains ........... ~300 lines (10 scrapers)
  ▸ HTML Parsing Boilerplate ........... ~280 lines (14 scrapers)
  ▸ Error Handling Patterns ............ ~140 lines (14 scrapers)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SUBTOTAL .............................. 720 lines

PWA SIDE:
  ▸ Feature Detection .................. ~240 lines (8 files)
  ▸ Queue Management ................... ~200 lines (2 files)
  ▸ Service Worker Communication ....... ~80 lines (6 files)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SUBTOTAL .............................. 520 lines

DATABASE SIDE:
  ▸ Transaction Wrappers ............... ~186 lines (62 queries)
  ▸ Error Handling ..................... ~62 lines (62 queries)
  ▸ Caching Patterns ................... ~50 lines (various)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SUBTOTAL .............................. 298 lines

═══════════════════════════════════════════════════════════════════
GRAND TOTAL ............................ 1,538 lines of duplication


┌─────────────────────────────────────────────────────────────────────────┐
│ QUICK WINS (< 1 day each)                                               │
└─────────────────────────────────────────────────────────────────────────┘

  1. Selector Fallback Chain .......... -150 lines | 4-6 hours
  2. Query Helper Extensions .......... -126 lines | 3-4 hours  
  3. PWA Feature Detector ............. -120 lines | 4-5 hours
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     QUICK WIN TOTAL .................. -396 lines in ~2 days


┌─────────────────────────────────────────────────────────────────────────┐
│ EXPECTED OUTCOMES (Post-Refactoring)                                    │
└─────────────────────────────────────────────────────────────────────────┘

  CODE QUALITY:
    ✓ Code reduction ................... 800-1,200 lines (-15-20%)
    ✓ Test coverage increase ........... +17% (68% → 85%)
    ✓ Duplication elimination .......... -80% selector fallbacks

  MAINTAINABILITY:
    ✓ New scraper size ................. <100 lines (vs 300-400 now)
    ✓ PWA feature addition ............. <50 lines per feature
    ✓ New queue type ................... <20 lines
    ✓ Maintenance burden ............... -40%

  PERFORMANCE:
    ✓ Scraper speed .................... 2-5 pages/sec (no regression)
    ✓ Feature detection overhead ....... <1ms
    ✓ Query helper overhead ............ <5ms per query


┌─────────────────────────────────────────────────────────────────────────┐
│ RISK MITIGATION STRATEGIES                                              │
└─────────────────────────────────────────────────────────────────────────┘

  #1 Selector Fallback (LOW RISK):
    → Use existing tests to validate behavior
    → Extract without changing logic
    → Incremental migration (3-4 scrapers first)

  #2 PageParser (LOW RISK):
    → Thin wrapper pattern
    → Validate with existing scraper tests
    → Pilot with 1-2 scrapers before full rollout

  #3 PWA Feature Detection (LOW RISK):
    → Pure detection logic (no side effects)
    → Memoization prevents performance overhead
    → Browser compatibility testing

  #4 Background Queue (MEDIUM RISK):
    → Implement for telemetryQueue first (non-critical)
    → Monitor for 1 week before migrating offlineMutationQueue
    → Thorough offline testing (airplane mode scenarios)

  #5 Query Helpers (LOW RISK):
    → Wrapper pattern (no behavioral changes)
    → Validate with existing 200+ query tests
    → Performance profiling for overhead monitoring


┌─────────────────────────────────────────────────────────────────────────┐
│ 3-WEEK IMPLEMENTATION ROADMAP                                           │
└─────────────────────────────────────────────────────────────────────────┘

  WEEK 8 - SCRAPER REFACTORING
  ├── Day 1-2: SelectorFallbackChain utility
  ├── Day 2-3: PageParser base class
  └── Day 4-5: Migrate 3-4 pilot scrapers + testing

  WEEK 9 - PWA REFACTORING  
  ├── Day 1-2: PWA Feature Detector
  └── Day 3-5: BackgroundQueue abstraction

  WEEK 10 - DATABASE REFACTORING
  ├── Day 1: safeQuery helpers
  ├── Day 2-3: Migrate 62 queries
  └── Day 4-5: Integration testing + performance validation


┌─────────────────────────────────────────────────────────────────────────┐
│ FILE REFERENCES (for Implementation)                                    │
└─────────────────────────────────────────────────────────────────────────┘

  SCRAPER FILES (14 total):
    • app/scraper/src/scrapers/shows.ts (498 lines)
    • app/scraper/src/scrapers/songs.ts (456 lines)
    • app/scraper/src/scrapers/releases.ts (444 lines)
    • app/scraper/src/scrapers/venues.ts (389 lines)
    • app/scraper/src/scrapers/tours.ts (406 lines)
    • app/scraper/src/scrapers/lists.ts (388 lines)
    • ... 8 more scrapers

  PWA FILES (8 files with duplication):
    • app/src/lib/pwa/web-share.js
    • app/src/lib/pwa/background-sync.js
    • app/src/lib/pwa/push-notifications.js
    • app/src/lib/pwa/protocol.js
    • ... 4 more PWA utilities

  DATABASE FILES:
    • app/src/lib/db/dexie/queries.js (62 duplicated patterns)
    • app/src/lib/db/dexie/query-helpers.js (extend this)
    • app/src/lib/services/offlineMutationQueue.js
    • app/src/lib/services/telemetryQueue.js


┌─────────────────────────────────────────────────────────────────────────┐
│ NEXT STEPS                                                              │
└─────────────────────────────────────────────────────────────────────────┘

  1. Review REFACTORING_OPPORTUNITIES_WEEKS_8+.md (full details)
  2. Confirm Week 8-10 roadmap and priorities
  3. Start with Opportunity #1 (Selector Fallback) for quick win
  4. Schedule code review checkpoints after each opportunity
  5. Update test coverage targets in CI/CD

═══════════════════════════════════════════════════════════════════════════

Full analysis: REFACTORING_OPPORTUNITIES_WEEKS_8+.md
Analysis date: 2026-01-30
Context: Post-Phase 2 (42,801 tokens saved)
