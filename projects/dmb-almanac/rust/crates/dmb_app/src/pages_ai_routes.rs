use super::*;

#[cfg(feature = "ai_diagnostics_full")]
#[must_use]
pub fn ai_benchmark_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
    let full_bench = RwSignal::new(None::<crate::ai::AiBenchmark>);
    let subset_bench = RwSignal::new(None::<crate::ai::AiSubsetBenchmark>);
    let running = RwSignal::new(false);
    let status = RwSignal::new("Idle".to_string());
    let error = RwSignal::new(None::<String>);

    let run_benchmarks = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let full_signal = full_bench.clone();
                let subset_signal = subset_bench.clone();
                let running_signal = running.clone();
                let status_signal = status.clone();
                let error_signal = error.clone();
                spawn_local(async move {
                    running_signal.set(true);
                    status_signal.set("Running benchmark suite...".to_string());
                    error_signal.set(None);
                    let full = crate::ai::benchmark_scoring(4000).await;
                    let subset = crate::ai::benchmark_subset_scoring(20).await;
                    full_signal.set(full.clone());
                    subset_signal.set(subset.clone());
                    crate::ai::store_benchmark_sample(full, subset, None);
                    if full_signal.get_untracked().is_none()
                        && subset_signal.get_untracked().is_none()
                    {
                        status_signal.set("Failed".to_string());
                        error_signal.set(Some(
                            "Benchmark data unavailable. Warm up embeddings and try again."
                                .to_string(),
                        ));
                    } else {
                        status_signal.set("Complete".to_string());
                    }
                    running_signal.set(false);
                });
            }
        }
    };

    view! {
        <section class="page">
            <h1>"AI Benchmark"</h1>
            <p class="lead">"Compare CPU vs GPU scoring (full matrix vs IVF subset)."</p>
            <button type="button" class="pill" disabled=move || running.get() on:click=run_benchmarks>
                {move || if running.get() { "Running..." } else { "Run Benchmarks" }}
            </button>
            <p class="muted">{move || status.get()}</p>
            {move || error.get().map(|message| view! { <p class="muted">{message}</p> })}
            <div class="card-grid">
                <div class="card">
                    <h2>"Full Matrix"</h2>
                    {move || {
                        if let Some(result) = full_bench.get() {
                            view! {
                                <ul class="list">
                                    <li>{format!("Sample Count: {}", result.sample_count)}</li>
                                    <li>{format!("CPU: {:.2} ms", result.cpu_ms)}</li>
                                    <li>{format!("GPU: {}", result.gpu_ms.map_or_else(|| "n/a".to_string(), |ms| format!("{ms:.2} ms")))}</li>
                                    <li>{format!("Backend: {}", result.backend)}</li>
                                </ul>
                            }
                            .into_any()
                        } else {
                            view! { <p class="muted">"No benchmark run yet."</p> }.into_any()
                        }
                    }}
                </div>
                <div class="card">
                    <h2>"IVF Subset"</h2>
                    {move || {
                        if let Some(result) = subset_bench.get() {
                            view! {
                                <ul class="list">
                                    <li>{format!("Candidates: {}", result.candidate_count)}</li>
                                    <li>{format!("CPU: {:.2} ms", result.cpu_ms)}</li>
                                    <li>{format!("GPU: {}", result.gpu_ms.map_or_else(|| "n/a".to_string(), |ms| format!("{ms:.2} ms")))}</li>
                                    <li>{format!("Backend: {}", result.backend)}</li>
                                </ul>
                            }
                            .into_any()
                        } else {
                            view! { <p class="muted">"No benchmark run yet."</p> }.into_any()
                        }
                    }}
                </div>
            </div>
        </section>
    }
}

#[cfg(feature = "ai_diagnostics_full")]
#[must_use]
pub fn ai_warmup_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
    let status = RwSignal::new("Ready".to_string());
    let ann_caps = RwSignal::new(None::<crate::ai::AnnCapDiagnostics>);
    let sample_enabled = RwSignal::new(false);
    let error = RwSignal::new(None::<String>);

    #[cfg(feature = "hydrate")]
    {
        let status_signal = status.clone();
        let ann_caps_signal = ann_caps.clone();
        let sample_enabled_signal = sample_enabled.clone();
        let error_signal = error.clone();
        request_animation_frame(move || {
            sample_enabled_signal.set(crate::ai::embedding_sample_enabled());
            spawn_local(async move {
                status_signal.set("Warming embedding index…".to_string());
                let loaded = crate::ai::load_embedding_index().await;
                if loaded.is_none() {
                    status_signal.set("Warmup failed".to_string());
                    error_signal.set(Some(
                        "Embedding index could not be loaded. Retry after data sync.".to_string(),
                    ));
                    ann_caps_signal.set(None);
                    return;
                }
                ann_caps_signal.set(crate::ai::ann_cap_diagnostics());
                error_signal.set(None);
                status_signal.set("Warmup complete".to_string());
            });
        });
    }

    view! {
        <section class="page">
            <h1>"AI Warmup"</h1>
            <p class="lead">"Preload embeddings for faster AI search."</p>
            <div class="card">
                <p>{move || status.get()}</p>
                <p class="muted">
                    {move || if sample_enabled.get() { "Sample mode: ON" } else { "Sample mode: OFF" }}
                </p>
                {move || error.get().map(|message| view! { <p class="muted">{message}</p> })}
                {move || ann_caps.get().map(|cap| view! {
                    <ul class="list">
                        <li>{format!("Vectors: {}", cap.vectors_after)}</li>
                        <li>{format!("Cap: {}", format_mb_u64(cap.cap_bytes))}</li>
                    </ul>
                })}
            </div>
        </section>
    }
}

#[cfg(feature = "ai_diagnostics_full")]
#[must_use]
pub fn ai_smoke_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
    let query = RwSignal::new("dave matthews".to_string());
    let status = RwSignal::new("Idle".to_string());
    let results = RwSignal::new(Vec::<SearchResult>::new());
    let backend = RwSignal::new("n/a".to_string());
    let elapsed_ms = RwSignal::new(None::<f64>);
    let running = RwSignal::new(false);
    let error = RwSignal::new(None::<String>);

    let run_smoke = move |_| {
        #[cfg(feature = "hydrate")]
        {
            let query_value = query.get_untracked().trim().to_string();
            if query_value.is_empty() {
                error.set(Some("Enter a query before running smoke test.".to_string()));
                return;
            }
            let status_signal = status.clone();
            let results_signal = results.clone();
            let backend_signal = backend.clone();
            let elapsed_signal = elapsed_ms.clone();
            let running_signal = running.clone();
            let error_signal = error.clone();
            spawn_local(async move {
                running_signal.set(true);
                error_signal.set(None);
                status_signal.set("Loading embeddings…".to_string());
                let Some(index) = crate::ai::load_embedding_index().await else {
                    status_signal.set("Embedding load failed.".to_string());
                    error_signal.set(Some(
                        "Embedding index unavailable. Run warmup and retry.".to_string(),
                    ));
                    running_signal.set(false);
                    return;
                };
                status_signal.set("Running semantic search…".to_string());
                let start = js_sys::Date::now();
                let output = crate::ai::semantic_search(&query_value, &index, 5).await;
                let end = js_sys::Date::now();
                results_signal.set(output);
                backend_signal.set(if crate::ai::detect_ai_capabilities().webgpu_enabled {
                    "WebGPU".to_string()
                } else {
                    "WASM SIMD".to_string()
                });
                elapsed_signal.set(Some(end - start));
                if results_signal.get_untracked().is_empty() {
                    status_signal.set("Complete (no matches)".to_string());
                } else {
                    status_signal.set("Complete".to_string());
                }
                running_signal.set(false);
            });
        }
    };

    view! {
        <section class="page">
            <h1>"AI Smoke Test"</h1>
            <p class="lead">"Quick semantic search check with latency reporting."</p>
            <div class="card">
                <label class="stack">
                    <span class="muted">"Query"</span>
                    <input
                        class="input"
                        type="text"
                        prop:value=move || query.get()
                        on:input=move |ev| {
                            query.set(event_target_value(&ev));
                        }
                    />
                </label>
                <div class="pill-row">
                    <button type="button" class="pill" disabled=move || running.get() on:click=run_smoke>
                        {move || if running.get() { "Running..." } else { "Run smoke test" }}
                    </button>
                </div>
                <p class="muted">{move || status.get()}</p>
                {move || error.get().map(|message| view! { <p class="muted">{message}</p> })}
                {move || elapsed_ms.get().map(|ms| view! {
                    <p class="muted">{format!("Latency: {:.2} ms ({})", ms, backend.get())}</p>
                })}
                {move || {
                    let items = results.get();
                    if items.is_empty() {
                        view! { <p class="muted">"No results yet."</p> }.into_any()
                    } else {
                        let rows = items.iter().map(|item| {
                            let label = item.label.clone();
                            view! { <li>{format!("{} ({:.3})", label, item.score)}</li> }
                        });
                        view! { <ul class="list">{rows.collect_view()}</ul> }.into_any()
                    }
                }}
            </div>
        </section>
    }
}

#[cfg(not(feature = "ai_diagnostics_full"))]
#[must_use]
pub fn ai_benchmark_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
    view! {
        <section class="page">
            <h1>"AI Benchmark"</h1>
            <p class="lead">
                "Production-lite build: benchmark tools are disabled."
            </p>
            <p class="muted">
                "Enable `ai_diagnostics_full` in dev/staging to run CPU/GPU benchmark diagnostics."
            </p>
        </section>
    }
}

#[cfg(not(feature = "ai_diagnostics_full"))]
#[must_use]
pub fn ai_warmup_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
    view! {
        <section class="page">
            <h1>"AI Warmup"</h1>
            <p class="lead">
                "Production-lite build: explicit warmup controls are disabled."
            </p>
            <p class="muted">
                "Embedding warmup runs on-demand through search/assistant usage."
            </p>
        </section>
    }
}

#[cfg(not(feature = "ai_diagnostics_full"))]
#[must_use]
pub fn ai_smoke_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
    view! {
        <section class="page">
            <h1>"AI Smoke Test"</h1>
            <p class="lead">
                "Production-lite build: smoke test controls are disabled."
            </p>
            <p class="muted">
                "Enable `ai_diagnostics_full` in dev/staging for interactive smoke diagnostics."
            </p>
        </section>
    }
}
