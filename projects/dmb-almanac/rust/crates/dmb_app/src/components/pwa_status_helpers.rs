use super::*;

pub(super) fn e2e_version_from_sw_script_url(script_url: &str) -> Option<String> {
    let marker = "e2e=";
    let start = script_url.find(marker)? + marker.len();
    let rest = &script_url[start..];
    let end = rest.find('&').unwrap_or(rest.len());
    let value = rest[..end].trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

pub(super) fn should_suppress_update_notice(last_dismissed_ms: Option<f64>, now_ms: f64) -> bool {
    let Some(last) = last_dismissed_ms else {
        return false;
    };
    if now_ms < last {
        return true;
    }
    (now_ms - last) < UPDATE_SNOOZE_MS
}

pub(super) fn remaining_snooze_ms(last_dismissed_ms: Option<f64>, now_ms: f64) -> Option<f64> {
    let last = last_dismissed_ms?;
    if now_ms < last {
        return Some(UPDATE_SNOOZE_MS);
    }
    let elapsed = now_ms - last;
    if elapsed >= UPDATE_SNOOZE_MS {
        None
    } else {
        Some(UPDATE_SNOOZE_MS - elapsed)
    }
}

fn format_relative_age(ts: f64, now_ms: f64) -> String {
    if now_ms <= ts {
        return "just now".to_string();
    }
    let minutes = (now_ms - ts) / 60000.0;
    if minutes < 1.0 {
        "just now".to_string()
    } else if minutes < 60.0 {
        format!("{minutes:.0}m ago")
    } else {
        let hours = minutes / 60.0;
        format!("{hours:.1}h ago")
    }
}

pub(super) fn format_last_checked(ts: f64, now_ms: f64) -> String {
    format!("Last checked: {}", format_relative_age(ts, now_ms))
}

pub(super) fn format_age(prefix: &str, ts: f64, now_ms: f64) -> String {
    format!("{prefix}: {}", format_relative_age(ts, now_ms))
}

#[cfg(feature = "hydrate")]
pub(super) async fn count_cache_entries() -> Option<usize> {
    service_worker::count_all_cache_entries().await
}

#[cfg(feature = "hydrate")]
pub(super) async fn refresh_cache_entries(cache_entries: RwSignal<Option<usize>>) {
    cache_entries.set(count_cache_entries().await);
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub(super) async fn refresh_cache_entries(_cache_entries: RwSignal<Option<usize>>) {}

#[cfg(feature = "hydrate")]
pub(super) fn spawn_cache_entries_refresh(cache_entries: RwSignal<Option<usize>>) {
    spawn_local(async move {
        refresh_cache_entries(cache_entries).await;
    });
}

#[cfg(not(feature = "hydrate"))]
pub(super) fn spawn_cache_entries_refresh(_cache_entries: RwSignal<Option<usize>>) {}

#[cfg(feature = "hydrate")]
fn is_previous_app_cache_name(name: &str) -> bool {
    if name.starts_with("dmb-almanac-rs") {
        return false;
    }

    let previous_prefixes = [
        "dmb-shell-",
        "dmb-assets-",
        "dmb-api-",
        "dmb-pages-",
        "dmb-images-",
        "dmb-fonts-stylesheets-",
        "dmb-fonts-webfonts-",
        "dmb-offline-",
        "dmb-sync-",
        "dmb-almanac-",
    ];

    previous_prefixes
        .iter()
        .any(|prefix| name.starts_with(prefix))
}

#[cfg(feature = "hydrate")]
pub(super) async fn cleanup_previous_app_caches() -> Option<usize> {
    let names = service_worker::cache_names().await?;
    let mut deleted = 0usize;
    for name in names {
        if !is_previous_app_cache_name(&name) {
            continue;
        }
        if service_worker::delete_cache_by_name(&name).await {
            deleted += 1;
        }
    }
    Some(deleted)
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub(super) async fn cleanup_previous_app_caches() -> Option<usize> {
    None
}

#[cfg(feature = "hydrate")]
pub(super) fn set_update_reloading_state(state: &PwaStatusState) {
    state
        .update_state
        .set(Some(UPDATE_STATE_RELOADING.to_string()));
    state.update_applying.set(false);
}

#[cfg(not(feature = "hydrate"))]
pub(super) fn set_update_reloading_state(_state: &PwaStatusState) {}

#[cfg(feature = "hydrate")]
pub(super) fn set_update_ready_state(state: &PwaStatusState) {
    state.update_ready.set(true);
    state
        .update_state
        .set(Some(UPDATE_STATE_READY_TO_INSTALL.to_string()));
}

#[cfg(not(feature = "hydrate"))]
pub(super) fn set_update_ready_state(_state: &PwaStatusState) {}

#[cfg(feature = "hydrate")]
pub(super) fn clear_update_progress_state(state: &PwaStatusState) {
    state.update_error.set(None);
    state.update_applying.set(false);
    state.update_checking.set(false);
}

#[cfg(not(feature = "hydrate"))]
pub(super) fn clear_update_progress_state(_state: &PwaStatusState) {}

pub(super) fn action_reset_data() {
    #[cfg(feature = "hydrate")]
    {
        spawn_local(async move {
            let _ = service_worker::delete_all_caches().await;
            let _ = dmb_idb::delete_db().await;
            let _ = crate::browser::runtime::location_reload();
        });
    }
}
