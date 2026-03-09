use wasm_bindgen::JsValue;

use dmb_core::Guest;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
async fn guest_appearances_by_year_from_store(store: &idb::ObjectStore) -> Result<Vec<(u32, u32)>> {
    use crate::JsResultExt;

    let index = store.index("year").js()?;
    let mut request = index
        .open_key_cursor(None, Some(idb::CursorDirection::Next))
        .js()?;
    let mut cursor_opt = request.await.js()?;
    let mut counts: Vec<(u32, u32)> = Vec::new();
    let mut current_year: Option<u32> = None;
    let mut current_count = 0u32;

    while let Some(cursor) = cursor_opt {
        let key = cursor.key().js()?;
        if let Some(year_raw) = key.as_f64() {
            if year_raw.is_finite() && year_raw >= 0.0 {
                let year = year_raw as u32;
                match current_year {
                    Some(existing) if existing == year => {
                        current_count += 1;
                    }
                    Some(existing) => {
                        counts.push((existing, current_count));
                        current_year = Some(year);
                        current_count = 1;
                    }
                    None => {
                        current_year = Some(year);
                        current_count = 1;
                    }
                }
            }
        }

        request = cursor.next(None).js()?;
        cursor_opt = request.await.js()?;
    }
    if let Some(year) = current_year {
        counts.push((year, current_count));
    }

    Ok(counts)
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_guest_appearances_by_year() -> Result<Vec<(u32, u32)>> {
    use crate::JsResultExt;

    let db = crate::open_db().await?;
    let tx = db
        .transaction(
            &[crate::TABLE_GUEST_APPEARANCES],
            idb::TransactionMode::ReadOnly,
        )
        .js()?;
    let store = tx.object_store(crate::TABLE_GUEST_APPEARANCES).js()?;
    let counts = guest_appearances_by_year_from_store(&store).await?;

    tx.await.js()?;
    Ok(counts)
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_guests_panel_data(
    top_guests_limit: usize,
) -> Result<(Vec<Guest>, Vec<(u32, u32)>)> {
    use crate::JsResultExt;

    let db = crate::open_db().await?;
    let tx = db
        .transaction(
            &[crate::TABLE_GUESTS, crate::TABLE_GUEST_APPEARANCES],
            idb::TransactionMode::ReadOnly,
        )
        .js()?;

    let guests_store = tx.object_store(crate::TABLE_GUESTS).js()?;
    let top_guests = crate::panel_support::top_rows_by_index_from_store::<Guest>(
        &guests_store,
        "totalAppearances",
        top_guests_limit,
    )
    .await?;

    let appearances_store = tx.object_store(crate::TABLE_GUEST_APPEARANCES).js()?;
    let appearances_by_year = guest_appearances_by_year_from_store(&appearances_store).await?;

    tx.await.js()?;
    Ok((top_guests, appearances_by_year))
}

#[cfg(not(target_arch = "wasm32"))]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(not(target_arch = "wasm32"))]
pub async fn stats_guest_appearances_by_year() -> Result<Vec<(u32, u32)>> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn stats_guests_panel_data(
    _top_guests_limit: usize,
) -> Result<(Vec<Guest>, Vec<(u32, u32)>)> {
    crate::idb_fallback::idb_unavailable()
}
