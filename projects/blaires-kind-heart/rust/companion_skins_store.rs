use crate::db_client;
use wasm_bindgen::JsValue;

pub async fn unlock_skin_by_id(skin_id: &str) -> Result<(), JsValue> {
    db_client::exec(
        "UPDATE companion_skins SET is_unlocked = 1 WHERE id = ?1",
        vec![skin_id.to_string()],
    )
    .await
}

pub async fn fetch_active_skin() -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT id, is_active FROM companion_skins WHERE is_active = 1 LIMIT 1",
        vec![],
    )
    .await
}

pub async fn count_companion_skins() -> i64 {
    match db_client::query("SELECT COUNT(*) as count FROM companion_skins", vec![]).await {
        Ok(rows) => db_client::extract_count(&rows, "count"),
        Err(_) => 0,
    }
}

pub async fn insert_companion_skin(
    id: &str,
    skin_name: &str,
    unlock_badge_id: &str,
    is_unlocked: i32,
    is_active: i32,
) -> Result<(), JsValue> {
    db_client::exec(
        "INSERT INTO companion_skins (id, skin_name, unlock_badge_id, is_unlocked, is_active) \
        VALUES (?1, ?2, ?3, ?4, ?5)",
        vec![
            id.to_string(),
            skin_name.to_string(),
            unlock_badge_id.to_string(),
            is_unlocked.to_string(),
            is_active.to_string(),
        ],
    )
    .await
}
