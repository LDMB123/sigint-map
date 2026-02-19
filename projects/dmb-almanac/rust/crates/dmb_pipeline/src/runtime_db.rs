use anyhow::{Context, Result};
use rusqlite::Connection;
use serde::de::DeserializeOwned;
use std::fs::File;
use std::path::Path;

use dmb_core::{
    CuratedList, CuratedListItem, Guest, GuestAppearance, LiberationEntry, Release, ReleaseTrack,
    SetlistEntry, Show, Song, SongStatistics, Tour, Venue,
};

mod inserts;
mod integrity;
mod schema;

use self::inserts::*;
use self::integrity::validate_runtime_integrity;
use self::schema::create_schema;

const SETLIST_ENTRIES_FILE: &str = "setlist-entries.json";
const SETLIST_CHUNK_PREFIX: &str = "setlist-entries-chunk-";

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
    let setlist_entries = read_setlist_entries(source_dir)?;
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

fn read_setlist_entries(source_dir: &Path) -> Result<Vec<SetlistEntry>> {
    let single_path = source_dir.join(SETLIST_ENTRIES_FILE);
    if single_path.exists() {
        return read_json_vec(&single_path);
    }

    let mut chunk_paths = std::fs::read_dir(source_dir)
        .with_context(|| format!("read dir {}", source_dir.display()))?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let path = entry.path();
            if !path.is_file() {
                return None;
            }
            let name = path.file_name()?.to_str()?.to_string();
            if name.starts_with(SETLIST_CHUNK_PREFIX) && name.ends_with(".json") {
                Some((name, path))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    chunk_paths.sort_by(|a, b| a.0.cmp(&b.0));

    if chunk_paths.is_empty() {
        return Ok(Vec::new());
    }

    let mut merged = Vec::new();
    for (_, path) in chunk_paths {
        let mut chunk: Vec<SetlistEntry> = read_json_vec(&path)?;
        merged.append(&mut chunk);
    }
    Ok(merged)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;

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

    #[test]
    fn read_setlist_entries_merges_chunk_files() -> Result<()> {
        let dir = tempfile::tempdir().context("create temp dir")?;
        let chunk_a = dir.path().join("setlist-entries-chunk-0002.json");
        let chunk_b = dir.path().join("setlist-entries-chunk-0001.json");

        fs::write(
            &chunk_a,
            serde_json::to_string_pretty(&vec![json!({
                "id": 2,
                "showId": 20,
                "songId": 200,
                "position": 2
            })])?,
        )
        .with_context(|| format!("write {}", chunk_a.display()))?;
        fs::write(
            &chunk_b,
            serde_json::to_string_pretty(&vec![json!({
                "id": 1,
                "showId": 10,
                "songId": 100,
                "position": 1
            })])?,
        )
        .with_context(|| format!("write {}", chunk_b.display()))?;

        let merged = read_setlist_entries(dir.path())?;
        assert_eq!(merged.len(), 2);
        assert_eq!(merged[0].id, 1);
        assert_eq!(merged[1].id, 2);
        Ok(())
    }
}
