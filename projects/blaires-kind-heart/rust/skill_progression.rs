//! Skill progression tracking and mastery badges.
//! Tracks kindness skill categories: hug, nice-words, sharing, helping, love, unicorn.
//! Mastery levels: 0=learning (0-9 acts), 1=bronze (10-24), 2=silver (25-49), 3=gold (50+).
//! Focus priority algorithm: 100 - (recent_7day_count * 10), capped 0-100.


use crate::{db_client, dom, rewards, synth_audio, confetti, speech, utils};

/// Skill stat from skill_mastery table
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct SkillStat {
    pub skill_type: String,
    pub total_count: u32,
    pub week_count: u32,
    pub mastery_level: u32,
    pub focus_priority: u32,
}

/// Track skill practice after kind act logged
pub async fn track_skill_practice(skill: &str) {
    let skill_str = skill.to_string();
    let today = utils::today_key();

    // Increment total_count and update last_practiced
    let _ = db_client::exec(
        "UPDATE skill_mastery SET total_count = total_count + 1, last_practiced = ?1 WHERE skill_type = ?2",
        vec![today.clone(), skill_str.clone()],
    ).await;

    // Check if mastery level should increase
    wasm_bindgen_futures::spawn_local(async move {
        check_and_award_mastery(&skill_str).await;
    });
}

/// Check total_count and award mastery badge if threshold reached
async fn check_and_award_mastery(skill: &str) {
    let rows = db_client::query(
        "SELECT total_count, mastery_level FROM skill_mastery WHERE skill_type = ?1",
        vec![skill.to_string()],
    ).await;

    let Ok(data) = rows else { return };
    let Some(arr) = data.as_array() else { return };
    if arr.is_empty() { return }

    let total_count: u32 = arr[0].get("total_count").and_then(|v| v.as_f64()).unwrap_or(0.0) as u32;
    let current_level: u32 = arr[0].get("mastery_level").and_then(|v| v.as_f64()).unwrap_or(0.0) as u32;

    // Determine new mastery level
    let new_level = match total_count {
        0..=9 => 0,
        10..=24 => 1,
        25..=49 => 2,
        _ => 3,
    };

    // Award badge if level increased
    if new_level > current_level {
        award_mastery_badge(skill, new_level, total_count).await;
    }
}

/// Award mastery badge and celebrate
async fn award_mastery_badge(skill: &str, level: u32, _total_count: u32) {
    // Update mastery_level in DB
    let _ = db_client::exec(
        "UPDATE skill_mastery SET mastery_level = ?1 WHERE skill_type = ?2",
        vec![level.to_string(), skill.to_string()],
    ).await;

    // Award sticker badge
    let sticker_type = match level {
        1 => format!("skill-bronze-{}", skill),
        2 => format!("skill-silver-{}", skill),
        3 => format!("skill-gold-{}", skill),
        _ => return,
    };

    rewards::award_mastery_sticker(&sticker_type, "skill-mastery").await;

    // Celebration based on level
    match level {
        1 => {
            // Bronze: Standard celebration
            synth_audio::fanfare();
            confetti::burst_stars();
            speech::speak(&format!("You're getting good at {}!", skill_to_friendly_name(skill)));
            dom::toast(&format!("🌟 Bronze {} Master!", skill_to_friendly_name(skill)));
        }
        2 => {
            // Silver: Bigger celebration
            synth_audio::fanfare();
            confetti::burst_party();
            speech::speak(&format!("Wow! You're a {} expert!", skill_to_friendly_name(skill)));
            dom::toast(&format!("⭐⭐ Silver {} Expert!", skill_to_friendly_name(skill)));
        }
        3 => {
            // Gold: Maximum celebration
            synth_audio::fanfare();
            confetti::burst_party();
            confetti::burst_stars();
            speech::speak(&format!("Amazing! You're a {} master!", skill_to_friendly_name(skill)));
            dom::toast(&format!("⭐⭐⭐ Gold {} Master!", skill_to_friendly_name(skill)));
        }
        _ => {}
    }

    // Trigger focus priority recalculation (async, non-blocking)
    wasm_bindgen_futures::spawn_local(async move {
        recalculate_focus_priorities().await;
    });
}

/// Get all skill stats for UI display
#[allow(dead_code)]
pub async fn get_skill_stats() -> Vec<SkillStat> {
    let rows = db_client::query(
        "SELECT skill_type, total_count, week_count, mastery_level, focus_priority
         FROM skill_mastery ORDER BY skill_type",
        vec![],
    ).await;

    let Ok(data) = rows else { return vec![] };
    let Some(arr) = data.as_array() else { return vec![] };

    arr.iter()
        .filter_map(|row| {
            Some(SkillStat {
                skill_type: row.get("skill_type")?.as_str()?.to_string(),
                total_count: row.get("total_count")?.as_f64()? as u32,
                week_count: row.get("week_count")?.as_f64()? as u32,
                mastery_level: row.get("mastery_level")?.as_f64()? as u32,
                focus_priority: row.get("focus_priority")?.as_f64()? as u32,
            })
        })
        .collect()
}

/// Get skill with highest focus priority (needs most practice)
pub async fn get_focus_skill() -> Option<String> {
    let rows = db_client::query(
        "SELECT skill_type FROM skill_mastery ORDER BY focus_priority DESC LIMIT 1",
        vec![],
    ).await;

    let Ok(data) = rows else { return None };
    let arr = data.as_array()?;
    if arr.is_empty() { return None }

    arr[0].get("skill_type").and_then(|v| v.as_str()).map(|s| s.to_string())
}

/// Recalculate focus priorities for all skills based on 7-day counts
async fn recalculate_focus_priorities() {
    let seven_days_ago = utils::day_key_n_days_ago(7);

    // Get all skills
    let skills_result = db_client::query(
        "SELECT skill_type FROM skill_mastery",
        vec![],
    ).await;

    let Ok(skills_data) = skills_result else { return };
    let Some(skills_arr) = skills_data.as_array() else { return };

    for row in skills_arr {
        let Some(skill_str) = row.get("skill_type").and_then(|v| v.as_str()) else { continue };

        // Count acts in last 7 days
        let count_result = db_client::query(
            "SELECT COUNT(*) as c FROM kind_acts WHERE category = ?1 AND day_key >= ?2",
            vec![skill_str.to_string(), seven_days_ago.clone()],
        ).await;

        let recent_count = count_result.ok()
            .map(|rows| db_client::extract_count(&rows, "c") as u32)
            .unwrap_or(0);

        // Priority = 100 - (recent_count * 10), capped at 0-100
        let priority = if recent_count >= 10 {
            0
        } else {
            100 - (recent_count * 10)
        };

        // Update focus_priority and week_count
        let _ = db_client::exec(
            "UPDATE skill_mastery SET focus_priority = ?1, week_count = ?2 WHERE skill_type = ?3",
            vec![priority.to_string(), recent_count.to_string(), skill_str.to_string()],
        ).await;
    }
}

/// Convert skill type to friendly display name
pub fn skill_to_friendly_name(skill: &str) -> &str {
    match skill {
        "hug" => "Hugging",
        "nice-words" => "Nice Words",
        "sharing" => "Sharing",
        "helping" => "Helping",
        "love" => "Showing Love",
        "unicorn" => "Unicorn Kindness",
        _ => skill,
    }
}

/// Get skill encouragement phrase based on mastery level
#[allow(dead_code)]
pub fn get_skill_encouragement(skill: &str, level: u32) -> &'static str {
    match (skill, level) {
        ("sharing", 0) => "Sharing makes everyone happy!",
        ("sharing", 1) => "You're becoming great at sharing!",
        ("sharing", 2..=3) => "Wow! You're a sharing superstar!",

        ("helping", 0) => "Helping others feels good!",
        ("helping", 1) => "You're such a helpful friend!",
        ("helping", 2..=3) => "Amazing! You're a helping hero!",

        ("hug", 0) => "Hugs spread love!",
        ("hug", 1) => "You give the best hugs!",
        ("hug", 2..=3) => "You're a hugging champion!",

        ("nice-words", 0) => "Kind words brighten days!",
        ("nice-words", 1) => "Your words make people smile!",
        ("nice-words", 2..=3) => "You're a kindness word wizard!",

        ("love", 0) => "Love makes the world better!",
        ("love", 1) => "You show so much love!",
        ("love", 2..=3) => "Your love is magical!",

        ("unicorn", 0) => "Unicorn kindness is special!",
        ("unicorn", 1) => "You're extra kind!",
        ("unicorn", 2..=3) => "You're a kindness unicorn!",

        _ => "You're so kind!",
    }
}

/// Render mastery badges in tracker panel (called by tracker::init)
#[allow(dead_code)]
pub async fn render_mastery_indicators() {
    let skills = get_skill_stats().await;

    for skill_stat in skills {
        if skill_stat.mastery_level == 0 { continue }

        // Find the category button
        let selector = format!("[data-action='{}']", skill_stat.skill_type);
        let Some(btn) = dom::query(&selector) else { continue };

        // Add mastery badge indicator
        let badge = match skill_stat.mastery_level {
            1 => "🥉", // Bronze
            2 => "🥈", // Silver
            3 => "🥇", // Gold
            _ => continue,
        };

        // Add badge to button
        if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
            if let Ok(span) = doc.create_element("span") {
                let _ = span.set_attribute("class", "mastery-badge");
                span.set_text_content(Some(badge));
                let _ = btn.append_child(&span);
            }
        }
    }
}
