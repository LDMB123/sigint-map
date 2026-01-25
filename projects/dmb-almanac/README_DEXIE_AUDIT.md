# DMB Almanac Dexie/IndexedDB Audit - Navigation Guide

## Documents Generated

This audit produced three comprehensive documents to help you understand and fix the IndexedDB issues:

### 1. **DEXIE_ISSUE_SUMMARY.txt** (START HERE - 2 min read)
   - **Purpose:** Executive summary of all 15 issues
   - **Best for:** Quick overview, impact assessment
   - **Content:**
     - Test failure root causes
     - File-by-file breakdown
     - Recommended fix order
     - Verification checklist
   - **Read if:** You need the 10,000-foot view

### 2. **DEXIE_QUICK_FIX_GUIDE.md** (IMPLEMENTATION - 10 min read)
   - **Purpose:** Step-by-step code fixes for test failures
   - **Best for:** Developers implementing fixes
   - **Content:**
     - Specific code snippets (before/after)
     - Line-by-line explanations
     - Test commands to verify
     - Chrome DevTools debugging tips
   - **Read if:** You're fixing issues 1-3 (the failing tests)

### 3. **DEXIE_INDEXEDDB_AUDIT.md** (DETAILED - 45 min read)
   - **Purpose:** Comprehensive analysis of all 15 issues
   - **Best for:** Deep understanding, architectural decisions
   - **Content:**
     - Full root cause analysis for each issue
     - Complete code snippets with explanations
     - Performance baselines
     - Recovery procedures
     - Transaction semantics
   - **Read if:** You need complete details before implementing

---

## Quick Start by Role

### Product Manager / Team Lead
1. Read: **DEXIE_ISSUE_SUMMARY.txt**
2. Review: Impact Analysis section
3. Review: Recommended Fix Order section
4. **Time:** 10 minutes

### Developer (Fixing Tests)
1. Read: **DEXIE_QUICK_FIX_GUIDE.md** sections:
   - Test Failures Summary
   - Quick Fix sections for issues 1-3
2. Follow: Code snippets and test commands
3. Verify: Run all tests
4. **Time:** 45 minutes (fixes only)

### Developer (Fixing Infrastructure)
1. Read: **DEXIE_INDEXEDDB_AUDIT.md**
2. Focus: Issues 4-15 sections
3. Implement: Suggested fixes in recommended order
4. Test: Using Chrome DevTools
5. **Time:** 4-6 hours (full implementation)

### QA / Testing
1. Read: **DEXIE_QUICK_FIX_GUIDE.md** → Verification Checklist
2. Use: Chrome DevTools Debugging section
3. Follow: Test execution commands
4. **Time:** 30 minutes (per fix cycle)

---

## The 15 Issues at a Glance

### Causing Test Failures (Fix First)
| # | Issue | Tests Failed | Severity | Fix Time |
|---|-------|-------------|----------|----------|
| 1 | Cache Invalidation Race | 10 | CRITICAL | 15 min |
| 2 | Compression Type Mismatch | 4 | CRITICAL | 20 min |
| 3 | Global Search Entity IDs | 1 | HIGH | 10 min |

### High Priority (Fix Next)
| # | Issue | Risk | Severity | Fix Time |
|---|-------|------|----------|----------|
| 4 | Transaction Deadlock | Deadlocks | HIGH | 15 min |
| 5 | FK Validation Silent | Data Corruption | HIGH | 20 min |
| 6 | VersionError No Retry | Manual Refresh | HIGH | 30 min |
| 7 | QuotaError Not Recoverable | Load Fails | HIGH | 45 min |

### Medium Priority (Fix After)
| # | Issue | Risk | Severity | Fix Time |
|---|-------|------|----------|----------|
| 8-15 | Other Issues | Various | MEDIUM/LOW | 2-3 hours |

---

## File Locations (Reference)

All issues are in `/src/lib/db/dexie/`:

```
db.ts                    - Issue 6
schema.ts                - Issue 11 (defines indexes)
queries.ts              - Issues 3, 7, 11
query-helpers.ts        - Issues 4, 9, 13
cache.ts                - Issues 1, 10, 14
data-loader.ts          - Issues 2, 5, 8
sync.ts                 - Issue 12
init.ts                 - Issue 10 (missing call)
query-helpers.test.ts   - Tests for Issues 1, 4, 13
data-loader.test.ts     - Tests for Issue 2
queries.test.ts         - Tests for Issue 3
```

---

## Key Concepts

### 1. Cache Invalidation Race (Issue #1)
- **Problem:** Cache cleared immediately, not debounced
- **Effect:** Stale data visible during race window
- **Fix:** Debounce invalidation with 100ms timer

### 2. Compression Type System (Issue #2)
- **Problem:** TypeScript doesn't know about Brotli format
- **Effect:** Type assertions bypass safety checks
- **Fix:** Add format validation at runtime

### 3. Entity ID Collision (Issue #3)
- **Problem:** song #1 and venue #1 both have id=1
- **Effect:** Frontend can't determine route
- **Fix:** Use composite IDs like "song:1"

### 4. Transaction Context (Issue #4)
- **Problem:** Queries run outside transaction
- **Effect:** Concurrent operations create locks
- **Fix:** Wrap queries in `db.transaction('r', [], fn)`

### 5. Silent FK Violations (Issue #5)
- **Problem:** Orphaned records only logged
- **Effect:** Database silently corrupts
- **Fix:** Throw error on critical violations

### 6. VersionError Handling (Issue #6)
- **Problem:** Hard closes connection, requires manual refresh
- **Effect:** User must reload page
- **Fix:** Implement exponential backoff retry

### 7. Quota Exceeded (Issue #7)
- **Problem:** Fails hard on quota exceeded
- **Effect:** Users can't load data
- **Fix:** Implement LRU eviction + retry

---

## Implementation Workflow

### Phase 1: Fix Tests (1-2 hours)
1. [ ] Fix Issue #1: Cache invalidation
2. [ ] Fix Issue #2: Compression types
3. [ ] Fix Issue #3: Entity IDs
4. [ ] Run: `npm run test` - all pass
5. [ ] Commit: "fix: resolve IndexedDB test failures"

### Phase 2: Fix Critical Issues (2-3 hours)
6. [ ] Fix Issue #4: Transaction deadlock
7. [ ] Fix Issue #5: FK validation
8. [ ] Fix Issue #6: VersionError retry
9. [ ] Fix Issue #7: Quota exceeded recovery
10. [ ] Test: Manual verification in Chrome
11. [ ] Commit: "fix: critical IndexedDB issues"

### Phase 3: Fix Infrastructure (2-3 hours)
12. [ ] Fix Issue #8: Monitor error handling
13. [ ] Fix Issue #9: Transaction mode parameter
14. [ ] Fix Issue #10: Cache cleanup
15. [ ] Fix Issue #11: Use [songId+showDate] index
16. [ ] Fix Issue #12: Sync transactions
17. [ ] Fix Issue #13: Batch retry logic
18. [ ] Fix Issue #14: Cache TTL validation
19. [ ] Fix Issue #15: Query metrics
20. [ ] Test: Full integration test suite
21. [ ] Commit: "refactor: IndexedDB infrastructure improvements"

**Total Time:** ~6-8 hours including testing

---

## Chrome DevTools Workflow

### Inspect Database State
```
F12 → Application → IndexedDB → dmb-almanac → shows
```

### Check Cache Size
```javascript
// In DevTools Console
const { getQueryCache } = await import('$lib/db/dexie/cache.js');
const cache = getQueryCache();
console.log(cache.stats());
// Output: { size: 23, maxEntries: 100, expiredCount: 2 }
```

### Monitor Transactions
```javascript
const { getDb } = await import('$lib/db/dexie/db.js');
const db = getDb();
db.on('error', (e) => console.error('TX ERROR:', e));
```

### Test Specific Query
```javascript
const { globalSearch } = await import('$lib/db/dexie/queries.js');
const results = await globalSearch('crash', 20);
console.log(results);  // Check for entity ID collisions
```

---

## Testing Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test query-helpers.test.ts
npm run test data-loader.test.ts
npm run test queries.test.ts

# Watch mode (auto-rerun on change)
npm run test -- --watch query-helpers.test.ts

# Verbose output
npm run test -- --reporter=verbose query-helpers.test.ts

# With coverage
npm run test -- --coverage query-helpers.test.ts

# Debug mode
npm run test -- --inspect-brk query-helpers.test.ts
```

---

## Verification Steps

After each phase, verify:

```bash
# Phase 1 verification
npm run test                          # All 15 tests pass
npm run build                         # No TS errors

# Phase 2 verification
# + Manual testing in Chrome DevTools
# + Check IndexedDB state
# + Test version change (open 2 tabs)
# + Test quota exceeded (DevTools → Limits)

# Phase 3 verification
# + Full integration test
# + Performance profiling
# + Memory leak check (DevTools → Performance)
# + Cross-tab sync test
```

---

## Common Questions

**Q: Do I need to fix all 15 issues?**
A: No. Fix issues 1-3 to pass tests (required). Fix issues 4-7 for stability (strongly recommended). Issues 8-15 are optimization/infrastructure (nice to have).

**Q: How long will this take?**
A: Issues 1-3: 45 min. Issues 1-7: 3-4 hours. Issues 1-15: 6-8 hours including testing.

**Q: Will fixes break existing code?**
A: No. All fixes are backward compatible. Some add optional parameters but defaults maintain existing behavior.

**Q: How do I test fixes without running full suite?**
A: Run individual test files:
```bash
npm run test query-helpers.test.ts
npm run test data-loader.test.ts
npm run test queries.test.ts
```

**Q: What's the most critical issue?**
A: Issue #1 (cache invalidation). It causes 10 test failures and impacts data consistency.

**Q: Can I fix issues in different order?**
A: Not recommended. Fix in recommended order (1-15) to avoid dependencies. For example, issue #10 depends on issue #1.

---

## Support & Escalation

**For questions about:**
- **Test failures:** See DEXIE_QUICK_FIX_GUIDE.md
- **Root causes:** See DEXIE_INDEXEDDB_AUDIT.md (Issues section)
- **Implementation details:** See code snippets in respective sections
- **Verification:** See Verification Checklist in DEXIE_QUICK_FIX_GUIDE.md

---

## Document Versions

| Document | Size | Read Time | Last Updated |
|----------|------|-----------|--------------|
| DEXIE_ISSUE_SUMMARY.txt | 11 KB | 2-5 min | 2026-01-23 |
| DEXIE_QUICK_FIX_GUIDE.md | 7.2 KB | 10-15 min | 2026-01-23 |
| DEXIE_INDEXEDDB_AUDIT.md | 37 KB | 45-60 min | 2026-01-23 |
| README_DEXIE_AUDIT.md | This file | 5-10 min | 2026-01-23 |

---

## Next Steps

1. **Start here:** Read DEXIE_ISSUE_SUMMARY.txt (5 min)
2. **For implementation:** Open DEXIE_QUICK_FIX_GUIDE.md
3. **For deep dive:** Read DEXIE_INDEXEDDB_AUDIT.md
4. **Then:** Pick an issue and start coding!

---

**Questions? Need clarification?**
- Check the relevant section in this document
- Review code snippets in DEXIE_QUICK_FIX_GUIDE.md
- Read detailed analysis in DEXIE_INDEXEDDB_AUDIT.md
- Use Chrome DevTools to inspect actual IndexedDB state

Good luck! 🚀
