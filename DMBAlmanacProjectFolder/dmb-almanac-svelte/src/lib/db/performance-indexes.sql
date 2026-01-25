-- Performance Optimization Indexes for DMB Almanac
-- These indexes improve query performance for common access patterns
-- Run this after initial schema setup

-- ==================== COMPOSITE INDEXES FOR PERFORMANCE ====================

-- Shows by tour and date (for tour detail pages)
-- Covers query: SELECT * FROM shows WHERE tour_id = ? ORDER BY date DESC
CREATE INDEX IF NOT EXISTS idx_shows_tour_date ON shows(tour_id, date DESC);

-- Setlist entries with set grouping (for setlist display)
-- Covers query: SELECT * FROM setlist_entries WHERE show_id = ? AND set_name = ? ORDER BY position
CREATE INDEX IF NOT EXISTS idx_setlist_show_set_pos ON setlist_entries(show_id, set_name, position);

-- Shows by venue and date (for venue detail pages)
-- Already exists as idx_shows_date_venue

-- Songs by last played date (for liberation list)
-- Already exists as idx_songs_last_played

-- ==================== COVERING INDEXES ====================

-- Covering index for recent shows query (includes all needed columns)
-- Avoids table lookup for show list pages
CREATE INDEX IF NOT EXISTS idx_shows_date_venue_tour ON shows(date DESC, venue_id, tour_id);

-- Covering index for setlist song lookup
CREATE INDEX IF NOT EXISTS idx_setlist_show_song ON setlist_entries(show_id, song_id, position);

-- ==================== PARTIAL INDEXES ====================

-- Index for rare shows only (rarity_index > 3)
CREATE INDEX IF NOT EXISTS idx_shows_rare ON shows(rarity_index DESC) WHERE rarity_index > 3;

-- Index for encore songs only
CREATE INDEX IF NOT EXISTS idx_setlist_encore ON setlist_entries(show_id, position) WHERE set_name LIKE 'encore%';

-- ==================== NEW OPTIMIZATIONS (2024) ====================

-- Index for tour stats query (getTourStatsByYear)
-- Covers: SELECT ... FROM shows s JOIN tours t WHERE t.year = ?
CREATE INDEX IF NOT EXISTS idx_tours_year_id ON tours(year, id);

-- Composite index for setlist year aggregations (getTopOpenersByYear, getTopClosersByYear)
-- Covers joins through shows -> tours filtered by slot
CREATE INDEX IF NOT EXISTS idx_setlist_song_slot ON setlist_entries(song_id, slot);

-- Index for guest appearances ordered by show date
-- Covers: getAppearancesByGuest ORDER BY s.date DESC
CREATE INDEX IF NOT EXISTS idx_appearances_guest_show ON guest_appearances(guest_id, show_id);

-- Composite index for venue shows lookup
CREATE INDEX IF NOT EXISTS idx_shows_venue_date ON shows(venue_id, date DESC);

-- ==================== FULL-TEXT SEARCH FOR VENUES ====================
-- FTS5 virtual table for venue search (similar to songs_fts)

CREATE VIRTUAL TABLE IF NOT EXISTS venues_fts USING fts5(
  name,
  city,
  state,
  content='venues',
  content_rowid='id'
);

-- Triggers to keep FTS in sync with venues table
CREATE TRIGGER IF NOT EXISTS venues_ai AFTER INSERT ON venues BEGIN
  INSERT INTO venues_fts(rowid, name, city, state) VALUES (new.id, new.name, new.city, new.state);
END;

CREATE TRIGGER IF NOT EXISTS venues_ad AFTER DELETE ON venues BEGIN
  INSERT INTO venues_fts(venues_fts, rowid, name, city, state) VALUES('delete', old.id, old.name, old.city, old.state);
END;

CREATE TRIGGER IF NOT EXISTS venues_au AFTER UPDATE ON venues BEGIN
  INSERT INTO venues_fts(venues_fts, rowid, name, city, state) VALUES('delete', old.id, old.name, old.city, old.state);
  INSERT INTO venues_fts(rowid, name, city, state) VALUES (new.id, new.name, new.city, new.state);
END;

-- ==================== FULL-TEXT SEARCH FOR GUESTS ====================
-- FTS5 virtual table for guest search

CREATE VIRTUAL TABLE IF NOT EXISTS guests_fts USING fts5(
  name,
  content='guests',
  content_rowid='id'
);

-- Triggers to keep FTS in sync with guests table
CREATE TRIGGER IF NOT EXISTS guests_ai AFTER INSERT ON guests BEGIN
  INSERT INTO guests_fts(rowid, name) VALUES (new.id, new.name);
END;

CREATE TRIGGER IF NOT EXISTS guests_ad AFTER DELETE ON guests BEGIN
  INSERT INTO guests_fts(guests_fts, rowid, name) VALUES('delete', old.id, old.name);
END;

CREATE TRIGGER IF NOT EXISTS guests_au AFTER UPDATE ON guests BEGIN
  INSERT INTO guests_fts(guests_fts, rowid, name) VALUES('delete', old.id, old.name);
  INSERT INTO guests_fts(rowid, name) VALUES (new.id, new.name);
END;

-- ==================== SQLITE PERFORMANCE PRAGMAS ====================

-- Enable multi-threaded queries (Apple Silicon optimization)
PRAGMA threads = 4;

-- Better query plan analysis
PRAGMA analysis_limit = 1000;

-- Update statistics for query optimizer
ANALYZE;
