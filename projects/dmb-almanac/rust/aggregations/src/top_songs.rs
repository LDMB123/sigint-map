use std::cmp::Reverse;
use std::collections::{BinaryHeap, HashMap};
use wasm_bindgen::prelude::*;

/// Calculate top-N most performed songs all-time using min-heap
///
/// # Arguments
/// * `setlists_json` - JSON string of setlist array [{songs: [song_id]}]
/// * `limit` - Number of top songs to return
///
/// # Returns
/// JavaScript Array of {song: string, count: number} sorted by count descending
///
/// # Performance
/// O(n log k) time complexity using min-heap of size k
/// More efficient than full sort for k << n
#[wasm_bindgen]
pub fn top_songs_all_time(setlists_json: &str, limit: usize) -> Result<js_sys::Array, JsValue> {
    // Parse JSON
    let setlists: Vec<SetlistData> = serde_json::from_str(setlists_json)
        .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;

    // Count song frequencies
    let mut song_counts: HashMap<String, u32> = HashMap::new();

    for setlist in setlists {
        for song in setlist.songs {
            *song_counts.entry(song).or_insert(0) += 1;
        }
    }

    // Use min-heap to get top-k efficiently
    // BinaryHeap is max-heap by default, so use Reverse for min-heap
    let mut heap: BinaryHeap<Reverse<(u32, String)>> = BinaryHeap::new();

    for (song, count) in song_counts {
        if heap.len() < limit {
            heap.push(Reverse((count, song)));
        } else if let Some(&Reverse((min_count, _))) = heap.peek() {
            if count > min_count {
                heap.pop();
                heap.push(Reverse((count, song)));
            }
        }
    }

    // Extract and sort results
    let mut results: Vec<(u32, String)> = heap.into_iter().map(|Reverse(item)| item).collect();

    // Sort descending by count (stable sort for ties)
    results.sort_by(|a, b| b.0.cmp(&a.0));

    // Convert to JavaScript Array
    let js_array = js_sys::Array::new();
    for (count, song) in results {
        let obj = js_sys::Object::new();
        js_sys::Reflect::set(&obj, &"song".into(), &JsValue::from_str(&song))
            .map_err(|_| JsValue::from_str("Failed to set song property"))?;
        js_sys::Reflect::set(&obj, &"count".into(), &JsValue::from(count))
            .map_err(|_| JsValue::from_str("Failed to set count property"))?;
        js_array.push(&obj);
    }

    Ok(js_array)
}

/// Calculate top-N songs with full metadata
///
/// # Arguments
/// * `setlists_json` - JSON string of setlist array [{date: string, songs: [song_id]}]
/// * `limit` - Number of top songs to return
///
/// # Returns
/// JavaScript Array with song stats including first/last performance dates
#[wasm_bindgen]
pub fn top_songs_with_metadata(
    setlists_json: &str,
    limit: usize,
) -> Result<js_sys::Array, JsValue> {
    let setlists: Vec<SetlistWithDate> = serde_json::from_str(setlists_json)
        .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;

    // Track counts and dates
    let mut song_stats: HashMap<String, SongStats> = HashMap::new();

    for setlist in setlists {
        for song in setlist.songs {
            let stats = song_stats.entry(song).or_insert_with(|| SongStats {
                count: 0,
                first_date: setlist.date.clone(),
                last_date: setlist.date.clone(),
            });

            stats.count += 1;

            if setlist.date < stats.first_date {
                stats.first_date = setlist.date.clone();
            }
            if setlist.date > stats.last_date {
                stats.last_date = setlist.date.clone();
            }
        }
    }

    // Convert to vec and sort
    let mut results: Vec<(String, SongStats)> = song_stats.into_iter().collect();
    results.sort_by(|a, b| b.1.count.cmp(&a.1.count));
    results.truncate(limit);

    // Convert to JavaScript Array
    let js_array = js_sys::Array::new();
    for (song, stats) in results {
        let obj = js_sys::Object::new();
        js_sys::Reflect::set(&obj, &"song".into(), &JsValue::from_str(&song))?;
        js_sys::Reflect::set(&obj, &"count".into(), &JsValue::from(stats.count))?;
        js_sys::Reflect::set(
            &obj,
            &"firstDate".into(),
            &JsValue::from_str(&stats.first_date),
        )?;
        js_sys::Reflect::set(
            &obj,
            &"lastDate".into(),
            &JsValue::from_str(&stats.last_date),
        )?;
        js_array.push(&obj);
    }

    Ok(js_array)
}

#[derive(serde::Deserialize)]
struct SetlistData {
    songs: Vec<String>,
}

#[derive(serde::Deserialize)]
struct SetlistWithDate {
    date: String,
    songs: Vec<String>,
}

struct SongStats {
    count: u32,
    first_date: String,
    last_date: String,
}

#[cfg(test)]
mod tests {
    // Note: Tests for top_songs_all_time and top_songs_with_metadata are skipped
    // because they use wasm-bindgen types (js_sys::Array, js_sys::Object)
    // which are not available in native Rust tests.
    // These functions are tested in JavaScript integration tests.
}
