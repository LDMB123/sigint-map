-- ============================================================================
-- DMBAlmanac Common Query Patterns
-- ============================================================================
-- Optimized queries for the most common use cases
-- ============================================================================

-- ============================================================================
-- CONCERT QUERIES
-- ============================================================================

-- Get full concert details with venue (single concert page)
SELECT
    c.id,
    c.show_date,
    c.slug,
    c.tour_name,
    c.show_type,
    c.song_count,
    c.notes,
    c.has_audio,
    c.has_video,
    jsonb_build_object(
        'id', v.id,
        'name', v.name,
        'city', v.city,
        'state', v.state_province,
        'country', v.country,
        'latitude', v.latitude,
        'longitude', v.longitude
    ) AS venue
FROM concerts c
JOIN venues v ON v.id = c.venue_id
WHERE c.slug = '1996-12-31-hampton-coliseum';

-- Get complete setlist for a concert (with all metadata)
SELECT
    se.set_number,
    se.position,
    se.is_opener,
    se.is_closer,
    se.is_segue_from_previous,
    se.is_tease,
    se.is_bustout,
    se.shows_since_last_played AS gap,
    se.duration_seconds,
    se.notes AS performance_notes,
    jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'slug', s.slug,
        'is_cover', s.is_cover,
        'original_artist', s.original_artist
    ) AS song,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', g.id,
                'name', g.name,
                'instrument', ga.instrument
            )
        ) FILTER (WHERE g.id IS NOT NULL),
        '[]'::jsonb
    ) AS guests
FROM setlist_entries se
JOIN songs s ON s.id = se.song_id
LEFT JOIN guest_appearances ga ON ga.setlist_entry_id = se.id
LEFT JOIN guests g ON g.id = ga.guest_id
WHERE se.concert_id = (SELECT id FROM concerts WHERE slug = '1996-12-31-hampton-coliseum')
GROUP BY se.id, se.set_number, se.position, se.is_opener, se.is_closer,
         se.is_segue_from_previous, se.is_tease, se.is_bustout,
         se.shows_since_last_played, se.duration_seconds, se.notes,
         s.id, s.title, s.slug, s.is_cover, s.original_artist
ORDER BY se.set_number, se.position;

-- Paginated concert list (efficient cursor-based pagination)
SELECT
    c.id,
    c.show_date,
    c.slug,
    c.song_count,
    c.tour_name,
    v.name AS venue_name,
    v.city,
    v.state_province
FROM concerts c
JOIN venues v ON v.id = c.venue_id
WHERE c.show_date < '2024-01-01'  -- Cursor: last seen date
ORDER BY c.show_date DESC
LIMIT 50;

-- Concerts by year with count per month (for year browser)
SELECT
    EXTRACT(MONTH FROM show_date)::INTEGER AS month,
    COUNT(*) AS show_count,
    jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'date', c.show_date,
            'slug', c.slug,
            'venue', v.name,
            'city', v.city
        ) ORDER BY c.show_date
    ) AS shows
FROM concerts c
JOIN venues v ON v.id = c.venue_id
WHERE EXTRACT(YEAR FROM c.show_date) = 2023
GROUP BY EXTRACT(MONTH FROM show_date)
ORDER BY month;

-- ============================================================================
-- SONG QUERIES
-- ============================================================================

-- Song detail page with statistics
SELECT
    s.*,
    ms.times_played,
    ms.first_played,
    ms.last_played,
    ms.unique_venues,
    ms.times_opened,
    ms.times_closed,
    ms.times_in_encore,
    ms.avg_duration_seconds,
    ms.max_gap AS longest_gap,
    -- Recent performances
    (
        SELECT jsonb_agg(perf ORDER BY show_date DESC)
        FROM (
            SELECT jsonb_build_object(
                'concert_id', c.id,
                'show_date', c.show_date,
                'concert_slug', c.slug,
                'venue_name', v.name,
                'city', v.city,
                'set_number', se.set_number,
                'position', se.position,
                'is_bustout', se.is_bustout,
                'gap', se.shows_since_last_played
            ) AS perf,
            c.show_date
            FROM setlist_entries se
            JOIN concerts c ON c.id = se.concert_id
            JOIN venues v ON v.id = c.venue_id
            WHERE se.song_id = s.id
            ORDER BY c.show_date DESC
            LIMIT 10
        ) recent
    ) AS recent_performances
FROM songs s
JOIN mv_song_statistics ms ON ms.song_id = s.id
WHERE s.slug = 'two-step';

-- Song history (all performances, paginated)
SELECT
    c.id AS concert_id,
    c.show_date,
    c.slug AS concert_slug,
    v.name AS venue_name,
    v.city,
    v.state_province,
    se.set_number,
    se.position,
    se.is_opener,
    se.is_closer,
    se.is_bustout,
    se.shows_since_last_played AS gap,
    se.notes
FROM setlist_entries se
JOIN concerts c ON c.id = se.concert_id
JOIN venues v ON v.id = c.venue_id
WHERE se.song_id = (SELECT id FROM songs WHERE slug = 'two-step')
ORDER BY c.show_date DESC
LIMIT 50 OFFSET 0;

-- Songs played with a specific song (co-occurrences)
SELECT
    s.id,
    s.title,
    s.slug,
    mp.co_occurrence_count,
    ROUND(mp.co_occurrence_count::DECIMAL / ss.times_played * 100, 1) AS percentage
FROM mv_song_pairs mp
JOIN songs s ON s.id = mp.song_b_id
JOIN mv_song_statistics ss ON ss.song_id = mp.song_a_id
WHERE mp.song_a_id = (SELECT id FROM songs WHERE slug = 'two-step')
ORDER BY mp.co_occurrence_count DESC
LIMIT 20;

-- Bustouts (songs with longest gaps)
SELECT
    s.title,
    s.slug,
    c.show_date,
    c.slug AS concert_slug,
    v.name AS venue_name,
    se.shows_since_last_played AS gap
FROM setlist_entries se
JOIN songs s ON s.id = se.song_id
JOIN concerts c ON c.id = se.concert_id
JOIN venues v ON v.id = c.venue_id
WHERE se.is_bustout = TRUE
  AND c.show_date >= '2020-01-01'
ORDER BY se.shows_since_last_played DESC
LIMIT 50;

-- ============================================================================
-- VENUE QUERIES
-- ============================================================================

-- Venue detail with all shows
SELECT
    v.*,
    vs.total_shows,
    vs.first_show,
    vs.last_show,
    vs.unique_songs_played,
    vs.unique_guests,
    -- All shows at venue
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'date', c.show_date,
                'slug', c.slug,
                'tour', c.tour_name,
                'song_count', c.song_count
            ) ORDER BY c.show_date DESC
        )
        FROM concerts c
        WHERE c.venue_id = v.id
    ) AS shows
FROM venues v
JOIN mv_venue_statistics vs ON vs.venue_id = v.id
WHERE v.slug = 'red-rocks-amphitheatre';

-- Venues near location (for map view)
SELECT
    v.id,
    v.name,
    v.city,
    v.state_province,
    v.latitude,
    v.longitude,
    v.total_shows,
    v.venue_type,
    ROUND((ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint(-104.9903, 39.6655), 4326)::geography
    ) / 1609.34)::DECIMAL, 1) AS distance_miles
FROM venues v
WHERE ST_DWithin(
    v.location,
    ST_SetSRID(ST_MakePoint(-104.9903, 39.6655), 4326)::geography,
    500 * 1609.34  -- 500 miles in meters
)
ORDER BY distance_miles
LIMIT 100;

-- Top venues by show count
SELECT
    v.id,
    v.name,
    v.city,
    v.state_province,
    v.slug,
    vs.total_shows,
    vs.first_show,
    vs.last_show
FROM venues v
JOIN mv_venue_statistics vs ON vs.venue_id = v.id
ORDER BY vs.total_shows DESC
LIMIT 25;

-- ============================================================================
-- SEARCH QUERIES
-- ============================================================================

-- Fuzzy song search (typeahead)
SELECT
    id,
    title,
    slug,
    times_played,
    similarity(title_normalized, 'crash') AS sim_score
FROM songs
WHERE title_normalized % 'crash'  -- Trigram similarity
   OR title_normalized ILIKE '%crash%'
ORDER BY
    title_normalized = 'crash' DESC,  -- Exact match first
    sim_score DESC,
    times_played DESC
LIMIT 10;

-- Full-text search across entities
WITH search_results AS (
    -- Songs
    SELECT
        'song' AS entity_type,
        id,
        title AS name,
        slug,
        ts_rank(search_vector, query) AS rank
    FROM songs, plainto_tsquery('english', 'two step') query
    WHERE search_vector @@ query

    UNION ALL

    -- Venues
    SELECT
        'venue' AS entity_type,
        id,
        name,
        slug,
        ts_rank(search_vector, query) AS rank
    FROM venues, plainto_tsquery('english', 'red rocks') query
    WHERE search_vector @@ query

    UNION ALL

    -- Guests
    SELECT
        'guest' AS entity_type,
        id,
        name,
        slug,
        ts_rank(search_vector, query) AS rank
    FROM guests, plainto_tsquery('english', 'bela fleck') query
    WHERE search_vector @@ query
)
SELECT * FROM search_results
ORDER BY rank DESC
LIMIT 20;

-- Combined fuzzy + full-text search
CREATE OR REPLACE FUNCTION unified_search(
    search_term TEXT,
    max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
    entity_type TEXT,
    entity_id INTEGER,
    name TEXT,
    slug TEXT,
    score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH normalized_term AS (
        SELECT LOWER(TRIM(search_term)) AS term
    ),
    song_matches AS (
        SELECT
            'song'::TEXT,
            s.id,
            s.title,
            s.slug,
            GREATEST(
                similarity(s.title_normalized, nt.term),
                ts_rank(s.search_vector, plainto_tsquery('english', search_term))
            ) AS match_score
        FROM songs s, normalized_term nt
        WHERE s.title_normalized % nt.term
           OR s.search_vector @@ plainto_tsquery('english', search_term)
    ),
    venue_matches AS (
        SELECT
            'venue'::TEXT,
            v.id,
            v.name,
            v.slug,
            GREATEST(
                similarity(v.name_normalized, nt.term),
                ts_rank(v.search_vector, plainto_tsquery('english', search_term))
            ) AS match_score
        FROM venues v, normalized_term nt
        WHERE v.name_normalized % nt.term
           OR v.search_vector @@ plainto_tsquery('english', search_term)
    ),
    guest_matches AS (
        SELECT
            'guest'::TEXT,
            g.id,
            g.name,
            g.slug,
            GREATEST(
                similarity(g.name_normalized, nt.term),
                ts_rank(g.search_vector, plainto_tsquery('english', search_term))
            ) AS match_score
        FROM guests g, normalized_term nt
        WHERE g.name_normalized % nt.term
           OR g.search_vector @@ plainto_tsquery('english', search_term)
    ),
    all_matches AS (
        SELECT * FROM song_matches
        UNION ALL
        SELECT * FROM venue_matches
        UNION ALL
        SELECT * FROM guest_matches
    )
    SELECT * FROM all_matches
    ORDER BY match_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STATISTICS QUERIES
-- ============================================================================

-- Dashboard statistics
SELECT
    (SELECT COUNT(*) FROM concerts) AS total_concerts,
    (SELECT COUNT(*) FROM songs) AS total_songs,
    (SELECT COUNT(*) FROM venues) AS total_venues,
    (SELECT COUNT(*) FROM guests) AS total_guests,
    (SELECT COUNT(*) FROM setlist_entries) AS total_setlist_entries,
    (SELECT MIN(show_date) FROM concerts) AS first_show,
    (SELECT MAX(show_date) FROM concerts) AS last_show;

-- Year over year comparison
SELECT
    year,
    total_shows,
    unique_songs,
    avg_songs_per_show,
    LAG(total_shows) OVER (ORDER BY year) AS prev_year_shows,
    total_shows - LAG(total_shows) OVER (ORDER BY year) AS show_change
FROM mv_yearly_statistics
WHERE year >= 2010
ORDER BY year DESC;

-- Most played songs by year
SELECT
    EXTRACT(YEAR FROM c.show_date)::INTEGER AS year,
    s.title,
    s.slug,
    COUNT(*) AS times_played
FROM setlist_entries se
JOIN songs s ON s.id = se.song_id
JOIN concerts c ON c.id = se.concert_id
WHERE EXTRACT(YEAR FROM c.show_date) = 2023
GROUP BY EXTRACT(YEAR FROM c.show_date), s.id, s.title, s.slug
ORDER BY times_played DESC
LIMIT 20;

-- Song debut timeline
SELECT
    s.id,
    s.title,
    s.slug,
    s.first_played_date,
    c.slug AS debut_concert_slug,
    v.name AS debut_venue,
    v.city
FROM songs s
JOIN concerts c ON c.show_date = s.first_played_date
JOIN setlist_entries se ON se.concert_id = c.id AND se.song_id = s.id
JOIN venues v ON v.id = c.venue_id
WHERE s.first_played_date >= '2020-01-01'
ORDER BY s.first_played_date DESC;

-- ============================================================================
-- USER QUERIES
-- ============================================================================

-- User show history with statistics
SELECT
    u.username,
    u.shows_attended,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'concert_id', c.id,
                'date', c.show_date,
                'slug', c.slug,
                'venue', v.name,
                'city', v.city,
                'rating', uca.rating,
                'notes', uca.notes
            ) ORDER BY c.show_date DESC
        )
        FROM user_concert_attendance uca
        JOIN concerts c ON c.id = uca.concert_id
        JOIN venues v ON v.id = c.venue_id
        WHERE uca.user_id = u.id
    ) AS attended_shows,
    -- Songs they've seen
    (
        SELECT COUNT(DISTINCT se.song_id)
        FROM user_concert_attendance uca
        JOIN setlist_entries se ON se.concert_id = uca.concert_id
        WHERE uca.user_id = u.id
    ) AS unique_songs_seen,
    -- Venues visited
    (
        SELECT COUNT(DISTINCT c.venue_id)
        FROM user_concert_attendance uca
        JOIN concerts c ON c.id = uca.concert_id
        WHERE uca.user_id = u.id
    ) AS unique_venues_visited
FROM users u
WHERE u.username = 'dmbfan42';

-- Songs user hasn't seen (from their favorites)
SELECT
    s.id,
    s.title,
    s.slug,
    ufs.rank_order,
    s.times_played,
    s.last_played_date
FROM user_favorite_songs ufs
JOIN songs s ON s.id = ufs.song_id
LEFT JOIN (
    SELECT DISTINCT se.song_id
    FROM user_concert_attendance uca
    JOIN setlist_entries se ON se.concert_id = uca.concert_id
    WHERE uca.user_id = 123
) seen ON seen.song_id = s.id
WHERE ufs.user_id = 123
  AND seen.song_id IS NULL
ORDER BY ufs.rank_order;

-- ============================================================================
-- GUEST QUERIES
-- ============================================================================

-- Guest appearances with concert details
SELECT
    g.id,
    g.name,
    g.slug,
    COUNT(DISTINCT ga.concert_id) AS total_shows,
    COUNT(ga.id) AS total_song_appearances,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'concert_id', c.id,
                'date', c.show_date,
                'concert_slug', c.slug,
                'venue', v.name,
                'songs', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'title', s.title,
                            'instrument', ga2.instrument
                        )
                    )
                    FROM guest_appearances ga2
                    JOIN setlist_entries se ON se.id = ga2.setlist_entry_id
                    JOIN songs s ON s.id = se.song_id
                    WHERE ga2.concert_id = c.id AND ga2.guest_id = g.id
                )
            ) ORDER BY c.show_date DESC
        )
        FROM concerts c
        JOIN venues v ON v.id = c.venue_id
        WHERE c.id IN (SELECT DISTINCT concert_id FROM guest_appearances WHERE guest_id = g.id)
    ) AS appearances
FROM guests g
JOIN guest_appearances ga ON ga.guest_id = g.id
WHERE g.slug = 'bela-fleck'
GROUP BY g.id, g.name, g.slug;

-- ============================================================================
-- ALBUM QUERIES
-- ============================================================================

-- Album with tracks and source concerts
SELECT
    a.id,
    a.title,
    a.slug,
    a.release_date,
    a.album_type,
    a.cover_image_url,
    jsonb_agg(
        jsonb_build_object(
            'disc', at.disc_number,
            'track', at.track_number,
            'title', at.track_title,
            'duration', at.duration_seconds,
            'song_slug', s.slug,
            'source_concert', CASE
                WHEN c.id IS NOT NULL THEN jsonb_build_object(
                    'date', c.show_date,
                    'slug', c.slug,
                    'venue', v.name
                )
                ELSE NULL
            END
        ) ORDER BY at.disc_number, at.track_number
    ) AS tracks
FROM albums a
JOIN album_tracks at ON at.album_id = a.id
LEFT JOIN songs s ON s.id = at.song_id
LEFT JOIN concerts c ON c.id = at.source_concert_id
LEFT JOIN venues v ON v.id = c.venue_id
WHERE a.slug = 'live-at-red-rocks'
GROUP BY a.id;
