use super::*;

fn sw_details_text(state: &PwaStatusState) -> String {
    let mut parts = Vec::new();

    if let Some(version) = state.sw_version.get() {
        parts.push(format!("SW {version}"));
    }
    if let Some(url) = state.sw_controller_url.get() {
        parts.push(format!("Controller {}", shorten_script_url(&url)));
    }
    if let Some(controller_state) = state.sw_controller_state.get() {
        parts.push(format!("Controller {controller_state}"));
    }
    if let Some(impl_name) = state.sw_controller_impl.get() {
        parts.push(format!("Impl {impl_name}"));
    }
    if let Some(prefix) = state.sw_controller_cache_prefix.get() {
        parts.push(format!("Cache {prefix}"));
    }
    if let Some(scope) = state.sw_scope.get() {
        parts.push(format!("Scope {scope}"));
    }
    if let Some(ts) = state.sw_activated_at.get() {
        #[cfg(feature = "hydrate")]
        {
            parts.push(format_age("Activated", ts, js_sys::Date::now()));
        }
    }
    if let Some(ts) = state.previous_cache_cleaned_at.get() {
        #[cfg(feature = "hydrate")]
        {
            parts.push(format_age("Old caches cleaned", ts, js_sys::Date::now()));
        }
    }
    if let Some(count) = state.cache_entries.get() {
        parts.push(format!("Cache {count} entries"));
    }

    #[cfg(feature = "hydrate")]
    {
        if let Some(ts) = state.update_last_checked.get() {
            parts.push(format_last_checked(ts, js_sys::Date::now()));
        }
    }

    if parts.is_empty() {
        "No SW details yet.".to_string()
    } else {
        parts.join(" · ")
    }
}

pub(super) fn render_update_control_rows(state: PwaStatusState) -> impl IntoView {
    let update_checking = state.update_checking;

    let on_update_check = {
        let state = state.clone();
        move |_| action_update_check(state.clone())
    };

    view! {
        <>
            <div class="pwa-status__row">
                <button
                    type="button"
                    class="pill pill--ghost"
                    on:click=on_update_check
                    disabled=move || update_checking.get()
                >
                    {move || if update_checking.get() { "Checking updates…" } else { "Check for updates" }}
                </button>
            </div>
            <details class="pwa-status__details">
                <summary class="pill pill--ghost">"SW details"</summary>
                {render_sw_details_section(state.clone())}
            </details>
        </>
    }
}

fn render_sw_details_section(state: PwaStatusState) -> impl IntoView {
    let sw_controller_impl = state.sw_controller_impl;
    let online = state.online;
    let previous_cache_cleanup = state.previous_cache_cleanup;
    let sw_action_status = state.sw_action_status;

    let on_cleanup_previous_caches = {
        let state = state.clone();
        move |_| action_cleanup_previous_caches(state.clone())
    };
    let on_ping_sw = {
        let state = state.clone();
        move |_| action_ping_sw(state.clone())
    };
    let on_unregister_sw = {
        let state = state.clone();
        move |_| action_unregister_sw(state.clone())
    };

    view! {
        <>
            <div class="pwa-status__row muted">{move || sw_details_text(&state)}</div>
            <Show
                when=move || {
                    sw_controller_impl
                        .get()
                        .is_some_and(|name| name.to_lowercase() != "rust")
                }
                fallback=|| ()
            >
                <div class="pwa-status__row pwa-status__row--warn">
                    <span>
                        "Service worker controller is not the Rust implementation. If the UI looks stale, try unregistering."
                    </span>
                </div>
            </Show>
            <div class="pwa-status__row">
                <button
                    type="button"
                    class="pill pill--ghost"
                    on:click=on_cleanup_previous_caches
                    disabled=move || !online.get()
                >
                    "Cleanup old caches"
                </button>
                <button type="button" class="pill pill--ghost" on:click=on_ping_sw>
                    "Ping SW"
                </button>
                <button type="button" class="pill pill--ghost" on:click=on_unregister_sw>
                    "Unregister SW"
                </button>
            </div>
            {move || {
                previous_cache_cleanup.get().map(|message| {
                    view! { <div class="pwa-status__row muted">{message}</div> }
                })
            }}
            {move || {
                sw_action_status.get().map(|message| {
                    view! { <div class="pwa-status__row muted" role="status" aria-live="polite">{message}</div> }
                })
            }}
        </>
    }
}

pub(super) fn render_export_row(state: PwaStatusState) -> impl IntoView {
    let status = state.status;
    let on_export_parity = {
        let state = state.clone();
        move |_| action_export_parity(state.clone())
    };

    view! {
        <div class="pwa-status__row">
            <button
                type="button"
                class="pill pill--ghost"
                on:click=on_export_parity
                disabled=move || {
                    let current = status.get();
                    !current.done && current.error.is_none()
                }
            >
                "Export parity report"
            </button>
        </div>
    }
}
