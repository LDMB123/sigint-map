use crate::db_client;

pub const FEATURE_SKILL_PROGRESSION: &str = "feature.skill_progression_v1";
pub const FEATURE_ADAPTIVE_QUESTS: &str = "feature.adaptive_quests_v1";
pub const FEATURE_REFLECTION: &str = "feature.reflection_v1";
pub const FEATURE_PARENT_INSIGHTS: &str = "feature.parent_insights_v1";

pub const FEATURE_DEFAULTS: &[(&str, bool)] = &[
    (FEATURE_SKILL_PROGRESSION, true),
    (FEATURE_ADAPTIVE_QUESTS, true),
    (FEATURE_REFLECTION, true),
    (FEATURE_PARENT_INSIGHTS, true),
];

pub const FEATURE_KEYS: &[&str] = &[
    FEATURE_SKILL_PROGRESSION,
    FEATURE_ADAPTIVE_QUESTS,
    FEATURE_REFLECTION,
    FEATURE_PARENT_INSIGHTS,
];

pub async fn ensure_defaults() {
    for (key, enabled) in FEATURE_DEFAULTS {
        if db_client::get_setting(key).await.is_none() {
            let value = if *enabled { "1" } else { "0" };
            db_client::set_setting(key, value).await;
        }
    }
}

pub async fn is_enabled(key: &str) -> bool {
    match db_client::get_setting(key).await {
        Some(value) => value != "0",
        None => true,
    }
}

pub async fn set_enabled(key: &str, enabled: bool) {
    let value = if enabled { "1" } else { "0" };
    db_client::set_setting(key, value).await;
}

pub async fn get_all() -> Vec<(String, bool)> {
    let mut values = Vec::with_capacity(FEATURE_KEYS.len());
    for key in FEATURE_KEYS {
        values.push(((*key).to_string(), is_enabled(key).await));
    }
    values
}

pub async fn is_skill_progression_enabled() -> bool {
    is_enabled(FEATURE_SKILL_PROGRESSION).await
}

pub async fn is_adaptive_quests_enabled() -> bool {
    is_enabled(FEATURE_ADAPTIVE_QUESTS).await
}

pub async fn is_reflection_enabled() -> bool {
    is_enabled(FEATURE_REFLECTION).await
}

pub async fn is_parent_insights_enabled() -> bool {
    is_enabled(FEATURE_PARENT_INSIGHTS).await
}
