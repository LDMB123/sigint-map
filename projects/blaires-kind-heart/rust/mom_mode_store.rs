use crate::db_client;
use crate::dom;
use crate::utils;
use futures::join;
use wasm_bindgen::JsValue;

pub async fn has_parent_pin() -> bool {
    db_client::get_setting("parent_pin").await.is_some()
}

pub async fn set_parent_pin(pin: &str) {
    db_client::set_setting("parent_pin", pin).await;
}

pub async fn get_pin_lockout_until() -> Option<f64> {
    let raw = db_client::get_setting("pin_locked_until").await?;
    raw.parse::<f64>().ok()
}

pub async fn clear_pin_rate_limit() {
    db_client::set_setting("pin_failed_attempts", "0").await;
    db_client::set_setting("pin_locked_until", "0").await;
}

pub async fn get_pin_failed_attempts() -> u32 {
    db_client::get_setting("pin_failed_attempts")
        .await
        .and_then(|raw| raw.parse::<u32>().ok())
        .unwrap_or(0)
}

pub async fn set_pin_failed_attempts(attempts: u32) {
    db_client::set_setting("pin_failed_attempts", &attempts.to_string())
        .await;
}

pub async fn set_pin_lockout_until(lockout_until_ms: u64) {
    db_client::set_setting("pin_locked_until", &lockout_until_ms.to_string())
        .await;
}

pub async fn get_parent_pin() -> Option<String> {
    db_client::get_setting("parent_pin").await
}

pub async fn restore_snapshot(snapshot_json: String) -> Result<(), JsValue> {
    db_client::restore_snapshot(snapshot_json).await
}

pub async fn replace_weekly_goals(week: &str, goals: &[GoalInsert], now_ms: i64) {
    let _ = db_client::exec(
        "DELETE FROM weekly_goals WHERE week_key = ?1",
        vec![week.to_string()],
    )
    .await;

    for goal in goals {
        let _ = db_client::exec(
            "INSERT INTO weekly_goals (id, week_key, goal_type, target, progress, created_at) \
            VALUES (?1, ?2, ?3, ?4, 0, ?5)",
            vec![
                goal.id.clone(),
                week.to_string(),
                goal.goal_type.clone(),
                goal.target.to_string(),
                now_ms.to_string(),
            ],
        )
        .await;
    }
}

pub async fn upsert_mom_note(week: &str, note_text: &str, now_ms: i64) {
    let note_id = utils::create_id();
    let _ = db_client::exec(
        "INSERT OR REPLACE INTO mom_notes (id, week_key, note_text, created_at) VALUES (?1, ?2, ?3, ?4)",
        vec![
            note_id,
            week.to_string(),
            note_text.to_string(),
            now_ms.to_string(),
        ],
    )
    .await;
}

pub async fn load_existing_goals_and_note(
    week: &str,
) -> (
    Result<serde_json::Value, JsValue>,
    Result<serde_json::Value, JsValue>,
) {
    join!(
        db_client::query(
            "SELECT goal_type, target FROM weekly_goals WHERE week_key = ?1",
            vec![week.to_string()],
        ),
        db_client::query(
            "SELECT note_text FROM mom_notes WHERE week_key = ?1 ORDER BY created_at DESC LIMIT 1",
            vec![week.to_string()],
        )
    )
}

pub async fn export_json_tables() -> Option<ExportTables> {
    let (kind_acts_result, settings_result, quests_result) = join!(
        db_client::query(
            "SELECT id, category, description, hearts_earned, created_at, day_key, \
            reflection_type, emotion_selected, bonus_context, combo_day \
            FROM kind_acts ORDER BY created_at ASC",
            vec![],
        ),
        db_client::query(
            "SELECT key, value FROM settings WHERE key != 'parent_pin'",
            vec![],
        ),
        db_client::query("SELECT * FROM quests ORDER BY day_key ASC", vec![]),
    );

    let (Ok(kind_acts), Ok(settings), Ok(quests)) = (kind_acts_result, settings_result, quests_result)
    else {
        return None;
    };

    Some(ExportTables {
        kind_acts,
        settings,
        quests,
    })
}

pub async fn export_kind_acts_rows() -> serde_json::Value {
    match db_client::query(
        "SELECT id, category, description, hearts_earned, created_at, day_key, \
        reflection_type, emotion_selected, bonus_context, combo_day \
        FROM kind_acts ORDER BY created_at ASC",
        vec![],
    )
    .await
    {
        Ok(rows) => rows,
        Err(error) => {
            dom::warn(&format!(
                "[mom_mode_store] export_kind_acts_rows failed: {error:?}"
            ));
            serde_json::json!([])
        }
    }
}

#[derive(Clone, Debug)]
pub struct GoalInsert {
    pub id: String,
    pub goal_type: String,
    pub target: u32,
}

#[derive(Debug)]
pub struct ExportTables {
    pub kind_acts: serde_json::Value,
    pub settings: serde_json::Value,
    pub quests: serde_json::Value,
}
