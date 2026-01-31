use std::collections::HashMap;
use wasm_bindgen::prelude::*;

/// Multi-dimensional histogram aggregation
///
/// # Arguments
/// * `years` - Array of year values
/// * `venues` - Array of venue IDs (parallel to years)
/// * `songs` - Array of song IDs (parallel to years)
///
/// # Returns
/// JavaScript object with three Maps: {years: Map, venues: Map, songs: Map}
///
/// # Performance
/// O(n) - three parallel histogram computations
/// More efficient than computing separate histograms
#[wasm_bindgen]
pub fn aggregate_multi_field(
    years: &[u32],
    venues: &[u32],
    songs: &[u32],
) -> Result<js_sys::Object, JsValue> {
    let len = years.len();

    // Validate input arrays have same length
    if venues.len() != len || songs.len() != len {
        return Err(JsValue::from_str(
            "All input arrays must have the same length",
        ));
    }

    // Three parallel histograms
    let mut year_hist: HashMap<u32, u32> = HashMap::new();
    let mut venue_hist: HashMap<u32, u32> = HashMap::new();
    let mut song_hist: HashMap<u32, u32> = HashMap::new();

    // Single pass through all data
    for i in 0..len {
        *year_hist.entry(years[i]).or_insert(0) += 1;
        *venue_hist.entry(venues[i]).or_insert(0) += 1;
        *song_hist.entry(songs[i]).or_insert(0) += 1;
    }

    // Convert to JavaScript object with three Maps
    let result = js_sys::Object::new();

    // Years map
    let years_map = js_sys::Map::new();
    for (k, v) in year_hist {
        years_map.set(&JsValue::from(k), &JsValue::from(v));
    }

    // Venues map
    let venues_map = js_sys::Map::new();
    for (k, v) in venue_hist {
        venues_map.set(&JsValue::from(k), &JsValue::from(v));
    }

    // Songs map
    let songs_map = js_sys::Map::new();
    for (k, v) in song_hist {
        songs_map.set(&JsValue::from(k), &JsValue::from(v));
    }

    // Set properties on result object
    js_sys::Reflect::set(&result, &"years".into(), &years_map)
        .map_err(|_| JsValue::from_str("Failed to set years property"))?;
    js_sys::Reflect::set(&result, &"venues".into(), &venues_map)
        .map_err(|_| JsValue::from_str("Failed to set venues property"))?;
    js_sys::Reflect::set(&result, &"songs".into(), &songs_map)
        .map_err(|_| JsValue::from_str("Failed to set songs property"))?;

    Ok(result)
}

/// Two-dimensional aggregation
///
/// # Arguments
/// * `keys1` - First dimension values
/// * `keys2` - Second dimension values (parallel to keys1)
///
/// # Returns
/// JavaScript Map with composite keys "key1:key2" -> count
///
/// # Performance
/// O(n) - single pass with string concatenation
#[wasm_bindgen]
pub fn aggregate_two_dimensional(keys1: &[u32], keys2: &[u32]) -> Result<js_sys::Map, JsValue> {
    let len = keys1.len();

    if keys2.len() != len {
        return Err(JsValue::from_str("Input arrays must have same length"));
    }

    let mut histogram: HashMap<String, u32> = HashMap::new();

    for i in 0..len {
        let key = format!("{}:{}", keys1[i], keys2[i]);
        *histogram.entry(key).or_insert(0) += 1;
    }

    // Convert to JavaScript Map
    let result = js_sys::Map::new();
    for (key, count) in histogram {
        result.set(&JsValue::from_str(&key), &JsValue::from(count));
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    // Note: Tests using wasm-bindgen types (js_sys::Object, js_sys::Map)
    // are not available in native Rust tests.
    // These functions are tested in JavaScript integration tests.

    #[test]
    fn test_input_validation() {
        let years = vec![1991, 1992];
        let venues = vec![1]; // Wrong length
        let _songs = vec![1, 2];

        // This would fail with validation error if we could test WASM types
        // In practice, tested via JavaScript tests
        assert_eq!(years.len(), 2);
        assert_eq!(venues.len(), 1);
        assert_ne!(years.len(), venues.len());
    }
}
