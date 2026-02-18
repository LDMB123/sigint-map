use anyhow::{Context, Result};
use rusqlite::{params, Connection, Transaction};
use serde::de::DeserializeOwned;
use std::fs::File;
use std::path::Path;

use dmb_core::{
    CuratedList, CuratedListItem, Guest, GuestAppearance, LiberationEntry, Release, ReleaseTrack,
    SetlistEntry, Show, Song, SongStatistics, Tour, Venue, CORE_SCHEMA_VERSION,
};

pub fn build_runtime_db(source_dir: &Path, output: &Path) -> Result<()> {
    if !source_dir.exists() {
        anyhow::bail!("source data dir not found: {}", source_dir.display());
    }

    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create db output dir {}", parent.display()))?;
    }
    if output.exists() {
        std::fs::remove_file(output)
            .with_context(|| format!("remove existing {}", output.display()))?;
    }

    let venues: Vec<Venue> = read_json_vec(&source_dir.join("venues.json"))?;
    let songs: Vec<Song> = read_json_vec(&source_dir.join("songs.json"))?;
    let tours: Vec<Tour> = read_json_vec(&source_dir.join("tours.json"))?;
    let shows: Vec<Show> = read_json_vec(&source_dir.join("shows.json"))?;
    let setlist_entries: Vec<SetlistEntry> =
        read_json_vec(&source_dir.join("setlist-entries.json"))?;
    let guests: Vec<Guest> = read_json_vec(&source_dir.join("guests.json"))?;
    let guest_appearances: Vec<GuestAppearance> =
        read_json_vec(&source_dir.join("guest-appearances.json"))?;
    let liberation_list: Vec<LiberationEntry> =
        read_json_vec(&source_dir.join("liberation-list.json"))?;
    let song_statistics: Vec<SongStatistics> =
        read_json_vec(&source_dir.join("song-statistics.json"))?;
    let releases: Vec<Release> = read_json_vec(&source_dir.join("releases.json"))?;
    let release_tracks: Vec<ReleaseTrack> = read_json_vec(&source_dir.join("release-tracks.json"))?;
    let curated_lists: Vec<CuratedList> = read_json_vec(&source_dir.join("curated-lists.json"))?;
    let curated_list_items: Vec<CuratedListItem> =
        read_json_vec(&source_dir.join("curated-list-items.json"))?;

    let mut conn =
        Connection::open(output).with_context(|| format!("open sqlite {}", output.display()))?;
    let _ = conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA temp_store = MEMORY;
        PRAGMA foreign_keys = OFF;
        "#,
    );

    let tx = conn.transaction().context("start sqlite transaction")?;

    create_schema(&tx)?;

    insert_venues(&tx, &venues)?;
    insert_songs(&tx, &songs)?;
    insert_tours(&tx, &tours)?;
    insert_shows(&tx, &shows)?;
    insert_setlist_entries(&tx, &setlist_entries)?;
    insert_guests(&tx, &guests)?;
    insert_guest_appearances(&tx, &guest_appearances)?;
    insert_liberation_list(&tx, &liberation_list)?;
    insert_song_statistics(&tx, &song_statistics)?;
    insert_releases(&tx, &releases)?;
    insert_release_tracks(&tx, &release_tracks)?;
    insert_curated_lists(&tx, &curated_lists)?;
    insert_curated_list_items(&tx, &curated_list_items)?;
    insert_meta(&tx)?;
    validate_runtime_integrity(&tx)?;

    tx.commit().context("commit sqlite transaction")?;

    tracing::info!(
        venues = venues.len(),
        songs = songs.len(),
        tours = tours.len(),
        shows = shows.len(),
        setlist_entries = setlist_entries.len(),
        guests = guests.len(),
        guest_appearances = guest_appearances.len(),
        liberation_list = liberation_list.len(),
        song_statistics = song_statistics.len(),
        releases = releases.len(),
        release_tracks = release_tracks.len(),
        curated_lists = curated_lists.len(),
        curated_list_items = curated_list_items.len(),
        "runtime sqlite built"
    );

    Ok(())
}

fn read_json_vec<T: DeserializeOwned>(path: &Path) -> Result<Vec<T>> {
    let file = File::open(path).with_context(|| format!("open json {}", path.display()))?;
    serde_json::from_reader(file).with_context(|| format!("parse json {}", path.display()))
}

fn create_schema(tx: &Transaction<'_>) -> Result<()> {
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

fn opt_i32(value: Option<i32>) -> Option<i64> {
    value.map(|v| v as i64)
}

fn opt_f32(value: Option<f32>) -> Option<f64> {
    value.map(|v| v as f64)
}

fn opt_bool(value: Option<bool>) -> Option<i64> {
    value.map(|v| if v { 1 } else { 0 })
}

fn insert_venues(tx: &Transaction<'_>, venues: &[Venue]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO venues (id, name, city, state, country, country_code, venue_type, total_shows, search_text)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        )
        .context("prepare venues insert")?;
    for v in venues {
        stmt.execute(params![
            v.id,
            v.name,
            v.city,
            v.state,
            v.country,
            v.country_code,
            v.venue_type,
            opt_i32(v.total_shows),
            v.search_text,
        ])
        .with_context(|| format!("insert venue {}", v.id))?;
    }
    Ok(())
}

fn insert_songs(tx: &Transaction<'_>, songs: &[Song]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO songs (id, slug, title, sort_title, total_performances, last_played_date, opener_count, closer_count, encore_count, is_liberated, search_text)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        )
        .context("prepare songs insert")?;
    for song in songs {
        stmt.execute(params![
            song.id,
            song.slug,
            song.title,
            song.sort_title,
            opt_i32(song.total_performances),
            song.last_played_date,
            opt_i32(song.opener_count),
            opt_i32(song.closer_count),
            opt_i32(song.encore_count),
            opt_bool(song.is_liberated),
            song.search_text,
        ])
        .with_context(|| format!("insert song {}", song.id))?;
    }
    Ok(())
}

fn insert_tours(tx: &Transaction<'_>, tours: &[Tour]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO tours (id, year, name, total_shows, search_text)
             VALUES (?1, ?2, ?3, ?4, ?5)",
        )
        .context("prepare tours insert")?;
    for tour in tours {
        stmt.execute(params![
            tour.id,
            tour.year,
            tour.name,
            opt_i32(tour.total_shows),
            tour.search_text,
        ])
        .with_context(|| format!("insert tour {}", tour.id))?;
    }
    Ok(())
}

fn insert_shows(tx: &Transaction<'_>, shows: &[Show]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO shows (id, date, year, venue_id, tour_id, song_count, rarity_index)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        )
        .context("prepare shows insert")?;
    for show in shows {
        stmt.execute(params![
            show.id,
            show.date,
            show.year,
            show.venue_id,
            opt_i32(show.tour_id),
            opt_i32(show.song_count),
            opt_f32(show.rarity_index),
        ])
        .with_context(|| format!("insert show {}", show.id))?;
    }
    Ok(())
}

fn insert_setlist_entries(tx: &Transaction<'_>, entries: &[SetlistEntry]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO setlist_entries (id, show_id, song_id, position, set_name, slot, duration_seconds, segue_into_song_id, is_segue, is_tease, tease_of_song_id, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        )
        .context("prepare setlist_entries insert")?;
    for entry in entries {
        stmt.execute(params![
            entry.id,
            entry.show_id,
            entry.song_id,
            entry.position,
            entry.set_name,
            entry.slot,
            opt_i32(entry.duration_seconds),
            opt_i32(entry.segue_into_song_id),
            opt_bool(entry.is_segue),
            opt_bool(entry.is_tease),
            opt_i32(entry.tease_of_song_id),
            entry.notes,
        ])
        .with_context(|| format!("insert setlist_entry {}", entry.id))?;
    }
    Ok(())
}

fn insert_guests(tx: &Transaction<'_>, guests: &[Guest]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO guests (id, slug, name, total_appearances, search_text)
             VALUES (?1, ?2, ?3, ?4, ?5)",
        )
        .context("prepare guests insert")?;
    for guest in guests {
        stmt.execute(params![
            guest.id,
            guest.slug,
            guest.name,
            opt_i32(guest.total_appearances),
            guest.search_text,
        ])
        .with_context(|| format!("insert guest {}", guest.id))?;
    }
    Ok(())
}

fn insert_guest_appearances(tx: &Transaction<'_>, items: &[GuestAppearance]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO guest_appearances (id, guest_id, show_id, song_id, show_date, year)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )
        .context("prepare guest_appearances insert")?;
    for item in items {
        stmt.execute(params![
            item.id,
            item.guest_id,
            item.show_id,
            opt_i32(item.song_id),
            item.show_date,
            opt_i32(item.year),
        ])
        .with_context(|| format!("insert guest_appearance {}", item.id))?;
    }
    Ok(())
}

fn insert_liberation_list(tx: &Transaction<'_>, items: &[LiberationEntry]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO liberation_list (id, song_id, days_since, shows_since, is_liberated, last_played_date, last_played_show_id, notes, configuration, liberated_date, liberated_show_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        )
        .context("prepare liberation_list insert")?;
    for item in items {
        stmt.execute(params![
            item.id,
            item.song_id,
            opt_i32(item.days_since),
            opt_i32(item.shows_since),
            opt_bool(item.is_liberated),
            item.last_played_date,
            opt_i32(item.last_played_show_id),
            item.notes,
            item.configuration,
            item.liberated_date,
            opt_i32(item.liberated_show_id),
        ])
        .with_context(|| format!("insert liberation_entry {}", item.id))?;
    }
    Ok(())
}

fn insert_song_statistics(tx: &Transaction<'_>, items: &[SongStatistics]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO song_statistics (id, song_id, current_gap_days, current_gap_shows)
             VALUES (?1, ?2, ?3, ?4)",
        )
        .context("prepare song_statistics insert")?;
    for item in items {
        stmt.execute(params![
            item.id,
            item.song_id,
            opt_i32(item.current_gap_days),
            opt_i32(item.current_gap_shows),
        ])
        .with_context(|| format!("insert song_statistics {}", item.id))?;
    }
    Ok(())
}

fn insert_releases(tx: &Transaction<'_>, releases: &[Release]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO releases (id, title, slug, release_type, release_date, search_text)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )
        .context("prepare releases insert")?;
    for release in releases {
        stmt.execute(params![
            release.id,
            release.title,
            release.slug,
            release.release_type,
            release.release_date,
            release.search_text,
        ])
        .with_context(|| format!("insert release {}", release.id))?;
    }
    Ok(())
}

fn insert_release_tracks(tx: &Transaction<'_>, tracks: &[ReleaseTrack]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO release_tracks (id, release_id, song_id, show_id, track_number, disc_number, duration_seconds, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        )
        .context("prepare release_tracks insert")?;
    for track in tracks {
        stmt.execute(params![
            track.id,
            track.release_id,
            opt_i32(track.song_id),
            opt_i32(track.show_id),
            opt_i32(track.track_number),
            opt_i32(track.disc_number),
            opt_i32(track.duration_seconds),
            track.notes,
        ])
        .with_context(|| format!("insert release_track {}", track.id))?;
    }
    Ok(())
}

fn insert_curated_lists(tx: &Transaction<'_>, lists: &[CuratedList]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO curated_lists (id, original_id, title, slug, category, description, item_count, is_featured, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        )
        .context("prepare curated_lists insert")?;
    for list in lists {
        stmt.execute(params![
            list.id,
            list.original_id,
            list.title,
            list.slug,
            list.category,
            list.description,
            opt_i32(list.item_count),
            opt_bool(list.is_featured),
            opt_i32(list.sort_order),
            list.created_at,
            list.updated_at,
        ])
        .with_context(|| format!("insert curated_list {}", list.id))?;
    }
    Ok(())
}

fn insert_curated_list_items(tx: &Transaction<'_>, items: &[CuratedListItem]) -> Result<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO curated_list_items (id, list_id, position, item_type, show_id, song_id, venue_id, guest_id, release_id, item_title, item_link, notes, metadata, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        )
        .context("prepare curated_list_items insert")?;
    for item in items {
        let metadata = item
            .metadata
            .as_ref()
            .and_then(|value| serde_json::to_string(value).ok());
        stmt.execute(params![
            item.id,
            item.list_id,
            item.position,
            item.item_type,
            opt_i32(item.show_id),
            opt_i32(item.song_id),
            opt_i32(item.venue_id),
            opt_i32(item.guest_id),
            opt_i32(item.release_id),
            item.item_title,
            item.item_link,
            item.notes,
            metadata,
            item.created_at,
        ])
        .with_context(|| format!("insert curated_list_item {}", item.id))?;
    }
    Ok(())
}

fn insert_meta(tx: &Transaction<'_>) -> Result<()> {
    tx.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?1, ?2)",
        params!["core_schema_version", CORE_SCHEMA_VERSION],
    )
    .context("insert meta core_schema_version")?;
    tx.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?1, ?2)",
        params!["generated_at", chrono::Utc::now().to_rfc3339()],
    )
    .context("insert meta generated_at")?;
    Ok(())
}

fn expect_zero_violations(tx: &Transaction<'_>, label: &str, sql: &str) -> Result<()> {
    let count: i64 = tx
        .query_row(sql, [], |row| row.get(0))
        .with_context(|| format!("run integrity check {label}"))?;
    if count != 0 {
        anyhow::bail!("runtime sqlite integrity check failed ({label}): {count} violation(s)");
    }
    Ok(())
}

fn validate_runtime_integrity(tx: &Transaction<'_>) -> Result<()> {
    // Keep logical referential integrity checks explicit because bulk load runs with
    // foreign_keys disabled for throughput.
    expect_zero_violations(
        tx,
        "shows.venue_id references venues.id",
        "SELECT COUNT(*)
         FROM shows s
         LEFT JOIN venues v ON v.id = s.venue_id
         WHERE v.id IS NULL",
    )?;
    expect_zero_violations(
        tx,
        "shows.tour_id references tours.id",
        "SELECT COUNT(*)
         FROM shows s
         LEFT JOIN tours t ON t.id = s.tour_id
         WHERE s.tour_id IS NOT NULL AND t.id IS NULL",
    )?;
    expect_zero_violations(
        tx,
        "setlist_entries.show_id references shows.id",
        "SELECT COUNT(*)
         FROM setlist_entries se
         LEFT JOIN shows s ON s.id = se.show_id
         WHERE s.id IS NULL",
    )?;
    expect_zero_violations(
        tx,
        "setlist_entries.song_id references songs.id",
        "SELECT COUNT(*)
         FROM setlist_entries se
         LEFT JOIN songs so ON so.id = se.song_id
         WHERE so.id IS NULL",
    )?;
    expect_zero_violations(
        tx,
        "guest_appearances.guest_id references guests.id",
        "SELECT COUNT(*)
         FROM guest_appearances ga
         LEFT JOIN guests g ON g.id = ga.guest_id
         WHERE g.id IS NULL",
    )?;
    expect_zero_violations(
        tx,
        "guest_appearances.show_id references shows.id",
        "SELECT COUNT(*)
         FROM guest_appearances ga
         LEFT JOIN shows s ON s.id = ga.show_id
         WHERE s.id IS NULL",
    )?;
    expect_zero_violations(
        tx,
        "release_tracks.release_id references releases.id",
        "SELECT COUNT(*)
         FROM release_tracks rt
         LEFT JOIN releases r ON r.id = rt.release_id
         WHERE r.id IS NULL",
    )?;
    expect_zero_violations(
        tx,
        "curated_list_items.list_id references curated_lists.id",
        "SELECT COUNT(*)
         FROM curated_list_items cli
         LEFT JOIN curated_lists cl ON cl.id = cli.list_id
         WHERE cl.id IS NULL",
    )?;
    expect_zero_violations(
        tx,
        "required textual fields are non-empty",
        "SELECT
            (SELECT COUNT(*) FROM shows WHERE date IS NULL OR TRIM(date) = '') +
            (SELECT COUNT(*) FROM songs WHERE title IS NULL OR TRIM(title) = '') +
            (SELECT COUNT(*) FROM venues WHERE name IS NULL OR TRIM(name) = '') +
            (SELECT COUNT(*) FROM tours WHERE name IS NULL OR TRIM(name) = '')",
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn index_is_unique(conn: &Connection, table: &str, index_name: &str) -> Result<bool> {
        let pragma = format!("PRAGMA index_list({table})");
        let mut stmt = conn
            .prepare(&pragma)
            .with_context(|| format!("prepare {pragma}"))?;
        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(1)?, row.get::<_, i64>(2)?))
            })
            .context("query pragma index_list (unique)")?;
        for row in rows {
            let (name, is_unique) = row.context("read unique row")?;
            if name == index_name {
                return Ok(is_unique != 0);
            }
        }
        Ok(false)
    }

    fn index_names(conn: &Connection, table: &str) -> Result<Vec<String>> {
        let pragma = format!("PRAGMA index_list({table})");
        let mut stmt = conn
            .prepare(&pragma)
            .with_context(|| format!("prepare {pragma}"))?;
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .context("query pragma index_list")?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row.context("read index_list row")?);
        }
        Ok(out)
    }

    #[test]
    fn create_schema_includes_hot_path_indexes() -> Result<()> {
        let mut conn = Connection::open_in_memory().context("open in-memory sqlite")?;
        let tx = conn.transaction().context("start schema transaction")?;
        create_schema(&tx)?;
        tx.commit().context("commit schema transaction")?;

        let checks: [(&str, &str); 7] = [
            ("venues", "idx_venues_top_shows_name"),
            ("songs", "idx_songs_top_performances_title"),
            ("tours", "idx_tours_recent_order"),
            ("guests", "idx_guests_top_appearances_name"),
            ("liberation_list", "idx_liberation_list_days_since_id"),
            ("releases", "idx_releases_release_date_id"),
            ("curated_lists", "idx_curated_lists_sort_order_id"),
        ];

        for (table, index_name) in checks {
            let indexes = index_names(&conn, table)?;
            assert!(
                indexes.iter().any(|name| name == index_name),
                "missing expected index {index_name} on table {table}; indexes={indexes:?}"
            );
        }

        let unique_checks: [(&str, &str); 4] = [
            ("songs", "idx_songs_slug"),
            ("guests", "idx_guests_slug"),
            ("releases", "idx_releases_slug"),
            ("curated_lists", "idx_curated_lists_slug"),
        ];
        for (table, index_name) in unique_checks {
            assert!(
                index_is_unique(&conn, table, index_name)?,
                "expected unique index {index_name} on table {table}"
            );
        }

        Ok(())
    }

    #[test]
    fn runtime_integrity_detects_orphan_show_venue() -> Result<()> {
        let mut conn = Connection::open_in_memory().context("open in-memory sqlite")?;
        let tx = conn.transaction().context("start schema transaction")?;
        create_schema(&tx)?;
        tx.execute(
            "INSERT INTO shows (id, date, year, venue_id, tour_id, song_count, rarity_index)
             VALUES (1, '2026-05-23', 2026, 999999, NULL, 0, NULL)",
            [],
        )
        .context("insert orphaned show row")?;
        let err = validate_runtime_integrity(&tx).expect_err("expected integrity failure");
        let message = err.to_string();
        assert!(
            message.contains("shows.venue_id references venues.id"),
            "unexpected integrity error: {message}"
        );
        Ok(())
    }
}
