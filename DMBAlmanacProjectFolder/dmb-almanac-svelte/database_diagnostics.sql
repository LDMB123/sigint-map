-- DMB Almanac Database Diagnostic: Setlist Coverage Analysis
-- ============================================================

-- 1. Overall Statistics
-- ---------------------
SELECT
    'OVERALL STATISTICS' as report_section,
    COUNT(*) as total_shows,
    COUNT(DISTINCT CASE
        WHEN EXISTS (
            SELECT 1 FROM setlist_entries se
            WHERE se.show_id = shows.id
        ) THEN shows.id
    END) as shows_with_setlists,
    COUNT(*) - COUNT(DISTINCT CASE
        WHEN EXISTS (
            SELECT 1 FROM setlist_entries se
            WHERE se.show_id = shows.id
        ) THEN shows.id
    END) as shows_without_setlists,
    ROUND(
        100.0 * COUNT(DISTINCT CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = shows.id
            ) THEN shows.id
        END) / COUNT(*),
        2
    ) as coverage_percentage
FROM shows;

-- 2. Year-by-Year Coverage Analysis
-- ----------------------------------
SELECT
    CAST(strftime('%Y', date) AS INTEGER) as year,
    COUNT(*) as total_shows,
    COUNT(DISTINCT CASE
        WHEN EXISTS (
            SELECT 1 FROM setlist_entries se
            WHERE se.show_id = shows.id
        ) THEN shows.id
    END) as shows_with_setlists,
    COUNT(*) - COUNT(DISTINCT CASE
        WHEN EXISTS (
            SELECT 1 FROM setlist_entries se
            WHERE se.show_id = shows.id
        ) THEN shows.id
    END) as shows_without_setlists,
    ROUND(
        100.0 * COUNT(DISTINCT CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = shows.id
            ) THEN shows.id
        END) / COUNT(*),
        2
    ) as coverage_percentage
FROM shows
GROUP BY year
ORDER BY year;

-- 3. Problematic Years (Less than 100% Coverage)
-- -----------------------------------------------
SELECT
    CAST(strftime('%Y', date) AS INTEGER) as year,
    COUNT(*) as total_shows,
    COUNT(*) - COUNT(DISTINCT CASE
        WHEN EXISTS (
            SELECT 1 FROM setlist_entries se
            WHERE se.show_id = shows.id
        ) THEN shows.id
    END) as missing_setlists,
    ROUND(
        100.0 * COUNT(DISTINCT CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = shows.id
            ) THEN shows.id
        END) / COUNT(*),
        2
    ) as coverage_percentage
FROM shows
GROUP BY year
HAVING missing_setlists > 0
ORDER BY missing_setlists DESC, year;

-- 4. Specific Shows Missing Setlists (First 50)
-- ----------------------------------------------
SELECT
    shows.id,
    shows.date,
    CAST(strftime('%Y', shows.date) AS INTEGER) as year,
    shows.venue_name,
    shows.city,
    shows.state
FROM shows
WHERE NOT EXISTS (
    SELECT 1 FROM setlist_entries se
    WHERE se.show_id = shows.id
)
ORDER BY shows.date
LIMIT 50;

-- 5. Shows Missing Setlists - Count by Year
-- ------------------------------------------
SELECT
    CAST(strftime('%Y', date) AS INTEGER) as year,
    COUNT(*) as missing_count
FROM shows
WHERE NOT EXISTS (
    SELECT 1 FROM setlist_entries se
    WHERE se.show_id = shows.id
)
GROUP BY year
ORDER BY year;

-- 6. Setlist Entry Statistics
-- ----------------------------
SELECT
    'SETLIST STATISTICS' as report_section,
    COUNT(*) as total_setlist_entries,
    COUNT(DISTINCT show_id) as shows_with_entries,
    ROUND(AVG(songs_per_show), 2) as avg_songs_per_show,
    MIN(songs_per_show) as min_songs_per_show,
    MAX(songs_per_show) as max_songs_per_show
FROM (
    SELECT
        show_id,
        COUNT(*) as songs_per_show
    FROM setlist_entries
    GROUP BY show_id
);

-- 7. Shows with Unusually Low Song Counts (Potential Data Issues)
-- ----------------------------------------------------------------
SELECT
    s.id,
    s.date,
    CAST(strftime('%Y', s.date) AS INTEGER) as year,
    s.venue_name,
    COUNT(se.id) as song_count
FROM shows s
JOIN setlist_entries se ON s.id = se.show_id
GROUP BY s.id
HAVING song_count < 5
ORDER BY s.date;

-- 8. Recent Shows Status (Last 12 months)
-- ----------------------------------------
SELECT
    s.id,
    s.date,
    s.venue_name,
    s.city,
    s.state,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM setlist_entries se
            WHERE se.show_id = s.id
        ) THEN 'HAS SETLIST'
        ELSE 'MISSING SETLIST'
    END as status,
    COUNT(se.id) as song_count
FROM shows s
LEFT JOIN setlist_entries se ON s.id = se.show_id
WHERE s.date >= date('now', '-12 months')
GROUP BY s.id
ORDER BY s.date DESC;
