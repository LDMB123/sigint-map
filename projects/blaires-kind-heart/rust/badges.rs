use crate::{db_client, dom};
pub struct Badge {
    pub id: &'static str,
    #[allow(dead_code)] // Data model field — not accessed in Rust but defines badge schema
    pub badge_type: &'static str,
    pub badge_name: &'static str,
    pub emoji: &'static str,
    #[allow(dead_code)] // Data model field — not accessed in Rust but defines badge schema
    pub unlock_criteria: &'static str,
    pub tier: &'static str,
}
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
];
pub const STORY_BADGES: &[Badge] = &[
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
pub const SKILL_MASTERY_BADGES: &[Badge] = &[
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
];
fn find_badge(id: &str) -> Option<&'static Badge> {
    QUEST_CHAIN_BADGES
        .iter()
        .chain(STORY_BADGES.iter())
        .chain(COMBO_BADGES.iter())
        .chain(PLATINUM_BADGES.iter())
        .chain(SKILL_MASTERY_BADGES.iter())
        .find(|b| b.id == id)
}
fn extract_bool_flag(rows: &serde_json::Value, key: &str) -> bool {
    rows.as_array()
        .and_then(|arr| arr.first())
        .and_then(|row| row.get(key))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
        > 0.0
}
pub async fn award_badge(badge_id: &str) {
    award_badge_inner(badge_id, true).await;
}
fn award_badge_inner(
    badge_id: &str,
    check_platinum: bool,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + '_>> {
    Box::pin(award_badge_impl(badge_id, check_platinum))
}
async fn award_badge_impl(badge_id: &str, check_platinum: bool) {
    let check_sql = "SELECT earned FROM badges WHERE id = ?1";
    let already_earned = match db_client::query(check_sql, vec![badge_id.to_string()]).await {
        Ok(rows) => extract_bool_flag(&rows, "earned"),
        Err(_) => false,
    };
    if already_earned {
        return;
    }
    let now = js_sys::Date::now() as i64;
    let sql = "UPDATE badges SET earned = 1, earned_at = ?1 WHERE id = ?2";
    match db_client::exec(sql, vec![now.to_string(), badge_id.to_string()]).await {
        Ok(()) => {
            celebrate_badge_unlock(badge_id);
            crate::companion_skins::check_and_unlock_skin(badge_id).await;
            const PLATINUM_IDS: &[&str] = &[
                "badge-kindness-master",
                "badge-story-master",
                "badge-chain-champion",
                "badge-garden-keeper",
            ];
            if check_platinum && !PLATINUM_IDS.iter().any(|p| badge_id.starts_with(p)) {
                check_platinum_achievements().await;
            }
        }
        Err(e) => {
            dom::warn(&format!("[badges] Failed to award badge: {e:?}"));
        }
    }
}
fn celebrate_badge_unlock(badge_id: &str) {
    use crate::{confetti, speech};
    if let Some(badge) = find_badge(badge_id) {
        let tier = match badge.tier {
            "gold" | "platinum" => confetti::CelebrationTier::Epic,
            _ => confetti::CelebrationTier::Great,
        };
        confetti::celebrate(tier);
        let message = format!("{} You earned {}!", badge.emoji, badge.badge_name);
        speech::celebrate(&message);
    }
}
async fn check_platinum_achievements() {
    let aggregate_sql = " SELECT (SELECT COUNT(*) FROM badges WHERE badge_type = 'skill_mastery' AND tier = 'platinum' AND earned = 1) as skill_platinum_count, (SELECT COUNT(*) FROM badges WHERE badge_type = 'story' AND earned = 1) as story_count, (SELECT COUNT(*) FROM badges WHERE badge_type = 'quest_chain' AND earned = 1) as chain_count, (SELECT COUNT(*) FROM gardens WHERE growth_stage >= 5) as garden_count ";
    let (skill_platinum_count, story_count, chain_count, garden_count) =
        match db_client::query(aggregate_sql, vec![]).await {
            Ok(rows) => (
                db_client::extract_count(&rows, "skill_platinum_count"),
                db_client::extract_count(&rows, "story_count"),
                db_client::extract_count(&rows, "chain_count"),
                db_client::extract_count(&rows, "garden_count"),
            ),
            Err(_) => (0, 0, 0, 0),
        };
    if skill_platinum_count >= 4 {
        award_badge_inner("badge-kindness-master", false).await;
    }
    if story_count >= 15 {
        award_badge_inner("badge-story-master", false).await;
    }
    if chain_count >= 12 {
        award_badge_inner("badge-chain-champion", false).await;
    }
    if garden_count >= 12 {
        award_badge_inner("badge-garden-keeper", false).await;
    }
}
pub async fn check_ultimate_heart(hearts_total: u32) {
    if hearts_total >= 500 {
        award_badge("badge-ultimate-heart").await;
    }
}
pub fn check_ultimate_heart_spawn(hearts_total: u32) {
    crate::browser_apis::spawn_local_logged("badge-ultimate-heart", async move {
        check_ultimate_heart(hearts_total).await;
        Ok(())
    });
}
