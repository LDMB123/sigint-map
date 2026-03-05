use crate::db_client;

pub fn upsert_today_streak_fire_and_forget(day_key: &str, hearts_total: u32) {
    db_client::exec_fire_and_forget(
        "streak-upsert",
        "INSERT INTO streaks (day_key, acts_count, hearts_total) VALUES (?1, 1, ?2) \
        ON CONFLICT(day_key) DO UPDATE SET acts_count = acts_count + 1, hearts_total = excluded.hearts_total",
        vec![day_key.to_string(), hearts_total.to_string()],
    );
}
