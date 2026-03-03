use crate::{confetti, db_client, dom, render, rewards, speech, synth_audio, theme, utils};
#[derive(Debug, Clone)]
pub struct SkillStat {
    pub skill_type: String,
    pub mastery_level: u32,
}
pub async fn track_skill_practice(skill: &str) {
    let skill_str = skill.to_string();
    let today = utils::today_key();
    let _ = db_client::exec(
        "UPDATE skill_mastery SET total_count = total_count + 1, last_practiced = ?1 WHERE skill_type = ?2",
        vec![today, skill_str.clone()],
    )
    .await;
    wasm_bindgen_futures::spawn_local(async move {
        check_and_award_mastery(&skill_str).await;
    });
}
async fn check_and_award_mastery(skill: &str) {
    let rows = db_client::query(
        "SELECT total_count, mastery_level FROM skill_mastery WHERE skill_type = ?1",
        vec![skill.to_string()],
    )
    .await;
    let Ok(data) = rows else { return };
    let Some(arr) = data.as_array() else { return };
    if arr.is_empty() {
        return;
    }
    let total_count: u32 = arr[0]
        .get("total_count")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0) as u32;
    let current_level: u32 = arr[0]
        .get("mastery_level")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0) as u32;
    let new_level = if total_count < theme::MASTERY_BRONZE_THRESHOLD {
        0
    } else if total_count < theme::MASTERY_SILVER_THRESHOLD {
        1
    } else if total_count < theme::MASTERY_GOLD_THRESHOLD {
        2
    } else {
        3
    };
    if new_level > current_level {
        award_mastery_badge(skill, new_level).await;
    }
}
async fn award_mastery_badge(skill: &str, level: u32) {
    let _ = db_client::exec(
        "UPDATE skill_mastery SET mastery_level = ?1 WHERE skill_type = ?2",
        vec![level.to_string(), skill.to_string()],
    )
    .await;
    let sticker_type = match level {
        1 => format!("skill-bronze-{skill}"),
        2 => format!("skill-silver-{skill}"),
        3 => format!("skill-gold-{skill}"),
        _ => return,
    };
    rewards::award_mastery_sticker(&sticker_type, "skill-mastery");
    let friendly = skill_to_friendly_name(skill);
    synth_audio::fanfare();
    match level {
        1 => {
            confetti::burst_stars();
            speech::speak(&format!("You're getting good at {friendly}!"));
            dom::toast(&format!("🌟 Bronze {friendly} Master!"));
        }
        2 => {
            confetti::burst_party();
            speech::speak(&format!("Wow! You're a {friendly} expert!"));
            dom::toast(&format!("⭐⭐ Silver {friendly} Expert!"));
        }
        3 => {
            confetti::burst_party();
            confetti::burst_stars();
            speech::speak(&format!("Amazing! You're a {friendly} master!"));
            dom::toast(&format!("⭐⭐⭐ Gold {friendly} Master!"));
        }
        _ => {}
    }
    wasm_bindgen_futures::spawn_local(recalculate_focus_priorities());
}
async fn get_skill_stats() -> Vec<SkillStat> {
    let rows = db_client::query(
        "SELECT skill_type, mastery_level FROM skill_mastery ORDER BY skill_type",
        vec![],
    )
    .await;
    let Ok(data) = rows else { return vec![] };
    let Some(arr) = data.as_array() else {
        return vec![];
    };
    arr.iter()
        .filter_map(|row| {
            Some(SkillStat {
                skill_type: row.get("skill_type")?.as_str()?.to_string(),
                mastery_level: row.get("mastery_level")?.as_f64()? as u32,
            })
        })
        .collect()
}
pub async fn get_focus_skill() -> Option<String> {
    let rows = db_client::query(
        "SELECT skill_type FROM skill_mastery ORDER BY focus_priority DESC LIMIT 1",
        vec![],
    )
    .await;
    let Ok(data) = rows else { return None };
    let arr = data.as_array()?;
    if arr.is_empty() {
        return None;
    }
    arr[0]
        .get("skill_type")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}
async fn recalculate_focus_priorities() {
    let seven_days_ago = utils::day_key_n_days_ago(7);
    let skills_result = db_client::query("SELECT skill_type FROM skill_mastery", vec![]).await;
    let Ok(skills_data) = skills_result else {
        return;
    };
    let Some(skills_arr) = skills_data.as_array() else {
        return;
    };
    for row in skills_arr {
        let Some(skill_str) = row.get("skill_type").and_then(|v| v.as_str()) else {
            continue;
        };
        let count_result = db_client::query(
            "SELECT COUNT(*) as c FROM kind_acts WHERE category = ?1 AND day_key >= ?2",
            vec![skill_str.to_string(), seven_days_ago.clone()],
        )
        .await;
        let recent_count = count_result
            .ok()
            .map_or(0, |rows| db_client::extract_count(&rows, "c") as u32);
        let priority = if recent_count >= 10 {
            0
        } else {
            100 - (recent_count * 10)
        };
        let _ = db_client::exec(
            "UPDATE skill_mastery SET focus_priority = ?1, week_count = ?2 WHERE skill_type = ?3",
            vec![
                priority.to_string(),
                recent_count.to_string(),
                skill_str.to_string(),
            ],
        )
        .await;
    }
}
pub fn skill_to_friendly_name(skill: &str) -> &str {
    match skill {
        "hug" => "Hugging",
        "sharing" => "Sharing",
        "helping" => "Helping",
        "love" => "Showing Love",
        _ => skill,
    }
}
pub async fn render_mastery_indicators() {
    let skills = get_skill_stats().await;
    for skill_stat in skills {
        if skill_stat.mastery_level == 0 {
            continue;
        }
        let Some(btn) = dom::query_data("action", &skill_stat.skill_type) else {
            continue;
        };
        let badge = match skill_stat.mastery_level {
            1 => "🥉",
            2 => "🥈",
            3 => "🥇",
            _ => continue,
        };
        render::append_text(&dom::document(), &btn, "span", "mastery-badge", badge);
    }
}
