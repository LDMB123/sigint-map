use crate::db_client;

pub async fn count_kind_acts_by_category(category: &str) -> u32 {
    db_client::query(
        "SELECT COUNT(*) as cnt FROM kind_acts WHERE category = ?1",
        vec![category.to_string()],
    )
    .await
    .ok()
    .and_then(|rows| rows.get(0)?.get("cnt")?.as_u64().map(|v| v as u32))
    .unwrap_or(0)
}

pub fn insert_care_feed_bonus_fire_and_forget(id: &str, created_at: &str, day_key: &str) {
    db_client::exec_fire_and_forget(
        "care-feed-bonus",
        "INSERT OR IGNORE INTO kind_acts (id, category, hearts_earned, created_at, day_key) VALUES (?1, 'care', 1, ?2, ?3)",
        vec![
            id.to_string(),
            created_at.to_string(),
            day_key.to_string(),
        ],
    );
}
