use super::*;

#[cfg(feature = "hydrate")]
pub(super) fn refresh_install_prompt_state(state: &PwaStatusState) {
    state
        .install_prompt
        .set(crate::browser::pwa::install_prompt_state());
}

#[cfg(feature = "hydrate")]
pub(super) fn refresh_update_notice_state(state: &PwaStatusState) -> bool {
    if let Some(ts) = local_storage_f64_by_key(UPDATE_DISMISSED_AT_KEY) {
        let now = js_sys::Date::now();
        let remaining = remaining_snooze_ms(Some(ts), now);
        state.update_snooze_remaining.set(remaining);
        return should_suppress_update_notice(Some(ts), now);
    }

    state.update_snooze_remaining.set(None);
    false
}

#[cfg(feature = "hydrate")]
pub(super) fn hydrate_local_snapshot(state: &PwaStatusState) {
    if let Some(ts) = local_storage_f64_by_key(UPDATE_CHECKED_AT_KEY) {
        state.update_last_checked.set(Some(ts));
    }
    if let Some(version) = local_storage_item_by_key(SW_VERSION_KEY) {
        state.sw_version.set(Some(version));
    }
    if let Some(value) = local_storage_f64_by_key(SW_ACTIVATED_AT_KEY) {
        state.sw_activated_at.set(Some(value));
    }
    if let Some(value) = local_storage_f64_by_key(PREVIOUS_CACHE_CLEANED_AT_KEY) {
        state.previous_cache_cleaned_at.set(Some(value));
    }
    #[cfg(feature = "ai_diagnostics_full")]
    {
        if let Some(version) = local_storage_item_by_key(crate::ai::AI_CONFIG_VERSION_KEY) {
            state.ai_config_version.set(Some(version));
        }
        if let Some(generated_at) = local_storage_item_by_key(crate::ai::AI_CONFIG_GENERATED_AT_KEY)
        {
            state.ai_config_generated_at.set(Some(generated_at));
        }
        if let Some(sample) = local_storage_item_by_key(crate::ai::EMBEDDING_SAMPLE_KEY) {
            state.embedding_sample_enabled.set(Some(sample == "1"));
        }
    }
}

#[cfg(feature = "hydrate")]
pub(super) fn register_online_offline_listeners(state: &PwaStatusState) {
    let online_for_online = state.online;
    let online_for_offline = state.online;
    if let Some(initial_online) = crate::browser::runtime::register_online_offline_listeners(
        move || {
            online_for_online.set(true);
        },
        move || {
            online_for_offline.set(false);
        },
    ) {
        state.online.set(initial_online);
    }
}
