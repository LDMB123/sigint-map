#[cfg_attr(not(feature = "hydrate"), allow(unused_imports))]
use super::*;

#[cfg(feature = "hydrate")]
use super::pwa_status_runtime_helpers::{
    has_previous_cache_cleanup_marker, remove_local_storage_item, schedule_window_timeout,
    set_local_storage_f64_item, set_local_storage_item, should_auto_check_for_updates,
};
#[cfg(feature = "hydrate")]
use crate::browser::service_worker;
#[cfg(feature = "hydrate")]
use leptos::task::spawn_local;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;

#[cfg(feature = "hydrate")]
fn has_sw_controller() -> bool {
    service_worker::service_worker_container()
        .map(|container| service_worker::has_controller(&container))
        .unwrap_or(false)
}

#[cfg(feature = "hydrate")]
pub(in super::super) fn set_sw_action_status(
    sw_action_status: RwSignal<Option<String>>,
    message: &str,
) {
    sw_action_status.set(Some(message.to_string()));
    schedule_window_timeout(5000, move || {
        sw_action_status.set(None);
    });
}

#[cfg(feature = "hydrate")]
fn parse_sw_message_payload(event: &web_sys::MessageEvent) -> Option<serde_json::Value> {
    if let Some(data) = event.data().as_string()
        && let Ok(payload) = serde_json::from_str::<serde_json::Value>(&data)
    {
        return Some(payload);
    }
    serde_wasm_bindgen::from_value::<serde_json::Value>(event.data()).ok()
}

#[cfg(feature = "hydrate")]
fn resolve_effective_sw_version(script_url: Option<String>, version: &str) -> String {
    script_url
        .and_then(|url| e2e_version_from_sw_script_url(&url))
        .unwrap_or_else(|| version.to_string())
}

#[cfg(feature = "hydrate")]
fn ping_controller_for_metadata(controller: &web_sys::ServiceWorker, state: &PwaStatusState) {
    state.sw_controller_impl.set(None);
    state.sw_controller_cache_prefix.set(None);

    service_worker::post_message_type(controller, "PING");
    state.sw_action_status.set(None);
}

#[cfg(feature = "hydrate")]
fn persist_effective_sw_version(state: &PwaStatusState, version: &str) {
    let effective = resolve_effective_sw_version(state.sw_controller_url.get_untracked(), version);
    state.sw_version.set(Some(effective.clone()));
    set_local_storage_item(SW_VERSION_KEY, &effective);
}

#[cfg(feature = "hydrate")]
fn sync_controller_version_from_script_url(script_url: &str, state: &PwaStatusState) {
    if let Some(version) = e2e_version_from_sw_script_url(script_url) {
        state.sw_version.set(Some(version.clone()));
        set_local_storage_item(SW_VERSION_KEY, &version);
    }
}

#[cfg(feature = "hydrate")]
fn apply_controller_snapshot(controller: &web_sys::ServiceWorker, state: &PwaStatusState) {
    crate::browser::perf::mark_startup_metric("sw_controller_seen_at_ms");
    let script_url = controller.script_url();
    state.sw_controller_url.set(Some(script_url.clone()));
    state
        .sw_controller_state
        .set(service_worker::worker_state(controller));
    sync_controller_version_from_script_url(&script_url, state);
    ping_controller_for_metadata(controller, state);
}

#[cfg(feature = "hydrate")]
fn clear_controller_snapshot(state: &PwaStatusState) {
    state.sw_controller_url.set(None);
    state.sw_controller_state.set(None);
    state.sw_controller_impl.set(None);
    state.sw_controller_cache_prefix.set(None);
}

#[cfg(feature = "hydrate")]
fn sync_current_controller_state(
    container: &web_sys::ServiceWorkerContainer,
    state: &PwaStatusState,
) -> bool {
    if let Some(controller) = container.controller() {
        apply_controller_snapshot(&controller, state);
        true
    } else {
        clear_controller_snapshot(state);
        false
    }
}

#[cfg(feature = "hydrate")]
fn attach_sw_message_listener(container: &web_sys::ServiceWorkerContainer, state: &PwaStatusState) {
    let state = state.clone();

    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move |event: web_sys::MessageEvent| {
        let Some(payload) = parse_sw_message_payload(&event) else {
            return;
        };
        let Some(event_type) = payload.get("type").and_then(|v| v.as_str()) else {
            return;
        };

        match event_type {
            "PONG" => {
                if let Some(impl_name) = payload.get("impl").and_then(|v| v.as_str()) {
                    state.sw_controller_impl.set(Some(impl_name.to_string()));
                }
                if let Some(version) = payload.get("version").and_then(|v| v.as_str()) {
                    persist_effective_sw_version(&state, version);
                }
                if let Some(prefix) = payload.get("cachePrefix").and_then(|v| v.as_str()) {
                    state
                        .sw_controller_cache_prefix
                        .set(Some(prefix.to_string()));
                }
                set_sw_action_status(state.sw_action_status, "Service worker responded to ping.");
            }
            "SW_ACTIVATED" => {
                if let Some(version) = payload.get("version").and_then(|v| v.as_str()) {
                    state.update_version.set(Some(version.to_string()));
                    persist_effective_sw_version(&state, version);
                }
                let now = js_sys::Date::now();
                state.sw_activated_at.set(Some(now));
                set_local_storage_f64_item(SW_ACTIVATED_AT_KEY, now);
                state.update_ready.set(false);
                state.update_state.set(None);
                state.update_error.set(None);
                state.update_applying.set(false);
                remove_local_storage_item(UPDATE_DISMISSED_AT_KEY);
                state.update_snoozed.set(false);
                spawn_cache_entries_refresh(state.cache_entries);
            }
            "SW_INSTALLED" => {
                if let Some(version) = payload.get("version").and_then(|v| v.as_str()) {
                    state.update_version.set(Some(version.to_string()));
                }
            }
            _ => {}
        }
    }) as Box<dyn FnMut(web_sys::MessageEvent)>);

    container
        .add_event_listener_with_callback("message", cb.as_ref().unchecked_ref())
        .ok();
    cb.forget();
}

#[cfg(feature = "hydrate")]
fn attach_sw_controllerchange_listener(
    container: &web_sys::ServiceWorkerContainer,
    state: &PwaStatusState,
) {
    let container_on_change = container.clone();
    let state = state.clone();

    let controllerchange_cb =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |_event: web_sys::Event| {
            if let Some(controller) = container_on_change.controller() {
                apply_controller_snapshot(&controller, &state);
            }
        }) as Box<dyn FnMut(web_sys::Event)>);

    container
        .add_event_listener_with_callback(
            "controllerchange",
            controllerchange_cb.as_ref().unchecked_ref(),
        )
        .ok();
    controllerchange_cb.forget();
}

#[cfg(feature = "hydrate")]
fn attach_installing_state_listener(
    reg: web_sys::ServiceWorkerRegistration,
    worker: web_sys::ServiceWorker,
    state: PwaStatusState,
) {
    let worker_for_state = worker.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let worker_state = service_worker::worker_state(&worker_for_state);

        if let Some(current_state) = worker_state.as_deref() {
            state
                .update_state
                .set(Some(format!("Update {current_state}…")));
            if current_state == "installed" {
                let waiting = reg.waiting().is_some();
                if has_sw_controller() && waiting && !refresh_update_notice_state(&state) {
                    set_update_ready_state(&state);
                }
                clear_update_progress_state(&state);
            }
        }
    }) as Box<dyn Fn()>);

    worker
        .add_event_listener_with_callback("statechange", cb.as_ref().unchecked_ref())
        .ok();
    cb.forget();
}

#[cfg(feature = "hydrate")]
fn attach_updatefound_listener(reg: web_sys::ServiceWorkerRegistration, state: PwaStatusState) {
    let reg_for_updatefound = reg.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        state.update_checking.set(true);
        state
            .update_state
            .set(Some(UPDATE_STATE_DOWNLOADING.to_string()));
        state.update_error.set(None);
        state.update_applying.set(false);
        state.update_ready.set(false);

        if let Some(worker) = reg_for_updatefound.installing() {
            attach_installing_state_listener(reg_for_updatefound.clone(), worker, state.clone());
        }
    }) as Box<dyn Fn()>);

    reg.add_event_listener_with_callback("updatefound", cb.as_ref().unchecked_ref())
        .ok();
    cb.forget();
}

#[cfg(feature = "hydrate")]
async fn process_sw_registration(
    container: web_sys::ServiceWorkerContainer,
    state: PwaStatusState,
    has_controller: bool,
) {
    use wasm_bindgen_futures::JsFuture;

    let Ok(reg_val) = JsFuture::from(container.get_registration()).await else {
        return;
    };
    let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() else {
        return;
    };

    state.sw_scope.set(Some(reg.scope()));
    if let Some(active_worker) = reg.active() {
        let script_url = active_worker.script_url();
        if !script_url.is_empty() {
            state.sw_controller_url.set(Some(script_url.clone()));
            state
                .sw_controller_state
                .set(service_worker::worker_state(&active_worker));
            sync_controller_version_from_script_url(&script_url, &state);
        }
    }

    if reg.waiting().is_some() {
        if has_controller && !refresh_update_notice_state(&state) {
            set_update_ready_state(&state);
        }
        clear_update_progress_state(&state);
    }

    if let Some(worker) = reg.installing() {
        attach_installing_state_listener(reg.clone(), worker, state.clone());
    }

    attach_updatefound_listener(reg.clone(), state.clone());

    let online = crate::browser::runtime::navigator_on_line().unwrap_or(false);

    if online {
        let now = js_sys::Date::now();
        let should_check = should_auto_check_for_updates(now);

        if should_check {
            if let Ok(promise) = reg.update() {
                let _ = JsFuture::from(promise).await;
            }
            set_local_storage_f64_item(UPDATE_CHECKED_AT_KEY, now);
            state.update_last_checked.set(Some(now));
        }
    }

    if has_controller && online {
        let now = js_sys::Date::now();
        let should_cleanup = !has_previous_cache_cleanup_marker();

        if should_cleanup {
            let _ = cleanup_previous_app_caches().await;
            set_local_storage_f64_item(PREVIOUS_CACHE_CLEANED_AT_KEY, now);
            state.previous_cache_cleaned_at.set(Some(now));
            refresh_cache_entries(state.cache_entries).await;
        }
    }
}

#[cfg(feature = "hydrate")]
pub(in super::super) fn attach_sw_runtime_observers(state: &PwaStatusState) {
    let state = state.clone();

    let Some(container) = service_worker::service_worker_container() else {
        return;
    };

    attach_sw_message_listener(&container, &state);
    attach_sw_controllerchange_listener(&container, &state);
    crate::browser::perf::mark_startup_metric("sw_observer_attached_at_ms");
    let _ = sync_current_controller_state(&container, &state);
}

#[cfg(feature = "hydrate")]
pub(in super::super) fn spawn_sw_maintenance_task(state: &PwaStatusState) {
    let state = state.clone();

    spawn_local(async move {
        let Some(container) = service_worker::service_worker_container() else {
            return;
        };
        let has_controller = sync_current_controller_state(&container, &state);
        process_sw_registration(container, state, has_controller).await;
    });
}
