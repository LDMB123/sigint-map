use std::collections::HashMap;
use wasm_bindgen::prelude::*;

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
