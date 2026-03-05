use crate::db_client;
use wasm_bindgen::JsValue;

pub async fn fetch_unlocked_gardens() -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT id, garden_name, growth_stage FROM gardens \
        WHERE unlocked_at IS NOT NULL ORDER BY unlocked_at DESC",
        vec![],
    )
    .await
}

pub async fn count_gardens() -> i64 {
    match db_client::query("SELECT COUNT(*) as count FROM gardens", vec![]).await {
        Ok(rows) => db_client::extract_count(&rows, "count"),
        Err(_) => 0,
    }
}

pub async fn insert_garden_seed(
    id: &str,
    garden_name: &str,
    quest_chain_id: &str,
    theme_emoji: &str,
    growth_stage: i32,
    unlocked_at_ms: i64,
) -> Result<(), JsValue> {
    db_client::exec(
        "INSERT INTO gardens (id, garden_name, quest_chain_id, theme_emoji, growth_stage, unlocked_at) \
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        vec![
            id.to_string(),
            garden_name.to_string(),
            quest_chain_id.to_string(),
            theme_emoji.to_string(),
            growth_stage.to_string(),
            unlocked_at_ms.to_string(),
        ],
    )
    .await
}
