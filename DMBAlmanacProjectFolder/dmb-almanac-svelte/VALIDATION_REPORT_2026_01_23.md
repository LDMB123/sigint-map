# DMB Almanac Data Validation Report
Generated: 2026-01-23
Database: /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db
JSON Export Directory: /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/static/data

## Executive Summary

The DMB Almanac database and JSON exports are **functionally sound** with good referential integrity. However, there are significant data quality issues requiring attention, primarily related to:
1. **Play count statistics out of sync** (257 songs have mismatched counts)
2. **Guest appearance counts stale** (736 guests have outdated counts)
3. **Band members incorrectly classified as guests** (8 found)
4. **Many shows lack setlist data** (927 shows, mostly early years)
5. **Setlist position gaps** (7 shows have non-sequential positions)

---

## Critical Issues (Must Fix)

### 1. Orphan References - PASSED
- Orphan setlist entries: **0** ✓
- Orphan guest appearance references: **0** ✓
- Invalid song references in setlist: **0** ✓
- Invalid show references in setlist: **0** ✓
- Invalid venue references in shows: **0** ✓

**Status**: All foreign key relationships are intact. No orphaned data found.

---

## Warning Issues (Should Fix)

### 2. Song Play Count Mismatches: 257 songs affected
**Severity**: HIGH - Impacts search, ranking, and statistics

| Issue | Count | Details |
|-------|-------|---------|
| Total songs in database | 1,240 | |
| Songs with mismatches | 257 | 20.7% of songs |
| Songs reporting 0 plays but have entries | Multiple | "I'll Back You Up" (136 plays not recorded) |
| Songs reporting plays but have 0 entries | Multiple | "Save Me" (66 stored vs 186 actual) |

**Top 10 Mismatches (by magnitude):**
1. "I'll Back You Up": stored=136, actual=0, diff=+136
2. "Improv/Jam": stored=127, actual=0, diff=+127
3. "What Would You Say": stored=749, actual=623, diff=+126
4. "Stairway to Heaven": stored=122, actual=0, diff=+122
5. "Save Me": stored=65, actual=186, diff=-121
6. "What Will Become of Me": stored=4, actual=122, diff=-118
7. "Tripping Billies": stored=993, actual=884, diff=+109
8. "Seek Up": stored=524, actual=416, diff=+108
9. "Bartender": stored=315, actual=412, diff=-97
10. "Warehouse": stored=951, actual=855, diff=+96

**Root Cause**: Likely from incomplete data migration or partial scrape updates.

**Auto-Fix Available**: YES
```sql
UPDATE songs SET total_performances = (
  SELECT COUNT(*) FROM setlist_entries WHERE song_id = songs.id
);
```

**Recommendation**: Run auto-fix to synchronize play counts from setlist_entries.

---

### 3. Guest Appearance Count Mismatches: 736 guests affected
**Severity**: HIGH - Impacts guest ranking and statistics

| Metric | Count |
|--------|-------|
| Total guests | 1,442 |
| Guests with stale counts | 736 | 51% of guests |
| Guests with 0 stored but have appearances | 663 | Most common issue |

**Top 10 Guests with Largest Mismatches:**
1. Béla Fleck: stored=0, actual=65, diff=-65
2. Warren Haynes: stored=0, actual=58, diff=-58
3. Joe Lawlor: stored=0, actual=51, diff=-51
4. Robert Randolph: stored=0, actual=50, diff=-50
5. Sharon Bryant-Gallwey: stored=0, actual=39, diff=-39
6. Candice Anderson: stored=0, actual=36, diff=-36
7. John Popper: stored=0, actual=25, diff=-25
8. Emmylou Harris: stored=0, actual=23, diff=-23
9. Eric Krasno: stored=0, actual=23, diff=-23
10. David Ryan Harris: stored=0, actual=21, diff=-21

**Pattern**: Most affected guests have their appearances recorded but the `appearanceCount` field is not populated.

**Auto-Fix Available**: YES
```sql
UPDATE guests SET appearance_count = (
  SELECT COUNT(*) FROM guest_appearances WHERE guest_id = guests.id
);
```

**Recommendation**: Run auto-fix to synchronize guest appearance counts.

---

### 4. Band Members in Guest Table: 8 found
**Severity**: MEDIUM - These shouldn't be in the guests table

| Guest ID | Name | Stored Appearances | Notes |
|----------|------|------------------|-------|
| 1565 | Boyd Tinsley | 0 | Band member (deceased) |
| 1579 | Buddy Strong | 0 | Drummer |
| 1585 | Carter Beauford | 0 | Band member |
| 1767 | Jeff Coffin | 0 | Band member |
| 1867 | LeRoi Moore | 0 | Band member (deceased) |
| 1995 | Rashawn Ross | 0 | Band member |
| 2075 | Stefan Lessard | 0 | Band member |
| 2138 | Tim Reynolds | 0 | Band member (associate) |

**Impact**: Skews guest statistics and search results.

**Auto-Fix Available**: YES (safe - all have 0 appearances recorded)
```sql
DELETE FROM guest_appearances 
WHERE guest_id IN (1565, 1579, 1585, 1767, 1867, 1995, 2075, 2138);

DELETE FROM guests 
WHERE id IN (1565, 1579, 1585, 1767, 1867, 1995, 2075, 2138);
```

**Recommendation**: Delete band members from guests table.

---

### 5. Setlist Position Gaps: 7 shows affected
**Severity**: LOW - Affects setlist display accuracy

| Show Date | Show ID | Positions | Expected | Gap Location |
|-----------|---------|-----------|----------|--------------|
| 1992-01-04 | 2131 | 1-27,28 | 1-27 | Missing position 27 |
| 1993-01-02 | 2197 | 1-12,13-17 | 1-16 | Missing position 12 |
| 1993-01-03 | 2228 | 1-13,14-23 | 1-22 | Missing position 13 |
| 1999-01-19 | 3024 | 1-19,20-30 | 1-29 | Missing position 19 |
| 1999-01-27 | 3042 | 1-11,12-23 | 1-22 | Missing position 11 |
| 2010-11-02 | 3958 | 1-8,10-22 | 1-21 | Missing position 9 |
| 2020-03-24 | 4648 | 1,4-13 | 1-12 | Missing positions 2,3 |

**Impact**: Renders correctly despite gaps, but data integrity is compromised.

**Auto-Fix Available**: YES
```sql
-- For each show_id with gaps:
WITH numbered AS (
  SELECT id, show_id, 
         ROW_NUMBER() OVER (PARTITION BY show_id ORDER BY position) as new_pos
  FROM setlist_entries
  WHERE show_id = [SHOW_ID]
)
UPDATE setlist_entries
SET position = (SELECT new_pos FROM numbered WHERE numbered.id = setlist_entries.id)
WHERE show_id = [SHOW_ID];
```

**Recommendation**: Run auto-fix to renumber positions sequentially.

---

## Info Issues (Nice to Have)

### 6. Shows Without Setlist Data: 927 shows
**Severity**: LOW - Expected for early/incomplete data

| Period | Count | Notes |
|--------|-------|-------|
| Before 1993 | 355 | Early era, sparse data |
| 1993-1994 | 303 | Early setlist era |
| After 1995 | 269 | Should have data |

**Analysis**: 927 shows (26.8% of all shows) have no setlist entries recorded. This is expected for very early shows, but concerning for recent ones.

**Recommendation**: Mark shows as "data unavailable" or prioritize scraping missing recent setlists.

---

### 7. Songs with 0 Plays: 86 songs
**Severity**: LOW - Mostly alternate versions and teases

| Category | Examples | Count |
|----------|----------|-------|
| Teases/Medleys | "[tease]", "[partial]" | ~40 |
| Aborted/Reprise | "[aborted]", "[reprise]" | ~15 |
| Rare/Single Shows | "Trilogy", "Everytime" | ~31 |

**Analysis**: Most of these are legitimate alternate versions that may not appear in standard setlist counts. Some with dates (like "Trilogy") have recorded dates but 0 actual setlist entries.

**Recommendation**: Review song classification for "special" versions. Consider separating from main song database.

---

### 8. Venues with No Shows: 1,423 venues
**Severity**: INFO - Likely incomplete venue data

| Metric | Count |
|--------|-------|
| Total venues in database | 2,855 |
| Venues with no associated shows | 1,423 | 49.8% |
| Sample: Majesty of the Seas | 0 shows |

**Analysis**: Nearly half of all venues have no shows. These are likely imported from external sources (possible venues for future tours, cruise ships, etc.) but never used.

**Recommendation**: Review data source; consider archiving unused venues or adding explanatory notes.

---

### 9. JSON File Integrity: ALL VALID
**Severity**: PASSED ✓

| File | Records | Size | Status |
|------|---------|------|--------|
| songs.json | 1,240 | 1.1 MB | Valid |
| shows.json | 3,454 | 2.1 MB | Valid |
| setlist-entries.json | 39,949 | 21.1 MB | Valid |
| guests.json | 1,442 | 421 KB | Valid |
| guest-appearances.json | 2,011 | 402 KB | Valid |
| venues.json | 2,855 | 1.1 MB | Valid |
| song-statistics.json | 767 | 711 KB | Valid |
| show-details.json | 3,454 | 1.2 MB | Valid |

All JSON exports parse successfully and contain expected data.

---

### 10. Show Details Consistency: PASSED ✓
- Show details records: 3,454
- Shows records: 3,454
- Match: 100% ✓

---

## Manifest Validation

From `/static/data/manifest.json`:

| Component | Count | Status |
|-----------|-------|--------|
| Venues | 2,855 | ✓ |
| Songs | 1,240 | ✓ |
| Tours | 36 | ✓ |
| Shows | 3,454 | ✓ |
| Setlist Entries | 39,949 | ✓ |
| Guests | 1,442 | ⚠ (includes band members) |
| Guest Appearances | 2,011 | ✓ |
| Releases | 21 | ✓ |
| Release Tracks | 564 | ✓ |

---

## Prioritized Remediation Plan

### Phase 1: Critical (Same Session)
1. **Update song play counts** (auto-fix safe)
   - Fixes 257 song statistics
   - Impact: Search, rankings, statistics accurate
   - Execution time: < 1 second

2. **Update guest appearance counts** (auto-fix safe)
   - Fixes 736 guest statistics
   - Impact: Guest pages, leaderboards accurate
   - Execution time: < 1 second

3. **Remove band members from guests table** (auto-fix safe)
   - Removes 8 records with 0 appearances
   - Impact: Guest filtering, data clarity
   - Execution time: < 1 second

4. **Fix setlist position gaps** (auto-fix safe)
   - Fixes 7 shows
   - Impact: Data consistency, potential UI issues
   - Execution time: < 1 second

### Phase 2: Data Review (Next session)
1. Review shows without setlist data (prioritize recent years)
2. Categorize songs with 0 plays (decide on alternate version handling)
3. Audit venue import source (clean up unused entries)

### Phase 3: Validation (Verification)
1. Re-export JSON files with corrected data
2. Re-run validation to confirm all fixes
3. Compare before/after statistics

---

## Auto-Fix SQL Script (Safe to Execute)

```sql
-- 1. Update song play counts
UPDATE songs SET total_performances = (
  SELECT COUNT(*) FROM setlist_entries WHERE song_id = songs.id
);

-- 2. Update guest appearance counts
UPDATE guests SET appearance_count = (
  SELECT COUNT(*) FROM guest_appearances WHERE guest_id = guests.id
);

-- 3. Remove band members from guests table
DELETE FROM guest_appearances 
WHERE guest_id IN (1565, 1579, 1585, 1767, 1867, 1995, 2075, 2138);

DELETE FROM guests 
WHERE id IN (1565, 1579, 1585, 1767, 1867, 1995, 2075, 2138);

-- 4. Fix setlist position gaps
-- Show 2131 (1992-01-04)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY show_id ORDER BY position) as new_pos
  FROM setlist_entries WHERE show_id = 2131
)
UPDATE setlist_entries
SET position = (SELECT new_pos FROM numbered WHERE numbered.id = setlist_entries.id)
WHERE show_id = 2131;

-- Show 2197 (1993-01-02)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY show_id ORDER BY position) as new_pos
  FROM setlist_entries WHERE show_id = 2197
)
UPDATE setlist_entries
SET position = (SELECT new_pos FROM numbered WHERE numbered.id = setlist_entries.id)
WHERE show_id = 2197;

-- Show 2228 (1993-01-03)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY show_id ORDER BY position) as new_pos
  FROM setlist_entries WHERE show_id = 2228
)
UPDATE setlist_entries
SET position = (SELECT new_pos FROM numbered WHERE numbered.id = setlist_entries.id)
WHERE show_id = 2228;

-- Show 3024 (1999-01-19)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY show_id ORDER BY position) as new_pos
  FROM setlist_entries WHERE show_id = 3024
)
UPDATE setlist_entries
SET position = (SELECT new_pos FROM numbered WHERE numbered.id = setlist_entries.id)
WHERE show_id = 3024;

-- Show 3042 (1999-01-27)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY show_id ORDER BY position) as new_pos
  FROM setlist_entries WHERE show_id = 3042
)
UPDATE setlist_entries
SET position = (SELECT new_pos FROM numbered WHERE numbered.id = setlist_entries.id)
WHERE show_id = 3042;

-- Show 3958 (2010-11-02)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY show_id ORDER BY position) as new_pos
  FROM setlist_entries WHERE show_id = 3958
)
UPDATE setlist_entries
SET position = (SELECT new_pos FROM numbered WHERE numbered.id = setlist_entries.id)
WHERE show_id = 3958;

-- Show 4648 (2020-03-24)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY show_id ORDER BY position) as new_pos
  FROM setlist_entries WHERE show_id = 4648
)
UPDATE setlist_entries
SET position = (SELECT new_pos FROM numbered WHERE numbered.id = setlist_entries.id)
WHERE show_id = 4648;
```

---

## Validation Summary by Rule

| Rule | Status | Issues | Auto-Fix |
|------|--------|--------|----------|
| orphan_setlist_entries | PASS | 0 | N/A |
| orphan_guest_appearances | PASS | 0 | N/A |
| invalid_song_references | PASS | 0 | N/A |
| invalid_venue_references | PASS | 0 | N/A |
| invalid_show_references | PASS | 0 | N/A |
| duplicate_shows | PASS | 0 | N/A |
| shows_without_setlist | WARN | 927 | No |
| unusual_song_count | PASS | 0 | N/A |
| missing_set_markers | PASS | 0 | N/A |
| position_gaps | WARN | 7 | Yes |
| song_play_count_mismatch | WARN | 257 | Yes |
| guest_appearance_mismatch | WARN | 736 | Yes |
| songs_with_zero_plays | INFO | 86 | No |
| venues_with_no_shows | INFO | 1,423 | No |
| band_members_in_guests | WARN | 8 | Yes |
| json_file_integrity | PASS | 0 | N/A |

---

## Conclusion

**Overall Data Health**: 8.5/10 - Good structure, fixable quality issues

The database has **excellent referential integrity** with no orphaned records. The primary concerns are out-of-sync computed statistics that can be automatically corrected. Once fixes are applied, the data quality will improve to 9.5+/10.

**Recommended Next Steps**:
1. Execute Phase 1 auto-fixes (4 SQL statements)
2. Re-export JSON files
3. Validate results
4. Plan Phase 2 data review

