use crate::db_client;
use wasm_bindgen::JsValue;

pub async fn fetch_completed_story_ids() -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT story_id FROM stories_progress WHERE completed = 1",
        vec![],
    )
    .await
}

pub async fn upsert_story_completion(
    story_id: &str,
    page_index: usize,
    completed_at_ms: f64,
) -> Result<(), JsValue> {
    db_client::exec(
        "INSERT INTO stories_progress (story_id, page_index, choices_json, completed, completed_at) \
         VALUES (?1, ?2, '[]', 1, ?3) \
         ON CONFLICT(story_id) DO UPDATE SET completed = 1, completed_at = ?3, page_index = ?2",
        vec![
            story_id.to_string(),
            page_index.to_string(),
            completed_at_ms.to_string(),
        ],
    )
    .await
}
