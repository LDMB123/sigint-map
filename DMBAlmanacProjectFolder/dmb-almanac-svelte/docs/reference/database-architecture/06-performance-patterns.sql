-- ============================================================================
-- DMBAlmanac Performance Optimization Patterns
-- ============================================================================
-- Specific optimizations for read-heavy concert database queries
-- ============================================================================

-- ============================================================================
-- CONNECTION POOLING CONFIGURATION
-- ============================================================================

-- Recommended pg_bouncer configuration for this workload:
/*
[pgbouncer]
pool_mode = transaction          ; Best for short queries
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 10
reserve_pool_timeout = 3
server_idle_timeout = 120
query_wait_timeout = 60

[databases]
dmbalmanac = host=localhost port=5432 dbname=dmbalmanac
*/

-- ============================================================================
-- MEMORY SETTINGS (postgresql.conf recommendations)
-- ============================================================================

-- For a server with 8GB RAM dedicated to PostgreSQL:
/*
# Memory
shared_buffers = 2GB                    # 25% of RAM
effective_cache_size = 6GB              # 75% of RAM
work_mem = 64MB                         # For sorting/hashing
maintenance_work_mem = 512MB            # For VACUUM, CREATE INDEX

# Query Planner
random_page_cost = 1.1                  # SSD storage
effective_io_concurrency = 200          # SSD storage
default_statistics_target = 100         # Increase for better plans

# WAL Settings
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 1GB

# Parallel Query
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
parallel_leader_participation = on
*/

-- ============================================================================
-- QUERY OPTIMIZATION EXAMPLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROBLEM: Slow song history pagination
-- SOLUTION: Use keyset pagination instead of OFFSET
-- ----------------------------------------------------------------------------

-- BAD: OFFSET-based pagination (slow for large offsets)
-- EXPLAIN ANALYZE
SELECT
    c.id,
    c.show_date,
    c.slug,
    v.name AS venue_name,
    se.set_number,
    se.position
FROM setlist_entries se
JOIN concerts c ON c.id = se.concert_id
JOIN venues v ON v.id = c.venue_id
WHERE se.song_id = 100
ORDER BY c.show_date DESC
LIMIT 20 OFFSET 500;  -- Gets slower as offset increases

-- GOOD: Keyset pagination (constant time regardless of page)
-- EXPLAIN ANALYZE
SELECT
    c.id,
    c.show_date,
    c.slug,
    v.name AS venue_name,
    se.set_number,
    se.position
FROM setlist_entries se
JOIN concerts c ON c.id = se.concert_id
JOIN venues v ON v.id = c.venue_id
WHERE se.song_id = 100
  AND c.show_date < '2022-06-15'  -- Last seen date from previous page
ORDER BY c.show_date DESC
LIMIT 20;

-- Create index to support keyset pagination
CREATE INDEX idx_setlist_song_date ON setlist_entries (song_id, concert_id);
-- Combined with existing concerts date index

-- ----------------------------------------------------------------------------
-- PROBLEM: Concert list with setlist preview is slow (N+1 query)
-- SOLUTION: Use lateral join for "top N per group"
-- ----------------------------------------------------------------------------

-- BAD: Fetching concerts then setlists separately (N+1)
-- Application makes 1 query for concerts + N queries for setlists

-- GOOD: Single query with LATERAL
-- EXPLAIN ANALYZE
SELECT
    c.id,
    c.show_date,
    c.slug,
    c.song_count,
    v.name AS venue_name,
    v.city,
    COALESCE(setlist_preview.songs, '[]'::jsonb) AS first_5_songs
FROM concerts c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'title', s.title,
            'slug', s.slug,
            'set', se.set_number
        ) ORDER BY se.set_number, se.position
    ) AS songs
    FROM setlist_entries se
    JOIN songs s ON s.id = se.song_id
    WHERE se.concert_id = c.id
      AND se.set_number = 1  -- Only first set
      AND se.position <= 5   -- First 5 songs
) setlist_preview ON TRUE
WHERE EXTRACT(YEAR FROM c.show_date) = 2023
ORDER BY c.show_date DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- PROBLEM: Statistics dashboard is slow
-- SOLUTION: Pre-computed materialized views with smart refresh
-- ----------------------------------------------------------------------------

-- Create a refresh tracking table
CREATE TABLE IF NOT EXISTS mv_refresh_log (
    view_name TEXT PRIMARY KEY,
    last_refresh_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    refresh_duration_ms INTEGER,
    row_count INTEGER
);

-- Smart refresh function: only refresh if underlying data changed
CREATE OR REPLACE FUNCTION smart_refresh_mv(
    view_name TEXT,
    force BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
DECLARE
    last_refresh TIMESTAMPTZ;
    data_changed BOOLEAN;
    start_time TIMESTAMPTZ;
    duration_ms INTEGER;
BEGIN
    -- Get last refresh time
    SELECT last_refresh_at INTO last_refresh
    FROM mv_refresh_log
    WHERE mv_refresh_log.view_name = smart_refresh_mv.view_name;

    -- Check if data has changed since last refresh
    IF view_name = 'mv_song_statistics' THEN
        SELECT EXISTS (
            SELECT 1 FROM setlist_entries WHERE created_at > COALESCE(last_refresh, '1970-01-01')
            UNION ALL
            SELECT 1 FROM songs WHERE updated_at > COALESCE(last_refresh, '1970-01-01')
        ) INTO data_changed;
    ELSIF view_name = 'mv_venue_statistics' THEN
        SELECT EXISTS (
            SELECT 1 FROM concerts WHERE updated_at > COALESCE(last_refresh, '1970-01-01')
            UNION ALL
            SELECT 1 FROM venues WHERE updated_at > COALESCE(last_refresh, '1970-01-01')
        ) INTO data_changed;
    ELSE
        data_changed := TRUE;  -- Unknown view, always refresh
    END IF;

    -- Skip refresh if data hasn't changed
    IF NOT force AND NOT data_changed AND last_refresh IS NOT NULL THEN
        RETURN FALSE;
    END IF;

    -- Perform refresh
    start_time := clock_timestamp();

    EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);

    duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;

    -- Log refresh
    INSERT INTO mv_refresh_log (view_name, last_refresh_at, refresh_duration_ms, row_count)
    VALUES (
        view_name,
        NOW(),
        duration_ms,
        (SELECT reltuples::bigint FROM pg_class WHERE relname = view_name)
    )
    ON CONFLICT (view_name) DO UPDATE SET
        last_refresh_at = EXCLUDED.last_refresh_at,
        refresh_duration_ms = EXCLUDED.refresh_duration_ms,
        row_count = EXCLUDED.row_count;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Schedule smart refresh (using pg_cron or external scheduler)
/*
SELECT cron.schedule('refresh-song-stats', '*/15 * * * *',
    $$SELECT smart_refresh_mv('mv_song_statistics')$$);

SELECT cron.schedule('refresh-venue-stats', '0 * * * *',
    $$SELECT smart_refresh_mv('mv_venue_statistics')$$);

SELECT cron.schedule('refresh-yearly-stats', '0 0 * * *',
    $$SELECT smart_refresh_mv('mv_yearly_statistics')$$);
*/

-- ----------------------------------------------------------------------------
-- PROBLEM: Year browser needs all years with counts quickly
-- SOLUTION: Small, frequently-refreshed summary table
-- ----------------------------------------------------------------------------

CREATE TABLE concert_year_summary (
    year INTEGER PRIMARY KEY,
    show_count INTEGER NOT NULL DEFAULT 0,
    first_show DATE,
    last_show DATE,
    unique_venues INTEGER DEFAULT 0,
    unique_songs INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate/update function
CREATE OR REPLACE FUNCTION update_year_summary() RETURNS VOID AS $$
BEGIN
    INSERT INTO concert_year_summary (year, show_count, first_show, last_show, unique_venues, unique_songs)
    SELECT
        EXTRACT(YEAR FROM c.show_date)::INTEGER AS year,
        COUNT(DISTINCT c.id) AS show_count,
        MIN(c.show_date) AS first_show,
        MAX(c.show_date) AS last_show,
        COUNT(DISTINCT c.venue_id) AS unique_venues,
        COUNT(DISTINCT se.song_id) AS unique_songs
    FROM concerts c
    LEFT JOIN setlist_entries se ON se.concert_id = c.id
    GROUP BY EXTRACT(YEAR FROM c.show_date)
    ON CONFLICT (year) DO UPDATE SET
        show_count = EXCLUDED.show_count,
        first_show = EXCLUDED.first_show,
        last_show = EXCLUDED.last_show,
        unique_venues = EXCLUDED.unique_venues,
        unique_songs = EXCLUDED.unique_songs,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update summary when concerts change
CREATE OR REPLACE FUNCTION concert_summary_trigger() RETURNS TRIGGER AS $$
BEGIN
    -- Use pg_notify to batch updates
    PERFORM pg_notify('year_summary_update',
        COALESCE(EXTRACT(YEAR FROM NEW.show_date), EXTRACT(YEAR FROM OLD.show_date))::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER concert_year_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON concerts
    FOR EACH ROW EXECUTE FUNCTION concert_summary_trigger();

-- ----------------------------------------------------------------------------
-- PROBLEM: Finding opener/closer statistics requires full table scan
-- SOLUTION: Partial indexes for boolean flags
-- ----------------------------------------------------------------------------

-- Create partial indexes for commonly filtered boolean columns
CREATE INDEX idx_setlist_openers ON setlist_entries (concert_id, song_id)
    WHERE is_opener = TRUE;

CREATE INDEX idx_setlist_closers ON setlist_entries (concert_id, song_id)
    WHERE is_closer = TRUE;

CREATE INDEX idx_setlist_bustouts ON setlist_entries (concert_id, song_id)
    WHERE is_bustout = TRUE;

CREATE INDEX idx_setlist_encores ON setlist_entries (concert_id, song_id)
    WHERE set_number = 3;  -- Encore set

-- Now these queries are fast:
-- EXPLAIN ANALYZE
SELECT
    s.title,
    s.slug,
    COUNT(*) AS times_opened
FROM setlist_entries se
JOIN songs s ON s.id = se.song_id
WHERE se.is_opener = TRUE  -- Uses partial index
GROUP BY s.id, s.title, s.slug
ORDER BY times_opened DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- PROBLEM: Full-text search on notes is slow
-- SOLUTION: GIN index with optimized tsvector
-- ----------------------------------------------------------------------------

-- Create combined search column
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS search_document TSVECTOR;

-- Update search document
UPDATE concerts SET search_document =
    setweight(to_tsvector('english', COALESCE(tour_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(notes, '')), 'B');

-- Create GIN index
CREATE INDEX idx_concerts_search ON concerts USING GIN (search_document);

-- Trigger to maintain search document
CREATE OR REPLACE FUNCTION concerts_search_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_document :=
        setweight(to_tsvector('english', COALESCE(NEW.tour_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER concerts_search_trigger
    BEFORE INSERT OR UPDATE OF tour_name, notes ON concerts
    FOR EACH ROW EXECUTE FUNCTION concerts_search_update();

-- ============================================================================
-- CACHING STRATEGIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- API Response Caching Keys
-- ----------------------------------------------------------------------------

-- Function to generate cache keys for common queries
CREATE OR REPLACE FUNCTION get_cache_key(
    query_type TEXT,
    params JSONB
) RETURNS TEXT AS $$
BEGIN
    RETURN query_type || ':' || md5(params::TEXT);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Cache invalidation tracking
CREATE TABLE cache_invalidation (
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    invalidated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (entity_type, entity_id)
);

-- Index for cleanup of old invalidations
CREATE INDEX idx_cache_invalidation_time ON cache_invalidation (invalidated_at);

-- Trigger to track cache invalidation
CREATE OR REPLACE FUNCTION track_cache_invalidation() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO cache_invalidation (entity_type, entity_id, invalidated_at)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), NOW())
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET invalidated_at = NOW();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER songs_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON songs
    FOR EACH ROW EXECUTE FUNCTION track_cache_invalidation();

CREATE TRIGGER concerts_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON concerts
    FOR EACH ROW EXECUTE FUNCTION track_cache_invalidation();

-- Clean up old invalidation records (run daily)
CREATE OR REPLACE FUNCTION cleanup_cache_invalidation() RETURNS VOID AS $$
BEGIN
    DELETE FROM cache_invalidation
    WHERE invalidated_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- QUERY PLAN ANALYSIS HELPERS
-- ============================================================================

-- Function to analyze slow queries
CREATE OR REPLACE FUNCTION analyze_slow_queries(
    min_duration_ms INTEGER DEFAULT 100,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    query TEXT,
    calls BIGINT,
    total_time_ms NUMERIC,
    mean_time_ms NUMERIC,
    rows_returned BIGINT,
    shared_blks_hit BIGINT,
    shared_blks_read BIGINT,
    hit_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LEFT(pss.query, 200) AS query,
        pss.calls,
        ROUND(pss.total_exec_time::NUMERIC, 2) AS total_time_ms,
        ROUND(pss.mean_exec_time::NUMERIC, 2) AS mean_time_ms,
        pss.rows,
        pss.shared_blks_hit,
        pss.shared_blks_read,
        ROUND(
            CASE WHEN (pss.shared_blks_hit + pss.shared_blks_read) > 0
            THEN pss.shared_blks_hit::NUMERIC / (pss.shared_blks_hit + pss.shared_blks_read) * 100
            ELSE 100 END,
        2) AS hit_ratio
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > min_duration_ms
    ORDER BY pss.total_exec_time DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check index usage
CREATE OR REPLACE FUNCTION check_unused_indexes()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_scans BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname::TEXT,
        tablename::TEXT,
        indexname::TEXT,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        idx_scan
    FROM pg_stat_user_indexes
    WHERE idx_scan < 100  -- Used less than 100 times
      AND indexrelname NOT LIKE '%_pkey'  -- Exclude primary keys
    ORDER BY pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check table bloat
CREATE OR REPLACE FUNCTION check_table_bloat()
RETURNS TABLE (
    table_name TEXT,
    table_size TEXT,
    dead_tuples BIGINT,
    live_tuples BIGINT,
    dead_ratio NUMERIC,
    last_vacuum TIMESTAMPTZ,
    last_autovacuum TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        relname::TEXT,
        pg_size_pretty(pg_relation_size(relid)) AS table_size,
        n_dead_tup,
        n_live_tup,
        ROUND(
            CASE WHEN n_live_tup > 0
            THEN n_dead_tup::NUMERIC / n_live_tup * 100
            ELSE 0 END,
        2) AS dead_ratio,
        last_vacuum,
        last_autovacuum
    FROM pg_stat_user_tables
    WHERE n_dead_tup > 1000
    ORDER BY n_dead_tup DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PREPARED STATEMENTS FOR COMMON QUERIES
-- ============================================================================

-- Prepare statements for frequently-used queries
PREPARE get_concert_by_slug (TEXT) AS
    SELECT
        c.*,
        jsonb_build_object(
            'id', v.id,
            'name', v.name,
            'city', v.city,
            'state', v.state_province,
            'country', v.country
        ) AS venue
    FROM concerts c
    JOIN venues v ON v.id = c.venue_id
    WHERE c.slug = $1;

PREPARE get_setlist_by_concert_id (INTEGER) AS
    SELECT
        se.*,
        s.title AS song_title,
        s.slug AS song_slug,
        s.is_cover
    FROM setlist_entries se
    JOIN songs s ON s.id = se.song_id
    WHERE se.concert_id = $1
    ORDER BY se.set_number, se.position;

PREPARE get_song_history (INTEGER, DATE, INTEGER) AS
    SELECT
        c.id AS concert_id,
        c.show_date,
        c.slug AS concert_slug,
        v.name AS venue_name,
        v.city,
        se.set_number,
        se.position,
        se.is_bustout,
        se.shows_since_last_played AS gap
    FROM setlist_entries se
    JOIN concerts c ON c.id = se.concert_id
    JOIN venues v ON v.id = c.venue_id
    WHERE se.song_id = $1
      AND ($2 IS NULL OR c.show_date < $2)
    ORDER BY c.show_date DESC
    LIMIT $3;

-- Execute prepared statements:
-- EXECUTE get_concert_by_slug('1996-12-31-hampton-coliseum');
-- EXECUTE get_setlist_by_concert_id(1234);
-- EXECUTE get_song_history(100, '2023-01-01'::DATE, 20);
