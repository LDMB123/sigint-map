use anyhow::{Context, Result};
use rusqlite::{Transaction, params};

use dmb_core::{CuratedList, CuratedListItem, Release, ReleaseTrack};

use super::{opt_bool, opt_i32};

pub(crate) fn insert_releases(tx: &Transaction<'_>, releases: &[Release]) -> Result<()> {
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

pub(crate) fn insert_release_tracks(tx: &Transaction<'_>, tracks: &[ReleaseTrack]) -> Result<()> {
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

pub(crate) fn insert_curated_lists(tx: &Transaction<'_>, lists: &[CuratedList]) -> Result<()> {
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

pub(crate) fn insert_curated_list_items(
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
        let metadata = serialize_metadata(item);
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

fn serialize_metadata(item: &CuratedListItem) -> Option<String> {
    item.metadata
        .as_ref()
        .and_then(|value| serde_json::to_string(value).ok())
}
