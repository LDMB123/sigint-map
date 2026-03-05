use anyhow::{Context, Result};
use rusqlite::Transaction;

pub(super) fn create_schema(tx: &Transaction<'_>) -> Result<()> {
    tx.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS venues (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          city TEXT NOT NULL,
          state TEXT,
          country TEXT NOT NULL,
          country_code TEXT,
          venue_type TEXT,
          total_shows INTEGER,
          search_text TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
        CREATE INDEX IF NOT EXISTS idx_venues_top_shows_name
          ON venues(COALESCE(total_shows, 0) DESC, name ASC);

        CREATE TABLE IF NOT EXISTS songs (
          id INTEGER PRIMARY KEY,
          slug TEXT NOT NULL,
          title TEXT NOT NULL,
          sort_title TEXT,
          total_performances INTEGER,
          last_played_date TEXT,
          opener_count INTEGER,
          closer_count INTEGER,
          encore_count INTEGER,
          is_liberated INTEGER,
          search_text TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_slug ON songs(slug);
        CREATE INDEX IF NOT EXISTS idx_songs_top_performances_title
          ON songs(COALESCE(total_performances, 0) DESC, title ASC);

        CREATE TABLE IF NOT EXISTS tours (
          id INTEGER PRIMARY KEY,
          year INTEGER NOT NULL,
          name TEXT NOT NULL,
          total_shows INTEGER,
          search_text TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tours_year ON tours(year);
        CREATE INDEX IF NOT EXISTS idx_tours_recent_order
          ON tours(year DESC, total_shows DESC, id DESC);

        CREATE TABLE IF NOT EXISTS shows (
          id INTEGER PRIMARY KEY,
          date TEXT NOT NULL,
          year INTEGER NOT NULL,
          venue_id INTEGER NOT NULL,
          tour_id INTEGER,
          song_count INTEGER,
          rarity_index REAL
        );
        CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
        CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);
        CREATE INDEX IF NOT EXISTS idx_shows_tour_id ON shows(tour_id);

        CREATE TABLE IF NOT EXISTS setlist_entries (
          id INTEGER PRIMARY KEY,
          show_id INTEGER NOT NULL,
          song_id INTEGER NOT NULL,
          position INTEGER NOT NULL,
          set_name TEXT,
          slot TEXT,
          duration_seconds INTEGER,
          segue_into_song_id INTEGER,
          is_segue INTEGER,
          is_tease INTEGER,
          tease_of_song_id INTEGER,
          notes TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_setlist_entries_show_position ON setlist_entries(show_id, position);

        CREATE TABLE IF NOT EXISTS guests (
          id INTEGER PRIMARY KEY,
          slug TEXT NOT NULL,
          name TEXT NOT NULL,
          total_appearances INTEGER,
          search_text TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_slug ON guests(slug);
        CREATE INDEX IF NOT EXISTS idx_guests_top_appearances_name
          ON guests(COALESCE(total_appearances, 0) DESC, name ASC);

        CREATE TABLE IF NOT EXISTS guest_appearances (
          id INTEGER PRIMARY KEY,
          guest_id INTEGER NOT NULL,
          show_id INTEGER NOT NULL,
          song_id INTEGER,
          show_date TEXT,
          year INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_guest_appearances_guest_id ON guest_appearances(guest_id);
        CREATE INDEX IF NOT EXISTS idx_guest_appearances_show_id ON guest_appearances(show_id);

        CREATE TABLE IF NOT EXISTS liberation_list (
          id INTEGER PRIMARY KEY,
          song_id INTEGER NOT NULL,
          days_since INTEGER,
          shows_since INTEGER,
          is_liberated INTEGER,
          last_played_date TEXT,
          last_played_show_id INTEGER,
          notes TEXT,
          configuration TEXT,
          liberated_date TEXT,
          liberated_show_id INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_liberation_list_song_id ON liberation_list(song_id);
        CREATE INDEX IF NOT EXISTS idx_liberation_list_days_since_id
          ON liberation_list(days_since DESC, id DESC);

        CREATE TABLE IF NOT EXISTS song_statistics (
          id INTEGER PRIMARY KEY,
          song_id INTEGER NOT NULL,
          current_gap_days INTEGER,
          current_gap_shows INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_song_statistics_song_id ON song_statistics(song_id);

        CREATE TABLE IF NOT EXISTS releases (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          release_type TEXT,
          release_date TEXT,
          search_text TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_releases_slug ON releases(slug);
        CREATE INDEX IF NOT EXISTS idx_releases_release_date_id
          ON releases(release_date DESC, id DESC);

        CREATE TABLE IF NOT EXISTS release_tracks (
          id INTEGER PRIMARY KEY,
          release_id INTEGER NOT NULL,
          song_id INTEGER,
          show_id INTEGER,
          track_number INTEGER,
          disc_number INTEGER,
          duration_seconds INTEGER,
          notes TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_release_tracks_release_id ON release_tracks(release_id, disc_number, track_number);

        CREATE TABLE IF NOT EXISTS curated_lists (
          id INTEGER PRIMARY KEY,
          original_id TEXT,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          item_count INTEGER,
          is_featured INTEGER,
          sort_order INTEGER,
          created_at TEXT,
          updated_at TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_curated_lists_slug ON curated_lists(slug);
        CREATE INDEX IF NOT EXISTS idx_curated_lists_sort_order_id
          ON curated_lists(sort_order, id);

        CREATE TABLE IF NOT EXISTS curated_list_items (
          id INTEGER PRIMARY KEY,
          list_id INTEGER NOT NULL,
          position INTEGER NOT NULL,
          item_type TEXT NOT NULL,
          show_id INTEGER,
          song_id INTEGER,
          venue_id INTEGER,
          guest_id INTEGER,
          release_id INTEGER,
          item_title TEXT,
          item_link TEXT,
          notes TEXT,
          metadata TEXT,
          created_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_curated_list_items_list_id ON curated_list_items(list_id, position);

        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        "#,
    )
    .context("create runtime sqlite schema")?;
    Ok(())
}
