use super::*;

fn render_ai_parity_card(state: AiDiagnosticsState) -> impl IntoView {
    let run_click_state = state;
    let run_label_state = state;
    let run_disabled_state = state;

    view! {
        <div class="card">
            <h2>"Parity"</h2>
            <ul class="list">
                <li>{move || {
                    state.sqlite_parity_summary.get().map_or_else(
                        || "SQLite table coverage: n/a".to_string(),
                        |summary| {
                            if !summary.available {
                                "SQLite table coverage: unavailable".to_string()
                            } else if summary.missing_tables.is_empty() {
                                format!(
                                    "SQLite table coverage: {}/{} present",
                                    summary.sqlite_tables_present,
                                    summary.sqlite_tables_expected
                                )
                            } else {
                                format!(
                                    "SQLite table coverage: {}/{} present ({} missing)",
                                    summary.sqlite_tables_present,
                                    summary.sqlite_tables_expected,
                                    summary.missing_tables.len()
                                )
                            }
                        },
                    )
                }}</li>
                <li>{move || {
                    state.integrity_report.get().map_or_else(
                        || "IDB integrity: n/a".to_string(),
                        |report| {
                            if report.total_mismatches == 0 {
                                "IDB integrity: ok".to_string()
                            } else {
                                format!("IDB integrity: {} mismatch(es)", report.total_mismatches)
                            }
                        },
                    )
                }}</li>
                <li>{move || {
                    state.sqlite_parity.get().map_or_else(
                        || "SQLite parity: n/a".to_string(),
                        |report| {
                            if !report.available {
                                "SQLite parity: unavailable".to_string()
                            } else if report.total_mismatches == 0 {
                                "SQLite parity: ok".to_string()
                            } else {
                                format!("SQLite parity: {} mismatch(es)", report.total_mismatches)
                            }
                        },
                    )
                }}</li>
            </ul>
            <p>
                <button
                    type="button"
                    class="pill pill--ghost"
                    on:click=move |_| action_run_parity_refresh(run_click_state)
                    disabled=move || run_disabled_state.parity_check_running.get()
                >
                    {move || {
                        if run_label_state.parity_check_running.get() {
                            "Running full parity check…"
                        } else {
                            "Run full parity check"
                        }
                    }}
                </button>
            </p>
            <p class="muted">"Detailed mismatches are shown in the PWA Status panel."</p>
        </div>
    }
}

fn render_ai_config_card(state: AiDiagnosticsState) -> impl IntoView {
    let refresh_state = state;
    let export_state = state;

    view! {
        <div class="card">
            <h2>"AI Config"</h2>
            <ul class="list">
                <li>{move || format!("Seeded: {}", if state.ai_config_seeded.get() { "yes" } else { "no" })}</li>
                <li>{move || format!("Version: {}", state.ai_config_version.get().unwrap_or_else(|| "n/a".to_string()))}</li>
                <li>{move || format!("Generated: {}", state.ai_config_generated_at.get().unwrap_or_else(|| "n/a".to_string()))}</li>
                <li>{move || state.ai_config_mismatch.get().unwrap_or_else(|| "Remote AI config matches local metadata.".to_string())}</li>
            </ul>
            <p class="muted">
                "Keys: "
                <code>"dmb-ai-config-seeded"</code>
                ", "
                <code>"dmb-ai-config-version"</code>
                ", "
                <code>"dmb-ai-config-generated-at"</code>
            </p>
            <p>
                <button type="button" class="pill" on:click=move |_| action_refresh_ai_config(refresh_state)>
                    "Refresh AI config"
                </button>
                " "
                <button type="button" class="pill pill--ghost" on:click=move |_| action_export_diagnostics(export_state)>
                    "Export diagnostics JSON"
                </button>
            </p>
        </div>
    }
}

fn render_ai_capabilities_list(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{move || format!("WebGPU available: {}", if state.caps.get().webgpu_available { "yes" } else { "no" })}</li>
            <li>{move || format!("WebGPU enabled: {}", if state.caps.get().webgpu_enabled { "yes" } else { "no" })}</li>
            <li>{move || format!("WebGPU worker: {}", if state.caps.get().webgpu_worker { "yes" } else { "no" })}</li>
            <li>{move || format!("WebNN: {}", if state.caps.get().webnn { "yes" } else { "no" })}</li>
            <li>{move || format!("WASM SIMD: {}", if state.caps.get().wasm_simd { "yes" } else { "no" })}</li>
            <li>{move || format!("Threads: {}", if state.caps.get().threads { "yes" } else { "no" })}</li>
            <li>{move || format!("Cross-origin isolated: {}", state.cross_origin_isolated.get().map_or("n/a", |value| if value { "yes" } else { "no" }))}</li>
            <li>{move || format!("Worker max floats: {}", state.worker_max_floats.get().map_or_else(|| "n/a".to_string(), |value| value.to_string()))}</li>
            <li>{move || format!("Worker threshold override: {}", state.worker_threshold_current.get().map_or_else(|| "auto".to_string(), |value| value.to_string()))}</li>
            <li>{move || format!("Worker bench timestamp: {}", state.worker_bench_timestamp.get().map_or_else(|| "n/a".to_string(), |value| format!("{value:.0}")))}</li>
            <li>{move || format!("WebGPU probe: {}", state.webgpu_probe.get().map_or("n/a", |value| if value { "yes" } else { "no" }))}</li>
        </ul>
    }
}

fn render_ai_capabilities_card(state: AiDiagnosticsState) -> impl IntoView {
    let refresh_config_state = state;
    let toggle_webgpu_state = state;
    let worker_failure_state = state;
    let threads_state = state;
    let webnn_state = state;
    let webgpu_disabled_state = state;

    view! {
        <div class="card">
            <h2>"Capabilities"</h2>
            {render_ai_capabilities_list(state)}
            <button type="button" class="pill pill--ghost" on:click=move |_| action_toggle_webgpu(toggle_webgpu_state)>
                {move || if webgpu_disabled_state.webgpu_disabled.get() { "Enable WebGPU" } else { "Disable WebGPU" }}
            </button>
            {move || {
                if worker_failure_state.worker_failure.get().cooldown_remaining_ms.is_some() {
                    let clear_state = worker_failure_state;
                    view! {
                        <button type="button" class="pill pill--ghost" on:click=move |_| action_clear_worker_cooldown(clear_state)>
                            "Clear worker cooldown"
                        </button>
                    }
                    .into_any()
                } else {
                    ().into_any()
                }
            }}
            <button type="button" class="pill pill--ghost" on:click=move |_| action_refresh_ai_config(refresh_config_state)>
                "Refresh AI config"
            </button>
            <Show when=move || threads_state.caps.get().threads && threads_state.cross_origin_isolated.get() == Some(false) fallback=|| () >
                <p class="muted">"Threads require COOP/COEP. Enable cross-origin isolation to unlock worker SIMD."</p>
            </Show>
            <Show when=move || webnn_state.caps.get().webnn && !webnn_state.caps.get().webgpu_enabled fallback=|| () >
                <p class="muted">"WebNN detected (experimental). Current scoring uses WASM SIMD until WebNN is enabled."</p>
            </Show>
        </div>
    }
}

fn render_ai_warnings_card(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <div class="card">
            <h2>"AI Warnings"</h2>
            {move || {
                let warnings = state.ai_warnings.get();
                if warnings.is_empty() {
                    view! { <p class="muted">"No AI warnings recorded."</p> }.into_any()
                } else {
                    let items = warnings.iter().rev().take(5).map(|event| {
                        let detail = event.details.clone().unwrap_or_else(|| "n/a".to_string());
                        view! { <li>{format!("{} – {}", event.event, detail)}</li> }
                    });
                    view! { <ul class="list">{items.collect_view()}</ul> }.into_any()
                }
            }}
        </div>
    }
}

fn render_webgpu_runtime_card(state: AiDiagnosticsState) -> impl IntoView {
    let refresh_state = state;
    let reset_state = state;
    view! {
        <div class="card">
            <h2>"WebGPU Runtime"</h2>
            {move || {
                state.webgpu_runtime.get().map_or_else(
                    || view! { <p class="muted">"Runtime telemetry unavailable."</p> }.into_any(),
                    |telemetry| {
                        let direct_calls = telemetry.counters.get("direct_scores_calls").copied().unwrap_or(0);
                        let worker_success = telemetry.counters.get("worker_success").copied().unwrap_or(0);
                        let worker_fallback = telemetry.counters.get("worker_fallback_runtime_failed").copied().unwrap_or(0)
                            + telemetry.counters.get("worker_fallback_init_failed").copied().unwrap_or(0);
                        let subset_success = telemetry.counters.get("subset_worker_success").copied().unwrap_or(0);
                        let last_event = telemetry.last_event.unwrap_or_else(|| "none".to_string());
                        let last_event_age = telemetry.last_event_ts.map_or_else(
                            || "n/a".to_string(),
                            |timestamp| format!("{:.1}m ago", ((js_sys::Date::now() - timestamp) / 60000.0).max(0.0)),
                        );
                        view! {
                            <ul class="list">
                                <li>{format!("Direct score calls: {direct_calls}")}</li>
                                <li>{format!("Worker successes: {worker_success}")}</li>
                                <li>{format!("Worker fallback errors: {worker_fallback}")}</li>
                                <li>{format!("Subset worker successes: {subset_success}")}</li>
                                <li>{format!("Last event: {last_event}")}</li>
                                <li>{format!("Last event age: {last_event_age}")}</li>
                            </ul>
                        }.into_any()
                    },
                )
            }}
            <div class="pill-row">
                <button type="button" class="pill pill--ghost" on:click=move |_| action_refresh_runtime_metrics(refresh_state)>
                    "Refresh Runtime Metrics"
                </button>
                <button type="button" class="pill pill--ghost" on:click=move |_| action_reset_runtime_metrics(reset_state)>
                    "Reset WebGPU Metrics"
                </button>
            </div>
        </div>
    }
}

fn render_apple_silicon_card(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <div class="card">
            <h2>"Apple Silicon Profile"</h2>
            {move || {
                state.apple_silicon_profile.get().map_or_else(
                    || view! { <p class="muted">"Profile unavailable."</p> }.into_any(),
                    |profile| {
                        let workgroup_dot = profile.workgroup.as_ref().and_then(|group| group.dot).map_or_else(|| "n/a".to_string(), |value| value.to_string());
                        let workgroup_score = profile.workgroup.as_ref().and_then(|group| group.score).map_or_else(|| "n/a".to_string(), |value| value.to_string());
                        let threshold = profile.worker.as_ref().and_then(|worker| worker.threshold_floats).map_or_else(|| "n/a".to_string(), |value| value.to_string());
                        let max_floats = profile.worker.as_ref().and_then(|worker| worker.max_floats).map_or_else(|| "n/a".to_string(), |value| value.to_string());
                        view! {
                            <ul class="list">
                                <li>{format!("Apple Silicon detected: {}", if profile.is_apple_silicon { "yes" } else { "no" })}</li>
                                <li>{format!("CPU cores: {}", profile.cpu_cores.map_or_else(|| "n/a".to_string(), |value| format!("{value:.0}")))}</li>
                                <li>{format!("Device memory: {}", profile.device_memory_gb.map_or_else(|| "n/a".to_string(), |value| format!("{value:.1} GB")))}</li>
                                <li>{format!("Workgroup dot: {workgroup_dot}")}</li>
                                <li>{format!("Workgroup score: {workgroup_score}")}</li>
                                <li>{format!("Worker threshold: {threshold}")}</li>
                                <li>{format!("Worker max floats: {max_floats}")}</li>
                            </ul>
                        }.into_any()
                    },
                )
            }}
        </div>
    }
}

fn render_idb_runtime_card(state: AiDiagnosticsState) -> impl IntoView {
    let refresh_state = state;
    view! {
        <div class="card">
            <h2>"IndexedDB Runtime"</h2>
            {move || {
                state.idb_runtime_metrics.get().map_or_else(
                    || view! { <p class="muted">"Runtime metrics unavailable."</p> }.into_any(),
                    |metrics| {
                        let blocked_age = metrics.open_blocked_last_ms.map_or_else(
                            || "n/a".to_string(),
                            |timestamp| format!("{:.1}m ago", ((js_sys::Date::now() - timestamp) / 60000.0).max(0.0)),
                        );
                        let version_age = metrics.version_change_last_ms.map_or_else(
                            || "n/a".to_string(),
                            |timestamp| format!("{:.1}m ago", ((js_sys::Date::now() - timestamp) / 60000.0).max(0.0)),
                        );
                        view! {
                            <ul class="list">
                                <li>{format!("Open blocked events: {}", metrics.open_blocked_count)}</li>
                                <li>{format!("Last open blocked: {blocked_age}")}</li>
                                <li>{format!("Version change events: {}", metrics.version_change_count)}</li>
                                <li>{format!("Last version change: {version_age}")}</li>
                            </ul>
                        }.into_any()
                    },
                )
            }}
            <button type="button" class="pill pill--ghost" on:click=move |_| action_refresh_runtime_metrics(refresh_state)>
                "Refresh Runtime Metrics"
            </button>
        </div>
    }
}

pub(crate) fn render_ai_diagnostics_runtime_system_cards(
    state: AiDiagnosticsState,
) -> impl IntoView {
    view! {
        <>
            {render_ai_parity_card(state)}
            {render_ai_config_card(state)}
            {render_ai_capabilities_card(state)}
            {render_ai_warnings_card(state)}
            {render_webgpu_runtime_card(state)}
            {render_apple_silicon_card(state)}
            {render_idb_runtime_card(state)}
        </>
    }
}
