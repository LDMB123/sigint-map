#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsValue;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
pub(crate) async fn top_rows_by_index_from_store<T: serde::de::DeserializeOwned>(
    store: &idb::ObjectStore,
    index_name: &str,
    limit: usize,
) -> Result<Vec<T>> {
    use crate::JsResultExt;

    let index = store.index(index_name).js()?;
    let request = index
        .open_cursor(None, Some(idb::CursorDirection::Prev))
        .js()?;
    crate::query_support::collect_cursor_values::<T>(request, Some(limit)).await
}
