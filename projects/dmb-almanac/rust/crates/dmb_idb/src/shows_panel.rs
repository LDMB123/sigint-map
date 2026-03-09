use wasm_bindgen::JsValue;

use dmb_core::Tour;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
type YearCountSeries = Vec<(u32, u32)>;

#[cfg(target_arch = "wasm32")]
type RarityFiveNum = (f64, f64, f64, f64, f64);

#[cfg(target_arch = "wasm32")]
type ShowDistributions = (YearCountSeries, YearCountSeries, RarityFiveNum);

#[cfg(target_arch = "wasm32")]
fn percentile_sorted(values: &[f64], percentile: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    if values.len() == 1 {
        return values[0];
    }

    let rank = percentile * (values.len() - 1) as f64;
    let lower_index = rank.floor() as usize;
    let upper_index = rank.ceil() as usize;

    if upper_index >= values.len() {
        return values[values.len() - 1];
    }
    if lower_index == upper_index {
        return values[lower_index];
    }

    let lower_value = values[lower_index];
    let upper_value = values[upper_index];
    let fraction = rank - lower_index as f64;
    lower_value + fraction * (upper_value - lower_value)
}

#[cfg(target_arch = "wasm32")]
fn show_distributions_from_histograms(
    shows_by_year_hist: &[u32; 60],
    shows_by_decade_hist: &[u32; 5],
    rarity_values: &[f64],
) -> ShowDistributions {
    let rarity_summary = if rarity_values.is_empty() {
        (0.0, 0.0, 0.0, 0.0, 0.0)
    } else {
        let q1 = percentile_sorted(rarity_values, 0.25);
        let median = percentile_sorted(rarity_values, 0.5);
        let q3 = percentile_sorted(rarity_values, 0.75);
        let min = rarity_values[0];
        let max = rarity_values[rarity_values.len() - 1];
        (min, q1, median, q3, max)
    };
    let shows_by_year: Vec<(u32, u32)> = shows_by_year_hist
        .iter()
        .enumerate()
        .filter_map(|(idx, count)| {
            if *count > 0 {
                Some((1991 + idx as u32, *count))
            } else {
                None
            }
        })
        .collect();
    let shows_by_decade: Vec<(u32, u32)> = shows_by_decade_hist
        .iter()
        .enumerate()
        .filter_map(|(idx, count)| {
            if *count > 0 {
                Some((1990 + (idx as u32 * 10), *count))
            } else {
                None
            }
        })
        .collect();
    (shows_by_year, shows_by_decade, rarity_summary)
}

#[cfg(target_arch = "wasm32")]
async fn show_distributions_from_store(store: &idb::ObjectStore) -> Result<ShowDistributions> {
    use crate::JsResultExt;

    let mut shows_by_year_hist = [0u32; 60]; // 1991..=2050
    let mut shows_by_decade_hist = [0u32; 5]; // 1990s..2030s
    let year_index = store.index("year").js()?;
    let mut request = year_index
        .open_key_cursor(None, Some(idb::CursorDirection::Next))
        .js()?;
    let mut cursor_opt = request.await.js()?;
    while let Some(cursor) = cursor_opt {
        let key = cursor.key().js()?;
        if let Some(year_raw) = key.as_f64() {
            if year_raw.is_finite() && year_raw >= 0.0 {
                let year = year_raw as u32;
                if (1991..=2050).contains(&year) {
                    shows_by_year_hist[(year - 1991) as usize] += 1;
                }
                if (1990..2040).contains(&year) {
                    shows_by_decade_hist[((year - 1990) / 10) as usize] += 1;
                }
            }
        }

        request = cursor.next(None).js()?;
        cursor_opt = request.await.js()?;
    }

    let rarity_index = store.index("rarityIndex").js()?;
    let mut request = rarity_index
        .open_key_cursor(None, Some(idb::CursorDirection::Next))
        .js()?;
    let mut cursor_opt = request.await.js()?;
    let mut rarity_values: Vec<f64> = Vec::new();
    while let Some(cursor) = cursor_opt {
        let key = cursor.key().js()?;
        if let Some(rarity) = key.as_f64() {
            if rarity.is_finite() {
                rarity_values.push(rarity);
            }
        }

        request = cursor.next(None).js()?;
        cursor_opt = request.await.js()?;
    }

    Ok(show_distributions_from_histograms(
        &shows_by_year_hist,
        &shows_by_decade_hist,
        &rarity_values,
    ))
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_shows_panel_data(
    recent_tours_limit: usize,
) -> Result<(
    Vec<(u32, u32)>,
    Vec<(u32, u32)>,
    (f64, f64, f64, f64, f64),
    Vec<Tour>,
)> {
    use crate::JsResultExt;

    let db = crate::open_db().await?;
    let tx = db
        .transaction(
            &[crate::TABLE_SHOWS, crate::TABLE_TOURS],
            idb::TransactionMode::ReadOnly,
        )
        .js()?;

    let shows_store = tx.object_store(crate::TABLE_SHOWS).js()?;
    let (shows_by_year, shows_by_decade, rarity_summary) =
        show_distributions_from_store(&shows_store).await?;

    let tours_store = tx.object_store(crate::TABLE_TOURS).js()?;
    let recent_tours = crate::panel_support::top_rows_by_index_from_store::<Tour>(
        &tours_store,
        "year",
        recent_tours_limit,
    )
    .await?;

    tx.await.js()?;

    Ok((shows_by_year, shows_by_decade, rarity_summary, recent_tours))
}

#[cfg(not(target_arch = "wasm32"))]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(not(target_arch = "wasm32"))]
pub async fn stats_shows_panel_data(
    _recent_tours_limit: usize,
) -> Result<(
    Vec<(u32, u32)>,
    Vec<(u32, u32)>,
    (f64, f64, f64, f64, f64),
    Vec<Tour>,
)> {
    crate::idb_fallback::idb_unavailable()
}
