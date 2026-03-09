use anyhow::{Context, Result};
use dmb_core::{Show, Song};
use serde_json::Value;
use std::fs;
use std::path::Path;

use super::super::{BASE_URL, ScrapeClient, parse_song_stats_page, parse_venue_stats_page};

pub(super) fn apply_max_items<T>(items: &mut Vec<T>, limit: Option<usize>) {
    if let Some(limit) = limit
        && items.len() > limit
    {
        items.truncate(limit);
    }
}

pub(super) fn write_json<T: serde::Serialize>(path: &Path, data: &T) -> Result<()> {
    let file = fs::File::create(path).with_context(|| format!("write {}", path.display()))?;
    serde_json::to_writer_pretty(file, data).context("serialize json")?;
    Ok(())
}

pub(super) fn write_json_if<T: serde::Serialize>(
    path: &Path,
    data: &T,
    enabled: bool,
) -> Result<()> {
    if enabled {
        write_json(path, data)?;
    }
    Ok(())
}

pub(super) fn scrape_song_stats(client: &ScrapeClient, songs: &[Song]) -> Result<Vec<Value>> {
    let mut stats = Vec::new();
    for song in songs {
        if song.id <= 0 {
            continue;
        }
        let url = format!("{BASE_URL}/SongStats.aspx?sid={}", song.id);
        let html = client.fetch_html(&url)?;
        let entry = parse_song_stats_page(&html, song.id, &song.title);
        stats.push(entry);
    }
    Ok(stats)
}

pub(super) fn scrape_venue_stats(client: &ScrapeClient, shows: &[Show]) -> Result<Vec<Value>> {
    let mut venue_ids: Vec<i32> = shows
        .iter()
        .map(|show| show.venue_id)
        .filter(|id| *id > 0)
        .collect();
    venue_ids.sort();
    venue_ids.dedup();
    let mut stats = Vec::new();
    for venue_id in venue_ids {
        let url = format!("{BASE_URL}/VenueStats.aspx?vid={venue_id}");
        let html = client.fetch_html(&url)?;
        if let Some(entry) = parse_venue_stats_page(&html, venue_id) {
            stats.push(entry);
        }
    }
    Ok(stats)
}
