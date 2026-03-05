use crate::db_client;
use wasm_bindgen::JsValue;

pub async fn fetch_kind_act_counts_by_day_last_30() -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT day_key, COUNT(*) as act_count FROM kind_acts \
        GROUP BY day_key ORDER BY day_key DESC LIMIT 30",
        vec![],
    )
    .await
}

pub async fn count_kind_acts_for_day(day_key: &str) -> u64 {
    db_client::query(
        "SELECT COUNT(*) as cnt FROM kind_acts WHERE day_key = ?1",
        vec![day_key.to_string()],
    )
    .await
    .ok()
    .and_then(|rows| rows.get(0)?.get("cnt")?.as_u64())
    .unwrap_or(0)
}

pub async fn insert_sticker_ignore(
    id: &str,
    sticker_type: &str,
    earned_at_ms: f64,
    source: &str,
) -> Result<(), JsValue> {
    db_client::exec(
        "INSERT OR IGNORE INTO stickers (id, sticker_type, earned_at, source) VALUES (?1, ?2, ?3, ?4)",
        vec![
            id.to_string(),
            sticker_type.to_string(),
            earned_at_ms.to_string(),
            source.to_string(),
        ],
    )
    .await
}

pub fn insert_sticker_fire_and_forget(id: &str, sticker_type: &str, earned_at_ms: f64, source: &str) {
    db_client::exec_fire_and_forget(
        "sticker-save",
        "INSERT INTO stickers (id, sticker_type, earned_at, source) VALUES (?1, ?2, ?3, ?4)",
        vec![
            id.to_string(),
            sticker_type.to_string(),
            earned_at_ms.to_string(),
            source.to_string(),
        ],
    );
}
