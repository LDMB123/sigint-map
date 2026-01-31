use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;

/// Count unique songs per year using HashMap-based deduplication
///
/// # Arguments
/// * `songs` - JavaScript Array of song objects with {year: number, song: string}
///
/// # Returns
/// JavaScript Map with year -> unique song count
///
/// # Performance
/// O(n) time complexity with HashSet deduplication per year
#[wasm_bindgen]
pub fn unique_songs_per_year(songs: &js_sys::Array) -> js_sys::Map {
    let mut year_songs: HashMap<u32, HashSet<String>> = HashMap::new();

    for item in songs.iter() {
        // Extract year and song name from JS object
        let obj = js_sys::Object::from(item);

        let year = js_sys::Reflect::get(&obj, &"year".into())
            .ok()
            .and_then(|v| v.as_f64())
            .map(|v| v as u32);

        let song = js_sys::Reflect::get(&obj, &"song".into())
            .ok()
            .and_then(|v| v.as_string());

        if let (Some(year), Some(song)) = (year, song) {
            year_songs.entry(year).or_default().insert(song);
        }
    }

    // Convert to JavaScript Map
    let result = js_sys::Map::new();
    for (year, songs) in year_songs {
        result.set(&JsValue::from(year), &JsValue::from(songs.len() as u32));
    }

    result
}

/// Count unique songs per year from JSON array (enhanced version)
///
/// # Arguments
/// * `setlists_json` - JSON string of setlist array [{year: u32, songs: [song_id]}]
///
/// # Returns
/// JavaScript Map with year -> unique song count
///
/// # Performance
/// Single-pass O(n*m) where n=setlists, m=avg songs per setlist
#[wasm_bindgen]
pub fn unique_songs_per_year_json(setlists_json: &str) -> Result<js_sys::Map, JsValue> {
    let year_songs =
        parse_unique_songs_per_year(setlists_json).map_err(|e| JsValue::from_str(&e))?;

    // Convert to JavaScript Map
    let result = js_sys::Map::new();
    for (year, songs) in year_songs {
        result.set(&JsValue::from(year), &JsValue::from(songs.len() as u32));
    }

    Ok(result)
}

// Pure Rust function for testing
fn parse_unique_songs_per_year(
    setlists_json: &str,
) -> Result<HashMap<u32, HashSet<String>>, String> {
    let setlists: Vec<SetlistData> =
        serde_json::from_str(setlists_json).map_err(|e| format!("JSON parse error: {}", e))?;

    let mut year_songs: HashMap<u32, HashSet<String>> = HashMap::new();

    // Single pass through all setlists
    for setlist in setlists {
        let year_set = year_songs.entry(setlist.year).or_default();
        for song in setlist.songs {
            year_set.insert(song);
        }
    }

    Ok(year_songs)
}

#[derive(serde::Deserialize)]
struct SetlistData {
    year: u32,
    songs: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unique_songs_per_year_json() {
        let json = r##"[
            {"year": 1991, "songs": ["#41", "Ants Marching", "#41"]},
            {"year": 1991, "songs": ["Warehouse", "Ants Marching"]},
            {"year": 1992, "songs": ["Tripping Billies"]}
        ]"##;

        let result = parse_unique_songs_per_year(json).unwrap();

        // Should have 2 years
        assert_eq!(result.len(), 2);

        // 1991 should have 3 unique songs: #41, Ants Marching, Warehouse
        assert_eq!(result.get(&1991).unwrap().len(), 3);

        // 1992 should have 1 unique song
        assert_eq!(result.get(&1992).unwrap().len(), 1);
    }

    #[test]
    fn test_unique_songs_empty() {
        let json = r##"[]"##;
        let result = parse_unique_songs_per_year(json).unwrap();
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_unique_songs_invalid_json() {
        let json = r##"invalid json"##;
        let result = parse_unique_songs_per_year(json);
        assert!(result.is_err());
    }
}
