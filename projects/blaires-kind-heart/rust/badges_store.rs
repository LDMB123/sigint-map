use crate::db_client;
use wasm_bindgen::JsValue;

pub async fn fetch_badge_earned_row(badge_id: &str) -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT earned FROM badges WHERE id = ?1",
        vec![badge_id.to_string()],
    )
    .await
}

pub async fn mark_badge_earned(badge_id: &str, earned_at_ms: i64) -> Result<(), JsValue> {
    db_client::exec(
        "UPDATE badges SET earned = 1, earned_at = ?1 WHERE id = ?2",
        vec![earned_at_ms.to_string(), badge_id.to_string()],
    )
    .await
}

pub async fn fetch_platinum_aggregate_counts() -> Result<serde_json::Value, JsValue> {
    db_client::query(
        "SELECT \
            (SELECT COUNT(*) FROM badges WHERE badge_type = 'skill_mastery' AND tier = 'platinum' AND earned = 1) as skill_platinum_count, \
            (SELECT COUNT(*) FROM badges WHERE badge_type = 'story' AND earned = 1) as story_count, \
            (SELECT COUNT(*) FROM badges WHERE badge_type = 'quest_chain' AND earned = 1) as chain_count, \
            (SELECT COUNT(*) FROM gardens WHERE growth_stage >= 5) as garden_count",
        vec![],
    )
    .await
}
