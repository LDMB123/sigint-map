use anyhow::{Context, Result};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::Path;

use crate::artifact_contracts::{
    SETLIST_ENTRIES_FILE, is_setlist_chunk_asset_name, normalized_data_asset_name,
};
use crate::data_utils::{
    collect_ids, compare_counts, ensure_required_fields, ensure_unique, load_json_array,
};

pub(crate) struct ValidationData {
    pub(crate) shows: Vec<Value>,
    pub(crate) venues: Vec<Value>,
    pub(crate) songs: Vec<Value>,
    pub(crate) tours: Vec<Value>,
    pub(crate) guests: Vec<Value>,
    pub(crate) releases: Vec<Value>,
    pub(crate) venue_ids: HashSet<i32>,
    pub(crate) tour_ids: HashSet<i32>,
    pub(crate) song_ids: HashSet<i32>,
}

pub(crate) fn load_validation_data(data_dir: &Path) -> Result<ValidationData> {
    let shows = load_json_array(&data_dir.join("shows.json"))?;
    let venues = load_json_array(&data_dir.join("venues.json"))?;
    let songs = load_json_array(&data_dir.join("songs.json"))?;
    let tours = load_json_array(&data_dir.join("tours.json"))?;
    let guests = load_json_array(&data_dir.join("guests.json"))?;
    let releases = load_json_array(&data_dir.join("releases.json"))?;

    let venue_ids = collect_ids(&venues, "id");
    let tour_ids = collect_ids(&tours, "id");
    let song_ids = collect_ids(&songs, "id");

    Ok(ValidationData {
        shows,
        venues,
        songs,
        tours,
        guests,
        releases,
        venue_ids,
        tour_ids,
        song_ids,
    })
}

pub(crate) fn validate_core_dataset_shape(data: &ValidationData) -> Result<()> {
    ensure_unique(&data.shows, "id", "shows")?;
    ensure_unique(&data.venues, "id", "venues")?;
    ensure_unique(&data.songs, "id", "songs")?;
    ensure_unique(&data.tours, "id", "tours")?;
    ensure_unique(&data.guests, "id", "guests")?;
    ensure_unique(&data.releases, "id", "releases")?;
    ensure_required_fields(&data.shows, &["id", "date", "venueId"], "shows")?;
    ensure_required_fields(&data.venues, &["id", "name"], "venues")?;
    ensure_required_fields(&data.songs, &["id", "title"], "songs")?;
    ensure_required_fields(&data.tours, &["id", "year", "name"], "tours")?;
    ensure_required_fields(&data.guests, &["id", "name"], "guests")?;
    ensure_required_fields(&data.releases, &["id", "title"], "releases")?;
    Ok(())
}

pub(crate) fn validate_show_relationships(data: &ValidationData) -> Result<()> {
    for item in &data.shows {
        let venue_id = item.get("venueId").and_then(serde_json::Value::as_i64);
        if let Some(venue_id) = venue_id {
            let venue_id = i32::try_from(venue_id)
                .with_context(|| format!("show venueId out of i32 range: {venue_id}"))?;
            if !data.venue_ids.contains(&venue_id) {
                anyhow::bail!("show references missing venue_id={venue_id}");
            }
        }
        let tour_id = item.get("tourId").and_then(serde_json::Value::as_i64);
        if let Some(tour_id) = tour_id {
            let tour_id = i32::try_from(tour_id)
                .with_context(|| format!("show tourId out of i32 range: {tour_id}"))?;
            if !data.tour_ids.contains(&tour_id) {
                anyhow::bail!("show references missing tour_id={tour_id}");
            }
        }
    }
    Ok(())
}

pub(crate) fn load_setlist_entries(data_dir: &Path) -> Result<Vec<Value>> {
    let setlist_path = data_dir.join(SETLIST_ENTRIES_FILE);
    if setlist_path.exists() {
        return load_json_array(&setlist_path);
    }

    let mut chunk_paths = std::fs::read_dir(data_dir)
        .with_context(|| format!("read dir {}", data_dir.display()))?
        .filter_map(std::result::Result::ok)
        .filter_map(|entry| {
            let path = entry.path();
            if !path.is_file() {
                return None;
            }
            let name = path.file_name()?.to_str()?.to_string();
            if is_setlist_chunk_asset_name(normalized_data_asset_name(&name)) {
                Some((name, path))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    chunk_paths.sort_by(|a, b| a.0.cmp(&b.0));

    let mut merged = Vec::new();
    for (_, chunk_path) in chunk_paths {
        merged.extend(load_json_array(&chunk_path)?);
    }
    Ok(merged)
}

pub(crate) fn validate_setlist_entries(setlist: &[Value], song_ids: &HashSet<i32>) -> Result<()> {
    if setlist.is_empty() {
        return Ok(());
    }

    ensure_unique(setlist, "id", "setlistEntries")?;
    ensure_required_fields(
        setlist,
        &["id", "showId", "songId", "position"],
        "setlistEntries",
    )?;
    for item in setlist {
        if let Some(song_id) = item.get("songId").and_then(serde_json::Value::as_i64) {
            let song_id = i32::try_from(song_id)
                .with_context(|| format!("setlist songId out of i32 range: {song_id}"))?;
            if !song_ids.contains(&song_id) {
                anyhow::bail!("setlist references missing song_id={song_id}");
            }
        }
    }

    Ok(())
}

pub(crate) fn compare_baseline_counts_if_needed(
    data_dir: &Path,
    baseline_dir: &Path,
    allow_mismatch: bool,
) -> Result<()> {
    if data_dir == baseline_dir || !baseline_dir.exists() {
        return Ok(());
    }

    compare_counts(
        &data_dir.join("shows.json"),
        &baseline_dir.join("shows.json"),
        "shows",
        allow_mismatch,
    )?;
    compare_counts(
        &data_dir.join("venues.json"),
        &baseline_dir.join("venues.json"),
        "venues",
        allow_mismatch,
    )?;
    compare_counts(
        &data_dir.join("songs.json"),
        &baseline_dir.join("songs.json"),
        "songs",
        allow_mismatch,
    )?;
    compare_counts(
        &data_dir.join("tours.json"),
        &baseline_dir.join("tours.json"),
        "tours",
        allow_mismatch,
    )?;
    compare_counts(
        &data_dir.join("guests.json"),
        &baseline_dir.join("guests.json"),
        "guests",
        allow_mismatch,
    )?;
    compare_counts(
        &data_dir.join("releases.json"),
        &baseline_dir.join("releases.json"),
        "releases",
        allow_mismatch,
    )?;

    Ok(())
}

pub(crate) fn log_validation_summary(data: &ValidationData, summary: Option<&(u64, u64, String)>) {
    tracing::info!(
        "validate: shows={}, songs={}, venues={}, tours={}, guests={}, releases={}",
        data.shows.len(),
        data.songs.len(),
        data.venues.len(),
        data.tours.len(),
        data.guests.len(),
        data.releases.len()
    );
    if let Some((empty, missing, path)) = summary {
        tracing::info!(
            "validate warnings: emptySelectors={}, missingFields={} (report: {})",
            empty,
            missing,
            path
        );
    }
}

pub(crate) fn validate_song_stats_consistency(data_dir: &Path) -> Result<()> {
    let song_stats_path = data_dir.join("song-stats.json");
    if !song_stats_path.exists() {
        return Ok(());
    }

    let song_stats = load_json_array(&song_stats_path)?;
    for stat in &song_stats {
        let total = stat.get("totalPlays").and_then(serde_json::Value::as_i64);
        let performances_len = stat
            .get("performances")
            .and_then(|v| v.as_array())
            .map(|v| i64::try_from(v.len()).unwrap_or(i64::MAX));
        if let (Some(total), Some(len)) = (total, performances_len)
            && total != len
        {
            anyhow::bail!(
                "song stats mismatch: id={:?} totalPlays={} performances={}",
                stat.get("songId").or_else(|| stat.get("id")),
                total,
                len
            );
        }
    }

    Ok(())
}

pub(crate) fn validate_venue_stats_consistency(
    data_dir: &Path,
    shows: &[Value],
    allow_mismatch: bool,
) -> Result<()> {
    let venue_stats_path = data_dir.join("venue-stats.json");
    if !venue_stats_path.exists() {
        return Ok(());
    }

    let venue_stats = load_json_array(&venue_stats_path)?;
    let mut show_counts: HashMap<i32, i64> = HashMap::new();
    for show in shows {
        if let Some(venue_id) = show.get("venueId").and_then(serde_json::Value::as_i64) {
            let venue_id = i32::try_from(venue_id)
                .with_context(|| format!("show venueId out of i32 range: {venue_id}"))?;
            *show_counts.entry(venue_id).or_insert(0) += 1;
        }
    }
    for stat in &venue_stats {
        let venue_id = stat
            .get("originalId")
            .or_else(|| stat.get("venueId"))
            .and_then(serde_json::Value::as_i64);
        let total_shows = stat.get("totalShows").and_then(serde_json::Value::as_i64);
        if let (Some(venue_id), Some(total_shows)) = (venue_id, total_shows) {
            let venue_id = i32::try_from(venue_id)
                .with_context(|| format!("venue stats id out of i32 range: {venue_id}"))?;
            let count = show_counts.get(&venue_id).copied().unwrap_or(0);
            if count != total_shows && !allow_mismatch {
                anyhow::bail!(
                    "venue stats mismatch: venue_id={venue_id} totalShows={total_shows} shows={count}"
                );
            }
        }
    }

    Ok(())
}
