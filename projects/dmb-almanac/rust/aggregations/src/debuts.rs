use std::collections::HashMap;
use wasm_bindgen::prelude::*;

/// Calculate song debut dates (first performance)
///
/// # Arguments
/// * `setlists_json` - JSON string of setlist array [{date: string, songs: [song_id]}]
///
/// # Returns
/// JavaScript Map with song_id -> debut_date_string
///
/// # Performance
/// O(n*m) single-pass algorithm where n=setlists, m=avg songs per setlist
/// Uses HashMap to track earliest date per song
#[wasm_bindgen]
pub fn calculate_song_debuts(setlists_json: &str) -> Result<js_sys::Map, JsValue> {
    // Parse JSON
    let setlists: Vec<SetlistData> = serde_json::from_str(setlists_json)
        .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;

    // Track earliest date for each song
    let mut song_debuts: HashMap<String, String> = HashMap::new();

    for setlist in setlists {
        for song in setlist.songs {
            song_debuts
                .entry(song)
                .and_modify(|debut_date| {
                    if setlist.date < *debut_date {
                        *debut_date = setlist.date.clone();
                    }
                })
                .or_insert_with(|| setlist.date.clone());
        }
    }

    // Convert to JavaScript Map
    let result = js_sys::Map::new();
    for (song, debut_date) in song_debuts {
        result.set(&JsValue::from_str(&song), &JsValue::from_str(&debut_date));
    }

    Ok(result)
}

/// Calculate song debuts with show count
///
/// # Arguments
/// * `setlists_json` - JSON string of setlist array [{date: string, songs: [song_id]}]
///
/// # Returns
/// JavaScript Map with song_id -> {debutDate: string, totalShows: number}
#[wasm_bindgen]
pub fn calculate_song_debuts_with_count(setlists_json: &str) -> Result<js_sys::Map, JsValue> {
    let setlists: Vec<SetlistData> = serde_json::from_str(setlists_json)
        .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;

    let mut song_stats: HashMap<String, SongDebut> = HashMap::new();

    for setlist in setlists {
        for song in setlist.songs {
            let stats = song_stats.entry(song).or_insert_with(|| SongDebut {
                debut_date: setlist.date.clone(),
                count: 0,
            });

            stats.count += 1;

            if setlist.date < stats.debut_date {
                stats.debut_date = setlist.date.clone();
            }
        }
    }

    // Convert to JavaScript Map
    let result = js_sys::Map::new();
    for (song, stats) in song_stats {
        let obj = js_sys::Object::new();
        js_sys::Reflect::set(
            &obj,
            &"debutDate".into(),
            &JsValue::from_str(&stats.debut_date),
        )?;
        js_sys::Reflect::set(&obj, &"totalShows".into(), &JsValue::from(stats.count))?;

        result.set(&JsValue::from_str(&song), &obj);
    }

    Ok(result)
}

/// Find songs that debuted in a specific year
///
/// # Arguments
/// * `setlists_json` - JSON string of setlist array [{date: string, songs: [song_id]}]
/// * `year` - Year to filter debuts (e.g., 1991)
///
/// # Returns
/// JavaScript Array of song names that debuted in the specified year
#[wasm_bindgen]
pub fn songs_debuted_in_year(setlists_json: &str, year: u32) -> Result<js_sys::Array, JsValue> {
    let setlists: Vec<SetlistData> = serde_json::from_str(setlists_json)
        .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;

    let mut song_debuts: HashMap<String, String> = HashMap::new();

    // Find debut date for each song
    for setlist in setlists {
        for song in setlist.songs {
            song_debuts
                .entry(song)
                .and_modify(|debut_date| {
                    if setlist.date < *debut_date {
                        *debut_date = setlist.date.clone();
                    }
                })
                .or_insert_with(|| setlist.date.clone());
        }
    }

    // Filter songs that debuted in target year
    let year_str = year.to_string();
    let mut debuts_in_year: Vec<String> = song_debuts
        .into_iter()
        .filter(|(_, debut_date)| debut_date.starts_with(&year_str))
        .map(|(song, _)| song)
        .collect();

    // Sort alphabetically
    debuts_in_year.sort();

    // Convert to JavaScript Array
    let result = js_sys::Array::new();
    for song in debuts_in_year {
        result.push(&JsValue::from_str(&song));
    }

    Ok(result)
}

#[derive(serde::Deserialize)]
struct SetlistData {
    date: String,
    songs: Vec<String>,
}

struct SongDebut {
    debut_date: String,
    count: u32,
}

#[cfg(test)]
mod tests {
    // Note: Tests for song debut functions are skipped because they use
    // wasm-bindgen types (js_sys::Map, js_sys::Array) which are not available
    // in native Rust tests. These functions are tested in JavaScript integration tests.
}
