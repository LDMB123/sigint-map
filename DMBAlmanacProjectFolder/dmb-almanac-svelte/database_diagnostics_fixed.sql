-- DMB Almanac Database Diagnostic: Setlist Coverage Analysis
-- ============================================================

-- 1. Specific Shows Missing Setlists (with venue details)
-- --------------------------------------------------------
SELECT
    s.id,
    s.date,
    CAST(strftime('%Y', s.date) AS INTEGER) as year,
    v.name as venue_name,
    v.city,
    v.state,
    v.country_code
FROM shows s
JOIN venues v ON s.venue_id = v.id
WHERE NOT EXISTS (
    SELECT 1 FROM setlist_entries se
    WHERE se.show_id = s.id
)
ORDER BY s.date;

-- 2. Shows with Unusually Low Song Counts (Potential Data Issues)
-- ----------------------------------------------------------------
SELECT
    s.id,
    s.date,
    CAST(strftime('%Y', s.date) AS INTEGER) as year,
    v.name as venue_name,
    v.city,
    v.state,
    COUNT(se.id) as song_count
FROM shows s
JOIN venues v ON s.venue_id = v.id
JOIN setlist_entries se ON s.id = se.show_id
GROUP BY s.id
HAVING song_count < 5
ORDER BY s.date;

-- 3. Recent Shows Status (Last 24 months)
-- ----------------------------------------
SELECT
    s.id,
    s.date,
    v.name as venue_name,
    v.city,
    v.state,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM setlist_entries se
            WHERE se.show_id = s.id
        ) THEN 'HAS SETLIST'
        ELSE 'MISSING SETLIST'
    END as status,
    COALESCE((SELECT COUNT(*) FROM setlist_entries se WHERE se.show_id = s.id), 0) as song_count
FROM shows s
JOIN venues v ON s.venue_id = v.id
WHERE s.date >= date('now', '-24 months')
ORDER BY s.date DESC;
