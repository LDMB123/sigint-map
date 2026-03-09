use wasm_bindgen::JsValue;

#[cfg(target_arch = "wasm32")]
use dmb_core::UserAttendedShow;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
pub async fn add_user_attended_show(show_id: i32, show_date: Option<String>) -> Result<()> {
    let record = UserAttendedShow {
        id: 0,
        show_id,
        added_at: js_sys::Date::new_0().to_string().as_string(),
        show_date,
    };
    crate::put_serialized_in_store(crate::TABLE_USER_ATTENDED_SHOWS, &record).await
}

#[cfg(target_arch = "wasm32")]
pub async fn remove_user_attended_show(show_id: i32) -> Result<()> {
    crate::delete_unique_by_index_key(
        crate::TABLE_USER_ATTENDED_SHOWS,
        "showId",
        JsValue::from_f64(show_id as f64),
    )
    .await
}

#[cfg(not(target_arch = "wasm32"))]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(not(target_arch = "wasm32"))]
pub async fn add_user_attended_show(_show_id: i32, _show_date: Option<String>) -> Result<()> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn remove_user_attended_show(_show_id: i32) -> Result<()> {
    crate::idb_fallback::idb_unavailable()
}
