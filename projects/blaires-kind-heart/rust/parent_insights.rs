use crate::{db_client, dom, skill_progression, utils};
use std::fmt::Write;
#[derive(Debug, Clone)]
pub struct WeeklyInsight {
    pub focus_skill: String,
    pub pattern_text: String,
    pub reflection_rate: u32,
    pub skill_breakdown: Vec<SkillBreakdown>,
}
#[derive(Debug, Clone)]
pub struct SkillBreakdown {
    pub skill_type: String,
    pub count: u32,
    pub percentage: u32,
}
pub async fn get_weekly_insights(week_key: &str) -> Option<WeeklyInsight> {
    if let Some(cached) = get_cached_insights(week_key).await {
        return Some(cached);
    }
    generate_weekly_insights(week_key).await
}
async fn generate_weekly_insights(week_key: &str) -> Option<WeeklyInsight> {
    let week_key_str = week_key.to_string();
    let (skill_breakdown, timestamps) = calculate_skill_breakdown_and_times(&week_key_str).await;
    if skill_breakdown.is_empty() {
        return None;
    }
    let top_skill = skill_breakdown
        .iter()
        .max_by_key(|s| s.count)
        .map_or_else(|| "sharing".to_string(), |s| s.skill_type.clone());
    let focus_skill = skill_progression::get_focus_skill()
        .await
        .unwrap_or_else(|| "helping".to_string());
    let pattern_text = generate_pattern_text_from_data(&skill_breakdown, &timestamps);
    let reflection_rate = calculate_reflection_rate(&week_key_str).await;
    let insight = WeeklyInsight {
        focus_skill: focus_skill.clone(),
        pattern_text: pattern_text.clone(),
        reflection_rate,
        skill_breakdown: skill_breakdown.clone(),
    };
    let now = utils::now_epoch_ms();
    let skill_breakdown_json = match serde_json::to_string(&skill_breakdown.iter() .map(|s| serde_json::json!({ "skill_type": s.skill_type, "count": s.count, "percentage": s.percentage })) .collect::<Vec<_>>()) { Ok(json) => json, Err(e) => { dom::warn(&format!("[parent_insights] Failed to serialize skill_breakdown: {e:?}")); return Some(insight); }};
    let _ = db_client::exec( "INSERT OR REPLACE INTO weekly_insights (week_key, top_skill, focus_skill, pattern_text, reflection_rate, skill_breakdown, generated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", vec![week_key_str, top_skill, focus_skill, pattern_text, reflection_rate.to_string(), skill_breakdown_json, now.to_string(),],).await;
    Some(insight)
}
async fn get_cached_insights(week_key: &str) -> Option<WeeklyInsight> {
    let rows = db_client::query( "SELECT week_key, focus_skill, pattern_text, reflection_rate, skill_breakdown FROM weekly_insights WHERE week_key = ?1", vec![week_key.to_string()],).await;
    let Ok(data) = rows else { return None };
    let arr = data.as_array()?;
    if arr.is_empty() {
        return None;
    }
    let row = &arr[0];
    let week_key_str = row.get("week_key")?.as_str()?.to_string();
    let skill_breakdown =
        if let Some(json_str) = row.get("skill_breakdown").and_then(|v| v.as_str()) {
            match serde_json::from_str::<Vec<serde_json::Value>>(json_str) {
                Ok(arr) => arr
                    .iter()
                    .filter_map(|item| {
                        Some(SkillBreakdown {
                            skill_type: item.get("skill_type")?.as_str()?.to_string(),
                            count: item.get("count")?.as_u64()? as u32,
                            percentage: item.get("percentage")?.as_u64()? as u32,
                        })
                    })
                    .collect(),
                Err(e) => {
                    dom::warn(&format!(
                        "[parent_insights] Cache corrupted, recalculating: {e:?}"
                    ));
                    let (breakdown, _) = calculate_skill_breakdown_and_times(&week_key_str).await;
                    breakdown
                }
            }
        } else {
            let (breakdown, _) = calculate_skill_breakdown_and_times(&week_key_str).await;
            breakdown
        };
    Some(WeeklyInsight {
        focus_skill: row.get("focus_skill")?.as_str()?.to_string(),
        pattern_text: row.get("pattern_text")?.as_str()?.to_string(),
        reflection_rate: row.get("reflection_rate")?.as_f64()? as u32,
        skill_breakdown,
    })
}
async fn calculate_skill_breakdown_and_times(week_key: &str) -> (Vec<SkillBreakdown>, Vec<f64>) {
    let week_start = week_key.to_string();
    let week_end = utils::week_key_end(&week_start);
    let rows = db_client::query(
        "SELECT category, created_at FROM kind_acts WHERE day_key >= ?1 AND day_key <= ?2",
        vec![week_start, week_end],
    )
    .await;
    let Ok(data) = rows else {
        return (vec![], vec![]);
    };
    let Some(arr) = data.as_array() else {
        return (vec![], vec![]);
    };
    let mut timestamps = vec![];
    let mut category_counts = std::collections::HashMap::<String, u32>::new();
    for row in arr {
        if let Some(ts) = row.get("created_at").and_then(|v| v.as_f64()) {
            timestamps.push(ts);
        }
        if let Some(cat) = row.get("category").and_then(|v| v.as_str()) {
            *category_counts.entry(cat.to_string()).or_insert(0) += 1;
        }
    }
    let total: u32 = category_counts.values().sum();
    if total == 0 {
        return (vec![], vec![]);
    }
    let breakdown = category_counts
        .into_iter()
        .map(|(skill_type, count)| {
            let percentage = (count * 100) / total;
            SkillBreakdown {
                skill_type,
                count,
                percentage,
            }
        })
        .collect();
    (breakdown, timestamps)
}
fn generate_pattern_text_from_data(breakdown: &[SkillBreakdown], timestamps: &[f64]) -> String {
    let total_acts: u32 = breakdown.iter().map(|s| s.count).sum();
    if total_acts == 0 {
        return "No kindness acts logged this week.".to_string();
    }
    let top_skill = breakdown
        .iter()
        .max_by_key(|s| s.count)
        .map_or(("Kindness", 0), |s| {
            (
                skill_progression::skill_to_friendly_name(&s.skill_type),
                s.count,
            )
        });
    let time_pattern = detect_time_pattern_from_timestamps(timestamps);
    let mut text = format!(
        "Blaire logged {} kind acts this week! {} was her favorite skill with {} acts.",
        total_acts, top_skill.0, top_skill.1
    );
    if !time_pattern.is_empty() {
        let _ = write!(text, " {time_pattern}");
    }
    text
}
fn detect_time_pattern_from_timestamps(timestamps: &[f64]) -> String {
    let mut morning = 0;
    let mut afternoon = 0;
    let mut evening = 0;
    for &timestamp in timestamps {
        let hour = utils::hour_from_epoch_ms(timestamp as u64);
        match hour {
            6..=11 => morning += 1,
            12..=17 => afternoon += 1,
            18..=21 => evening += 1,
            _ => {}
        }
    }
    let total = morning + afternoon + evening;
    if total < 5 {
        return String::new();
    } // Not enough data
    if morning > afternoon && morning > evening {
        "Blaire is kindest in the mornings!".to_string()
    } else if afternoon > morning && afternoon > evening {
        "Blaire loves being kind in the afternoon!".to_string()
    } else if evening > morning && evening > afternoon {
        "Blaire spreads kindness in the evenings!".to_string()
    } else {
        String::new()
    }
}
async fn calculate_reflection_rate(week_key: &str) -> u32 {
    let week_start = week_key.to_string();
    let week_end = utils::week_key_end(&week_start);
    let Ok(rows) = db_client::query( "SELECT COUNT(*) as total, SUM(CASE WHEN reflection_type IS NOT NULL THEN 1 ELSE 0 END) as reflected \
         FROM kind_acts WHERE day_key >= ?1 AND day_key <= ?2", vec![week_start, week_end],).await else { return 0 };
    let row = rows.get(0);
    let total = row
        .and_then(|r| r.get("total"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    if total == 0 {
        return 0;
    }
    let reflected = row
        .and_then(|r| r.get("reflected"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    (reflected * 100) / total
}
pub fn current_week_key() -> String {
    utils::week_key_from_day(&utils::today_key())
}
