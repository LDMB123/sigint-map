use crate::db_client;
use wasm_bindgen::JsValue;

pub async fn fetch_weekly_goals(week_key: &str) -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT id, goal_type, target, progress, completed_at FROM weekly_goals WHERE week_key = ?1",
        vec![week_key.to_string()],
    )
    .await
}

pub async fn update_goal_progress(
    goal_id: &str,
    progress: u32,
    completed_at_ms: Option<i64>,
) -> Result<(), JsValue> {
    match completed_at_ms {
        Some(completed_at) => {
            db_client::exec(
                "UPDATE weekly_goals SET progress = ?1, completed_at = ?2 WHERE id = ?3",
                vec![
                    progress.to_string(),
                    completed_at.to_string(),
                    goal_id.to_string(),
                ],
            )
            .await
        }
        None => {
            db_client::exec(
                "UPDATE weekly_goals SET progress = ?1 WHERE id = ?2",
                vec![progress.to_string(), goal_id.to_string()],
            )
            .await
        }
    }
}

pub async fn fetch_latest_mom_note(week_key: &str) -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT note_text FROM mom_notes WHERE week_key = ?1 ORDER BY created_at DESC LIMIT 1",
        vec![week_key.to_string()],
    )
    .await
}
