use anyhow::Result;
use dmb_core::CORE_SCHEMA_VERSION;
use rusqlite::Connection;
use std::fs::File;
use std::path::{Path, PathBuf};

use crate::artifact_contracts::{DataFile, DataManifest};

const PARITY_TABLES: &[&str] = &[
    "venues",
    "songs",
    "tours",
    "shows",
    "setlist_entries",
    "guests",
    "guest_appearances",
    "liberation_list",
    "song_statistics",
    "releases",
    "release_tracks",
    "curated_lists",
    "curated_list_items",
];

fn create_parity_db(dir: &Path) -> Result<PathBuf> {
    let sqlite_path = dir.join("parity.db");
    let conn = Connection::open(&sqlite_path)?;
    for table in PARITY_TABLES {
        conn.execute(
            &format!("CREATE TABLE {table} (id INTEGER PRIMARY KEY)"),
            [],
        )?;
        for id in 1..=3 {
            conn.execute(&format!("INSERT INTO {table} (id) VALUES (?1)"), [id])?;
        }
    }
    Ok(sqlite_path)
}

fn write_manifest(dir: &Path, mapping_files: &[(&str, u64)]) -> Result<PathBuf> {
    let files = mapping_files
        .iter()
        .map(|(name, count)| DataFile {
            name: (*name).to_string(),
            size: 1,
            checksum: "fixture".to_string(),
            count: Some(*count),
        })
        .collect();
    let manifest = DataManifest {
        version: CORE_SCHEMA_VERSION.to_string(),
        generated_at: "2026-02-01T00:00:00Z".to_string(),
        files,
    };

    let manifest_path = dir.join("manifest.json");
    serde_json::to_writer_pretty(File::create(&manifest_path)?, &manifest)?;
    Ok(manifest_path)
}

#[test]
fn sqlite_parity_fixture_passes_strict() -> Result<()> {
    let dir = tempfile::tempdir()?;
    let sqlite_path = create_parity_db(dir.path())?;
    let manifest_path = write_manifest(
        dir.path(),
        &[
            ("venues.json", 3),
            ("songs.json", 3),
            ("tours.json", 3),
            ("shows.json", 3),
            ("setlist-entries.json", 3),
            ("guests.json", 3),
            ("guest-appearances.json", 3),
            ("liberation-list.json", 3),
            ("song-statistics.json", 3),
            ("releases.json", 3),
            ("release-tracks.json", 3),
            ("curated-lists.json", 3),
            ("curated-list-items.json", 3),
        ],
    )?;

    crate::sqlite_parity::validate_sqlite_parity(&manifest_path, &sqlite_path, true, true)?;
    Ok(())
}

#[test]
fn sqlite_parity_accepts_setlist_chunk_counts() -> Result<()> {
    let dir = tempfile::tempdir()?;
    let sqlite_path = create_parity_db(dir.path())?;
    let manifest_path = write_manifest(
        dir.path(),
        &[
            ("venues.json", 3),
            ("songs.json", 3),
            ("tours.json", 3),
            ("shows.json", 3),
            ("setlist-entries-chunk-0001.json", 1),
            ("setlist-entries-chunk-0002.json", 2),
            ("guests.json", 3),
            ("guest-appearances.json", 3),
            ("liberation-list.json", 3),
            ("song-statistics.json", 3),
            ("releases.json", 3),
            ("release-tracks.json", 3),
            ("curated-lists.json", 3),
            ("curated-list-items.json", 3),
        ],
    )?;

    crate::sqlite_parity::validate_sqlite_parity(&manifest_path, &sqlite_path, true, true)?;
    Ok(())
}

#[test]
fn sqlite_parity_prefers_setlist_single_file_when_chunks_also_present() -> Result<()> {
    let dir = tempfile::tempdir()?;
    let sqlite_path = create_parity_db(dir.path())?;
    let manifest_path = write_manifest(
        dir.path(),
        &[
            ("venues.json", 3),
            ("songs.json", 3),
            ("tours.json", 3),
            ("shows.json", 3),
            ("setlist-entries.json", 3),
            ("setlist-entries-chunk-0001.json", 4),
            ("setlist-entries-chunk-0002.json", 5),
            ("guests.json", 3),
            ("guest-appearances.json", 3),
            ("liberation-list.json", 3),
            ("song-statistics.json", 3),
            ("releases.json", 3),
            ("release-tracks.json", 3),
            ("curated-lists.json", 3),
            ("curated-list-items.json", 3),
        ],
    )?;

    crate::sqlite_parity::validate_sqlite_parity(&manifest_path, &sqlite_path, true, true)?;
    Ok(())
}
