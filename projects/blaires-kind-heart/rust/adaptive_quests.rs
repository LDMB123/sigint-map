//! Adaptive quest selection system.
//! Slot 0: Focus quest (targets skill with highest focus_priority)
//! Slots 1-2: Deterministic rotation (unchanged)
//!
//! NEW: Weekly theme support - if Mom Mode sets a weekly theme, quest chains take priority.
//! Otherwise, adaptive selection from the 100-quest pool.
//!
//! Quest pool mapping: Each skill maps to relevant quest indices from the 100-quest pool.
//! When a skill needs practice, we pick a quest that teaches that skill.

use std::collections::HashMap;

use crate::{skill_progression, utils};

/// Map skills to quest indices that teach those skills
/// Based on the 100-quest pool in quests.rs
/// Indices 0-83: 12 quest chains (7 quests each, 2 chains per skill)
/// Indices 84-99: 16 extra general quests
fn skill_to_quest_indices() -> HashMap<&'static str, Vec<usize>> {
    let mut map = HashMap::new();

    // Hug skill: CHAIN-HUG-1 (0-6) + CHAIN-HUG-2 (7-13)
    map.insert("hug", vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

    // Sharing skill: CHAIN-SHARING-1 (14-20) + CHAIN-SHARING-2 (21-27)
    map.insert("sharing", vec![14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]);

    // Helping skill: CHAIN-HELPING-1 (28-34) + CHAIN-HELPING-2 (35-41)
    map.insert("helping", vec![28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41]);

    // Nice-words skill: CHAIN-NICE-WORDS-1 (42-48) + CHAIN-NICE-WORDS-2 (49-55)
    map.insert("nice-words", vec![42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]);

    // Love skill: CHAIN-LOVE-1 (56-62) + CHAIN-LOVE-2 (63-69)
    map.insert("love", vec![56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69]);

    // Unicorn skill: CHAIN-UNICORN-1 (70-76) + CHAIN-UNICORN-2 (77-83)
    map.insert("unicorn", vec![70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83]);

    map
}

/// Get daily quest indices with adaptive focus quest in slot 0
/// Returns [focus_quest, rotation_quest_1, rotation_quest_2]
///
/// NEW BEHAVIOR: If a weekly theme is active (via Mom Mode), returns quest chain quests instead.
pub async fn get_daily_quests_adaptive() -> [usize; 3] {
    // Dead Code Cleanup: quest_chains and weekly_themes modules removed - features unimplemented
    // PRIORITY 1: Check for active weekly theme/quest chain (DISABLED - modules deleted)
    // let week_key = crate::weekly_themes::get_week_key();
    // if let Some(chain_quests) = crate::quest_chains::get_daily_chain_quests(&week_key, 0).await {
    //     // Return quests from the active quest chain
    //     if chain_quests.len() >= 3 {
    //         return [chain_quests[0], chain_quests[1], chain_quests[2]];
    //     } else if chain_quests.len() == 2 {
    //         // Pad with a general quest if chain is nearly complete
    //         return [chain_quests[0], chain_quests[1], 84]; // Index 84 is first extra general quest
    //     } else if chain_quests.len() == 1 {
    //         return [chain_quests[0], 84, 85];
    //     }
    //     // If chain is complete (0 quests returned), fall through to adaptive selection
    // }

    // Adaptive selection (always used now that quest_chains/weekly_themes are removed)
    // Get the skill that needs most practice
    let focus_skill = skill_progression::get_focus_skill().await;

    // Map skill to quest indices
    let quest_map = skill_to_quest_indices();

    // Select focus quest (slot 0)
    let focus_quest_idx = if let Some(skill) = focus_skill {
        if let Some(quest_indices) = quest_map.get(skill.as_str()) {
            // Pick a quest for this skill using day-based rotation
            let day_num = utils::day_number_since_epoch();
            quest_indices[day_num % quest_indices.len()]
        } else {
            // Fallback: random kindness quest from general pool
            84 + (utils::day_number_since_epoch() % 16)
        }
    } else {
        // No focus skill yet (shouldn't happen after seeding), use general quests
        84 + (utils::day_number_since_epoch() % 16)
    };

    // Slots 1-2: Use deterministic rotation from the full 100-quest pool
    let day_num = utils::day_number_since_epoch();
    let rotation_1 = (day_num + 1) % 100;
    let rotation_2 = (day_num + 2) % 100;

    // Ensure no duplicates: if rotation quests match focus quest, skip ahead
    let rotation_1 = if rotation_1 == focus_quest_idx {
        (rotation_1 + 1) % 100
    } else {
        rotation_1
    };

    let rotation_2 = if rotation_2 == focus_quest_idx || rotation_2 == rotation_1 {
        (rotation_2 + 1) % 100
    } else {
        rotation_2
    };

    [focus_quest_idx, rotation_1, rotation_2]
}

/// Get the skill category for a focus quest index
/// Used to mark the quest card with data-focus="true"
#[allow(dead_code)]
pub fn get_focus_skill_for_quest(quest_idx: usize) -> Option<&'static str> {
    let quest_map = skill_to_quest_indices();

    // Find which skill this quest teaches
    for (skill, indices) in quest_map.iter() {
        if indices.contains(&quest_idx) {
            return Some(skill);
        }
    }

    None
}
