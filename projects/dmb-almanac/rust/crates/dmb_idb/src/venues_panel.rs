use wasm_bindgen::JsValue;

use dmb_core::Venue;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
type GeoCounts = (Vec<(String, u32)>, Vec<(String, u32)>);

#[cfg(target_arch = "wasm32")]
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct VenueGeoRow {
    country: String,
    state: Option<String>,
    total_shows: Option<i32>,
}

#[cfg(target_arch = "wasm32")]
fn accumulate_geo_totals(
    country_map: &mut std::collections::HashMap<String, u32>,
    state_map: &mut std::collections::HashMap<String, u32>,
    country: &str,
    state: Option<&str>,
    total: u32,
) {
    *country_map.entry(country.to_string()).or_insert(0) += total;
    if country == "US" || country == "United States" {
        if let Some(state) = state {
            if !state.is_empty() {
                *state_map.entry(state.to_string()).or_insert(0) += total;
            }
        }
    }
}

#[cfg(target_arch = "wasm32")]
fn sort_geo_counts(
    country_map: std::collections::HashMap<String, u32>,
    state_map: std::collections::HashMap<String, u32>,
) -> GeoCounts {
    let mut shows_by_country: Vec<(String, u32)> = country_map.into_iter().collect();
    shows_by_country.sort_by(|a, b| b.1.cmp(&a.1));

    let mut shows_by_state: Vec<(String, u32)> = state_map.into_iter().collect();
    shows_by_state.sort_by(|a, b| b.1.cmp(&a.1));

    (shows_by_country, shows_by_state)
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_venue_shows_by_geo() -> Result<GeoCounts> {
    use crate::JsResultExt;

    let db = crate::open_db().await?;
    let tx = db
        .transaction(&[crate::TABLE_VENUES], idb::TransactionMode::ReadOnly)
        .js()?;
    let store = tx.object_store(crate::TABLE_VENUES).js()?;
    let mut request = store
        .open_cursor(None, Some(idb::CursorDirection::Next))
        .js()?;
    let mut cursor_opt = request.await.js()?;
    let mut country_map = std::collections::HashMap::new();
    let mut state_map = std::collections::HashMap::new();

    while let Some(cursor) = cursor_opt {
        let value = cursor.value().js()?;
        let venue: VenueGeoRow = crate::deserialize_value(value)?;
        let total = venue.total_shows.unwrap_or(0) as u32;
        accumulate_geo_totals(
            &mut country_map,
            &mut state_map,
            &venue.country,
            venue.state.as_deref(),
            total,
        );

        request = cursor.next(None).js()?;
        cursor_opt = request.await.js()?;
    }

    tx.await.js()?;

    Ok(sort_geo_counts(country_map, state_map))
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_venues_panel_data(
    top_venues_limit: usize,
) -> Result<(Vec<Venue>, Vec<(String, u32)>, Vec<(String, u32)>)> {
    use crate::JsResultExt;

    let db = crate::open_db().await?;
    let tx = db
        .transaction(&[crate::TABLE_VENUES], idb::TransactionMode::ReadOnly)
        .js()?;
    let store = tx.object_store(crate::TABLE_VENUES).js()?;
    let index = store.index("totalShows").js()?;
    let mut request = index
        .open_cursor(None, Some(idb::CursorDirection::Prev))
        .js()?;
    let mut cursor_opt = request.await.js()?;
    let mut top_venues: Vec<Venue> = Vec::with_capacity(top_venues_limit);
    let mut country_map = std::collections::HashMap::new();
    let mut state_map = std::collections::HashMap::new();

    while let Some(cursor) = cursor_opt {
        let value = cursor.value().js()?;
        if top_venues.len() < top_venues_limit {
            let venue: Venue = crate::deserialize_value(value)?;
            let total = venue.total_shows.unwrap_or(0) as u32;
            accumulate_geo_totals(
                &mut country_map,
                &mut state_map,
                &venue.country,
                venue.state.as_deref(),
                total,
            );
            top_venues.push(venue);
        } else {
            let venue: VenueGeoRow = crate::deserialize_value(value)?;
            let total = venue.total_shows.unwrap_or(0) as u32;
            accumulate_geo_totals(
                &mut country_map,
                &mut state_map,
                &venue.country,
                venue.state.as_deref(),
                total,
            );
        }

        request = cursor.next(None).js()?;
        cursor_opt = request.await.js()?;
    }

    tx.await.js()?;

    let (shows_by_country, shows_by_state) = sort_geo_counts(country_map, state_map);
    Ok((top_venues, shows_by_country, shows_by_state))
}

#[cfg(not(target_arch = "wasm32"))]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(not(target_arch = "wasm32"))]
pub async fn stats_venue_shows_by_geo() -> Result<(Vec<(String, u32)>, Vec<(String, u32)>)> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn stats_venues_panel_data(
    _top_venues_limit: usize,
) -> Result<(Vec<Venue>, Vec<(String, u32)>, Vec<(String, u32)>)> {
    crate::idb_fallback::idb_unavailable()
}
