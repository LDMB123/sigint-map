-- DMB Almanac Database Schema
-- SQLite database for storing Dave Matthews Band concert data

-- ==================== VENUES ====================
CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  country_code TEXT DEFAULT 'US',
  venue_type TEXT CHECK(venue_type IN ('amphitheater', 'amphitheatre', 'arena', 'stadium', 'theater', 'theatre', 'club', 'festival', 'outdoor', 'cruise', 'pavilion', 'coliseum', 'other')) DEFAULT 'other',
  capacity INTEGER,
  latitude REAL,
  longitude REAL,
  total_shows INTEGER DEFAULT 0,
  first_show_date TEXT,
  last_show_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_state ON venues(state);
CREATE INDEX IF NOT EXISTS idx_venues_country ON venues(country_code);
CREATE INDEX IF NOT EXISTS idx_venues_type ON venues(venue_type);
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);

-- ==================== SONGS ====================
CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_title TEXT NOT NULL,
  original_artist TEXT,
  is_cover INTEGER DEFAULT 0,
  is_original INTEGER DEFAULT 1,
  first_played_date TEXT,
  last_played_date TEXT,
  total_performances INTEGER DEFAULT 0,
  opener_count INTEGER DEFAULT 0,
  closer_count INTEGER DEFAULT 0,
  encore_count INTEGER DEFAULT 0,
  lyrics TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_songs_slug ON songs(slug);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(sort_title);
CREATE INDEX IF NOT EXISTS idx_songs_last_played ON songs(last_played_date);
CREATE INDEX IF NOT EXISTS idx_songs_performances ON songs(total_performances DESC);
CREATE INDEX IF NOT EXISTS idx_songs_cover ON songs(is_cover);

-- ==================== TOURS ====================
CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  total_shows INTEGER DEFAULT 0,
  unique_songs_played INTEGER DEFAULT 0,
  average_songs_per_show REAL,
  rarity_index REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tours_year ON tours(year);
CREATE INDEX IF NOT EXISTS idx_tours_name ON tours(name);

-- ==================== SHOWS ====================
CREATE TABLE IF NOT EXISTS shows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE RESTRICT,
  notes TEXT,
  soundcheck TEXT,
  attendance_count INTEGER,
  rarity_index REAL,
  song_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
CREATE INDEX IF NOT EXISTS idx_shows_venue ON shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_tour ON shows(tour_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shows_date_venue ON shows(date, venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_rarity ON shows(rarity_index DESC);

-- ==================== SETLIST ENTRIES ====================
CREATE TABLE IF NOT EXISTS setlist_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id),
  position INTEGER NOT NULL,
  set_name TEXT CHECK(set_name IN ('set1', 'set2', 'set3', 'encore', 'encore2')) DEFAULT 'set1',
  slot TEXT CHECK(slot IN ('opener', 'closer', 'standard')) DEFAULT 'standard',
  duration_seconds INTEGER,
  segue_into_song_id INTEGER REFERENCES songs(id),
  is_segue INTEGER DEFAULT 0,
  is_tease INTEGER DEFAULT 0,
  tease_of_song_id INTEGER REFERENCES songs(id),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_setlist_show ON setlist_entries(show_id);
CREATE INDEX IF NOT EXISTS idx_setlist_song ON setlist_entries(song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_position ON setlist_entries(show_id, position);
CREATE INDEX IF NOT EXISTS idx_setlist_slot ON setlist_entries(slot);
CREATE INDEX IF NOT EXISTS idx_setlist_set ON setlist_entries(set_name);
CREATE INDEX IF NOT EXISTS idx_setlist_segue ON setlist_entries(segue_into_song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_tease ON setlist_entries(tease_of_song_id);

-- ==================== GUESTS ====================
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  instruments TEXT, -- JSON array: ["guitar", "vocals"]
  total_appearances INTEGER DEFAULT 0,
  first_appearance_date TEXT,
  last_appearance_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guests_slug ON guests(slug);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(name);
CREATE INDEX IF NOT EXISTS idx_guests_appearances ON guests(total_appearances DESC);

-- ==================== GUEST APPEARANCES ====================
CREATE TABLE IF NOT EXISTS guest_appearances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  setlist_entry_id INTEGER REFERENCES setlist_entries(id) ON DELETE CASCADE,
  instruments TEXT, -- JSON array for this appearance
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appearances_guest ON guest_appearances(guest_id);
CREATE INDEX IF NOT EXISTS idx_appearances_show ON guest_appearances(show_id);
CREATE INDEX IF NOT EXISTS idx_appearances_entry ON guest_appearances(setlist_entry_id);

-- ==================== RELEASES (ALBUMS) ====================
CREATE TABLE IF NOT EXISTS releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  release_type TEXT CHECK(release_type IN ('studio', 'live', 'compilation', 'ep', 'single', 'video', 'box_set')) DEFAULT 'studio',
  release_date TEXT,
  catalog_number TEXT,
  cover_art_url TEXT,
  track_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_releases_slug ON releases(slug);
CREATE INDEX IF NOT EXISTS idx_releases_type ON releases(release_type);
CREATE INDEX IF NOT EXISTS idx_releases_date ON releases(release_date);
CREATE INDEX IF NOT EXISTS idx_releases_track_count ON releases(track_count);

-- ==================== RELEASE TRACKS ====================
CREATE TABLE IF NOT EXISTS release_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id),
  track_number INTEGER NOT NULL,
  disc_number INTEGER DEFAULT 1,
  duration_seconds INTEGER,
  show_id INTEGER REFERENCES shows(id), -- Source show for live tracks
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracks_release ON release_tracks(release_id);
CREATE INDEX IF NOT EXISTS idx_tracks_song ON release_tracks(song_id);
CREATE INDEX IF NOT EXISTS idx_tracks_show ON release_tracks(show_id);

-- ==================== PERFORMANCE RELEASES (M2M) ====================
-- Links specific setlist entries to releases (which performances are released)
CREATE TABLE IF NOT EXISTS performance_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setlist_entry_id INTEGER NOT NULL REFERENCES setlist_entries(id) ON DELETE CASCADE,
  release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  release_track_id INTEGER REFERENCES release_tracks(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(setlist_entry_id, release_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_release_entry ON performance_releases(setlist_entry_id);
CREATE INDEX IF NOT EXISTS idx_perf_release_release ON performance_releases(release_id);

-- ==================== LIBERATION LIST ====================
-- Pre-computed list of songs waiting to be played again
CREATE TABLE IF NOT EXISTS liberation_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id INTEGER NOT NULL REFERENCES songs(id) UNIQUE,
  last_played_date TEXT NOT NULL,
  last_played_show_id INTEGER NOT NULL REFERENCES shows(id),
  days_since INTEGER NOT NULL,
  shows_since INTEGER NOT NULL,
  notes TEXT,
  configuration TEXT, -- full_band, dave_tim, dave_solo
  is_liberated INTEGER DEFAULT 0,
  liberated_date TEXT,
  liberated_show_id INTEGER REFERENCES shows(id),
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_liberation_days ON liberation_list(days_since DESC);
CREATE INDEX IF NOT EXISTS idx_liberation_shows ON liberation_list(shows_since DESC);

-- ==================== SONG STATISTICS ====================
-- Denormalized song statistics for performance (from scraper)
CREATE TABLE IF NOT EXISTS song_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE UNIQUE,

  -- Slot breakdown
  slot_opener INTEGER DEFAULT 0,
  slot_set1_closer INTEGER DEFAULT 0,
  slot_set2_opener INTEGER DEFAULT 0,
  slot_closer INTEGER DEFAULT 0,
  slot_midset INTEGER DEFAULT 0,
  slot_encore INTEGER DEFAULT 0,
  slot_encore2 INTEGER DEFAULT 0,

  -- Version types
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

  -- Release counts
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
  plays_by_year TEXT,
  artist_stats TEXT,
  top_segues_into TEXT,
  top_segues_from TEXT,

  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_song_stats_song ON song_statistics(song_id);
CREATE INDEX IF NOT EXISTS idx_song_stats_gap_days ON song_statistics(current_gap_days DESC);
CREATE INDEX IF NOT EXISTS idx_song_stats_gap_shows ON song_statistics(current_gap_shows DESC);

-- ==================== CURATED LISTS ====================
-- User-curated or scraped lists (e.g., iconic segues, best shows)
CREATE TABLE IF NOT EXISTS curated_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  item_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_curated_lists_slug ON curated_lists(slug);
CREATE INDEX IF NOT EXISTS idx_curated_lists_category ON curated_lists(category);

-- ==================== CURATED LIST ITEMS ====================
-- Items within curated lists
CREATE TABLE IF NOT EXISTS curated_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL REFERENCES curated_lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  item_type TEXT CHECK(item_type IN ('show', 'song', 'venue', 'release', 'guest', 'custom')) DEFAULT 'custom',
  item_id INTEGER,
  item_title TEXT,
  item_link TEXT,
  notes TEXT,
  metadata TEXT, -- JSON for extra data
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_items_list ON curated_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_position ON curated_list_items(list_id, position);
CREATE INDEX IF NOT EXISTS idx_list_items_type ON curated_list_items(item_type);

-- ==================== VENUE ALIASES ====================
-- Alternative names for venues (historical names, abbreviations)
CREATE TABLE IF NOT EXISTS venue_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  alias_type TEXT CHECK(alias_type IN ('historical', 'abbreviation', 'alternate', 'typo')) DEFAULT 'alternate',
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_venue_aliases_venue ON venue_aliases(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_aliases_name ON venue_aliases(alias_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_aliases_unique ON venue_aliases(venue_id, alias_name);

-- ==================== FULL-TEXT SEARCH ====================
-- FTS5 virtual table for song search
CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
  title,
  lyrics,
  content='songs',
  content_rowid='id'
);

-- Triggers to keep FTS in sync with songs table
CREATE TRIGGER IF NOT EXISTS songs_ai AFTER INSERT ON songs BEGIN
  INSERT INTO songs_fts(rowid, title, lyrics) VALUES (new.id, new.title, new.lyrics);
END;

CREATE TRIGGER IF NOT EXISTS songs_ad AFTER DELETE ON songs BEGIN
  INSERT INTO songs_fts(songs_fts, rowid, title, lyrics) VALUES('delete', old.id, old.title, old.lyrics);
END;

CREATE TRIGGER IF NOT EXISTS songs_au AFTER UPDATE ON songs BEGIN
  INSERT INTO songs_fts(songs_fts, rowid, title, lyrics) VALUES('delete', old.id, old.title, old.lyrics);
  INSERT INTO songs_fts(rowid, title, lyrics) VALUES (new.id, new.title, new.lyrics);
END;

-- ==================== VIEWS ====================

-- View for show details with venue and tour info
CREATE VIEW IF NOT EXISTS show_details AS
SELECT
  s.id,
  s.date,
  s.notes,
  s.soundcheck,
  s.rarity_index,
  s.song_count,
  v.id as venue_id,
  v.name as venue_name,
  v.city as venue_city,
  v.state as venue_state,
  v.country as venue_country,
  v.venue_type,
  t.id as tour_id,
  t.name as tour_name,
  t.year as tour_year
FROM shows s
JOIN venues v ON s.venue_id = v.id
JOIN tours t ON s.tour_id = t.id;

-- View for recent shows
CREATE VIEW IF NOT EXISTS recent_shows AS
SELECT * FROM show_details
ORDER BY date DESC
LIMIT 50;

-- View for song statistics
CREATE VIEW IF NOT EXISTS song_stats AS
SELECT
  s.*,
  julianday('now') - julianday(s.last_played_date) as days_since_last,
  (SELECT COUNT(*) FROM shows WHERE date > s.last_played_date) as shows_since_last
FROM songs s
WHERE s.last_played_date IS NOT NULL;
