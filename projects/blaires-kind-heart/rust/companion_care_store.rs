use crate::db_client;
use wasm_bindgen::JsValue;

pub async fn fetch_state_value(key: &str) -> Option<String> {
    let rows = db_client::query(
        "SELECT value FROM companion_state WHERE key = ?1",
        vec![key.to_string()],
    )
    .await
    .ok()?;

    rows.get(0)
        .and_then(|r| r.get("value"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

pub async fn upsert_state(key: &str, value: &str, updated_at_ms: u64) -> Result<(), JsValue> {
    db_client::exec(
        "INSERT OR REPLACE INTO companion_state (key, value, updated_at) VALUES (?1, ?2, ?3)",
        vec![
            key.to_string(),
            value.to_string(),
            updated_at_ms.to_string(),
        ],
    )
    .await
}

pub async fn fetch_all_state_rows() -> Result<serde_json::Value, JsValue> {
    db_client::query("SELECT key, value FROM companion_state", vec![]).await
}
