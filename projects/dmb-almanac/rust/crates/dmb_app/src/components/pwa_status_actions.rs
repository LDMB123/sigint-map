use super::pwa_status_runtime::{
    remove_local_storage_item, set_local_storage_f64_item, set_sw_action_status,
};
use super::*;

macro_rules! hydrate_action {
    ($state:ident, $body:block) => {{
        #[cfg(feature = "hydrate")]
        $body
        #[cfg(not(feature = "hydrate"))]
        {
            let _ = $state;
        }
    }};
}

pub(super) fn action_update_click(state: PwaStatusState) {
    hydrate_action!(state, {
        state.update_applying.set(true);
        state.update_error.set(None);
        state
            .update_state
            .set(Some(UPDATE_STATE_APPLYING.to_string()));

        spawn_local(async move {
            let Some(container) = service_worker::service_worker_container() else {
                state.update_error.set(Some(
                    "Service worker unavailable in this context.".to_string(),
                ));
                state.update_applying.set(false);
                state.update_state.set(None);
                state.update_ready.set(false);
                return;
            };

            if let Some(reg) = service_worker::current_registration(&container).await {
                if let Some(worker) = reg.waiting() {
                    service_worker::post_message_type(&worker, "SKIP_WAITING");
                } else {
                    state.update_error.set(Some(
                        "No waiting service worker. Try again in a moment.".to_string(),
                    ));
                    state.update_applying.set(false);
                    state.update_state.set(None);
                    state.update_ready.set(false);
                    return;
                }
            }

            let state_on_change = state.clone();
            let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                set_update_reloading_state(&state_on_change);
                let _ = crate::browser::runtime::location_reload();
            }) as Box<dyn Fn()>);
            container
                .add_event_listener_with_callback("controllerchange", cb.as_ref().unchecked_ref())
                .ok();
            cb.forget();

            let state_timeout = state.clone();
            schedule_window_timeout(1500, move || {
                set_update_reloading_state(&state_timeout);
                if !crate::browser::runtime::location_reload() {
                    state_timeout
                        .update_error
                        .set(Some("Reload blocked. Please refresh manually.".to_string()));
                }
            });
        });
    });
}

pub(super) fn action_update_later(state: PwaStatusState) {
    hydrate_action!(state, {
        let now = js_sys::Date::now();
        set_local_storage_f64_item(UPDATE_DISMISSED_AT_KEY, now);
        state.update_snoozed.set(true);
        state.update_ready.set(false);
    });
}

pub(super) fn action_update_check(state: PwaStatusState) {
    hydrate_action!(state, {
        state.update_checking.set(true);
        state
            .update_state
            .set(Some(UPDATE_STATE_CHECKING.to_string()));

        spawn_local(async move {
            if let Some(container) = service_worker::service_worker_container() {
                if let Some(reg) = service_worker::current_registration(&container).await {
                    if let Ok(promise) = reg.update() {
                        let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
                    }
                }
                let now = js_sys::Date::now();
                set_local_storage_f64_item(UPDATE_CHECKED_AT_KEY, now);
                state.update_last_checked.set(Some(now));
            }

            state.update_checking.set(false);
            if !state.update_ready.get_untracked() && state.update_error.get_untracked().is_none() {
                state
                    .update_state
                    .set(Some(UPDATE_STATE_NO_UPDATE_FOUND.to_string()));
                let state_for_timeout = state.clone();
                schedule_window_timeout(2500, move || {
                    if state_for_timeout.update_state.get_untracked().as_deref()
                        == Some(UPDATE_STATE_NO_UPDATE_FOUND)
                    {
                        state_for_timeout.update_state.set(None);
                    }
                });
            } else {
                state.update_state.set(None);
            }
        });
    });
}

pub(super) fn action_storage_cleanup(state: PwaStatusState) {
    hydrate_action!(state, {
        spawn_local(async move {
            let _ = crate::data::handle_storage_pressure().await;
            state
                .storage_warning
                .set(Some(STORAGE_PRESSURE_CLEARED_MESSAGE.to_string()));
        });
    });
}

pub(super) fn action_prompt_install(state: PwaStatusState) {
    hydrate_action!(state, {
        state
            .install_status
            .set(Some("Opening install prompt…".to_string()));
        spawn_local(async move {
            let accepted = crate::browser::pwa::prompt_install().await;
            if accepted {
                state.install_status.set(Some(
                    "Install accepted. Waiting for Chromium to finish install…".to_string(),
                ));
            } else {
                crate::browser::pwa::dismiss_install_prompt_now();
                state
                    .install_status
                    .set(Some("Install prompt dismissed.".to_string()));
            }
            refresh_install_prompt_state(&state);
        });
    });
}

pub(super) fn action_dismiss_install(state: PwaStatusState) {
    hydrate_action!(state, {
        crate::browser::pwa::dismiss_install_prompt_now();
        state
            .install_status
            .set(Some("Install prompt dismissed.".to_string()));
        refresh_install_prompt_state(&state);
    });
}

pub(super) fn action_cleanup_previous_caches(state: PwaStatusState) {
    hydrate_action!(state, {
        state
            .previous_cache_cleanup
            .set(Some("Cleaning old caches…".to_string()));

        spawn_local(async move {
            let deleted = cleanup_previous_app_caches().await.unwrap_or(0);
            let now = js_sys::Date::now();

            set_local_storage_f64_item(PREVIOUS_CACHE_CLEANED_AT_KEY, now);

            state.previous_cache_cleaned_at.set(Some(now));
            refresh_cache_entries(state.cache_entries).await;

            let message = if deleted == 0 {
                "Old caches: none found.".to_string()
            } else if deleted == 1 {
                "Old caches: removed 1 cache.".to_string()
            } else {
                format!("Old caches: removed {deleted} caches.")
            };
            state.previous_cache_cleanup.set(Some(message));

            let state_for_timeout = state.clone();
            schedule_window_timeout(4500, move || {
                let current = state_for_timeout.previous_cache_cleanup.get_untracked();
                if current
                    .as_deref()
                    .map(|v| v.starts_with("Old caches:"))
                    .unwrap_or(false)
                {
                    state_for_timeout.previous_cache_cleanup.set(None);
                }
            });
        });
    });
}

pub(super) fn action_ping_sw(state: PwaStatusState) {
    hydrate_action!(state, {
        set_sw_action_status(state.sw_action_status, "Pinging service worker…");

        spawn_local(async move {
            let Some(container) = service_worker::service_worker_container() else {
                set_sw_action_status(state.sw_action_status, "No window");
                return;
            };

            let Some(controller) = service_worker::controller(&container) else {
                set_sw_action_status(state.sw_action_status, "No SW controller yet.");
                return;
            };

            if let Some(reg) = service_worker::current_registration(&container).await {
                if reg.waiting().is_some() {
                    set_sw_action_status(
                        state.sw_action_status,
                        "Ping sent (note: update is waiting).",
                    );
                }
            }

            service_worker::post_message_type(&controller, "PING");
        });
    });
}

pub(super) fn action_unregister_sw(state: PwaStatusState) {
    hydrate_action!(state, {
        set_sw_action_status(state.sw_action_status, "Unregistering service worker…");

        spawn_local(async move {
            let Some(container) = service_worker::service_worker_container() else {
                set_sw_action_status(state.sw_action_status, "No window");
                return;
            };

            let Some(reg) = service_worker::current_registration(&container).await else {
                set_sw_action_status(state.sw_action_status, "No SW registration found.");
                return;
            };

            let promise = match reg.unregister() {
                Ok(promise) => promise,
                Err(err) => {
                    set_sw_action_status(
                        state.sw_action_status,
                        &format!("SW unregister failed: {err:?}"),
                    );
                    return;
                }
            };

            let unregistered = match wasm_bindgen_futures::JsFuture::from(promise).await {
                Ok(value) => value.as_bool().unwrap_or(true),
                Err(err) => {
                    set_sw_action_status(
                        state.sw_action_status,
                        &format!("SW unregister failed: {err:?}"),
                    );
                    return;
                }
            };

            if !unregistered {
                set_sw_action_status(state.sw_action_status, "SW unregister returned false.");
                return;
            }

            remove_local_storage_item(SW_VERSION_KEY);
            remove_local_storage_item(SW_ACTIVATED_AT_KEY);
            remove_local_storage_item(UPDATE_DISMISSED_AT_KEY);

            set_sw_action_status(state.sw_action_status, "SW unregistered. Reloading…");
            let _ = crate::browser::runtime::location_reload();
        });
    });
}
