use crate::{domain_services, feature_flags, skill_taxonomy, utils};

pub async fn get_daily_quests_adaptive() -> [usize; 3] {
    let day = utils::day_number_since_epoch();
    let general = || 84 + (day % 16);
    let adaptive_enabled = feature_flags::is_adaptive_quests_enabled().await;
    let focus_quest_idx = if adaptive_enabled {
        match domain_services::get_focus_skill().await {
            Some(skill) => {
                let quest_indices = skill_taxonomy::skill_quest_indices(&skill);
                if quest_indices.is_empty() {
                    general()
                } else {
                    quest_indices[day % quest_indices.len()]
                }
            }
            None => general(),
        }
    } else {
        general()
    };
    let mut r1 = (day + 1) % 100;
    while r1 == focus_quest_idx {
        r1 = (r1 + 1) % 100;
    }
    let mut r2 = (day + 2) % 100;
    while r2 == focus_quest_idx || r2 == r1 {
        r2 = (r2 + 1) % 100;
    }
    [focus_quest_idx, r1, r2]
}
