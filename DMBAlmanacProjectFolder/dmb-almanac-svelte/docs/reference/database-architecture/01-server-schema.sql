-- ============================================================================
-- DMBAlmanac PostgreSQL Server Schema
-- ============================================================================
-- Designed for: 3,700+ concerts, 40,000+ setlist entries, 1,200+ songs
-- Optimized for: Read-heavy workloads, geographic queries, full-text search
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "postgis";        -- Geographic queries
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- For exclusion constraints

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Songs: The foundation of all setlist data
-- ----------------------------------------------------------------------------
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,

    -- Core song information
    title VARCHAR(255) NOT NULL,
    title_normalized VARCHAR(255) NOT NULL,  -- Lowercase, no punctuation for search
    slug VARCHAR(255) UNIQUE NOT NULL,       -- URL-friendly identifier

    -- Song metadata
    original_artist VARCHAR(255),            -- NULL if DMB original
    is_cover BOOLEAN GENERATED ALWAYS AS (original_artist IS NOT NULL) STORED,
    is_original BOOLEAN GENERATED ALWAYS AS (original_artist IS NULL) STORED,

    -- Lyrics and notes
    lyrics TEXT,
    notes TEXT,

    -- Performance statistics (denormalized for read performance)
    times_played INTEGER DEFAULT 0 NOT NULL,
    first_played_date DATE,
    last_played_date DATE,
    debut_concert_id INTEGER,                -- References concerts(id)

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Search vector
    search_vector TSVECTOR,

    CONSTRAINT songs_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- Indexes for songs
CREATE INDEX idx_songs_title_trgm ON songs USING GIN (title_normalized gin_trgm_ops);
CREATE INDEX idx_songs_search_vector ON songs USING GIN (search_vector);
CREATE INDEX idx_songs_slug ON songs (slug);
CREATE INDEX idx_songs_times_played ON songs (times_played DESC);
CREATE INDEX idx_songs_is_cover ON songs (is_cover) WHERE is_cover = TRUE;
CREATE INDEX idx_songs_first_played ON songs (first_played_date);

-- Trigger to update search vector
CREATE OR REPLACE FUNCTION songs_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.original_artist, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER songs_search_vector_trigger
    BEFORE INSERT OR UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION songs_search_vector_update();

-- ----------------------------------------------------------------------------
-- Venues: Geographic locations of concerts
-- ----------------------------------------------------------------------------
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,

    -- Venue identification
    name VARCHAR(255) NOT NULL,
    name_normalized VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,

    -- Location details
    city VARCHAR(255) NOT NULL,
    state_province VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'USA',

    -- Geographic coordinates (PostGIS)
    location GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    -- Venue metadata
    capacity INTEGER,
    venue_type VARCHAR(50),  -- 'amphitheater', 'arena', 'stadium', 'club', 'festival'
    is_active BOOLEAN DEFAULT TRUE,

    -- Denormalized statistics
    total_shows INTEGER DEFAULT 0 NOT NULL,
    first_show_date DATE,
    last_show_date DATE,

    -- Additional info
    notes TEXT,
    website_url VARCHAR(500),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Search vector
    search_vector TSVECTOR
);

-- Indexes for venues
CREATE INDEX idx_venues_location ON venues USING GIST (location);
CREATE INDEX idx_venues_name_trgm ON venues USING GIN (name_normalized gin_trgm_ops);
CREATE INDEX idx_venues_city_trgm ON venues USING GIN (city gin_trgm_ops);
CREATE INDEX idx_venues_search_vector ON venues USING GIN (search_vector);
CREATE INDEX idx_venues_slug ON venues (slug);
CREATE INDEX idx_venues_country_state ON venues (country, state_province);
CREATE INDEX idx_venues_total_shows ON venues (total_shows DESC);
CREATE INDEX idx_venues_type ON venues (venue_type);

-- Trigger to update search vector and geography
CREATE OR REPLACE FUNCTION venues_update_trigger() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.state_province, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.country, '')), 'C');

    -- Update PostGIS geography from lat/lng
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_update_trigger
    BEFORE INSERT OR UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION venues_update_trigger();

-- ----------------------------------------------------------------------------
-- Concerts: The main event entity
-- ----------------------------------------------------------------------------
CREATE TABLE concerts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,

    -- Concert identification
    show_date DATE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,  -- e.g., "1996-12-31-hampton-coliseum"

    -- Venue relationship
    venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,

    -- Concert metadata
    show_number INTEGER,                 -- Show # in sequence (e.g., #2345)
    tour_name VARCHAR(255),

    -- Show details
    show_type VARCHAR(50) DEFAULT 'regular',  -- 'regular', 'festival', 'benefit', 'private'
    is_soundcheck BOOLEAN DEFAULT FALSE,

    -- Set structure
    set_count INTEGER DEFAULT 2,
    has_encore BOOLEAN DEFAULT TRUE,

    -- Denormalized statistics (updated via trigger)
    song_count INTEGER DEFAULT 0,
    unique_song_count INTEGER DEFAULT 0,
    total_duration_seconds INTEGER,

    -- Notes and additional info
    notes TEXT,
    weather VARCHAR(255),

    -- Media links (denormalized for quick access)
    has_audio BOOLEAN DEFAULT FALSE,
    has_video BOOLEAN DEFAULT FALSE,
    has_setlist_image BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure unique show per date/venue (allows multi-night runs)
    CONSTRAINT concerts_date_venue_unique UNIQUE (show_date, venue_id)
);

-- Indexes for concerts
CREATE INDEX idx_concerts_show_date ON concerts (show_date DESC);
CREATE INDEX idx_concerts_venue_id ON concerts (venue_id);
CREATE INDEX idx_concerts_year ON concerts (EXTRACT(YEAR FROM show_date));
CREATE INDEX idx_concerts_tour ON concerts (tour_name);
CREATE INDEX idx_concerts_show_type ON concerts (show_type);
CREATE INDEX idx_concerts_slug ON concerts (slug);

-- Composite indexes for common query patterns
CREATE INDEX idx_concerts_venue_date ON concerts (venue_id, show_date DESC);
CREATE INDEX idx_concerts_year_month ON concerts (
    EXTRACT(YEAR FROM show_date),
    EXTRACT(MONTH FROM show_date)
);

-- Partial index for shows with recordings
CREATE INDEX idx_concerts_has_audio ON concerts (show_date DESC)
    WHERE has_audio = TRUE;

-- ----------------------------------------------------------------------------
-- Setlist Entries: Songs performed at concerts
-- ----------------------------------------------------------------------------
CREATE TABLE setlist_entries (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,

    -- Relationships
    concert_id INTEGER NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE RESTRICT,

    -- Position in setlist
    set_number INTEGER NOT NULL,         -- 0=soundcheck, 1=set1, 2=set2, 3=encore
    position INTEGER NOT NULL,           -- Position within set

    -- Performance details
    is_opener BOOLEAN DEFAULT FALSE,
    is_closer BOOLEAN DEFAULT FALSE,
    is_segue_from_previous BOOLEAN DEFAULT FALSE,  -- ">" notation
    is_tease BOOLEAN DEFAULT FALSE,
    is_jam BOOLEAN DEFAULT FALSE,
    is_acoustic BOOLEAN DEFAULT FALSE,
    is_bustout BOOLEAN DEFAULT FALSE,    -- Long gap since last play

    -- Duration
    duration_seconds INTEGER,

    -- Notes about this specific performance
    notes TEXT,

    -- Gap tracking (denormalized)
    shows_since_last_played INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT setlist_entries_set_range CHECK (set_number BETWEEN 0 AND 5),
    CONSTRAINT setlist_entries_position_positive CHECK (position > 0),
    CONSTRAINT setlist_entries_unique_position UNIQUE (concert_id, set_number, position)
);

-- Indexes for setlist_entries
CREATE INDEX idx_setlist_concert ON setlist_entries (concert_id);
CREATE INDEX idx_setlist_song ON setlist_entries (song_id);
CREATE INDEX idx_setlist_concert_position ON setlist_entries (concert_id, set_number, position);
CREATE INDEX idx_setlist_song_bustout ON setlist_entries (song_id) WHERE is_bustout = TRUE;
CREATE INDEX idx_setlist_is_opener ON setlist_entries (concert_id) WHERE is_opener = TRUE;
CREATE INDEX idx_setlist_is_closer ON setlist_entries (concert_id) WHERE is_closer = TRUE;

-- Composite index for song history queries
CREATE INDEX idx_setlist_song_concert ON setlist_entries (song_id, concert_id);

-- ----------------------------------------------------------------------------
-- Guest Musicians
-- ----------------------------------------------------------------------------
CREATE TABLE guests (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,

    -- Guest identification
    name VARCHAR(255) NOT NULL,
    name_normalized VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,

    -- Guest details
    instrument VARCHAR(255),             -- Primary instrument
    bio TEXT,

    -- Denormalized statistics
    total_appearances INTEGER DEFAULT 0,
    first_appearance_date DATE,
    last_appearance_date DATE,

    -- Search vector
    search_vector TSVECTOR,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_guests_name_trgm ON guests USING GIN (name_normalized gin_trgm_ops);
CREATE INDEX idx_guests_search_vector ON guests USING GIN (search_vector);
CREATE INDEX idx_guests_slug ON guests (slug);

-- ----------------------------------------------------------------------------
-- Guest Appearances (Many-to-Many: Setlist Entries <-> Guests)
-- ----------------------------------------------------------------------------
CREATE TABLE guest_appearances (
    id SERIAL PRIMARY KEY,

    -- Can appear on specific song or entire concert
    setlist_entry_id INTEGER REFERENCES setlist_entries(id) ON DELETE CASCADE,
    concert_id INTEGER NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
    guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,

    -- Appearance details
    instrument VARCHAR(255),             -- What they played this time
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Either setlist_entry_id or just concert_id (for general appearances)
    CONSTRAINT guest_appearances_unique UNIQUE (setlist_entry_id, guest_id),
    CONSTRAINT guest_appearances_concert_guest UNIQUE (concert_id, guest_id, setlist_entry_id)
);

CREATE INDEX idx_guest_appearances_concert ON guest_appearances (concert_id);
CREATE INDEX idx_guest_appearances_guest ON guest_appearances (guest_id);
CREATE INDEX idx_guest_appearances_setlist ON guest_appearances (setlist_entry_id);

-- ============================================================================
-- ALBUMS AND TRACKS
-- ============================================================================

CREATE TABLE albums (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,

    -- Album identification
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,

    -- Album metadata
    release_date DATE,
    album_type VARCHAR(50),  -- 'studio', 'live', 'compilation', 'ep'
    label VARCHAR(255),

    -- Media
    cover_image_url VARCHAR(500),

    -- Track count (denormalized)
    track_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_albums_release_date ON albums (release_date);
CREATE INDEX idx_albums_type ON albums (album_type);
CREATE INDEX idx_albums_slug ON albums (slug);

CREATE TABLE album_tracks (
    id SERIAL PRIMARY KEY,

    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL,  -- May not be in songs table

    -- Track info
    disc_number INTEGER DEFAULT 1,
    track_number INTEGER NOT NULL,
    track_title VARCHAR(255) NOT NULL,  -- May differ from song.title

    -- Duration
    duration_seconds INTEGER,

    -- For live albums, link to source concert
    source_concert_id INTEGER REFERENCES concerts(id) ON DELETE SET NULL,

    CONSTRAINT album_tracks_unique UNIQUE (album_id, disc_number, track_number)
);

CREATE INDEX idx_album_tracks_album ON album_tracks (album_id);
CREATE INDEX idx_album_tracks_song ON album_tracks (song_id);

-- ============================================================================
-- USER-GENERATED CONTENT
-- ============================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,

    -- Authentication (integrate with your auth system)
    external_auth_id VARCHAR(255) UNIQUE,  -- Auth0, Firebase, etc.
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,

    -- Profile
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    bio TEXT,

    -- Location (for nearby shows)
    home_location GEOGRAPHY(POINT, 4326),
    home_city VARCHAR(255),
    home_state VARCHAR(100),

    -- Stats (denormalized)
    shows_attended INTEGER DEFAULT 0,
    favorite_songs_count INTEGER DEFAULT 0,

    -- Preferences
    preferences JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_active_at TIMESTAMPTZ
);

CREATE INDEX idx_users_external_auth ON users (external_auth_id);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_home_location ON users USING GIST (home_location);

-- ----------------------------------------------------------------------------
-- Concert Attendance Tracking
-- ----------------------------------------------------------------------------
CREATE TABLE user_concert_attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concert_id INTEGER NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,

    -- Attendance details
    attended BOOLEAN DEFAULT TRUE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),

    -- User notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT user_concert_attendance_unique UNIQUE (user_id, concert_id)
);

CREATE INDEX idx_user_attendance_user ON user_concert_attendance (user_id);
CREATE INDEX idx_user_attendance_concert ON user_concert_attendance (concert_id);
CREATE INDEX idx_user_attendance_rating ON user_concert_attendance (rating DESC);

-- ----------------------------------------------------------------------------
-- Favorite Songs
-- ----------------------------------------------------------------------------
CREATE TABLE user_favorite_songs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

    -- Ranking/notes
    rank_order INTEGER,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT user_favorite_songs_unique UNIQUE (user_id, song_id)
);

CREATE INDEX idx_user_favorites_user ON user_favorite_songs (user_id);
CREATE INDEX idx_user_favorites_song ON user_favorite_songs (song_id);

-- ----------------------------------------------------------------------------
-- User Want-to-Hear List (songs they hope to see live)
-- ----------------------------------------------------------------------------
CREATE TABLE user_want_to_hear (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

    priority INTEGER DEFAULT 1,  -- 1=high, 2=medium, 3=low
    notes TEXT,

    -- Track if they've seen it
    seen_at_concert_id INTEGER REFERENCES concerts(id) ON DELETE SET NULL,
    seen_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT user_want_to_hear_unique UNIQUE (user_id, song_id)
);

CREATE INDEX idx_user_want_user ON user_want_to_hear (user_id);
CREATE INDEX idx_user_want_song ON user_want_to_hear (song_id);

-- ============================================================================
-- MATERIALIZED VIEWS FOR STATISTICS
-- ============================================================================

-- Song statistics (updated periodically or via trigger)
CREATE MATERIALIZED VIEW mv_song_statistics AS
SELECT
    s.id AS song_id,
    s.title,
    s.slug,
    COUNT(DISTINCT se.concert_id) AS times_played,
    MIN(c.show_date) AS first_played,
    MAX(c.show_date) AS last_played,
    COUNT(DISTINCT c.venue_id) AS unique_venues,
    COUNT(DISTINCT EXTRACT(YEAR FROM c.show_date)) AS years_played,

    -- Position statistics
    COUNT(*) FILTER (WHERE se.is_opener) AS times_opened,
    COUNT(*) FILTER (WHERE se.is_closer) AS times_closed,
    COUNT(*) FILTER (WHERE se.set_number = 3) AS times_in_encore,

    -- Average position in set
    AVG(se.position) AS avg_position,

    -- Bustout info
    COUNT(*) FILTER (WHERE se.is_bustout) AS bustout_count,
    MAX(se.shows_since_last_played) AS max_gap,

    -- Duration stats (if available)
    AVG(se.duration_seconds) AS avg_duration_seconds,
    MAX(se.duration_seconds) AS max_duration_seconds
FROM songs s
LEFT JOIN setlist_entries se ON se.song_id = s.id
LEFT JOIN concerts c ON c.id = se.concert_id
GROUP BY s.id, s.title, s.slug;

CREATE UNIQUE INDEX idx_mv_song_stats_id ON mv_song_statistics (song_id);
CREATE INDEX idx_mv_song_stats_times ON mv_song_statistics (times_played DESC);

-- Venue statistics
CREATE MATERIALIZED VIEW mv_venue_statistics AS
SELECT
    v.id AS venue_id,
    v.name,
    v.city,
    v.state_province,
    v.slug,
    COUNT(DISTINCT c.id) AS total_shows,
    MIN(c.show_date) AS first_show,
    MAX(c.show_date) AS last_show,
    COUNT(DISTINCT se.song_id) AS unique_songs_played,
    COUNT(DISTINCT ga.guest_id) AS unique_guests
FROM venues v
LEFT JOIN concerts c ON c.venue_id = v.id
LEFT JOIN setlist_entries se ON se.concert_id = c.id
LEFT JOIN guest_appearances ga ON ga.concert_id = c.id
GROUP BY v.id, v.name, v.city, v.state_province, v.slug;

CREATE UNIQUE INDEX idx_mv_venue_stats_id ON mv_venue_statistics (venue_id);
CREATE INDEX idx_mv_venue_stats_shows ON mv_venue_statistics (total_shows DESC);

-- Year-by-year statistics
CREATE MATERIALIZED VIEW mv_yearly_statistics AS
SELECT
    EXTRACT(YEAR FROM c.show_date)::INTEGER AS year,
    COUNT(DISTINCT c.id) AS total_shows,
    COUNT(DISTINCT c.venue_id) AS unique_venues,
    COUNT(DISTINCT se.song_id) AS unique_songs,
    COUNT(se.id) AS total_songs_played,
    ROUND(COUNT(se.id)::DECIMAL / NULLIF(COUNT(DISTINCT c.id), 0), 1) AS avg_songs_per_show,
    COUNT(DISTINCT ga.guest_id) AS unique_guests
FROM concerts c
LEFT JOIN setlist_entries se ON se.concert_id = c.id
LEFT JOIN guest_appearances ga ON ga.concert_id = c.id
GROUP BY EXTRACT(YEAR FROM c.show_date)
ORDER BY year;

CREATE UNIQUE INDEX idx_mv_yearly_stats_year ON mv_yearly_statistics (year);

-- Song pair co-occurrences (for "also played with" feature)
CREATE MATERIALIZED VIEW mv_song_pairs AS
WITH song_concerts AS (
    SELECT song_id, concert_id FROM setlist_entries
)
SELECT
    a.song_id AS song_a_id,
    b.song_id AS song_b_id,
    COUNT(*) AS co_occurrence_count
FROM song_concerts a
JOIN song_concerts b ON a.concert_id = b.concert_id AND a.song_id < b.song_id
GROUP BY a.song_id, b.song_id
HAVING COUNT(*) >= 5  -- Only pairs that appeared together 5+ times
ORDER BY co_occurrence_count DESC;

CREATE INDEX idx_mv_song_pairs_a ON mv_song_pairs (song_a_id);
CREATE INDEX idx_mv_song_pairs_b ON mv_song_pairs (song_b_id);
CREATE INDEX idx_mv_song_pairs_count ON mv_song_pairs (co_occurrence_count DESC);

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_statistics_views() RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_song_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_venue_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_yearly_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_song_pairs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER FUNCTIONS FOR DENORMALIZED DATA
-- ============================================================================

-- Update song statistics when setlist entries change
CREATE OR REPLACE FUNCTION update_song_stats() RETURNS TRIGGER AS $$
DECLARE
    affected_song_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_song_id := OLD.song_id;
    ELSE
        affected_song_id := NEW.song_id;
    END IF;

    UPDATE songs SET
        times_played = (
            SELECT COUNT(DISTINCT concert_id)
            FROM setlist_entries
            WHERE song_id = affected_song_id
        ),
        first_played_date = (
            SELECT MIN(c.show_date)
            FROM setlist_entries se
            JOIN concerts c ON c.id = se.concert_id
            WHERE se.song_id = affected_song_id
        ),
        last_played_date = (
            SELECT MAX(c.show_date)
            FROM setlist_entries se
            JOIN concerts c ON c.id = se.concert_id
            WHERE se.song_id = affected_song_id
        ),
        updated_at = NOW()
    WHERE id = affected_song_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER setlist_song_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON setlist_entries
    FOR EACH ROW EXECUTE FUNCTION update_song_stats();

-- Update venue statistics when concerts change
CREATE OR REPLACE FUNCTION update_venue_stats() RETURNS TRIGGER AS $$
DECLARE
    affected_venue_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_venue_id := OLD.venue_id;
    ELSE
        affected_venue_id := NEW.venue_id;
    END IF;

    UPDATE venues SET
        total_shows = (
            SELECT COUNT(*) FROM concerts WHERE venue_id = affected_venue_id
        ),
        first_show_date = (
            SELECT MIN(show_date) FROM concerts WHERE venue_id = affected_venue_id
        ),
        last_show_date = (
            SELECT MAX(show_date) FROM concerts WHERE venue_id = affected_venue_id
        ),
        updated_at = NOW()
    WHERE id = affected_venue_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER concert_venue_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON concerts
    FOR EACH ROW EXECUTE FUNCTION update_venue_stats();

-- Update concert song counts
CREATE OR REPLACE FUNCTION update_concert_stats() RETURNS TRIGGER AS $$
DECLARE
    affected_concert_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_concert_id := OLD.concert_id;
    ELSE
        affected_concert_id := NEW.concert_id;
    END IF;

    UPDATE concerts SET
        song_count = (
            SELECT COUNT(*) FROM setlist_entries WHERE concert_id = affected_concert_id
        ),
        unique_song_count = (
            SELECT COUNT(DISTINCT song_id) FROM setlist_entries WHERE concert_id = affected_concert_id
        ),
        updated_at = NOW()
    WHERE id = affected_concert_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER setlist_concert_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON setlist_entries
    FOR EACH ROW EXECUTE FUNCTION update_concert_stats();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate gap (shows since last played) for a song
CREATE OR REPLACE FUNCTION calculate_song_gap(
    p_song_id INTEGER,
    p_concert_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    current_show_date DATE;
    last_played_show_number INTEGER;
    current_show_number INTEGER;
BEGIN
    SELECT show_date INTO current_show_date
    FROM concerts WHERE id = p_concert_id;

    SELECT c.id INTO last_played_show_number
    FROM setlist_entries se
    JOIN concerts c ON c.id = se.concert_id
    WHERE se.song_id = p_song_id
      AND c.show_date < current_show_date
    ORDER BY c.show_date DESC
    LIMIT 1;

    IF last_played_show_number IS NULL THEN
        RETURN NULL;  -- Song debut
    END IF;

    SELECT COUNT(*) INTO current_show_number
    FROM concerts
    WHERE show_date > (SELECT show_date FROM concerts WHERE id = last_played_show_number)
      AND show_date <= current_show_date;

    RETURN current_show_number;
END;
$$ LANGUAGE plpgsql;

-- Find shows near a location
CREATE OR REPLACE FUNCTION find_nearby_venues(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_miles INTEGER DEFAULT 100
) RETURNS TABLE (
    venue_id INTEGER,
    name VARCHAR,
    city VARCHAR,
    distance_miles DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.id,
        v.name,
        v.city,
        ROUND((ST_Distance(
            v.location,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
        ) / 1609.34)::DECIMAL, 1) AS distance_miles
    FROM venues v
    WHERE ST_DWithin(
        v.location,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        p_radius_miles * 1609.34  -- Convert miles to meters
    )
    ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;
