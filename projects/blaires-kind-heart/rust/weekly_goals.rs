//! Weekly Goals — tracking progress toward mom-set goals.
//! Goals are stored in `weekly_goals` table. Progress updated as Blaire plays.
//! Provides garden visualization data for the progress panel.

use std::cell::RefCell;

use crate::{db_client, utils};

thread_local! {
    static GOALS: RefCell<Vec<WeeklyGoal>> = const { RefCell::new(Vec::new()) };
}

#[derive(Clone, Debug)]
pub struct WeeklyGoal {
    pub id: String,
    pub goal_type: String,
    pub target: u32,
    pub progress: u32,
    pub completed: bool,
}

impl WeeklyGoal {
    pub fn emoji(&self) -> &str {
        match self.goal_type.as_str() {
            "acts" => "\u{1F49D}",
            "quests" => "\u{2B50}",
            "stories" => "\u{1F4D6}",
            "games" => "\u{1F3AE}",
            "hearts" => "\u{1F49C}",
            _ => "\u{1F3AF}",
        }
    }

    pub fn label(&self) -> &str {
        match self.goal_type.as_str() {
            "acts" => "Kind Acts",
            "quests" => "Quest Days",
            "stories" => "Stories",
            "games" => "Games",
            "hearts" => "Hearts",
            _ => "Goal",
        }
    }

    /// Growth stage: 0=soil, 1=seed, 2=sprout, 3=bud, 4=bloom
    pub fn growth_stage(&self) -> u32 {
        if self.target == 0 { return 0; }
        let pct = (self.progress as f64 / self.target as f64 * 100.0) as u32;
        match pct {
            0 => 0,
            1..=24 => 1,
            25..=49 => 2,
            50..=74 => 3,
            75..=99 => 3,
            _ => 4, // 100%+
        }
    }

    pub fn growth_emoji(&self) -> &str {
        match self.growth_stage() {
            0 => "\u{1FAB4}",   // empty soil (potted plant)
            1 => "\u{1F331}",   // seedling
            2 => "\u{1F33F}",   // herb
            3 => "\u{1F33A}",   // hibiscus (bud)
            _ => "\u{1F33B}",   // sunflower (bloom!)
        }
    }

    pub fn percent(&self) -> u32 {
        if self.target == 0 { return 0; }
        ((self.progress as f64 / self.target as f64) * 100.0).min(100.0) as u32
    }
}

pub fn init() {
    // Load goals on init
    wasm_bindgen_futures::spawn_local(async move {
        load_goals().await;
    });
}

/// Refresh goals from DB (called after mom saves goals).
pub fn refresh_goals() {
    wasm_bindgen_futures::spawn_local(async move {
        load_goals().await;
    });
}

async fn load_goals() {
    let week = utils::week_key();
    if let Ok(rows) = db_client::query(
        "SELECT id, goal_type, target, progress, completed_at FROM weekly_goals WHERE week_key = ?1",
        vec![week],
    ).await {
        let mut goals = Vec::new();
        if let Some(arr) = rows.as_array() {
            for row in arr {
                let id = row.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let goal_type = row.get("goal_type").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let target = row.get("target").and_then(|v| v.as_u64()).unwrap_or(10) as u32;
                let progress = row.get("progress").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                let completed = row.get("completed_at").and_then(|v| v.as_i64()).unwrap_or(0) > 0;

                goals.push(WeeklyGoal { id, goal_type, target, progress, completed });
            }
        }
        GOALS.with(|g| {
            *g.borrow_mut() = goals;
        });
    }
}

/// Get current goals (read-only snapshot).
pub fn current_goals() -> Vec<WeeklyGoal> {
    GOALS.with(|g| g.borrow().clone())
}

/// Check if all goals are completed.
pub fn all_goals_complete() -> bool {
    GOALS.with(|g| {
        let goals = g.borrow();
        !goals.is_empty() && goals.iter().all(|g| g.progress >= g.target)
    })
}

/// Increment progress for a goal type. Called from tracker, quests, stories, games.
pub fn increment_progress(goal_type: &str, amount: u32) {
    let goal_id = GOALS.with(|g| {
        let mut goals = g.borrow_mut();
        for goal in goals.iter_mut() {
            if goal.goal_type == goal_type && !goal.completed {
                goal.progress = (goal.progress + amount).min(goal.target);
                if goal.progress >= goal.target {
                    goal.completed = true;
                }
                return Some(goal.id.clone());
            }
        }
        None
    });

    if let Some(id) = goal_id {
        let _gt = goal_type.to_string();
        wasm_bindgen_futures::spawn_local(async move {
            update_goal_progress(&id).await;
        });
    }
}

async fn update_goal_progress(goal_id: &str) {
    let goal = GOALS.with(|g| {
        g.borrow().iter().find(|g| g.id == goal_id).cloned()
    });

    let Some(goal) = goal else { return };

    if goal.completed {
        let now = utils::now_epoch_ms() as i64;
        let _ = db_client::exec(
            "UPDATE weekly_goals SET progress = ?1, completed_at = ?2 WHERE id = ?3",
            vec![goal.progress.to_string(), now.to_string(), goal.id.clone()],
        ).await;
    } else {
        let _ = db_client::exec(
            "UPDATE weekly_goals SET progress = ?1 WHERE id = ?2",
            vec![goal.progress.to_string(), goal.id.clone()],
        ).await;
    }
}

/// Get mom's note for this week (if any).
pub async fn get_mom_note() -> Option<String> {
    let week = utils::week_key();
    if let Ok(rows) = db_client::query(
        "SELECT note_text FROM mom_notes WHERE week_key = ?1 ORDER BY created_at DESC LIMIT 1",
        vec![week],
    ).await {
        rows.as_array()
            .and_then(|a| a.first())
            .and_then(|r| r.get("note_text"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    } else {
        None
    }
}
