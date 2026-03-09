use super::*;

fn render_benchmark_card(state: AiDiagnosticsState) -> impl IntoView {
    let run_state = state;
    let cancel_state = state;
    view! {
        <div class="card">
            <h2>"Benchmark"</h2>
            <div class="stack">
                <button type="button" class="pill" on:click=move |_| action_run_benchmark(run_state)>"Run Benchmark"</button>
                {move || {
                    if state.bench_running.get() {
                        let cancel_click_state = cancel_state;
                        view! {
                            <button type="button" class="pill pill--ghost" on:click=move |_| action_cancel_benchmark(cancel_click_state)>
                                "Cancel"
                            </button>
                        }
                        .into_any()
                    } else {
                        ().into_any()
                    }
                }}
                <Show when=move || state.bench_running.get() fallback=|| () >
                    <div class="muted">{move || state.bench_stage.get()}</div>
                    <div class="pwa-progress">
                        <div class="pwa-progress__bar" style:width=move || format!("{:.0}%", state.bench_progress.get() * 100.0)></div>
                    </div>
                </Show>
            </div>
            {move || state.bench.get().map(|result| view! {
                <ul class="list">
                    <li>{format!("Sample Count: {}", result.sample_count)}</li>
                    <li>{format!("CPU (SIMD if enabled): {:.2} ms", result.cpu_ms)}</li>
                    <li>{format!("GPU: {}", result.gpu_ms.map_or_else(|| "n/a".to_string(), |value| format!("{value:.2} ms")))}</li>
                    <li>{format!("Backend: {}", result.backend)}</li>
                </ul>
            })}
        </div>
    }
}

fn render_benchmark_history_card(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <div class="card">
            <h2>"Benchmark History"</h2>
            {move || {
                let history = state.benchmark_history.get();
                if history.is_empty() {
                    return view! { <p class="muted">"No benchmark history yet."</p> }.into_any();
                }
                let items = history.iter().rev().take(5).map(|sample| {
                    let label = if let Some(full) = &sample.full {
                        format!("Full: {:.2} ms ({} samples)", full.gpu_ms.unwrap_or(full.cpu_ms), full.sample_count)
                    } else if let Some(subset) = &sample.subset {
                        format!("Subset: {:.2} ms ({} candidates)", subset.gpu_ms.unwrap_or(subset.cpu_ms), subset.candidate_count)
                    } else if let Some(worker) = &sample.worker {
                        format!("Worker: {} vectors (winner: {})", worker.vector_count, worker.winner.clone().unwrap_or_else(|| "n/a".to_string()))
                    } else {
                        "Unknown benchmark".to_string()
                    };
                    view! { <li>{format!("{:.0} ms – {}", sample.timestamp_ms, label)}</li> }
                });
                view! { <ul class="list">{items.collect_view()}</ul> }.into_any()
            }}
        </div>
    }
}

fn render_export_card(state: AiDiagnosticsState) -> impl IntoView {
    let export_state = state;
    view! {
        <div class="card">
            <h2>"Export"</h2>
            <p class="muted">"Download a JSON snapshot of AI diagnostics."</p>
            <button type="button" class="pill" on:click=move |_| action_export_diagnostics(export_state)>"Export Snapshot"</button>
        </div>
    }
}

fn render_worker_threshold_card(state: AiDiagnosticsState) -> impl IntoView {
    let run_state = state;
    let apply_state = state;
    let clear_state = state;
    view! {
        <div class="card">
            <h2>"Worker Threshold"</h2>
            <div class="stack">
                <button type="button" class="pill" on:click=move |_| action_run_worker_benchmark(run_state)>"Run Worker Benchmark"</button>
                {move || state.worker_threshold_current.get().map(|value| {
                    let dim = state.embed_meta.get().map_or(0, |meta| meta.dim as usize).max(1);
                    let approx_vectors = value / dim;
                    view! {
                        <p class="muted">{format!("Current threshold: {value} floats (~{approx_vectors} vectors @ dim {dim})")}</p>
                    }
                })}
                <label class="stack">
                    <span class="muted">"Override threshold (floats)"</span>
                    <input
                        class="input"
                        type="number"
                        min="0"
                        step="1"
                        prop:value=move || state.worker_threshold_input.get()
                        on:input=move |ev| state.worker_threshold_input.set(event_target_value(&ev))
                    />
                </label>
                <div class="pill-row">
                    <button type="button" class="pill pill--ghost" on:click=move |_| action_apply_worker_threshold(apply_state)>"Apply Override"</button>
                    <button type="button" class="pill pill--ghost" on:click=move |_| action_clear_worker_threshold(clear_state)>"Reset Auto"</button>
                </div>
            </div>
            {move || state.worker_bench.get().map(|result| view! {
                <ul class="list">
                    <li>{format!("Vectors: {}", result.vector_count)}</li>
                    <li>{format!("Dim: {}", result.dim)}</li>
                    <li>{format!("Direct: {}", result.direct_ms.map_or_else(|| "n/a".to_string(), |value| format!("{value:.2} ms")))}</li>
                    <li>{format!("Worker: {}", result.worker_ms.map_or_else(|| "n/a".to_string(), |value| format!("{value:.2} ms")))}</li>
                    <li>{format!("Winner: {}", result.winner.unwrap_or_else(|| "n/a".to_string()))}</li>
                    <li>{format!("Recommended threshold (floats): {}", result.recommended_threshold.map_or_else(|| "n/a".to_string(), |value| value.to_string()))}</li>
                </ul>
            })}
        </div>
    }
}

fn render_ivf_tuning_card(state: AiDiagnosticsState) -> impl IntoView {
    let run_state = state;
    view! {
        <div class="card">
            <h2>"IVF Tuning"</h2>
            <button type="button" class="pill" on:click=move |_| action_run_tuning(run_state)>"Auto-Tune Probe"</button>
            {move || state.tuning.get().map(|tuning| view! {
                <ul class="list">
                    <li>{format!("Probe Override: {}", tuning.probe_override.map_or_else(|| "none".to_string(), |value| value.to_string()))}</li>
                    <li>{format!("Target Latency: {:.1} ms", tuning.target_latency_ms)}</li>
                    <li>{format!("Last Latency: {}", tuning.last_latency_ms.map_or_else(|| "n/a".to_string(), |value| format!("{value:.2} ms")))}</li>
                </ul>
            })}
            {move || state.tuning_result.get().map(|result| view! {
                <ul class="list">
                    <li>{format!("Selected Probe: {}", result.selected_probe)}</li>
                    <li>{format!("Target: {:.1} ms", result.target_latency_ms)}</li>
                </ul>
            })}
            {move || state.tuning_result.get().map(|result| view! {
                <div class="list">
                    {result.metrics.into_iter().map(|metric| view! {
                        <div class="muted">{format!("Probe {} → {} candidates, {:.2} ms", metric.probe_count, metric.candidate_count, metric.avg_latency_ms)}</div>
                    }).collect_view()}
                </div>
            })}
        </div>
    }
}

pub(crate) fn render_ai_diagnostics_tuning_cards(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <>
            {render_benchmark_card(state)}
            {render_benchmark_history_card(state)}
            {render_export_card(state)}
            {render_worker_threshold_card(state)}
            {render_ivf_tuning_card(state)}
        </>
    }
}
