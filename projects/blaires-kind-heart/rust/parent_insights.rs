//! Parent insights — weekly analytics for Mom's View.
//! Generates weekly summary: skill breakdown, patterns, focus recommendations.
//! Caches to weekly_insights table to avoid re-computation.
//! PIN-protected section in progress.rs panel.


use crate::{db_client, emotion_vocabulary, skill_progression, utils};

/// Weekly insight data for display
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct WeeklyInsight {
    pub week_key: String,
    pub top_skill: String,
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

// Emotion tracking data structures - kept for future use
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct EmotionInsight {
    pub emotion: String,
    pub emoji: String,
    pub count: u32,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct EmotionTierProgress {
    pub basic_count: u32,
    pub kindness_count: u32,
    pub impact_count: u32,
    pub growth_count: u32,
}

/// Generate or retrieve weekly insights for a given week
pub async fn get_weekly_insights(week_key: &str) -> Option<WeeklyInsight> {
    // Check cache first
    if let Some(cached) = get_cached_insights(week_key).await {
        return Some(cached);
    }

    // Generate new insights
    generate_weekly_insights(week_key).await
}

/// Generate fresh weekly insights and cache them
pub async fn generate_weekly_insights(week_key: &str) -> Option<WeeklyInsight> {
    let week_key_str = week_key.to_string();

    // Calculate skill breakdown and get timestamps in a single query
    let (skill_breakdown, timestamps) = calculate_skill_breakdown_and_times(&week_key_str).await;
    if skill_breakdown.is_empty() {
        return None; // No data for this week
    }

    // Find top skill (most practiced)
    let top_skill = skill_breakdown
        .iter()
        .max_by_key(|s| s.count)
        .map(|s| s.skill_type.clone())
        .unwrap_or_else(|| "sharing".to_string());

    // Get focus skill (needs most practice)
    let focus_skill = skill_progression::get_focus_skill()
        .await
        .unwrap_or_else(|| "helping".to_string());

    // Generate pattern text using cached timestamps (no additional query)
    let pattern_text = generate_pattern_text_from_data(&skill_breakdown, &timestamps);

    // Calculate reflection rate
    let reflection_rate = calculate_reflection_rate(&week_key_str).await;

    let insight = WeeklyInsight {
        week_key: week_key_str.clone(),
        top_skill: top_skill.clone(),
        focus_skill: focus_skill.clone(),
        pattern_text: pattern_text.clone(),
        reflection_rate,
        skill_breakdown: skill_breakdown.clone(),
    };

    // Cache to DB with serialized skill_breakdown
    let now = utils::now_epoch_ms();
    
    // Serialize skill_breakdown as JSON
    let skill_breakdown_json = match serde_json::to_string(&skill_breakdown
        .iter()
        .map(|s| serde_json::json!({
            "skill_type": s.skill_type,
            "count": s.count,
            "percentage": s.percentage
        }))
        .collect::<Vec<_>>()
    ) {
        Ok(json) => json,
        Err(e) => {
            web_sys::console::error_1(&format!("Failed to serialize skill_breakdown: {:?}", e).into());
            // Skip cache write on serialization failure - return computed insight without caching
            return Some(insight);
        }
    };
    
    let _ = db_client::exec(
        "INSERT OR REPLACE INTO weekly_insights (week_key, top_skill, focus_skill, pattern_text, reflection_rate, skill_breakdown, generated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        vec![
            week_key_str,
            top_skill,
            focus_skill,
            pattern_text,
            reflection_rate.to_string(),
            skill_breakdown_json,
            now.to_string(),
        ],
    ).await;

    Some(insight)
}

/// Get cached insights from DB
async fn get_cached_insights(week_key: &str) -> Option<WeeklyInsight> {
    let rows = db_client::query(
        "SELECT week_key, top_skill, focus_skill, pattern_text, reflection_rate, skill_breakdown FROM weekly_insights WHERE week_key = ?1",
        vec![week_key.to_string()],
    ).await;

    let Ok(data) = rows else { return None };
    let arr = data.as_array()?;
    if arr.is_empty() { return None }

    let row = &arr[0];
    let week_key_str = row.get("week_key")?.as_str()?.to_string();

    // Deserialize skill_breakdown from JSON cache
    let skill_breakdown = if let Some(json_str) = row.get("skill_breakdown").and_then(|v| v.as_str()) {
        match serde_json::from_str::<Vec<serde_json::Value>>(json_str) {
            Ok(arr) => {
                arr.iter()
                    .filter_map(|item| {
                        Some(SkillBreakdown {
                            skill_type: item.get("skill_type")?.as_str()?.to_string(),
                            count: item.get("count")?.as_u64()? as u32,
                            percentage: item.get("percentage")?.as_u64()? as u32,
                        })
                    })
                    .collect()
            }
            Err(e) => {
                web_sys::console::warn_1(&format!("Cache corrupted, recalculating skill_breakdown: {:?}", e).into());
                // Recalculate instead of returning empty on corruption
                let (breakdown, _) = calculate_skill_breakdown_and_times(&week_key_str).await;
                breakdown
            }
        }
    } else {
        // Cache miss - recalculate (backwards compatibility)
        let (breakdown, _) = calculate_skill_breakdown_and_times(&week_key_str).await;
        breakdown
    };

    Some(WeeklyInsight {
        week_key: week_key_str,
        top_skill: row.get("top_skill")?.as_str()?.to_string(),
        focus_skill: row.get("focus_skill")?.as_str()?.to_string(),
        pattern_text: row.get("pattern_text")?.as_str()?.to_string(),
        reflection_rate: row.get("reflection_rate")?.as_f64()? as u32,
        skill_breakdown,
    })
}

/// Calculate skill breakdown and time pattern data in a single query
async fn calculate_skill_breakdown_and_times(week_key: &str) -> (Vec<SkillBreakdown>, Vec<f64>) {
    let week_start = week_key.to_string();
    let week_end = utils::week_key_end(&week_start);

    // Single query to get both category breakdown and timestamps
    let rows = db_client::query(
        "SELECT category, created_at FROM kind_acts WHERE day_key >= ?1 AND day_key <= ?2",
        vec![week_start, week_end],
    ).await;

    let Ok(data) = rows else { return (vec![], vec![]) };
    let Some(arr) = data.as_array() else { return (vec![], vec![]) };

    // Collect timestamps for time pattern analysis
    let mut timestamps = vec![];
    let mut category_counts = std::collections::HashMap::<String, u32>::new();

    for row in arr {
        // Collect timestamp
        if let Some(ts) = row.get("created_at").and_then(|v| v.as_f64()) {
            timestamps.push(ts);
        }

        // Count by category
        if let Some(cat) = row.get("category").and_then(|v| v.as_str()) {
            *category_counts.entry(cat.to_string()).or_insert(0) += 1;
        }
    }

    let total: u32 = category_counts.values().sum();
    if total == 0 { return (vec![], vec![]) }

    // Build skill breakdown
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

/// Generate natural language pattern insights from pre-fetched data
fn generate_pattern_text_from_data(breakdown: &[SkillBreakdown], timestamps: &[f64]) -> String {
    // Total acts this week
    let total_acts: u32 = breakdown.iter().map(|s| s.count).sum();

    if total_acts == 0 {
        return "No kindness acts logged this week.".to_string();
    }

    // Find top skill
    let top_skill = breakdown
        .iter()
        .max_by_key(|s| s.count)
        .map(|s| (skill_progression::skill_to_friendly_name(&s.skill_type), s.count))
        .unwrap_or(("Kindness", 0));

    // Check for morning/afternoon/evening patterns using pre-fetched timestamps
    let time_pattern = detect_time_pattern_from_timestamps(timestamps);

    // Build pattern text
    let mut text = format!(
        "Blaire logged {} kind acts this week! {} was her favorite skill with {} acts.",
        total_acts, top_skill.0, top_skill.1
    );

    if !time_pattern.is_empty() {
        text.push_str(&format!(" {}", time_pattern));
    }

    text
}

/// Detect time-of-day patterns from pre-fetched timestamps (no additional query)
fn detect_time_pattern_from_timestamps(timestamps: &[f64]) -> String {
    let mut morning = 0; // 6am-12pm
    let mut afternoon = 0; // 12pm-6pm
    let mut evening = 0; // 6pm-10pm

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
    if total < 5 { return String::new() } // Not enough data

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

/// Calculate reflection engagement rate (percentage of acts with reflections)
async fn calculate_reflection_rate(week_key: &str) -> u32 {
    let week_start = week_key.to_string();
    let week_end = utils::week_key_end(&week_start);

    // Total acts
    let total_result = db_client::query(
        "SELECT COUNT(*) as c FROM kind_acts WHERE day_key >= ?1 AND day_key <= ?2",
        vec![week_start.clone(), week_end.clone()],
    ).await;

    let total = total_result
        .ok()
        .and_then(|data| data.as_array().and_then(|a| a.first().cloned()))
        .and_then(|row| row.get("c").and_then(|v| v.as_f64()))
        .unwrap_or(0.0) as u32;

    if total == 0 { return 0 }

    // Acts with reflections
    let reflected_result = db_client::query(
        "SELECT COUNT(*) as c FROM kind_acts WHERE day_key >= ?1 AND day_key <= ?2 AND reflection_type IS NOT NULL",
        vec![week_start, week_end],
    ).await;

    let reflected = reflected_result
        .ok()
        .and_then(|data| data.as_array().and_then(|a| a.first().cloned()))
        .and_then(|row| row.get("c").and_then(|v| v.as_f64()))
        .unwrap_or(0.0) as u32;

    (reflected * 100) / total
}

/// Get current week key
pub fn current_week_key() -> String {
    utils::week_key_from_day(&utils::today_key())
}

/// Get weekly emotion insights - top emotions and tier progress
#[allow(dead_code)]
pub async fn get_weekly_emotion_insights(week_key: &str) -> (Vec<EmotionInsight>, EmotionTierProgress) {
    let week_start = week_key.to_string();
    let week_end = utils::week_key_end(&week_start);

    // Query emotion counts from kind_acts table
    let rows = db_client::query(
        "SELECT emotion_selected, COUNT(*) as count FROM kind_acts
         WHERE day_key >= ?1 AND day_key <= ?2 AND emotion_selected IS NOT NULL
         GROUP BY emotion_selected ORDER BY count DESC LIMIT 10",
        vec![week_start.clone(), week_end.clone()],
    ).await;

    let mut insights = vec![];
    let mut emotion_names = vec![];

    if let Ok(data) = rows {
        if let Some(arr) = data.as_array() {
            for row in arr {
                if let Some(emotion_name) = row.get("emotion_selected").and_then(|v| v.as_str()) {
                    let count = row.get("count").and_then(|v| v.as_f64()).unwrap_or(0.0) as u32;

                    // Get emoji for this emotion from vocabulary
                    let emoji = emotion_vocabulary::get_emoji_for_emotion(emotion_name)
                        .unwrap_or("💜")
                        .to_string();

                    insights.push(EmotionInsight {
                        emotion: emotion_name.to_string(),
                        emoji,
                        count,
                    });

                    emotion_names.push(emotion_name.to_string());
                }
            }
        }
    }

    // Calculate tier progress
    let (basic, kindness, impact, growth) = emotion_vocabulary::count_by_tier(&emotion_names);

    let tier_progress = EmotionTierProgress {
        basic_count: basic,
        kindness_count: kindness,
        impact_count: impact,
        growth_count: growth,
    };

    (insights, tier_progress)
}
