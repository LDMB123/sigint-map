use crate::{
    confetti, dom, domain_services, reliability, render, skill_progression_store, skill_taxonomy,
    speech, synth_audio, utils,
};
use wasm_bindgen::JsCast;

#[derive(Debug, Clone)]
pub struct SkillStat {
    pub skill_type: String,
    pub mastery_level: u32,
}

pub async fn track_skill_practice(skill: &str) {
    let canonical_skill = skill_taxonomy::canonicalize_skill(skill).to_string();
    let today = utils::today_key();
    let update_result = skill_progression_store::increment_skill_total(&canonical_skill, &today).await;

    if update_result.is_err() {
        reliability::record_failure(reliability::DOMAIN_PROGRESSION).await;
        return;
    }
    reliability::record_success(reliability::DOMAIN_PROGRESSION).await;

    wasm_bindgen_futures::spawn_local(async move {
        check_and_award_mastery(&canonical_skill).await;
    });
}

async fn check_and_award_mastery(skill: &str) {
    let rows = skill_progression_store::fetch_skill_totals(skill).await;
    let Ok(data) = rows else {
        reliability::record_failure(reliability::DOMAIN_PROGRESSION).await;
        return;
    };
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

    let new_level = if total_count < skill_taxonomy::SKILL_MASTERY_BRONZE_THRESHOLD {
        0
    } else if total_count < skill_taxonomy::SKILL_MASTERY_SILVER_THRESHOLD {
        1
    } else if total_count < skill_taxonomy::SKILL_MASTERY_GOLD_THRESHOLD {
        2
    } else {
        3
    };

    if new_level > current_level {
        award_mastery_badge(skill, new_level).await;
    }
}

async fn award_mastery_badge(skill: &str, level: u32) {
    let _ = skill_progression_store::set_mastery_level(skill, level).await;

    let sticker_type = match level {
        1 => format!("skill-bronze-{skill}"),
        2 => format!("skill-silver-{skill}"),
        3 => format!("skill-gold-{skill}"),
        _ => return,
    };

    domain_services::award_mastery_sticker(&sticker_type, "skill-mastery");
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
    let rows = skill_progression_store::fetch_skill_stats().await;
    let Ok(data) = rows else { return vec![] };
    let Some(arr) = data.as_array() else {
        return vec![];
    };

    arr.iter()
        .filter_map(|row| {
            Some(SkillStat {
                skill_type: skill_taxonomy::canonicalize_skill(
                    row.get("skill_type")?.as_str()?,
                )
                .to_string(),
                mastery_level: row.get("mastery_level")?.as_f64()? as u32,
            })
        })
        .collect()
}

pub async fn get_focus_skill() -> Option<String> {
    let rows = skill_progression_store::fetch_focus_skill().await;
    let Ok(data) = rows else { return None };
    let arr = data.as_array()?;
    if arr.is_empty() {
        return None;
    }

    arr[0]
        .get("skill_type")
        .and_then(|v| v.as_str())
        .map(|s| skill_taxonomy::canonicalize_skill(s).to_string())
}

async fn recalculate_focus_priorities() {
    let seven_days_ago = utils::day_key_n_days_ago(7);

    for skill in skill_taxonomy::CANONICAL_SKILLS {
        let recent_count =
            skill_progression_store::count_recent_kind_acts(skill, &seven_days_ago).await;

        let priority = if recent_count >= 10 {
            0
        } else {
            100 - (recent_count * 10)
        };

        let _ = skill_progression_store::update_focus_priority(skill, priority, recent_count).await;
    }
}

pub fn skill_to_friendly_name(skill: &str) -> &str {
    skill_taxonomy::skill_label(skill)
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

        // Ensure re-renders do not stack duplicate badge spans.
        if let Ok(existing) = btn.query_selector_all(".mastery-badge") {
            for idx in 0..existing.length() {
                if let Some(node) = existing.item(idx) {
                    if let Some(el) = node.dyn_ref::<web_sys::Element>() {
                        el.remove();
                    }
                }
            }
        }

        let badge = match skill_stat.mastery_level {
            1 => "🥉",
            2 => "🥈",
            3 => "🥇",
            _ => continue,
        };

        render::append_text(&dom::document(), &btn, "span", "mastery-badge", badge);
    }
}
