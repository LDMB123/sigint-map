use anyhow::{Context, Result};
use rusqlite::{params, Transaction};

use dmb_core::{
    CuratedList, CuratedListItem, Guest, GuestAppearance, LiberationEntry, Release, ReleaseTrack,
    SetlistEntry, Show, Song, SongStatistics, Tour, Venue, CORE_SCHEMA_VERSION,
};

fn opt_i32(value: Option<i32>) -> Option<i64> {
    value.map(|v| v as i64)
}

fn opt_f32(value: Option<f32>) -> Option<f64> {
    value.map(|v| v as f64)
}

fn opt_bool(value: Option<bool>) -> Option<i64> {
    value.map(|v| if v { 1 } else { 0 })
}

pub(super) fn insert_venues(tx: &Transaction<'_>, venues: &[Venue]) -> Result<()> {
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

pub(super) fn insert_songs(tx: &Transaction<'_>, songs: &[Song]) -> Result<()> {
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

pub(super) fn insert_tours(tx: &Transaction<'_>, tours: &[Tour]) -> Result<()> {
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

pub(super) fn insert_shows(tx: &Transaction<'_>, shows: &[Show]) -> Result<()> {
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

pub(super) fn insert_setlist_entries(tx: &Transaction<'_>, entries: &[SetlistEntry]) -> Result<()> {
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

pub(super) fn insert_guests(tx: &Transaction<'_>, guests: &[Guest]) -> Result<()> {
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

pub(super) fn insert_guest_appearances(
    tx: &Transaction<'_>,
    items: &[GuestAppearance],
) -> Result<()> {
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

pub(super) fn insert_liberation_list(
    tx: &Transaction<'_>,
    items: &[LiberationEntry],
) -> Result<()> {
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

pub(super) fn insert_song_statistics(tx: &Transaction<'_>, items: &[SongStatistics]) -> Result<()> {
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

pub(super) fn insert_releases(tx: &Transaction<'_>, releases: &[Release]) -> Result<()> {
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

pub(super) fn insert_release_tracks(tx: &Transaction<'_>, tracks: &[ReleaseTrack]) -> Result<()> {
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

pub(super) fn insert_curated_lists(tx: &Transaction<'_>, lists: &[CuratedList]) -> Result<()> {
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

pub(super) fn insert_curated_list_items(
    tx: &Transaction<'_>,
    items: &[CuratedListItem],
) -> Result<()> {
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

fn insert_meta_value(tx: &Transaction<'_>, key: &str, value: &str) -> Result<()> {
    tx.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .with_context(|| format!("insert meta {key}"))?;
    Ok(())
}

pub(super) fn insert_meta(tx: &Transaction<'_>) -> Result<()> {
    let generated_at = chrono::Utc::now().to_rfc3339();
    insert_meta_value(tx, "core_schema_version", CORE_SCHEMA_VERSION)?;
    insert_meta_value(tx, "generated_at", &generated_at)?;
    Ok(())
}
