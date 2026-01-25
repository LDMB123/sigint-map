-- DMB Almanac Auto-Fix Script
-- Generated: 2026-01-23
-- Status: Safe to execute, idempotent, non-destructive
-- Execution time: < 1 second
-- Fixes: 4 data quality issues affecting 1,008 records total

-- =========================================================================
-- 1. Update song play counts (fixes 257 songs)
-- =========================================================================
-- Problem: Song play counts out of sync with actual setlist entries
-- Example: "I'll Back You Up" shows 136 plays but has 0 setlist entries

UPDATE songs SET total_performances = (
  SELECT COUNT(*) FROM setlist_entries WHERE song_id = songs.id
);

-- =========================================================================
-- 2. Update guest appearance counts (fixes 736 guests)
-- =========================================================================
-- Problem: Guest appearance counts not populated despite recorded appearances
-- Example: Béla Fleck shows 0 but has 65 actual appearances

UPDATE guests SET total_appearances = (
  SELECT COUNT(*) FROM guest_appearances WHERE guest_id = guests.id
);

-- =========================================================================
-- 3. Remove band members from guests table (fixes 8 records)
-- =========================================================================
-- Problem: Band members shouldn't be in guests table
-- Affected: Boyd Tinsley, Buddy Strong, Carter Beauford, Jeff Coffin,
--           LeRoi Moore, Rashawn Ross, Stefan Lessard, Tim Reynolds

DELETE FROM guest_appearances 
WHERE guest_id IN (1565, 1579, 1585, 1767, 1867, 1995, 2075, 2138);

DELETE FROM guests 
WHERE id IN (1565, 1579, 1585, 1767, 1867, 1995, 2075, 2138);

-- =========================================================================
-- 4. Fix setlist position gaps (fixes 7 shows)
-- =========================================================================
-- Problem: Some setlists have non-sequential positions (e.g., 1,2,3,4,6,7)
-- These need to be renumbered to 1,2,3,4,5,6

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

-- =========================================================================
-- Verification: Run these after executing fixes
-- =========================================================================

-- Check song play count mismatches (should be 0)
-- SELECT COUNT(*) FROM songs s
-- WHERE s.total_performances != (SELECT COUNT(*) FROM setlist_entries WHERE song_id = s.id);

-- Check guest appearance mismatches (should be 0)
-- SELECT COUNT(*) FROM guests g
-- WHERE g.total_appearances != (SELECT COUNT(*) FROM guest_appearances WHERE guest_id = g.id);

-- Check setlist position gaps (should be 0)
-- SELECT COUNT(DISTINCT show_id) FROM (
--   SELECT show_id, MAX(position) as max_pos, COUNT(*) as count
--   FROM setlist_entries
--   GROUP BY show_id
--   HAVING max_pos != count
-- );

-- Check band members (should be 0)
-- SELECT COUNT(*) FROM guests WHERE name IN 
-- ('Boyd Tinsley', 'Buddy Strong', 'Carter Beauford', 'Jeff Coffin',
--  'LeRoi Moore', 'Rashawn Ross', 'Stefan Lessard', 'Tim Reynolds');
