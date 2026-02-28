use crate::{skill_progression, utils};
use std::collections::HashMap;
fn skill_to_quest_indices() -> HashMap<&'static str, Vec<usize>> {
    let mut map = HashMap::new();
    map.insert("hug", vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    map.insert(
        "sharing",
        vec![14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
    );
    map.insert(
        "helping",
        vec![28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
    );
    map.insert(
        "love",
        vec![56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
    );
    map
}
pub async fn get_daily_quests_adaptive() -> [usize; 3] {
    let day = utils::day_number_since_epoch();
    let general = || 84 + (day % 16);
    let focus_quest_idx = match skill_progression::get_focus_skill().await {
        Some(skill) => skill_to_quest_indices()
            .get(skill.as_str())
            .map_or_else(general, |qi| qi[day % qi.len()]),
        None => general(),
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
