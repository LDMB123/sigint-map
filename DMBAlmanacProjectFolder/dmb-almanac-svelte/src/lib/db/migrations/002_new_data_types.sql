-- ============================================================================
-- DMB Almanac Database Design Document
-- Migration: New Data Types from Scraper
-- Date: 2026-01-15
-- ============================================================================
--
-- ANALYSIS OF SCRAPED DATA TYPES
-- ============================================================================
--
-- This document analyzes each new data type from /scraper/src/types.ts and
-- recommends whether it needs a database table or can be computed on demand.
--
-- ============================================================================
-- 1. SongStatistics
-- ============================================================================
--
-- RECOMMENDATION: STORE IN DATABASE (denormalized song_statistics table)
--
-- RATIONALE:
-- - Contains complex aggregations (slot breakdowns, version types, segue counts)
-- - Would be expensive to compute on demand for every song detail page
-- - Scraper already computes this data from dmbalmanac.com
-- - Data changes infrequently (only after new shows are added)
--
-- The SongStatistics type includes:
--   - slotBreakdown: opener, set1Closer, set2Opener, closer, midset, encore counts
--   - versionTypes: full, tease, partial, reprise, fake, aborted counts
--   - Duration stats: avg length, longest/shortest versions with show references
--   - Segue information: top songs that segue into/from this song
--   - Release counts by type
--   - Plays by year breakdown
--   - Artist stats (DMB vs Dave & Tim breakdown)
--   - Liberation history
--   - Current gap (days and shows since last played)
--
-- Much of this data COULD be computed from existing tables, but:
--   1. Some fields (version types, liberation history) would require complex logic
--   2. Aggregating segues across thousands of setlist entries is expensive
--   3. Artist-specific stats require configuration data we don't have
--
-- DECISION: Create a denormalized song_statistics table for pre-computed stats

CREATE TABLE IF NOT EXISTS song_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE UNIQUE,

  -- Slot breakdown (can be computed but cached here)
  slot_opener INTEGER DEFAULT 0,
  slot_set1_closer INTEGER DEFAULT 0,
  slot_set2_opener INTEGER DEFAULT 0,
  slot_closer INTEGER DEFAULT 0,
  slot_midset INTEGER DEFAULT 0,
  slot_encore INTEGER DEFAULT 0,
  slot_encore2 INTEGER DEFAULT 0,

  -- Version types (not currently tracked in setlist_entries)
  version_full INTEGER DEFAULT 0,
  version_tease INTEGER DEFAULT 0,
  version_partial INTEGER DEFAULT 0,
  version_reprise INTEGER DEFAULT 0,
  version_fake INTEGER DEFAULT 0,
  version_aborted INTEGER DEFAULT 0,

  -- Duration stats
  avg_duration_seconds INTEGER,
  longest_duration_seconds INTEGER,
  longest_show_id INTEGER REFERENCES shows(id),
  shortest_duration_seconds INTEGER,
  shortest_show_id INTEGER REFERENCES shows(id),

  -- Release counts (computed from release_tracks)
  release_count_total INTEGER DEFAULT 0,
  release_count_studio INTEGER DEFAULT 0,
  release_count_live INTEGER DEFAULT 0,
  release_count_dmblive INTEGER DEFAULT 0,
  release_count_warehouse INTEGER DEFAULT 0,
  release_count_livetrax INTEGER DEFAULT 0,
  release_count_broadcasts INTEGER DEFAULT 0,

  -- Current gap
  current_gap_days INTEGER,
  current_gap_shows INTEGER,

  -- JSON fields for complex nested data
  plays_by_year TEXT,          -- JSON: [{"year": 2024, "plays": 15}, ...]
  artist_stats TEXT,           -- JSON: [{"artistName": "DMB", "playCount": 100}, ...]
  top_segues_into TEXT,        -- JSON: [{"songId": 1, "songTitle": "...", "count": 5}, ...]
  top_segues_from TEXT,        -- JSON: [{"songId": 1, "songTitle": "...", "count": 5}, ...]

  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_song_stats_song ON song_statistics(song_id);
CREATE INDEX IF NOT EXISTS idx_song_stats_gap_days ON song_statistics(current_gap_days DESC);
CREATE INDEX IF NOT EXISTS idx_song_stats_gap_shows ON song_statistics(current_gap_shows DESC);

-- ============================================================================
-- 2. ScrapedLiberationEntry / LiberationOutput
-- ============================================================================
--
-- RECOMMENDATION: ENHANCE EXISTING liberation_list TABLE
--
-- RATIONALE:
-- - Liberation list table already exists in schema
-- - New type adds: configuration (full_band/dave_tim/dave_solo), isLiberated flag
-- - Can extend existing table with new columns
--
-- Current liberation_list columns:
--   song_id, last_played_date, last_played_show_id, days_since, shows_since, notes
--
-- New fields from ScrapedLiberationEntry:
--   configuration: "full_band" | "dave_tim" | "dave_solo"
--   isLiberated: boolean (was song recently played after long gap?)
--   liberatedDate, liberatedShowId: when/where liberation occurred

ALTER TABLE liberation_list ADD COLUMN configuration TEXT
  CHECK(configuration IN ('full_band', 'dave_tim', 'dave_solo'))
  DEFAULT 'full_band';

ALTER TABLE liberation_list ADD COLUMN is_liberated INTEGER DEFAULT 0;

ALTER TABLE liberation_list ADD COLUMN liberated_date TEXT;

ALTER TABLE liberation_list ADD COLUMN liberated_show_id INTEGER REFERENCES shows(id);

-- Index for filtering by configuration
CREATE INDEX IF NOT EXISTS idx_liberation_config ON liberation_list(configuration);

-- ============================================================================
-- 3. ScrapedShowRarity / ScrapedTourRarity / RarityOutput
-- ============================================================================
--
-- RECOMMENDATION: NO NEW TABLE NEEDED - Use existing columns + view
--
-- RATIONALE:
-- - shows.rarity_index already exists
-- - tours.rarity_index already exists
-- - ScrapedShowRarity just contains show data + rarity_index (already have this)
-- - ScrapedTourRarity adds: differentSongsPlayed, catalogPercentage, rank
--   - differentSongsPlayed = tours.unique_songs_played (exists)
--   - catalogPercentage can be computed: unique_songs / total_songs * 100
--   - rank can be computed with window function
--
-- DECISION: Add catalog_percentage column to tours, create view for rankings

ALTER TABLE tours ADD COLUMN catalog_percentage REAL;

-- View to rank tours by rarity
CREATE VIEW IF NOT EXISTS tour_rarity_rankings AS
SELECT
  t.*,
  RANK() OVER (ORDER BY t.rarity_index DESC) as rarity_rank,
  (SELECT COUNT(*) FROM songs) as total_catalog_songs
FROM tours t
WHERE t.rarity_index IS NOT NULL
ORDER BY t.rarity_index DESC;

-- ============================================================================
-- 4. ScrapedList / ScrapedListItem / ListsOutput (Curated Lists)
-- ============================================================================
--
-- RECOMMENDATION: CREATE NEW TABLES (curated_lists, curated_list_items)
--
-- RATIONALE:
-- - This is entirely new functionality - curated editorial content
-- - Lists like "Top 50 Shows", "Best Warehouse Versions", etc.
-- - Not computable from existing data - requires human curation
-- - Flexible itemType allows linking to shows, songs, venues, guests, releases
-- - metadata field allows arbitrary key-value pairs per item
--
-- DECISION: Create normalized tables for lists and list items

CREATE TABLE IF NOT EXISTS curated_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_id TEXT UNIQUE,                  -- ID from dmbalmanac (lid=)
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,                   -- 'Songs', 'Shows', 'Venues', etc.
  description TEXT,
  item_count INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,            -- For homepage display
  sort_order INTEGER DEFAULT 0,             -- For manual ordering
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_curated_lists_slug ON curated_lists(slug);
CREATE INDEX IF NOT EXISTS idx_curated_lists_category ON curated_lists(category);
CREATE INDEX IF NOT EXISTS idx_curated_lists_featured ON curated_lists(is_featured) WHERE is_featured = 1;

CREATE TABLE IF NOT EXISTS curated_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL REFERENCES curated_lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,                -- Order in list
  item_type TEXT NOT NULL CHECK(item_type IN ('show', 'song', 'venue', 'guest', 'release', 'text')),

  -- Foreign keys (only one should be set based on item_type)
  show_id INTEGER REFERENCES shows(id) ON DELETE SET NULL,
  song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL,
  venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
  release_id INTEGER REFERENCES releases(id) ON DELETE SET NULL,

  -- For text-only items or when FK doesn't exist
  item_title TEXT NOT NULL,
  item_link TEXT,                           -- Original URL from dmbalmanac

  notes TEXT,                               -- Editorial notes/context
  metadata TEXT,                            -- JSON for additional key-value data

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique positions within a list
  UNIQUE(list_id, position)
);

CREATE INDEX IF NOT EXISTS idx_list_items_list ON curated_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_type ON curated_list_items(item_type);
CREATE INDEX IF NOT EXISTS idx_list_items_show ON curated_list_items(show_id) WHERE show_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_list_items_song ON curated_list_items(song_id) WHERE song_id IS NOT NULL;

-- ============================================================================
-- 5. ScrapedVenueStats / VenueStatsOutput
-- ============================================================================
--
-- RECOMMENDATION: ENHANCE venues TABLE + CREATE venue_aliases TABLE
--
-- RATIONALE:
-- - Most fields already exist in venues table
-- - New useful fields: akaNames (aliases), topSongs, notablePerformances
-- - akaNames requires separate table (1:many relationship)
-- - topSongs can be computed from setlist_entries (no storage needed)
-- - notablePerformances is editorial - could store or compute
--
-- Current venues columns cover:
--   name, city, state, country, first_show_date, last_show_date,
--   total_shows, capacity, notes
--
-- New fields:
--   akaNames: Alternative venue names (e.g., "Cynthia Woods Mitchell Pavilion"
--             aka "Woodlands Pavilion" aka "The Pavilion at The Woodlands")
--   topSongs: Computed - most played songs at this venue
--   notablePerformances: Editorial highlights

CREATE TABLE IF NOT EXISTS venue_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  is_primary INTEGER DEFAULT 0,             -- Which name to display as primary
  years_used TEXT,                          -- JSON: [1998, 1999, 2000] years this name was used
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(venue_id, alias_name)
);

CREATE INDEX IF NOT EXISTS idx_venue_aliases_venue ON venue_aliases(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_aliases_name ON venue_aliases(alias_name);

-- Add notable_performances column to venues for editorial highlights
ALTER TABLE venues ADD COLUMN notable_performances TEXT; -- JSON array of show IDs or descriptions

-- View for top songs by venue (computed on demand)
CREATE VIEW IF NOT EXISTS venue_top_songs AS
SELECT
  v.id as venue_id,
  v.name as venue_name,
  s.id as song_id,
  s.title as song_title,
  COUNT(*) as play_count
FROM venues v
JOIN shows sh ON sh.venue_id = v.id
JOIN setlist_entries se ON se.show_id = sh.id
JOIN songs s ON s.id = se.song_id
GROUP BY v.id, s.id
ORDER BY v.id, play_count DESC;

-- ============================================================================
-- 6. HistoryDay / HistoryDayShow / HistoryOutput (This Day in History)
-- ============================================================================
--
-- RECOMMENDATION: NO TABLE NEEDED - COMPUTE ON DEMAND
--
-- RATIONALE:
-- - "This Day in History" shows all concerts on a given calendar date (MM-DD)
-- - This is a simple filter on the existing shows table
-- - Only accessed for one specific date at a time (today)
-- - Creating 366 cached entries would be wasteful
-- - Query is fast with proper index on shows.date
--
-- DECISION: Create optimized view and ensure proper index exists
--
-- The query pattern is:
--   SELECT * FROM shows WHERE strftime('%m-%d', date) = '01-15'
--
-- However, this function-based filter prevents index usage.
-- Better approach: Add month/day columns for efficient lookups.

ALTER TABLE shows ADD COLUMN date_month INTEGER; -- 1-12
ALTER TABLE shows ADD COLUMN date_day INTEGER;   -- 1-31

-- Index for "This Day in History" queries
CREATE INDEX IF NOT EXISTS idx_shows_month_day ON shows(date_month, date_day);

-- Trigger to auto-populate month/day on insert
CREATE TRIGGER IF NOT EXISTS shows_set_month_day_insert
AFTER INSERT ON shows
WHEN NEW.date_month IS NULL OR NEW.date_day IS NULL
BEGIN
  UPDATE shows
  SET date_month = CAST(strftime('%m', date) AS INTEGER),
      date_day = CAST(strftime('%d', date) AS INTEGER)
  WHERE id = NEW.id;
END;

-- Trigger to update month/day when date changes
CREATE TRIGGER IF NOT EXISTS shows_set_month_day_update
AFTER UPDATE OF date ON shows
BEGIN
  UPDATE shows
  SET date_month = CAST(strftime('%m', NEW.date) AS INTEGER),
      date_day = CAST(strftime('%d', NEW.date) AS INTEGER)
  WHERE id = NEW.id;
END;

-- Backfill existing shows
UPDATE shows
SET date_month = CAST(strftime('%m', date) AS INTEGER),
    date_day = CAST(strftime('%d', date) AS INTEGER)
WHERE date_month IS NULL OR date_day IS NULL;

-- View for "This Day in History" with all necessary joins
CREATE VIEW IF NOT EXISTS this_day_in_history AS
SELECT
  s.id,
  s.date,
  s.date_month,
  s.date_day,
  strftime('%Y', s.date) as year,
  v.id as venue_id,
  v.name as venue_name,
  v.city as venue_city,
  v.state as venue_state,
  v.country as venue_country,
  s.notes,
  s.song_count
FROM shows s
JOIN venues v ON s.venue_id = v.id;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
--
-- NEW TABLES CREATED:
-- 1. song_statistics - Denormalized song stats for performance
-- 2. curated_lists - Editorial lists/rankings
-- 3. curated_list_items - Items within curated lists
-- 4. venue_aliases - Alternative venue names (AKA)
--
-- EXISTING TABLES MODIFIED:
-- 1. liberation_list - Added configuration, is_liberated, liberated_date/show_id
-- 2. tours - Added catalog_percentage
-- 3. venues - Added notable_performances
-- 4. shows - Added date_month, date_day for efficient date queries
--
-- NEW VIEWS CREATED:
-- 1. tour_rarity_rankings - Tours ranked by rarity index
-- 2. venue_top_songs - Most played songs per venue
-- 3. this_day_in_history - Shows for a given calendar date
--
-- INDEXES CREATED:
-- 1. idx_song_stats_song, idx_song_stats_gap_days, idx_song_stats_gap_shows
-- 2. idx_liberation_config
-- 3. idx_curated_lists_slug, idx_curated_lists_category, idx_curated_lists_featured
-- 4. idx_list_items_list, idx_list_items_type, idx_list_items_show, idx_list_items_song
-- 5. idx_venue_aliases_venue, idx_venue_aliases_name
-- 6. idx_shows_month_day
--
-- ============================================================================
-- QUERY EXAMPLES
-- ============================================================================

-- Get song statistics for a song detail page
-- SELECT * FROM song_statistics WHERE song_id = ?;

-- Get "This Day in History" for January 15
-- SELECT * FROM this_day_in_history WHERE date_month = 1 AND date_day = 15 ORDER BY year DESC;

-- Get liberation list with configuration
-- SELECT ll.*, s.title, s.slug FROM liberation_list ll
-- JOIN songs s ON ll.song_id = s.id
-- WHERE ll.configuration = 'full_band'
-- ORDER BY ll.days_since DESC;

-- Get curated list with items
-- SELECT cl.*, cli.* FROM curated_lists cl
-- JOIN curated_list_items cli ON cli.list_id = cl.id
-- WHERE cl.slug = 'top-50-shows'
-- ORDER BY cli.position;

-- Get venue with all aliases
-- SELECT v.*, va.alias_name FROM venues v
-- LEFT JOIN venue_aliases va ON va.venue_id = v.id
-- WHERE v.id = ?;

-- Get top 5 songs at a venue
-- SELECT * FROM venue_top_songs WHERE venue_id = ? LIMIT 5;

-- Get tour rarity rankings
-- SELECT * FROM tour_rarity_rankings WHERE year >= 2020;
