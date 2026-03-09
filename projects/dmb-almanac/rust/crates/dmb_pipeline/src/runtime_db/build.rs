use anyhow::{Context, Result};
use rusqlite::Connection;
use std::path::Path;

use dmb_core::{
    CuratedList, CuratedListItem, Guest, GuestAppearance, LiberationEntry, Release, ReleaseTrack,
    Show, Song, SongStatistics, Tour, Venue,
};

use super::input::{read_json_vec, read_setlist_entries};
use super::inserts::*;
use super::integrity::validate_runtime_integrity;
use super::schema::create_schema;

pub(super) fn build_runtime_db(source_dir: &Path, output: &Path) -> Result<()> {
    if !source_dir.exists() {
        anyhow::bail!("source data dir not found: {}", source_dir.display());
    }

    prepare_output_path(output)?;
    let data = load_runtime_input_data(source_dir)?;

    let mut conn =
        Connection::open(output).with_context(|| format!("open sqlite {}", output.display()))?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA temp_store = MEMORY;
        PRAGMA foreign_keys = OFF;
        "#,
    )
    .context("set initial sqlite pragmas")?;

    let tx = conn.transaction().context("start sqlite transaction")?;
    create_schema(&tx)?;
    insert_runtime_data(&tx, &data)?;
    validate_runtime_integrity(&tx)?;
    tx.commit().context("commit sqlite transaction")?;

    finalize_runtime_db(&conn)?;
    log_runtime_db_counts(&data);
    Ok(())
}

struct RuntimeInputData {
    venues: Vec<Venue>,
    songs: Vec<Song>,
    tours: Vec<Tour>,
    shows: Vec<Show>,
    setlist_entries: Vec<dmb_core::SetlistEntry>,
    guests: Vec<Guest>,
    guest_appearances: Vec<GuestAppearance>,
    liberation_list: Vec<LiberationEntry>,
    song_statistics: Vec<SongStatistics>,
    releases: Vec<Release>,
    release_tracks: Vec<ReleaseTrack>,
    curated_lists: Vec<CuratedList>,
    curated_list_items: Vec<CuratedListItem>,
}

fn prepare_output_path(output: &Path) -> Result<()> {
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create db output dir {}", parent.display()))?;
    }
    if output.exists() {
        std::fs::remove_file(output)
            .with_context(|| format!("remove existing {}", output.display()))?;
    }
    Ok(())
}

fn load_runtime_input_data(source_dir: &Path) -> Result<RuntimeInputData> {
    Ok(RuntimeInputData {
        venues: read_json_vec(&source_dir.join("venues.json"))?,
        songs: read_json_vec(&source_dir.join("songs.json"))?,
        tours: read_json_vec(&source_dir.join("tours.json"))?,
        shows: read_json_vec(&source_dir.join("shows.json"))?,
        setlist_entries: read_setlist_entries(source_dir)?,
        guests: read_json_vec(&source_dir.join("guests.json"))?,
        guest_appearances: read_json_vec(&source_dir.join("guest-appearances.json"))?,
        liberation_list: read_json_vec(&source_dir.join("liberation-list.json"))?,
        song_statistics: read_json_vec(&source_dir.join("song-statistics.json"))?,
        releases: read_json_vec(&source_dir.join("releases.json"))?,
        release_tracks: read_json_vec(&source_dir.join("release-tracks.json"))?,
        curated_lists: read_json_vec(&source_dir.join("curated-lists.json"))?,
        curated_list_items: read_json_vec(&source_dir.join("curated-list-items.json"))?,
    })
}

fn insert_runtime_data(tx: &rusqlite::Transaction<'_>, data: &RuntimeInputData) -> Result<()> {
    insert_venues(tx, &data.venues)?;
    insert_songs(tx, &data.songs)?;
    insert_tours(tx, &data.tours)?;
    insert_shows(tx, &data.shows)?;
    insert_setlist_entries(tx, &data.setlist_entries)?;
    insert_guests(tx, &data.guests)?;
    insert_guest_appearances(tx, &data.guest_appearances)?;
    insert_liberation_list(tx, &data.liberation_list)?;
    insert_song_statistics(tx, &data.song_statistics)?;
    insert_releases(tx, &data.releases)?;
    insert_release_tracks(tx, &data.release_tracks)?;
    insert_curated_lists(tx, &data.curated_lists)?;
    insert_curated_list_items(tx, &data.curated_list_items)?;
    insert_meta(tx)?;
    Ok(())
}

fn finalize_runtime_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        ANALYZE;
        PRAGMA wal_checkpoint(TRUNCATE);
        PRAGMA journal_mode = DELETE;
        PRAGMA optimize;
        "#,
    )
    .context("finalize runtime sqlite pragmas")?;
    Ok(())
}

fn log_runtime_db_counts(data: &RuntimeInputData) {
    tracing::info!(
        venues = data.venues.len(),
        songs = data.songs.len(),
        tours = data.tours.len(),
        shows = data.shows.len(),
        setlist_entries = data.setlist_entries.len(),
        guests = data.guests.len(),
        guest_appearances = data.guest_appearances.len(),
        liberation_list = data.liberation_list.len(),
        song_statistics = data.song_statistics.len(),
        releases = data.releases.len(),
        release_tracks = data.release_tracks.len(),
        curated_lists = data.curated_lists.len(),
        curated_list_items = data.curated_list_items.len(),
        "runtime sqlite built"
    );
}
