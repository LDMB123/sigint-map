use super::*;

fn render_embedding_sample_card(state: AiDiagnosticsState) -> impl IntoView {
    let toggle_state = state;
    let enabled_state = state;
    let status_state = state;
    view! {
        <div class="card">
            <h2>"Embedding Sample"</h2>
            <p class="muted">"Use a small sample dataset for faster local tuning."</p>
            <div class="pill-row">
                <button type="button" class="pill pill--ghost" on:click=move |_| action_toggle_embedding_sample(toggle_state)>
                    {move || if enabled_state.embedding_sample_enabled.get() { "Disable Sample" } else { "Enable Sample" }}
                </button>
            </div>
            <p class="muted">
                {move || if status_state.embedding_sample_enabled.get() { "Sample mode is ON." } else { "Sample mode is OFF." }}
            </p>
            <p class="muted">"Reload to apply changes."</p>
        </div>
    }
}

fn render_ann_index_card(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <div class="card">
            <h2>"ANN Index"</h2>
            {move || state.ann_meta.get().map(|meta| view! {
                <ul class="list">
                    <li>{format!("Method: {}", meta.method)}</li>
                    <li>{format!("Dim: {}", meta.dim)}</li>
                    <li>{format!("Records: {}", meta.record_count)}</li>
                    <li>{format!("Built: {}", meta.built_at)}</li>
                    <li>{format!("Source: {}", meta.source_manifest)}</li>
                    <li>{format!("Index File: {}", meta.index_file.unwrap_or_else(|| "n/a".to_string()))}</li>
                    <li>{format!("Clusters: {}", meta.cluster_count.unwrap_or(0))}</li>
                    <li>{format!("Probes: {}", meta.probe_count.unwrap_or(0))}</li>
                </ul>
            })}
        </div>
    }
}

fn render_ann_cap_card(state: AiDiagnosticsState) -> impl IntoView {
    let load_state = state;
    let apply_state = state;
    let clear_state = state;
    view! {
        <div class="card">
            <h2>"ANN Cap"</h2>
            <div class="pill-row">
                <button type="button" class="pill" prop:disabled=move || state.ann_caps_loading.get() on:click=move |_| action_load_ann_caps(load_state)>
                    {move || if state.ann_caps_loading.get() { "Loading embeddings…" } else { "Load embeddings" }}
                </button>
            </div>
            {move || state.ann_caps_error.get().map(|msg| view! { <p class="muted">{msg}</p> })}
            {move || state.ann_caps.get().map(|cap| view! {
                <ul class="list">
                    <li>{format!("Cap: {}", format_mb_u64(cap.cap_bytes))}</li>
                    <li>{format!("Override: {}", cap.cap_override_mb.map_or_else(|| "none".to_string(), |value| format!("{value} MB")))}</li>
                    <li>{format!("Before: {} ({} vectors)", format_mb_u64(cap.matrix_bytes_before), cap.vectors_before)}</li>
                    <li>{format!("After: {} ({} vectors)", format_mb_u64(cap.matrix_bytes_after), cap.vectors_after)}</li>
                    <li>{format!("IVF bytes: {}", cap.ivf_bytes.map_or_else(|| "n/a".to_string(), format_mb_u64))}</li>
                    <li>{format!("IVF cap: {}", cap.ivf_cap_bytes.map_or_else(|| "n/a".to_string(), format_mb_u64))}</li>
                    <li>{format!("Chunks loaded: {}", cap.chunks_loaded.unwrap_or(0))}</li>
                    <li>{format!("Records loaded: {}", cap.records_loaded.unwrap_or(0))}</li>
                    <li>{format!("IVF Dropped: {}", if cap.ivf_dropped { "yes" } else { "no" })}</li>
                    <li>{format!("Used ANN: {}", if cap.used_ann { "yes" } else { "no" })}</li>
                    <li>{format!("Capped: {}", if cap.capped { "yes" } else { "no" })}</li>
                    <li>{format!("Budget capped: {}", if cap.budget_capped { "yes" } else { "no" })}</li>
                    <li>{format!("Device Memory: {}", cap.device_memory_gb.map_or_else(|| "n/a".to_string(), |value| format!("{value:.1} GB")))}</li>
                    <li>{format!("Tier: {}", cap.policy_tier)}</li>
                </ul>
            })}
            <div class="stack">
                <label class="stack">
                    <span class="muted">"Override cap (MB)"</span>
                    <input
                        class="input"
                        type="number"
                        min="128"
                        max="2048"
                        step="1"
                        prop:value=move || state.ann_cap_override_input.get()
                        on:input=move |ev| state.ann_cap_override_input.set(event_target_value(&ev))
                    />
                </label>
                <div class="pill-row">
                    <button type="button" class="pill pill--ghost" on:click=move |_| action_apply_ann_cap_override(apply_state)>"Apply Override"</button>
                    <button type="button" class="pill pill--ghost" on:click=move |_| action_clear_ann_cap_override(clear_state)>"Reset Auto"</button>
                </div>
                {move || state.ann_cap_override_value.get().map(|value| view! { <p class="muted">{format!("Current override: {value} MB")}</p> })}
            </div>
        </div>
    }
}

fn render_telemetry_snapshot_card(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <div class="card">
            <h2>"Telemetry Snapshot"</h2>
            {move || state.telemetry_snapshot.get().map(|snapshot| {
                let minutes = (js_sys::Date::now() - snapshot.timestamp_ms) / 60000.0;
                view! {
                    <ul class="list">
                        <li>{format!("Last update: {:.1}m ago", minutes.max(0.0))}</li>
                        <li>{format!("Worker threshold: {}", snapshot.worker_threshold.map_or_else(|| "n/a".to_string(), |value| value.to_string()))}</li>
                        <li>{format!("Worker max floats: {}", snapshot.worker_max_floats.map_or_else(|| "n/a".to_string(), |value| value.to_string()))}</li>
                        <li>{format!("Worker cooldown: {}", snapshot.worker_failure_remaining_ms.map_or_else(|| "none".to_string(), |value| format!("{:.0}s", (value / 1000.0).max(0.0))))}</li>
                        <li>{format!("Worker last error: {}", snapshot.worker_failure_reason.unwrap_or_else(|| "none".to_string()))}</li>
                        <li>{format!("ANN cap recorded: {}", if snapshot.ann_cap.is_some() { "yes" } else { "no" })}</li>
                        <li>{format!("ANN cap override: {}", snapshot.ann_cap_override_mb.map_or_else(|| "none".to_string(), |value| format!("{value} MB")))}</li>
                        <li>{format!("WebGPU enabled: {}", snapshot.webgpu_enabled.map_or("n/a", |value| if value { "yes" } else { "no" }))}</li>
                        <li>{format!("WebGPU available: {}", snapshot.webgpu_available.map_or("n/a", |value| if value { "yes" } else { "no" }))}</li>
                        <li>{format!("WebNN: {}", snapshot.webnn.map_or("n/a", |value| if value { "yes" } else { "no" }))}</li>
                        <li>{format!("AI config version: {}", snapshot.ai_config_version.unwrap_or_else(|| "n/a".to_string()))}</li>
                        <li>{format!("AI config generated: {}", snapshot.ai_config_generated_at.unwrap_or_else(|| "n/a".to_string()))}</li>
                        <li>{format!("AI config seeded: {}", snapshot.ai_config_seeded.map_or("n/a", |value| if value { "yes" } else { "no" }))}</li>
                        <li>{format!("Embedding sample: {}", snapshot.embedding_sample_enabled.map_or("n/a", |value| if value { "on" } else { "off" }))}</li>
                    </ul>
                }
            })}
        </div>
    }
}

fn render_embedding_manifest_card(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <div class="card">
            <h2>"Embedding Manifest"</h2>
            {move || state.embed_meta.get().map(|meta| view! {
                <ul class="list">
                    <li>{format!("Version: {}", meta.version)}</li>
                    <li>{format!("Dim: {}", meta.dim)}</li>
                    <li>{format!("Chunks: {}", meta.chunk_count)}</li>
                </ul>
            })}
        </div>
    }
}

pub(crate) fn render_ai_diagnostics_runtime_embedding_cards(
    state: AiDiagnosticsState,
) -> impl IntoView {
    view! {
        <>
            {render_embedding_sample_card(state)}
            {render_ann_index_card(state)}
            {render_ann_cap_card(state)}
            {render_telemetry_snapshot_card(state)}
            {render_embedding_manifest_card(state)}
        </>
    }
}
