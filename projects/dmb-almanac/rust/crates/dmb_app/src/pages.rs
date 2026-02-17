use leptos::prelude::*;
use leptos::suspense::Suspense;
use leptos::tachys::view::any_view::IntoAny;
#[cfg(feature = "hydrate")]
use leptos::task::spawn_local;
use leptos_router::hooks::use_params_map;
use std::collections::BTreeMap;

#[cfg(feature = "hydrate")]
use futures::future::join_all;
#[cfg(feature = "hydrate")]
use std::collections::{HashMap, HashSet};
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

#[cfg(feature = "hydrate")]
use dmb_core::GuestAppearance;
use dmb_core::{
    AnnIndexMeta, CuratedList, CuratedListItem, EmbeddingManifest, Guest, LiberationEntry, Release,
    ReleaseTrack, SearchResult, SetlistEntry, Show, Song, Tour, UserAttendedShow, Venue,
};

#[cfg(any(feature = "hydrate", feature = "ssr"))]
use crate::server::{
    get_all_releases, get_curated_list_items, get_curated_lists, get_liberation_list,
    get_release_tracks, get_setlist_entries,
};
use crate::server::{
    get_guest, get_home_stats, get_recent_releases, get_recent_shows, get_recent_tours,
    get_release, get_show, get_song, get_top_guests, get_top_songs, get_top_venues, get_tour,
    get_tour_by_id, get_venue, ShowSummary,
};

// Leptos `Resource` requires `Send` futures even in WASM builds. IndexedDB (`dmb_idb`) futures are
// `!Send`, so we bridge them by running the `!Send` future on the local executor and awaiting the
// result through a `Send` oneshot receiver.
#[cfg(feature = "hydrate")]
fn spawn_local_to_send<T: Send + 'static>(
    fut: impl std::future::Future<Output = T> + 'static,
) -> impl std::future::Future<Output = T> + Send {
    use futures::channel::oneshot;
    let (tx, rx) = oneshot::channel::<T>();
    spawn_local(async move {
        let _ = tx.send(fut.await);
    });
    async move { rx.await.expect("spawn_local task canceled") }
}

#[cfg(feature = "hydrate")]
fn focus_stats_tab(idx: u8) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Some(document) = window.document() else {
        return;
    };
    let tab_id = format!("stats-tab-{idx}");
    let Some(element) = document.get_element_by_id(&tab_id) else {
        return;
    };
    let Ok(tab) = element.dyn_into::<web_sys::HtmlElement>() else {
        return;
    };
    let _ = tab.focus();
}

#[cfg(not(feature = "hydrate"))]
fn focus_stats_tab(_idx: u8) {}

pub fn home_page() -> impl IntoView {
    let stats = Resource::new(|| (), |_| async move { get_home_stats().await.ok() });
    let storage = RwSignal::new(None::<crate::data::StorageInfo>);

    #[cfg(feature = "hydrate")]
    {
        let storage_signal = storage.clone();
        spawn_local(async move {
            let info = crate::data::estimate_storage().await;
            storage_signal.set(info);
        });
    }

    view! {
        <section class="page">
            <h1>DMB Almanac (Rust)</h1>
            <p class="lead">"Rust-first, WASM-hydrated, offline-ready."</p>
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
                        <div class="card card-warn">
                            <h2>"Storage nearly full"</h2>
                            <p class="muted">
                                {format!("{}% used. Consider clearing AI cache in the PWA panel.", (ratio * 100.0).round())}
                            </p>
                        </div>
                    })
                })
            }}
            <Suspense fallback=move || loading_state("Loading stats", "Fetching homepage totals.")>
                {move || match stats.get() {
                    Some(Some(stats)) => view! {
                        <div class="stats-grid">
                            <div class="stat-card">
                                <span class="stat-label">"Shows"</span>
                                <span class="stat-value">{stats.shows}</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-label">"Songs"</span>
                                <span class="stat-value">{stats.songs}</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-label">"Venues"</span>
                                <span class="stat-value">{stats.venues}</span>
                            </div>
                        </div>
                    }.into_any(),
                    Some(None) => {
                        empty_state(
                            "Stats unavailable",
                            "Homepage metrics could not be loaded right now.",
                        )
                        .into_any()
                    }
                    None => view! { <div class="stats-grid"></div> }.into_any(),
                }}
            </Suspense>
            <div class="card-grid ai-links">
                <a class="card card-link" href="/ai-diagnostics">
                    <h2>"AI Diagnostics"</h2>
                    <p class="muted">"Inspect capabilities, indexes, and tuning."</p>
                </a>
                <a class="card card-link" href="/ai-benchmark">
                    <h2>"AI Benchmark"</h2>
                    <p class="muted">"Compare CPU vs GPU subset scoring."</p>
                </a>
                <a class="card card-link" href="/ai-warmup">
                    <h2>"AI Warmup"</h2>
                    <p class="muted">"Preload embeddings for faster search."</p>
                </a>
                <a class="card card-link" href="/ai-smoke">
                    <h2>"AI Smoke Test"</h2>
                    <p class="muted">"Run a quick semantic search sanity check."</p>
                </a>
            </div>
        </section>
    }
}

pub fn static_page(title: &'static str) -> impl IntoView {
    view! {
        <section class="page">
            <h1>{title}</h1>
            <p class="lead">"This route is active in the Rust app and is being finalized."</p>
            <p class="muted">
                "Use the core browse routes and support pages while this section receives final data polish."
            </p>
            <div class="card-grid">
                <a class="card card-link" href="/shows">
                    <h2>"Browse Shows"</h2>
                    <p class="muted">"Open the primary browse flow."</p>
                </a>
                <a class="card card-link" href="/search">
                    <h2>"Search"</h2>
                    <p class="muted">"Use global search across songs, venues, tours, and more."</p>
                </a>
            </div>
        </section>
    }
}

fn loading_state(title: &'static str, message: &'static str) -> impl IntoView {
    view! {
        <section class="status-card status-card--loading" role="status" aria-live="polite">
            <p class="status-title">{title}</p>
            <p class="muted">{message}</p>
        </section>
    }
}

fn empty_state(title: &'static str, message: &'static str) -> impl IntoView {
    view! {
        <section class="status-card status-card--empty">
            <p class="status-title">{title}</p>
            <p class="muted">{message}</p>
        </section>
    }
}

fn empty_state_with_link(
    title: &'static str,
    message: &'static str,
    href: &'static str,
    label: &'static str,
) -> impl IntoView {
    view! {
        <section class="status-card status-card--empty">
            <p class="status-title">{title}</p>
            <p class="muted">{message}</p>
            <p><a class="result-label" href=href>{label}</a></p>
        </section>
    }
}

fn detail_nav(href: &'static str, label: &'static str) -> impl IntoView {
    view! {
        <p class="detail-nav">
            <a class="detail-nav__link" href=href>{label}</a>
        </p>
    }
}

pub fn about_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"About"</h1>
            <p class="lead">"DMB Almanac Rust is an offline-first, WASM-powered browse and analytics app."</p>
            <p>
                "The Rust build serves the same feature set as the legacy frontend with improved rendering stability, stronger parity checks, and deterministic data fallbacks."
            </p>
            <div class="card-grid">
                <a class="card card-link" href="/protocol">
                    <h2>"Protocol"</h2>
                    <p class="muted">"Review how deep links and shared links are handled."</p>
                </a>
                <a class="card card-link" href="/offline">
                    <h2>"Offline"</h2>
                    <p class="muted">"Understand offline usage and cache expectations."</p>
                </a>
            </div>
        </section>
    }
}

pub fn contact_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Contact"</h1>
            <p class="lead">"Questions, issues, and feedback are welcome."</p>
            <div class="card">
                <p>
                    "Use the repository issues or support channel for bug reports, "
                    <strong>"offline behavior questions"</strong>
                    ", and data parity concerns."
                </p>
            </div>
            <ul class="result-list">
                <li class="result-card">
                    <span class="result-label">"Expected response"</span>
                    <span class="result-meta">"Support requests are usually acknowledged during business days."</span>
                </li>
                <li class="result-card">
                    <span class="result-label">"Fastest path"</span>
                    <span class="result-meta">"Include route, browser, and whether SW is installed."</span>
                </li>
            </ul>
        </section>
    }
}

pub fn faq_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"FAQ"</h1>
            <p class="lead">"Common questions about app behavior, data, and PWA usage."</p>
            <div class="section-divider"></div>
            <h2>"How do I check if data loaded?"</h2>
            <p class="muted">"Open key browse routes such as /shows or /songs and watch for loading messages before data appears."</p>
            <div class="section-divider"></div>
            <h2>"What if AI routes are slow?"</h2>
            <p class="muted">"AI paths now show timeout and status states. Use warmup first on slower devices."</p>
            <div class="section-divider"></div>
            <h2>"Why is offline status stale?"</h2>
            <p class="muted">"SW update and cache maintenance can take a moment; use cache controls and refresh guidance in the status banner."</p>
        </section>
    }
}

pub fn offline_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Offline"</h1>
            <p class="lead">"You are in offline mode. Core pages still work from cached data."</p>
            <div class="card-grid">
                <div class="card">
                    <h2>"What still works"</h2>
                    <ul class="list">
                        <li>"Browse cached show, song, venue, and guest views."</li>
                        <li>"Use saved visualizations and local AI cache where available."</li>
                        <li>"Run AI smoke and warmup checks from already-cached state."</li>
                    </ul>
                </div>
                <div class="card">
                    <h2>"What requires network"</h2>
                    <ul class="list">
                        <li>"Initial data sync or fresh imports."</li>
                        <li>"Revalidation parity checks and update metadata refresh."</li>
                        <li>"Search index refresh from remote sources."</li>
                    </ul>
                </div>
            </div>
            <p>
                <a href="/">"Return to dashboard"</a>
                " for immediate local status and navigation."
            </p>
        </section>
    }
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct WebgpuRuntimeTelemetry {
    #[serde(default)]
    counters: std::collections::HashMap<String, u64>,
    #[serde(default)]
    last_event: Option<String>,
    #[serde(default)]
    last_event_ts: Option<f64>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleSiliconWorkgroup {
    #[serde(default)]
    dot: Option<usize>,
    #[serde(default)]
    score: Option<usize>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleSiliconWorkerProfile {
    #[serde(default)]
    threshold_floats: Option<usize>,
    #[serde(default)]
    max_floats: Option<usize>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleSiliconProfile {
    #[serde(default)]
    is_apple_silicon: bool,
    #[serde(default)]
    cpu_cores: Option<f64>,
    #[serde(default)]
    device_memory_gb: Option<f64>,
    #[serde(default)]
    workgroup: Option<AppleSiliconWorkgroup>,
    #[serde(default)]
    worker: Option<AppleSiliconWorkerProfile>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdbRuntimeMetrics {
    #[serde(default)]
    open_blocked_count: u64,
    #[serde(default)]
    open_blocked_last_ms: Option<f64>,
    #[serde(default)]
    version_change_count: u64,
    #[serde(default)]
    version_change_last_ms: Option<f64>,
}

#[cfg(feature = "hydrate")]
fn call_window_helper(function_name: &str) -> Option<JsValue> {
    let window = web_sys::window()?;
    let helper = js_sys::Reflect::get(&window, &JsValue::from_str(function_name)).ok()?;
    if !helper.is_function() {
        return None;
    }
    helper
        .dyn_into::<js_sys::Function>()
        .ok()?
        .call0(&JsValue::NULL)
        .ok()
}

#[cfg(feature = "hydrate")]
fn load_webgpu_runtime_telemetry() -> Option<WebgpuRuntimeTelemetry> {
    let value = call_window_helper("dmbGetWebgpuTelemetry")?;
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(feature = "hydrate")]
fn reset_webgpu_runtime_telemetry() {
    let _ = call_window_helper("dmbResetWebgpuTelemetry");
}

#[cfg(feature = "hydrate")]
fn load_apple_silicon_profile() -> Option<AppleSiliconProfile> {
    let value = call_window_helper("dmbGetAppleSiliconProfile")?;
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(feature = "hydrate")]
fn load_idb_runtime_metrics() -> Option<IdbRuntimeMetrics> {
    dmb_idb::js_idb_runtime_metrics()
        .ok()
        .and_then(|value| serde_wasm_bindgen::from_value(value).ok())
}

pub fn ai_diagnostics_page() -> impl IntoView {
    // Keep the initial render deterministic for hydration; client-only detection runs post-mount.
    let caps = RwSignal::new(crate::ai::AiCapabilities::default());
    let ann_meta = RwSignal::new(None::<AnnIndexMeta>);
    let ann_caps = RwSignal::new(None::<crate::ai::AnnCapDiagnostics>);
    let ann_caps_loading = RwSignal::new(false);
    let ann_caps_error = RwSignal::new(None::<String>);
    let embed_meta = RwSignal::new(None::<EmbeddingManifest>);
    let bench = RwSignal::new(None::<crate::ai::AiBenchmark>);
    let bench_running = RwSignal::new(false);
    let bench_progress = RwSignal::new(0.0_f32);
    let bench_stage = RwSignal::new("Idle".to_string());
    let bench_cancelled = RwSignal::new(false);
    let worker_bench = RwSignal::new(None::<crate::ai::AiWorkerBenchmark>);
    let tuning = RwSignal::new(None::<crate::ai::AiTuning>);
    let tuning_result = RwSignal::new(None::<crate::ai::ProbeTuningResult>);
    let benchmark_history = RwSignal::new(Vec::<crate::ai::AiBenchmarkSample>::new());
    let worker_threshold_input = RwSignal::new(String::new());
    let worker_threshold_current = RwSignal::new(None::<usize>);
    let worker_max_floats = RwSignal::new(None::<usize>);
    let ann_cap_override_input = RwSignal::new(String::new());
    let ann_cap_override_value = RwSignal::new(None::<u64>);
    let ai_config_seeded = RwSignal::new(false);
    let ai_config_version = RwSignal::new(None::<String>);
    let ai_config_generated_at = RwSignal::new(None::<String>);
    let ai_config_mismatch = RwSignal::new(None::<String>);
    let embedding_sample_enabled = RwSignal::new(false);
    let cross_origin_isolated = RwSignal::new(None::<bool>);
    let telemetry_snapshot = RwSignal::new(None::<crate::ai::AiTelemetrySnapshot>);
    let webgpu_disabled = RwSignal::new(false);
    let ai_warnings = RwSignal::new(Vec::<crate::ai::AiWarningEvent>::new());
    let worker_bench_timestamp = RwSignal::new(None::<f64>);
    let worker_failure = RwSignal::new(crate::ai::WorkerFailureStatus::default());
    let webgpu_probe = RwSignal::new(None::<bool>);
    let sqlite_parity = RwSignal::new(None::<crate::data::SqliteParityReport>);
    let integrity_report = RwSignal::new(None::<crate::data::IntegrityReport>);
    let webgpu_runtime = RwSignal::new(None::<WebgpuRuntimeTelemetry>);
    let apple_silicon_profile = RwSignal::new(None::<AppleSiliconProfile>);
    let idb_runtime_metrics = RwSignal::new(None::<IdbRuntimeMetrics>);

    #[cfg(feature = "hydrate")]
    {
        let ann_meta_signal = ann_meta.clone();
        let embed_signal = embed_meta.clone();
        let ann_caps_signal = ann_caps.clone();
        let tuning_signal = tuning.clone();
        let history_signal = benchmark_history.clone();
        let telemetry_signal = telemetry_snapshot.clone();
        let webgpu_probe_signal = webgpu_probe.clone();
        let sqlite_parity_signal = sqlite_parity.clone();
        let integrity_report_signal = integrity_report.clone();

        let caps_signal = caps.clone();
        let worker_threshold_current_signal = worker_threshold_current.clone();
        let worker_max_floats_signal = worker_max_floats.clone();
        let ann_cap_override_value_signal = ann_cap_override_value.clone();
        let ann_cap_override_input_signal = ann_cap_override_input.clone();
        let worker_failure_signal = worker_failure.clone();
        let ai_config_seeded_signal = ai_config_seeded.clone();
        let ai_config_version_signal = ai_config_version.clone();
        let ai_config_generated_at_signal = ai_config_generated_at.clone();
        let embedding_sample_enabled_signal = embedding_sample_enabled.clone();
        let ai_warnings_signal = ai_warnings.clone();
        let worker_bench_timestamp_signal = worker_bench_timestamp.clone();
        let cross_origin_isolated_signal = cross_origin_isolated.clone();
        let worker_threshold_input_signal = worker_threshold_input.clone();
        let webgpu_disabled_signal = webgpu_disabled.clone();
        let mismatch_signal = ai_config_mismatch.clone();
        let webgpu_runtime_signal = webgpu_runtime.clone();
        let apple_silicon_profile_signal = apple_silicon_profile.clone();
        let idb_runtime_metrics_signal = idb_runtime_metrics.clone();
        request_animation_frame(move || {
            let _ = caps_signal.try_set(crate::ai::detect_ai_capabilities());

            let _ = worker_threshold_current_signal.try_set(crate::ai::worker_threshold_value());
            let _ = worker_max_floats_signal.try_set(crate::ai::worker_max_floats_value());

            // If another page (eg. AI Warmup) already loaded embeddings, surface the cached cap
            // diagnostics without kicking off the heavy load here.
            let _ = ann_caps_signal.try_set(crate::ai::ann_cap_diagnostics());

            let override_mb = crate::ai::ann_cap_override_mb();
            let _ = ann_cap_override_value_signal.try_set(override_mb);
            let _ = ann_cap_override_input_signal
                .try_set(override_mb.map(|v| v.to_string()).unwrap_or_default());

            let _ = worker_failure_signal.try_set(crate::ai::worker_failure_status());
            let _ = ai_config_seeded_signal.try_set(crate::ai::ai_config_seeded());
            let _ = ai_config_version_signal.try_set(crate::ai::ai_config_version());
            let _ = ai_config_generated_at_signal.try_set(crate::ai::ai_config_generated_at());
            let _ = embedding_sample_enabled_signal.try_set(crate::ai::embedding_sample_enabled());
            let _ = ai_warnings_signal.try_set(crate::ai::load_ai_warning_events());
            let _ = worker_bench_timestamp_signal.try_set(crate::ai::webgpu_worker_bench_timestamp());
            let _ = webgpu_runtime_signal.try_set(load_webgpu_runtime_telemetry());
            let _ = apple_silicon_profile_signal.try_set(load_apple_silicon_profile());
            let _ = idb_runtime_metrics_signal.try_set(load_idb_runtime_metrics());

            if let Some(window) = web_sys::window() {
                if let Ok(value) =
                    js_sys::Reflect::get(&window, &JsValue::from_str("crossOriginIsolated"))
                {
                    let _ =
                        cross_origin_isolated_signal.try_set(Some(value.as_bool().unwrap_or(false)));
                }
                if let Ok(Some(storage)) = window.local_storage() {
                    if let Ok(Some(value)) = storage.get_item("dmb-webgpu-worker-threshold") {
                        let _ = worker_threshold_input_signal.try_set(value);
                    }
                    if let Ok(Some(value)) = storage.get_item("dmb-webgpu-disabled") {
                        let _ = webgpu_disabled_signal
                            .try_set(value == "1" || value.eq_ignore_ascii_case("true"));
                    }
                }
            }

            // After local config is loaded, compare against remote AI config meta.
            let local_version = ai_config_version_signal.clone();
            let local_generated_at = ai_config_generated_at_signal.clone();
            spawn_local(async move {
                let remote = crate::ai::fetch_ai_config_meta().await;
                if let Some(remote) = remote {
                    let normalize = |value: Option<String>| {
                        value
                            .map(|item| item.trim().to_string())
                            .filter(|item| !item.is_empty())
                    };
                    let remote_version = normalize(remote.version.clone());
                    let remote_generated = normalize(remote.generated_at.clone());
                    let mut version = normalize(local_version.try_get_untracked().flatten());
                    let mut generated = normalize(local_generated_at.try_get_untracked().flatten());
                    if remote_version != version || remote_generated != generated {
                        // Attempt self-heal for stale local AI config metadata.
                        if crate::ai::refresh_ai_config().await {
                            version = normalize(crate::ai::ai_config_version());
                            generated = normalize(crate::ai::ai_config_generated_at());
                            let _ = local_version.try_set(version.clone());
                            let _ = local_generated_at.try_set(generated.clone());
                        }
                        if remote_version != version || remote_generated != generated {
                            // Fallback: sync metadata directly from remote response.
                            if crate::ai::sync_ai_config_meta(
                                remote_version.as_deref(),
                                remote_generated.as_deref(),
                            ) {
                                version = remote_version.clone();
                                generated = remote_generated.clone();
                                let _ = local_version.try_set(version.clone());
                                let _ = local_generated_at.try_set(generated.clone());
                            }
                        }
                        if remote_version != version || remote_generated != generated {
                            let msg = format!(
                                "Remote AI config differs (remote {} @ {}).",
                                remote_version.clone().unwrap_or_else(|| "n/a".to_string()),
                                remote_generated
                                    .clone()
                                    .unwrap_or_else(|| "n/a".to_string())
                            );
                            let _ = mismatch_signal.try_set(Some(msg));
                        } else {
                            let _ = mismatch_signal.try_set(None);
                        }
                    } else {
                        let _ = mismatch_signal.try_set(None);
                    }
                }
            });

            // Defer background work until after the first paint so E2E can assert initial UI
            // without racing long-running async tasks.
            let ann_meta_signal = ann_meta_signal.clone();
            spawn_local(async move {
                let _ = ann_meta_signal.try_set(crate::ai::load_ann_meta().await);
            });

            let embed_signal = embed_signal.clone();
            spawn_local(async move {
                let _ = embed_signal.try_set(crate::ai::load_embedding_manifest_meta().await);
            });

            let tuning_signal = tuning_signal.clone();
            spawn_local(async move {
                let _ = tuning_signal.try_set(Some(crate::ai::load_ai_tuning().await));
            });

            let history_signal = history_signal.clone();
            spawn_local(async move {
                let _ = history_signal.try_set(crate::ai::benchmark_history());
            });

            let telemetry_signal = telemetry_signal.clone();
            spawn_local(async move {
                let _ = telemetry_signal.try_set(crate::ai::load_ai_telemetry_snapshot());
            });

            let webgpu_probe_signal = webgpu_probe_signal.clone();
            spawn_local(async move {
                let _ = webgpu_probe_signal.try_set(crate::ai::probe_webgpu_device().await);
            });

            let sqlite_parity_signal = sqlite_parity_signal.clone();
            spawn_local(async move {
                let _ = sqlite_parity_signal.try_set(crate::data::fetch_sqlite_parity_report().await);
            });

            let integrity_report_signal = integrity_report_signal.clone();
            spawn_local(async move {
                let _ = integrity_report_signal.try_set(crate::data::fetch_integrity_report().await);
            });
        });

        // Remaining localStorage-derived values are loaded in request_animation_frame above to keep
        // the initial hydration render stable.
    }

    let load_ann_caps = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let ann_caps_signal = ann_caps.clone();
                let loading_signal = ann_caps_loading.clone();
                let error_signal = ann_caps_error.clone();
                spawn_local(async move {
                    if loading_signal.get_untracked() {
                        return;
                    }
                    loading_signal.set(true);
                    error_signal.set(None);

                    let loaded = crate::ai::load_embedding_index().await;
                    if loaded.is_none() {
                        error_signal.set(Some("Embedding index load failed.".to_string()));
                    }
                    ann_caps_signal.set(crate::ai::ann_cap_diagnostics());
                    loading_signal.set(false);
                });
            }
        }
    };

    let run_benchmark = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let bench_signal = bench.clone();
                let running_signal = bench_running.clone();
                let progress_signal = bench_progress.clone();
                let stage_signal = bench_stage.clone();
                let cancel_signal = bench_cancelled.clone();
                let history_signal = benchmark_history.clone();
                spawn_local(async move {
                    running_signal.set(true);
                    progress_signal.set(0.0);
                    stage_signal.set("Preparing".to_string());
                    cancel_signal.set(false);

                    let sample = crate::ai::prepare_benchmark_sample(4000).await;
                    if cancel_signal.get_untracked() {
                        running_signal.set(false);
                        stage_signal.set("Cancelled".to_string());
                        return;
                    }
                    let Some(sample) = sample else {
                        running_signal.set(false);
                        stage_signal.set("Cancelled".to_string());
                        return;
                    };
                    progress_signal.set(0.2);
                    stage_signal.set("CPU".to_string());
                    let cpu_ms = crate::ai::benchmark_cpu(&sample);
                    if cancel_signal.get_untracked() || cpu_ms.is_none() {
                        running_signal.set(false);
                        stage_signal.set("Cancelled".to_string());
                        return;
                    }
                    progress_signal.set(0.6);
                    stage_signal.set("GPU".to_string());
                    let (gpu_ms, backend) = crate::ai::benchmark_gpu(&sample).await;
                    if cancel_signal.get_untracked() {
                        running_signal.set(false);
                        stage_signal.set("Cancelled".to_string());
                        return;
                    }
                    progress_signal.set(1.0);
                    stage_signal.set("Complete".to_string());
                    let result = crate::ai::AiBenchmark {
                        sample_count: sample.sample_count,
                        cpu_ms: cpu_ms.unwrap_or_default(),
                        gpu_ms,
                        backend,
                    };
                    bench_signal.set(Some(result.clone()));
                    crate::ai::store_benchmark_sample(Some(result), None, None);
                    history_signal.set(crate::ai::benchmark_history());
                    running_signal.set(false);
                });
            }
        }
    };

    let cancel_benchmark = {
        move |_| {
            bench_cancelled.set(true);
            bench_stage.set("Cancelling".to_string());
        }
    };

    let run_worker_benchmark = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let worker_signal = worker_bench.clone();
                let history_signal = benchmark_history.clone();
                let worker_threshold_current = worker_threshold_current.clone();
                let worker_threshold_input = worker_threshold_input.clone();
                let worker_failure = worker_failure.clone();
                let webgpu_runtime = webgpu_runtime.clone();
                spawn_local(async move {
                    let result = crate::ai::benchmark_worker_threshold().await;
                    worker_signal.set(result.clone());
                    crate::ai::store_benchmark_sample(None, None, result);
                    history_signal.set(crate::ai::benchmark_history());
                    let current = crate::ai::worker_threshold_value();
                    worker_threshold_current.set(current);
                    worker_threshold_input.set(current.map(|v| v.to_string()).unwrap_or_default());
                    worker_failure.set(crate::ai::worker_failure_status());
                    webgpu_runtime.set(load_webgpu_runtime_telemetry());
                });
            }
        }
    };

    let refresh_runtime_metrics = {
        #[cfg(feature = "hydrate")]
        {
            let webgpu_runtime = webgpu_runtime.clone();
            let apple_silicon_profile = apple_silicon_profile.clone();
            let idb_runtime_metrics = idb_runtime_metrics.clone();
            move |_| {
                webgpu_runtime.set(load_webgpu_runtime_telemetry());
                apple_silicon_profile.set(load_apple_silicon_profile());
                idb_runtime_metrics.set(load_idb_runtime_metrics());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };

    let reset_runtime_metrics = {
        #[cfg(feature = "hydrate")]
        {
            let webgpu_runtime = webgpu_runtime.clone();
            move |_| {
                reset_webgpu_runtime_telemetry();
                webgpu_runtime.set(load_webgpu_runtime_telemetry());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };

    let export_diagnostics = {
        #[cfg(feature = "hydrate")]
        let caps = caps.clone();
        #[cfg(feature = "hydrate")]
        let ann_meta = ann_meta.clone();
        #[cfg(feature = "hydrate")]
        let ann_caps = ann_caps.clone();
        #[cfg(feature = "hydrate")]
        let embed_meta = embed_meta.clone();
        #[cfg(feature = "hydrate")]
        let bench = bench.clone();
        #[cfg(feature = "hydrate")]
        let worker_bench = worker_bench.clone();
        #[cfg(feature = "hydrate")]
        let tuning = tuning.clone();
        #[cfg(feature = "hydrate")]
        let tuning_result = tuning_result.clone();
        #[cfg(feature = "hydrate")]
        let cross_origin_isolated = cross_origin_isolated.clone();
        #[cfg(feature = "hydrate")]
        let history = benchmark_history.clone();
        #[cfg(feature = "hydrate")]
        let webgpu_runtime = webgpu_runtime.clone();
        #[cfg(feature = "hydrate")]
        let apple_silicon_profile = apple_silicon_profile.clone();
        #[cfg(feature = "hydrate")]
        let idb_runtime_metrics = idb_runtime_metrics.clone();
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                if let Some(window) = web_sys::window() {
                    let history_snapshot = history.get_untracked();
                    let benchmark_diff = {
                        let mut full_samples: Vec<_> = history_snapshot
                            .iter()
                            .filter_map(|sample| sample.full.clone())
                            .collect();
                        if full_samples.len() >= 2 {
                            match (full_samples.pop(), full_samples.pop()) {
                                (Some(current), Some(previous)) => serde_json::json!({
                                    "cpuMsDelta": current.cpu_ms - previous.cpu_ms,
                                    "gpuMsDelta": current.gpu_ms.unwrap_or(0.0) - previous.gpu_ms.unwrap_or(0.0),
                                    "backend": current.backend
                                }),
                                _ => serde_json::json!(null),
                            }
                        } else {
                            serde_json::json!(null)
                        }
                    };
                    let snapshot = serde_json::json!({
                        "timestampMs": js_sys::Date::now(),
                        "caps": caps.get_untracked(),
                        "annMeta": ann_meta.get_untracked(),
                        "annCap": ann_caps.get_untracked(),
                        "embeddingManifest": embed_meta.get_untracked(),
                        "benchmark": bench.get_untracked(),
                        "workerBenchmark": worker_bench.get_untracked(),
                        "tuning": tuning.get_untracked(),
                        "tuningResult": tuning_result.get_untracked(),
                        "benchmarkHistory": history_snapshot,
                        "benchmarkDiff": benchmark_diff,
                        "webgpuRuntimeTelemetry": webgpu_runtime.get_untracked(),
                        "appleSiliconProfile": apple_silicon_profile.get_untracked(),
                        "idbRuntimeMetrics": idb_runtime_metrics.get_untracked(),
                        "crossOriginIsolated": cross_origin_isolated.get_untracked(),
                        "workerThresholdOverride": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-webgpu-worker-threshold").ok().flatten())),
                        "workerMaxFloats": crate::ai::worker_max_floats_value(),
                        "aiTelemetry": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-telemetry").ok().flatten())),
                        "aiConfigVersion": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-config-version").ok().flatten())),
                        "aiConfigGeneratedAt": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-config-generated-at").ok().flatten())),
                        "aiConfigSeeded": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-config-seeded").ok().flatten())),
                        "embeddingSampleEnabled": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-embedding-sample").ok().flatten())),
                        "aiWarnings": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-warning-events").ok().flatten())),
                    });
                    if let Ok(json) = serde_json::to_string_pretty(&snapshot) {
                        let array = js_sys::Array::new();
                        array.push(&wasm_bindgen::JsValue::from_str(&json));
                        if let Ok(blob) = web_sys::Blob::new_with_str_sequence(&array) {
                            if let Ok(url) = web_sys::Url::create_object_url_with_blob(&blob) {
                                if let Some(document) = window.document() {
                                    if let Ok(el) = document.create_element("a") {
                                        if let Ok(anchor) =
                                            el.dyn_into::<web_sys::HtmlAnchorElement>()
                                        {
                                            anchor.set_href(&url);
                                            anchor.set_download(&format!(
                                                "ai-diagnostics-{}.json",
                                                js_sys::Date::now() as i64
                                            ));
                                            anchor.click();
                                            let _ = web_sys::Url::revoke_object_url(&url);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    let run_tuning = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let tuning_signal = tuning.clone();
                let result_signal = tuning_result.clone();
                spawn_local(async move {
                    if let Some(index) = crate::ai::load_embedding_index().await {
                        let result = crate::ai::tune_ivf_probe(&index, 20).await;
                        result_signal.set(result.clone());
                        tuning_signal.set(Some(crate::ai::load_ai_tuning().await));
                    }
                });
            }
        }
    };
    let toggle_webgpu = {
        #[cfg(feature = "hydrate")]
        {
            let webgpu_disabled = webgpu_disabled.clone();
            let caps_signal = caps.clone();
            move |_| {
                let next = !webgpu_disabled.get_untracked();
                webgpu_disabled.set(next);
                crate::ai::set_webgpu_disabled(next);
                caps_signal.set(crate::ai::detect_ai_capabilities());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let apply_worker_threshold = {
        #[cfg(feature = "hydrate")]
        {
            let worker_threshold_input = worker_threshold_input.clone();
            let worker_threshold_current = worker_threshold_current.clone();
            move |_| {
                let parsed = worker_threshold_input
                    .get_untracked()
                    .trim()
                    .parse::<usize>()
                    .ok();
                crate::ai::set_worker_threshold_override(parsed);
                let current = crate::ai::worker_threshold_value();
                worker_threshold_current.set(current);
                worker_threshold_input.set(current.map(|v| v.to_string()).unwrap_or_default());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let clear_worker_threshold = {
        #[cfg(feature = "hydrate")]
        {
            let worker_threshold_input = worker_threshold_input.clone();
            let worker_threshold_current = worker_threshold_current.clone();
            move |_| {
                crate::ai::set_worker_threshold_override(None);
                let current = crate::ai::worker_threshold_value();
                worker_threshold_current.set(current);
                worker_threshold_input.set(current.map(|v| v.to_string()).unwrap_or_default());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let apply_ann_cap_override = {
        #[cfg(feature = "hydrate")]
        {
            let ann_cap_override_input = ann_cap_override_input.clone();
            let ann_cap_override_value = ann_cap_override_value.clone();
            move |_| {
                let parsed = ann_cap_override_input
                    .get_untracked()
                    .trim()
                    .parse::<u64>()
                    .ok();
                crate::ai::set_ann_cap_override_mb(parsed);
                let current = crate::ai::ann_cap_override_mb();
                ann_cap_override_value.set(current);
                ann_cap_override_input.set(current.map(|v| v.to_string()).unwrap_or_default());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let clear_ann_cap_override = {
        #[cfg(feature = "hydrate")]
        {
            let ann_cap_override_input = ann_cap_override_input.clone();
            let ann_cap_override_value = ann_cap_override_value.clone();
            move |_| {
                crate::ai::set_ann_cap_override_mb(None);
                ann_cap_override_value.set(None);
                ann_cap_override_input.set(String::new());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let toggle_embedding_sample = {
        #[cfg(feature = "hydrate")]
        {
            let embedding_sample_enabled = embedding_sample_enabled.clone();
            let ann_caps = ann_caps.clone();
            move |_| {
                let next = !embedding_sample_enabled.get_untracked();
                embedding_sample_enabled.set(next);
                crate::ai::set_embedding_sample_enabled(next);
                ann_caps.set(crate::ai::ann_cap_diagnostics());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };

    view! {
        <section class="page">
            <h1>"AI Diagnostics"</h1>
            <p class="lead">"On-device AI status, index metadata, and performance checks."</p>
            <Show when=move || embedding_sample_enabled.get() fallback=|| () >
                <p class="muted">"Sample mode enabled: using reduced embeddings."</p>
            </Show>
            {move || ai_config_mismatch.get().map(|msg| view! {
                <p class="muted">{msg}</p>
            })}

            <div class="card-grid">
                <div class="card">
                    <h2>"Parity"</h2>
                    <ul class="list">
                        <li>{move || {
                            integrity_report
                                .get()
                                .map(|report| {
                                    if report.total_mismatches == 0 {
                                        "IDB integrity: ok".to_string()
                                    } else {
                                        format!("IDB integrity: {} mismatch(es)", report.total_mismatches)
                                    }
                                })
                                .unwrap_or_else(|| "IDB integrity: n/a".to_string())
                        }}</li>
                        <li>{move || {
                            sqlite_parity
                                .get()
                                .map(|report| {
                                    if !report.available {
                                        "SQLite parity: unavailable".to_string()
                                    } else if report.total_mismatches == 0 {
                                        "SQLite parity: ok".to_string()
                                    } else {
                                        format!("SQLite parity: {} mismatch(es)", report.total_mismatches)
                                    }
                                })
                                .unwrap_or_else(|| "SQLite parity: n/a".to_string())
                        }}</li>
                    </ul>
                    <p class="muted">"Detailed mismatches are shown in the PWA Status panel."</p>
                </div>
                <div class="card">
                    <h2>"Capabilities"</h2>
                    <ul class="list">
                        <li>{move || format!("WebGPU available: {}", if caps.get().webgpu_available { "yes" } else { "no" })}</li>
                        <li>{move || format!(
                            "WebGPU device probe: {}",
                            webgpu_probe
                                .get()
                                .map(|ok| if ok { "ready" } else { "failed" })
                                .unwrap_or("n/a")
                        )}</li>
                        <li>{move || format!("WebGPU enabled: {}", if caps.get().webgpu_enabled { "yes" } else { "no" })}</li>
                        <li>{move || format!("GPU Worker: {}", if caps.get().webgpu_worker { "on" } else { "off" })}</li>
                        <li>{move || format!("WebNN: {}", if caps.get().webnn { "on" } else { "off" })}</li>
                        <li>{move || format!("SIMD: {}", if caps.get().wasm_simd { "on" } else { "off" })}</li>
                        <li>{move || format!("Threads: {}", if caps.get().threads { "on" } else { "off" })}</li>
                        <li>{move || format!(
                            "Scoring backend: {}",
                            if caps.get().webgpu_enabled { "WebGPU" } else { "WASM SIMD" }
                        )}</li>
                        <li>{move || format!(
                            "Cross-Origin Isolated: {}",
                            cross_origin_isolated
                                .get()
                                .map(|v| if v { "on" } else { "off" })
                                .unwrap_or("n/a")
                        )}</li>
                        <li>{move || format!(
                            "AI config seeded: {}",
                            if ai_config_seeded.get() { "yes" } else { "no" }
                        )}</li>
                        <li>{move || format!(
                            "AI config version: {}",
                            ai_config_version
                                .get()
                                .unwrap_or_else(|| "n/a".to_string())
                        )}</li>
                        <li>{move || format!(
                            "AI config generated: {}",
                            ai_config_generated_at
                                .get()
                                .unwrap_or_else(|| "n/a".to_string())
                        )}</li>
                        <li>{move || format!(
                            "Worker bench: {}",
                            worker_bench_timestamp
                                .get()
                                .map(|ts| {
                                    let minutes = (js_sys::Date::now() - ts) / 60000.0;
                                    format!("{:.1}m ago", minutes.max(0.0))
                                })
                                .unwrap_or_else(|| "n/a".to_string())
                        )}</li>
                        <li>{move || format!(
                            "Worker max floats: {}",
                            worker_max_floats
                                .get()
                                .map(|v| v.to_string())
                                .unwrap_or_else(|| "n/a".to_string())
                        )}</li>
                        <li>{move || format!(
                            "Worker cooldown: {}",
                            worker_failure
                                .get()
                                .cooldown_remaining_ms
                                .map(|ms| format!("{:.0}s", (ms / 1000.0).max(0.0)))
                                .unwrap_or_else(|| "none".to_string())
                        )}</li>
                        <li>{move || format!(
                            "Worker last error: {}",
                            worker_failure
                                .get()
                                .last_error
                                .clone()
                                .unwrap_or_else(|| "none".to_string())
                        )}</li>
                    </ul>
                    <button type="button" class="pill pill--ghost" on:click=toggle_webgpu>
                        {move || if webgpu_disabled.get() { "Enable WebGPU" } else { "Disable WebGPU" }}
                    </button>
                    <Show when=move || worker_failure.get().cooldown_remaining_ms.is_some() fallback=|| () >
                        <button type="button" class="pill pill--ghost" on:click=move |_| {
                            #[cfg(feature = "hydrate")]
                            {
                                crate::ai::clear_worker_failure_status();
                                worker_failure.set(crate::ai::worker_failure_status());
                            }
                        }>"Clear worker cooldown"</button>
                    </Show>
                    <button type="button" class="pill pill--ghost" on:click=move |_| {
                        #[cfg(feature = "hydrate")]
                        {
                            let version = ai_config_version.clone();
                            let generated = ai_config_generated_at.clone();
                            let seeded = ai_config_seeded.clone();
                            spawn_local(async move {
                                if crate::ai::refresh_ai_config().await {
                                    version.set(crate::ai::ai_config_version());
                                    generated.set(crate::ai::ai_config_generated_at());
                                    seeded.set(crate::ai::ai_config_seeded());
                                }
                            });
                        }
                    }>"Refresh AI config"</button>
                    <Show
                        when=move || {
                            caps.get().threads && cross_origin_isolated.get() == Some(false)
                        }
                        fallback=|| ()
                    >
                        <p class="muted">
                            "Threads require COOP/COEP. Enable cross-origin isolation to unlock worker SIMD."
                        </p>
                    </Show>
                    <Show
                        when=move || caps.get().webnn && !caps.get().webgpu_enabled
                        fallback=|| ()
                    >
                        <p class="muted">
                            "WebNN detected (experimental). Current scoring uses WASM SIMD until WebNN is enabled."
                        </p>
                    </Show>
                </div>
                <div class="card">
                    <h2>"Embedding Sample"</h2>
                    <p class="muted">
                        "Use a small sample dataset for faster local tuning."
                    </p>
                    <div class="pill-row">
                        <button type="button" class="pill pill--ghost" on:click=toggle_embedding_sample>
                            {move || if embedding_sample_enabled.get() { "Disable Sample" } else { "Enable Sample" }}
                        </button>
                    </div>
                    <p class="muted">
                        {move || if embedding_sample_enabled.get() { "Sample mode is ON." } else { "Sample mode is OFF." }}
                    </p>
                    <p class="muted">"Reload to apply changes."</p>
                </div>
                <div class="card">
                    <h2>"AI Warnings"</h2>
                    {move || {
                        let warnings = ai_warnings.get();
                        if warnings.is_empty() {
                            view! { <p class="muted">"No AI warnings recorded."</p> }.into_any()
                        } else {
                            let items = warnings.iter().rev().take(5).map(|event| {
                                let detail = event
                                    .details
                                    .clone()
                                    .unwrap_or_else(|| "n/a".to_string());
                                view! { <li>{format!("{} – {}", event.event, detail)}</li> }
                            });
                            view! { <ul class="list">{items.collect_view()}</ul> }.into_any()
                        }
                    }}
                </div>
                <div class="card">
                    <h2>"WebGPU Runtime"</h2>
                    {move || {
                        webgpu_runtime
                            .get()
                            .map(|telemetry| {
                                let direct_calls = telemetry
                                    .counters
                                    .get("direct_scores_calls")
                                    .copied()
                                    .unwrap_or(0);
                                let worker_success = telemetry
                                    .counters
                                    .get("worker_success")
                                    .copied()
                                    .unwrap_or(0);
                                let worker_fallback = telemetry
                                    .counters
                                    .get("worker_fallback_runtime_failed")
                                    .copied()
                                    .unwrap_or(0)
                                    + telemetry
                                        .counters
                                        .get("worker_fallback_init_failed")
                                        .copied()
                                        .unwrap_or(0);
                                let subset_success = telemetry
                                    .counters
                                    .get("subset_worker_success")
                                    .copied()
                                    .unwrap_or(0);
                                let last_event =
                                    telemetry.last_event.unwrap_or_else(|| "none".to_string());
                                let last_event_age = telemetry
                                    .last_event_ts
                                    .map(|ts| {
                                        let minutes = (js_sys::Date::now() - ts) / 60000.0;
                                        format!("{:.1}m ago", minutes.max(0.0))
                                    })
                                    .unwrap_or_else(|| "n/a".to_string());
                                view! {
                                    <ul class="list">
                                        <li>{format!("Direct score calls: {direct_calls}")}</li>
                                        <li>{format!("Worker successes: {worker_success}")}</li>
                                        <li>{format!("Worker fallback errors: {worker_fallback}")}</li>
                                        <li>{format!("Subset worker successes: {subset_success}")}</li>
                                        <li>{format!("Last event: {last_event}")}</li>
                                        <li>{format!("Last event age: {last_event_age}")}</li>
                                    </ul>
                                }
                                .into_any()
                            })
                            .unwrap_or_else(|| {
                                view! { <p class="muted">"Runtime telemetry unavailable."</p> }
                                    .into_any()
                            })
                    }}
                    <div class="pill-row">
                        <button type="button" class="pill pill--ghost" on:click=refresh_runtime_metrics>
                            "Refresh Runtime Metrics"
                        </button>
                        <button type="button" class="pill pill--ghost" on:click=reset_runtime_metrics>
                            "Reset WebGPU Metrics"
                        </button>
                    </div>
                </div>
                <div class="card">
                    <h2>"Apple Silicon Profile"</h2>
                    {move || {
                        apple_silicon_profile
                            .get()
                            .map(|profile| {
                                let workgroup_dot = profile
                                    .workgroup
                                    .as_ref()
                                    .and_then(|group| group.dot)
                                    .map(|v| v.to_string())
                                    .unwrap_or_else(|| "n/a".to_string());
                                let workgroup_score = profile
                                    .workgroup
                                    .as_ref()
                                    .and_then(|group| group.score)
                                    .map(|v| v.to_string())
                                    .unwrap_or_else(|| "n/a".to_string());
                                let threshold = profile
                                    .worker
                                    .as_ref()
                                    .and_then(|worker| worker.threshold_floats)
                                    .map(|v| v.to_string())
                                    .unwrap_or_else(|| "n/a".to_string());
                                let max_floats = profile
                                    .worker
                                    .as_ref()
                                    .and_then(|worker| worker.max_floats)
                                    .map(|v| v.to_string())
                                    .unwrap_or_else(|| "n/a".to_string());
                                view! {
                                    <ul class="list">
                                        <li>{format!(
                                            "Apple Silicon detected: {}",
                                            if profile.is_apple_silicon { "yes" } else { "no" }
                                        )}</li>
                                        <li>{format!(
                                            "CPU cores: {}",
                                            profile
                                                .cpu_cores
                                                .map(|v| format!("{v:.0}"))
                                                .unwrap_or_else(|| "n/a".to_string())
                                        )}</li>
                                        <li>{format!(
                                            "Device memory: {}",
                                            profile
                                                .device_memory_gb
                                                .map(|v| format!("{v:.1} GB"))
                                                .unwrap_or_else(|| "n/a".to_string())
                                        )}</li>
                                        <li>{format!("Workgroup dot: {workgroup_dot}")}</li>
                                        <li>{format!("Workgroup score: {workgroup_score}")}</li>
                                        <li>{format!("Worker threshold: {threshold}")}</li>
                                        <li>{format!("Worker max floats: {max_floats}")}</li>
                                    </ul>
                                }
                                .into_any()
                            })
                            .unwrap_or_else(|| {
                                view! { <p class="muted">"Profile unavailable."</p> }.into_any()
                            })
                    }}
                </div>
                <div class="card">
                    <h2>"IndexedDB Runtime"</h2>
                    {move || {
                        idb_runtime_metrics
                            .get()
                            .map(|metrics| {
                                let blocked_age = metrics
                                    .open_blocked_last_ms
                                    .map(|ts| {
                                        let minutes = (js_sys::Date::now() - ts) / 60000.0;
                                        format!("{:.1}m ago", minutes.max(0.0))
                                    })
                                    .unwrap_or_else(|| "n/a".to_string());
                                let version_age = metrics
                                    .version_change_last_ms
                                    .map(|ts| {
                                        let minutes = (js_sys::Date::now() - ts) / 60000.0;
                                        format!("{:.1}m ago", minutes.max(0.0))
                                    })
                                    .unwrap_or_else(|| "n/a".to_string());
                                view! {
                                    <ul class="list">
                                        <li>{format!("Open blocked events: {}", metrics.open_blocked_count)}</li>
                                        <li>{format!("Last open blocked: {blocked_age}")}</li>
                                        <li>{format!("Version change events: {}", metrics.version_change_count)}</li>
                                        <li>{format!("Last version change: {version_age}")}</li>
                                    </ul>
                                }
                                .into_any()
                            })
                            .unwrap_or_else(|| {
                                view! { <p class="muted">"Runtime metrics unavailable."</p> }
                                    .into_any()
                            })
                    }}
                    <button type="button" class="pill pill--ghost" on:click=refresh_runtime_metrics>
                        "Refresh Runtime Metrics"
                    </button>
                </div>
                <div class="card">
                    <h2>"ANN Index"</h2>
                    {move || ann_meta.get().map(|meta| view! {
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
                <div class="card">
                    <h2>"ANN Cap"</h2>
                    <div class="pill-row">
                        <button type="button"
                            class="pill"
                            prop:disabled=move || ann_caps_loading.get()
                            on:click=load_ann_caps
                        >
                            {move || if ann_caps_loading.get() { "Loading embeddings…" } else { "Load embeddings" }}
                        </button>
                    </div>
                    {move || ann_caps_error.get().map(|msg| view! {
                        <p class="muted">{msg}</p>
                    })}
                    {move || ann_caps.get().map(|cap| view! {
                        <ul class="list">
                            <li>{format!("Cap: {:.1} MB", cap.cap_bytes as f64 / 1_000_000.0)}</li>
                            <li>{format!(
                                "Override: {}",
                                cap.cap_override_mb
                                    .map(|v| format!("{v} MB"))
                                    .unwrap_or_else(|| "none".to_string())
                            )}</li>
                            <li>{format!("Before: {:.1} MB ({} vectors)", cap.matrix_bytes_before as f64 / 1_000_000.0, cap.vectors_before)}</li>
                            <li>{format!("After: {:.1} MB ({} vectors)", cap.matrix_bytes_after as f64 / 1_000_000.0, cap.vectors_after)}</li>
                            <li>{format!(
                                "IVF bytes: {}",
                                cap.ivf_bytes
                                    .map(|v| format!("{:.1} MB", v as f64 / 1_000_000.0))
                                    .unwrap_or_else(|| "n/a".to_string())
                            )}</li>
                            <li>{format!(
                                "IVF cap: {}",
                                cap.ivf_cap_bytes
                                    .map(|v| format!("{:.1} MB", v as f64 / 1_000_000.0))
                                    .unwrap_or_else(|| "n/a".to_string())
                            )}</li>
                            <li>{format!("Chunks loaded: {}", cap.chunks_loaded.unwrap_or(0))}</li>
                            <li>{format!("Records loaded: {}", cap.records_loaded.unwrap_or(0))}</li>
                            <li>{format!("IVF Dropped: {}", if cap.ivf_dropped { "yes" } else { "no" })}</li>
                            <li>{format!("Used ANN: {}", if cap.used_ann { "yes" } else { "no" })}</li>
                            <li>{format!("Capped: {}", if cap.capped { "yes" } else { "no" })}</li>
                            <li>{format!("Budget capped: {}", if cap.budget_capped { "yes" } else { "no" })}</li>
                            <li>{format!("Device Memory: {}", cap.device_memory_gb.map(|v| format!("{v:.1} GB")).unwrap_or_else(|| "n/a".to_string()))}</li>
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
                                prop:value=move || ann_cap_override_input.get()
                                on:input=move |ev| {
                                    ann_cap_override_input.set(event_target_value(&ev));
                                }
                            />
                        </label>
                        <div class="pill-row">
                            <button type="button" class="pill pill--ghost" on:click=apply_ann_cap_override>
                                "Apply Override"
                            </button>
                            <button type="button" class="pill pill--ghost" on:click=clear_ann_cap_override>
                                "Reset Auto"
                            </button>
                        </div>
                        {move || ann_cap_override_value.get().map(|value| view! {
                            <p class="muted">{format!("Current override: {value} MB")}</p>
                        })}
                    </div>
                </div>
                <div class="card">
                    <h2>"Telemetry Snapshot"</h2>
                    {move || telemetry_snapshot.get().map(|snapshot| {
                        let minutes = (js_sys::Date::now() - snapshot.timestamp_ms) / 60000.0;
                        view! {
                            <ul class="list">
                                <li>{format!("Last update: {:.1}m ago", minutes.max(0.0))}</li>
                                <li>{format!(
                                    "Worker threshold: {}",
                                    snapshot.worker_threshold.map(|v| v.to_string()).unwrap_or_else(|| "n/a".to_string())
                                )}</li>
                                <li>{format!(
                                    "Worker max floats: {}",
                                    snapshot
                                        .worker_max_floats
                                        .map(|v| v.to_string())
                                        .unwrap_or_else(|| "n/a".to_string())
                                )}</li>
                                <li>{format!(
                                    "Worker cooldown: {}",
                                    snapshot
                                        .worker_failure_remaining_ms
                                        .map(|v| format!("{:.0}s", (v / 1000.0).max(0.0)))
                                        .unwrap_or_else(|| "none".to_string())
                                )}</li>
                                <li>{format!(
                                    "Worker last error: {}",
                                    snapshot.worker_failure_reason.unwrap_or_else(|| "none".to_string())
                                )}</li>
                                <li>{format!(
                                    "ANN cap recorded: {}",
                                    if snapshot.ann_cap.is_some() { "yes" } else { "no" }
                                )}</li>
                                <li>{format!(
                                    "ANN cap override: {}",
                                    snapshot
                                        .ann_cap_override_mb
                                        .map(|v| format!("{v} MB"))
                                        .unwrap_or_else(|| "none".to_string())
                                )}</li>
                                <li>{format!(
                                    "WebGPU enabled: {}",
                                    snapshot.webgpu_enabled.map(|v| if v { "yes" } else { "no" }).unwrap_or("n/a")
                                )}</li>
                                <li>{format!(
                                    "WebGPU available: {}",
                                    snapshot.webgpu_available.map(|v| if v { "yes" } else { "no" }).unwrap_or("n/a")
                                )}</li>
                                <li>{format!(
                                    "WebNN: {}",
                                    snapshot.webnn.map(|v| if v { "yes" } else { "no" }).unwrap_or("n/a")
                                )}</li>
                                <li>{format!(
                                    "AI config version: {}",
                                    snapshot.ai_config_version.unwrap_or_else(|| "n/a".to_string())
                                )}</li>
                                <li>{format!(
                                    "AI config generated: {}",
                                    snapshot.ai_config_generated_at.unwrap_or_else(|| "n/a".to_string())
                                )}</li>
                                <li>{format!(
                                    "AI config seeded: {}",
                                    snapshot.ai_config_seeded.map(|v| if v { "yes" } else { "no" }).unwrap_or("n/a")
                                )}</li>
                                <li>{format!(
                                    "Embedding sample: {}",
                                    snapshot
                                        .embedding_sample_enabled
                                        .map(|v| if v { "on" } else { "off" })
                                        .unwrap_or("n/a")
                                )}</li>
                            </ul>
                        }
                    })}
                </div>
                <div class="card">
                    <h2>"Embedding Manifest"</h2>
                    {move || embed_meta.get().map(|meta| view! {
                        <ul class="list">
                            <li>{format!("Version: {}", meta.version)}</li>
                            <li>{format!("Dim: {}", meta.dim)}</li>
                            <li>{format!("Chunks: {}", meta.chunk_count)}</li>
                        </ul>
                    })}
                </div>
                <div class="card">
                    <h2>"Benchmark"</h2>
                    <div class="stack">
                        <button type="button" class="pill" on:click=run_benchmark>"Run Benchmark"</button>
                        <Show when=move || bench_running.get() fallback=|| () >
                            <button type="button" class="pill pill--ghost" on:click=cancel_benchmark>"Cancel"</button>
                        </Show>
                        <Show when=move || bench_running.get() fallback=|| () >
                            <div class="muted">{move || bench_stage.get()}</div>
                            <div class="pwa-progress">
                                <div class="pwa-progress__bar" style:width=move || format!("{:.0}%", bench_progress.get() * 100.0)></div>
                            </div>
                        </Show>
                    </div>
                    {move || bench.get().map(|result| view! {
                        <ul class="list">
                            <li>{format!("Sample Count: {}", result.sample_count)}</li>
                            <li>{format!("CPU (SIMD if enabled): {:.2} ms", result.cpu_ms)}</li>
                            <li>{format!("GPU: {}", result.gpu_ms.map(|ms| format!("{:.2} ms", ms)).unwrap_or_else(|| "n/a".to_string()))}</li>
                            <li>{format!("Backend: {}", result.backend)}</li>
                        </ul>
                    })}
                </div>
                <div class="card">
                    <h2>"Benchmark History"</h2>
                    {move || {
                        let history = benchmark_history.get();
                        if history.is_empty() {
                            return view! { <p class="muted">"No benchmark history yet."</p> }.into_any();
                        }
                        let items = history.iter().rev().take(5).map(|sample| {
                            let label = if let Some(full) = &sample.full {
                                format!(
                                    "Full: {:.2} ms ({} samples)",
                                    full.gpu_ms.unwrap_or(full.cpu_ms),
                                    full.sample_count
                                )
                            } else if let Some(subset) = &sample.subset {
                                format!(
                                    "Subset: {:.2} ms ({} candidates)",
                                    subset.gpu_ms.unwrap_or(subset.cpu_ms),
                                    subset.candidate_count
                                )
                            } else if let Some(worker) = &sample.worker {
                                format!(
                                    "Worker: {} vectors (winner: {})",
                                    worker.vector_count,
                                    worker.winner.clone().unwrap_or_else(|| "n/a".to_string())
                                )
                            } else {
                                "Unknown benchmark".to_string()
                            };
                            view! {
                                <li>{format!("{:.0} ms – {}", sample.timestamp_ms, label)}</li>
                            }
                        }).collect_view();
                        view! { <ul class="list">{items}</ul> }.into_any()
                    }}
                </div>
                <div class="card">
                    <h2>"Export"</h2>
                    <p class="muted">"Download a JSON snapshot of AI diagnostics."</p>
                    <button type="button" class="pill" on:click=export_diagnostics>"Export Snapshot"</button>
                </div>
                <div class="card">
                    <h2>"Worker Threshold"</h2>
                    <div class="stack">
                        <button type="button" class="pill" on:click=run_worker_benchmark>"Run Worker Benchmark"</button>
                        {move || worker_threshold_current.get().map(|value| {
                            let dim = embed_meta.get().map(|meta| meta.dim as usize).unwrap_or(0);
                            let dim = dim.max(1);
                            let approx_vectors = value / dim;
                            view! {
                                <p class="muted">{format!(
                                    "Current threshold: {value} floats (~{approx_vectors} vectors @ dim {dim})"
                                )}</p>
                            }
                        })}
                        <label class="stack">
                            <span class="muted">"Override threshold (floats)"</span>
                            <input
                                class="input"
                                type="number"
                                min="0"
                                step="1"
                                prop:value=move || worker_threshold_input.get()
                                on:input=move |ev| {
                                    worker_threshold_input.set(event_target_value(&ev));
                                }
                            />
                        </label>
                        <div class="pill-row">
                            <button type="button" class="pill pill--ghost" on:click=apply_worker_threshold>
                                "Apply Override"
                            </button>
                            <button type="button" class="pill pill--ghost" on:click=clear_worker_threshold>
                                "Reset Auto"
                            </button>
                        </div>
                    </div>
                    {move || worker_bench.get().map(|result| view! {
                        <ul class="list">
                            <li>{format!("Vectors: {}", result.vector_count)}</li>
                            <li>{format!("Dim: {}", result.dim)}</li>
                            <li>{format!("Direct: {}", result.direct_ms.map(|ms| format!("{:.2} ms", ms)).unwrap_or_else(|| "n/a".to_string()))}</li>
                            <li>{format!("Worker: {}", result.worker_ms.map(|ms| format!("{:.2} ms", ms)).unwrap_or_else(|| "n/a".to_string()))}</li>
                            <li>{format!("Winner: {}", result.winner.unwrap_or_else(|| "n/a".to_string()))}</li>
                            <li>{format!(
                                "Recommended threshold (floats): {}",
                                result.recommended_threshold.map(|v| v.to_string()).unwrap_or_else(|| "n/a".to_string())
                            )}</li>
                        </ul>
                    })}
                </div>
                <div class="card">
                    <h2>"IVF Tuning"</h2>
                    <button type="button" class="pill" on:click=run_tuning>"Auto-Tune Probe"</button>
                    {move || tuning.get().map(|state| view! {
                        <ul class="list">
                            <li>{format!("Probe Override: {}", state.probe_override.map(|v| v.to_string()).unwrap_or_else(|| "none".to_string()))}</li>
                            <li>{format!("Target Latency: {:.1} ms", state.target_latency_ms)}</li>
                            <li>{format!("Last Latency: {}", state.last_latency_ms.map(|v| format!("{:.2} ms", v)).unwrap_or_else(|| "n/a".to_string()))}</li>
                        </ul>
                    })}
                    {move || tuning_result.get().map(|result| view! {
                        <ul class="list">
                            <li>{format!("Selected Probe: {}", result.selected_probe)}</li>
                            <li>{format!("Target: {:.1} ms", result.target_latency_ms)}</li>
                        </ul>
                    })}
                    {move || tuning_result.get().map(|result| view! {
                        <div class="list">
                            {result.metrics.into_iter().map(|metric| view! {
                                <div class="muted">{format!("Probe {} → {} candidates, {:.2} ms",
                                    metric.probe_count,
                                    metric.candidate_count,
                                    metric.avg_latency_ms)}</div>
                            }).collect_view()}
                        </div>
                    })}
                </div>
            </div>
        </section>
    }
}

pub fn ai_benchmark_page() -> impl IntoView {
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
                                    <li>{format!("GPU: {}", result.gpu_ms.map(|ms| format!("{:.2} ms", ms)).unwrap_or_else(|| "n/a".to_string()))}</li>
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
                                    <li>{format!("GPU: {}", result.gpu_ms.map(|ms| format!("{:.2} ms", ms)).unwrap_or_else(|| "n/a".to_string()))}</li>
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

pub fn ai_warmup_page() -> impl IntoView {
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
                        <li>{format!("Cap: {:.1} MB", cap.cap_bytes as f64 / 1_000_000.0)}</li>
                    </ul>
                })}
            </div>
        </section>
    }
}

pub fn ai_smoke_page() -> impl IntoView {
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

async fn load_show(id: i32) -> Option<Show> {
    #[cfg(feature = "hydrate")]
    {
        let show =
            spawn_local_to_send(async move { dmb_idb::get_show(id).await.ok().flatten() }).await;
        if show.is_some() {
            return show;
        }
        get_show(id).await.ok().flatten()
    }

    #[cfg(not(feature = "hydrate"))]
    {
        get_show(id).await.ok().flatten()
    }
}

async fn load_song(slug: String) -> Option<Song> {
    if slug.is_empty() {
        return None;
    }
    #[cfg(feature = "hydrate")]
    {
        let idb_slug = slug.clone();
        let song =
            spawn_local_to_send(async move { dmb_idb::get_song(&idb_slug).await.ok().flatten() })
                .await;
        if song.is_some() {
            return song;
        }
        get_song(slug).await.ok().flatten()
    }

    #[cfg(not(feature = "hydrate"))]
    {
        get_song(slug).await.ok().flatten()
    }
}

async fn load_guest(slug: String) -> Option<Guest> {
    if slug.is_empty() {
        return None;
    }
    #[cfg(feature = "hydrate")]
    {
        let idb_slug = slug.clone();
        let guest = spawn_local_to_send(async move {
            dmb_idb::get_guest_by_slug(&idb_slug).await.ok().flatten()
        })
        .await;
        if guest.is_some() {
            return guest;
        }
        get_guest(slug).await.ok().flatten()
    }

    #[cfg(not(feature = "hydrate"))]
    {
        get_guest(slug).await.ok().flatten()
    }
}

async fn load_release(slug: String) -> Option<Release> {
    if slug.is_empty() {
        return None;
    }
    #[cfg(feature = "hydrate")]
    {
        let idb_slug = slug.clone();
        let release = spawn_local_to_send(async move {
            dmb_idb::get_release_by_slug(&idb_slug).await.ok().flatten()
        })
        .await;
        if release.is_some() {
            return release;
        }
        get_release(slug).await.ok().flatten()
    }

    #[cfg(not(feature = "hydrate"))]
    {
        get_release(slug).await.ok().flatten()
    }
}

async fn load_tour(year: i32) -> Option<Tour> {
    #[cfg(feature = "hydrate")]
    {
        let tour =
            spawn_local_to_send(async move { dmb_idb::get_tour(year).await.ok().flatten() }).await;
        if tour.is_some() {
            return tour;
        }
        get_tour(year).await.ok().flatten()
    }

    #[cfg(not(feature = "hydrate"))]
    {
        get_tour(year).await.ok().flatten()
    }
}

async fn load_tour_by_id(id: i32) -> Option<Tour> {
    #[cfg(feature = "hydrate")]
    {
        let tour =
            spawn_local_to_send(async move { dmb_idb::get_tour_by_id(id).await.ok().flatten() })
                .await;
        if tour.is_some() {
            return tour;
        }
        get_tour_by_id(id).await.ok().flatten()
    }

    #[cfg(not(feature = "hydrate"))]
    {
        get_tour_by_id(id).await.ok().flatten()
    }
}

async fn load_venue(id: i32) -> Option<Venue> {
    #[cfg(feature = "hydrate")]
    {
        let venue =
            spawn_local_to_send(async move { dmb_idb::get_venue(id).await.ok().flatten() }).await;
        if venue.is_some() {
            return venue;
        }
        get_venue(id).await.ok().flatten()
    }

    #[cfg(not(feature = "hydrate"))]
    {
        get_venue(id).await.ok().flatten()
    }
}

fn normalize_show_summaries(mut items: Vec<ShowSummary>, limit: usize) -> Vec<ShowSummary> {
    items.sort_by(|a, b| b.date.cmp(&a.date).then_with(|| b.id.cmp(&a.id)));
    items.truncate(limit);
    items
}

fn normalize_songs(mut items: Vec<Song>, limit: usize) -> Vec<Song> {
    items.sort_by(|a, b| {
        b.total_performances
            .unwrap_or(0)
            .cmp(&a.total_performances.unwrap_or(0))
            .then_with(|| a.title.cmp(&b.title))
            .then_with(|| a.id.cmp(&b.id))
    });
    items.truncate(limit);
    items
}

fn normalize_venues(mut items: Vec<Venue>, limit: usize) -> Vec<Venue> {
    items.sort_by(|a, b| {
        b.total_shows
            .unwrap_or(0)
            .cmp(&a.total_shows.unwrap_or(0))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    });
    items.truncate(limit);
    items
}

fn normalize_guests(mut items: Vec<Guest>, limit: usize) -> Vec<Guest> {
    items.sort_by(|a, b| {
        b.total_appearances
            .unwrap_or(0)
            .cmp(&a.total_appearances.unwrap_or(0))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    });
    items.truncate(limit);
    items
}

fn normalize_tours(mut items: Vec<Tour>, limit: usize) -> Vec<Tour> {
    items.sort_by(|a, b| {
        b.year
            .cmp(&a.year)
            .then_with(|| b.total_shows.unwrap_or(0).cmp(&a.total_shows.unwrap_or(0)))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    });
    items.truncate(limit);
    items
}

fn normalize_releases(mut items: Vec<Release>, limit: usize) -> Vec<Release> {
    items.sort_by(|a, b| {
        b.release_date
            .as_deref()
            .unwrap_or("")
            .cmp(a.release_date.as_deref().unwrap_or(""))
            .then_with(|| a.title.cmp(&b.title))
            .then_with(|| a.id.cmp(&b.id))
    });
    items.truncate(limit);
    items
}

async fn load_recent_shows(limit: usize) -> Vec<ShowSummary> {
    #[cfg(feature = "hydrate")]
    {
        let shows =
            spawn_local_to_send(async move { dmb_idb::list_recent_shows(limit).await.ok() }).await;
        let Some(shows) = shows else {
            return normalize_show_summaries(
                get_recent_shows(limit).await.unwrap_or_default(),
                limit,
            );
        };

        if shows.is_empty() {
            return normalize_show_summaries(
                get_recent_shows(limit).await.unwrap_or_default(),
                limit,
            );
        }

        let mut venue_ids: HashSet<i32> = HashSet::new();
        let mut tour_ids: HashSet<i32> = HashSet::new();
        for show in &shows {
            venue_ids.insert(show.venue_id);
            if let Some(tour_id) = show.tour_id {
                tour_ids.insert(tour_id);
            }
        }

        let venue_futs = venue_ids.iter().copied().map(|id| async move {
            let venue =
                spawn_local_to_send(async move { dmb_idb::get_venue(id).await.ok().flatten() })
                    .await;
            (id, venue)
        });
        let venues_vec = join_all(venue_futs).await;
        let mut venues: HashMap<i32, Venue> = HashMap::new();
        for (id, venue) in venues_vec {
            if let Some(venue) = venue {
                venues.insert(id, venue);
            }
        }

        let tour_futs = tour_ids.iter().copied().map(|id| async move {
            let tour =
                spawn_local_to_send(
                    async move { dmb_idb::get_tour_by_id(id).await.ok().flatten() },
                )
                .await;
            (id, tour)
        });
        let tours_vec = join_all(tour_futs).await;
        let mut tours: HashMap<i32, Tour> = HashMap::new();
        for (id, tour) in tours_vec {
            if let Some(tour) = tour {
                tours.insert(id, tour);
            }
        }

        let mut out = Vec::with_capacity(shows.len());
        for show in shows {
            let (venue_name, venue_city, venue_state) = match venues.get(&show.venue_id) {
                Some(venue) => (venue.name.clone(), venue.city.clone(), venue.state.clone()),
                None => (format!("Venue #{}", show.venue_id), String::new(), None),
            };
            let (tour_name, tour_year) = match show.tour_id.and_then(|id| tours.get(&id)) {
                Some(tour) => (Some(tour.name.clone()), Some(tour.year)),
                None => (None, None),
            };
            out.push(ShowSummary {
                id: show.id,
                date: show.date,
                year: show.year,
                venue_id: show.venue_id,
                venue_name,
                venue_city,
                venue_state,
                tour_name,
                tour_year,
            });
        }
        normalize_show_summaries(out, limit)
    }

    #[cfg(not(feature = "hydrate"))]
    {
        normalize_show_summaries(get_recent_shows(limit).await.unwrap_or_default(), limit)
    }
}

#[cfg(feature = "hydrate")]
async fn load_hydrate_with_server_fallback_and_limit<T, IdbLoad, IdbFut, ServerLoad, ServerFut>(
    limit: usize,
    idb_loader: IdbLoad,
    server_loader: ServerLoad,
    normalize: fn(Vec<T>, usize) -> Vec<T>,
) -> Vec<T>
where
    T: Send + 'static,
    IdbLoad: FnOnce() -> IdbFut + Send + 'static,
    IdbFut: std::future::Future<Output = Option<Vec<T>>> + 'static,
    ServerLoad: FnOnce() -> ServerFut,
    ServerFut: std::future::Future<Output = Vec<T>>,
{
    match spawn_local_to_send(idb_loader()).await {
        Some(items) if !items.is_empty() => normalize(items, limit),
        _ => normalize(server_loader().await, limit),
    }
}

#[cfg(not(feature = "hydrate"))]
async fn load_server_with_limit<T>(
    limit: usize,
    server_loader: impl std::future::Future<Output = Vec<T>>,
    normalize: fn(Vec<T>, usize) -> Vec<T>,
) -> Vec<T> {
    normalize(server_loader.await, limit)
}

#[cfg(feature = "hydrate")]
async fn load_hydrate_with_server_fallback<T, IdbLoad, IdbFut, ServerLoad, ServerFut>(
    idb_loader: IdbLoad,
    server_loader: ServerLoad,
) -> Vec<T>
where
    T: Send + 'static,
    IdbLoad: FnOnce() -> IdbFut + Send + 'static,
    IdbFut: std::future::Future<Output = Option<Vec<T>>> + 'static,
    ServerLoad: FnOnce() -> ServerFut,
    ServerFut: std::future::Future<Output = Vec<T>>,
{
    let local_items = spawn_local_to_send(idb_loader()).await.unwrap_or_default();
    if !local_items.is_empty() {
        local_items
    } else {
        server_loader().await
    }
}

async fn load_top_songs(limit: usize) -> Vec<Song> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback_and_limit(
            limit,
            move || async move { dmb_idb::stats_top_songs(limit).await.ok() },
            move || async move { get_top_songs(limit).await.unwrap_or_default() },
            normalize_songs,
        )
        .await
    }

    #[cfg(not(feature = "hydrate"))]
    {
        load_server_with_limit(
            limit,
            async move { get_top_songs(limit).await.unwrap_or_default() },
            normalize_songs,
        )
        .await
    }
}

async fn load_top_venues(limit: usize) -> Vec<Venue> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback_and_limit(
            limit,
            move || async move { dmb_idb::list_top_venues(limit).await.ok() },
            move || async move { get_top_venues(limit).await.unwrap_or_default() },
            normalize_venues,
        )
        .await
    }

    #[cfg(not(feature = "hydrate"))]
    {
        load_server_with_limit(
            limit,
            async move { get_top_venues(limit).await.unwrap_or_default() },
            normalize_venues,
        )
        .await
    }
}

async fn load_top_guests(limit: usize) -> Vec<Guest> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback_and_limit(
            limit,
            move || async move { dmb_idb::list_top_guests(limit).await.ok() },
            move || async move { get_top_guests(limit).await.unwrap_or_default() },
            normalize_guests,
        )
        .await
    }

    #[cfg(not(feature = "hydrate"))]
    {
        load_server_with_limit(
            limit,
            async move { get_top_guests(limit).await.unwrap_or_default() },
            normalize_guests,
        )
        .await
    }
}

async fn load_recent_tours(limit: usize) -> Vec<Tour> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback_and_limit(
            limit,
            move || async move { dmb_idb::list_recent_tours(limit).await.ok() },
            move || async move { get_recent_tours(limit).await.unwrap_or_default() },
            normalize_tours,
        )
        .await
    }

    #[cfg(not(feature = "hydrate"))]
    {
        load_server_with_limit(
            limit,
            async move { get_recent_tours(limit).await.unwrap_or_default() },
            normalize_tours,
        )
        .await
    }
}

async fn load_recent_releases(limit: usize) -> Vec<Release> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback_and_limit(
            limit,
            move || async move { dmb_idb::list_recent_releases(limit).await.ok() },
            move || async move { get_recent_releases(limit).await.unwrap_or_default() },
            normalize_releases,
        )
        .await
    }

    #[cfg(not(feature = "hydrate"))]
    {
        load_server_with_limit(
            limit,
            async move { get_recent_releases(limit).await.unwrap_or_default() },
            normalize_releases,
        )
        .await
    }
}

async fn load_all_releases() -> Vec<Release> {
    #[cfg(feature = "hydrate")]
    {
        let releases = load_hydrate_with_server_fallback(
            move || async move { dmb_idb::list_all_releases().await.ok() },
            move || async move { get_all_releases().await.unwrap_or_default() },
        )
        .await;
        if !releases.is_empty() {
            return releases;
        }
        get_recent_releases(200).await.unwrap_or_default()
    }

    #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
    {
        get_all_releases().await.unwrap_or_default()
    }

    #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
    {
        Vec::new()
    }
}

async fn load_release_tracks(_release_id: i32) -> Vec<ReleaseTrack> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback(
            move || async move { dmb_idb::list_release_tracks(_release_id).await.ok() },
            move || async move { get_release_tracks(_release_id).await.unwrap_or_default() },
        )
        .await
    }

    #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
    {
        get_release_tracks(_release_id).await.unwrap_or_default()
    }

    #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
    {
        Vec::new()
    }
}

async fn load_setlist_entries(_show_id: i32) -> Vec<SetlistEntry> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback(
            move || async move { dmb_idb::list_setlist_entries(_show_id).await.ok() },
            move || async move { get_setlist_entries(_show_id).await.unwrap_or_default() },
        )
        .await
    }

    #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
    {
        get_setlist_entries(_show_id).await.unwrap_or_default()
    }

    #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
    {
        Vec::new()
    }
}

async fn load_liberation_list(_limit: usize) -> Vec<LiberationEntry> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback(
            move || async move { dmb_idb::list_liberation_entries(_limit).await.ok() },
            move || async move { get_liberation_list(_limit as i32).await.unwrap_or_default() },
        )
        .await
    }

    #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
    {
        get_liberation_list(_limit as i32).await.unwrap_or_default()
    }

    #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
    {
        Vec::new()
    }
}

async fn load_curated_lists() -> Vec<CuratedList> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback(
            move || async move { dmb_idb::list_curated_lists().await.ok() },
            move || async move { get_curated_lists().await.unwrap_or_default() },
        )
        .await
    }

    #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
    {
        get_curated_lists().await.unwrap_or_default()
    }

    #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
    {
        Vec::new()
    }
}

async fn load_curated_list_items(_list_id: i32, _limit: usize) -> Vec<CuratedListItem> {
    #[cfg(feature = "hydrate")]
    {
        load_hydrate_with_server_fallback(
            move || async move {
                dmb_idb::list_curated_list_items(_list_id, _limit)
                    .await
                    .ok()
            },
            move || async move {
                get_curated_list_items(_list_id, _limit as i32)
                    .await
                    .unwrap_or_default()
            },
        )
        .await
    }

    #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
    {
        get_curated_list_items(_list_id, _limit as i32)
            .await
            .unwrap_or_default()
    }

    #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
    {
        Vec::new()
    }
}

#[cfg(feature = "hydrate")]
async fn load_user_attended_shows() -> Vec<UserAttendedShow> {
    if let Ok(items) = dmb_idb::list_user_attended_shows().await {
        return items;
    }
    Vec::new()
}

#[cfg(feature = "hydrate")]
async fn add_user_attended_show(show_id: i32, show_date: Option<String>) -> bool {
    dmb_idb::add_user_attended_show(show_id, show_date)
        .await
        .is_ok()
}

#[cfg(feature = "hydrate")]
async fn remove_user_attended_show(show_id: i32) -> bool {
    dmb_idb::remove_user_attended_show(show_id).await.is_ok()
}

fn format_location(city: &str, state: &Option<String>) -> String {
    match state {
        Some(state) if !state.is_empty() => format!("{}, {}", city, state),
        _ => city.to_string(),
    }
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct ShowContext {
    show: Show,
    venue: Option<Venue>,
    tour: Option<Tour>,
}

async fn load_show_context(id: i32) -> Option<ShowContext> {
    let show = load_show(id).await?;
    let venue = load_venue(show.venue_id).await;
    let tour = if let Some(tour_id) = show.tour_id {
        load_tour_by_id(tour_id).await
    } else {
        None
    };
    Some(ShowContext { show, venue, tour })
}

fn titleize_label(raw: &str) -> String {
    let normalized = raw.trim().replace(['-', '_'], " ");
    let mut words = normalized
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_ascii_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>();
    words.retain(|word| !word.is_empty());
    if words.is_empty() {
        "Unknown".to_string()
    } else {
        words.join(" ")
    }
}

fn normalized_set_key(raw: Option<&str>) -> String {
    let normalized = raw.unwrap_or_default().trim().to_ascii_lowercase();
    if normalized.is_empty() {
        "unspecified".to_string()
    } else {
        normalized
    }
}

fn setlist_set_label(key: &str) -> String {
    if key == "unspecified" {
        "Unspecified".to_string()
    } else {
        titleize_label(key)
    }
}

fn setlist_set_counts(items: &[SetlistEntry]) -> Vec<(String, usize)> {
    let mut counts = Vec::<(String, usize)>::new();
    for entry in items {
        let key = normalized_set_key(entry.set_name.as_deref());
        if let Some((_, count)) = counts.iter_mut().find(|(existing, _)| existing == &key) {
            *count += 1;
        } else {
            counts.push((key, 1));
        }
    }
    counts
}

fn setlist_entry_matches_query(entry: &SetlistEntry, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let in_song_title = entry
        .song
        .as_ref()
        .map(|song| song.title.to_ascii_lowercase().contains(query))
        .unwrap_or(false);
    let in_slot = entry
        .slot
        .as_deref()
        .map(|slot| slot.to_ascii_lowercase().contains(query))
        .unwrap_or(false);
    let in_set = entry
        .set_name
        .as_deref()
        .map(|set| set.to_ascii_lowercase().contains(query))
        .unwrap_or(false);
    let in_notes = entry
        .notes
        .as_deref()
        .map(|notes| notes.to_ascii_lowercase().contains(query))
        .unwrap_or(false);
    in_song_title || in_slot || in_set || in_notes
}

fn normalized_disc_key(disc_number: Option<i32>) -> String {
    let disc = disc_number.unwrap_or(1).max(1);
    format!("disc-{disc}")
}

fn disc_key_label(key: &str) -> String {
    if let Some(raw) = key.strip_prefix("disc-") {
        if let Ok(number) = raw.parse::<i32>() {
            if number > 0 {
                return format!("Disc {number}");
            }
        }
    }
    "Disc 1".to_string()
}

fn release_track_disc_counts(items: &[ReleaseTrack]) -> Vec<(String, usize)> {
    let mut counts = BTreeMap::<i32, usize>::new();
    for track in items {
        let disc = track.disc_number.unwrap_or(1).max(1);
        *counts.entry(disc).or_insert(0) += 1;
    }
    counts
        .into_iter()
        .map(|(disc, count)| (format!("disc-{disc}"), count))
        .collect()
}

fn release_track_matches_query(track: &ReleaseTrack, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let in_notes = track
        .notes
        .as_deref()
        .map(|notes| notes.to_ascii_lowercase().contains(query))
        .unwrap_or(false);
    let in_numbers = format!(
        "{} {} {} {}",
        track.song_id.unwrap_or(0),
        track.show_id.unwrap_or(0),
        track.disc_number.unwrap_or(0),
        track.track_number.unwrap_or(0)
    )
    .contains(query);
    let in_track_type = (query == "live" && track.show_id.is_some())
        || (query == "studio" && track.show_id.is_none())
        || (query == "release" && track.show_id.is_none());
    in_notes || in_numbers || in_track_type
}

pub fn shows_page() -> impl IntoView {
    let render = |items: Vec<ShowSummary>| {
        if items.is_empty() {
            empty_state_with_link(
                "No shows available",
                "Recent show data is unavailable right now.",
                "/search",
                "Search the catalog",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} recent shows", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|show| {
                                let href = format!("/shows/{}", show.id);
                                let location = format_location(&show.venue_city, &show.venue_state);
                                let meta = if location.is_empty() {
                                    show.venue_name.clone()
                                } else {
                                    format!("{} • {}", show.venue_name, location)
                                };
                                let tour_label = show
                                    .tour_name
                                    .clone()
                                    .unwrap_or_else(|| "No tour".into());
                                view! {
                                    <li class="result-card">
                                        <span class="pill">{show.year}</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{show.date}</a>
                                            <span class="result-meta">{meta}</span>
                                        </div>
                                        <span class="result-score">{tour_label}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_recent_shows(30).await });

    view! {
        <section class="page">
            <h1>"Shows"</h1>
            <p class="lead">"Latest performances with offline hydration."</p>
            <Suspense fallback=move || loading_state("Loading shows", "Fetching recent performances.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn songs_page() -> impl IntoView {
    let render = |items: Vec<Song>| {
        if items.is_empty() {
            empty_state_with_link(
                "No songs available",
                "Top song stats are unavailable right now.",
                "/search",
                "Search songs",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} ranked songs", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .enumerate()
                            .map(|(idx, song)| {
                                let href = format!("/songs/{}", song.slug);
                                let plays = song.total_performances.unwrap_or(0);
                                let last = song
                                    .last_played_date
                                    .clone()
                                    .unwrap_or_else(|| "Unknown".into());
                                view! {
                                    <li class="result-card">
                                        <span class="pill">{format!("#{}", idx + 1)}</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{song.title}</a>
                                            <span class="result-meta">{format!("Last played: {}", last)}</span>
                                        </div>
                                        <span class="result-score">{format!("{} plays", plays)}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_top_songs(50).await });

    view! {
        <section class="page">
            <h1>"Songs"</h1>
            <p class="lead">"Top songs by total performances."</p>
            <Suspense fallback=move || loading_state("Loading songs", "Calculating song performance rankings.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn venues_page() -> impl IntoView {
    let render = |items: Vec<Venue>| {
        if items.is_empty() {
            empty_state_with_link(
                "No venues available",
                "Venue leaderboard data is unavailable right now.",
                "/shows",
                "Browse recent shows",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} venues", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|venue| {
                                let href = format!("/venues/{}", venue.id);
                                let pill = venue
                                    .state
                                    .clone()
                                    .unwrap_or_else(|| venue.country.clone());
                                let location = format_location(&venue.city, &venue.state);
                                let total = venue.total_shows.unwrap_or(0);
                                view! {
                                    <li class="result-card">
                                        <span class="pill">{pill}</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{venue.name}</a>
                                            <span class="result-meta">{location}</span>
                                        </div>
                                        <span class="result-score">{format!("{} shows", total)}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_top_venues(50).await });

    view! {
        <section class="page">
            <h1>"Venues"</h1>
            <p class="lead">"Most visited venues by show count."</p>
            <Suspense fallback=move || loading_state("Loading venues", "Fetching venue totals and rankings.")>
                {move || {
                    render(items.get().unwrap_or_default())
                }}
            </Suspense>
        </section>
    }
}

pub fn guests_page() -> impl IntoView {
    let render = |items: Vec<Guest>| {
        if items.is_empty() {
            empty_state_with_link(
                "No guests available",
                "Guest appearance stats are unavailable right now.",
                "/shows",
                "Browse recent shows",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} frequent guests", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|guest| {
                                let href = format!("/guests/{}", guest.slug);
                                let total = guest.total_appearances.unwrap_or(0);
                                view! {
                                    <li class="result-card">
                                        <span class="pill">"Guest"</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{guest.name}</a>
                                        </div>
                                        <span class="result-score">{format!("{} appearances", total)}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_top_guests(50).await });

    view! {
        <section class="page">
            <h1>"Guests"</h1>
            <p class="lead">"Most frequent guest appearances."</p>
            <Suspense fallback=move || loading_state("Loading guests", "Collecting guest appearance counts.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn tours_page() -> impl IntoView {
    let render = |items: Vec<Tour>| {
        if items.is_empty() {
            empty_state_with_link(
                "No tours available",
                "Tour data is unavailable right now.",
                "/shows",
                "Browse recent shows",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} recent tours", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|tour| {
                                let href = format!("/tours/{}", tour.year);
                                let total = tour.total_shows.unwrap_or(0);
                                view! {
                                    <li class="result-card">
                                        <span class="pill">{tour.year}</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{tour.name}</a>
                                        </div>
                                        <span class="result-score">{format!("{} shows", total)}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_recent_tours(25).await });

    view! {
        <section class="page">
            <h1>"Tours"</h1>
            <p class="lead">"Most recent tours, newest first."</p>
            <Suspense fallback=move || loading_state("Loading tours", "Fetching latest tour activity.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn releases_page() -> impl IntoView {
    let render = |items: Vec<Release>| {
        if items.is_empty() {
            empty_state_with_link(
                "No releases available",
                "Release data is unavailable right now.",
                "/search",
                "Search releases",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} recent releases", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|release| {
                                let href = format!("/releases/{}", release.slug);
                                let pill = release
                                    .release_type
                                    .clone()
                                    .unwrap_or_else(|| "Release".into());
                                let date = release
                                    .release_date
                                    .clone()
                                    .unwrap_or_else(|| "TBD".into());
                                view! {
                                    <li class="result-card">
                                        <span class="pill">{pill}</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{release.title}</a>
                                        </div>
                                        <span class="result-score">{date}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_recent_releases(25).await });

    view! {
        <section class="page">
            <h1>"Releases"</h1>
            <p class="lead">"Latest official releases and recordings."</p>
            <Suspense fallback=move || loading_state("Loading releases", "Fetching latest release metadata.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

fn parse_positive_i32_param(raw: &str, param_name: &str) -> Result<i32, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(format!("Missing `{param_name}` parameter."));
    }
    let value = trimmed
        .parse::<i32>()
        .map_err(|_| format!("Invalid `{param_name}` parameter: expected integer."))?;
    if value <= 0 {
        return Err(format!(
            "Invalid `{param_name}` parameter: expected positive integer."
        ));
    }
    Ok(value)
}

fn parse_slug_param(raw: &str, param_name: &str) -> Result<String, String> {
    let slug = raw.trim();
    if slug.is_empty() {
        return Err(format!("Missing `{param_name}` parameter."));
    }
    Ok(slug.to_string())
}

fn parse_tour_year_param(raw: &str) -> Result<i32, String> {
    let year = parse_positive_i32_param(raw, "year")?;
    if !(1960..=2100).contains(&year) {
        return Err("Invalid `year` parameter: expected 1960-2100.".to_string());
    }
    Ok(year)
}

pub fn show_detail_page() -> impl IntoView {
    let params = use_params_map();
    let show_id = move || params.with(|p| p.get("showId").unwrap_or_default());
    let active_set = RwSignal::new("all".to_string());
    let setlist_query = RwSignal::new(String::new());
    let show_id_for_reset = show_id.clone();
    {
        let active_set_signal = active_set.clone();
        let setlist_query_signal = setlist_query.clone();
        Effect::new(move |_| {
            let _ = show_id_for_reset();
            active_set_signal.set("all".to_string());
            setlist_query_signal.set(String::new());
        });
    }
    let render = |ctx: Option<ShowContext>| match ctx {
        Some(ctx) => {
            let show = ctx.show;
            let venue_name = ctx
                .venue
                .as_ref()
                .map(|venue| venue.name.clone())
                .unwrap_or_else(|| format!("Venue #{}", show.venue_id));
            let venue_line = ctx
                .venue
                .as_ref()
                .map(|venue| {
                    format!(
                        "{} • {}",
                        venue.name,
                        format_location(&venue.city, &venue.state)
                    )
                })
                .unwrap_or_else(|| venue_name.clone());
            let tour_line = ctx
                .tour
                .as_ref()
                .map(|tour| format!("{} ({})", tour.name, tour.year))
                .unwrap_or_else(|| "No tour".into());
            let tour_href = ctx
                .tour
                .as_ref()
                .map(|tour| format!("/tours/{}", tour.year));
            let venue_href = format!("/venues/{}", show.venue_id);
            let song_count = show.song_count.unwrap_or(0);
            let rarity = show
                .rarity_index
                .map(|v| format!("{:.2}", v))
                .unwrap_or_else(|| "-".into());
            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{show.date.clone()}</h2>
                        <p class="muted">{format!("{venue_line} • {tour_line}")}</p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{format!("{song_count} songs")}</span>
                        <span class="pill pill--ghost">{format!("Rarity {rarity}")}</span>
                        <a class="pill pill--ghost" href=venue_href>"Venue details"</a>
                        {tour_href.map(|href| view! {
                            <a class="pill pill--ghost" href=href>"Tour details"</a>
                        })}
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Date"</strong><span>{show.date}</span></div>
                    <div><strong>"Venue"</strong><span>{venue_line}</span></div>
                    <div><strong>"Tour"</strong><span>{tour_line}</span></div>
                    <div><strong>"Year"</strong><span>{show.year}</span></div>
                    <div><strong>"Songs"</strong><span>{song_count}</span></div>
                    <div><strong>"Rarity Index"</strong><span>{rarity}</span></div>
                </div>
            }
            .into_any()
        }
        None => view! {
            {empty_state_with_link(
                "Show not found",
                "This show ID was not found in the current dataset.",
                "/shows",
                "Browse all shows",
            )}
        }
        .into_any(),
    };

    let show = Resource::new(show_id, |id: String| async move {
        let id = parse_positive_i32_param(&id, "showId").ok()?;
        load_show_context(id).await
    });
    let setlist = Resource::new(show_id, |id: String| async move {
        let id = parse_positive_i32_param(&id, "showId").ok()?;
        Some(load_setlist_entries(id).await)
    });

    view! {
        <section class="page">
            {detail_nav("/shows", "Back to shows")}
            <h1>"Show Details"</h1>
            {move || {
                match parse_positive_i32_param(&show_id(), "showId") {
                    Ok(id) => view! { <p class="page-subhead">{format!("Show ID: {id}")}</p> }.into_any(),
                    Err(message) => view! { <p class="muted">{message}</p> }.into_any(),
                }
            }}
            <Suspense fallback=move || loading_state("Loading show", "Fetching show summary and context.")>
                {move || render(show.get().unwrap_or(None))}
            </Suspense>
            <div class="section-divider"></div>
            <h2>"Setlist"</h2>
            <Suspense fallback=move || loading_state("Loading setlist", "Building setlist sequence for this show.")>
                {move || {
                    match setlist.get().unwrap_or(None) {
                        Some(items) => {
                            if items.is_empty() {
                                empty_state(
                                    "Setlist unavailable",
                                    "No setlist rows were found for this show.",
                                )
                                .into_any()
                            } else {
                                let total_count = items.len();
                                let set_counts = setlist_set_counts(&items);
                                let active_key = active_set.get();
                                let query_raw = setlist_query.get();
                                let query_text = query_raw.trim().to_string();
                                let query_normalized = query_text.to_ascii_lowercase();
                                let filtered_items = items
                                    .into_iter()
                                    .filter(|entry| {
                                        let set_key = normalized_set_key(entry.set_name.as_deref());
                                        let matches_set = active_key == "all" || set_key == active_key;
                                        matches_set && setlist_entry_matches_query(entry, &query_normalized)
                                    })
                                    .collect::<Vec<_>>();
                                let filtered_count = filtered_items.len();
                                let has_filters = active_key != "all" || !query_text.is_empty();
                                let summary = if query_text.is_empty() {
                                    format!("Showing {filtered_count} of {total_count} setlist entries")
                                } else {
                                    format!(
                                        "Showing {filtered_count} of {total_count} setlist entries matching \"{query_text}\""
                                    )
                                };
                                view! {
                                    <div class="detail-list-controls">
                                        <label class="visually-hidden" for="show-setlist-filter">"Filter setlist entries"</label>
                                        <input
                                            id="show-setlist-filter"
                                            class="search-input"
                                            type="search"
                                            placeholder="Filter by song, set name, slot, or notes"
                                            prop:value=move || setlist_query.get()
                                            on:input=move |ev| setlist_query.set(event_target_value(&ev))
                                        />
                                        <div
                                            class="result-filters"
                                            role="group"
                                            aria-label="Setlist filters"
                                            aria-controls="show-setlist-results"
                                        >
                                            <button
                                                type="button"
                                                class="result-filter pill pill--ghost"
                                                class:result-filter--active=move || active_set.get() == "all"
                                                aria-pressed=move || active_set.get() == "all"
                                                on:click=move |_| active_set.set("all".to_string())
                                            >
                                                {format!("All ({total_count})")}
                                            </button>
                                            {set_counts
                                                .into_iter()
                                                .map(|(set_key, count)| {
                                                    let label = setlist_set_label(&set_key);
                                                    let key_for_class = set_key.clone();
                                                    let key_for_aria = set_key.clone();
                                                    let key_for_click = set_key.clone();
                                                    view! {
                                                        <button
                                                            type="button"
                                                            class="result-filter pill pill--ghost"
                                                            class:result-filter--active=move || active_set.get() == key_for_class
                                                            aria-pressed=move || active_set.get() == key_for_aria
                                                            on:click=move |_| active_set.set(key_for_click.clone())
                                                        >
                                                            {format!("{label} ({count})")}
                                                        </button>
                                                    }
                                                })
                                                .collect::<Vec<_>>()}
                                        </div>
                                    </div>
                                    <p class="list-summary" role="status" aria-live="polite">
                                        {summary}
                                    </p>
                                    {if filtered_items.is_empty() {
                                        view! {
                                            <section class="status-card status-card--empty">
                                                <p class="status-title">"No setlist entries match this view"</p>
                                                <p class="muted">"Try a different set filter or clear the search query."</p>
                                                {has_filters.then(|| {
                                                    view! {
                                                        <div class="pill-row">
                                                            <button
                                                                type="button"
                                                                class="pill pill--ghost"
                                                                on:click=move |_| {
                                                                    active_set.set("all".to_string());
                                                                    setlist_query.set(String::new());
                                                                }
                                                            >
                                                                "Clear filters"
                                                            </button>
                                                        </div>
                                                    }
                                                })}
                                            </section>
                                        }
                                            .into_any()
                                    } else {
                                        view! {
                                            <ol
                                                id="show-setlist-results"
                                                class="setlist"
                                                aria-label="Show setlist"
                                            >
                                                {filtered_items
                                                    .into_iter()
                                                    .map(|entry| {
                                                        let label = entry
                                                            .song
                                                            .as_ref()
                                                            .map(|song| song.title.clone())
                                                            .unwrap_or_else(|| format!("Song #{}", entry.song_id));
                                                        let slot = entry
                                                            .slot
                                                            .as_deref()
                                                            .map(titleize_label)
                                                            .unwrap_or_else(|| "Song".to_string());
                                                        let set_label =
                                                            setlist_set_label(&normalized_set_key(entry.set_name.as_deref()));
                                                        let song_href = entry.song.as_ref().and_then(|song| {
                                                            let slug = song.slug.trim();
                                                            if slug.is_empty() {
                                                                None
                                                            } else {
                                                                Some(format!("/songs/{slug}"))
                                                            }
                                                        });
                                                        let title_view = match song_href {
                                                            Some(href) => view! {
                                                                <a class="setlist-title result-label" href=href>{label.clone()}</a>
                                                            }
                                                            .into_any(),
                                                            None => view! { <span class="setlist-title">{label.clone()}</span> }.into_any(),
                                                        };

                                                        let mut context_parts = vec![format!("Set: {set_label}")];
                                                        if entry.is_segue.unwrap_or(false) {
                                                            context_parts.push("Segue".to_string());
                                                        }
                                                        if entry.is_tease.unwrap_or(false) {
                                                            context_parts.push("Tease".to_string());
                                                        }
                                                        if let Some(duration) = entry.duration_seconds {
                                                            if duration > 0 {
                                                                context_parts
                                                                    .push(format!("{}:{:02}", duration / 60, duration % 60));
                                                            }
                                                        }
                                                        let context_line = context_parts.join(" • ");
                                                        let notes = entry
                                                            .notes
                                                            .as_deref()
                                                            .map(str::trim)
                                                            .filter(|notes| !notes.is_empty())
                                                            .map(ToString::to_string);

                                                        view! {
                                                            <li class="setlist-item">
                                                                <span class="setlist-pos">{entry.position}</span>
                                                                <div class="setlist-main">
                                                                    {title_view}
                                                                    <span class="setlist-context">{context_line}</span>
                                                                    {notes.map(|notes_line| view! {
                                                                        <span class="setlist-note">{notes_line}</span>
                                                                    })}
                                                                </div>
                                                                <span class="setlist-slot">{slot}</span>
                                                            </li>
                                                        }
                                                    })
                                                    .collect::<Vec<_>>()}
                                            </ol>
                                        }
                                            .into_any()
                                    }}
                                }
                                .into_any()
                            }
                        }
                        None => {
                            empty_state(
                                "Setlist unavailable",
                                "No setlist rows were found for this show.",
                            )
                            .into_any()
                        }
                    }
                }}
            </Suspense>
        </section>
    }
}

pub fn song_detail_page() -> impl IntoView {
    let params = use_params_map();
    let slug = move || params.with(|p| p.get("slug").unwrap_or_default());
    let render = |song: Option<Song>| match song {
        Some(song) => {
            let title = song.title.clone();
            let sort_title = song.sort_title.unwrap_or_else(|| "-".to_string());
            let song_slug = song.slug.clone();
            let total_plays = song.total_performances.unwrap_or(0).max(0);
            let last_played = song
                .last_played_date
                .clone()
                .unwrap_or_else(|| "Unknown".to_string());
            let is_liberated = song.is_liberated.unwrap_or(false);
            let slot_rows = vec![
                ("Opener", song.opener_count.unwrap_or(0).max(0)),
                ("Closer", song.closer_count.unwrap_or(0).max(0)),
                ("Encore", song.encore_count.unwrap_or(0).max(0)),
            ];

            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{title.clone()}</h2>
                        <p class="muted">
                            {if is_liberated {
                                "Currently showing extended gap behavior in recent setlists."
                            } else {
                                "Active in the regular song rotation profile."
                            }}
                        </p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{format!("{total_plays} plays")}</span>
                        <span class=if is_liberated { "pill" } else { "pill pill--ghost" }>
                            {if is_liberated { "Liberated" } else { "In Rotation" }}
                        </span>
                        <a class="pill pill--ghost" href="/liberation">"View liberation list"</a>
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Title"</strong><span>{title}</span></div>
                    <div><strong>"Last Played"</strong><span>{last_played}</span></div>
                    <div><strong>"Sort Title"</strong><span>{sort_title}</span></div>
                    <div><strong>"Slug"</strong><span>{song_slug}</span></div>
                </div>
                <h2>"Slot Distribution"</h2>
                <p class="list-summary">{format!("Based on {total_plays} tracked performances")}</p>
                {if total_plays <= 0 {
                    empty_state(
                        "Slot distribution unavailable",
                        "No performance totals are available yet for this song.",
                    )
                    .into_any()
                } else {
                    view! {
                        <ul class="result-list">
                            {slot_rows
                                .into_iter()
                                .map(|(slot, count)| {
                                    let percentage = (count as f32 / total_plays as f32) * 100.0;
                                    view! {
                                        <li class="result-card">
                                            <span class="pill pill--ghost">{slot}</span>
                                            <div class="result-body">
                                                <span class="result-label">{format!("{count} plays")}</span>
                                                <span class="result-meta">{format!("{percentage:.1}% of tracked performances")}</span>
                                            </div>
                                            <span class="result-score">{format!("{percentage:.1}%")}</span>
                                        </li>
                                    }
                                })
                                .collect::<Vec<_>>()}
                        </ul>
                    }
                    .into_any()
                }}
            }
            .into_any()
        }
        None => empty_state_with_link(
            "Song not found",
            "This song slug could not be resolved.",
            "/songs",
            "Browse songs",
        )
        .into_any(),
    };

    let song = Resource::new(slug, |slug: String| async move {
        let slug = parse_slug_param(&slug, "slug").ok()?;
        load_song(slug).await
    });

    view! {
        <section class="page">
            {detail_nav("/songs", "Back to songs")}
            <h1>"Song Details"</h1>
            {move || {
                match parse_slug_param(&slug(), "slug") {
                    Ok(value) => view! { <p class="page-subhead">{format!("Slug: {value}")}</p> }.into_any(),
                    Err(message) => view! { <p class="muted">{message}</p> }.into_any(),
                }
            }}
            <Suspense fallback=move || loading_state("Loading song", "Fetching song profile and performance stats.")>
                {move || render(song.get().unwrap_or(None))}
            </Suspense>
        </section>
    }
}

pub fn guest_detail_page() -> impl IntoView {
    let params = use_params_map();
    let slug = move || params.with(|p| p.get("slug").unwrap_or_default());
    let render = |guest: Option<Guest>| match guest {
        Some(guest) => {
            let name = guest.name.clone();
            let guest_slug = guest.slug.clone();
            let appearances = guest.total_appearances.unwrap_or(0).max(0);
            let activity_note = if appearances > 0 {
                format!("Tracked in {appearances} appearance records across the show history.")
            } else {
                "No appearance rows are currently indexed for this guest.".to_string()
            };

            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{name.clone()}</h2>
                        <p class="muted">{activity_note}</p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{format!("{appearances} appearances")}</span>
                        <span class="pill pill--ghost">{format!("Slug: {guest_slug}")}</span>
                        <a class="pill pill--ghost" href="/shows">"Browse shows"</a>
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Name"</strong><span>{name}</span></div>
                    <div><strong>"Appearances"</strong><span>{appearances}</span></div>
                    <div><strong>"Slug"</strong><span>{guest_slug}</span></div>
                </div>
                <h2>"Explore"</h2>
                <ul class="result-list">
                    <li class="result-card">
                        <span class="pill pill--ghost">"Guests"</span>
                        <div class="result-body">
                            <a class="result-label" href="/guests">"Guest index"</a>
                            <span class="result-meta">"Browse all guests and compare total appearances."</span>
                        </div>
                    </li>
                    <li class="result-card">
                        <span class="pill pill--ghost">"Search"</span>
                        <div class="result-body">
                            <a class="result-label" href="/search">"Global search"</a>
                            <span class="result-meta">"Cross-check this guest against songs, shows, and venues."</span>
                        </div>
                    </li>
                </ul>
            }
            .into_any()
        }
        None => empty_state_with_link(
            "Guest not found",
            "This guest slug could not be resolved.",
            "/guests",
            "Browse guests",
        )
        .into_any(),
    };

    let guest = Resource::new(slug, |slug: String| async move {
        let slug = parse_slug_param(&slug, "slug").ok()?;
        load_guest(slug).await
    });

    view! {
        <section class="page">
            {detail_nav("/guests", "Back to guests")}
            <h1>"Guest Details"</h1>
            {move || {
                match parse_slug_param(&slug(), "slug") {
                    Ok(value) => view! { <p class="page-subhead">{format!("Slug: {value}")}</p> }.into_any(),
                    Err(message) => view! { <p class="muted">{message}</p> }.into_any(),
                }
            }}
            <Suspense fallback=move || loading_state("Loading guest", "Fetching guest appearance profile.")>
                {move || render(guest.get().unwrap_or(None))}
            </Suspense>
        </section>
    }
}

pub fn release_detail_page() -> impl IntoView {
    let params = use_params_map();
    let slug = move || params.with(|p| p.get("slug").unwrap_or_default());
    let active_disc = RwSignal::new("all".to_string());
    let track_query = RwSignal::new(String::new());
    let slug_for_reset = slug.clone();
    {
        let active_disc_signal = active_disc.clone();
        let track_query_signal = track_query.clone();
        Effect::new(move |_| {
            let _ = slug_for_reset();
            active_disc_signal.set("all".to_string());
            track_query_signal.set(String::new());
        });
    }

    let render = |release: Option<Release>| match release {
        Some(release) => {
            let title = release.title.clone();
            let release_slug = release.slug.clone();
            let release_type = release
                .release_type
                .clone()
                .unwrap_or_else(|| "Release".to_string());
            let release_date = release
                .release_date
                .clone()
                .unwrap_or_else(|| "Unknown".to_string());
            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{title.clone()}</h2>
                        <p class="muted">{format!("{release_type} • {release_date}")}</p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{release_type.clone()}</span>
                        <span class="pill pill--ghost">{release_date.clone()}</span>
                        <a class="pill pill--ghost" href="/discography">"Open discography"</a>
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Title"</strong><span>{title}</span></div>
                    <div><strong>"Type"</strong><span>{release_type}</span></div>
                    <div><strong>"Date"</strong><span>{release_date}</span></div>
                    <div><strong>"Slug"</strong><span>{release_slug}</span></div>
                </div>
            }
            .into_any()
        }
        None => empty_state_with_link(
            "Release not found",
            "This release slug could not be resolved.",
            "/releases",
            "Browse releases",
        )
        .into_any(),
    };

    let release = Resource::new(slug, |slug: String| async move {
        let slug = parse_slug_param(&slug, "slug").ok()?;
        load_release(slug).await
    });
    let tracks = Resource::new(slug, |slug: String| async move {
        let Some(parsed_slug) = parse_slug_param(&slug, "slug").ok() else {
            return Some(Vec::new());
        };
        let release = load_release(parsed_slug).await;
        if let Some(release) = release {
            Some(load_release_tracks(release.id).await)
        } else {
            Some(Vec::new())
        }
    });

    view! {
        <section class="page">
            {detail_nav("/releases", "Back to releases")}
            <h1>"Release Details"</h1>
            {move || {
                match parse_slug_param(&slug(), "slug") {
                    Ok(value) => view! { <p class="page-subhead">{format!("Slug: {value}")}</p> }.into_any(),
                    Err(message) => view! { <p class="muted">{message}</p> }.into_any(),
                }
            }}
            <Suspense fallback=move || loading_state("Loading release", "Fetching release metadata.")>
                {move || render(release.get().unwrap_or(None))}
            </Suspense>
            <div class="section-divider"></div>
            <h2>"Tracks"</h2>
            <Suspense fallback=move || loading_state("Loading tracks", "Fetching track listing.")>
                {move || {
                    if let Some(items) = tracks.get().unwrap_or(None) {
                        if items.is_empty() {
                            empty_state("No tracks available", "Track rows were not found for this release.")
                                .into_any()
                        } else {
                            let total_count = items.len();
                            let disc_counts = release_track_disc_counts(&items);
                            let active_key = active_disc.get();
                            let query_raw = track_query.get();
                            let query_text = query_raw.trim().to_string();
                            let query_normalized = query_text.to_ascii_lowercase();
                            let filtered_tracks = items
                                .into_iter()
                                .filter(|track| {
                                    let disc_key = normalized_disc_key(track.disc_number);
                                    let matches_disc = active_key == "all" || disc_key == active_key;
                                    matches_disc
                                        && release_track_matches_query(track, &query_normalized)
                                })
                                .collect::<Vec<_>>();
                            let filtered_count = filtered_tracks.len();
                            let has_filters = active_key != "all" || !query_text.is_empty();
                            let summary = if query_text.is_empty() {
                                format!("Showing {filtered_count} of {total_count} tracks")
                            } else {
                                format!(
                                    "Showing {filtered_count} of {total_count} tracks matching \"{query_text}\""
                                )
                            };
                            view! {
                                <div class="detail-list-controls">
                                    <label class="visually-hidden" for="release-track-filter">"Filter release tracks"</label>
                                    <input
                                        id="release-track-filter"
                                        class="search-input"
                                        type="search"
                                        placeholder="Filter by song id, show id, disc, notes, or live/studio"
                                        prop:value=move || track_query.get()
                                        on:input=move |ev| track_query.set(event_target_value(&ev))
                                    />
                                    <div
                                        class="result-filters"
                                        role="group"
                                        aria-label="Track filters"
                                        aria-controls="release-track-results"
                                    >
                                        <button
                                            type="button"
                                            class="result-filter pill pill--ghost"
                                            class:result-filter--active=move || active_disc.get() == "all"
                                            aria-pressed=move || active_disc.get() == "all"
                                            on:click=move |_| active_disc.set("all".to_string())
                                        >
                                            {format!("All ({total_count})")}
                                        </button>
                                        {disc_counts
                                            .into_iter()
                                            .map(|(disc_key, count)| {
                                                let label = disc_key_label(&disc_key);
                                                let key_for_class = disc_key.clone();
                                                let key_for_aria = disc_key.clone();
                                                let key_for_click = disc_key.clone();
                                                view! {
                                                    <button
                                                        type="button"
                                                        class="result-filter pill pill--ghost"
                                                        class:result-filter--active=move || active_disc.get() == key_for_class
                                                        aria-pressed=move || active_disc.get() == key_for_aria
                                                        on:click=move |_| active_disc.set(key_for_click.clone())
                                                    >
                                                        {format!("{label} ({count})")}
                                                    </button>
                                                }
                                            })
                                            .collect::<Vec<_>>()}
                                    </div>
                                </div>
                                <p class="list-summary" role="status" aria-live="polite">
                                    {summary}
                                </p>
                                {if filtered_tracks.is_empty() {
                                    view! {
                                        <section class="status-card status-card--empty">
                                            <p class="status-title">"No tracks match this view"</p>
                                            <p class="muted">"Try another disc filter or clear the search query."</p>
                                            {has_filters.then(|| view! {
                                                <div class="pill-row">
                                                    <button
                                                        type="button"
                                                        class="pill pill--ghost"
                                                        on:click=move |_| {
                                                            active_disc.set("all".to_string());
                                                            track_query.set(String::new());
                                                        }
                                                    >
                                                        "Clear filters"
                                                    </button>
                                                </div>
                                            })}
                                        </section>
                                    }
                                    .into_any()
                                } else {
                                    view! {
                                        <ol
                                            id="release-track-results"
                                            class="tracklist"
                                            aria-label="Release tracks"
                                        >
                                            {filtered_tracks
                                                .into_iter()
                                                .map(|track| {
                                                    let track_label = track
                                                        .song_id
                                                        .map(|id| format!("Song #{id}"))
                                                        .unwrap_or_else(|| "Unknown song".to_string());
                                                    let number = track.track_number.unwrap_or(0);
                                                    let disc = track.disc_number.unwrap_or(1).max(1);
                                                    let track_pos = if number > 0 {
                                                        format!("{disc}-{number}")
                                                    } else {
                                                        format!("{disc}-?")
                                                    };
                                                    let mut context_parts = vec![disc_key_label(&normalized_disc_key(track.disc_number))];
                                                    if let Some(duration) = track.duration_seconds {
                                                        if duration > 0 {
                                                            context_parts.push(format!("{}:{:02}", duration / 60, duration % 60));
                                                        }
                                                    }
                                                    if track.show_id.is_some() {
                                                        context_parts.push("Live source".to_string());
                                                    }
                                                    let context_line = context_parts.join(" • ");
                                                    let notes = track
                                                        .notes
                                                        .as_deref()
                                                        .map(str::trim)
                                                        .filter(|notes| !notes.is_empty())
                                                        .map(ToString::to_string);
                                                    let show_link = track.show_id.map(|show_id| {
                                                        let href = format!("/shows/{show_id}");
                                                        view! { <a class="result-label" href=href>{format!("Open show #{show_id}")}</a> }
                                                    });
                                                    let slot_label = if track.show_id.is_some() {
                                                        "Live"
                                                    } else {
                                                        "Release"
                                                    };

                                                    view! {
                                                        <li class="tracklist-item">
                                                            <span class="tracklist-pos">{track_pos}</span>
                                                            <div class="tracklist-main">
                                                                <span class="tracklist-title">{track_label}</span>
                                                                <span class="tracklist-context">{context_line}</span>
                                                                {show_link}
                                                                {notes.map(|notes_line| view! {
                                                                    <span class="tracklist-note">{notes_line}</span>
                                                                })}
                                                            </div>
                                                            <span class="setlist-slot">{slot_label}</span>
                                                        </li>
                                                    }
                                                })
                                                .collect::<Vec<_>>()}
                                        </ol>
                                    }
                                    .into_any()
                                }}
                            }
                            .into_any()
                        }
                    } else {
                        empty_state(
                            "Tracks unavailable",
                            "Track rows could not be loaded for this release.",
                        )
                        .into_any()
                    }
                }}
            </Suspense>
        </section>
    }
}

pub fn tour_year_page() -> impl IntoView {
    let params = use_params_map();
    let year = move || params.with(|p| p.get("year").unwrap_or_default());
    let render = |tour: Option<Tour>| match tour {
        Some(tour) => {
            let year = tour.year;
            let name = tour.name.clone();
            let total_shows = tour.total_shows.unwrap_or(0).max(0);
            let activity_note = if total_shows > 0 {
                format!("{total_shows} shows are currently tracked for this tour year.")
            } else {
                "No show rows are currently indexed for this tour year.".to_string()
            };
            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{name.clone()}</h2>
                        <p class="muted">{activity_note}</p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{format!("{year}")}</span>
                        <span class="pill pill--ghost">{format!("{total_shows} shows")}</span>
                        <a class="pill pill--ghost" href="/shows">"Browse shows"</a>
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Name"</strong><span>{name}</span></div>
                    <div><strong>"Year"</strong><span>{year}</span></div>
                    <div><strong>"Total Shows"</strong><span>{total_shows}</span></div>
                </div>
                <h2>"Explore"</h2>
                <ul class="result-list">
                    <li class="result-card">
                        <span class="pill pill--ghost">"Shows"</span>
                        <div class="result-body">
                            <a class="result-label" href="/shows">"Browse all shows"</a>
                            <span class="result-meta">"Use dates and venues to explore this era further."</span>
                        </div>
                    </li>
                    <li class="result-card">
                        <span class="pill pill--ghost">"Stats"</span>
                        <div class="result-body">
                            <a class="result-label" href="/stats">"Open stats dashboard"</a>
                            <span class="result-meta">"Compare this tour year against broader catalog trends."</span>
                        </div>
                    </li>
                </ul>
            }
            .into_any()
        }
        None => empty_state_with_link(
            "Tour not found",
            "This year does not map to a tour record.",
            "/tours",
            "Browse tours",
        )
        .into_any(),
    };

    let tour = Resource::new(year, |year: String| async move {
        let year = parse_tour_year_param(&year).ok()?;
        load_tour(year).await
    });

    view! {
        <section class="page">
            {detail_nav("/tours", "Back to tours")}
            <h1>"Tour Details"</h1>
            {move || {
                match parse_tour_year_param(&year()) {
                    Ok(value) => view! { <p class="page-subhead">{format!("Year: {value}")}</p> }.into_any(),
                    Err(message) => view! { <p class="muted">{message}</p> }.into_any(),
                }
            }}
            <Suspense fallback=move || loading_state("Loading tour", "Fetching tour details for this year.")>
                {move || render(tour.get().unwrap_or(None))}
            </Suspense>
        </section>
    }
}

pub fn venue_detail_page() -> impl IntoView {
    let params = use_params_map();
    let venue_id = move || params.with(|p| p.get("venueId").unwrap_or_default());
    let render = |venue: Option<Venue>| match venue {
        Some(venue) => {
            let name = venue.name.clone();
            let location = format_location(&venue.city, &venue.state);
            let country = venue.country.clone();
            let location_line = if location.is_empty() {
                country.clone()
            } else {
                format!("{location} • {country}")
            };
            let venue_type = venue
                .venue_type
                .clone()
                .unwrap_or_else(|| "Venue".to_string());
            let total_shows = venue.total_shows.unwrap_or(0).max(0);
            let country_code = venue.country_code.clone().unwrap_or_default();

            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{name.clone()}</h2>
                        <p class="muted">{location_line}</p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{venue_type.clone()}</span>
                        <span class="pill pill--ghost">{format!("{total_shows} shows")}</span>
                        {(!country_code.is_empty()).then(|| view! {
                            <span class="pill pill--ghost">{country_code.clone()}</span>
                        })}
                        <a class="pill pill--ghost" href="/shows">"Browse shows"</a>
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Name"</strong><span>{name}</span></div>
                    <div><strong>"Location"</strong><span>{location}</span></div>
                    <div><strong>"Country"</strong><span>{country}</span></div>
                    <div><strong>"Type"</strong><span>{venue_type}</span></div>
                    <div><strong>"Total Shows"</strong><span>{total_shows}</span></div>
                </div>
                <h2>"Explore"</h2>
                <ul class="result-list">
                    <li class="result-card">
                        <span class="pill pill--ghost">"Venues"</span>
                        <div class="result-body">
                            <a class="result-label" href="/venues">"Venue index"</a>
                            <span class="result-meta">"Compare this venue with other tour stops."</span>
                        </div>
                    </li>
                    <li class="result-card">
                        <span class="pill pill--ghost">"Search"</span>
                        <div class="result-body">
                            <a class="result-label" href="/search">"Global search"</a>
                            <span class="result-meta">"Find related songs, tours, and shows from this location."</span>
                        </div>
                    </li>
                </ul>
            }
            .into_any()
        }
        None => empty_state_with_link(
            "Venue not found",
            "This venue ID was not found in the current dataset.",
            "/venues",
            "Browse venues",
        )
        .into_any(),
    };

    let venue = Resource::new(venue_id, |id: String| async move {
        let id = parse_positive_i32_param(&id, "venueId").ok()?;
        load_venue(id).await
    });

    view! {
        <section class="page">
            {detail_nav("/venues", "Back to venues")}
            <h1>"Venue Details"</h1>
            {move || {
                match parse_positive_i32_param(&venue_id(), "venueId") {
                    Ok(id) => view! { <p class="page-subhead">{format!("Venue ID: {id}")}</p> }.into_any(),
                    Err(message) => view! { <p class="muted">{message}</p> }.into_any(),
                }
            }}
            <Suspense fallback=move || loading_state("Loading venue", "Fetching venue profile and location.")>
                {move || render(venue.get().unwrap_or(None))}
            </Suspense>
        </section>
    }
}

fn search_result_href(item: &dmb_core::SearchResult) -> Option<String> {
    match item.result_type.as_str() {
        "song" => item.slug.as_ref().map(|slug| format!("/songs/{}", slug)),
        "venue" => Some(format!("/venues/{}", item.id)),
        "tour" => Some(format!("/tours/{}", item.id)),
        "guest" => item.slug.as_ref().map(|slug| format!("/guests/{}", slug)),
        "release" => item.slug.as_ref().map(|slug| format!("/releases/{}", slug)),
        _ => None,
    }
}

#[cfg(feature = "hydrate")]
fn merge_search_results(
    mut prefix: Vec<dmb_core::SearchResult>,
    mut semantic: Vec<dmb_core::SearchResult>,
    limit: usize,
) -> Vec<dmb_core::SearchResult> {
    use std::collections::HashMap;
    let mut merged: HashMap<String, dmb_core::SearchResult> = HashMap::new();

    for item in prefix.iter_mut() {
        item.score = (item.score + 0.5).min(1.5);
    }

    for item in semantic.iter_mut() {
        item.score = item.score.min(1.0);
    }

    for item in prefix.into_iter().chain(semantic.into_iter()) {
        let key = format!(
            "{}:{}:{}",
            item.result_type,
            item.id,
            item.slug.as_deref().unwrap_or("")
        );
        match merged.get_mut(&key) {
            Some(existing) => {
                if item.score > existing.score {
                    *existing = item;
                }
            }
            None => {
                merged.insert(key, item);
            }
        }
    }

    let mut out: Vec<dmb_core::SearchResult> = merged.into_values().collect();
    out.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.result_type.cmp(&b.result_type))
            .then_with(|| a.label.cmp(&b.label))
    });
    out.truncate(limit);
    out
}

pub fn search_page() -> impl IntoView {
    let (query, set_query) = signal(String::new());
    let (active_filter, set_active_filter) = signal(String::from("all"));
    let results = RwSignal::new(Vec::<dmb_core::SearchResult>::new());

    #[cfg(feature = "hydrate")]
    {
        let embedding_index = RwSignal::new(None::<std::sync::Arc<crate::ai::EmbeddingIndex>>);
        let query_signal = query.clone();
        let results_signal = results.clone();
        let index_signal = embedding_index.clone();
        spawn_local(async move {
            index_signal.set(crate::ai::load_embedding_index().await);
        });
        Effect::new(move |_| {
            let current_query = query_signal.get();
            let results_signal = results_signal.clone();
            let index_signal = index_signal.get();
            spawn_local(async move {
                let trimmed = current_query.trim().to_string();
                let items = if trimmed.is_empty() {
                    Vec::new()
                } else {
                    let prefix = dmb_idb::search_global(&trimmed).await.unwrap_or_default();
                    let semantic = if let Some(index) = index_signal {
                        crate::ai::semantic_search(&trimmed, &index, 12).await
                    } else {
                        Vec::new()
                    };
                    merge_search_results(prefix, semantic, 40)
                };
                results_signal.set(items);
            });
        });
    }

    view! {
        <section class="page">
            <h1>"Search"</h1>
            <p class="lead">"Hybrid prefix + semantic search (offline-first)."</p>
            <input
                class="search-input"
                type="search"
                placeholder="Search songs, shows, venues..."
                prop:value=move || query.get()
                on:input=move |ev| {
                    let next = event_target_value(&ev);
                    if next.trim().is_empty() {
                        set_active_filter.set("all".to_string());
                    }
                    set_query.set(next);
                }
            />
            {move || {
                let items = results.get();
                let current_query = query.get();
                if items.is_empty() && !current_query.is_empty() {
                    empty_state(
                        "No results",
                        "Try a different query or shorter phrase.",
                    )
                    .into_any()
                } else if items.is_empty() {
                    empty_state(
                        "Start typing",
                        "Search songs, shows, venues, guests, tours, and releases.",
                    )
                    .into_any()
                } else {
                    let all_count = items.len();
                    let song_count = items.iter().filter(|item| item.result_type == "song").count();
                    let venue_count = items.iter().filter(|item| item.result_type == "venue").count();
                    let tour_count = items.iter().filter(|item| item.result_type == "tour").count();
                    let guest_count = items.iter().filter(|item| item.result_type == "guest").count();
                    let release_count = items.iter().filter(|item| item.result_type == "release").count();
                    let show_count = items.iter().filter(|item| item.result_type == "show").count();

                    let selected_filter = active_filter.get();
                    let filtered_items: Vec<_> = items
                        .into_iter()
                        .filter(|item| {
                            selected_filter == "all" || item.result_type == selected_filter
                        })
                        .collect();
                    let filtered_count = filtered_items.len();
                    let summary_label = match selected_filter.as_str() {
                        "all" => "all results",
                        "song" => "songs",
                        "venue" => "venues",
                        "tour" => "tours",
                        "guest" => "guests",
                        "release" => "releases",
                        "show" => "shows",
                        _ => "results",
                    };

                    view! {
                        <>
                            <div
                                class="result-filters"
                                role="group"
                                aria-label="Search result filters"
                                aria-controls="search-results-list"
                            >
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "all"
                                    aria-pressed=move || active_filter.get() == "all"
                                    on:click=move |_| set_active_filter.set("all".to_string())
                                >
                                    {format!("All ({all_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "song"
                                    aria-pressed=move || active_filter.get() == "song"
                                    disabled=song_count == 0
                                    on:click=move |_| set_active_filter.set("song".to_string())
                                >
                                    {format!("Songs ({song_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "show"
                                    aria-pressed=move || active_filter.get() == "show"
                                    disabled=show_count == 0
                                    on:click=move |_| set_active_filter.set("show".to_string())
                                >
                                    {format!("Shows ({show_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "venue"
                                    aria-pressed=move || active_filter.get() == "venue"
                                    disabled=venue_count == 0
                                    on:click=move |_| set_active_filter.set("venue".to_string())
                                >
                                    {format!("Venues ({venue_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "tour"
                                    aria-pressed=move || active_filter.get() == "tour"
                                    disabled=tour_count == 0
                                    on:click=move |_| set_active_filter.set("tour".to_string())
                                >
                                    {format!("Tours ({tour_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "guest"
                                    aria-pressed=move || active_filter.get() == "guest"
                                    disabled=guest_count == 0
                                    on:click=move |_| set_active_filter.set("guest".to_string())
                                >
                                    {format!("Guests ({guest_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "release"
                                    aria-pressed=move || active_filter.get() == "release"
                                    disabled=release_count == 0
                                    on:click=move |_| set_active_filter.set("release".to_string())
                                >
                                    {format!("Releases ({release_count})")}
                                </button>
                            </div>
                            <p class="list-summary" role="status" aria-live="polite">
                                {format!(
                                    "Showing {filtered_count} {summary_label} for \"{current_query}\""
                                )}
                            </p>
                            {if filtered_items.is_empty() {
                                view! {
                                    <section class="status-card status-card--empty">
                                        <p class="status-title">"No results in this category"</p>
                                        <p class="muted">
                                            "Try another filter or switch back to All results."
                                        </p>
                                        <p>
                                            <button
                                                type="button"
                                                class="pill pill--ghost"
                                                on:click=move |_| set_active_filter.set("all".to_string())
                                            >
                                                "Show all results"
                                            </button>
                                        </p>
                                    </section>
                                }
                                .into_any()
                            } else {
                                view! {
                                    <ul id="search-results-list" class="result-list">
                                        {filtered_items
                                            .into_iter()
                                            .map(|item| {
                                                let label = item.label.clone();
                                                let kind = item.result_type.clone();
                                                let href = search_result_href(&item);
                                                view! {
                                                    <li class="result-card">
                                                        <span class="pill">{kind}</span>
                                                        <div class="result-body">
                                                            {move || match &href {
                                                                Some(link) => view! {
                                                                    <a class="result-label" href=link.clone()>{label.clone()}</a>
                                                                }
                                                                .into_any(),
                                                                None => view! { <span class="result-label">{label.clone()}</span> }.into_any(),
                                                            }}
                                                        </div>
                                                        <span class="result-score">{format!("{:.2}", item.score)}</span>
                                                    </li>
                                                }
                                            })
                                            .collect::<Vec<_>>()}
                                    </ul>
                                }
                                .into_any()
                            }}
                        </>
                    }
                    .into_any()
                }
            }}
        </section>
    }
}

// ---------------------------------------------------------------------------
// Stats page structs
// ---------------------------------------------------------------------------

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsOverview {
    show_count: u32,
    song_count: u32,
    venue_count: u32,
    tour_count: u32,
    guest_count: u32,
    setlist_count: u32,
    avg_songs_per_show: f32,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsSongs {
    top_played: Vec<Song>,
    top_openers: Vec<Song>,
    top_closers: Vec<Song>,
    top_encores: Vec<Song>,
    debuts_by_year: Vec<(u32, u32)>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsShows {
    shows_by_year: Vec<(u32, u32)>,
    shows_by_decade: Vec<(u32, u32)>,
    rarity_min: f64,
    rarity_q1: f64,
    rarity_median: f64,
    rarity_q3: f64,
    rarity_max: f64,
    recent_tours: Vec<Tour>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsVenues {
    top_venues: Vec<Venue>,
    shows_by_country: Vec<(String, u32)>,
    shows_by_state: Vec<(String, u32)>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsGuests {
    top_guests: Vec<Guest>,
    appearances_by_year: Vec<(u32, u32)>,
}

// ---------------------------------------------------------------------------
// JS type converters (hydrate only)
// ---------------------------------------------------------------------------

#[cfg(feature = "hydrate")]
fn js_map_to_u32_pairs(map: &js_sys::Map) -> Vec<(u32, u32)> {
    let mut result = Vec::new();
    map.for_each(&mut |value, key| {
        if let (Some(k), Some(v)) = (key.as_f64(), value.as_f64()) {
            result.push((k as u32, v as u32));
        }
    });
    result.sort_by_key(|&(k, _)| k);
    result
}

// ---------------------------------------------------------------------------
// Stats data loaders
// ---------------------------------------------------------------------------

async fn load_stats_overview() -> StatsOverview {
    #[cfg(feature = "hydrate")]
    {
        let counts = spawn_local_to_send(async move {
            let shows = dmb_idb::count_store(dmb_idb::TABLE_SHOWS)
                .await
                .unwrap_or(0);
            let songs = dmb_idb::count_store(dmb_idb::TABLE_SONGS)
                .await
                .unwrap_or(0);
            let venues = dmb_idb::count_store(dmb_idb::TABLE_VENUES)
                .await
                .unwrap_or(0);
            let tours = dmb_idb::count_store(dmb_idb::TABLE_TOURS)
                .await
                .unwrap_or(0);
            let guests = dmb_idb::count_store(dmb_idb::TABLE_GUESTS)
                .await
                .unwrap_or(0);
            let setlists = dmb_idb::count_store(dmb_idb::TABLE_SETLIST_ENTRIES)
                .await
                .unwrap_or(0);
            (shows, songs, venues, tours, guests, setlists)
        })
        .await;

        let (shows, songs, venues, tours, guests, setlists) = counts;
        let avg = if shows > 0 {
            setlists as f32 / shows as f32
        } else {
            0.0
        };
        StatsOverview {
            show_count: shows,
            song_count: songs,
            venue_count: venues,
            tour_count: tours,
            guest_count: guests,
            setlist_count: setlists,
            avg_songs_per_show: avg,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsOverview::default()
    }
}

async fn load_stats_songs() -> StatsSongs {
    #[cfg(feature = "hydrate")]
    {
        let data = spawn_local_to_send(async move {
            let top_played = dmb_idb::stats_top_songs(25).await.unwrap_or_default();
            let top_openers = dmb_idb::stats_top_openers(10).await.unwrap_or_default();
            let top_closers = dmb_idb::stats_top_closers(10).await.unwrap_or_default();
            let top_encores = dmb_idb::stats_top_encores(10).await.unwrap_or_default();

            // Debut histogram via WASM aggregation
            let debuts_by_year = {
                let setlists: Vec<SetlistEntry> = dmb_idb::list_all(dmb_idb::TABLE_SETLIST_ENTRIES)
                    .await
                    .unwrap_or_default();
                if setlists.is_empty() {
                    Vec::new()
                } else {
                    let json = serde_json::to_string(&setlists).unwrap_or_default();
                    match dmb_wasm::calculate_song_debuts_with_count(&json) {
                        Ok(map) => js_map_to_u32_pairs(&map),
                        Err(_) => Vec::new(),
                    }
                }
            };

            (
                top_played,
                top_openers,
                top_closers,
                top_encores,
                debuts_by_year,
            )
        })
        .await;

        StatsSongs {
            top_played: data.0,
            top_openers: data.1,
            top_closers: data.2,
            top_encores: data.3,
            debuts_by_year: data.4,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsSongs::default()
    }
}

async fn load_stats_shows() -> StatsShows {
    #[cfg(feature = "hydrate")]
    {
        let data = spawn_local_to_send(async move {
            let shows: Vec<Show> = dmb_idb::list_all(dmb_idb::TABLE_SHOWS)
                .await
                .unwrap_or_default();
            let tours = dmb_idb::list_recent_tours(25).await.unwrap_or_default();

            let years: Vec<u32> = shows.iter().map(|s| s.year as u32).collect();
            let rarity_values: Vec<f64> = shows
                .iter()
                .filter_map(|s| s.rarity_index.map(|r| r as f64))
                .collect();

            let shows_by_year = if years.is_empty() {
                Vec::new()
            } else {
                let map = dmb_wasm::aggregate_by_year(&years);
                js_map_to_u32_pairs(&map)
            };

            let shows_by_decade = if years.is_empty() {
                Vec::new()
            } else {
                let map = dmb_wasm::aggregate_by_decade(&years);
                js_map_to_u32_pairs(&map)
            };

            let (rmin, rq1, rmed, rq3, rmax) = if rarity_values.is_empty() {
                (0.0, 0.0, 0.0, 0.0, 0.0)
            } else {
                match dmb_wasm::calculate_quartiles(&rarity_values) {
                    Ok(obj) => {
                        let get = |key: &str| -> f64 {
                            js_sys::Reflect::get(&obj, &JsValue::from_str(key))
                                .ok()
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0)
                        };
                        (get("min"), get("q1"), get("median"), get("q3"), get("max"))
                    }
                    Err(_) => (0.0, 0.0, 0.0, 0.0, 0.0),
                }
            };

            (
                shows_by_year,
                shows_by_decade,
                rmin,
                rq1,
                rmed,
                rq3,
                rmax,
                tours,
            )
        })
        .await;

        StatsShows {
            shows_by_year: data.0,
            shows_by_decade: data.1,
            rarity_min: data.2,
            rarity_q1: data.3,
            rarity_median: data.4,
            rarity_q3: data.5,
            rarity_max: data.6,
            recent_tours: data.7,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsShows::default()
    }
}

async fn load_stats_venues() -> StatsVenues {
    #[cfg(feature = "hydrate")]
    {
        let data = spawn_local_to_send(async move {
            let top_venues = dmb_idb::list_top_venues(25).await.unwrap_or_default();
            let all_venues: Vec<Venue> = dmb_idb::list_all(dmb_idb::TABLE_VENUES)
                .await
                .unwrap_or_default();

            // Group by country
            let mut country_map: std::collections::HashMap<String, u32> =
                std::collections::HashMap::new();
            let mut state_map: std::collections::HashMap<String, u32> =
                std::collections::HashMap::new();
            for v in &all_venues {
                let total = v.total_shows.unwrap_or(0) as u32;
                *country_map.entry(v.country.clone()).or_insert(0) += total;
                if v.country == "US" || v.country == "United States" {
                    if let Some(ref state) = v.state {
                        if !state.is_empty() {
                            *state_map.entry(state.clone()).or_insert(0) += total;
                        }
                    }
                }
            }

            let mut by_country: Vec<(String, u32)> = country_map.into_iter().collect();
            by_country.sort_by(|a, b| b.1.cmp(&a.1));

            let mut by_state: Vec<(String, u32)> = state_map.into_iter().collect();
            by_state.sort_by(|a, b| b.1.cmp(&a.1));

            (top_venues, by_country, by_state)
        })
        .await;

        StatsVenues {
            top_venues: data.0,
            shows_by_country: data.1,
            shows_by_state: data.2,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsVenues::default()
    }
}

async fn load_stats_guests() -> StatsGuests {
    #[cfg(feature = "hydrate")]
    {
        let data = spawn_local_to_send(async move {
            let top_guests = dmb_idb::list_top_guests(25).await.unwrap_or_default();
            let appearances: Vec<GuestAppearance> =
                dmb_idb::list_all(dmb_idb::TABLE_GUEST_APPEARANCES)
                    .await
                    .unwrap_or_default();

            let years: Vec<u32> = appearances
                .iter()
                .filter_map(|a| a.year.map(|y| y as u32))
                .collect();

            let appearances_by_year = if years.is_empty() {
                Vec::new()
            } else {
                let map = dmb_wasm::aggregate_by_year(&years);
                js_map_to_u32_pairs(&map)
            };

            (top_guests, appearances_by_year)
        })
        .await;

        StatsGuests {
            top_guests: data.0,
            appearances_by_year: data.1,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsGuests::default()
    }
}

// ---------------------------------------------------------------------------
// Stats page component
// ---------------------------------------------------------------------------

pub fn stats_page() -> impl IntoView {
    let active_tab = RwSignal::new(0u8);

    let overview = Resource::new(|| (), |_| async move { load_stats_overview().await });
    let songs = Resource::new(|| (), |_| async move { load_stats_songs().await });
    let shows = Resource::new(|| (), |_| async move { load_stats_shows().await });
    let venues = Resource::new(|| (), |_| async move { load_stats_venues().await });
    let guests = Resource::new(|| (), |_| async move { load_stats_guests().await });

    let tab_names = ["Overview", "Songs", "Shows & Tours", "Venues", "Guests"];
    let tab_count = tab_names.len() as u8;

    view! {
        <section class="page">
            <h1>"Stats"</h1>
            <p class="lead">"WASM-powered aggregations over the full concert database."</p>

            <nav
                class="stats-tabs"
                role="tablist"
                aria-label="Statistics sections"
                aria-orientation="horizontal"
            >
                {tab_names
                    .iter()
                    .enumerate()
                    .map(|(i, name)| {
                        let idx = i as u8;
                        let tab_id = format!("stats-tab-{idx}");
                        let panel_id = format!("stats-panel-{idx}");
                        view! {
                            <button type="button"
                                role="tab"
                                id=tab_id
                                aria-controls=panel_id
                                class:active=move || active_tab.get() == idx
                                aria-selected=move || active_tab.get() == idx
                                tabindex=move || if active_tab.get() == idx { 0 } else { -1 }
                                on:click=move |_| active_tab.set(idx)
                                on:keydown=move |ev| {
                                    let key = ev.key();
                                    let next = match key.as_str() {
                                        "ArrowRight" => Some((idx + 1) % tab_count),
                                        "ArrowLeft" => Some((idx + tab_count - 1) % tab_count),
                                        "Home" => Some(0),
                                        "End" => Some(tab_count - 1),
                                        _ => None,
                                    };
                                    if let Some(next_idx) = next {
                                        ev.prevent_default();
                                        active_tab.set(next_idx);
                                        focus_stats_tab(next_idx);
                                    }
                                }
                            >
                                {*name}
                            </button>
                        }
                    })
                    .collect::<Vec<_>>()}
            </nav>

            // Tab 0: Overview
            <div
                class="stats-panel"
                id="stats-panel-0"
                role="tabpanel"
                aria-labelledby="stats-tab-0"
                hidden=move || active_tab.get() != 0
                style:display=move || if active_tab.get() == 0 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading overview", "Crunching summary aggregates.")>
                    {move || {
                        let data = overview.get().unwrap_or_default();
                        view! {
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <span class="stat-value">{data.show_count.to_string()}</span>
                                    <span class="stat-label">"Shows"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.song_count.to_string()}</span>
                                    <span class="stat-label">"Songs"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.venue_count.to_string()}</span>
                                    <span class="stat-label">"Venues"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.tour_count.to_string()}</span>
                                    <span class="stat-label">"Tours"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.guest_count.to_string()}</span>
                                    <span class="stat-label">"Guests"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.setlist_count.to_string()}</span>
                                    <span class="stat-label">"Setlist Entries"</span>
                                </div>
                            </div>
                            <div class="stat-card" style="margin-top: 1rem">
                                <span class="stat-value">{format!("{:.1}", data.avg_songs_per_show)}</span>
                                <span class="stat-label">"Avg Songs Per Show"</span>
                            </div>
                            <p class="muted" style="margin-top: 1rem">
                                {format!("Database: {} v{}", dmb_idb::DB_NAME, dmb_idb::DB_VERSION)}
                            </p>
                        }
                    }}
                </Suspense>
            </div>

            // Tab 1: Songs
            <div
                class="stats-panel"
                id="stats-panel-1"
                role="tabpanel"
                aria-labelledby="stats-tab-1"
                hidden=move || active_tab.get() != 1
                style:display=move || if active_tab.get() == 1 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading songs stats", "Computing song rankings.")>
                    {move || {
                        let data = songs.get().unwrap_or_default();
                        view! {
                            <h2>"Top 25 Most Played"</h2>
                            {render_song_table(&data.top_played, true)}

                            <h2>"Top 10 Openers"</h2>
                            {render_song_ranking(&data.top_openers, |s| s.opener_count.unwrap_or(0))}

                            <h2>"Top 10 Closers"</h2>
                            {render_song_ranking(&data.top_closers, |s| s.closer_count.unwrap_or(0))}

                            <h2>"Top 10 Encores"</h2>
                            {render_song_ranking(&data.top_encores, |s| s.encore_count.unwrap_or(0))}

                            <h2>"Song Debuts by Year"</h2>
                            {render_bar_chart(&data.debuts_by_year)}
                        }
                    }}
                </Suspense>
            </div>

            // Tab 2: Shows & Tours
            <div
                class="stats-panel"
                id="stats-panel-2"
                role="tabpanel"
                aria-labelledby="stats-tab-2"
                hidden=move || active_tab.get() != 2
                style:display=move || if active_tab.get() == 2 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading shows stats", "Computing show and rarity metrics.")>
                    {move || {
                        let data = shows.get().unwrap_or_default();
                        view! {
                            <h2>"Shows Per Year"</h2>
                            {render_bar_chart(&data.shows_by_year)}

                            <h2>"Shows Per Decade"</h2>
                            <div class="stats-grid">
                                {data
                                    .shows_by_decade
                                    .iter()
                                    .map(|(decade, count)| {
                                        view! {
                                            <div class="stat-card">
                                                <span class="stat-value">{count.to_string()}</span>
                                                <span class="stat-label">{format!("{}s", decade)}</span>
                                            </div>
                                        }
                                    })
                                    .collect::<Vec<_>>()}
                            </div>

                            <h2>"Rarity Index Distribution"</h2>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_min)}</span>
                                    <span class="stat-label">"Min"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_q1)}</span>
                                    <span class="stat-label">"Q1"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_median)}</span>
                                    <span class="stat-label">"Median"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_q3)}</span>
                                    <span class="stat-label">"Q3"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_max)}</span>
                                    <span class="stat-label">"Max"</span>
                                </div>
                            </div>

                            <h2>"Recent Tours"</h2>
                            <ul class="result-list">
                                {data
                                    .recent_tours
                                    .iter()
                                    .map(|tour| {
                                        let href = format!("/tours/{}", tour.year);
                                        let total = tour.total_shows.unwrap_or(0);
                                        view! {
                                            <li class="result-card">
                                                <span class="pill">{tour.year.to_string()}</span>
                                                <div class="result-body">
                                                    <a class="result-label" href=href>{tour.name.clone()}</a>
                                                </div>
                                                <span class="result-score">{format!("{} shows", total)}</span>
                                            </li>
                                        }
                                    })
                                    .collect::<Vec<_>>()}
                            </ul>
                        }
                    }}
                </Suspense>
            </div>

            // Tab 3: Venues
            <div
                class="stats-panel"
                id="stats-panel-3"
                role="tabpanel"
                aria-labelledby="stats-tab-3"
                hidden=move || active_tab.get() != 3
                style:display=move || if active_tab.get() == 3 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading venue stats", "Computing venue distributions.")>
                    {move || {
                        let data = venues.get().unwrap_or_default();
                        view! {
                            <h2>"Top 25 Venues"</h2>
                            <ul class="result-list">
                                {data
                                    .top_venues
                                    .iter()
                                    .map(|venue| {
                                        let href = format!("/venues/{}", venue.id);
                                        let location = format_location(&venue.city, &venue.state);
                                        let total = venue.total_shows.unwrap_or(0);
                                        view! {
                                            <li class="result-card">
                                                <span class="pill">{venue.state.clone().unwrap_or_else(|| venue.country.clone())}</span>
                                                <div class="result-body">
                                                    <a class="result-label" href=href>{venue.name.clone()}</a>
                                                    <span class="result-meta">{location}</span>
                                                </div>
                                                <span class="result-score">{format!("{} shows", total)}</span>
                                            </li>
                                        }
                                    })
                                    .collect::<Vec<_>>()}
                            </ul>

                            <h2>"Shows by Country"</h2>
                            {render_string_bar_chart(&data.shows_by_country, 15)}

                            <h2>"Shows by US State"</h2>
                            {render_string_bar_chart(&data.shows_by_state, 20)}
                        }
                    }}
                </Suspense>
            </div>

            // Tab 4: Guests
            <div
                class="stats-panel"
                id="stats-panel-4"
                role="tabpanel"
                aria-labelledby="stats-tab-4"
                hidden=move || active_tab.get() != 4
                style:display=move || if active_tab.get() == 4 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading guest stats", "Computing guest appearance metrics.")>
                    {move || {
                        let data = guests.get().unwrap_or_default();
                        view! {
                            <h2>"Top 25 Guests"</h2>
                            <ul class="result-list">
                                {data
                                    .top_guests
                                    .iter()
                                    .map(|guest| {
                                        let href = format!("/guests/{}", guest.slug);
                                        let total = guest.total_appearances.unwrap_or(0);
                                        view! {
                                            <li class="result-card">
                                                <div class="result-body">
                                                    <a class="result-label" href=href>{guest.name.clone()}</a>
                                                </div>
                                                <span class="result-score">{format!("{} appearances", total)}</span>
                                            </li>
                                        }
                                    })
                                    .collect::<Vec<_>>()}
                            </ul>

                            <h2>"Guest Appearances by Year"</h2>
                            {render_bar_chart(&data.appearances_by_year)}
                        }
                    }}
                </Suspense>
            </div>
        </section>
    }
}

// ---------------------------------------------------------------------------
// Stats rendering helpers
// ---------------------------------------------------------------------------

fn render_song_table(songs: &[Song], show_total: bool) -> impl IntoView {
    if songs.is_empty() {
        return empty_state(
            "No data available",
            "There are no rows for this ranking yet.",
        )
        .into_any();
    }
    let table_label = if show_total {
        "Song ranking by total performances"
    } else {
        "Song ranking"
    };
    view! {
        <div class="stats-table-wrap">
            <table class="stats-table" aria-label=table_label>
                <caption class="visually-hidden">{table_label}</caption>
                <thead>
                    <tr>
                        <th scope="col">"#"</th>
                        <th scope="col">"Song"</th>
                        {if show_total {
                            Some(view! { <th scope="col">"Plays"</th> })
                        } else {
                            None
                        }}
                    </tr>
                </thead>
                <tbody>
                    {songs
                        .iter()
                        .enumerate()
                        .map(|(i, song)| {
                            let href = format!("/songs/{}", song.slug);
                            view! {
                                <tr>
                                    <td>{(i + 1).to_string()}</td>
                                    <td><a href=href>{song.title.clone()}</a></td>
                                    {if show_total {
                                        Some(view! { <td>{song.total_performances.unwrap_or(0).to_string()}</td> })
                                    } else {
                                        None
                                    }}
                                </tr>
                            }
                        })
                        .collect::<Vec<_>>()}
                </tbody>
            </table>
        </div>
    }
    .into_any()
}

fn render_song_ranking(songs: &[Song], count_fn: fn(&Song) -> i32) -> impl IntoView {
    if songs.is_empty() {
        return empty_state(
            "No data available",
            "There are no rows for this ranking yet.",
        )
        .into_any();
    }
    view! {
        <ul class="result-list">
            {songs
                .iter()
                .map(|song| {
                    let href = format!("/songs/{}", song.slug);
                    let count = count_fn(song);
                    view! {
                        <li class="result-card">
                            <div class="result-body">
                                <a class="result-label" href=href>{song.title.clone()}</a>
                            </div>
                            <span class="result-score">{format!("{} times", count)}</span>
                        </li>
                    }
                })
                .collect::<Vec<_>>()}
        </ul>
    }
    .into_any()
}

fn render_bar_chart(data: &[(u32, u32)]) -> impl IntoView {
    if data.is_empty() {
        return empty_state(
            "No chart data",
            "This aggregation did not return any values.",
        )
        .into_any();
    }
    let max_val = data.iter().map(|&(_, v)| v).max().unwrap_or(1) as f64;
    view! {
        <div class="bar-chart" role="list" aria-label="Bar chart">
            {data
                .iter()
                .map(|&(label, value)| {
                    let pct = if max_val > 0.0 {
                        (value as f64 / max_val * 100.0) as u32
                    } else {
                        0
                    };
                    let width = format!("width: {}%", pct.max(1));
                    view! {
                        <div class="bar-row" role="listitem" aria-label=format!("{label}: {value}")>
                            <span class="bar-label">{label.to_string()}</span>
                            <div class="bar" style=width></div>
                            <span class="bar-value">{value.to_string()}</span>
                        </div>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
    .into_any()
}

fn render_string_bar_chart(data: &[(String, u32)], limit: usize) -> impl IntoView {
    if data.is_empty() {
        return empty_state(
            "No chart data",
            "This aggregation did not return any values.",
        )
        .into_any();
    }
    let items: Vec<_> = data.iter().take(limit).collect();
    let max_val = items.iter().map(|(_, v)| *v).max().unwrap_or(1) as f64;
    view! {
        <div class="bar-chart" role="list" aria-label="Bar chart">
            {items
                .iter()
                .map(|(label, value)| {
                    let pct = if max_val > 0.0 {
                        (*value as f64 / max_val * 100.0) as u32
                    } else {
                        0
                    };
                    let width = format!("width: {}%", pct.max(1));
                    view! {
                        <div class="bar-row" role="listitem" aria-label=format!("{label}: {value}")>
                            <span class="bar-label">{label.clone()}</span>
                            <div class="bar" style=width></div>
                            <span class="bar-value">{value.to_string()}</span>
                        </div>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
    .into_any()
}

pub fn assistant_page() -> impl IntoView {
    let (query, set_query) = signal(String::new());
    let embedding_index = RwSignal::new(None::<std::sync::Arc<crate::ai::EmbeddingIndex>>);
    let results = RwSignal::new(Vec::<dmb_core::SearchResult>::new());

    #[cfg(feature = "hydrate")]
    {
        let index_signal = embedding_index.clone();
        spawn_local(async move {
            let loaded = crate::ai::load_embedding_index().await;
            index_signal.set(loaded);
        });

        let index_signal = embedding_index.clone();
        let results_signal = results.clone();
        Effect::new(move |_| {
            let current_query = query.get();
            let current_index = index_signal.get();
            let results_signal = results_signal.clone();
            spawn_local(async move {
                let trimmed = current_query.trim().to_string();
                let items = if trimmed.len() < 2 {
                    Vec::new()
                } else if let Some(index) = current_index {
                    crate::ai::semantic_search(&trimmed, &index, 8).await
                } else {
                    Vec::new()
                };
                results_signal.set(items);
            });
        });
    }

    view! {
        <section class="page">
            <h1>"AI Assistant"</h1>
            <p class="lead">"Offline-first semantic recommendations and answers."</p>
            {move || match embedding_index.get() {
                None => loading_state("Loading embedding index", "Preparing local vector search.").into_any(),
                Some(index) => view! {
                    <p class="list-summary">
                        "Embedding vectors loaded: "
                        {index.records.len()}
                        " (dim "
                        {index.dim}
                        ")"
                    </p>
                }
                .into_any(),
            }}

            <div class="assistant-search">
                <input
                    class="search-input"
                    type="search"
                    placeholder="Ask about a song, show, venue..."
                    prop:value=move || query.get()
                    on:input=move |ev| set_query.set(event_target_value(&ev))
                />
            </div>
            {move || {
                let items = results.get();
                let current_query = query.get();
                let trimmed = current_query.trim().to_string();
                if trimmed.len() < 2 {
                    empty_state(
                        "Ask a question",
                        "Type at least two characters to see semantic recommendations.",
                    )
                    .into_any()
                } else if items.is_empty() {
                    empty_state(
                        "No semantic matches yet",
                        "Try a broader phrase, song title, venue name, or year.",
                    )
                    .into_any()
                } else {
                    let count = items.len();
                    view! {
                        <>
                            <p class="list-summary">
                                {format!("Showing {count} semantic matches for \"{trimmed}\"")}
                            </p>
                            <ul class="result-list">
                                {items
                                    .into_iter()
                                    .map(|item| {
                                        let label = item.label.clone();
                                        let kind = item.result_type.clone();
                                        let href = search_result_href(&item);
                                        view! {
                                            <li class="result-card">
                                                <span class="pill">{kind}</span>
                                                <div class="result-body">
                                                    {move || match &href {
                                                        Some(link) => view! {
                                                            <a class="result-label" href=link.clone()>{label.clone()}</a>
                                                        }
                                                        .into_any(),
                                                        None => view! { <span class="result-label">{label.clone()}</span> }.into_any(),
                                                    }}
                                                </div>
                                                <span class="result-score">{format!("{:.2}", item.score)}</span>
                                            </li>
                                        }
                                    })
                                    .collect::<Vec<_>>()}
                            </ul>
                        </>
                    }
                    .into_any()
                }
            }}
        </section>
    }
}

pub fn not_found_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Not Found"</h1>
            <p>"That route does not exist in the Rust app."</p>
            <div class="card-grid">
                <a class="card card-link" href="/">
                    <h2>"Return Home"</h2>
                    <p class="muted">"Go back to the dashboard and continue browsing."</p>
                </a>
                <a class="card card-link" href="/shows">
                    <h2>"Explore Shows"</h2>
                    <p class="muted">"Jump to core browse pages."</p>
                </a>
                <a class="card card-link" href="/search">
                    <h2>"Search"</h2>
                    <p class="muted">"Find songs, venues, tours, and releases quickly."</p>
                </a>
            </div>
        </section>
    }
}

pub fn my_shows_page() -> impl IntoView {
    let items = RwSignal::new(Vec::<UserAttendedShow>::new());
    let input = RwSignal::new(String::new());
    let message = RwSignal::new(None::<(String, bool)>);
    #[cfg(feature = "hydrate")]
    let loading = RwSignal::new(true);

    #[cfg(feature = "hydrate")]
    {
        let items_signal = items.clone();
        let loading_signal = loading.clone();
        spawn_local(async move {
            items_signal.set(load_user_attended_shows().await);
            loading_signal.set(false);
        });
    }

    #[cfg(feature = "hydrate")]
    let on_add = {
        let items = items.clone();
        let input = input.clone();
        let message = message.clone();
        let loading = loading.clone();
        move |_| {
            let value = input.get();
            let Ok(show_id) = value.trim().parse::<i32>() else {
                message.set(Some((
                    "Enter a positive numeric show ID.".to_string(),
                    true,
                )));
                return;
            };
            if show_id <= 0 {
                message.set(Some((
                    "Enter a positive numeric show ID.".to_string(),
                    true,
                )));
                return;
            }
            message.set(None);
            loading.set(true);
            spawn_local(async move {
                let show_date = load_show(show_id).await.map(|show| show.date);
                if add_user_attended_show(show_id, show_date).await {
                    items.set(load_user_attended_shows().await);
                    input.set(String::new());
                    message.set(Some((format!("Saved show {show_id} locally."), false)));
                } else {
                    message.set(Some((
                        "Unable to save this show. Please try again.".to_string(),
                        true,
                    )));
                }
                loading.set(false);
            });
        }
    };

    #[cfg(not(feature = "hydrate"))]
    let on_add = |_| {};

    #[cfg(feature = "hydrate")]
    let on_remove = {
        let items = items.clone();
        let message = message.clone();
        let loading = loading.clone();
        move |show_id: i32| {
            let items = items.clone();
            let message = message.clone();
            let loading = loading.clone();
            spawn_local(async move {
                loading.set(true);
                if remove_user_attended_show(show_id).await {
                    items.set(load_user_attended_shows().await);
                    message.set(Some((format!("Removed show {show_id}."), false)));
                } else {
                    message.set(Some((
                        "Unable to remove this show. Please try again.".to_string(),
                        true,
                    )));
                }
                loading.set(false);
            });
        }
    };

    #[cfg(not(feature = "hydrate"))]
    let on_remove = |_show_id: i32| {};

    #[cfg(not(feature = "hydrate"))]
    let _ = (&items, &message, &on_remove, &input);

    view! {
        <section class="page">
            <h1>"My Shows"</h1>
            <p class="lead">"Track shows you've attended, stored locally."</p>
            <div class="inline-form">
                <input
                    class="input"
                    type="number"
                    placeholder="Enter show id"
                    prop:value=move || input.get()
                    on:input=move |ev| input.set(event_target_value(&ev))
                />
                <button type="button" class="pill" on:click=on_add>"Add"</button>
            </div>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    message.get().map(|(msg, is_error)| {
                        let class_name = if is_error {
                            "form-message form-message--error"
                        } else {
                            "form-message"
                        };
                        view! { <p class=class_name>{msg}</p> }
                    })
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    None::<leptos::prelude::View<leptos::prelude::AnyView>>
                }
            }}
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    if loading.get() {
                        loading_state("Loading saved shows", "Reading your local show list.")
                            .into_any()
                    } else if items.get().is_empty() {
                        empty_state_with_link(
                            "No saved shows yet",
                            "Add a show ID to start tracking your attended history.",
                            "/shows",
                            "Browse shows",
                        )
                        .into_any()
                    } else {
                        let saved = items.get();
                        let count = saved.len();
                        view! {
                            <>
                                <p class="list-summary">{format!("Showing {count} saved shows")}</p>
                                <ul class="result-list">
                                    {saved
                                        .into_iter()
                                        .map(|item| {
                                            let href = format!("/shows/{}", item.show_id);
                                            let date = item
                                                .show_date
                                                .clone()
                                                .unwrap_or_else(|| "Unknown date".to_string());
                                            let show_id = item.show_id;
                                            view! {
                                                <li class="result-card">
                                                    <span class="pill">{format!("#{}", show_id)}</span>
                                                    <div class="result-body">
                                                        <a class="result-label" href=href>{date}</a>
                                                        <span class="result-meta">{format!("Show ID {show_id}")}</span>
                                                    </div>
                                                    <button type="button" class="pill pill--ghost" on:click=move |_| on_remove(show_id)>
                                                        "Remove"
                                                    </button>
                                                </li>
                                            }
                                        })
                                        .collect::<Vec<_>>()}
                                </ul>
                            </>
                        }
                        .into_any()
                    }
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    empty_state(
                        "Available after hydration",
                        "Local show tracking is enabled once the browser runtime is active.",
                    )
                    .into_any()
                }
            }}
        </section>
    }
}

fn render_liberation_items(list: Vec<LiberationEntry>) -> impl IntoView {
    if list.is_empty() {
        return empty_state_with_link(
            "No liberation data available",
            "Gap calculations are currently unavailable.",
            "/songs",
            "Browse songs",
        )
        .into_any();
    }
    let count = list.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing top {count} longest song gaps")}</p>
            <ul class="result-list">
                {list
                    .into_iter()
                    .enumerate()
                    .map(|(idx, entry)| {
                        let label = entry
                            .song
                            .as_ref()
                            .map(|song| song.title.clone())
                            .unwrap_or_else(|| format!("Song #{}", entry.song_id));
                        let days = entry.days_since.unwrap_or(0);
                        let shows = entry.shows_since.unwrap_or(0);
                        let last_played = entry
                            .last_played_date
                            .clone()
                            .unwrap_or_else(|| "unknown".to_string());
                        view! {
                            <li class="result-card">
                                <span class="pill">{format!("#{}", idx + 1)}</span>
                                <div class="result-body">
                                    <span class="result-label">{label}</span>
                                    <span class="result-meta">{format!("{shows} shows since • last played {last_played}")}</span>
                                </div>
                                <span class="result-score">{format!("{days} days")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}

fn render_discography_items(list: Vec<Release>) -> impl IntoView {
    if list.is_empty() {
        return empty_state_with_link(
            "No releases available",
            "Release catalog rows are currently unavailable.",
            "/releases",
            "Browse recent releases",
        )
        .into_any();
    }
    let count = list.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing {count} releases")}</p>
            <ul class="result-list">
                {list
                    .into_iter()
                    .map(|release| {
                        let href = format!("/releases/{}", release.slug);
                        let release_type = release
                            .release_type
                            .clone()
                            .unwrap_or_else(|| "Release".to_string());
                        let release_date = release
                            .release_date
                            .clone()
                            .unwrap_or_else(|| "-".to_string());
                        view! {
                            <li class="result-card">
                                <span class="pill">{release_type}</span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{release.title}</a>
                                </div>
                                <span class="result-score">{release_date}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}

fn render_curated_list_cards(list: Vec<CuratedList>) -> impl IntoView {
    if list.is_empty() {
        return empty_state(
            "No curated lists available",
            "Featured list metadata is currently unavailable.",
        )
        .into_any();
    }
    let count = list.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing {count} curated lists")}</p>
            <ul class="result-list">
                {list
                    .into_iter()
                    .map(|list| {
                        let href = format!("/lists/{}", list.id);
                        let item_count = list.item_count.unwrap_or(0);
                        view! {
                            <li class="result-card">
                                <span class="pill">{list.category.clone()}</span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{list.title.clone()}</a>
                                    <span class="result-meta">{list.description.clone().unwrap_or_default()}</span>
                                </div>
                                <span class="result-score">{format!("{item_count} items")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}

fn normalized_curated_item_type(raw: &str) -> String {
    let normalized = raw.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        "other".to_string()
    } else {
        normalized
    }
}

fn curated_item_type_label(type_key: &str) -> String {
    match type_key {
        "show" => "Show".to_string(),
        "song" => "Song".to_string(),
        "venue" => "Venue".to_string(),
        "guest" => "Guest".to_string(),
        "release" => "Release".to_string(),
        "tour" => "Tour".to_string(),
        "other" => "Other".to_string(),
        custom => {
            let cleaned = custom.replace(['-', '_'], " ");
            let mut words = cleaned
                .split_whitespace()
                .map(|word| {
                    let mut chars = word.chars();
                    match chars.next() {
                        Some(first) => {
                            format!("{}{}", first.to_ascii_uppercase(), chars.as_str())
                        }
                        None => String::new(),
                    }
                })
                .collect::<Vec<_>>();
            words.retain(|word| !word.is_empty());
            if words.is_empty() {
                "Other".to_string()
            } else {
                words.join(" ")
            }
        }
    }
}

fn curated_item_type_counts(items: &[CuratedListItem]) -> Vec<(String, usize)> {
    let mut counts = BTreeMap::<String, usize>::new();
    for item in items {
        let key = normalized_curated_item_type(&item.item_type);
        *counts.entry(key).or_insert(0) += 1;
    }

    let priority = ["show", "song", "venue", "guest", "release", "tour", "other"];
    let mut ordered = Vec::with_capacity(counts.len());
    for key in priority {
        if let Some(count) = counts.remove(key) {
            ordered.push((key.to_string(), count));
        }
    }
    ordered.extend(counts);
    ordered
}

fn curated_item_href(item: &CuratedListItem) -> Option<String> {
    if let Some(link) = item.item_link.as_ref() {
        let trimmed = link.trim();
        if trimmed.starts_with('/') && !trimmed.starts_with("//") {
            return Some(trimmed.to_string());
        }
        if let Some(path) = trimmed
            .strip_prefix("https://dmbalmanac.com")
            .or_else(|| trimmed.strip_prefix("http://dmbalmanac.com"))
        {
            if path.starts_with('/') {
                return Some(path.to_string());
            }
        }
    }

    match normalized_curated_item_type(&item.item_type).as_str() {
        "show" => item.show_id.map(|id| format!("/shows/{id}")),
        "venue" => item.venue_id.map(|id| format!("/venues/{id}")),
        _ => None,
    }
}

fn curated_item_context(item: &CuratedListItem) -> Option<String> {
    let mut pieces = Vec::new();
    if let Some(show_id) = item.show_id {
        pieces.push(format!("Show #{show_id}"));
    }
    if let Some(song_id) = item.song_id {
        pieces.push(format!("Song #{song_id}"));
    }
    if let Some(venue_id) = item.venue_id {
        pieces.push(format!("Venue #{venue_id}"));
    }
    if let Some(guest_id) = item.guest_id {
        pieces.push(format!("Guest #{guest_id}"));
    }
    if let Some(release_id) = item.release_id {
        pieces.push(format!("Release #{release_id}"));
    }

    if pieces.is_empty() {
        None
    } else {
        Some(pieces.join(" • "))
    }
}

fn curated_item_title(item: &CuratedListItem) -> String {
    item.item_title
        .as_deref()
        .map(str::trim)
        .filter(|title| !title.is_empty())
        .map(ToString::to_string)
        .unwrap_or_else(|| {
            let type_label =
                curated_item_type_label(&normalized_curated_item_type(&item.item_type));
            format!("{type_label} #{id}", id = item.id)
        })
}

fn curated_item_matches_query(item: &CuratedListItem, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let in_title = item
        .item_title
        .as_deref()
        .map(|title| title.to_ascii_lowercase().contains(query))
        .unwrap_or(false);
    let in_notes = item
        .notes
        .as_deref()
        .map(|notes| notes.to_ascii_lowercase().contains(query))
        .unwrap_or(false);
    let in_type = item.item_type.to_ascii_lowercase().contains(query);
    in_title || in_notes || in_type
}

fn render_curated_list_detail_content(
    list: CuratedList,
    items: Vec<CuratedListItem>,
    active_filter: RwSignal<String>,
    query: RwSignal<String>,
) -> impl IntoView {
    let description = list
        .description
        .as_deref()
        .map(str::trim)
        .filter(|description| !description.is_empty())
        .unwrap_or("No description is available for this list.")
        .to_string();
    let total_count = items.len();
    let type_counts = curated_item_type_counts(&items);
    let active_key = active_filter.get();
    let query_raw = query.get();
    let query_text = query_raw.trim().to_string();
    let query_normalized = query_text.to_ascii_lowercase();

    let filtered_items = items
        .into_iter()
        .filter(|item| {
            let item_type = normalized_curated_item_type(&item.item_type);
            let matches_type = active_key == "all" || item_type == active_key;
            matches_type && curated_item_matches_query(item, &query_normalized)
        })
        .collect::<Vec<_>>();

    let filtered_count = filtered_items.len();
    let has_filters = active_key != "all" || !query_text.is_empty();
    let active_label = if active_key == "all" {
        "items".to_string()
    } else {
        let base = curated_item_type_label(&active_key).to_ascii_lowercase();
        if filtered_count == 1 {
            base
        } else {
            format!("{base}s")
        }
    };
    let summary = if query_text.is_empty() {
        format!("Showing {filtered_count} of {total_count} {active_label}")
    } else {
        format!(
            "Showing {filtered_count} of {total_count} {active_label} matching \"{query_text}\""
        )
    };

    view! {
        <div class="detail-list-head">
            <div class="detail-list-head__copy">
                <h2>{list.title.clone()}</h2>
                <p class="muted">{description}</p>
            </div>
            <div class="pill-row detail-list-head__meta">
                <span class="pill">{list.category.clone()}</span>
                {list.is_featured.unwrap_or(false).then(|| view! { <span class="pill">"Featured"</span> })}
                <span class="pill pill--ghost">{format!("{total_count} items")}</span>
            </div>
        </div>

        <div class="detail-list-controls">
            <label class="visually-hidden" for="curated-list-search">"Filter list items"</label>
            <input
                id="curated-list-search"
                class="search-input"
                type="search"
                placeholder="Filter by title, item type, or notes"
                prop:value=move || query.get()
                on:input=move |ev| query.set(event_target_value(&ev))
            />
            <div
                class="result-filters"
                role="group"
                aria-label="Curated list item filters"
                aria-controls="curated-list-results"
            >
                <button
                    type="button"
                    class="result-filter pill pill--ghost"
                    class:result-filter--active=move || active_filter.get() == "all"
                    aria-pressed=move || active_filter.get() == "all"
                    on:click=move |_| active_filter.set("all".to_string())
                >
                    {format!("All ({total_count})")}
                </button>
                {type_counts
                    .into_iter()
                    .map(|(type_key, count)| {
                        let type_label = curated_item_type_label(&type_key);
                        let key_for_class = type_key.clone();
                        let key_for_aria = type_key.clone();
                        let key_for_click = type_key.clone();
                        view! {
                            <button
                                type="button"
                                class="result-filter pill pill--ghost"
                                class:result-filter--active=move || active_filter.get() == key_for_class
                                aria-pressed=move || active_filter.get() == key_for_aria
                                on:click=move |_| active_filter.set(key_for_click.clone())
                            >
                                {format!("{type_label} ({count})")}
                            </button>
                        }
                    })
                    .collect::<Vec<_>>()}
            </div>
        </div>

        <p class="list-summary" role="status" aria-live="polite">
            {summary}
        </p>

        {if filtered_items.is_empty() {
            view! {
                <section class="status-card status-card--empty">
                    <p class="status-title">"No items match this view"</p>
                    <p class="muted">"Try a different filter or clear the search query."</p>
                    {has_filters.then(|| {
                        view! {
                            <div class="pill-row">
                                <button
                                    type="button"
                                    class="pill pill--ghost"
                                    on:click=move |_| {
                                        active_filter.set("all".to_string());
                                        query.set(String::new());
                                    }
                                >
                                    "Clear filters"
                                </button>
                            </div>
                        }
                    })}
                </section>
            }
                .into_any()
        } else {
            view! {
                <ol
                    id="curated-list-results"
                    class="tracklist"
                    aria-label="Curated list items"
                >
                    {filtered_items
                        .into_iter()
                        .map(|item| {
                            let item_type = normalized_curated_item_type(&item.item_type);
                            let item_type_label = curated_item_type_label(&item_type);
                            let title = curated_item_title(&item);
                            let href = curated_item_href(&item);
                            let context = curated_item_context(&item);
                            let notes = item
                                .notes
                                .as_deref()
                                .map(str::trim)
                                .filter(|notes| !notes.is_empty())
                                .map(ToString::to_string);

                            let title_view = match href {
                                Some(href) => view! {
                                    <a class="tracklist-title result-label" href=href>{title.clone()}</a>
                                }
                                    .into_any(),
                                None => view! { <span class="tracklist-title">{title.clone()}</span> }.into_any(),
                            };

                            view! {
                                <li class="tracklist-item">
                                    <span class="tracklist-pos">{item.position}</span>
                                    <div class="tracklist-main">
                                        {title_view}
                                        {context.map(|context_line| view! {
                                            <span class="tracklist-context">{context_line}</span>
                                        })}
                                        {notes.map(|notes_line| view! {
                                            <span class="tracklist-note">{notes_line}</span>
                                        })}
                                    </div>
                                    <span class="setlist-slot">{item_type_label}</span>
                                </li>
                            }
                        })
                        .collect::<Vec<_>>()}
                </ol>
            }
                .into_any()
        }}
    }
}

pub fn liberation_page() -> impl IntoView {
    let items = Resource::new(|| (), |_| async move { load_liberation_list(50).await });

    view! {
        <section class="page">
            <h1>"Liberation List"</h1>
            <p class="lead">"Songs with the longest gaps since last play."</p>
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading liberation list",
                        "Computing gap durations and recent play context.",
                    )
                }
            >
                {move || render_liberation_items(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn discography_page() -> impl IntoView {
    let items = Resource::new(|| (), |_| async move { load_all_releases().await });

    view! {
        <section class="page">
            <h1>"Discography"</h1>
            <p class="lead">"Complete release catalog."</p>
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading discography",
                        "Fetching full release catalog.",
                    )
                }
            >
                {move || render_discography_items(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn curated_lists_page() -> impl IntoView {
    let items = Resource::new(|| (), |_| async move { load_curated_lists().await });

    view! {
        <section class="page">
            <h1>"Curated Lists"</h1>
            <p class="lead">"Featured playlists, fan picks, and themed collections."</p>
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading curated lists",
                        "Fetching featured and themed collections.",
                    )
                }
            >
                {move || render_curated_list_cards(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn curated_list_detail_page() -> impl IntoView {
    let params = use_params_map();
    let list_id = move || params.with(|params| params.get("listId").unwrap_or_default());
    let active_filter = RwSignal::new("all".to_string());
    let query = RwSignal::new(String::new());

    let list = Resource::new(list_id, |id: String| async move {
        let id = parse_positive_i32_param(&id, "listId").ok()?;
        let lists = load_curated_lists().await;
        lists.into_iter().find(|list| list.id == id)
    });

    let items = Resource::new(list_id, |id: String| async move {
        let Ok(id) = parse_positive_i32_param(&id, "listId") else {
            return Vec::new();
        };
        load_curated_list_items(id, 200).await
    });

    #[cfg(feature = "hydrate")]
    {
        let active_filter_signal = active_filter.clone();
        let query_signal = query.clone();
        Effect::new(move |_| {
            let _ = list_id();
            active_filter_signal.set("all".to_string());
            query_signal.set(String::new());
        });
    }

    view! {
        <section class="page">
            {detail_nav("/lists", "Back to curated lists")}
            <h1>"Curated List Details"</h1>
            <p class="lead">"Highlights, context, and quick filtering for every item in this collection."</p>
            {move || {
                match parse_positive_i32_param(&list_id(), "listId") {
                    Ok(id) => view! { <p class="page-subhead">{format!("List ID: {id}")}</p> }.into_any(),
                    Err(message) => view! { <p class="muted">{message}</p> }.into_any(),
                }
            }}
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading curated list",
                        "Fetching list metadata and up to 200 ranked items.",
                    )
                }
            >
                {move || {
                    let list_meta = list.get().unwrap_or(None);
                    let list_items = items.get().unwrap_or_default();
                    if let Some(list_val) = list_meta {
                        render_curated_list_detail_content(list_val, list_items, active_filter, query)
                            .into_any()
                    } else if parse_positive_i32_param(&list_id(), "listId").is_err() {
                        view! {
                            <section class="status-card status-card--empty">
                                <p class="status-title">"Invalid list id"</p>
                                <p class="muted">
                                    "Use a positive integer list id in the URL to open list details."
                                </p>
                                <p><a class="result-label" href="/lists">"Browse curated lists"</a></p>
                            </section>
                        }
                            .into_any()
                    } else {
                        empty_state_with_link(
                            "List not found",
                            "This curated list id could not be resolved.",
                            "/lists",
                            "Browse curated lists",
                        )
                            .into_any()
                    }
                }}
            </Suspense>
        </section>
    }
}

pub fn visualizations_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Visualizations"</h1>
            <p class="lead">"Live data visual summaries are available through Rust-native routes."</p>
            <div class="card-grid">
                <a class="card card-link" href="/stats">
                    <h2>"Stats Dashboard"</h2>
                    <p class="muted">"Shows by year, top songs, venues, guests, and era splits."</p>
                </a>
                <a class="card card-link" href="/liberation">
                    <h2>"Liberation Trends"</h2>
                    <p class="muted">"Longest gaps, recent liberations, and rarity context."</p>
                </a>
                <a class="card card-link" href="/shows">
                    <h2>"Show Browser"</h2>
                    <p class="muted">"Use date and venue metadata as a timeline-style exploration flow."</p>
                </a>
            </div>
            <p class="muted">
                "Additional dedicated visualization modules are being migrated to this route without changing route contracts."
            </p>
        </section>
    }
}

pub fn open_file_page() -> impl IntoView {
    let file_info = RwSignal::new(None::<String>);
    #[cfg(feature = "hydrate")]
    let file_info_signal = file_info.clone();
    let on_select = move |_ev| {
        #[cfg(feature = "hydrate")]
        {
            let input: web_sys::HtmlInputElement = event_target(&_ev);
            if let Some(files) = input.files() {
                if let Some(file) = files.get(0) {
                    let info = format!("{} ({} bytes)", file.name(), file.size());
                    file_info_signal.set(Some(info));
                }
            }
        }
    };

    view! {
        <section class="page">
            <h1>"Open File"</h1>
            <p class="lead">"Import a JSON payload into your offline workspace."</p>
            <h2>"Import File"</h2>
            <p class="muted">"Choose a JSON export to inspect or load into local cache workflows."</p>
            <input type="file" accept=".json,.txt" on:change=on_select />
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    file_info.get().map(|info| view! { <p class="muted">{info}</p> })
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    let _ = file_info.get();
                    None::<leptos::prelude::View<leptos::prelude::AnyView>>
                }
            }}
        </section>
    }
}

pub fn protocol_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    let protocol_value = {
        let value = RwSignal::new(None::<String>);
        let value_signal = value.clone();
        request_animation_frame(move || {
            if let Some(window) = web_sys::window() {
                if let Ok(url) = web_sys::Url::new(&window.location().href().unwrap_or_default()) {
                    let param = url.search_params().get("url");
                    value_signal.set(param);
                }
            }
        });
        value
    };

    view! {
        <section class="page">
            <h1>"Protocol Handler"</h1>
            <p class="lead">"Incoming deep links will surface here."</p>
            <h2>"Incoming URL Payload"</h2>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    protocol_value
                        .get()
                        .map(|value| view! { <p class="muted">{value}</p> })
                        .unwrap_or_else(|| {
                            view! { <p class="muted">{"No protocol payload.".to_string()}</p> }
                        })
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    view! { <p class="muted">"Protocol payload available after hydration."</p> }
                }
            }}
        </section>
    }
}

pub fn test_wasm_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    let wasm_version = {
        let value = RwSignal::new(None::<String>);
        let value_signal = value.clone();
        request_animation_frame(move || {
            value_signal.set(Some(dmb_wasm::core_schema_version()));
        });
        value
    };

    view! {
        <section class="page">
            <h1>"WASM Diagnostics"</h1>
            <p class="lead">"WASM runtime checks and schema version."</p>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    wasm_version
                        .get()
                        .map(|value| view! { <p class="muted">{format!("Core schema: {}", value)}</p> })
                        .unwrap_or_else(|| view! { <p class="muted">{"Loading WASM...".to_string()}</p> })
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    view! { <p class="muted">"WASM diagnostics available after hydration."</p> }
                }
            }}
        </section>
    }
}

#[cfg(test)]
mod tests {
    use super::{
        normalize_guests, normalize_releases, normalize_show_summaries, normalize_songs,
        normalize_tours, normalize_venues, release_track_disc_counts, release_track_matches_query,
        setlist_set_counts, ShowSummary,
    };
    use dmb_core::{Guest, Release, ReleaseTrack, SetlistEntry, Song, Tour, Venue};

    #[test]
    fn normalize_show_summaries_sorts_by_date_desc_then_id() {
        let input = vec![
            ShowSummary {
                id: 2,
                date: "2024-07-10".to_string(),
                year: 2024,
                venue_id: 1,
                venue_name: "B".to_string(),
                venue_city: "x".to_string(),
                venue_state: None,
                tour_name: None,
                tour_year: None,
            },
            ShowSummary {
                id: 1,
                date: "2024-07-10".to_string(),
                year: 2024,
                venue_id: 2,
                venue_name: "A".to_string(),
                venue_city: "y".to_string(),
                venue_state: None,
                tour_name: None,
                tour_year: None,
            },
            ShowSummary {
                id: 3,
                date: "2023-08-01".to_string(),
                year: 2023,
                venue_id: 3,
                venue_name: "C".to_string(),
                venue_city: "z".to_string(),
                venue_state: None,
                tour_name: None,
                tour_year: None,
            },
        ];
        let out = normalize_show_summaries(input, 2);
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].id, 2);
        assert_eq!(out[1].id, 1);
    }

    #[test]
    fn normalize_songs_sorts_by_performances_desc() {
        let input = vec![
            Song {
                id: 1,
                slug: "a".to_string(),
                title: "A".to_string(),
                sort_title: None,
                total_performances: Some(10),
                last_played_date: None,
                is_liberated: None,
                opener_count: None,
                closer_count: None,
                encore_count: None,
                search_text: None,
            },
            Song {
                id: 2,
                slug: "b".to_string(),
                title: "B".to_string(),
                sort_title: None,
                total_performances: Some(25),
                last_played_date: None,
                is_liberated: None,
                opener_count: None,
                closer_count: None,
                encore_count: None,
                search_text: None,
            },
        ];
        let out = normalize_songs(input, 50);
        assert_eq!(out[0].id, 2);
        assert_eq!(out[1].id, 1);
    }

    #[test]
    fn normalize_venues_and_guests_respect_limit() {
        let venues = vec![
            Venue {
                id: 1,
                name: "A".to_string(),
                city: "x".to_string(),
                state: None,
                country: "US".to_string(),
                country_code: None,
                venue_type: None,
                total_shows: Some(10),
                search_text: None,
            },
            Venue {
                id: 2,
                name: "B".to_string(),
                city: "x".to_string(),
                state: None,
                country: "US".to_string(),
                country_code: None,
                venue_type: None,
                total_shows: Some(20),
                search_text: None,
            },
        ];
        let guests = vec![
            Guest {
                id: 1,
                slug: "a".to_string(),
                name: "A".to_string(),
                total_appearances: Some(7),
                search_text: None,
            },
            Guest {
                id: 2,
                slug: "b".to_string(),
                name: "B".to_string(),
                total_appearances: Some(11),
                search_text: None,
            },
        ];
        let venues_out = normalize_venues(venues, 1);
        let guests_out = normalize_guests(guests, 1);
        assert_eq!(venues_out.len(), 1);
        assert_eq!(venues_out[0].id, 2);
        assert_eq!(guests_out.len(), 1);
        assert_eq!(guests_out[0].id, 2);
    }

    #[test]
    fn normalize_tours_sorts_by_year_desc() {
        let input = vec![
            Tour {
                id: 1,
                year: 2023,
                name: "Tour 2023".to_string(),
                total_shows: Some(40),
                search_text: None,
            },
            Tour {
                id: 2,
                year: 2024,
                name: "Tour 2024".to_string(),
                total_shows: Some(20),
                search_text: None,
            },
        ];
        let out = normalize_tours(input, 10);
        assert_eq!(out[0].year, 2024);
        assert_eq!(out[1].year, 2023);
    }

    #[test]
    fn normalize_releases_sorts_by_release_date_desc() {
        let input = vec![
            Release {
                id: 1,
                title: "Older".to_string(),
                slug: "older".to_string(),
                release_type: None,
                release_date: Some("2010-01-01".to_string()),
                search_text: None,
            },
            Release {
                id: 2,
                title: "Newer".to_string(),
                slug: "newer".to_string(),
                release_type: None,
                release_date: Some("2020-01-01".to_string()),
                search_text: None,
            },
        ];
        let out = normalize_releases(input, 10);
        assert_eq!(out[0].id, 2);
        assert_eq!(out[1].id, 1);
    }

    #[test]
    fn normalize_helpers_handle_empty_input() {
        assert!(normalize_show_summaries(Vec::new(), 10).is_empty());
        assert!(normalize_songs(Vec::new(), 10).is_empty());
        assert!(normalize_venues(Vec::new(), 10).is_empty());
        assert!(normalize_guests(Vec::new(), 10).is_empty());
        assert!(normalize_tours(Vec::new(), 10).is_empty());
        assert!(normalize_releases(Vec::new(), 10).is_empty());
    }

    #[test]
    fn setlist_set_counts_groups_entries_by_set_name() {
        let entries = vec![
            SetlistEntry {
                id: 1,
                show_id: 1,
                song_id: 1,
                position: 1,
                set_name: Some("main set".to_string()),
                slot: None,
                show_date: None,
                year: None,
                duration_seconds: None,
                segue_into_song_id: None,
                is_segue: None,
                is_tease: None,
                tease_of_song_id: None,
                notes: None,
                song: None,
            },
            SetlistEntry {
                id: 2,
                show_id: 1,
                song_id: 2,
                position: 2,
                set_name: None,
                slot: None,
                show_date: None,
                year: None,
                duration_seconds: None,
                segue_into_song_id: None,
                is_segue: None,
                is_tease: None,
                tease_of_song_id: None,
                notes: None,
                song: None,
            },
            SetlistEntry {
                id: 3,
                show_id: 1,
                song_id: 3,
                position: 3,
                set_name: Some("encore".to_string()),
                slot: None,
                show_date: None,
                year: None,
                duration_seconds: None,
                segue_into_song_id: None,
                is_segue: None,
                is_tease: None,
                tease_of_song_id: None,
                notes: None,
                song: None,
            },
            SetlistEntry {
                id: 4,
                show_id: 1,
                song_id: 4,
                position: 4,
                set_name: Some("main set".to_string()),
                slot: None,
                show_date: None,
                year: None,
                duration_seconds: None,
                segue_into_song_id: None,
                is_segue: None,
                is_tease: None,
                tease_of_song_id: None,
                notes: None,
                song: None,
            },
        ];

        let counts = setlist_set_counts(&entries);
        assert_eq!(
            counts,
            vec![
                ("main set".to_string(), 2),
                ("unspecified".to_string(), 1),
                ("encore".to_string(), 1),
            ]
        );
    }

    #[test]
    fn release_track_disc_counts_returns_sorted_disc_counts() {
        let tracks = vec![
            ReleaseTrack {
                id: 1,
                release_id: 1,
                song_id: Some(1),
                show_id: None,
                track_number: Some(1),
                disc_number: Some(2),
                duration_seconds: None,
                notes: None,
            },
            ReleaseTrack {
                id: 2,
                release_id: 1,
                song_id: Some(2),
                show_id: None,
                track_number: Some(2),
                disc_number: Some(1),
                duration_seconds: None,
                notes: None,
            },
            ReleaseTrack {
                id: 3,
                release_id: 1,
                song_id: Some(3),
                show_id: None,
                track_number: Some(3),
                disc_number: Some(2),
                duration_seconds: None,
                notes: None,
            },
        ];

        let counts = release_track_disc_counts(&tracks);
        assert_eq!(
            counts,
            vec![("disc-1".to_string(), 1), ("disc-2".to_string(), 2),]
        );
    }

    #[test]
    fn release_track_matches_query_supports_keywords_and_notes() {
        let live_track = ReleaseTrack {
            id: 1,
            release_id: 1,
            song_id: Some(10),
            show_id: Some(42),
            track_number: Some(7),
            disc_number: Some(1),
            duration_seconds: Some(320),
            notes: Some("Rare acoustic version".to_string()),
        };
        let studio_track = ReleaseTrack {
            id: 2,
            release_id: 1,
            song_id: Some(11),
            show_id: None,
            track_number: Some(8),
            disc_number: Some(1),
            duration_seconds: Some(280),
            notes: None,
        };

        assert!(release_track_matches_query(&live_track, "live"));
        assert!(release_track_matches_query(&live_track, "acoustic"));
        assert!(release_track_matches_query(&live_track, "42"));
        assert!(!release_track_matches_query(&live_track, "studio"));
        assert!(release_track_matches_query(&studio_track, "studio"));
    }
}
