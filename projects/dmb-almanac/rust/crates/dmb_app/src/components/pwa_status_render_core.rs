use super::*;

pub(super) fn render_import_status_rows(state: PwaStatusState) -> impl IntoView {
    let status = state.status;

    view! {
        <>
            <div class="pwa-status__row" role="status" aria-live="polite">
                <span>{move || status.get().message.clone()}</span>
            </div>
            {move || {
                let current = status.get();
                current.error.as_ref().map(|err| {
                    let err_text = err.clone();
                    view! { <div class="pwa-status__row pwa-status__row--error">{err_text}</div> }
                })
            }}
            {move || {
                let current = status.get();
                current.tuning.as_ref().map(|tuning| {
                    view! {
                        <div class="pwa-status__row muted">
                            {format!(
                                "Import tuning: chunk {} • tx {} • last {:.0}ms • long frames {}",
                                tuning.chunk_records,
                                tuning.tx_batch_size,
                                tuning.last_chunk_ms,
                                tuning.long_task_count
                            )}
                        </div>
                    }
                })
            }}
            <Show
                when=move || {
                    let current = status.get();
                    current.progress > 0.0 && !current.done
                }
                fallback=|| ()
            >
                {move || {
                    let current = status.get();
                    let width = format!("{:.0}%", current.progress * 100.0);
                    view! {
                        <div class="pwa-progress">
                            <div class="pwa-progress__bar" style:width=width></div>
                        </div>
                    }
                }}
            </Show>
        </>
    }
}

pub(super) fn render_storage_rows(state: PwaStatusState) -> impl IntoView {
    let storage = state.storage;
    let storage_warning = state.storage_warning;

    view! {
        <>
            {move || {
                storage.get().map(|info| {
                    let usage = info.usage.unwrap_or(0.0);
                    let quota = info.quota.unwrap_or(0.0);
                    let percent = if quota > 0.0 { (usage / quota) * 100.0 } else { 0.0 };
                    view! {
                        <div class="pwa-status__row">
                            <span>
                                {format!(
                                    "Storage {:.1} MB / {:.1} MB ({:.0}%)",
                                    usage / 1_000_000.0,
                                    quota / 1_000_000.0,
                                    percent
                                )}
                            </span>
                        </div>
                    }
                })
            }}
            {move || {
                storage.get().and_then(|info| {
                    let usage = info.usage.unwrap_or(0.0);
                    let quota = info.quota.unwrap_or(0.0);
                    if quota <= 0.0 {
                        return None;
                    }
                    let ratio = usage / quota;
                    if ratio < crate::data::STORAGE_PRESSURE_THRESHOLD {
                        return None;
                    }
                    Some(view! {
                        <div class="pwa-status__row pwa-status__row--warn">
                            <span>{format!("Storage pressure: {:.0}% used", ratio * 100.0)}</span>
                            <button
                                type="button"
                                class="pill pill--ghost"
                                on:click={
                                    let state = state.clone();
                                    move |_| action_storage_cleanup(state.clone())
                                }
                            >
                                "Clear AI cache"
                            </button>
                        </div>
                    })
                })
            }}
            {move || {
                storage_warning.get().map(|message| {
                    view! { <div class="pwa-status__row muted">{message}</div> }
                })
            }}
        </>
    }
}

pub(super) fn render_metadata_rows(state: PwaStatusState) -> impl IntoView {
    let sw_version = state.sw_version;
    let sw_activated_at = state.sw_activated_at;
    let ai_config_version = state.ai_config_version;
    let ai_config_generated_at = state.ai_config_generated_at;
    let embedding_sample_enabled = state.embedding_sample_enabled;
    let ai_config_status = state.ai_config_status;
    let ann_cap_override = state.ann_cap_override;
    let cache_entries = state.cache_entries;
    let update_state = state.update_state;
    let perf_metrics = state.perf_metrics;
    let import_tuning_enabled = state.import_tuning_enabled;

    view! {
        <>
            {move || {
                sw_version.get().map(|version| {
                    view! { <div class="pwa-status__row">{"SW version "}{version}</div> }
                })
            }}
            <Show when=move || sw_activated_at.get().is_some() fallback=|| ()>
                {move || {
                    #[cfg(feature = "hydrate")]
                    {
                        let ts = sw_activated_at.get().unwrap_or(0.0);
                        let now = js_sys::Date::now();
                        view! { <div class="pwa-status__row muted">{format_age("SW activated", ts, now)}</div> }
                    }
                    #[cfg(not(feature = "hydrate"))]
                    {

                    }
                }}
            </Show>
            {move || {
                ai_config_version.get().map(|version| {
                    view! { <div class="pwa-status__row muted">{format!("AI config v{version}")}</div> }
                })
            }}
            {move || {
                ai_config_generated_at.get().map(|generated_at| {
                    view! { <div class="pwa-status__row muted">{format!("AI config generated {generated_at}")}</div> }
                })
            }}
            {move || {
                embedding_sample_enabled.get().map(|enabled| {
                    view! { <div class="pwa-status__row muted">{format!("Embedding sample: {}", if enabled { "on" } else { "off" })}</div> }
                })
            }}
            {move || {
                ai_config_status.get().map(|message| {
                    view! { <div class="pwa-status__row pwa-status__row--warn">{message}</div> }
                })
            }}
            {move || {
                ann_cap_override.get().map(|override_mb| {
                    view! { <div class="pwa-status__row muted">{format!("ANN cap override: {override_mb} MB")}</div> }
                })
            }}
            {move || {
                cache_entries.get().map(|count| {
                    view! { <div class="pwa-status__row muted">{format!("Cache entries: {count}")}</div> }
                })
            }}
            <div class="pwa-status__row muted">
                {move || format!(
                    "Adaptive import tuning: {}",
                    if import_tuning_enabled.get() { "on" } else { "off" }
                )}
            </div>
            {move || {
                perf_metrics.get().map(|metrics| {
                    let message = if !metrics.supported {
                        "INP telemetry: unsupported in this browser/runtime".to_string()
                    } else {
                        let p75 = metrics
                            .p75_interaction_ms
                            .map(|value| format!("{value:.0}ms"))
                            .unwrap_or_else(|| "n/a".to_string());
                        let interactions = metrics
                            .interaction_count
                            .map_or_else(|| "n/a".to_string(), |value| value.to_string());
                        format!(
                            "INP p75 {p75} • long frames {} • interactions {}",
                            metrics.long_frame_count, interactions
                        )
                    };
                    view! {
                        <div class="pwa-status__row muted">
                            {message}
                        </div>
                    }
                })
            }}
            {move || {
                update_state.get().map(|message| {
                    view! { <div class="pwa-status__row muted">{message}</div> }
                })
            }}
        </>
    }
}

pub(super) fn render_network_rows(state: PwaStatusState) -> impl IntoView {
    let online = state.online;
    let status = state.status;
    let on_reset_data = move |_| action_reset_data();

    view! {
        <>
            <div class="pwa-status__row">
                <span class="pill">{move || if online.get() { "Online" } else { "Offline" }}</span>
            </div>
            <Show when=move || !online.get() fallback=|| ()>
                <div class="pwa-status__row pwa-status__row--warn" role="alert">
                    "You are offline. Cached pages remain available; updates and network sync are paused."
                </div>
            </Show>
            {move || {
                let current = status.get();
                if current.can_reset {
                    Some(view! {
                        <div class="pwa-status__row pwa-status__row--warn">
                            <span>"Offline data needs attention."</span>
                            <button type="button" class="pill pill--ghost" on:click=on_reset_data>
                                "Reset offline data"
                            </button>
                        </div>
                    })
                } else {
                    None
                }
            }}
        </>
    }
}

pub(super) fn render_install_rows(state: PwaStatusState) -> impl IntoView {
    let install_prompt = state.install_prompt;
    let install_status = state.install_status;
    let on_install = {
        let state = state.clone();
        move |_| action_prompt_install(state.clone())
    };
    let on_dismiss = {
        let state = state.clone();
        move |_| action_dismiss_install(state.clone())
    };

    view! {
        <>
            {move || {
                let prompt = install_prompt.get();
                if !prompt.supported || prompt.installed || prompt.dismissed_at_ms.is_some() {
                    return ().into_any();
                }

                if prompt.available {
                    view! {
                        <div class="pwa-status__row pwa-status__row--update" role="status" aria-live="polite">
                            <span>"Install this app for single-client offline use."</span>
                            <button type="button" class="pill" on:click=on_install>
                                "Install app"
                            </button>
                            <button type="button" class="pill pill--ghost" on:click=on_dismiss>
                                "Not now"
                            </button>
                        </div>
                    }
                    .into_any()
                } else {
                    view! {
                        <div class="pwa-status__row muted">
                            "Install prompt is not currently available. Chromium will surface it when eligibility heuristics are met."
                        </div>
                    }
                    .into_any()
                }
            }}
            {move || {
                install_status.get().map(|message| {
                    view! { <div class="pwa-status__row muted">{message}</div> }
                })
            }}
        </>
    }
}
