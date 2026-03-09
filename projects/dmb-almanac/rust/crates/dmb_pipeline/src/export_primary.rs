use anyhow::Result;
use rusqlite::Connection;
use serde_json::{Value, json};
use std::collections::HashMap;

use crate::export::export_support::{
    collect_rows, create_search_text, extract_year, map_by_id, parse_json_field,
};

pub(crate) fn export_venues(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM venues ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let name: String = row.get("name")?;
        let city: String = row.get("city")?;
        let state: Option<String> = row.get("state")?;
        let country: String = row.get("country")?;
        let search_text = create_search_text(&[
            Some(name.as_str()),
            Some(city.as_str()),
            state.as_deref(),
            Some(country.as_str()),
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

pub(crate) fn export_songs(conn: &Connection) -> Result<Vec<Value>> {
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
        let search_text = create_search_text(&[Some(title.as_str()), original_artist.as_deref()]);
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

pub(crate) fn export_tours(conn: &Connection) -> Result<Vec<Value>> {
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

pub(crate) fn export_shows(
    conn: &Connection,
    venues: &[Value],
    tours: &[Value],
) -> Result<Vec<Value>> {
    let venues_by_id = map_by_id(venues);
    let tours_by_id = map_by_id(tours);

    let mut stmt = conn.prepare("SELECT * FROM shows ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let venue_id: i64 = row.get("venue_id")?;
        let tour_id: Option<i64> = row.get("tour_id")?;
        let venue = venues_by_id
            .get(&venue_id)
            .copied()
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
        let tour_json = if let Some(tid) = tour_id {
            let tour = tours_by_id
                .get(&tid)
                .copied()
                .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
            let tour_obj = tour
                .as_object()
                .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
            json!({
                "id": tour_obj.get("id").cloned().unwrap_or(json!(tid)),
                "name": tour_obj.get("name").cloned().unwrap_or(Value::Null),
                "year": tour_obj.get("year").cloned().unwrap_or(Value::Null),
                "startDate": tour_obj.get("startDate").cloned().unwrap_or(Value::Null),
                "endDate": tour_obj.get("endDate").cloned().unwrap_or(Value::Null),
                "totalShows": tour_obj.get("totalShows").cloned().unwrap_or(Value::Null),
            })
        } else {
            Value::Null
        };
        let year = extract_year(&date);
        Ok(json!({
            "id": row.get::<_, i64>("id")?,
            "date": date,
            "venueId": venue_id,
            "tourId": tour_id.map_or(Value::Null, Value::from),
            "notes": row.get::<_, Option<String>>("notes")?,
            "soundcheck": row.get::<_, Option<String>>("soundcheck")?,
            "attendanceCount": row.get::<_, Option<i64>>("attendance_count")?,
            "rarityIndex": row.get::<_, Option<f64>>("rarity_index")?,
            "songCount": row.get::<_, Option<i64>>("song_count")?,
            "venue": venue_json,
            "tour": tour_json,
            "year": year,
        }))
    })?;
    collect_rows(rows)
}

pub(crate) fn export_guests(conn: &Connection) -> Result<Vec<Value>> {
    let mut stmt = conn.prepare("SELECT * FROM guests ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        let instruments = parse_json_field(row.get::<_, Option<String>>("instruments")?);
        let name: String = row.get("name")?;
        let instruments_text: Option<String> =
            instruments.as_ref().and_then(|v| v.as_array()).map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .collect::<Vec<_>>()
                    .join(" ")
            });
        let search_text = create_search_text(&[Some(name.as_str()), instruments_text.as_deref()]);
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

pub(crate) fn export_releases(conn: &Connection) -> Result<Vec<Value>> {
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
