// Badges Module
// 60+ badge collection system across tiers
//
// Planned features for Week 4+ - badges not yet integrated into UI
#[allow(dead_code)]
use web_sys::console;

// Badge definition
#[allow(dead_code)]
pub struct Badge {
    pub id: &'static str,
    pub badge_type: &'static str,
    pub badge_name: &'static str,
    pub emoji: &'static str,
    pub unlock_criteria: &'static str,
    pub tier: &'static str,
}

// Quest Chain Badges (12)
pub const QUEST_CHAIN_BADGES: &[Badge] = &[
    Badge {
        id: "badge-chain-hug-1",
        badge_type: "quest_chain",
        badge_name: "Bunny Hug Champion",
        emoji: "🐰",
        unlock_criteria: "Complete Bunny Hug Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-hug-2",
        badge_type: "quest_chain",
        badge_name: "Warm Hug Master",
        emoji: "🤗",
        unlock_criteria: "Complete Warm Hug Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-sharing-1",
        badge_type: "quest_chain",
        badge_name: "Gift Share Star",
        emoji: "🎁",
        unlock_criteria: "Complete Gift Share Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-sharing-2",
        badge_type: "quest_chain",
        badge_name: "Balloon Share Hero",
        emoji: "🎈",
        unlock_criteria: "Complete Balloon Share Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-helping-1",
        badge_type: "quest_chain",
        badge_name: "Helper's Week Champion",
        emoji: "🆘",
        unlock_criteria: "Complete Helper's Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-helping-2",
        badge_type: "quest_chain",
        badge_name: "Star Helper Master",
        emoji: "⭐",
        unlock_criteria: "Complete Star Helper Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-nice-words-1",
        badge_type: "quest_chain",
        badge_name: "Kind Words Champion",
        emoji: "💬",
        unlock_criteria: "Complete Kind Words Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-nice-words-2",
        badge_type: "quest_chain",
        badge_name: "Magic Words Master",
        emoji: "✨",
        unlock_criteria: "Complete Magic Words Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-love-1",
        badge_type: "quest_chain",
        badge_name: "Heart Week Champion",
        emoji: "❤️",
        unlock_criteria: "Complete Heart Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-love-2",
        badge_type: "quest_chain",
        badge_name: "Rainbow Week Master",
        emoji: "🌈",
        unlock_criteria: "Complete Rainbow Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-unicorn-1",
        badge_type: "quest_chain",
        badge_name: "Unicorn Week Champion",
        emoji: "🦄",
        unlock_criteria: "Complete Unicorn Week quest chain",
        tier: "gold",
    },
    Badge {
        id: "badge-chain-unicorn-2",
        badge_type: "quest_chain",
        badge_name: "Dream Week Master",
        emoji: "💫",
        unlock_criteria: "Complete Dream Week quest chain",
        tier: "gold",
    },
];

// Story Badges (15)
pub const STORY_BADGES: &[Badge] = &[
    // Original 5 stories
    Badge {
        id: "badge-story-lost-bunny",
        badge_type: "story",
        badge_name: "Bunny Finder",
        emoji: "🐰",
        unlock_criteria: "Complete Lost Bunny story",
        tier: "bronze",
    },
    Badge {
        id: "badge-story-rainy-day",
        badge_type: "story",
        badge_name: "Rainy Day Helper",
        emoji: "🌧️",
        unlock_criteria: "Complete Rainy Day Friend story",
        tier: "bronze",
    },
    Badge {
        id: "badge-story-garden-surprise",
        badge_type: "story",
        badge_name: "Garden Grower",
        emoji: "🌻",
        unlock_criteria: "Complete Garden Surprise story",
        tier: "bronze",
    },
    Badge {
        id: "badge-story-new-kid",
        badge_type: "story",
        badge_name: "Friendship Maker",
        emoji: "👋",
        unlock_criteria: "Complete New Kid at School story",
        tier: "bronze",
    },
    Badge {
        id: "badge-story-sharing-lunch",
        badge_type: "story",
        badge_name: "Lunch Sharer",
        emoji: "🍱",
        unlock_criteria: "Complete Sharing Lunch story",
        tier: "bronze",
    },
    // Week 2 stories (6-15)
    Badge {
        id: "badge-story-unicorn-forest",
        badge_type: "story",
        badge_name: "Unicorn Forest Explorer",
        emoji: "🌲",
        unlock_criteria: "Complete The Unicorn Forest story",
        tier: "silver",
    },
    Badge {
        id: "badge-story-lonely-dragon",
        badge_type: "story",
        badge_name: "Dragon Friend",
        emoji: "🐉",
        unlock_criteria: "Complete The Lonely Dragon story",
        tier: "silver",
    },
    Badge {
        id: "badge-story-fairy-village",
        badge_type: "story",
        badge_name: "Fairy Helper",
        emoji: "🧚",
        unlock_criteria: "Complete Fairy Village Help story",
        tier: "silver",
    },
    Badge {
        id: "badge-story-sibling-adventure",
        badge_type: "story",
        badge_name: "Sibling Bond",
        emoji: "👫",
        unlock_criteria: "Complete Sibling Adventure Day story",
        tier: "silver",
    },
    Badge {
        id: "badge-story-grandpa-day",
        badge_type: "story",
        badge_name: "Grandpa's Joy",
        emoji: "👴",
        unlock_criteria: "Complete Grandpa's Special Day story",
        tier: "silver",
    },
    Badge {
        id: "badge-story-new-neighbor",
        badge_type: "story",
        badge_name: "Neighbor Welcomer",
        emoji: "🏡",
        unlock_criteria: "Complete The New Neighbor story",
        tier: "silver",
    },
    Badge {
        id: "badge-story-lost-puppy",
        badge_type: "story",
        badge_name: "Puppy Rescuer",
        emoji: "🐶",
        unlock_criteria: "Complete The Lost Puppy story",
        tier: "silver",
    },
    Badge {
        id: "badge-story-library-helper",
        badge_type: "story",
        badge_name: "Library Star",
        emoji: "📚",
        unlock_criteria: "Complete Library Helper story",
        tier: "silver",
    },
    Badge {
        id: "badge-story-park-cleanup",
        badge_type: "story",
        badge_name: "Park Protector",
        emoji: "🌳",
        unlock_criteria: "Complete Park Clean-Up Day story",
        tier: "silver",
    },
    Badge {
        id: "badge-story-birthday-surprise",
        badge_type: "story",
        badge_name: "Birthday Planner",
        emoji: "🎂",
        unlock_criteria: "Complete Birthday Surprise story",
        tier: "silver",
    },
];

// Combo Badges (5)
pub const COMBO_BADGES: &[Badge] = &[
    Badge {
        id: "badge-super-day",
        badge_type: "combo",
        badge_name: "Super Day",
        emoji: "☀️",
        unlock_criteria: "Complete quest + kind act + reflection + emotion in one day",
        tier: "gold",
    },
    Badge {
        id: "badge-perfect-week",
        badge_type: "combo",
        badge_name: "Perfect Week",
        emoji: "🌟",
        unlock_criteria: "Complete all daily tasks for 7 days in a row",
        tier: "platinum",
    },
    Badge {
        id: "badge-kindness-streak",
        badge_type: "combo",
        badge_name: "Kindness Streak",
        emoji: "🔥",
        unlock_criteria: "Earn Super Day badge 3 days in a row",
        tier: "gold",
    },
    Badge {
        id: "badge-full-heart",
        badge_type: "combo",
        badge_name: "Full Heart",
        emoji: "💖",
        unlock_criteria: "Complete all daily tasks 10 times",
        tier: "platinum",
    },
    Badge {
        id: "badge-rainbow-week",
        badge_type: "combo",
        badge_name: "Rainbow Week",
        emoji: "🌈",
        unlock_criteria: "Record 6 different skill acts in one week",
        tier: "gold",
    },
];

// Platinum Badges (5)
pub const PLATINUM_BADGES: &[Badge] = &[
    Badge {
        id: "badge-kindness-master",
        badge_type: "platinum",
        badge_name: "Kindness Master",
        emoji: "👑",
        unlock_criteria: "Earn all 6 skill platinum badges",
        tier: "platinum",
    },
    Badge {
        id: "badge-story-master",
        badge_type: "platinum",
        badge_name: "Story Master",
        emoji: "📖",
        unlock_criteria: "Complete all 15 stories",
        tier: "platinum",
    },
    Badge {
        id: "badge-chain-champion",
        badge_type: "platinum",
        badge_name: "Chain Champion",
        emoji: "🔗",
        unlock_criteria: "Complete all 12 quest chains",
        tier: "platinum",
    },
    Badge {
        id: "badge-garden-keeper",
        badge_type: "platinum",
        badge_name: "Garden Keeper",
        emoji: "🌻",
        unlock_criteria: "Grow all 12 gardens to full bloom",
        tier: "platinum",
    },
    Badge {
        id: "badge-ultimate-heart",
        badge_type: "platinum",
        badge_name: "Ultimate Heart",
        emoji: "💝",
        unlock_criteria: "Earn 500 total hearts",
        tier: "platinum",
    },
];

// Enhanced Skill Mastery Badges (24 - 4 tiers × 6 skills)
pub const SKILL_MASTERY_BADGES: &[Badge] = &[
    // Hug skill (4 tiers)
    Badge {
        id: "badge-hug-bronze",
        badge_type: "skill_mastery",
        badge_name: "Bronze Hugger",
        emoji: "🥉",
        unlock_criteria: "10 hug acts",
        tier: "bronze",
    },
    Badge {
        id: "badge-hug-silver",
        badge_type: "skill_mastery",
        badge_name: "Silver Hugger",
        emoji: "🥈",
        unlock_criteria: "25 hug acts",
        tier: "silver",
    },
    Badge {
        id: "badge-hug-gold",
        badge_type: "skill_mastery",
        badge_name: "Gold Hugger",
        emoji: "🥇",
        unlock_criteria: "50 hug acts",
        tier: "gold",
    },
    Badge {
        id: "badge-hug-platinum",
        badge_type: "skill_mastery",
        badge_name: "Platinum Hugger",
        emoji: "🏆",
        unlock_criteria: "100 hug acts",
        tier: "platinum",
    },
    // Sharing skill (4 tiers)
    Badge {
        id: "badge-sharing-bronze",
        badge_type: "skill_mastery",
        badge_name: "Bronze Sharer",
        emoji: "🥉",
        unlock_criteria: "10 sharing acts",
        tier: "bronze",
    },
    Badge {
        id: "badge-sharing-silver",
        badge_type: "skill_mastery",
        badge_name: "Silver Sharer",
        emoji: "🥈",
        unlock_criteria: "25 sharing acts",
        tier: "silver",
    },
    Badge {
        id: "badge-sharing-gold",
        badge_type: "skill_mastery",
        badge_name: "Gold Sharer",
        emoji: "🥇",
        unlock_criteria: "50 sharing acts",
        tier: "gold",
    },
    Badge {
        id: "badge-sharing-platinum",
        badge_type: "skill_mastery",
        badge_name: "Platinum Sharer",
        emoji: "🏆",
        unlock_criteria: "100 sharing acts",
        tier: "platinum",
    },
    // Helping skill (4 tiers)
    Badge {
        id: "badge-helping-bronze",
        badge_type: "skill_mastery",
        badge_name: "Bronze Helper",
        emoji: "🥉",
        unlock_criteria: "10 helping acts",
        tier: "bronze",
    },
    Badge {
        id: "badge-helping-silver",
        badge_type: "skill_mastery",
        badge_name: "Silver Helper",
        emoji: "🥈",
        unlock_criteria: "25 helping acts",
        tier: "silver",
    },
    Badge {
        id: "badge-helping-gold",
        badge_type: "skill_mastery",
        badge_name: "Gold Helper",
        emoji: "🥇",
        unlock_criteria: "50 helping acts",
        tier: "gold",
    },
    Badge {
        id: "badge-helping-platinum",
        badge_type: "skill_mastery",
        badge_name: "Platinum Helper",
        emoji: "🏆",
        unlock_criteria: "100 helping acts",
        tier: "platinum",
    },
    // Nice Words skill (4 tiers)
    Badge {
        id: "badge-nice-words-bronze",
        badge_type: "skill_mastery",
        badge_name: "Bronze Speaker",
        emoji: "🥉",
        unlock_criteria: "10 nice-words acts",
        tier: "bronze",
    },
    Badge {
        id: "badge-nice-words-silver",
        badge_type: "skill_mastery",
        badge_name: "Silver Speaker",
        emoji: "🥈",
        unlock_criteria: "25 nice-words acts",
        tier: "silver",
    },
    Badge {
        id: "badge-nice-words-gold",
        badge_type: "skill_mastery",
        badge_name: "Gold Speaker",
        emoji: "🥇",
        unlock_criteria: "50 nice-words acts",
        tier: "gold",
    },
    Badge {
        id: "badge-nice-words-platinum",
        badge_type: "skill_mastery",
        badge_name: "Platinum Speaker",
        emoji: "🏆",
        unlock_criteria: "100 nice-words acts",
        tier: "platinum",
    },
    // Love skill (4 tiers)
    Badge {
        id: "badge-love-bronze",
        badge_type: "skill_mastery",
        badge_name: "Bronze Lover",
        emoji: "🥉",
        unlock_criteria: "10 love acts",
        tier: "bronze",
    },
    Badge {
        id: "badge-love-silver",
        badge_type: "skill_mastery",
        badge_name: "Silver Lover",
        emoji: "🥈",
        unlock_criteria: "25 love acts",
        tier: "silver",
    },
    Badge {
        id: "badge-love-gold",
        badge_type: "skill_mastery",
        badge_name: "Gold Lover",
        emoji: "🥇",
        unlock_criteria: "50 love acts",
        tier: "gold",
    },
    Badge {
        id: "badge-love-platinum",
        badge_type: "skill_mastery",
        badge_name: "Platinum Lover",
        emoji: "🏆",
        unlock_criteria: "100 love acts",
        tier: "platinum",
    },
    // Unicorn skill (4 tiers)
    Badge {
        id: "badge-unicorn-bronze",
        badge_type: "skill_mastery",
        badge_name: "Bronze Unicorn",
        emoji: "🥉",
        unlock_criteria: "10 unicorn acts",
        tier: "bronze",
    },
    Badge {
        id: "badge-unicorn-silver",
        badge_type: "skill_mastery",
        badge_name: "Silver Unicorn",
        emoji: "🥈",
        unlock_criteria: "25 unicorn acts",
        tier: "silver",
    },
    Badge {
        id: "badge-unicorn-gold",
        badge_type: "skill_mastery",
        badge_name: "Gold Unicorn",
        emoji: "🥇",
        unlock_criteria: "50 unicorn acts",
        tier: "gold",
    },
    Badge {
        id: "badge-unicorn-platinum",
        badge_type: "skill_mastery",
        badge_name: "Platinum Unicorn",
        emoji: "🏆",
        unlock_criteria: "100 unicorn acts",
        tier: "platinum",
    },
];

/// All badges combined (56 total)
pub fn get_all_badges() -> Vec<&'static Badge> {
    let mut badges = Vec::new();
    badges.extend(QUEST_CHAIN_BADGES.iter());
    badges.extend(STORY_BADGES.iter());
    badges.extend(COMBO_BADGES.iter());
    badges.extend(PLATINUM_BADGES.iter());
    badges.extend(SKILL_MASTERY_BADGES.iter());
    badges
}

/// Initialize badges module
pub fn init() {
    console::log_1(&"[badges] Module initialized".into());
}

fn extract_count_i64(rows: &serde_json::Value, key: &str) -> i64 {
    rows.as_array()
        .and_then(|arr| arr.first())
        .and_then(|row| row.get(key))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0) as i64
}

fn extract_bool_flag(rows: &serde_json::Value, key: &str) -> bool {
    rows.as_array()
        .and_then(|arr| arr.first())
        .and_then(|row| row.get(key))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
        > 0.0
}

/// Award a badge to the user
/// Award a badge directly without checking for platinum achievements (used internally)
async fn award_badge_direct(badge_id: &str) {
    use crate::db_client;

    // Check if already earned
    let check_sql = "SELECT earned FROM badges WHERE id = ?1";
    let already_earned = match db_client::query(check_sql, vec![badge_id.to_string()]).await {
        Ok(rows) => extract_bool_flag(&rows, "earned"),
        Err(_) => false,
    };

    if already_earned {
        console::log_1(&format!("[badges] Badge {} already earned", badge_id).into());
        return;
    }

    let now = js_sys::Date::now() as i64;
    let sql = "UPDATE badges SET earned = 1, earned_at = ?1 WHERE id = ?2";

    match db_client::exec(sql, vec![now.to_string(), badge_id.to_string()]).await {
        Ok(_) => {
            console::log_1(&format!("[badges] Awarded platinum badge: {}", badge_id).into());
            celebrate_badge_unlock(badge_id).await;

            // Check if this badge unlocks a companion skin
            crate::companion_skins::check_and_unlock_skin(badge_id).await;
        }
        Err(e) => {
            console::error_1(&format!("[badges] Failed to award badge: {:?}", e).into());
        }
    }
}

pub async fn award_badge(badge_id: &str) {
    use crate::db_client;

    // Check if already earned
    let check_sql = "SELECT earned FROM badges WHERE id = ?1";
    let already_earned = match db_client::query(check_sql, vec![badge_id.to_string()]).await {
        Ok(rows) => extract_bool_flag(&rows, "earned"),
        Err(_) => false,
    };

    if already_earned {
        console::log_1(&format!("[badges] Badge {} already earned", badge_id).into());
        return;
    }

    let now = js_sys::Date::now() as i64;
    let sql = "UPDATE badges SET earned = 1, earned_at = ?1 WHERE id = ?2";

    match db_client::exec(sql, vec![now.to_string(), badge_id.to_string()]).await {
        Ok(_) => {
            console::log_1(&format!("[badges] Awarded badge: {}", badge_id).into());
            celebrate_badge_unlock(badge_id).await;

            // Check if this badge unlocks a companion skin
            crate::companion_skins::check_and_unlock_skin(badge_id).await;

            // Check for platinum badge achievements (no recursion - platinum badges don't trigger more checks)
            if !badge_id.starts_with("badge-kindness-master")
                && !badge_id.starts_with("badge-story-master")
                && !badge_id.starts_with("badge-chain-champion")
                && !badge_id.starts_with("badge-garden-keeper") {
                check_platinum_achievements().await;
            }
        }
        Err(e) => {
            console::error_1(&format!("[badges] Failed to award badge: {:?}", e).into());
        }
    }
}

/// Celebrate badge unlock with confetti + speech
async fn celebrate_badge_unlock(badge_id: &str) {
    use crate::{confetti, speech};

    // Find badge details
    if let Some(badge) = get_all_badges().iter().find(|b| b.id == badge_id) {
        let tier = match badge.tier {
            "bronze" => confetti::CelebrationTier::Great,
            "silver" => confetti::CelebrationTier::Great,
            "gold" => confetti::CelebrationTier::Epic,
            "platinum" => confetti::CelebrationTier::Epic,
            _ => confetti::CelebrationTier::Great,
        };

        confetti::celebrate(tier);
        let message = format!("{} You earned {}!", badge.emoji, badge.badge_name);
        speech::celebrate(&message);
    }
}

/// Check for platinum badge achievements (triggered after any badge award)
async fn check_platinum_achievements() {
    use crate::db_client;

    let aggregate_sql = "
        SELECT
            (SELECT COUNT(*) FROM badges WHERE badge_type = 'skill_mastery' AND tier = 'platinum' AND earned = 1) as skill_platinum_count,
            (SELECT COUNT(*) FROM badges WHERE badge_type = 'story' AND earned = 1) as story_count,
            (SELECT COUNT(*) FROM badges WHERE badge_type = 'quest_chain' AND earned = 1) as chain_count,
            (SELECT COUNT(*) FROM gardens WHERE growth_stage >= 5) as garden_count
    ";
    let (skill_platinum_count, story_count, chain_count, garden_count) =
        match db_client::query(aggregate_sql, vec![]).await {
            Ok(rows) => (
                extract_count_i64(&rows, "skill_platinum_count"),
                extract_count_i64(&rows, "story_count"),
                extract_count_i64(&rows, "chain_count"),
                extract_count_i64(&rows, "garden_count"),
            ),
            Err(_) => (0, 0, 0, 0),
        };

    if skill_platinum_count >= 6 {
        award_badge_direct("badge-kindness-master").await;
    }

    if story_count >= 15 {
        award_badge_direct("badge-story-master").await;
    }

    if chain_count >= 12 {
        award_badge_direct("badge-chain-champion").await;
    }

    if garden_count >= 12 {
        award_badge_direct("badge-garden-keeper").await;
    }
}

/// Check daily combo achievement (quest + act + reflect + emotion)
// Dead Code Cleanup: Unused badge functions (planned future features)
#[allow(dead_code)]
pub async fn check_daily_combo() {
    use crate::db_client;

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let combo_sql = "
        SELECT
            (SELECT COUNT(*) FROM quests WHERE day_key = ?1 AND completed = 1) as quest_count,
            (SELECT COUNT(*) FROM kind_acts WHERE day_key = ?1) as act_count,
            (SELECT COUNT(*) FROM kind_acts WHERE day_key = ?1 AND reflection_type IS NOT NULL) as reflection_count,
            (SELECT COUNT(*) FROM kind_acts WHERE day_key = ?1 AND emotion_selected IS NOT NULL) as emotion_count
    ";
    let (quest_done, act_done, reflected, emotion) = match db_client::query(combo_sql, vec![today.clone()]).await {
        Ok(rows) => (
            extract_count_i64(&rows, "quest_count") > 0,
            extract_count_i64(&rows, "act_count") > 0,
            extract_count_i64(&rows, "reflection_count") > 0,
            extract_count_i64(&rows, "emotion_count") > 0,
        ),
        Err(_) => (false, false, false, false),
    };

    if quest_done && act_done && reflected && emotion {
        // Mark combo_day in kind_acts
        let update_sql = "UPDATE kind_acts SET combo_day = 1 WHERE day_key = ?1";
        let _ = db_client::exec(update_sql, vec![today.clone()]).await;

        // Award Super Day badge
        award_badge("badge-super-day").await;

        // Check for streaks
        check_combo_streaks().await;
    }
}

/// Check for combo streaks (3-day, Perfect Week)
async fn check_combo_streaks() {
    use crate::db_client;

    let streak_sql = "
        SELECT
            (SELECT COUNT(*) FROM kind_acts WHERE combo_day = 1 AND day_key >= date('now', '-3 days')) as three_day_count,
            (SELECT COUNT(*) FROM kind_acts WHERE combo_day = 1 AND day_key >= date('now', '-7 days')) as week_count,
            (SELECT COUNT(DISTINCT day_key) FROM kind_acts WHERE combo_day = 1) as full_heart_count,
            (SELECT COUNT(DISTINCT category) FROM kind_acts WHERE day_key >= date('now', '-7 days')) as rainbow_count
    ";
    let (three_day_count, week_count, full_heart_count, rainbow_count) =
        match db_client::query(streak_sql, vec![]).await {
            Ok(rows) => (
                extract_count_i64(&rows, "three_day_count"),
                extract_count_i64(&rows, "week_count"),
                extract_count_i64(&rows, "full_heart_count"),
                extract_count_i64(&rows, "rainbow_count"),
            ),
            Err(_) => (0, 0, 0, 0),
        };

    if three_day_count >= 3 {
        award_badge("badge-kindness-streak").await;
    }

    if week_count >= 7 {
        award_badge("badge-perfect-week").await;
    }

    if full_heart_count >= 10 {
        award_badge("badge-full-heart").await;
    }

    if rainbow_count >= 6 {
        award_badge("badge-rainbow-week").await;
    }
}

/// Check Ultimate Heart badge (500 total hearts) - called when hearts are awarded
pub async fn check_ultimate_heart(hearts_total: u32) {
    if hearts_total >= 500 {
        award_badge("badge-ultimate-heart").await;
    }
}

/// Check skill mastery badge progression (called when kind act is recorded)
#[allow(dead_code)]
pub async fn check_skill_mastery(skill_category: &str) {
    use crate::db_client;

    // Count acts for this skill
    let count_sql = "SELECT COUNT(*) as count FROM kind_acts WHERE category = ?1";
    let count = match db_client::query(count_sql, vec![skill_category.to_string()]).await {
        Ok(rows) => extract_count_i64(&rows, "count"),
        Err(_) => 0,
    };

    // Award appropriate tier badge
    let badge_prefix = format!("badge-{}", skill_category);

    if count >= 100 {
        award_badge(&format!("{}-platinum", badge_prefix)).await;
    } else if count >= 50 {
        award_badge(&format!("{}-gold", badge_prefix)).await;
    } else if count >= 25 {
        award_badge(&format!("{}-silver", badge_prefix)).await;
    } else if count >= 10 {
        award_badge(&format!("{}-bronze", badge_prefix)).await;
    }
}

/// Render badge collection grid (collapsible sections by badge type)
#[allow(dead_code)]
pub fn render_badge_grid() -> String {
    r#"<div class="badge-panel" data-panel="badges">
        <div class="panel-header">
            <h2>🏆 Badge Collection</h2>
            <p>Earn badges by completing quests, stories, and special challenges!</p>
        </div>

        <div class="badge-sections">
            <details class="badge-section" open>
                <summary>⭐ Quest Chain Badges (12)</summary>
                <div class="badge-grid" data-badge-type="quest_chain"></div>
            </details>

            <details class="badge-section">
                <summary>📖 Story Badges (10)</summary>
                <div class="badge-grid" data-badge-type="story"></div>
            </details>

            <details class="badge-section">
                <summary>🌟 Combo Badges (5)</summary>
                <div class="badge-grid" data-badge-type="combo"></div>
            </details>

            <details class="badge-section">
                <summary>🏅 Skill Mastery (24)</summary>
                <div class="badge-grid" data-badge-type="skill_mastery"></div>
            </details>

            <details class="badge-section">
                <summary>👑 Platinum Badges (5)</summary>
                <div class="badge-grid" data-badge-type="platinum"></div>
            </details>
        </div>
    </div>"#
    .to_string()
}

/// Seed badges table on first boot
#[allow(dead_code)]
pub async fn seed_badges() {
    use crate::db_client;

    // Check if already seeded
    let check_sql = "SELECT COUNT(*) as count FROM badges";
    let count = match db_client::query(check_sql, vec![]).await {
        Ok(rows) => extract_count_i64(&rows, "count") as f64,
        Err(_) => 0.0,
    };

    if count > 0.0 {
        return; // Already seeded
    }

    console::log_1(&"[badges] Seeding badges table".into());

    // Insert all badges
    for badge in get_all_badges() {
        let sql = "INSERT INTO badges (id, badge_type, badge_name, emoji, unlock_criteria, tier, earned, earned_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, NULL)";
        let params = vec![
            badge.id.into(),
            badge.badge_type.into(),
            badge.badge_name.into(),
            badge.emoji.into(),
            badge.unlock_criteria.into(),
            badge.tier.into(),
        ];

        if let Err(e) = db_client::exec(sql, params).await {
            console::error_1(&format!("[badges] Failed to seed badge {}: {:?}", badge.id, e).into());
        }
    }

    console::log_1(&"[badges] Seeded 56 badges".into());
}
