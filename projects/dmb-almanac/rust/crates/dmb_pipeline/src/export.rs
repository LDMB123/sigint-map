use anyhow::{Context, Result};
use rusqlite::Connection;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

const SETLIST_CHUNK_PREFIX: &str = "setlist-entries-chunk-";
const SETLIST_CHUNK_RECORDS: usize = 10_000;

#[derive(Debug, Clone)]
struct FileMeta {
    name: String,
    path: PathBuf,
    size: u64,
    record_count: usize,
}

pub fn export_json(db_path: &Path, output_dir: &Path) -> Result<()> {
    fs::create_dir_all(output_dir).with_context(|| format!("create {}", output_dir.display()))?;

    let conn =
        Connection::open(db_path).with_context(|| format!("open sqlite {}", db_path.display()))?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA cache_size = -64000;
        "#,
    )
    .context("set sqlite pragmas")?;

    let venues = export_venues(&conn)?;
    let songs = export_songs(&conn)?;
    let tours = export_tours(&conn)?;
    let shows = export_shows(&conn, &venues, &tours)?;
    let setlist_entries = export_setlist_entries(&conn, &songs, &shows)?;
    let guests = export_guests(&conn)?;
    let guest_appearances = export_guest_appearances(&conn, &shows)?;
    let liberation_list = export_liberation_list(&conn)?;
    let song_statistics = export_song_statistics(&conn)?;
    let curated_lists = export_curated_lists(&conn)?;
    let curated_list_items = export_curated_list_items(&conn)?;
    let releases = export_releases(&conn)?;
    let release_tracks = export_release_tracks(&conn)?;

    let mut files = vec![
        write_json_array(output_dir, "venues.json", &venues)?,
        write_json_array(output_dir, "songs.json", &songs)?,
        write_json_array(output_dir, "tours.json", &tours)?,
        write_json_array(output_dir, "shows.json", &shows)?,
    ];
    files.extend(write_json_array_chunks(
        output_dir,
        SETLIST_CHUNK_PREFIX,
        &setlist_entries,
        SETLIST_CHUNK_RECORDS,
    )?);
    files.extend(vec![
        write_json_array(output_dir, "guests.json", &guests)?,
        write_json_array(output_dir, "guest-appearances.json", &guest_appearances)?,
        write_json_array(output_dir, "liberation-list.json", &liberation_list)?,
        write_json_array(output_dir, "song-statistics.json", &song_statistics)?,
        write_json_array(output_dir, "curated-lists.json", &curated_lists)?,
        write_json_array(output_dir, "curated-list-items.json", &curated_list_items)?,
        write_json_array(output_dir, "releases.json", &releases)?,
        write_json_array(output_dir, "release-tracks.json", &release_tracks)?,
    ]);

    let total_size: u64 = files.iter().map(|f| f.size).sum();
    let manifest = json!({
        "version": "1.0.0",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "recordCounts": {
            "venues": venues.len(),
            "songs": songs.len(),
            "tours": tours.len(),
            "shows": shows.len(),
            "setlistEntries": setlist_entries.len(),
            "guests": guests.len(),
            "guestAppearances": guest_appearances.len(),
            "liberationList": liberation_list.len(),
            "songStatistics": song_statistics.len(),
            "curatedLists": curated_lists.len(),
            "curatedListItems": curated_list_items.len(),
            "releases": releases.len(),
            "releaseTracks": release_tracks.len(),
        },
        "totalSize": total_size,
        "files": files.iter().map(|f| json!({
            "name": f.name,
            "path": f.path,
            "size": f.size,
            "recordCount": f.record_count,
        })).collect::<Vec<_>>(),
    });
    write_json_value(output_dir, "manifest.json", &manifest)?;

    Ok(())
}

fn export_venues(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM venues ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let name: String = row.get("name")?;
        let city: String = row.get("city")?;
        let state: Option<String> = row.get("state")?;
        let country: String = row.get("country")?;
        let search_text = create_search_text(&[
            Some(name.clone()),
            Some(city.clone()),
            state.clone(),
            Some(country.clone()),
        ]);
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "name": name,
            "city": city,
            "state": state,
            "country": country,
            "countryCode": row.get::<_, Option<String>>("country_code")?,
            "venueType": row.get::<_, Option<String>>("venue_type")?,
            "capacity": row.get::<_, Option<i64>>("capacity")?,
            "latitude": row.get::<_, Option<f64>>("latitude")?,
            "longitude": row.get::<_, Option<f64>>("longitude")?,
            "totalShows": row.get::<_, Option<i64>>("total_shows")?,
            "firstShowDate": row.get::<_, Option<String>>("first_show_date")?,
            "lastShowDate": row.get::<_, Option<String>>("last_show_date")?,
            "notes": row.get::<_, Option<String>>("notes")?,
            "searchText": search_text,
        }))
    })?;
    collect_rows(rows)
}

fn export_songs(conn: &Connection) -> Result<Vec<Value>> {
    let liberation_ids: HashMap<i64, (Option<i64>, Option<i64>)> = {
        let mut map = HashMap::new();
        let mut stmt =
            conn.prepare("SELECT song_id, days_since, shows_since FROM liberation_list")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>("song_id")?,
                row.get::<_, Option<i64>>("days_since")?,
                row.get::<_, Option<i64>>("shows_since")?,
            ))
        })?;
        for row in rows {
            let (id, days, shows) = row?;
            map.insert(id, (days, shows));
        }
        map
    };

    let mut stmt = conn.prepare("SELECT * FROM songs ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let id: i64 = row.get("id")?;
        let (days_since, shows_since) = liberation_ids.get(&id).cloned().unwrap_or((None, None));
        let title: String = row.get("title")?;
        let original_artist: Option<String> = row.get("original_artist")?;
        let search_text = create_search_text(&[Some(title.clone()), original_artist.clone()]);
        Ok(json!({
            "id": id,
            "title": title,
            "slug": row.get::<_, String>("slug")?,
            "sortTitle": row.get::<_, Option<String>>("sort_title")?,
            "originalArtist": original_artist,
            "isCover": row.get::<_, i64>("is_cover")? != 0,
            "isOriginal": row.get::<_, i64>("is_original")? != 0,
            "firstPlayedDate": row.get::<_, Option<String>>("first_played_date")?,
            "lastPlayedDate": row.get::<_, Option<String>>("last_played_date")?,
            "totalPerformances": row.get::<_, Option<i64>>("total_performances")?,
            "openerCount": row.get::<_, Option<i64>>("opener_count")?,
            "closerCount": row.get::<_, Option<i64>>("closer_count")?,
            "encoreCount": row.get::<_, Option<i64>>("encore_count")?,
            "lyrics": row.get::<_, Option<String>>("lyrics")?,
            "notes": row.get::<_, Option<String>>("notes")?,
            "composer": row.get::<_, Option<String>>("composer")?,
            "composerYear": row.get::<_, Option<i64>>("composer_year")?,
            "albumId": row.get::<_, Option<String>>("album_id")?,
            "albumName": row.get::<_, Option<String>>("album_name")?,
            "avgLengthSeconds": row.get::<_, Option<i64>>("avg_length_seconds")?,
            "songHistory": row.get::<_, Option<String>>("song_history")?,
            "isLiberated": liberation_ids.contains_key(&id),
            "daysSinceLastPlayed": days_since,
            "showsSinceLastPlayed": shows_since,
            "searchText": search_text,
        }))
    })?;
    collect_rows(rows)
}

fn export_tours(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM tours ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "name": row.get::<_, String>("name")?,
            "year": row.get::<_, i64>("year")?,
            "startDate": row.get::<_, Option<String>>("start_date")?,
            "endDate": row.get::<_, Option<String>>("end_date")?,
            "totalShows": row.get::<_, Option<i64>>("total_shows")?,
            "uniqueSongsPlayed": row.get::<_, Option<i64>>("unique_songs_played")?,
            "averageSongsPerShow": row.get::<_, Option<f64>>("average_songs_per_show")?,
            "rarityIndex": row.get::<_, Option<f64>>("rarity_index")?,
        }))
    })?;
    collect_rows(rows)
}

fn export_shows(conn: &Connection, venues: &[Value], tours: &[Value]) -> Result<Vec<Value>> {
    let venues_by_id = map_by_id(venues);
    let tours_by_id = map_by_id(tours);

    let mut stmt = conn.prepare("SELECT * FROM shows ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let venue_id: i64 = row.get("venue_id")?;
        let tour_id: i64 = row.get("tour_id")?;
        let venue = venues_by_id
            .get(&venue_id)
            .cloned()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let tour = tours_by_id
            .get(&tour_id)
            .cloned()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let date: String = row.get("date")?;
        let venue_obj = venue
            .as_object()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let venue_json = json!({
            "id": venue_obj.get("id").cloned().unwrap_or(json!(venue_id)),
            "name": venue_obj.get("name").cloned().unwrap_or(Value::Null),
            "city": venue_obj.get("city").cloned().unwrap_or(Value::Null),
            "state": venue_obj.get("state").cloned().unwrap_or(Value::Null),
            "country": venue_obj.get("country").cloned().unwrap_or(Value::Null),
            "countryCode": venue_obj.get("countryCode").cloned().unwrap_or(Value::Null),
            "venueType": venue_obj.get("venueType").cloned().unwrap_or(Value::Null),
            "capacity": venue_obj.get("capacity").cloned().unwrap_or(Value::Null),
            "totalShows": venue_obj.get("totalShows").cloned().unwrap_or(Value::Null),
        });
        let tour_obj = tour
            .as_object()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let tour_json = json!({
            "id": tour_obj.get("id").cloned().unwrap_or(json!(tour_id)),
            "name": tour_obj.get("name").cloned().unwrap_or(Value::Null),
            "year": tour_obj.get("year").cloned().unwrap_or(Value::Null),
            "startDate": tour_obj.get("startDate").cloned().unwrap_or(Value::Null),
            "endDate": tour_obj.get("endDate").cloned().unwrap_or(Value::Null),
            "totalShows": tour_obj.get("totalShows").cloned().unwrap_or(Value::Null),
        });
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "date": date.clone(),
            "venueId": venue_id,
            "tourId": tour_id,
            "notes": row.get::<_, Option<String>>("notes")?,
            "soundcheck": row.get::<_, Option<String>>("soundcheck")?,
            "attendanceCount": row.get::<_, Option<i64>>("attendance_count")?,
            "rarityIndex": row.get::<_, Option<f64>>("rarity_index")?,
            "songCount": row.get::<_, Option<i64>>("song_count")?,
            "venue": venue_json,
            "tour": tour_json,
            "year": extract_year(&date),
        }))
    })?;
    collect_rows(rows)
}

fn export_setlist_entries(
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
            .cloned()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let show = shows_by_id
            .get(&show_id)
            .cloned()
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
            "isSegue": row.get::<_, i64>("is_segue")? != 0,
            "isTease": row.get::<_, i64>("is_tease")? != 0,
            "teaseOfSongId": row.get::<_, Option<i64>>("tease_of_song_id")?,
            "notes": row.get::<_, Option<String>>("notes")?,
            "song": song_json,
            "showDate": show_date,
            "year": year,
        }))
    })?;
    collect_rows(rows)
}

fn export_guests(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM guests ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let instruments = parse_json_field(row.get::<_, Option<String>>("instruments")?);
        let name: String = row.get("name")?;
        let search_text = create_search_text(&[
            Some(name.clone()),
            instruments.as_ref().and_then(|v| v.as_array()).map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .collect::<Vec<_>>()
                    .join(" ")
            }),
        ]);
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "name": name,
            "slug": row.get::<_, String>("slug")?,
            "instruments": instruments,
            "totalAppearances": row.get::<_, Option<i64>>("total_appearances")?,
            "firstAppearanceDate": row.get::<_, Option<String>>("first_appearance_date")?,
            "lastAppearanceDate": row.get::<_, Option<String>>("last_appearance_date")?,
            "notes": row.get::<_, Option<String>>("notes")?,
            "albums": parse_json_field(row.get::<_, Option<String>>("albums")?),
            "searchText": search_text,
        }))
    })?;
    collect_rows(rows)
}

fn export_guest_appearances(conn: &Connection, shows: &[Value]) -> Result<Vec<Value>> {
    let shows_by_id = map_by_id(shows);
    let mut stmt = conn.prepare("SELECT * FROM guest_appearances ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let show_id: i64 = row.get("show_id")?;
        let show = shows_by_id
            .get(&show_id)
            .cloned()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        let setlist_entry_id: Option<i64> = row.get("setlist_entry_id")?;
        let song_id = if let Some(entry_id) = setlist_entry_id {
            conn.query_row(
                "SELECT song_id FROM setlist_entries WHERE id = ?",
                [entry_id],
                |row| row.get::<_, i64>(0),
            )
            .ok()
        } else {
            None
        };
        let show_date = show
            .get("date")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "guestId": row.get::<_, i64>("guest_id")?,
            "showId": show_id,
            "setlistEntryId": setlist_entry_id,
            "songId": song_id,
            "instruments": parse_json_field(row.get::<_, Option<String>>("instruments")?),
            "notes": row.get::<_, Option<String>>("notes")?,
            "showDate": show_date.clone(),
            "year": extract_year(&show_date),
        }))
    })?;
    collect_rows(rows)
}

fn export_liberation_list(conn: &Connection) -> Result<Vec<Value>> {
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
            "lastPlayedDate": row.get::<_, Option<String>>("last_played_date")?.unwrap_or_default(),
            "lastPlayedShowId": row.get::<_, i64>("last_played_show_id")?,
            "daysSince": days_since,
            "showsSince": shows_since,
            "notes": row.get::<_, Option<String>>("notes")?,
            "configuration": row.get::<_, Option<String>>("configuration")?,
            "isLiberated": row.get::<_, i64>("is_liberated")? != 0,
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

fn export_song_statistics(conn: &Connection) -> Result<Vec<Value>> {
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

fn export_curated_lists(conn: &Connection) -> Result<Vec<Value>> {
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
            "isFeatured": row.get::<_, i64>("is_featured")? != 0,
            "sortOrder": row.get::<_, Option<i64>>("sort_order")?,
            "createdAt": row.get::<_, String>("created_at")?,
            "updatedAt": row.get::<_, String>("updated_at")?,
        }))
    })?;
    collect_rows(rows)
}

fn export_curated_list_items(conn: &Connection) -> Result<Vec<Value>> {
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
            "itemTitle": row.get::<_, String>("item_title")?,
            "itemLink": row.get::<_, Option<String>>("item_link")?,
            "notes": row.get::<_, Option<String>>("notes")?,
            "metadata": row.get::<_, Option<String>>("metadata")?,
            "createdAt": row.get::<_, String>("created_at")?,
        }))
    })?;
    collect_rows(rows)
}

fn export_releases(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM releases ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "title": row.get::<_, String>("title")?,
            "slug": row.get::<_, String>("slug")?,
            "releaseType": row.get::<_, Option<String>>("release_type")?,
            "releaseDate": row.get::<_, Option<String>>("release_date")?,
            "catalogNumber": row.get::<_, Option<String>>("catalog_number")?,
            "coverArtUrl": row.get::<_, Option<String>>("cover_art_url")?,
            "trackCount": row.get::<_, Option<i64>>("track_count")?,
            "notes": row.get::<_, Option<String>>("notes")?,
        }))
    })?;
    collect_rows(rows)
}

fn export_release_tracks(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM release_tracks ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "releaseId": row.get::<_, i64>("release_id")?,
            "songId": row.get::<_, Option<i64>>("song_id")?,
            "trackNumber": row.get::<_, i64>("track_number")?,
            "discNumber": row.get::<_, i64>("disc_number")?,
            "durationSeconds": row.get::<_, Option<i64>>("duration_seconds")?,
            "showId": row.get::<_, Option<i64>>("show_id")?,
            "notes": row.get::<_, Option<String>>("notes")?,
        }))
    })?;
    collect_rows(rows)
}

fn collect_rows<I>(rows: I) -> Result<Vec<Value>>
where
    I: Iterator<Item = rusqlite::Result<Value>>,
{
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

fn map_by_id(items: &[Value]) -> HashMap<i64, Value> {
    let mut map = HashMap::new();
    for item in items {
        if let Some(id) = item.get("id").and_then(|v| v.as_i64()) {
            map.insert(id, item.clone());
        }
    }
    map
}

fn extract_year(date: &str) -> i64 {
    let trimmed = date.trim();
    let year = trimmed
        .split('-')
        .next()
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0);
    if year == 0 && !trimmed.is_empty() {
        tracing::warn!(
            value = trimmed,
            "export: failed to extract year from date; defaulting to 0"
        );
    }
    year
}

fn create_search_text(parts: &[Option<String>]) -> String {
    parts
        .iter()
        .filter_map(|part| part.as_ref())
        .map(|part| part.trim())
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn parse_json_field(value: Option<String>) -> Option<Value> {
    value.and_then(|raw| serde_json::from_str(&raw).ok())
}

fn opt_i64_or_warn(value: Option<i64>, context: &str, field: &str) -> i64 {
    match value {
        Some(v) => v,
        None => {
            tracing::warn!(context, field, "export: missing i64 field; defaulting to 0");
            0
        }
    }
}

fn write_json_array(output_dir: &Path, name: &str, data: &[Value]) -> Result<FileMeta> {
    let path = output_dir.join(name);
    let file = fs::File::create(&path).with_context(|| format!("write {}", path.display()))?;
    serde_json::to_writer_pretty(file, data).context("serialize json")?;
    let size = fs::metadata(&path)?.len();
    Ok(FileMeta {
        name: name.to_string(),
        path,
        size,
        record_count: data.len(),
    })
}

fn write_json_array_chunks(
    output_dir: &Path,
    prefix: &str,
    data: &[Value],
    chunk_size: usize,
) -> Result<Vec<FileMeta>> {
    let chunk_total = data.len().max(1).div_ceil(chunk_size.max(1));
    let mut chunks = Vec::with_capacity(chunk_total);
    for chunk_index in 0..chunk_total {
        let start = chunk_index * chunk_size;
        let end = (start + chunk_size).min(data.len());
        let name = format!("{prefix}{:04}.json", chunk_index + 1);
        chunks.push(write_json_array(output_dir, &name, &data[start..end])?);
    }
    Ok(chunks)
}

fn write_json_value(output_dir: &Path, name: &str, data: &Value) -> Result<FileMeta> {
    let path = output_dir.join(name);
    let file = fs::File::create(&path).with_context(|| format!("write {}", path.display()))?;
    serde_json::to_writer_pretty(file, data).context("serialize json")?;
    let size = fs::metadata(&path)?.len();
    let record_count = data.as_array().map(|arr| arr.len()).unwrap_or(1);
    Ok(FileMeta {
        name: name.to_string(),
        path,
        size,
        record_count,
    })
}
