use crate::db_client;
use wasm_bindgen::JsValue;

pub async fn upsert_weekly_insight(
    week_key: &str,
    top_skill: &str,
    focus_skill: &str,
    pattern_text: &str,
    reflection_rate: u32,
    skill_breakdown_json: String,
    generated_at_ms: f64,
) -> Result<(), JsValue> {
    db_client::exec(
        "INSERT OR REPLACE INTO weekly_insights \
        (week_key, top_skill, focus_skill, pattern_text, reflection_rate, skill_breakdown, generated_at) \
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        vec![
            week_key.to_string(),
            top_skill.to_string(),
            focus_skill.to_string(),
            pattern_text.to_string(),
            reflection_rate.to_string(),
            skill_breakdown_json,
            generated_at_ms.to_string(),
        ],
    )
    .await
}

pub async fn fetch_cached_weekly_insight(week_key: &str) -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT week_key, focus_skill, pattern_text, reflection_rate, skill_breakdown \
        FROM weekly_insights WHERE week_key = ?1",
        vec![week_key.to_string()],
    )
    .await
}

pub async fn fetch_kind_acts_week_window(
    week_start: &str,
    week_end: &str,
) -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT COALESCE(canonical_category, category) as category, created_at \
        FROM kind_acts WHERE day_key >= ?1 AND day_key <= ?2",
        vec![week_start.to_string(), week_end.to_string()],
    )
    .await
}

pub async fn fetch_reflection_counts_week_window(
    week_start: &str,
    week_end: &str,
) -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN reflection_type IS NOT NULL THEN 1 ELSE 0 END) as reflected \
         FROM kind_acts WHERE day_key >= ?1 AND day_key <= ?2",
        vec![week_start.to_string(), week_end.to_string()],
    )
    .await
}
