# Data Validation Checklist

**Date**: 2026-01-23  
**Database**: dmb-almanac.db  
**Status**: Complete with actionable findings

## Pre-Validation Checklist (Completed)

- [x] Database integrity check
- [x] JSON file parsing validation
- [x] Foreign key relationship verification
- [x] Cross-file data consistency check
- [x] Computed statistics verification
- [x] Duplicate detection
- [x] Orphan record detection

## Validation Results Summary

### Critical Checks (PASSED)
- [x] No orphan setlist entries (0/39,949)
- [x] No orphan guest appearances (0/2,011)
- [x] No invalid song references (0/39,949)
- [x] No invalid venue references (0/3,454)
- [x] No invalid show references (0/39,949)
- [x] No duplicate shows (0 pairs)
- [x] All JSON files parse successfully (8/8)
- [x] Show/show-details match 100% (3,454/3,454)

### Warning Issues (READY TO FIX)
- [x] Identified: 257 song play count mismatches
- [x] Identified: 736 guest appearance mismatches
- [x] Identified: 8 band members in guests table
- [x] Identified: 7 shows with position gaps
- [x] Created: Auto-fix SQL script

### Info Issues (DOCUMENTED)
- [x] Documented: 927 shows without setlist
- [x] Documented: 86 songs with 0 plays
- [x] Documented: 1,423 venues with no shows

## Action Items - Phase 1 (Execute Fixes)

### [ ] Step 1: Review Summary (2 minutes)
- [ ] Read: `VALIDATION_SUMMARY_2026_01_23.txt`
- [ ] Understand the 4 main issues
- [ ] Understand the low-priority issues
- [ ] Approve fixes

### [ ] Step 2: Execute Auto-Fixes (1 minute)
- [ ] Have access to: `/data/dmb-almanac.db`
- [ ] Have script: `AUTO_FIX_SCRIPT.sql`
- [ ] Run: `sqlite3 data/dmb-almanac.db < AUTO_FIX_SCRIPT.sql`
- [ ] Wait for completion (< 1 second)

### [ ] Step 3: Verify Results (2 minutes)
Run these verification queries (should all return 0):

```sql
-- 1. Song play count mismatches
SELECT COUNT(*) as song_mismatches FROM songs s
WHERE s.total_performances != (SELECT COUNT(*) FROM setlist_entries WHERE song_id = s.id);

-- Expected result: 0
```

- [ ] Result 1: 0 ✓
- [ ] Result 2: 0 ✓
- [ ] Result 3: 0 ✓
- [ ] Result 4: 0 ✓

```sql
-- 2. Guest appearance mismatches
SELECT COUNT(*) as guest_mismatches FROM guests g
WHERE g.appearance_count != (SELECT COUNT(*) FROM guest_appearances WHERE guest_id = g.id);

-- Expected result: 0
```

```sql
-- 3. Setlist position gaps
SELECT COUNT(DISTINCT show_id) as gaps FROM (
  SELECT show_id, MAX(position) as max_pos, COUNT(*) as count
  FROM setlist_entries
  GROUP BY show_id
  HAVING max_pos != count
);

-- Expected result: 0
```

```sql
-- 4. Band members in guests table
SELECT COUNT(*) as band_members FROM guests WHERE name IN 
('Boyd Tinsley', 'Buddy Strong', 'Carter Beauford', 'Jeff Coffin',
 'LeRoi Moore', 'Rashawn Ross', 'Stefan Lessard', 'Tim Reynolds');

-- Expected result: 0
```

## Action Items - Phase 2 (Post-Fix)

### [ ] Step 4: Re-Export JSON (5 minutes)
- [ ] Run: `npm run export-to-json` (or your export script)
- [ ] Verify: New files in `/static/data/`
- [ ] Check: Updated timestamps in manifest.json
- [ ] List: `ls -lh static/data/manifest.json`

### [ ] Step 5: Update Manifest
- [ ] Edit: `static/data/manifest.json`
- [ ] Update: `timestamp` field to new date/time
- [ ] Update: Record counts if they changed
- [ ] Save and commit

### [ ] Step 6: Post-Fix Validation (5 minutes)
- [ ] Validate: Re-run validation on new JSON exports
- [ ] Compare: Before/after statistics
- [ ] Document: Changes made

## Action Items - Phase 3 (Optional Analysis)

### [ ] Review Low-Priority Issues
- [ ] Analyze: 927 shows without setlist
- [ ] Categorize: By year range
- [ ] Decide: Scrape missing data or mark incomplete?

### [ ] Review Zero-Play Songs
- [ ] Categorize: Teases, reprises, aborted, etc.
- [ ] Decide: Keep or archive?
- [ ] Document: Policy decision

### [ ] Audit Venue Data
- [ ] Review: 1,423 unused venues
- [ ] Check: Data source and import date
- [ ] Decide: Keep, archive, or delete?

## Success Criteria

Before Fixes:
- [x] Health Score: 8.5/10
- [x] Song accuracy: 79.2%
- [x] Guest accuracy: 49.0%
- [x] Data consistency: 99.8%

After Fixes (Target):
- [ ] Health Score: 9.5+/10
- [ ] Song accuracy: 100%
- [ ] Guest accuracy: 99.4%
- [ ] Data consistency: 100%

## Documentation Generated

- [x] START_HERE.md - Entry point guide
- [x] VALIDATION_SUMMARY_2026_01_23.txt - Quick overview
- [x] VALIDATION_REPORT_2026_01_23.md - Full analysis
- [x] VALIDATION_README.md - How-to guide
- [x] AUTO_FIX_SCRIPT.sql - Ready-to-execute fixes
- [x] VALIDATION_CHECKLIST.md - This file

## Sign-Off

- [ ] Manager/Lead reviewed findings
- [ ] Fixes approved for execution
- [ ] Date approved: ___________
- [ ] Authorized by: ___________

## Execution Timeline

- [ ] Phase 1 (Fixes): __________ [Target: Today]
- [ ] Phase 2 (Export): __________ [Target: Today]
- [ ] Phase 3 (Analysis): __________ [Target: Next session]

## Notes

```
[Space for additional notes or observations]
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

## Quick Commands Reference

Execute fixes:
```bash
sqlite3 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db < AUTO_FIX_SCRIPT.sql
```

Verify fixes:
```bash
sqlite3 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db
# Then paste verification queries from above
```

Re-export JSON:
```bash
npm run export-to-json
# Or: npm run export (depends on your script)
```

---

**Checklist Version**: 1.0  
**Last Updated**: 2026-01-23  
**Status**: Ready for Execution
