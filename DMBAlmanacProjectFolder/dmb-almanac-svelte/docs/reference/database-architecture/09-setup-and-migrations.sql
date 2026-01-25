-- ============================================================================
-- DMBAlmanac Database Setup and Migration Scripts
-- ============================================================================
-- Run these scripts in order to set up a new database instance
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE DATABASE AND EXTENSIONS
-- ============================================================================

-- Run as superuser (postgres):
/*
CREATE DATABASE dmbalmanac
    WITH ENCODING 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8';

CREATE USER dmbalmanac_app WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE dmbalmanac TO dmbalmanac_app;
*/

-- Connect to dmbalmanac database, then run:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Set trigram similarity threshold (lower = more fuzzy matches)
SET pg_trgm.similarity_threshold = 0.3;

-- ============================================================================
-- STEP 2: CREATE SCHEMA (run 01-server-schema.sql)
-- ============================================================================

-- Source: 01-server-schema.sql
-- Contains all table definitions, indexes, triggers, and functions

-- ============================================================================
-- STEP 3: DATA MIGRATION HELPERS
-- ============================================================================

-- Function to safely import concerts with venue lookup/creation
CREATE OR REPLACE FUNCTION import_concert(
    p_show_date DATE,
    p_venue_name TEXT,
    p_venue_city TEXT,
    p_venue_state TEXT,
    p_venue_country TEXT DEFAULT 'USA',
    p_tour_name TEXT DEFAULT NULL,
    p_show_type TEXT DEFAULT 'regular',
    p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_venue_id INTEGER;
    v_concert_id INTEGER;
    v_slug TEXT;
BEGIN
    -- Find or create venue
    SELECT id INTO v_venue_id
    FROM venues
    WHERE name_normalized = LOWER(TRIM(p_venue_name))
      AND city = p_venue_city;

    IF v_venue_id IS NULL THEN
        INSERT INTO venues (name, name_normalized, city, state_province, country, slug)
        VALUES (
            TRIM(p_venue_name),
            LOWER(TRIM(p_venue_name)),
            p_venue_city,
            p_venue_state,
            p_venue_country,
            LOWER(REGEXP_REPLACE(
                TRIM(p_venue_name) || '-' || p_venue_city,
                '[^a-zA-Z0-9]+', '-', 'g'
            ))
        )
        RETURNING id INTO v_venue_id;
    END IF;

    -- Generate concert slug
    v_slug := TO_CHAR(p_show_date, 'YYYY-MM-DD') || '-' ||
              LOWER(REGEXP_REPLACE(p_venue_name, '[^a-zA-Z0-9]+', '-', 'g'));

    -- Insert concert
    INSERT INTO concerts (show_date, venue_id, slug, tour_name, show_type, notes)
    VALUES (p_show_date, v_venue_id, v_slug, p_tour_name, p_show_type, p_notes)
    ON CONFLICT (show_date, venue_id) DO UPDATE SET
        tour_name = COALESCE(EXCLUDED.tour_name, concerts.tour_name),
        notes = COALESCE(EXCLUDED.notes, concerts.notes)
    RETURNING id INTO v_concert_id;

    RETURN v_concert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to import setlist entry
CREATE OR REPLACE FUNCTION import_setlist_entry(
    p_concert_id INTEGER,
    p_song_title TEXT,
    p_set_number INTEGER,
    p_position INTEGER,
    p_is_segue BOOLEAN DEFAULT FALSE,
    p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_song_id INTEGER;
    v_entry_id INTEGER;
BEGIN
    -- Find or create song
    SELECT id INTO v_song_id
    FROM songs
    WHERE title_normalized = LOWER(TRIM(p_song_title));

    IF v_song_id IS NULL THEN
        INSERT INTO songs (title, title_normalized, slug)
        VALUES (
            TRIM(p_song_title),
            LOWER(TRIM(p_song_title)),
            LOWER(REGEXP_REPLACE(TRIM(p_song_title), '[^a-zA-Z0-9]+', '-', 'g'))
        )
        RETURNING id INTO v_song_id;
    END IF;

    -- Insert setlist entry
    INSERT INTO setlist_entries (concert_id, song_id, set_number, position, is_segue_from_previous, notes)
    VALUES (p_concert_id, v_song_id, p_set_number, p_position, p_is_segue, p_notes)
    ON CONFLICT (concert_id, set_number, position) DO UPDATE SET
        song_id = EXCLUDED.song_id,
        is_segue_from_previous = EXCLUDED.is_segue_from_previous,
        notes = COALESCE(EXCLUDED.notes, setlist_entries.notes)
    RETURNING id INTO v_entry_id;

    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: POST-IMPORT CALCULATIONS
-- ============================================================================

-- Calculate bustouts and gaps for all setlist entries
CREATE OR REPLACE FUNCTION calculate_all_gaps() RETURNS VOID AS $$
DECLARE
    rec RECORD;
    v_gap INTEGER;
    v_is_bustout BOOLEAN;
BEGIN
    FOR rec IN
        SELECT se.id, se.song_id, se.concert_id, c.show_date
        FROM setlist_entries se
        JOIN concerts c ON c.id = se.concert_id
        ORDER BY c.show_date, se.id
    LOOP
        -- Calculate gap
        SELECT COUNT(*) INTO v_gap
        FROM concerts c2
        WHERE c2.show_date < rec.show_date
          AND c2.show_date > (
            SELECT MAX(c3.show_date)
            FROM setlist_entries se2
            JOIN concerts c3 ON c3.id = se2.concert_id
            WHERE se2.song_id = rec.song_id
              AND c3.show_date < rec.show_date
          );

        -- Determine if bustout (gap > 50 shows)
        v_is_bustout := v_gap > 50;

        -- Update entry
        UPDATE setlist_entries
        SET shows_since_last_played = v_gap,
            is_bustout = v_is_bustout
        WHERE id = rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Mark openers and closers
CREATE OR REPLACE FUNCTION mark_openers_closers() RETURNS VOID AS $$
BEGIN
    -- Reset all flags
    UPDATE setlist_entries SET is_opener = FALSE, is_closer = FALSE;

    -- Mark openers (first song of set 1)
    UPDATE setlist_entries
    SET is_opener = TRUE
    WHERE id IN (
        SELECT se.id
        FROM setlist_entries se
        WHERE se.set_number = 1 AND se.position = 1
    );

    -- Mark closers (last song before encore or last song overall)
    UPDATE setlist_entries
    SET is_closer = TRUE
    WHERE id IN (
        SELECT se.id
        FROM setlist_entries se
        WHERE (se.concert_id, se.set_number, se.position) IN (
            SELECT concert_id, set_number, MAX(position)
            FROM setlist_entries
            WHERE set_number = 2  -- Last of set 2 (before encore)
            GROUP BY concert_id, set_number
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: INITIAL DATA POPULATION
-- ============================================================================

-- Refresh all materialized views
SELECT refresh_statistics_views();

-- Update year summary table
SELECT update_year_summary();

-- ============================================================================
-- STEP 6: VERIFY DATA INTEGRITY
-- ============================================================================

-- Check for orphaned records
SELECT 'Orphaned setlist entries' AS check_name, COUNT(*) AS count
FROM setlist_entries se
LEFT JOIN concerts c ON c.id = se.concert_id
WHERE c.id IS NULL

UNION ALL

SELECT 'Orphaned guest appearances', COUNT(*)
FROM guest_appearances ga
LEFT JOIN concerts c ON c.id = ga.concert_id
WHERE c.id IS NULL

UNION ALL

SELECT 'Concerts without setlists', COUNT(*)
FROM concerts c
LEFT JOIN setlist_entries se ON se.concert_id = c.id
WHERE se.id IS NULL

UNION ALL

SELECT 'Venues without concerts', COUNT(*)
FROM venues v
LEFT JOIN concerts c ON c.venue_id = v.id
WHERE c.id IS NULL;

-- Verify song statistics
SELECT
    s.title,
    s.times_played AS denorm_count,
    COUNT(se.id) AS actual_count,
    CASE WHEN s.times_played = COUNT(se.id) THEN 'OK' ELSE 'MISMATCH' END AS status
FROM songs s
LEFT JOIN setlist_entries se ON se.song_id = s.id
GROUP BY s.id, s.title, s.times_played
HAVING s.times_played != COUNT(se.id)
LIMIT 20;

-- ============================================================================
-- MIGRATION: Add new column example (zero-downtime)
-- ============================================================================

-- Step 1: Add nullable column
-- ALTER TABLE concerts ADD COLUMN weather VARCHAR(255);

-- Step 2: Backfill in batches (run multiple times if needed)
/*
WITH batch AS (
    SELECT id FROM concerts
    WHERE weather IS NULL
    LIMIT 1000
    FOR UPDATE SKIP LOCKED
)
UPDATE concerts c
SET weather = 'Unknown'  -- Or your default/calculated value
FROM batch
WHERE c.id = batch.id;
*/

-- Step 3: Add constraint (if needed)
-- ALTER TABLE concerts ALTER COLUMN weather SET NOT NULL;

-- ============================================================================
-- MIGRATION: Rename column example
-- ============================================================================

-- Step 1: Add new column
-- ALTER TABLE songs ADD COLUMN original_artist_name VARCHAR(255);

-- Step 2: Copy data
-- UPDATE songs SET original_artist_name = original_artist;

-- Step 3: Update application code to use new column

-- Step 4: Drop old column (after app deployed)
-- ALTER TABLE songs DROP COLUMN original_artist;

-- ============================================================================
-- ROLLBACK HELPERS
-- ============================================================================

-- Create a savepoint before risky operations
-- SAVEPOINT before_migration;

-- Rollback if needed
-- ROLLBACK TO before_migration;

-- ============================================================================
-- BACKUP AND RESTORE
-- ============================================================================

-- Backup command (run from shell):
/*
pg_dump -h localhost -U dmbalmanac_app -d dmbalmanac \
    --format=custom \
    --file=dmbalmanac_backup_$(date +%Y%m%d_%H%M%S).dump
*/

-- Restore command:
/*
pg_restore -h localhost -U dmbalmanac_app -d dmbalmanac \
    --clean --if-exists \
    dmbalmanac_backup_20240115_120000.dump
*/

-- ============================================================================
-- HEALTH CHECK QUERIES
-- ============================================================================

-- Database size
SELECT
    pg_database.datname AS database,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'dmbalmanac';

-- Table sizes
SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Index health
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Connection status
SELECT
    COUNT(*) AS total_connections,
    COUNT(*) FILTER (WHERE state = 'active') AS active,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction
FROM pg_stat_activity
WHERE datname = 'dmbalmanac';

-- Replication lag (if using replicas)
SELECT
    client_addr,
    state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS lag_pretty
FROM pg_stat_replication;
