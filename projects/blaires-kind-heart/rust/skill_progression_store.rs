use crate::db_client;
use wasm_bindgen::JsValue;

pub async fn increment_skill_total(skill: &str, today: &str) -> Result<(), JsValue> {
    db_client::exec(
        "UPDATE skill_mastery SET total_count = total_count + 1, last_practiced = ?1 WHERE skill_type = ?2",
        vec![today.to_string(), skill.to_string()],
    )
    .await
}

pub async fn fetch_skill_totals(skill: &str) -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT total_count, mastery_level FROM skill_mastery WHERE skill_type = ?1",
        vec![skill.to_string()],
    )
    .await
}

pub async fn set_mastery_level(skill: &str, level: u32) -> Result<(), JsValue> {
    db_client::exec(
        "UPDATE skill_mastery SET mastery_level = ?1 WHERE skill_type = ?2",
        vec![level.to_string(), skill.to_string()],
    )
    .await
}

pub async fn fetch_skill_stats() -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT skill_type, mastery_level FROM skill_mastery ORDER BY skill_type",
        vec![],
    )
    .await
}

pub async fn fetch_focus_skill() -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT skill_type FROM skill_mastery ORDER BY focus_priority DESC LIMIT 1",
        vec![],
    )
    .await
}

pub async fn count_recent_kind_acts(skill: &str, since_day: &str) -> u32 {
    let count_result = db_client::query(
        "SELECT COUNT(*) as c FROM kind_acts WHERE COALESCE(canonical_category, category) = ?1 AND day_key >= ?2",
        vec![skill.to_string(), since_day.to_string()],
    )
    .await;

    count_result
        .ok()
        .map_or(0, |rows| db_client::extract_count(&rows, "c") as u32)
}

pub async fn update_focus_priority(
    skill: &str,
    focus_priority: u32,
    week_count: u32,
) -> Result<(), JsValue> {
    db_client::exec(
        "UPDATE skill_mastery SET focus_priority = ?1, week_count = ?2 WHERE skill_type = ?3",
        vec![
            focus_priority.to_string(),
            week_count.to_string(),
            skill.to_string(),
        ],
    )
    .await
}
