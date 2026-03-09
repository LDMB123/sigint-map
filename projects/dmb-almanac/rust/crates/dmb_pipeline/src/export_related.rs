use anyhow::Result;
use rusqlite::{Connection, OptionalExtension};
use serde_json::{Value, json};

use crate::export::export_support::{
    collect_rows, extract_year, map_by_id, opt_i64_or_warn, parse_json_field,
};

pub(crate) fn export_setlist_entries(
    conn: &Connection,
    songs: &[Value],
    shows: &[Value],
) -> Result<Vec<Value>> {
    let songs_by_id = map_by_id(songs);
    let shows_by_id = map_by_id(shows);
    let mut stmt = conn.prepare("SELECT * FROM setlist_entries ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let song_id: i64 = row.get("song_id")?;
        let show_id: i64 = row.get("show_id")?;
        let song = songs_by_id
            .get(&song_id)
            .copied()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let show = shows_by_id
            .get(&show_id)
            .copied()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let show_date = show
            .get("date")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let year = extract_year(&show_date);
        let song_obj = song
            .as_object()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let song_json = json!({
            "id": song_obj.get("id").cloned().unwrap_or(json!(song_id)),
            "title": song_obj.get("title").cloned().unwrap_or(Value::Null),
            "slug": song_obj.get("slug").cloned().unwrap_or(Value::Null),
            "isCover": song_obj.get("isCover").cloned().unwrap_or(Value::Null),
            "totalPerformances": song_obj.get("totalPerformances").cloned().unwrap_or(Value::Null),
            "openerCount": song_obj.get("openerCount").cloned().unwrap_or(Value::Null),
            "closerCount": song_obj.get("closerCount").cloned().unwrap_or(Value::Null),
            "encoreCount": song_obj.get("encoreCount").cloned().unwrap_or(Value::Null),
        });
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "showId": show_id,
            "songId": song_id,
            "position": row.get::<_, i64>("position")?,
            "setName": row.get::<_, Option<String>>("set_name")?,
            "slot": row.get::<_, Option<String>>("slot")?,
            "durationSeconds": row.get::<_, Option<i64>>("duration_seconds")?,
            "segueIntoSongId": row.get::<_, Option<i64>>("segue_into_song_id")?,
            "isSegue": row.get::<_, Option<i64>>("is_segue")?.map(|v| v != 0).unwrap_or(false),
            "isTease": row.get::<_, Option<i64>>("is_tease")?.map(|v| v != 0).unwrap_or(false),
            "teaseOfSongId": row.get::<_, Option<i64>>("tease_of_song_id")?,
            "notes": row.get::<_, Option<String>>("notes")?,
            "song": song_json,
            "showDate": show_date,
            "year": year,
        }))
    })?;
    collect_rows(rows)
}

pub(crate) fn export_guest_appearances(conn: &Connection, shows: &[Value]) -> Result<Vec<Value>> {
    let shows_by_id = map_by_id(shows);
    let mut stmt = conn.prepare("SELECT * FROM guest_appearances ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let show_id: i64 = row.get("show_id")?;
        let show = shows_by_id
            .get(&show_id)
            .copied()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let setlist_entry_id: Option<i64> = row.get("setlist_entry_id")?;
        let song_id = if let Some(entry_id) = setlist_entry_id {
            conn.query_row(
                "SELECT song_id FROM setlist_entries WHERE id = ?",
                [entry_id],
                |row| row.get::<_, i64>(0),
            )
            .optional()?
        } else {
            None
        };
        let show_date = show
            .get("date")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let year = extract_year(&show_date);
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "guestId": row.get::<_, i64>("guest_id")?,
            "showId": show_id,
            "setlistEntryId": setlist_entry_id,
            "songId": song_id,
            "instruments": parse_json_field(row.get::<_, Option<String>>("instruments")?),
            "notes": row.get::<_, Option<String>>("notes")?,
            "showDate": show_date,
            "year": year,
        }))
    })?;
    collect_rows(rows)
}

pub(crate) fn export_liberation_list(conn: &Connection) -> Result<Vec<Value>> {
    let sql = r#"
        SELECT
          ll.*,
          s.title,
          s.slug,
          s.is_cover,
          s.total_performances,
          sh.date,
          v.name as venue_name,
          v.city as venue_city,
          v.state as venue_state
        FROM liberation_list ll
        JOIN songs s ON ll.song_id = s.id
        JOIN shows sh ON ll.last_played_show_id = sh.id
        JOIN venues v ON sh.venue_id = v.id
        ORDER BY ll.id
    "#;
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], |row| {
        let id = row.get::<_, i64>("id")?;
        let days_since = opt_i64_or_warn(
            row.get::<_, Option<i64>>("days_since")?,
            "liberation_list",
            &format!("id={id}.daysSince"),
        );
        let shows_since = opt_i64_or_warn(
            row.get::<_, Option<i64>>("shows_since")?,
            "liberation_list",
            &format!("id={id}.showsSince"),
        );
        Ok(json!({
            "id": id,
            "songId": row.get::<_, i64>("song_id")?,
            "lastPlayedDate": row.get::<_, Option<String>>("last_played_date")?,
            "lastPlayedShowId": row.get::<_, i64>("last_played_show_id")?,
            "daysSince": days_since,
            "showsSince": shows_since,
            "notes": row.get::<_, Option<String>>("notes")?,
            "configuration": row.get::<_, Option<String>>("configuration")?,
            "isLiberated": row.get::<_, Option<i64>>("is_liberated")?.map(|v| v != 0).unwrap_or(false),
            "liberatedDate": row.get::<_, Option<String>>("liberated_date")?,
            "liberatedShowId": row.get::<_, Option<i64>>("liberated_show_id")?,
            "song": {
                "id": row.get::<_, i64>("song_id")?,
                "title": row.get::<_, String>("title")?,
                "slug": row.get::<_, String>("slug")?,
                "isCover": row.get::<_, i64>("is_cover")? != 0,
                "totalPerformances": row.get::<_, Option<i64>>("total_performances")?,
            },
            "lastShow": {
                "id": row.get::<_, i64>("last_played_show_id")?,
                "date": row.get::<_, String>("date")?,
                "venue": {
                    "name": row.get::<_, String>("venue_name")?,
                    "city": row.get::<_, String>("venue_city")?,
                    "state": row.get::<_, Option<String>>("venue_state")?,
                }
            }
        }))
    })?;
    collect_rows(rows)
}

pub(crate) fn export_song_statistics(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM song_statistics ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "songId": row.get::<_, i64>("song_id")?,
            "slotOpener": row.get::<_, Option<i64>>("slot_opener")?,
            "slotSet1Closer": row.get::<_, Option<i64>>("slot_set1_closer")?,
            "slotSet2Opener": row.get::<_, Option<i64>>("slot_set2_opener")?,
            "slotCloser": row.get::<_, Option<i64>>("slot_closer")?,
            "slotMidset": row.get::<_, Option<i64>>("slot_midset")?,
            "slotEncore": row.get::<_, Option<i64>>("slot_encore")?,
            "slotEncore2": row.get::<_, Option<i64>>("slot_encore2")?,
            "versionFull": row.get::<_, Option<i64>>("version_full")?,
            "versionTease": row.get::<_, Option<i64>>("version_tease")?,
            "versionPartial": row.get::<_, Option<i64>>("version_partial")?,
            "versionReprise": row.get::<_, Option<i64>>("version_reprise")?,
            "versionFake": row.get::<_, Option<i64>>("version_fake")?,
            "versionAborted": row.get::<_, Option<i64>>("version_aborted")?,
            "avgDurationSeconds": row.get::<_, Option<i64>>("avg_duration_seconds")?,
            "longestDurationSeconds": row.get::<_, Option<i64>>("longest_duration_seconds")?,
            "longestShowId": row.get::<_, Option<i64>>("longest_show_id")?,
            "shortestDurationSeconds": row.get::<_, Option<i64>>("shortest_duration_seconds")?,
            "shortestShowId": row.get::<_, Option<i64>>("shortest_show_id")?,
            "releaseCountTotal": row.get::<_, Option<i64>>("release_count_total")?,
            "releaseCountStudio": row.get::<_, Option<i64>>("release_count_studio")?,
            "releaseCountLive": row.get::<_, Option<i64>>("release_count_live")?,
            "currentGapDays": row.get::<_, Option<i64>>("current_gap_days")?,
            "currentGapShows": row.get::<_, Option<i64>>("current_gap_shows")?,
            "playsByYear": parse_json_field(row.get::<_, Option<String>>("plays_by_year")?),
            "topSeguesInto": parse_json_field(row.get::<_, Option<String>>("top_segues_into")?),
            "topSeguesFrom": parse_json_field(row.get::<_, Option<String>>("top_segues_from")?),
        }))
    })?;
    collect_rows(rows)
}

pub(crate) fn export_curated_lists(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM curated_lists ORDER BY sort_order, id")?;
    let rows = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "originalId": row.get::<_, Option<String>>("original_id")?,
            "title": row.get::<_, String>("title")?,
            "slug": row.get::<_, String>("slug")?,
            "category": row.get::<_, String>("category")?,
            "description": row.get::<_, Option<String>>("description")?,
            "itemCount": row.get::<_, Option<i64>>("item_count")?,
            "isFeatured": row.get::<_, Option<i64>>("is_featured")?.map(|v| v != 0).unwrap_or(false),
            "sortOrder": row.get::<_, Option<i64>>("sort_order")?,
            "createdAt": row.get::<_, Option<String>>("created_at")?,
            "updatedAt": row.get::<_, Option<String>>("updated_at")?,
        }))
    })?;
    collect_rows(rows)
}

pub(crate) fn export_curated_list_items(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM curated_list_items ORDER BY list_id, position")?;
    let rows = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "listId": row.get::<_, i64>("list_id")?,
            "position": row.get::<_, i64>("position")?,
            "itemType": row.get::<_, String>("item_type")?,
            "showId": row.get::<_, Option<i64>>("show_id")?,
            "songId": row.get::<_, Option<i64>>("song_id")?,
            "venueId": row.get::<_, Option<i64>>("venue_id")?,
            "guestId": row.get::<_, Option<i64>>("guest_id")?,
            "releaseId": row.get::<_, Option<i64>>("release_id")?,
            "itemTitle": row.get::<_, Option<String>>("item_title")?,
            "itemLink": row.get::<_, Option<String>>("item_link")?,
            "notes": row.get::<_, Option<String>>("notes")?,
            "metadata": row.get::<_, Option<String>>("metadata")?,
            "createdAt": row.get::<_, Option<String>>("created_at")?,
        }))
    })?;
    collect_rows(rows)
}

pub(crate) fn export_release_tracks(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM release_tracks ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "releaseId": row.get::<_, i64>("release_id")?,
            "songId": row.get::<_, Option<i64>>("song_id")?,
            "trackNumber": row.get::<_, Option<i64>>("track_number")?,
            "discNumber": row.get::<_, Option<i64>>("disc_number")?,
            "durationSeconds": row.get::<_, Option<i64>>("duration_seconds")?,
            "showId": row.get::<_, Option<i64>>("show_id")?,
            "notes": row.get::<_, Option<String>>("notes")?,
        }))
    })?;
    collect_rows(rows)
}
