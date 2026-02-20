#![allow(clippy::large_types_passed_by_value)]

use leptos::prelude::*;
use leptos::suspense::Suspense;
use leptos::tachys::view::any_view::{AnyView, IntoAny};
#[cfg(feature = "hydrate")]
use leptos::task::spawn_local;
use leptos_router::hooks::use_params_map;
use std::cmp::Ordering;
use std::collections::BTreeMap;

#[cfg(feature = "hydrate")]
use futures::future::join_all;
#[cfg(feature = "hydrate")]
use std::collections::{HashMap, HashSet};
#[cfg(feature = "hydrate")]
use wasm_bindgen::prelude::wasm_bindgen;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;
#[cfg(feature = "hydrate")]
use wasm_bindgen_futures::JsFuture;

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

type SharedEmbeddingIndex = std::sync::Arc<crate::ai::EmbeddingIndex>;

#[cfg(feature = "hydrate")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = scheduler, js_name = postTask, catch)]
    fn scheduler_post_task(
        callback: &js_sys::Function,
        options: &JsValue,
    ) -> Result<js_sys::Promise, JsValue>;
}

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
fn spawn_local_try_set<T: Send + Sync + 'static>(
    signal: RwSignal<T>,
    fut: impl std::future::Future<Output = T> + 'static,
) {
    spawn_local(async move {
        let _ = signal.try_set(fut.await);
    });
}

fn focus_stats_tab(idx: u8) {
    #[cfg(feature = "hydrate")]
    {
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
    {
        let _ = idx;
    }
}

#[cfg(feature = "hydrate")]
async fn wait_ms(ms: i32) {
    let options = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        options.as_ref(),
        &JsValue::from_str("delay"),
        &JsValue::from_f64(f64::from(ms.max(0))),
    );
    let callback = js_sys::Function::new_no_args("");
    let Ok(promise) = scheduler_post_task(&callback, options.as_ref()) else {
        return;
    };
    let _ = JsFuture::from(promise).await;
}

#[cfg(feature = "hydrate")]
async fn copy_text_to_clipboard(text: &str) -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let clipboard = window.navigator().clipboard();
    let promise = clipboard.write_text(text);
    JsFuture::from(promise).await.is_ok()
}

#[cfg(feature = "hydrate")]
fn current_search_param(name: &str) -> Option<String> {
    let window = web_sys::window()?;
    let search = window.location().search().ok()?;
    let params = web_sys::UrlSearchParams::new_with_str(&search).ok()?;
    params.get(name)
}

fn use_seed_data_state() -> RwSignal<crate::data::SeedDataState> {
    let state = RwSignal::new(crate::data::SeedDataState::default());
    #[cfg(feature = "hydrate")]
    {
        let state_signal = state.clone();
        spawn_local(async move {
            state_signal.set(crate::data::detect_seed_data_state().await);
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        state.set(crate::data::SeedDataState::Ready);
    }
    state
}

fn import_in_progress_state(
    title: &'static str,
    href: &'static str,
    label: &'static str,
) -> impl IntoView {
    view! {
        <section class="status-card status-card--loading" role="status" aria-live="polite">
            <p class="status-title">{title}</p>
            <p class="muted">
                "Offline data is still importing. This detail view will populate when local data is ready."
            </p>
            <p><a class="result-label" href=href>{label}</a></p>
        </section>
    }
}

fn normalize_search_filter(raw: &str) -> String {
    let normalized = raw.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "song" | "show" | "venue" | "tour" | "guest" | "release" => normalized,
        _ => "all".to_string(),
    }
}

#[cfg(feature = "hydrate")]
fn sync_search_query_params(query: &str, active_filter: &str) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let query_trimmed = query.trim();
    let filter = normalize_search_filter(active_filter);
    let pathname = window.location().pathname().unwrap_or_default();
    let hash = window.location().hash().unwrap_or_default();
    let Ok(params) = web_sys::UrlSearchParams::new_with_str("") else {
        return;
    };
    if !query_trimmed.is_empty() {
        params.set("q", query_trimmed);
    }
    if filter != "all" {
        params.set("type", &filter);
    }
    let encoded = params.to_string().as_string().unwrap_or_default();
    let query_string = if encoded.is_empty() {
        String::new()
    } else {
        format!("?{encoded}")
    };
    let next = format!("{pathname}{query_string}{hash}");
    let current = format!(
        "{}{}{}",
        pathname,
        window.location().search().unwrap_or_default(),
        hash
    );
    if next == current {
        return;
    }
    if let Ok(history) = window.history() {
        let _ = history.replace_state_with_url(&JsValue::NULL, "", Some(&next));
    }
}

#[must_use]
pub fn home_page() -> impl IntoView {
    let stats = unit_resource(|| async { get_home_stats().await.ok() });
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

#[must_use]
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
    let copy_label = RwSignal::new(String::from("Copy link"));
    let copy_pending = RwSignal::new(false);

    #[cfg(feature = "hydrate")]
    let on_copy = {
        let copy_label_signal = copy_label.clone();
        let copy_pending_signal = copy_pending.clone();
        move |_| {
            if copy_pending_signal.get_untracked() {
                return;
            }
            copy_pending_signal.set(true);
            copy_label_signal.set(String::from("Copying..."));
            let copy_label_signal = copy_label_signal.clone();
            let copy_pending_signal = copy_pending_signal.clone();
            spawn_local(async move {
                let href = web_sys::window()
                    .and_then(|window| window.location().href().ok())
                    .unwrap_or_default();
                let copied = copy_text_to_clipboard(&href).await;
                if copied {
                    copy_label_signal.set(String::from("Copied"));
                } else {
                    copy_label_signal.set(String::from("Copy failed"));
                }
                copy_pending_signal.set(false);
                wait_ms(1400).await;
                copy_label_signal.set(String::from("Copy link"));
            });
        }
    };

    #[cfg(not(feature = "hydrate"))]
    let on_copy = |_| {};

    view! {
        <p class="detail-nav">
            <a class="detail-nav__link" href=href>{label}</a>
            <button
                type="button"
                class="pill pill--ghost detail-nav__copy"
                disabled=move || copy_pending.get()
                on:click=on_copy
            >
                {move || copy_label.get()}
            </button>
        </p>
    }
}

#[must_use]
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

#[must_use]
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

#[must_use]
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

#[must_use]
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
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = window, js_name = dmbGetWebgpuTelemetry, catch)]
    fn js_get_webgpu_runtime_telemetry() -> Result<JsValue, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbResetWebgpuTelemetry, catch)]
    fn js_reset_webgpu_runtime_telemetry() -> Result<(), JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbGetAppleSiliconProfile, catch)]
    fn js_get_apple_silicon_profile() -> Result<JsValue, JsValue>;
}

#[cfg(feature = "hydrate")]
fn load_webgpu_runtime_telemetry() -> Option<WebgpuRuntimeTelemetry> {
    let value = js_get_webgpu_runtime_telemetry().ok()?;
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(feature = "hydrate")]
fn reset_webgpu_runtime_telemetry() {
    let _ = js_reset_webgpu_runtime_telemetry();
}

#[cfg(feature = "hydrate")]
fn load_apple_silicon_profile() -> Option<AppleSiliconProfile> {
    let value = js_get_apple_silicon_profile().ok()?;
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(feature = "hydrate")]
fn load_idb_runtime_metrics() -> Option<IdbRuntimeMetrics> {
    dmb_idb::js_idb_runtime_metrics()
        .ok()
        .and_then(|value| serde_wasm_bindgen::from_value(value).ok())
}

#[derive(Clone, Copy)]
struct AiDiagnosticsState {
    caps: RwSignal<crate::ai::AiCapabilities>,
    ann_meta: RwSignal<Option<AnnIndexMeta>>,
    ann_caps: RwSignal<Option<crate::ai::AnnCapDiagnostics>>,
    ann_caps_loading: RwSignal<bool>,
    ann_caps_error: RwSignal<Option<String>>,
    embed_meta: RwSignal<Option<EmbeddingManifest>>,
    bench: RwSignal<Option<crate::ai::AiBenchmark>>,
    bench_running: RwSignal<bool>,
    bench_progress: RwSignal<f32>,
    bench_stage: RwSignal<String>,
    bench_cancelled: RwSignal<bool>,
    worker_bench: RwSignal<Option<crate::ai::AiWorkerBenchmark>>,
    tuning: RwSignal<Option<crate::ai::AiTuning>>,
    tuning_result: RwSignal<Option<crate::ai::ProbeTuningResult>>,
    benchmark_history: RwSignal<Vec<crate::ai::AiBenchmarkSample>>,
    worker_threshold_input: RwSignal<String>,
    worker_threshold_current: RwSignal<Option<usize>>,
    worker_max_floats: RwSignal<Option<usize>>,
    ann_cap_override_input: RwSignal<String>,
    ann_cap_override_value: RwSignal<Option<u64>>,
    ai_config_seeded: RwSignal<bool>,
    ai_config_version: RwSignal<Option<String>>,
    ai_config_generated_at: RwSignal<Option<String>>,
    ai_config_mismatch: RwSignal<Option<String>>,
    embedding_sample_enabled: RwSignal<bool>,
    cross_origin_isolated: RwSignal<Option<bool>>,
    telemetry_snapshot: RwSignal<Option<crate::ai::AiTelemetrySnapshot>>,
    webgpu_disabled: RwSignal<bool>,
    ai_warnings: RwSignal<Vec<crate::ai::AiWarningEvent>>,
    worker_bench_timestamp: RwSignal<Option<f64>>,
    worker_failure: RwSignal<crate::ai::WorkerFailureStatus>,
    webgpu_probe: RwSignal<Option<bool>>,
    sqlite_parity: RwSignal<Option<crate::data::SqliteParityReport>>,
    integrity_report: RwSignal<Option<crate::data::IntegrityReport>>,
    webgpu_runtime: RwSignal<Option<WebgpuRuntimeTelemetry>>,
    apple_silicon_profile: RwSignal<Option<AppleSiliconProfile>>,
    idb_runtime_metrics: RwSignal<Option<IdbRuntimeMetrics>>,
}

impl AiDiagnosticsState {
    fn new() -> Self {
        Self {
            caps: RwSignal::new(crate::ai::AiCapabilities::default()),
            ann_meta: RwSignal::new(None::<AnnIndexMeta>),
            ann_caps: RwSignal::new(None::<crate::ai::AnnCapDiagnostics>),
            ann_caps_loading: RwSignal::new(false),
            ann_caps_error: RwSignal::new(None::<String>),
            embed_meta: RwSignal::new(None::<EmbeddingManifest>),
            bench: RwSignal::new(None::<crate::ai::AiBenchmark>),
            bench_running: RwSignal::new(false),
            bench_progress: RwSignal::new(0.0_f32),
            bench_stage: RwSignal::new("Idle".to_string()),
            bench_cancelled: RwSignal::new(false),
            worker_bench: RwSignal::new(None::<crate::ai::AiWorkerBenchmark>),
            tuning: RwSignal::new(None::<crate::ai::AiTuning>),
            tuning_result: RwSignal::new(None::<crate::ai::ProbeTuningResult>),
            benchmark_history: RwSignal::new(Vec::<crate::ai::AiBenchmarkSample>::new()),
            worker_threshold_input: RwSignal::new(String::new()),
            worker_threshold_current: RwSignal::new(None::<usize>),
            worker_max_floats: RwSignal::new(None::<usize>),
            ann_cap_override_input: RwSignal::new(String::new()),
            ann_cap_override_value: RwSignal::new(None::<u64>),
            ai_config_seeded: RwSignal::new(false),
            ai_config_version: RwSignal::new(None::<String>),
            ai_config_generated_at: RwSignal::new(None::<String>),
            ai_config_mismatch: RwSignal::new(None::<String>),
            embedding_sample_enabled: RwSignal::new(false),
            cross_origin_isolated: RwSignal::new(None::<bool>),
            telemetry_snapshot: RwSignal::new(None::<crate::ai::AiTelemetrySnapshot>),
            webgpu_disabled: RwSignal::new(false),
            ai_warnings: RwSignal::new(Vec::<crate::ai::AiWarningEvent>::new()),
            worker_bench_timestamp: RwSignal::new(None::<f64>),
            worker_failure: RwSignal::new(crate::ai::WorkerFailureStatus::default()),
            webgpu_probe: RwSignal::new(None::<bool>),
            sqlite_parity: RwSignal::new(None::<crate::data::SqliteParityReport>),
            integrity_report: RwSignal::new(None::<crate::data::IntegrityReport>),
            webgpu_runtime: RwSignal::new(None::<WebgpuRuntimeTelemetry>),
            apple_silicon_profile: RwSignal::new(None::<AppleSiliconProfile>),
            idb_runtime_metrics: RwSignal::new(None::<IdbRuntimeMetrics>),
        }
    }
}

#[cfg(feature = "hydrate")]
fn storage_item(storage: &web_sys::Storage, key: &str) -> Option<String> {
    storage.get_item(key).ok().flatten()
}

#[cfg(feature = "hydrate")]
fn storage_flag_enabled(value: &str) -> bool {
    value == "1" || value.eq_ignore_ascii_case("true")
}

#[cfg(feature = "hydrate")]
fn refresh_worker_threshold_signals(state: AiDiagnosticsState) {
    let current = crate::ai::worker_threshold_value();
    state.worker_threshold_current.set(current);
    state
        .worker_threshold_input
        .set(current.map(|value| value.to_string()).unwrap_or_default());
}

#[cfg(feature = "hydrate")]
fn refresh_ann_cap_override_signals(state: AiDiagnosticsState) {
    let current = crate::ai::ann_cap_override_mb();
    state.ann_cap_override_value.set(current);
    state
        .ann_cap_override_input
        .set(current.map(|value| value.to_string()).unwrap_or_default());
}

#[cfg(feature = "hydrate")]
fn refresh_runtime_metrics_signals(state: AiDiagnosticsState) {
    let _ = state
        .webgpu_runtime
        .try_set(load_webgpu_runtime_telemetry());
    let _ = state
        .apple_silicon_profile
        .try_set(load_apple_silicon_profile());
    let _ = state
        .idb_runtime_metrics
        .try_set(load_idb_runtime_metrics());
}

#[cfg(feature = "hydrate")]
fn refresh_ai_config_signals(state: AiDiagnosticsState) {
    let _ = state
        .ai_config_seeded
        .try_set(crate::ai::ai_config_seeded());
    let _ = state
        .ai_config_version
        .try_set(crate::ai::ai_config_version());
    let _ = state
        .ai_config_generated_at
        .try_set(crate::ai::ai_config_generated_at());
}

#[cfg(feature = "hydrate")]
fn apply_worker_threshold_override(state: AiDiagnosticsState, value: Option<usize>) {
    crate::ai::set_worker_threshold_override(value);
    refresh_worker_threshold_signals(state);
}

#[cfg(feature = "hydrate")]
fn apply_ann_cap_override(state: AiDiagnosticsState, value: Option<u64>) {
    crate::ai::set_ann_cap_override_mb(value);
    refresh_ann_cap_override_signals(state);
}

#[cfg(feature = "hydrate")]
fn parse_optional_signal_value<T>(input: RwSignal<String>) -> Option<T>
where
    T: std::str::FromStr,
{
    input.get_untracked().trim().parse::<T>().ok()
}

#[cfg(feature = "hydrate")]
fn store_benchmark_sample_and_refresh_history(
    benchmark_history: RwSignal<Vec<crate::ai::AiBenchmarkSample>>,
    full: Option<crate::ai::AiBenchmark>,
    subset: Option<crate::ai::AiSubsetBenchmark>,
    worker: Option<crate::ai::AiWorkerBenchmark>,
) {
    crate::ai::store_benchmark_sample(full, subset, worker);
    benchmark_history.set(crate::ai::benchmark_history());
}

#[cfg(feature = "hydrate")]
fn set_benchmark_cancelled_state(bench_running: RwSignal<bool>, bench_stage: RwSignal<String>) {
    bench_running.set(false);
    bench_stage.set("Cancelled".to_string());
}

#[cfg(feature = "hydrate")]
fn cancel_benchmark_if_requested(
    bench_cancelled: RwSignal<bool>,
    bench_running: RwSignal<bool>,
    bench_stage: RwSignal<String>,
) -> bool {
    if !bench_cancelled.get_untracked() {
        return false;
    }
    set_benchmark_cancelled_state(bench_running, bench_stage);
    true
}

#[cfg(feature = "hydrate")]
fn apply_runtime_snapshot_values(state: AiDiagnosticsState) {
    let _ = state.caps.try_set(crate::ai::detect_ai_capabilities());
    let _ = state
        .worker_max_floats
        .try_set(crate::ai::worker_max_floats_value());
    let _ = state.ann_caps.try_set(crate::ai::ann_cap_diagnostics());

    refresh_worker_threshold_signals(state);
    refresh_ann_cap_override_signals(state);

    let _ = state
        .worker_failure
        .try_set(crate::ai::worker_failure_status());
    refresh_ai_config_signals(state);
    let _ = state
        .embedding_sample_enabled
        .try_set(crate::ai::embedding_sample_enabled());
    let _ = state
        .ai_warnings
        .try_set(crate::ai::load_ai_warning_events());
    let _ = state
        .worker_bench_timestamp
        .try_set(crate::ai::webgpu_worker_bench_timestamp());
    refresh_runtime_metrics_signals(state);

    if let Some(window) = web_sys::window() {
        let isolated =
            js_sys::Reflect::get(window.as_ref(), &JsValue::from_str("crossOriginIsolated"))
                .ok()
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
        let _ = state.cross_origin_isolated.try_set(Some(isolated));

        if let Some(storage) = window.local_storage().ok().flatten() {
            if let Some(value) = storage_item(&storage, crate::ai::WORKER_THRESHOLD_KEY) {
                let _ = state.worker_threshold_input.try_set(value);
            }
            if let Some(value) = storage_item(&storage, crate::ai::WEBGPU_DISABLE_KEY) {
                let _ = state.webgpu_disabled.try_set(storage_flag_enabled(&value));
            }
        }
    }
}

#[cfg(feature = "hydrate")]
fn refresh_ai_config_meta_mismatch(state: AiDiagnosticsState) {
    let local_version = state.ai_config_version.clone();
    let local_generated_at = state.ai_config_generated_at.clone();
    let mismatch = state.ai_config_mismatch.clone();
    spawn_local(async move {
        if let Some(reconciled) = crate::ai::fetch_and_reconcile_ai_config_meta(
            local_version.try_get_untracked().flatten(),
            local_generated_at.try_get_untracked().flatten(),
        )
        .await
        {
            let _ = local_version.try_set(reconciled.local_version.clone());
            let _ = local_generated_at.try_set(reconciled.local_generated_at.clone());
            let _ = mismatch.try_set(crate::ai::ai_config_mismatch_status_message(
                &reconciled,
                "Remote AI config differs (",
                ").",
            ));
        }
    });
}

#[cfg(feature = "hydrate")]
fn spawn_ai_diagnostics_background_loads(state: AiDiagnosticsState) {
    spawn_local_try_set(state.ann_meta, crate::ai::load_ann_meta());
    spawn_local_try_set(state.embed_meta, crate::ai::load_embedding_manifest_meta());
    spawn_local_try_set(state.tuning, async {
        Some(crate::ai::load_ai_tuning().await)
    });
    spawn_local_try_set(state.benchmark_history, async {
        crate::ai::benchmark_history()
    });
    spawn_local_try_set(state.telemetry_snapshot, async {
        crate::ai::load_ai_telemetry_snapshot()
    });
    spawn_local_try_set(state.webgpu_probe, crate::ai::probe_webgpu_device());
}

#[cfg(feature = "hydrate")]
fn spawn_ai_diagnostics_parity_refresh(state: AiDiagnosticsState) {
    let sqlite_parity = state.sqlite_parity.clone();
    let integrity_report = state.integrity_report.clone();
    spawn_local(async move {
        let mut parity = crate::data::fetch_sqlite_parity_report().await;
        let mut integrity = crate::data::fetch_integrity_report().await;
        update_parity_diagnostics_signals(
            sqlite_parity,
            integrity_report,
            parity.clone(),
            integrity.clone(),
        );
        if parity_diagnostics_clean(&parity, &integrity) {
            return;
        }

        for _ in 0..6 {
            wait_ms(12_000).await;
            parity = crate::data::fetch_sqlite_parity_report().await;
            integrity = crate::data::fetch_integrity_report().await;
            update_parity_diagnostics_signals(
                sqlite_parity,
                integrity_report,
                parity.clone(),
                integrity.clone(),
            );
            if parity_diagnostics_clean(&parity, &integrity) {
                break;
            }
        }
    });
}

#[cfg(feature = "hydrate")]
fn update_parity_diagnostics_signals(
    sqlite_parity: RwSignal<Option<crate::data::SqliteParityReport>>,
    integrity_report: RwSignal<Option<crate::data::IntegrityReport>>,
    parity: Option<crate::data::SqliteParityReport>,
    integrity: Option<crate::data::IntegrityReport>,
) {
    let _ = sqlite_parity.try_set(parity);
    let _ = integrity_report.try_set(integrity);
}

#[cfg(feature = "hydrate")]
fn parity_diagnostics_clean(
    parity: &Option<crate::data::SqliteParityReport>,
    integrity: &Option<crate::data::IntegrityReport>,
) -> bool {
    let parity_has_mismatches = parity
        .as_ref()
        .map(|report| report.total_mismatches > 0)
        .unwrap_or(false);
    let integrity_has_mismatches = integrity
        .as_ref()
        .map(|report| report.total_mismatches > 0)
        .unwrap_or(false);
    !parity_has_mismatches && !integrity_has_mismatches
}

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

fn initialize_ai_diagnostics_state(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        request_animation_frame(move || {
            apply_runtime_snapshot_values(state.clone());
            refresh_ai_config_meta_mismatch(state.clone());
            spawn_ai_diagnostics_background_loads(state.clone());
            spawn_ai_diagnostics_parity_refresh(state.clone());
        });
    });
}

fn action_load_ann_caps(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        if state.ann_caps_loading.get_untracked() {
            return;
        }
        state.ann_caps_loading.set(true);
        state.ann_caps_error.set(None);

        let ann_caps = state.ann_caps.clone();
        let ann_caps_loading = state.ann_caps_loading.clone();
        let ann_caps_error = state.ann_caps_error.clone();
        spawn_local(async move {
            let loaded = crate::ai::load_embedding_index().await;
            if loaded.is_none() {
                ann_caps_error.set(Some("Embedding index load failed.".to_string()));
            }
            ann_caps.set(crate::ai::ann_cap_diagnostics());
            ann_caps_loading.set(false);
        });
    });
}

fn action_run_benchmark(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let bench = state.bench.clone();
        let bench_running = state.bench_running.clone();
        let bench_progress = state.bench_progress.clone();
        let bench_stage = state.bench_stage.clone();
        let bench_cancelled = state.bench_cancelled.clone();
        let benchmark_history = state.benchmark_history.clone();
        spawn_local(async move {
            bench_running.set(true);
            bench_progress.set(0.0);
            bench_stage.set("Preparing".to_string());
            bench_cancelled.set(false);

            let sample = crate::ai::prepare_benchmark_sample(4000).await;
            if cancel_benchmark_if_requested(bench_cancelled, bench_running, bench_stage) {
                return;
            }
            let Some(sample) = sample else {
                set_benchmark_cancelled_state(bench_running, bench_stage);
                return;
            };

            bench_progress.set(0.2);
            bench_stage.set("CPU".to_string());
            let cpu_ms = crate::ai::benchmark_cpu(&sample);
            if cpu_ms.is_none() {
                set_benchmark_cancelled_state(bench_running, bench_stage);
                return;
            }
            if cancel_benchmark_if_requested(bench_cancelled, bench_running, bench_stage) {
                return;
            }

            bench_progress.set(0.6);
            bench_stage.set("GPU".to_string());
            let (gpu_ms, backend) = crate::ai::benchmark_gpu(&sample).await;
            if cancel_benchmark_if_requested(bench_cancelled, bench_running, bench_stage) {
                return;
            }

            bench_progress.set(1.0);
            bench_stage.set("Complete".to_string());
            let result = crate::ai::AiBenchmark {
                sample_count: sample.sample_count,
                cpu_ms: cpu_ms.unwrap_or_default(),
                gpu_ms,
                backend,
            };
            bench.set(Some(result.clone()));
            store_benchmark_sample_and_refresh_history(benchmark_history, Some(result), None, None);
            bench_running.set(false);
        });
    });
}

fn action_cancel_benchmark(state: AiDiagnosticsState) {
    state.bench_cancelled.set(true);
    state.bench_stage.set("Cancelling".to_string());
}

fn action_run_worker_benchmark(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let worker_bench = state.worker_bench;
        let benchmark_history = state.benchmark_history;
        let worker_failure = state.worker_failure;
        let webgpu_runtime = state.webgpu_runtime;
        spawn_local(async move {
            let result = crate::ai::benchmark_worker_threshold().await;
            worker_bench.set(result.clone());
            store_benchmark_sample_and_refresh_history(benchmark_history, None, None, result);
            refresh_worker_threshold_signals(state);
            worker_failure.set(crate::ai::worker_failure_status());
            webgpu_runtime.set(load_webgpu_runtime_telemetry());
        });
    });
}

fn action_refresh_runtime_metrics(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        refresh_runtime_metrics_signals(state);
    });
}

fn action_reset_runtime_metrics(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        reset_webgpu_runtime_telemetry();
        state.webgpu_runtime.set(load_webgpu_runtime_telemetry());
    });
}

fn action_run_tuning(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let tuning = state.tuning.clone();
        let tuning_result = state.tuning_result.clone();
        spawn_local(async move {
            if let Some(index) = crate::ai::load_embedding_index().await {
                let result = crate::ai::tune_ivf_probe(&index, 20).await;
                tuning_result.set(result.clone());
                tuning.set(Some(crate::ai::load_ai_tuning().await));
            }
        });
    });
}

fn action_toggle_webgpu(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let next = !state.webgpu_disabled.get_untracked();
        state.webgpu_disabled.set(next);
        crate::ai::set_webgpu_disabled(next);
        state.caps.set(crate::ai::detect_ai_capabilities());
    });
}

fn action_apply_worker_threshold(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let parsed = parse_optional_signal_value(state.worker_threshold_input);
        apply_worker_threshold_override(state, parsed);
    });
}

fn action_clear_worker_threshold(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        apply_worker_threshold_override(state, None);
    });
}

fn action_apply_ann_cap_override(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let parsed = parse_optional_signal_value(state.ann_cap_override_input);
        apply_ann_cap_override(state, parsed);
    });
}

fn action_clear_ann_cap_override(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        apply_ann_cap_override(state, None);
    });
}

fn action_toggle_embedding_sample(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let next = !state.embedding_sample_enabled.get_untracked();
        state.embedding_sample_enabled.set(next);
        crate::ai::set_embedding_sample_enabled(next);
        state.ann_caps.set(crate::ai::ann_cap_diagnostics());
    });
}

fn action_clear_worker_cooldown(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        crate::ai::clear_worker_failure_status();
        state.worker_failure.set(crate::ai::worker_failure_status());
    });
}

fn action_refresh_ai_config(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        spawn_local(async move {
            if crate::ai::refresh_ai_config().await {
                refresh_ai_config_signals(state);
            }
        });
    });
}

#[cfg(feature = "hydrate")]
fn benchmark_diff_json(history: &[crate::ai::AiBenchmarkSample]) -> serde_json::Value {
    let mut full_samples: Vec<_> = history
        .iter()
        .filter_map(|sample| sample.full.clone())
        .collect();
    if full_samples.len() < 2 {
        return serde_json::json!(null);
    }

    match (full_samples.pop(), full_samples.pop()) {
        (Some(current), Some(previous)) => serde_json::json!({
            "cpuMsDelta": current.cpu_ms - previous.cpu_ms,
            "gpuMsDelta": current.gpu_ms.unwrap_or(0.0) - previous.gpu_ms.unwrap_or(0.0),
            "backend": current.backend
        }),
        _ => serde_json::json!(null),
    }
}

#[cfg(feature = "hydrate")]
fn download_json_snapshot(window: &web_sys::Window, json: &str) {
    let array = js_sys::Array::new();
    array.push(&wasm_bindgen::JsValue::from_str(json));
    let Ok(blob) = web_sys::Blob::new_with_str_sequence(&array) else {
        return;
    };
    let Ok(url) = web_sys::Url::create_object_url_with_blob(&blob) else {
        return;
    };
    let Some(document) = window.document() else {
        let _ = web_sys::Url::revoke_object_url(&url);
        return;
    };
    let Ok(element) = document.create_element("a") else {
        let _ = web_sys::Url::revoke_object_url(&url);
        return;
    };
    let Ok(anchor) = element.dyn_into::<web_sys::HtmlAnchorElement>() else {
        let _ = web_sys::Url::revoke_object_url(&url);
        return;
    };

    anchor.set_href(&url);
    anchor.set_download(&format!(
        "ai-diagnostics-{}.json",
        js_sys::Date::now() as i64
    ));
    anchor.click();
    let _ = web_sys::Url::revoke_object_url(&url);
}

fn action_export_diagnostics(state: AiDiagnosticsState) {
    #[cfg(not(feature = "hydrate"))]
    let _ = state;
    #[cfg(feature = "hydrate")]
    {
        let Some(window) = web_sys::window() else {
            return;
        };
        let storage = window.local_storage().ok().flatten();
        let storage_value = |key: &str| storage.as_ref().and_then(|store| storage_item(store, key));
        let history_snapshot = state.benchmark_history.get_untracked();
        let snapshot = serde_json::json!({
            "timestampMs": js_sys::Date::now(),
            "caps": state.caps.get_untracked(),
            "annMeta": state.ann_meta.get_untracked(),
            "annCap": state.ann_caps.get_untracked(),
            "embeddingManifest": state.embed_meta.get_untracked(),
            "benchmark": state.bench.get_untracked(),
            "workerBenchmark": state.worker_bench.get_untracked(),
            "tuning": state.tuning.get_untracked(),
            "tuningResult": state.tuning_result.get_untracked(),
            "benchmarkHistory": history_snapshot,
            "benchmarkDiff": benchmark_diff_json(&history_snapshot),
            "webgpuRuntimeTelemetry": state.webgpu_runtime.get_untracked(),
            "appleSiliconProfile": state.apple_silicon_profile.get_untracked(),
            "idbRuntimeMetrics": state.idb_runtime_metrics.get_untracked(),
            "crossOriginIsolated": state.cross_origin_isolated.get_untracked(),
            "workerThresholdOverride": storage_value(crate::ai::WORKER_THRESHOLD_KEY),
            "workerMaxFloats": crate::ai::worker_max_floats_value(),
            "aiTelemetry": storage_value(crate::ai::AI_TELEMETRY_KEY),
            "aiConfigVersion": storage_value(crate::ai::AI_CONFIG_VERSION_KEY),
            "aiConfigGeneratedAt": storage_value(crate::ai::AI_CONFIG_GENERATED_AT_KEY),
            "aiConfigSeeded": storage_value(crate::ai::AI_CONFIG_SEEDED_KEY),
            "embeddingSampleEnabled": storage_value(crate::ai::EMBEDDING_SAMPLE_KEY),
            "aiWarnings": storage_value(crate::ai::AI_WARNING_EVENTS_KEY),
        });

        if let Ok(json) = serde_json::to_string_pretty(&snapshot) {
            download_json_snapshot(&window, &json);
        }
    }
}

fn render_ai_parity_card(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <div class="card">
            <h2>"Parity"</h2>
            <ul class="list">
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
            <p class="muted">"Detailed mismatches are shown in the PWA Status panel."</p>
        </div>
    }
}

fn render_ai_capabilities_list(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{move || format!("WebGPU available: {}", if state.caps.get().webgpu_available { "yes" } else { "no" })}</li>
            <li>{move || format!(
                "WebGPU device probe: {}",
                state.webgpu_probe.get().map_or("n/a", |ok| if ok { "ready" } else { "failed" })
            )}</li>
            <li>{move || format!("WebGPU enabled: {}", if state.caps.get().webgpu_enabled { "yes" } else { "no" })}</li>
            <li>{move || format!("GPU Worker: {}", if state.caps.get().webgpu_worker { "on" } else { "off" })}</li>
            <li>{move || format!("WebNN: {}", if state.caps.get().webnn { "on" } else { "off" })}</li>
            <li>{move || format!("SIMD: {}", if state.caps.get().wasm_simd { "on" } else { "off" })}</li>
            <li>{move || format!("Threads: {}", if state.caps.get().threads { "on" } else { "off" })}</li>
            <li>{move || format!(
                "Scoring backend: {}",
                if state.caps.get().webgpu_enabled { "WebGPU" } else { "WASM SIMD" }
            )}</li>
            <li>{move || format!(
                "Cross-Origin Isolated: {}",
                state.cross_origin_isolated.get().map_or("n/a", |value| if value { "on" } else { "off" })
            )}</li>
            <li>{move || format!("AI config seeded: {}", if state.ai_config_seeded.get() { "yes" } else { "no" })}</li>
            <li>{move || format!(
                "AI config version: {}",
                state.ai_config_version.get().unwrap_or_else(|| "n/a".to_string())
            )}</li>
            <li>{move || format!(
                "AI config generated: {}",
                state.ai_config_generated_at.get().unwrap_or_else(|| "n/a".to_string())
            )}</li>
            <li>{move || format!(
                "Worker bench: {}",
                state.worker_bench_timestamp.get().map_or_else(
                    || "n/a".to_string(),
                    |timestamp| format!("{:.1}m ago", ((js_sys::Date::now() - timestamp) / 60000.0).max(0.0))
                )
            )}</li>
            <li>{move || format!(
                "Worker max floats: {}",
                state.worker_max_floats.get().map_or_else(|| "n/a".to_string(), |value| value.to_string())
            )}</li>
            <li>{move || format!(
                "Worker cooldown: {}",
                state.worker_failure.get().cooldown_remaining_ms.map_or_else(
                    || "none".to_string(),
                    |ms| format!("{:.0}s", (ms / 1000.0).max(0.0))
                )
            )}</li>
            <li>{move || format!(
                "Worker last error: {}",
                state.worker_failure.get().last_error.clone().unwrap_or_else(|| "none".to_string())
            )}</li>
        </ul>
    }
}

fn render_ai_capabilities_card(state: AiDiagnosticsState) -> impl IntoView {
    let refresh_config_state = state.clone();
    let toggle_webgpu_state = state.clone();
    let worker_failure_state = state.clone();
    let threads_state = state.clone();
    let webnn_state = state.clone();
    let webgpu_disabled_state = state.clone();

    view! {
        <div class="card">
            <h2>"Capabilities"</h2>
            {render_ai_capabilities_list(state.clone())}
            <button type="button" class="pill pill--ghost" on:click=move |_| action_toggle_webgpu(toggle_webgpu_state.clone())>
                {move || if webgpu_disabled_state.webgpu_disabled.get() { "Enable WebGPU" } else { "Disable WebGPU" }}
            </button>
            {move || {
                if worker_failure_state.worker_failure.get().cooldown_remaining_ms.is_some() {
                    let clear_state = worker_failure_state.clone();
                    view! {
                        <button type="button" class="pill pill--ghost" on:click=move |_| action_clear_worker_cooldown(clear_state.clone())>
                            "Clear worker cooldown"
                        </button>
                    }
                    .into_any()
                } else {
                    ().into_any()
                }
            }}
            <button type="button" class="pill pill--ghost" on:click=move |_| action_refresh_ai_config(refresh_config_state.clone())>
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

fn render_embedding_sample_card(state: AiDiagnosticsState) -> impl IntoView {
    let toggle_state = state.clone();
    let enabled_state = state.clone();
    let status_state = state.clone();
    view! {
        <div class="card">
            <h2>"Embedding Sample"</h2>
            <p class="muted">"Use a small sample dataset for faster local tuning."</p>
            <div class="pill-row">
                <button type="button" class="pill pill--ghost" on:click=move |_| action_toggle_embedding_sample(toggle_state.clone())>
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
    let refresh_state = state.clone();
    let reset_state = state.clone();
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
                <button type="button" class="pill pill--ghost" on:click=move |_| action_refresh_runtime_metrics(refresh_state.clone())>
                    "Refresh Runtime Metrics"
                </button>
                <button type="button" class="pill pill--ghost" on:click=move |_| action_reset_runtime_metrics(reset_state.clone())>
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
    let refresh_state = state.clone();
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
            <button type="button" class="pill pill--ghost" on:click=move |_| action_refresh_runtime_metrics(refresh_state.clone())>
                "Refresh Runtime Metrics"
            </button>
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
    let load_state = state.clone();
    let apply_state = state.clone();
    let clear_state = state.clone();
    view! {
        <div class="card">
            <h2>"ANN Cap"</h2>
            <div class="pill-row">
                <button type="button" class="pill" prop:disabled=move || state.ann_caps_loading.get() on:click=move |_| action_load_ann_caps(load_state.clone())>
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
                    <button type="button" class="pill pill--ghost" on:click=move |_| action_apply_ann_cap_override(apply_state.clone())>"Apply Override"</button>
                    <button type="button" class="pill pill--ghost" on:click=move |_| action_clear_ann_cap_override(clear_state.clone())>"Reset Auto"</button>
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

fn render_benchmark_card(state: AiDiagnosticsState) -> impl IntoView {
    let run_state = state.clone();
    let cancel_state = state.clone();
    view! {
        <div class="card">
            <h2>"Benchmark"</h2>
            <div class="stack">
                <button type="button" class="pill" on:click=move |_| action_run_benchmark(run_state.clone())>"Run Benchmark"</button>
                {move || {
                    if state.bench_running.get() {
                        let cancel_click_state = cancel_state.clone();
                        view! {
                            <button type="button" class="pill pill--ghost" on:click=move |_| action_cancel_benchmark(cancel_click_state.clone())>
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
    let export_state = state.clone();
    view! {
        <div class="card">
            <h2>"Export"</h2>
            <p class="muted">"Download a JSON snapshot of AI diagnostics."</p>
            <button type="button" class="pill" on:click=move |_| action_export_diagnostics(export_state.clone())>"Export Snapshot"</button>
        </div>
    }
}

fn render_worker_threshold_card(state: AiDiagnosticsState) -> impl IntoView {
    let run_state = state.clone();
    let apply_state = state.clone();
    let clear_state = state.clone();
    view! {
        <div class="card">
            <h2>"Worker Threshold"</h2>
            <div class="stack">
                <button type="button" class="pill" on:click=move |_| action_run_worker_benchmark(run_state.clone())>"Run Worker Benchmark"</button>
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
                    <button type="button" class="pill pill--ghost" on:click=move |_| action_apply_worker_threshold(apply_state.clone())>"Apply Override"</button>
                    <button type="button" class="pill pill--ghost" on:click=move |_| action_clear_worker_threshold(clear_state.clone())>"Reset Auto"</button>
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
    let run_state = state.clone();
    view! {
        <div class="card">
            <h2>"IVF Tuning"</h2>
            <button type="button" class="pill" on:click=move |_| action_run_tuning(run_state.clone())>"Auto-Tune Probe"</button>
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

fn render_ai_diagnostics_cards(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <div class="card-grid">
            {render_ai_parity_card(state.clone())}
            {render_ai_capabilities_card(state.clone())}
            {render_embedding_sample_card(state.clone())}
            {render_ai_warnings_card(state.clone())}
            {render_webgpu_runtime_card(state.clone())}
            {render_apple_silicon_card(state.clone())}
            {render_idb_runtime_card(state.clone())}
            {render_ann_index_card(state.clone())}
            {render_ann_cap_card(state.clone())}
            {render_telemetry_snapshot_card(state.clone())}
            {render_embedding_manifest_card(state.clone())}
            {render_benchmark_card(state.clone())}
            {render_benchmark_history_card(state.clone())}
            {render_export_card(state.clone())}
            {render_worker_threshold_card(state.clone())}
            {render_ivf_tuning_card(state)}
        </div>
    }
}

#[must_use]
pub fn ai_diagnostics_page() -> impl IntoView {
    let state = AiDiagnosticsState::new();
    initialize_ai_diagnostics_state(state.clone());

    view! {
        <section class="page">
            <h1>"AI Diagnostics"</h1>
            <p class="lead">"On-device AI status, index metadata, and performance checks."</p>
            <Show when=move || state.embedding_sample_enabled.get() fallback=|| () >
                <p class="muted">"Sample mode enabled: using reduced embeddings."</p>
            </Show>
            {move || state.ai_config_mismatch.get().map(|message| view! {
                <p class="muted">{message}</p>
            })}
            {render_ai_diagnostics_cards(state)}
        </section>
    }
}

#[must_use]
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

#[must_use]
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
                        <li>{format!("Cap: {}", format_mb_u64(cap.cap_bytes))}</li>
                    </ul>
                })}
            </div>
        </section>
    }
}

#[must_use]
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

macro_rules! load_with_idb_fallback {
    ($idb_future:expr, $api_future:expr) => {{
        #[cfg(feature = "hydrate")]
        {
            let cached = spawn_local_to_send($idb_future).await;
            if cached.is_some() {
                cached
            } else {
                $api_future.await
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            $api_future.await
        }
    }};
}

macro_rules! load_entity_by_id {
    ($id:expr, $idb_loader:path, $api_loader:path) => {{
        let id = $id;
        load_with_idb_fallback!(
            async move { $idb_loader(id).await.ok().flatten() },
            async move { $api_loader(id).await.ok().flatten() }
        )
    }};
}

macro_rules! load_entity_by_slug {
    ($slug:expr, $idb_loader:path, $api_loader:path) => {{
        let slug = $slug;
        if slug.is_empty() {
            None
        } else {
            load_with_idb_fallback!(
                {
                    let idb_slug = slug.clone();
                    async move { $idb_loader(&idb_slug).await.ok().flatten() }
                },
                async move { $api_loader(slug).await.ok().flatten() }
            )
        }
    }};
}

async fn load_show(id: i32) -> Option<Show> {
    load_entity_by_id!(id, dmb_idb::get_show, get_show)
}

async fn load_song(slug: String) -> Option<Song> {
    load_entity_by_slug!(slug, dmb_idb::get_song, get_song)
}

async fn load_guest(slug: String) -> Option<Guest> {
    load_entity_by_slug!(slug, dmb_idb::get_guest_by_slug, get_guest)
}

async fn load_release(slug: String) -> Option<Release> {
    load_entity_by_slug!(slug, dmb_idb::get_release_by_slug, get_release)
}

async fn load_release_tracks_by_slug(slug: String) -> Option<Vec<ReleaseTrack>> {
    let release = load_release(slug).await;
    Some(match release {
        Some(release) => load_release_tracks(release.id).await,
        None => Vec::new(),
    })
}

async fn load_tour(year: i32) -> Option<Tour> {
    load_entity_by_id!(year, dmb_idb::get_tour, get_tour)
}

async fn load_tour_by_id(id: i32) -> Option<Tour> {
    load_entity_by_id!(id, dmb_idb::get_tour_by_id, get_tour_by_id)
}

async fn load_venue(id: i32) -> Option<Venue> {
    load_entity_by_id!(id, dmb_idb::get_venue, get_venue)
}

async fn load_curated_list(id: i32) -> Option<CuratedList> {
    let lists = load_curated_lists().await;
    lists.into_iter().find(|list| list.id == id)
}

async fn load_curated_list_items_page(id: i32) -> Vec<CuratedListItem> {
    load_curated_list_items(id, 200).await
}

fn normalize_with_limit<T>(
    mut items: Vec<T>,
    limit: usize,
    mut compare: impl FnMut(&T, &T) -> Ordering,
) -> Vec<T> {
    items.sort_by(|a, b| compare(a, b));
    items.truncate(limit);
    items
}

fn normalize_show_summaries(items: Vec<ShowSummary>, limit: usize) -> Vec<ShowSummary> {
    normalize_with_limit(items, limit, |a, b| {
        b.date.cmp(&a.date).then_with(|| b.id.cmp(&a.id))
    })
}

fn normalize_songs(items: Vec<Song>, limit: usize) -> Vec<Song> {
    normalize_with_limit(items, limit, |a, b| {
        b.total_performances
            .unwrap_or(0)
            .cmp(&a.total_performances.unwrap_or(0))
            .then_with(|| a.title.cmp(&b.title))
            .then_with(|| a.id.cmp(&b.id))
    })
}

fn normalize_venues(items: Vec<Venue>, limit: usize) -> Vec<Venue> {
    normalize_with_limit(items, limit, |a, b| {
        b.total_shows
            .unwrap_or(0)
            .cmp(&a.total_shows.unwrap_or(0))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    })
}

fn normalize_guests(items: Vec<Guest>, limit: usize) -> Vec<Guest> {
    normalize_with_limit(items, limit, |a, b| {
        b.total_appearances
            .unwrap_or(0)
            .cmp(&a.total_appearances.unwrap_or(0))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    })
}

fn normalize_tours(items: Vec<Tour>, limit: usize) -> Vec<Tour> {
    normalize_with_limit(items, limit, |a, b| {
        b.year
            .cmp(&a.year)
            .then_with(|| b.total_shows.unwrap_or(0).cmp(&a.total_shows.unwrap_or(0)))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    })
}

fn normalize_releases(items: Vec<Release>, limit: usize) -> Vec<Release> {
    normalize_with_limit(items, limit, |a, b| {
        b.release_date
            .as_deref()
            .unwrap_or("")
            .cmp(a.release_date.as_deref().unwrap_or(""))
            .then_with(|| a.title.cmp(&b.title))
            .then_with(|| a.id.cmp(&b.id))
    })
}

async fn load_recent_shows_from_server(limit: usize) -> Vec<ShowSummary> {
    normalize_show_summaries(get_recent_shows(limit).await.unwrap_or_default(), limit)
}

#[cfg(feature = "hydrate")]
fn collect_present_pairs<K, V>(pairs: Vec<(K, Option<V>)>) -> HashMap<K, V>
where
    K: Eq + std::hash::Hash,
{
    let mut out = HashMap::with_capacity(pairs.len());
    for (key, value) in pairs {
        if let Some(value) = value {
            out.insert(key, value);
        }
    }
    out
}

#[cfg(feature = "hydrate")]
fn collect_show_related_ids(shows: &[Show]) -> (HashSet<i32>, HashSet<i32>) {
    let mut venue_ids: HashSet<i32> = HashSet::new();
    let mut tour_ids: HashSet<i32> = HashSet::new();
    for show in shows {
        venue_ids.insert(show.venue_id);
        if let Some(tour_id) = show.tour_id {
            tour_ids.insert(tour_id);
        }
    }
    (venue_ids, tour_ids)
}

#[cfg(feature = "hydrate")]
async fn load_idb_entities_by_id<T, Loader, LoaderFuture>(
    ids: HashSet<i32>,
    loader: Loader,
) -> HashMap<i32, T>
where
    T: Send + 'static,
    Loader: Fn(i32) -> LoaderFuture + Copy,
    LoaderFuture: std::future::Future<Output = Option<T>> + 'static,
{
    let futs = ids.into_iter().map(|id| async move {
        let entity = spawn_local_to_send(loader(id)).await;
        (id, entity)
    });
    collect_present_pairs(join_all(futs).await)
}

#[cfg(feature = "hydrate")]
fn hydrate_show_summary(
    show: Show,
    venues: &HashMap<i32, Venue>,
    tours: &HashMap<i32, Tour>,
) -> ShowSummary {
    let (venue_name, venue_city, venue_state) = match venues.get(&show.venue_id) {
        Some(venue) => (venue.name.clone(), venue.city.clone(), venue.state.clone()),
        None => (format!("Venue #{}", show.venue_id), String::new(), None),
    };
    let (tour_name, tour_year) = match show.tour_id.and_then(|id| tours.get(&id)) {
        Some(tour) => (Some(tour.name.clone()), Some(tour.year)),
        None => (None, None),
    };
    ShowSummary {
        id: show.id,
        date: show.date,
        year: show.year,
        venue_id: show.venue_id,
        venue_name,
        venue_city,
        venue_state,
        tour_name,
        tour_year,
    }
}

async fn load_recent_shows(limit: usize) -> Vec<ShowSummary> {
    #[cfg(feature = "hydrate")]
    {
        let shows =
            spawn_local_to_send(async move { dmb_idb::list_recent_shows(limit).await.ok() }).await;
        let Some(shows) = shows else {
            return load_recent_shows_from_server(limit).await;
        };

        if shows.is_empty() {
            return load_recent_shows_from_server(limit).await;
        }

        let (venue_ids, tour_ids) = collect_show_related_ids(&shows);
        let venues: HashMap<i32, Venue> = load_idb_entities_by_id(venue_ids, |id| async move {
            dmb_idb::get_venue(id).await.ok().flatten()
        })
        .await;
        let tours: HashMap<i32, Tour> = load_idb_entities_by_id(tour_ids, |id| async move {
            dmb_idb::get_tour_by_id(id).await.ok().flatten()
        })
        .await;

        normalize_show_summaries(
            shows
                .into_iter()
                .map(|show| hydrate_show_summary(show, &venues, &tours))
                .collect(),
            limit,
        )
    }

    #[cfg(not(feature = "hydrate"))]
    {
        load_recent_shows_from_server(limit).await
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

macro_rules! load_with_limit_fallback {
    ($limit:expr, $idb_loader:expr, $server_loader:expr, $normalize:expr) => {{
        #[cfg(feature = "hydrate")]
        {
            load_hydrate_with_server_fallback_and_limit(
                $limit,
                $idb_loader,
                $server_loader,
                $normalize,
            )
            .await
        }
        #[cfg(not(feature = "hydrate"))]
        {
            load_server_with_limit($limit, $server_loader(), $normalize).await
        }
    }};
}

macro_rules! load_with_limit_sources {
    ($limit:expr, $idb_loader:path, $server_loader:path, $normalize:expr) => {{
        let limit = $limit;
        load_with_limit_fallback!(
            limit,
            move || async move { $idb_loader(limit).await.ok() },
            move || async move { $server_loader(limit).await.unwrap_or_default() },
            $normalize
        )
    }};
}

macro_rules! load_with_hydrate_or_ssr_fallback {
    ($idb_loader:expr, $server_loader:expr) => {{
        #[cfg(feature = "hydrate")]
        {
            load_hydrate_with_server_fallback($idb_loader, $server_loader).await
        }
        #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
        {
            $server_loader().await
        }
        #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
        {
            Vec::new()
        }
    }};
}

macro_rules! load_with_hydrate_or_ssr_list {
    ($idb_call:expr, $server_call:expr) => {{
        load_with_hydrate_or_ssr_fallback!(
            move || async move { $idb_call.await.ok() },
            move || async move { $server_call.await.unwrap_or_default() }
        )
    }};
}

fn unit_resource<T, Loader, LoaderFuture>(loader: Loader) -> Resource<T>
where
    T: serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static,
    Loader: Fn() -> LoaderFuture + Copy + Send + Sync + 'static,
    LoaderFuture: std::future::Future<Output = T> + Send + 'static,
{
    Resource::new(|| (), move |()| loader())
}

async fn load_top_songs(limit: usize) -> Vec<Song> {
    load_with_limit_sources!(
        limit,
        dmb_idb::stats_top_songs,
        get_top_songs,
        normalize_songs
    )
}

async fn load_top_venues(limit: usize) -> Vec<Venue> {
    load_with_limit_sources!(
        limit,
        dmb_idb::list_top_venues,
        get_top_venues,
        normalize_venues
    )
}

async fn load_top_guests(limit: usize) -> Vec<Guest> {
    load_with_limit_sources!(
        limit,
        dmb_idb::list_top_guests,
        get_top_guests,
        normalize_guests
    )
}

async fn load_recent_tours(limit: usize) -> Vec<Tour> {
    load_with_limit_sources!(
        limit,
        dmb_idb::list_recent_tours,
        get_recent_tours,
        normalize_tours
    )
}

async fn load_recent_releases(limit: usize) -> Vec<Release> {
    load_with_limit_sources!(
        limit,
        dmb_idb::list_recent_releases,
        get_recent_releases,
        normalize_releases
    )
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_all_releases() -> Vec<Release> {
    let releases = load_with_hydrate_or_ssr_fallback!(
        move || async move { dmb_idb::list_all_releases().await.ok() },
        move || async move { get_all_releases().await.unwrap_or_default() }
    );
    #[cfg(feature = "hydrate")]
    {
        if !releases.is_empty() {
            return releases;
        }
        get_recent_releases(200).await.unwrap_or_default()
    }
    #[cfg(not(feature = "hydrate"))]
    {
        releases
    }
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_release_tracks(_release_id: i32) -> Vec<ReleaseTrack> {
    load_with_hydrate_or_ssr_list!(
        dmb_idb::list_release_tracks(_release_id),
        get_release_tracks(_release_id)
    )
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_setlist_entries(_show_id: i32) -> Vec<SetlistEntry> {
    load_with_hydrate_or_ssr_list!(
        dmb_idb::list_setlist_entries(_show_id),
        get_setlist_entries(_show_id)
    )
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_liberation_list(_limit: usize) -> Vec<LiberationEntry> {
    load_with_hydrate_or_ssr_list!(
        dmb_idb::list_liberation_entries(_limit),
        get_liberation_list(_limit as i32)
    )
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_curated_lists() -> Vec<CuratedList> {
    load_with_hydrate_or_ssr_list!(dmb_idb::list_curated_lists(), get_curated_lists())
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_curated_list_items(_list_id: i32, _limit: usize) -> Vec<CuratedListItem> {
    load_with_hydrate_or_ssr_list!(
        dmb_idb::list_curated_list_items(_list_id, _limit),
        get_curated_list_items(_list_id, _limit as i32)
    )
}

#[cfg(feature = "hydrate")]
async fn load_user_attended_shows() -> Vec<UserAttendedShow> {
    dmb_idb::list_user_attended_shows()
        .await
        .unwrap_or_default()
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

fn format_location(city: &str, state: Option<&str>) -> String {
    match state {
        Some(state) if !state.is_empty() => format!("{city}, {state}"),
        _ => city.to_string(),
    }
}

fn optional_text_matches_query(value: Option<&str>, query: &str) -> bool {
    value.is_some_and(|text| text.to_ascii_lowercase().contains(query))
}

fn text_matches_query(value: &str, query: &str) -> bool {
    value.to_ascii_lowercase().contains(query)
}

fn normalized_nonempty_lower(raw: Option<&str>, fallback: &str) -> String {
    let normalized = raw.unwrap_or_default().trim().to_ascii_lowercase();
    if normalized.is_empty() {
        fallback.to_string()
    } else {
        normalized
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

fn titleize_words_with_fallback(raw: &str, fallback: &str) -> String {
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
        fallback.to_string()
    } else {
        words.join(" ")
    }
}

fn format_mb_u64(bytes: u64) -> String {
    let tenths = (u128::from(bytes) * 10) / 1_000_000;
    format!("{}.{} MB", tenths / 10, tenths % 10)
}

fn normalized_set_key(raw: Option<&str>) -> String {
    normalized_nonempty_lower(raw, "unspecified")
}

fn setlist_set_label(key: &str) -> String {
    if key == "unspecified" {
        "Unspecified".to_string()
    } else {
        titleize_words_with_fallback(key, "Unknown")
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
        .is_some_and(|song| text_matches_query(&song.title, query));
    let in_slot = optional_text_matches_query(entry.slot.as_deref(), query);
    let in_set = optional_text_matches_query(entry.set_name.as_deref(), query);
    let in_notes = optional_text_matches_query(entry.notes.as_deref(), query);
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
    let in_notes = optional_text_matches_query(track.notes.as_deref(), query);
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

fn render_result_list<T, Summary, RenderItem>(
    items: Vec<T>,
    empty_title: &'static str,
    empty_description: &'static str,
    empty_href: &'static str,
    empty_link: &'static str,
    summary_text: Summary,
    render_item: RenderItem,
) -> AnyView
where
    Summary: Fn(usize) -> String,
    RenderItem: Fn(usize, T) -> AnyView,
{
    if items.is_empty() {
        empty_state_with_link(empty_title, empty_description, empty_href, empty_link).into_any()
    } else {
        let total = items.len();
        view! {
            <>
                <p class="list-summary">{summary_text(total)}</p>
                <ul class="result-list">
                    {items
                        .into_iter()
                        .enumerate()
                        .map(|(idx, item)| render_item(idx, item))
                        .collect::<Vec<_>>()}
                </ul>
            </>
        }
        .into_any()
    }
}

fn render_result_page<T, Loader, LoaderFuture, Render>(
    title: &'static str,
    lead: &'static str,
    loading_title: &'static str,
    loading_description: &'static str,
    loader: Loader,
    render_items: Render,
) -> impl IntoView
where
    T: Clone + serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static,
    Loader: Fn() -> LoaderFuture + Copy + Send + Sync + 'static,
    LoaderFuture: std::future::Future<Output = Vec<T>> + Send + 'static,
    Render: Fn(Vec<T>) -> AnyView + Copy + Send + Sync + 'static,
{
    let items = unit_resource(loader);
    view! {
        <section class="page">
            <h1>{title}</h1>
            <p class="lead">{lead}</p>
            <Suspense fallback=move || loading_state(loading_title, loading_description)>
                {move || render_items(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

#[must_use]
pub fn shows_page() -> impl IntoView {
    let render = |items: Vec<ShowSummary>| {
        render_result_list(
            items,
            "No shows available",
            "Recent show data is unavailable right now.",
            "/search",
            "Search the catalog",
            |total| format!("Showing {total} recent shows"),
            |_, show| {
                let href = format!("/shows/{}", show.id);
                let location = format_location(&show.venue_city, show.venue_state.as_deref());
                let meta = if location.is_empty() {
                    show.venue_name.clone()
                } else {
                    format!("{} • {}", show.venue_name, location)
                };
                let tour_label = show.tour_name.clone().unwrap_or_else(|| "No tour".into());
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
                .into_any()
            },
        )
    };

    render_result_page(
        "Shows",
        "Latest performances with offline hydration.",
        "Loading shows",
        "Fetching recent performances.",
        || load_recent_shows(30),
        render,
    )
}

#[must_use]
pub fn songs_page() -> impl IntoView {
    let render = |items: Vec<Song>| {
        render_result_list(
            items,
            "No songs available",
            "Top song stats are unavailable right now.",
            "/search",
            "Search songs",
            |total| format!("Showing {total} ranked songs"),
            |idx, song| {
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
                            <span class="result-meta">{format!("Last played: {last}")}</span>
                        </div>
                        <span class="result-score">{format!("{plays} plays")}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Songs",
        "Top songs by total performances.",
        "Loading songs",
        "Calculating song performance rankings.",
        || load_top_songs(50),
        render,
    )
}

#[must_use]
pub fn venues_page() -> impl IntoView {
    let render = |items: Vec<Venue>| {
        render_result_list(
            items,
            "No venues available",
            "Venue leaderboard data is unavailable right now.",
            "/shows",
            "Browse recent shows",
            |total| format!("Showing {total} venues"),
            |_, venue| {
                let href = format!("/venues/{}", venue.id);
                let pill = venue.state.clone().unwrap_or_else(|| venue.country.clone());
                let location = format_location(&venue.city, venue.state.as_deref());
                let total = venue.total_shows.unwrap_or(0);
                view! {
                    <li class="result-card">
                        <span class="pill">{pill}</span>
                        <div class="result-body">
                            <a class="result-label" href=href>{venue.name}</a>
                            <span class="result-meta">{location}</span>
                        </div>
                        <span class="result-score">{format!("{total} shows")}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Venues",
        "Most visited venues by show count.",
        "Loading venues",
        "Fetching venue totals and rankings.",
        || load_top_venues(50),
        render,
    )
}

#[must_use]
pub fn guests_page() -> impl IntoView {
    let render = |items: Vec<Guest>| {
        render_result_list(
            items,
            "No guests available",
            "Guest appearance stats are unavailable right now.",
            "/shows",
            "Browse recent shows",
            |total| format!("Showing {total} frequent guests"),
            |_, guest| {
                let href = format!("/guests/{}", guest.slug);
                let total = guest.total_appearances.unwrap_or(0);
                view! {
                    <li class="result-card">
                        <span class="pill">"Guest"</span>
                        <div class="result-body">
                            <a class="result-label" href=href>{guest.name}</a>
                        </div>
                        <span class="result-score">{format!("{total} appearances")}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Guests",
        "Most frequent guest appearances.",
        "Loading guests",
        "Collecting guest appearance counts.",
        || load_top_guests(50),
        render,
    )
}

#[must_use]
pub fn tours_page() -> impl IntoView {
    let render = |items: Vec<Tour>| {
        render_result_list(
            items,
            "No tours available",
            "Tour data is unavailable right now.",
            "/shows",
            "Browse recent shows",
            |total| format!("Showing {total} recent tours"),
            |_, tour| {
                let href = format!("/tours/{}", tour.year);
                let total = tour.total_shows.unwrap_or(0);
                view! {
                    <li class="result-card">
                        <span class="pill">{tour.year}</span>
                        <div class="result-body">
                            <a class="result-label" href=href>{tour.name}</a>
                        </div>
                        <span class="result-score">{format!("{total} shows")}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Tours",
        "Most recent tours, newest first.",
        "Loading tours",
        "Fetching latest tour activity.",
        || load_recent_tours(25),
        render,
    )
}

#[must_use]
pub fn releases_page() -> impl IntoView {
    let render = |items: Vec<Release>| {
        render_result_list(
            items,
            "No releases available",
            "Release data is unavailable right now.",
            "/search",
            "Search releases",
            |total| format!("Showing {total} recent releases"),
            |_, release| {
                let href = format!("/releases/{}", release.slug);
                let pill = release
                    .release_type
                    .clone()
                    .unwrap_or_else(|| "Release".into());
                let date = release.release_date.clone().unwrap_or_else(|| "TBD".into());
                view! {
                    <li class="result-card">
                        <span class="pill">{pill}</span>
                        <div class="result-body">
                            <a class="result-label" href=href>{release.title}</a>
                        </div>
                        <span class="result-score">{date}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Releases",
        "Latest official releases and recordings.",
        "Loading releases",
        "Fetching latest release metadata.",
        || load_recent_releases(25),
        render,
    )
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

fn parse_route_slug_param(raw: &str) -> Result<String, String> {
    let slug = raw.trim();
    if slug.is_empty() {
        return Err("Missing `slug` parameter.".to_string());
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

fn parse_show_id_param(raw: &str) -> Result<i32, String> {
    parse_positive_i32_param(raw, "showId")
}

fn parse_list_id_param(raw: &str) -> Result<i32, String> {
    parse_positive_i32_param(raw, "listId")
}

fn render_param_subhead<T>(label: &str, parsed: Result<T, String>) -> AnyView
where
    T: std::fmt::Display,
{
    match parsed {
        Ok(value) => view! { <p class="page-subhead">{format!("{label}: {value}")}</p> }.into_any(),
        Err(message) => view! { <p class="muted">{message}</p> }.into_any(),
    }
}

fn render_route_param_subhead<T>(
    label: &str,
    raw: &str,
    parse: impl FnOnce(&str) -> Result<T, String>,
) -> AnyView
where
    T: std::fmt::Display,
{
    render_param_subhead(label, parse(raw))
}

fn route_param_or_default(param_name: &'static str) -> impl Fn() -> String + Copy {
    let params = use_params_map();
    move || params.with(|p| p.get(param_name).unwrap_or_default())
}

fn reset_filter_and_query_on_route_change(
    route_param: impl Fn() -> String + Copy + 'static,
    active_filter: RwSignal<String>,
    query: RwSignal<String>,
) {
    Effect::new(move |_| {
        let _ = route_param();
        active_filter.set("all".to_string());
        query.set(String::new());
    });
}

macro_rules! optional_resource_from_param {
    ($source:expr, $parse:expr, $loader:expr) => {
        Resource::new($source, |raw: String| async move {
            let parsed = $parse(&raw).ok()?;
            $loader(parsed).await
        })
    };
}

macro_rules! resource_from_param_or_default {
    ($source:expr, $parse:expr, $default:expr, $loader:expr) => {
        Resource::new($source, |raw: String| async move {
            let Ok(parsed) = $parse(&raw) else {
                return $default;
            };
            $loader(parsed).await
        })
    };
}

macro_rules! detail_page_with_primary_resource {
    (
        back_href: $back_href:expr,
        back_label: $back_label:expr,
        title: $title:literal,
        subhead: $subhead:expr,
        loading_title: $loading_title:expr,
        loading_message: $loading_message:expr,
        content: $content:expr $(,)?
    ) => {
        view! {
            <section class="page">
                {detail_nav($back_href, $back_label)}
                <h1>{$title}</h1>
                {$subhead}
                <Suspense fallback=move || loading_state($loading_title, $loading_message)>
                    {$content}
                </Suspense>
            </section>
        }
    };
}

fn render_import_or_missing_with_link(
    seed_data_state: RwSignal<crate::data::SeedDataState>,
    importing_title: &'static str,
    missing_title: &'static str,
    missing_message: &'static str,
    missing_href: &'static str,
    missing_link_label: &'static str,
) -> AnyView {
    if seed_data_state.get() == crate::data::SeedDataState::Importing {
        import_in_progress_state(importing_title, "/offline", "Open offline help").into_any()
    } else {
        empty_state_with_link(
            missing_title,
            missing_message,
            missing_href,
            missing_link_label,
        )
        .into_any()
    }
}

fn hydrate_saved_show_ids(saved_show_ids: RwSignal<std::collections::HashSet<i32>>) {
    #[cfg(feature = "hydrate")]
    {
        let saved_show_ids_signal = saved_show_ids.clone();
        spawn_local(async move {
            let ids = load_user_attended_shows()
                .await
                .into_iter()
                .map(|item| item.show_id)
                .collect::<std::collections::HashSet<_>>();
            saved_show_ids_signal.set(ids);
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = saved_show_ids;
    }
}

fn queue_toggle_saved_show(
    show_id_value: i32,
    show_date_value: String,
    saved_show_ids: RwSignal<std::collections::HashSet<i32>>,
    save_pending: RwSignal<bool>,
    save_message: RwSignal<Option<(String, bool)>>,
) {
    #[cfg(feature = "hydrate")]
    {
        if save_pending.get_untracked() {
            return;
        }
        save_pending.set(true);

        let saved_show_ids_signal = saved_show_ids.clone();
        let save_pending_signal = save_pending.clone();
        let save_message_signal = save_message.clone();
        spawn_local(async move {
            let currently_saved =
                saved_show_ids_signal.with_untracked(|ids| ids.contains(&show_id_value));
            let action_ok = if currently_saved {
                remove_user_attended_show(show_id_value).await
            } else {
                add_user_attended_show(show_id_value, Some(show_date_value)).await
            };

            if action_ok {
                let ids = load_user_attended_shows()
                    .await
                    .into_iter()
                    .map(|item| item.show_id)
                    .collect::<std::collections::HashSet<_>>();
                saved_show_ids_signal.set(ids);
                if currently_saved {
                    save_message_signal.set(Some((
                        format!("Removed show {show_id_value} from My Shows."),
                        false,
                    )));
                } else {
                    save_message_signal.set(Some((
                        format!("Saved show {show_id_value} to My Shows."),
                        false,
                    )));
                }
            } else if currently_saved {
                save_message_signal.set(Some((
                    "Unable to remove this show from My Shows right now.".to_string(),
                    true,
                )));
            } else {
                save_message_signal.set(Some((
                    "Unable to save this show to My Shows right now.".to_string(),
                    true,
                )));
            }
            save_pending_signal.set(false);
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = show_id_value;
        drop(show_date_value);
        let _ = saved_show_ids;
        let _ = save_pending;
        let _ = save_message;
    }
}

fn render_show_detail_loaded(
    ctx: ShowContext,
    saved_show_ids: RwSignal<std::collections::HashSet<i32>>,
    save_pending: RwSignal<bool>,
    save_message: RwSignal<Option<(String, bool)>>,
) -> impl IntoView {
    let show = ctx.show;
    let venue_name = ctx.venue.as_ref().map_or_else(
        || format!("Venue #{}", show.venue_id),
        |venue| venue.name.clone(),
    );
    let venue_line = ctx.venue.as_ref().map_or_else(
        || venue_name.clone(),
        |venue| {
            format!(
                "{} • {}",
                venue.name,
                format_location(&venue.city, venue.state.as_deref())
            )
        },
    );
    let tour_line = ctx.tour.as_ref().map_or_else(
        || "No tour".into(),
        |tour| format!("{} ({})", tour.name, tour.year),
    );
    let tour_href = ctx
        .tour
        .as_ref()
        .map(|tour| format!("/tours/{}", tour.year));
    let venue_href = format!("/venues/{}", show.venue_id);
    let song_count = show.song_count.unwrap_or(0);
    let rarity = show
        .rarity_index
        .map_or_else(|| "-".into(), |v| format!("{v:.2}"));
    let show_id_value = show.id;
    let show_date_value = show.date.clone();

    let save_pending_for_button = save_pending.clone();
    let save_pending_for_label = save_pending.clone();
    let saved_show_ids_for_class = saved_show_ids.clone();
    let saved_show_ids_for_label = saved_show_ids.clone();
    let toggle_saved_show_ids = saved_show_ids.clone();
    let toggle_save_pending = save_pending.clone();
    let toggle_save_message = save_message.clone();

    view! {
        <div class="detail-list-head">
            <div class="detail-list-head__copy">
                <h2>{show.date.clone()}</h2>
                <p class="muted">{format!("{venue_line} • {tour_line}")}</p>
            </div>
            <div class="pill-row detail-list-head__meta">
                <span class="pill">{format!("{song_count} songs")}</span>
                <span class="pill pill--ghost">{format!("Rarity {rarity}")}</span>
                <button
                    type="button"
                    class=move || {
                        if saved_show_ids_for_class.get().contains(&show_id_value) {
                            "pill"
                        } else {
                            "pill pill--ghost"
                        }
                    }
                    disabled=move || save_pending_for_button.get()
                    on:click=move |_| {
                        queue_toggle_saved_show(
                            show_id_value,
                            show_date_value.clone(),
                            toggle_saved_show_ids.clone(),
                            toggle_save_pending.clone(),
                            toggle_save_message.clone(),
                        );
                    }
                >
                    {move || {
                        if save_pending_for_label.get() {
                            "Updating..."
                        } else if saved_show_ids_for_label.get().contains(&show_id_value) {
                            "Remove from My Shows"
                        } else {
                            "Save to My Shows"
                        }
                    }}
                </button>
                <a class="pill pill--ghost" href="/my-shows">"My Shows"</a>
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
}

fn render_show_detail_missing(
    show_id_raw: &str,
    seed_data_state: RwSignal<crate::data::SeedDataState>,
) -> impl IntoView {
    if seed_data_state.get() == crate::data::SeedDataState::Importing {
        return import_in_progress_state(
            "Show details are still loading",
            "/offline",
            "Open offline help",
        )
        .into_any();
    }

    match parse_show_id_param(show_id_raw) {
        Ok(parsed_show_id) => {
            let my_shows_href = format!("/my-shows?showId={parsed_show_id}");
            view! {
                <section class="status-card status-card--empty">
                    <p class="status-title">"Show not found"</p>
                    <p class="muted">"This show ID was not found in the current dataset."</p>
                    <div class="pill-row">
                        <a class="pill pill--ghost" href="/shows">"Browse all shows"</a>
                        <a class="pill pill--ghost" href=my_shows_href>"Track this show in My Shows"</a>
                    </div>
                </section>
            }
            .into_any()
        }
        Err(_) => view! {
            {empty_state_with_link(
                "Show not found",
                "This show ID was not found in the current dataset.",
                "/shows",
                "Browse all shows",
            )}
        }
        .into_any(),
    }
}

fn render_show_context(
    ctx: Option<ShowContext>,
    show_id_raw: &str,
    seed_data_state: RwSignal<crate::data::SeedDataState>,
    saved_show_ids: RwSignal<std::collections::HashSet<i32>>,
    save_pending: RwSignal<bool>,
    save_message: RwSignal<Option<(String, bool)>>,
) -> impl IntoView {
    if let Some(ctx) = ctx {
        return render_show_detail_loaded(ctx, saved_show_ids, save_pending, save_message)
            .into_any();
    }
    render_show_detail_missing(show_id_raw, seed_data_state).into_any()
}

fn render_show_save_message(save_message: RwSignal<Option<(String, bool)>>) -> impl IntoView {
    save_message.get().map(|(msg, is_error)| {
        let class_name = if is_error {
            "form-message form-message--error"
        } else {
            "form-message"
        };
        view! { <p class=class_name>{msg}</p> }
    })
}

fn render_setlist_filter_buttons(
    total_count: usize,
    set_counts: Vec<(String, usize)>,
    active_set: RwSignal<String>,
) -> impl IntoView {
    let active_set_for_class = active_set.clone();
    let active_set_for_aria = active_set.clone();
    let active_set_for_click = active_set.clone();

    view! {
        <div
            class="result-filters"
            role="group"
            aria-label="Setlist filters"
            aria-controls="show-setlist-results"
        >
            <button
                type="button"
                class="result-filter pill pill--ghost"
                class:result-filter--active=move || active_set_for_class.get() == "all"
                aria-pressed=move || active_set_for_aria.get() == "all"
                on:click=move |_| active_set_for_click.set("all".to_string())
            >
                {format!("All ({total_count})")}
            </button>
            {set_counts
                .into_iter()
                .map(|(set_key, count)| {
                    let label = setlist_set_label(&set_key);
                    let key_for_class = set_key.clone();
                    let key_for_aria = set_key.clone();
                    let key_for_click = set_key;
                    let class_active_set = active_set.clone();
                    let aria_active_set = active_set.clone();
                    let click_active_set = active_set.clone();

                    view! {
                        <button
                            type="button"
                            class="result-filter pill pill--ghost"
                            class:result-filter--active=move || class_active_set.get() == key_for_class
                            aria-pressed=move || aria_active_set.get() == key_for_aria
                            on:click=move |_| click_active_set.set(key_for_click.clone())
                        >
                            {format!("{label} ({count})")}
                        </button>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
}

fn render_setlist_entries_list(filtered_items: Vec<SetlistEntry>) -> impl IntoView {
    view! {
        <ol id="show-setlist-results" class="setlist" aria-label="Show setlist">
            {filtered_items
                .into_iter()
                .map(|entry| {
                    let label = entry
                        .song
                        .as_ref()
                        .map_or_else(|| format!("Song #{}", entry.song_id), |song| song.title.clone());
                    let slot = entry
                        .slot
                        .as_deref()
                        .map_or_else(|| "Song".to_string(), |raw| {
                            titleize_words_with_fallback(raw, "Unknown")
                        });
                    let set_label = setlist_set_label(&normalized_set_key(entry.set_name.as_deref()));
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
                            context_parts.push(format!("{}:{:02}", duration / 60, duration % 60));
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
}

fn render_setlist_empty_state(
    has_filters: bool,
    active_set: RwSignal<String>,
    setlist_query: RwSignal<String>,
) -> impl IntoView {
    view! {
        <section class="status-card status-card--empty">
            <p class="status-title">"No setlist entries match this view"</p>
            <p class="muted">"Try a different set filter or clear the search query."</p>
            {has_filters.then(|| {
                let active_set_signal = active_set.clone();
                let setlist_query_signal = setlist_query.clone();
                view! {
                    <div class="pill-row">
                        <button
                            type="button"
                            class="pill pill--ghost"
                            on:click=move |_| {
                                active_set_signal.set("all".to_string());
                                setlist_query_signal.set(String::new());
                            }
                        >
                            "Clear filters"
                        </button>
                    </div>
                }
            })}
        </section>
    }
}

fn render_show_setlist_content(
    items: Vec<SetlistEntry>,
    active_set: RwSignal<String>,
    setlist_query: RwSignal<String>,
) -> impl IntoView {
    if items.is_empty() {
        return empty_state(
            "Setlist unavailable",
            "No setlist rows were found for this show.",
        )
        .into_any();
    }

    let total_count = items.len();
    let set_counts = setlist_set_counts(&items);
    let active_key = active_set.get();
    let query_text = setlist_query.get().trim().to_string();
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
            {render_setlist_filter_buttons(total_count, set_counts, active_set.clone())}
        </div>
        <p class="list-summary" role="status" aria-live="polite">
            {summary}
        </p>
        {if filtered_items.is_empty() {
            render_setlist_empty_state(has_filters, active_set, setlist_query).into_any()
        } else {
            render_setlist_entries_list(filtered_items).into_any()
        }}
    }
    .into_any()
}

#[must_use]
pub fn show_detail_page() -> impl IntoView {
    let show_id = route_param_or_default("showId");
    let seed_data_state = use_seed_data_state();
    let active_set = RwSignal::new("all".to_string());
    let setlist_query = RwSignal::new(String::new());
    let saved_show_ids = RwSignal::new(std::collections::HashSet::<i32>::new());
    let save_pending = RwSignal::new(false);
    let save_message = RwSignal::new(None::<(String, bool)>);

    hydrate_saved_show_ids(saved_show_ids.clone());

    reset_filter_and_query_on_route_change(show_id, active_set, setlist_query);

    let show = optional_resource_from_param!(show_id, parse_show_id_param, load_show_context);
    let setlist = optional_resource_from_param!(show_id, parse_show_id_param, |id| async move {
        Some(load_setlist_entries(id).await)
    });

    let show_id_for_heading = show_id.clone();
    let show_id_for_render = show_id.clone();
    let save_message_for_render = save_message.clone();
    let seed_data_state_for_render = seed_data_state.clone();
    let saved_show_ids_for_render = saved_show_ids.clone();
    let save_pending_for_render = save_pending.clone();
    let save_message_for_context = save_message.clone();
    let active_set_for_setlist = active_set.clone();
    let setlist_query_for_setlist = setlist_query.clone();

    view! {
        <section class="page">
            {detail_nav("/shows", "Back to shows")}
            <h1>"Show Details"</h1>
            {move || render_route_param_subhead("Show ID", &show_id_for_heading(), parse_show_id_param)}
            {move || render_show_save_message(save_message_for_render.clone())}
            <Suspense fallback=move || loading_state("Loading show", "Fetching show summary and context.")>
                {move || {
                    render_show_context(
                        show.get().unwrap_or(None),
                        &show_id_for_render(),
                        seed_data_state_for_render.clone(),
                        saved_show_ids_for_render.clone(),
                        save_pending_for_render.clone(),
                        save_message_for_context.clone(),
                    )
                }}
            </Suspense>
            <div class="section-divider"></div>
            <h2>"Setlist"</h2>
            <Suspense fallback=move || loading_state("Loading setlist", "Building setlist sequence for this show.")>
                {move || {
                    match setlist.get().unwrap_or(None) {
                        Some(items) => render_show_setlist_content(
                            items,
                            active_set_for_setlist.clone(),
                            setlist_query_for_setlist.clone(),
                        )
                        .into_any(),
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

#[must_use]
pub fn song_detail_page() -> impl IntoView {
    let slug = route_param_or_default("slug");
    let seed_data_state = use_seed_data_state();
    let render = move |song: Option<Song>| {
        if let Some(song) = song {
            return render_song_detail_content(song).into_any();
        }
        render_import_or_missing_with_link(
            seed_data_state,
            "Song details are still loading",
            "Song not found",
            "This song slug could not be resolved.",
            "/songs",
            "Browse songs",
        )
    };

    let song = optional_resource_from_param!(slug, parse_route_slug_param, load_song);

    detail_page_with_primary_resource!(
        back_href: "/songs",
        back_label: "Back to songs",
        title: "Song Details",
        subhead: move || render_route_param_subhead("Slug", &slug(), parse_route_slug_param),
        loading_title: "Loading song",
        loading_message: "Fetching song profile and performance stats.",
        content: move || render(song.get().unwrap_or(None)),
    )
}

fn render_song_slot_distribution(
    total_plays: i32,
    slot_rows: Vec<(&'static str, i32)>,
) -> impl IntoView {
    if total_plays <= 0 {
        return empty_state(
            "Slot distribution unavailable",
            "No performance totals are available yet for this song.",
        )
        .into_any();
    }
    view! {
        <ul class="result-list">
            {slot_rows
                .into_iter()
                .map(|(slot, count)| {
                    let percentage = (f64::from(count) / f64::from(total_plays)) * 100.0;
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
}

fn render_song_detail_content(song: Song) -> impl IntoView {
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
        {render_song_slot_distribution(total_plays, slot_rows)}
    }
    .into_any()
}

#[must_use]
pub fn guest_detail_page() -> impl IntoView {
    let slug = route_param_or_default("slug");
    let seed_data_state = use_seed_data_state();
    let render = move |guest: Option<Guest>| match guest {
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
        None => render_import_or_missing_with_link(
            seed_data_state,
            "Guest details are still loading",
            "Guest not found",
            "This guest slug could not be resolved.",
            "/guests",
            "Browse guests",
        ),
    };

    let guest = optional_resource_from_param!(slug, parse_route_slug_param, load_guest);

    detail_page_with_primary_resource!(
        back_href: "/guests",
        back_label: "Back to guests",
        title: "Guest Details",
        subhead: move || render_route_param_subhead("Slug", &slug(), parse_route_slug_param),
        loading_title: "Loading guest",
        loading_message: "Fetching guest appearance profile.",
        content: move || render(guest.get().unwrap_or(None)),
    )
}

fn render_release_detail_card(release: &Release) -> impl IntoView {
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

fn render_release_track_filter_buttons(
    disc_counts: Vec<(String, usize)>,
    active_disc: RwSignal<String>,
) -> impl IntoView {
    disc_counts
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
        .collect::<Vec<_>>()
}

fn render_release_track_rows(filtered_tracks: Vec<ReleaseTrack>) -> impl IntoView {
    view! {
        <ol id="release-track-results" class="tracklist" aria-label="Release tracks">
            {filtered_tracks
                .into_iter()
                .map(|track| {
                    let track_label = track
                        .song_id
                        .map_or_else(|| "Unknown song".to_string(), |id| format!("Song #{id}"));
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
}

fn render_release_tracks_content(
    items: Vec<ReleaseTrack>,
    active_disc: RwSignal<String>,
    track_query: RwSignal<String>,
) -> impl IntoView {
    if items.is_empty() {
        return empty_state(
            "No tracks available",
            "Track rows were not found for this release.",
        )
        .into_any();
    }

    let total_count = items.len();
    let disc_counts = release_track_disc_counts(&items);
    let active_key = active_disc.get();
    let query_text = track_query.get().trim().to_string();
    let query_normalized = query_text.to_ascii_lowercase();
    let filtered_tracks = items
        .into_iter()
        .filter(|track| {
            let disc_key = normalized_disc_key(track.disc_number);
            let matches_disc = active_key == "all" || disc_key == active_key;
            matches_disc && release_track_matches_query(track, &query_normalized)
        })
        .collect::<Vec<_>>();
    let filtered_count = filtered_tracks.len();
    let has_filters = active_key != "all" || !query_text.is_empty();
    let summary = if query_text.is_empty() {
        format!("Showing {filtered_count} of {total_count} tracks")
    } else {
        format!("Showing {filtered_count} of {total_count} tracks matching \"{query_text}\"")
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
                {render_release_track_filter_buttons(disc_counts, active_disc)}
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
            render_release_track_rows(filtered_tracks).into_any()
        }}
    }
    .into_any()
}

#[must_use]
pub fn release_detail_page() -> impl IntoView {
    let slug = route_param_or_default("slug");
    let seed_data_state = use_seed_data_state();
    let active_disc = RwSignal::new("all".to_string());
    let track_query = RwSignal::new(String::new());
    reset_filter_and_query_on_route_change(slug, active_disc, track_query);

    let render = move |release: Option<Release>| {
        if let Some(release) = release {
            return render_release_detail_card(&release).into_any();
        }
        render_import_or_missing_with_link(
            seed_data_state,
            "Release details are still loading",
            "Release not found",
            "This release slug could not be resolved.",
            "/releases",
            "Browse releases",
        )
    };

    let release = optional_resource_from_param!(slug, parse_route_slug_param, load_release);
    let tracks = resource_from_param_or_default!(
        slug,
        parse_route_slug_param,
        Some(Vec::new()),
        load_release_tracks_by_slug
    );

    view! {
        <section class="page">
            {detail_nav("/releases", "Back to releases")}
            <h1>"Release Details"</h1>
            {move || render_route_param_subhead("Slug", &slug(), parse_route_slug_param)}
            <Suspense fallback=move || loading_state("Loading release", "Fetching release metadata.")>
                {move || render(release.get().unwrap_or(None))}
            </Suspense>
            <div class="section-divider"></div>
            <h2>"Tracks"</h2>
            <Suspense fallback=move || loading_state("Loading tracks", "Fetching track listing.")>
                {move || {
                    if let Some(items) = tracks.get().unwrap_or(None) {
                        render_release_tracks_content(items, active_disc.clone(), track_query.clone())
                            .into_any()
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

#[must_use]
pub fn tour_year_page() -> impl IntoView {
    let year = route_param_or_default("year");
    let seed_data_state = use_seed_data_state();
    let render = move |tour: Option<Tour>| match tour {
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
        None => render_import_or_missing_with_link(
            seed_data_state,
            "Tour details are still loading",
            "Tour not found",
            "This year does not map to a tour record.",
            "/tours",
            "Browse tours",
        ),
    };

    let tour = optional_resource_from_param!(year, parse_tour_year_param, load_tour);

    detail_page_with_primary_resource!(
        back_href: "/tours",
        back_label: "Back to tours",
        title: "Tour Details",
        subhead: move || render_route_param_subhead("Year", &year(), parse_tour_year_param),
        loading_title: "Loading tour",
        loading_message: "Fetching tour details for this year.",
        content: move || render(tour.get().unwrap_or(None)),
    )
}

#[must_use]
pub fn venue_detail_page() -> impl IntoView {
    let venue_id = route_param_or_default("venueId");
    let seed_data_state = use_seed_data_state();
    let render = move |venue: Option<Venue>| match venue {
        Some(venue) => {
            let name = venue.name.clone();
            let location = format_location(&venue.city, venue.state.as_deref());
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
        None => render_import_or_missing_with_link(
            seed_data_state,
            "Venue details are still loading",
            "Venue not found",
            "This venue ID was not found in the current dataset.",
            "/venues",
            "Browse venues",
        ),
    };

    let venue = optional_resource_from_param!(
        venue_id,
        |raw: &str| parse_positive_i32_param(raw, "venueId"),
        load_venue
    );

    detail_page_with_primary_resource!(
        back_href: "/venues",
        back_label: "Back to venues",
        title: "Venue Details",
        subhead: move || render_route_param_subhead(
            "Venue ID",
            &venue_id(),
            |raw: &str| parse_positive_i32_param(raw, "venueId"),
        ),
        loading_title: "Loading venue",
        loading_message: "Fetching venue profile and location.",
        content: move || render(venue.get().unwrap_or(None)),
    )
}

fn search_result_href(item: &dmb_core::SearchResult) -> Option<String> {
    match item.result_type.as_str() {
        "song" => item.slug.as_ref().map(|slug| format!("/songs/{slug}")),
        "venue" => Some(format!("/venues/{}", item.id)),
        "tour" => Some(format!("/tours/{}", item.id)),
        "guest" => item.slug.as_ref().map(|slug| format!("/guests/{slug}")),
        "release" => item.slug.as_ref().map(|slug| format!("/releases/{slug}")),
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

#[derive(Clone, Copy, Default)]
struct SearchResultCounts {
    all: usize,
    songs: usize,
    shows: usize,
    venues: usize,
    tours: usize,
    guests: usize,
    releases: usize,
}

fn render_search_filter_buttons(
    active_filter: RwSignal<String>,
    counts: SearchResultCounts,
) -> impl IntoView {
    let button_data = [
        ("all", "All", counts.all, false),
        ("song", "Songs", counts.songs, counts.songs == 0),
        ("show", "Shows", counts.shows, counts.shows == 0),
        ("venue", "Venues", counts.venues, counts.venues == 0),
        ("tour", "Tours", counts.tours, counts.tours == 0),
        ("guest", "Guests", counts.guests, counts.guests == 0),
        ("release", "Releases", counts.releases, counts.releases == 0),
    ];

    view! {
        <div
            class="result-filters"
            role="group"
            aria-label="Search result filters"
            aria-controls="search-results-list"
        >
            {button_data
                .into_iter()
                .map(|(value, label, count, disabled)| {
                    let filter_value = value.to_string();
                    let class_filter = filter_value.clone();
                    let aria_filter = filter_value.clone();
                    let click_filter = filter_value;
                    let class_active_filter = active_filter.clone();
                    let aria_active_filter = active_filter.clone();
                    let click_active_filter = active_filter.clone();

                    view! {
                        <button
                            type="button"
                            class="result-filter pill pill--ghost"
                            class:result-filter--active=move || {
                                class_active_filter.get() == class_filter
                            }
                            aria-pressed=move || aria_active_filter.get() == aria_filter
                            disabled=disabled
                            on:click=move |_| click_active_filter.set(click_filter.clone())
                        >
                            {format!("{label} ({count})")}
                        </button>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
}

fn render_search_result_rows(items: Vec<SearchResult>) -> impl IntoView {
    view! {
        <ul id="search-results-list" class="result-list">
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
    }
}

fn render_filtered_search_results(
    items: Vec<SearchResult>,
    active_filter: RwSignal<String>,
) -> impl IntoView {
    if items.is_empty() {
        let reset_filter = active_filter.clone();
        return view! {
            <section class="status-card status-card--empty">
                <p class="status-title">"No results in this category"</p>
                <p class="muted">"Try another filter or switch back to All results."</p>
                <p>
                    <button
                        type="button"
                        class="pill pill--ghost"
                        on:click=move |_| reset_filter.set("all".to_string())
                    >
                        "Show all results"
                    </button>
                </p>
            </section>
        }
        .into_any();
    }

    render_search_result_rows(items).into_any()
}

fn render_search_results_content(
    items: Vec<SearchResult>,
    query: &str,
    active_filter: RwSignal<String>,
) -> impl IntoView {
    let query = query.to_string();

    if items.is_empty() && !query.is_empty() {
        return empty_state("No results", "Try a different query or shorter phrase.").into_any();
    }
    if items.is_empty() {
        return empty_state(
            "Start typing",
            "Search songs, shows, venues, guests, tours, and releases.",
        )
        .into_any();
    }

    let mut counts = SearchResultCounts {
        all: items.len(),
        ..SearchResultCounts::default()
    };
    for item in &items {
        match item.result_type.as_str() {
            "song" => counts.songs += 1,
            "show" => counts.shows += 1,
            "venue" => counts.venues += 1,
            "tour" => counts.tours += 1,
            "guest" => counts.guests += 1,
            "release" => counts.releases += 1,
            _ => {}
        }
    }
    let selected_filter = normalize_search_filter(&active_filter.get());
    let filtered_items: Vec<_> = items
        .into_iter()
        .filter(|item| selected_filter == "all" || item.result_type == selected_filter)
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
            {render_search_filter_buttons(active_filter.clone(), counts)}
            <p class="list-summary" role="status" aria-live="polite">
                {format!("Showing {filtered_count} {summary_label} for \"{query}\"")}
            </p>
            {render_filtered_search_results(filtered_items, active_filter)}
        </>
    }
    .into_any()
}

#[cfg(feature = "hydrate")]
fn initialize_search_route_signals(
    query: RwSignal<String>,
    active_filter: RwSignal<String>,
    search_url_ready: RwSignal<bool>,
) {
    Effect::new(move |_| {
        let route_query = current_search_param("q").unwrap_or_default();
        let route_filter =
            normalize_search_filter(&current_search_param("type").unwrap_or_default());
        query.set(route_query);
        active_filter.set(route_filter);
        search_url_ready.set(true);
    });
}

#[cfg(feature = "hydrate")]
fn initialize_search_url_sync(
    query: RwSignal<String>,
    active_filter: RwSignal<String>,
    search_url_ready: RwSignal<bool>,
) {
    Effect::new(move |_| {
        if !search_url_ready.get() {
            return;
        }
        sync_search_query_params(&query.get(), &active_filter.get());
    });
}

#[cfg(feature = "hydrate")]
fn spawn_embedding_index_load(embedding_index: RwSignal<Option<SharedEmbeddingIndex>>) {
    spawn_local(async move {
        embedding_index.set(crate::ai::load_embedding_index().await);
    });
}

#[cfg(feature = "hydrate")]
fn initialize_search_results_effect(query: RwSignal<String>, results: RwSignal<Vec<SearchResult>>) {
    let embedding_index = RwSignal::new(None::<SharedEmbeddingIndex>);
    let search_run = RwSignal::new(0_u64);

    spawn_embedding_index_load(embedding_index.clone());

    Effect::new(move |_| {
        let current_query = query.get();
        let current_index = embedding_index.get();
        let run_id = search_run.get_untracked().wrapping_add(1);
        search_run.set(run_id);
        let results_signal = results.clone();
        let search_run_signal = search_run.clone();

        spawn_local(async move {
            // Debounce keystrokes to reduce repeated prefix/semantic lookups.
            wait_ms(120).await;
            if search_run_signal.get_untracked() != run_id {
                return;
            }

            let trimmed = current_query.trim().to_string();
            let items = if trimmed.is_empty() {
                Vec::new()
            } else {
                let prefix = dmb_idb::search_global(&trimmed).await.unwrap_or_default();
                let semantic = if trimmed.chars().count() >= 2 {
                    if let Some(index) = current_index {
                        crate::ai::semantic_search(&trimmed, &index, 12).await
                    } else {
                        Vec::new()
                    }
                } else {
                    Vec::new()
                };
                merge_search_results(prefix, semantic, 40)
            };

            // Drop stale async results from superseded queries.
            if search_run_signal.get_untracked() != run_id {
                return;
            }
            results_signal.set(items);
        });
    });
}

#[must_use]
pub fn search_page() -> impl IntoView {
    let query = RwSignal::new(String::new());
    let active_filter = RwSignal::new(String::from("all"));
    let results = RwSignal::new(Vec::<SearchResult>::new());
    #[cfg(feature = "hydrate")]
    let search_url_ready = RwSignal::new(false);

    #[cfg(feature = "hydrate")]
    {
        initialize_search_route_signals(
            query.clone(),
            active_filter.clone(),
            search_url_ready.clone(),
        );
        initialize_search_url_sync(
            query.clone(),
            active_filter.clone(),
            search_url_ready.clone(),
        );
        initialize_search_results_effect(query.clone(), results.clone());
    }

    let value_query = query.clone();
    let input_query = query.clone();
    let input_filter = active_filter.clone();
    let render_query = query.clone();
    let render_filter = active_filter.clone();
    let render_results = results.clone();

    view! {
        <section class="page">
            <h1>"Search"</h1>
            <p class="lead">"Hybrid prefix + semantic search (offline-first)."</p>
            <input
                class="search-input"
                type="search"
                placeholder="Search songs, shows, venues..."
                prop:value=move || value_query.get()
                on:input=move |ev| {
                    let next = event_target_value(&ev);
                    if next.trim().is_empty() {
                        input_filter.set("all".to_string());
                    }
                    input_query.set(next);
                }
            />
            {move || {
                let query_value = render_query.get();
                render_search_results_content(
                    render_results.get(),
                    &query_value,
                    render_filter.clone(),
                )
            }}
        </section>
    }
}

// ---------------------------------------------------------------------------
// Stats page structs
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Default, serde::Serialize, serde::Deserialize)]
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

macro_rules! load_stats_hydrate_or_default {
    ($body:block) => {{
        #[cfg(feature = "hydrate")]
        {
            spawn_local_to_send(async move $body).await
        }
        #[cfg(not(feature = "hydrate"))]
        {
            Default::default()
        }
    }};
}

// ---------------------------------------------------------------------------
// Stats data loaders
// ---------------------------------------------------------------------------

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_stats_overview() -> StatsOverview {
    load_stats_hydrate_or_default!({
        let stores = [
            dmb_idb::TABLE_SHOWS,
            dmb_idb::TABLE_SONGS,
            dmb_idb::TABLE_VENUES,
            dmb_idb::TABLE_TOURS,
            dmb_idb::TABLE_GUESTS,
            dmb_idb::TABLE_SETLIST_ENTRIES,
        ];

        let mut counts_by_store: HashMap<String, u32> = HashMap::new();
        if let Ok((entries, _missing)) = dmb_idb::count_stores_with_missing(&stores).await {
            for (store, count) in entries {
                counts_by_store.insert(store, count);
            }
        }

        let shows = counts_by_store
            .get(dmb_idb::TABLE_SHOWS)
            .copied()
            .unwrap_or(0);
        let songs = counts_by_store
            .get(dmb_idb::TABLE_SONGS)
            .copied()
            .unwrap_or(0);
        let venues = counts_by_store
            .get(dmb_idb::TABLE_VENUES)
            .copied()
            .unwrap_or(0);
        let tours = counts_by_store
            .get(dmb_idb::TABLE_TOURS)
            .copied()
            .unwrap_or(0);
        let guests = counts_by_store
            .get(dmb_idb::TABLE_GUESTS)
            .copied()
            .unwrap_or(0);
        let setlists = counts_by_store
            .get(dmb_idb::TABLE_SETLIST_ENTRIES)
            .copied()
            .unwrap_or(0);

        let avg_songs_per_show = if shows > 0 {
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
            avg_songs_per_show,
        }
    })
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_stats_songs() -> StatsSongs {
    load_stats_hydrate_or_default!({
        let top_played = dmb_idb::stats_top_songs(25).await.unwrap_or_default();
        let top_openers = dmb_idb::stats_top_openers(10).await.unwrap_or_default();
        let top_closers = dmb_idb::stats_top_closers(10).await.unwrap_or_default();
        let top_encores = dmb_idb::stats_top_encores(10).await.unwrap_or_default();

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

        StatsSongs {
            top_played,
            top_openers,
            top_closers,
            top_encores,
            debuts_by_year,
        }
    })
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_stats_shows() -> StatsShows {
    load_stats_hydrate_or_default!({
        let shows: Vec<Show> = dmb_idb::list_all(dmb_idb::TABLE_SHOWS)
            .await
            .unwrap_or_default();
        let recent_tours = dmb_idb::list_recent_tours(25).await.unwrap_or_default();

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

        let (rarity_min, rarity_q1, rarity_median, rarity_q3, rarity_max) =
            if rarity_values.is_empty() {
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

        StatsShows {
            shows_by_year,
            shows_by_decade,
            rarity_min,
            rarity_q1,
            rarity_median,
            rarity_q3,
            rarity_max,
            recent_tours,
        }
    })
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_stats_venues() -> StatsVenues {
    load_stats_hydrate_or_default!({
        let top_venues = dmb_idb::list_top_venues(25).await.unwrap_or_default();
        let all_venues: Vec<Venue> = dmb_idb::list_all(dmb_idb::TABLE_VENUES)
            .await
            .unwrap_or_default();

        let mut country_map: std::collections::HashMap<String, u32> =
            std::collections::HashMap::new();
        let mut state_map: std::collections::HashMap<String, u32> =
            std::collections::HashMap::new();
        for venue in &all_venues {
            let total = venue.total_shows.unwrap_or(0) as u32;
            *country_map.entry(venue.country.clone()).or_insert(0) += total;
            if venue.country == "US" || venue.country == "United States" {
                if let Some(state) = venue.state.as_ref() {
                    if !state.is_empty() {
                        *state_map.entry(state.clone()).or_insert(0) += total;
                    }
                }
            }
        }

        let mut shows_by_country: Vec<(String, u32)> = country_map.into_iter().collect();
        shows_by_country.sort_by(|a, b| b.1.cmp(&a.1));

        let mut shows_by_state: Vec<(String, u32)> = state_map.into_iter().collect();
        shows_by_state.sort_by(|a, b| b.1.cmp(&a.1));

        StatsVenues {
            top_venues,
            shows_by_country,
            shows_by_state,
        }
    })
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::unused_async))]
async fn load_stats_guests() -> StatsGuests {
    load_stats_hydrate_or_default!({
        let top_guests = dmb_idb::list_top_guests(25).await.unwrap_or_default();
        let appearances: Vec<GuestAppearance> = dmb_idb::list_all(dmb_idb::TABLE_GUEST_APPEARANCES)
            .await
            .unwrap_or_default();

        let years: Vec<u32> = appearances
            .iter()
            .filter_map(|appearance| appearance.year.map(|year| year as u32))
            .collect();

        let appearances_by_year = if years.is_empty() {
            Vec::new()
        } else {
            let map = dmb_wasm::aggregate_by_year(&years);
            js_map_to_u32_pairs(&map)
        };

        StatsGuests {
            top_guests,
            appearances_by_year,
        }
    })
}

// ---------------------------------------------------------------------------
// Stats page component
// ---------------------------------------------------------------------------

const STATS_TABS: [(u8, &str); 5] = [
    (0, "Overview"),
    (1, "Songs"),
    (2, "Shows & Tours"),
    (3, "Venues"),
    (4, "Guests"),
];
const STATS_TAB_COUNT: u8 = 5;

fn render_stats_tabs(active_tab: RwSignal<u8>) -> impl IntoView {
    view! {
        <nav
            class="stats-tabs"
            role="tablist"
            aria-label="Statistics sections"
            aria-orientation="horizontal"
        >
            {STATS_TABS
                .into_iter()
                .map(|(idx, name)| {
                    let tab_id = format!("stats-tab-{idx}");
                    let panel_id = format!("stats-panel-{idx}");
                    let class_active_tab = active_tab.clone();
                    let aria_active_tab = active_tab.clone();
                    let tabindex_active_tab = active_tab.clone();
                    let click_active_tab = active_tab.clone();
                    let keydown_active_tab = active_tab.clone();

                    view! {
                        <button
                            type="button"
                            role="tab"
                            id=tab_id
                            aria-controls=panel_id
                            class:active=move || class_active_tab.get() == idx
                            aria-selected=move || aria_active_tab.get() == idx
                            tabindex=move || if tabindex_active_tab.get() == idx { 0 } else { -1 }
                            on:click=move |_| click_active_tab.set(idx)
                            on:keydown=move |ev| {
                                let key = ev.key();
                                let next = match key.as_str() {
                                    "ArrowRight" => Some((idx + 1) % STATS_TAB_COUNT),
                                    "ArrowLeft" => {
                                        Some(if idx == 0 { STATS_TAB_COUNT - 1 } else { idx - 1 })
                                    }
                                    "Home" => Some(0),
                                    "End" => Some(STATS_TAB_COUNT - 1),
                                    _ => None,
                                };
                                if let Some(next_idx) = next {
                                    ev.prevent_default();
                                    keydown_active_tab.set(next_idx);
                                    focus_stats_tab(next_idx);
                                }
                            }
                        >
                            {name}
                        </button>
                    }
                })
                .collect::<Vec<_>>()}
        </nav>
    }
}

fn render_stats_panel<T, F, V>(
    active_tab: RwSignal<u8>,
    idx: u8,
    loading_title: &'static str,
    loading_desc: &'static str,
    data: Resource<T>,
    render: F,
) -> impl IntoView
where
    T: Clone + Default + Send + Sync + 'static,
    F: Fn(T) -> V + Copy + Send + Sync + 'static,
    V: IntoView + 'static,
{
    let hidden_active_tab = active_tab.clone();
    let display_active_tab = active_tab.clone();
    let content_data = data.clone();
    let panel_id = format!("stats-panel-{idx}");
    let tab_id = format!("stats-tab-{idx}");

    view! {
        <div
            class="stats-panel"
            id=panel_id
            role="tabpanel"
            aria-labelledby=tab_id
            hidden=move || hidden_active_tab.get() != idx
            style:display=move || if display_active_tab.get() == idx { "block" } else { "none" }
        >
            <Suspense fallback=move || loading_state(loading_title, loading_desc)>
                {move || render(content_data.get().unwrap_or_default())}
            </Suspense>
        </div>
    }
}

fn render_stats_overview_content(data: StatsOverview) -> impl IntoView {
    let StatsOverview {
        show_count,
        song_count,
        venue_count,
        tour_count,
        guest_count,
        setlist_count,
        avg_songs_per_show,
    } = data;

    view! {
        <>
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-value">{show_count.to_string()}</span>
                    <span class="stat-label">"Shows"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{song_count.to_string()}</span>
                    <span class="stat-label">"Songs"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{venue_count.to_string()}</span>
                    <span class="stat-label">"Venues"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{tour_count.to_string()}</span>
                    <span class="stat-label">"Tours"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{guest_count.to_string()}</span>
                    <span class="stat-label">"Guests"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{setlist_count.to_string()}</span>
                    <span class="stat-label">"Setlist Entries"</span>
                </div>
            </div>
            <div class="stat-card" style="margin-top: 1rem">
                <span class="stat-value">{format!("{avg_songs_per_show:.1}")}</span>
                <span class="stat-label">"Avg Songs Per Show"</span>
            </div>
            <p class="muted" style="margin-top: 1rem">
                {format!("Database: {} v{}", dmb_idb::DB_NAME, dmb_idb::DB_VERSION)}
            </p>
        </>
    }
}

fn render_stats_songs_content(data: StatsSongs) -> impl IntoView {
    let StatsSongs {
        top_played,
        top_openers,
        top_closers,
        top_encores,
        debuts_by_year,
    } = data;

    view! {
        <>
            <h2>"Top 25 Most Played"</h2>
            {render_song_table(&top_played, true)}

            <h2>"Top 10 Openers"</h2>
            {render_song_ranking(&top_openers, |s| s.opener_count.unwrap_or(0))}

            <h2>"Top 10 Closers"</h2>
            {render_song_ranking(&top_closers, |s| s.closer_count.unwrap_or(0))}

            <h2>"Top 10 Encores"</h2>
            {render_song_ranking(&top_encores, |s| s.encore_count.unwrap_or(0))}

            <h2>"Song Debuts by Year"</h2>
            {render_bar_chart(&debuts_by_year)}
        </>
    }
}

fn render_stats_shows_content(data: StatsShows) -> impl IntoView {
    let StatsShows {
        shows_by_year,
        shows_by_decade,
        rarity_min,
        rarity_q1,
        rarity_median,
        rarity_q3,
        rarity_max,
        recent_tours,
    } = data;

    view! {
        <>
            <h2>"Shows Per Year"</h2>
            {render_bar_chart(&shows_by_year)}

            <h2>"Shows Per Decade"</h2>
            <div class="stats-grid">
                {shows_by_decade
                    .iter()
                    .map(|(decade, count)| {
                        view! {
                            <div class="stat-card">
                                <span class="stat-value">{count.to_string()}</span>
                                <span class="stat-label">{format!("{decade}s")}</span>
                            </div>
                        }
                    })
                    .collect::<Vec<_>>()}
            </div>

            <h2>"Rarity Index Distribution"</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_min:.2}")}</span>
                    <span class="stat-label">"Min"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_q1:.2}")}</span>
                    <span class="stat-label">"Q1"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_median:.2}")}</span>
                    <span class="stat-label">"Median"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_q3:.2}")}</span>
                    <span class="stat-label">"Q3"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_max:.2}")}</span>
                    <span class="stat-label">"Max"</span>
                </div>
            </div>

            <h2>"Recent Tours"</h2>
            <ul class="result-list">
                {recent_tours
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
                                <span class="result-score">{format!("{total} shows")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
}

fn render_stats_venues_content(data: StatsVenues) -> impl IntoView {
    let StatsVenues {
        top_venues,
        shows_by_country,
        shows_by_state,
    } = data;

    view! {
        <>
            <h2>"Top 25 Venues"</h2>
            <ul class="result-list">
                {top_venues
                    .iter()
                    .map(|venue| {
                        let href = format!("/venues/{}", venue.id);
                        let location = format_location(&venue.city, venue.state.as_deref());
                        let total = venue.total_shows.unwrap_or(0);
                        view! {
                            <li class="result-card">
                                <span class="pill">
                                    {venue
                                        .state
                                        .clone()
                                        .unwrap_or_else(|| venue.country.clone())}
                                </span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{venue.name.clone()}</a>
                                    <span class="result-meta">{location}</span>
                                </div>
                                <span class="result-score">{format!("{total} shows")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>

            <h2>"Shows by Country"</h2>
            {render_string_bar_chart(&shows_by_country, 15)}

            <h2>"Shows by US State"</h2>
            {render_string_bar_chart(&shows_by_state, 20)}
        </>
    }
}

fn render_stats_guests_content(data: StatsGuests) -> impl IntoView {
    let StatsGuests {
        top_guests,
        appearances_by_year,
    } = data;

    view! {
        <>
            <h2>"Top 25 Guests"</h2>
            <ul class="result-list">
                {top_guests
                    .iter()
                    .map(|guest| {
                        let href = format!("/guests/{}", guest.slug);
                        let total = guest.total_appearances.unwrap_or(0);
                        view! {
                            <li class="result-card">
                                <div class="result-body">
                                    <a class="result-label" href=href>{guest.name.clone()}</a>
                                </div>
                                <span class="result-score">{format!("{total} appearances")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>

            <h2>"Guest Appearances by Year"</h2>
            {render_bar_chart(&appearances_by_year)}
        </>
    }
}

#[must_use]
pub fn stats_page() -> impl IntoView {
    let active_tab = RwSignal::new(0u8);

    let overview = unit_resource(load_stats_overview);
    let songs = unit_resource(load_stats_songs);
    let shows = unit_resource(load_stats_shows);
    let venues = unit_resource(load_stats_venues);
    let guests = unit_resource(load_stats_guests);

    view! {
        <section class="page">
            <h1>"Stats"</h1>
            <p class="lead">"WASM-powered aggregations over the full concert database."</p>
            {render_stats_tabs(active_tab.clone())}
            {render_stats_panel(
                active_tab.clone(),
                0,
                "Loading overview",
                "Crunching summary aggregates.",
                overview,
                render_stats_overview_content,
            )}
            {render_stats_panel(
                active_tab.clone(),
                1,
                "Loading songs stats",
                "Computing song rankings.",
                songs,
                render_stats_songs_content,
            )}
            {render_stats_panel(
                active_tab.clone(),
                2,
                "Loading shows stats",
                "Computing show and rarity metrics.",
                shows,
                render_stats_shows_content,
            )}
            {render_stats_panel(
                active_tab.clone(),
                3,
                "Loading venue stats",
                "Computing venue distributions.",
                venues,
                render_stats_venues_content,
            )}
            {render_stats_panel(
                active_tab,
                4,
                "Loading guest stats",
                "Computing guest appearance metrics.",
                guests,
                render_stats_guests_content,
            )}
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
                            <span class="result-score">{format!("{count} times")}</span>
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
    let max_val = f64::from(data.iter().map(|&(_, v)| v).max().unwrap_or(1));
    view! {
        <div class="bar-chart" role="list" aria-label="Bar chart">
            {data
                .iter()
                .map(|&(label, value)| {
                    let pct = if max_val > 0.0 {
                        (f64::from(value) / max_val * 100.0).max(1.0)
                    } else {
                        0.0
                    };
                    let width = format!("width: {pct:.1}%");
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
    let max_val = f64::from(items.iter().map(|(_, v)| *v).max().unwrap_or(1));
    view! {
        <div class="bar-chart" role="list" aria-label="Bar chart">
            {items
                .iter()
                .map(|(label, value)| {
                    let pct = if max_val > 0.0 {
                        (f64::from(*value) / max_val * 100.0).max(1.0)
                    } else {
                        0.0
                    };
                    let width = format!("width: {pct:.1}%");
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

fn render_assistant_index_status(embedding_index: Option<SharedEmbeddingIndex>) -> impl IntoView {
    match embedding_index {
        None => {
            loading_state("Loading embedding index", "Preparing local vector search.").into_any()
        }
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
    }
}

#[cfg(feature = "hydrate")]
fn spawn_assistant_semantic_search(
    current_query: String,
    current_index: Option<SharedEmbeddingIndex>,
    results_signal: RwSignal<Vec<SearchResult>>,
) {
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
}

fn render_assistant_results(query: &str, items: Vec<dmb_core::SearchResult>) -> impl IntoView {
    let trimmed = query.trim().to_string();
    if trimmed.len() < 2 {
        return empty_state(
            "Ask a question",
            "Type at least two characters to see semantic recommendations.",
        )
        .into_any();
    }
    if items.is_empty() {
        return empty_state(
            "No semantic matches yet",
            "Try a broader phrase, song title, venue name, or year.",
        )
        .into_any();
    }
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

#[must_use]
pub fn assistant_page() -> impl IntoView {
    let (query, set_query) = signal(String::new());
    let embedding_index = RwSignal::new(None::<SharedEmbeddingIndex>);
    let results = RwSignal::new(Vec::<dmb_core::SearchResult>::new());

    #[cfg(feature = "hydrate")]
    {
        spawn_embedding_index_load(embedding_index.clone());

        let index_signal = embedding_index.clone();
        let results_signal = results.clone();
        Effect::new(move |_| {
            let current_query = query.get();
            let current_index = index_signal.get();
            spawn_assistant_semantic_search(current_query, current_index, results_signal);
        });
    }

    view! {
        <section class="page">
            <h1>"AI Assistant"</h1>
            <p class="lead">"Offline-first semantic recommendations and answers."</p>
            {move || render_assistant_index_status(embedding_index.get())}

            <div class="assistant-search">
                <input
                    class="search-input"
                    type="search"
                    placeholder="Ask about a song, show, venue..."
                    prop:value=move || query.get()
                    on:input=move |ev| set_query.set(event_target_value(&ev))
                />
            </div>
            {move || render_assistant_results(&query.get(), results.get())}
        </section>
    }
}

#[must_use]
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

#[cfg(feature = "hydrate")]
fn hydrate_my_shows_state(
    items: RwSignal<Vec<UserAttendedShow>>,
    loading: RwSignal<bool>,
    input: RwSignal<String>,
    message: RwSignal<Option<(String, bool)>>,
) {
    let items_signal = items.clone();
    let loading_signal = loading.clone();
    spawn_local(async move {
        items_signal.set(load_user_attended_shows().await);
        loading_signal.set(false);
    });

    let input_signal = input.clone();
    let message_signal = message.clone();
    Effect::new(move |_| {
        let raw_show_id = current_search_param("showId");
        let Some(raw_show_id) = raw_show_id else {
            return;
        };
        match parse_show_id_param(&raw_show_id) {
            Ok(show_id) => {
                input_signal.set(show_id.to_string());
                if message_signal.get_untracked().is_none() {
                    message_signal.set(Some((
                        format!(
                            "Show {show_id} prefilled from link. Click Add to save it locally."
                        ),
                        false,
                    )));
                }
            }
            Err(_) => {
                if message_signal.get_untracked().is_none() {
                    message_signal.set(Some((
                        "Invalid showId query parameter. Enter a positive show ID.".to_string(),
                        true,
                    )));
                }
            }
        }
    });
}

#[cfg(feature = "hydrate")]
async fn add_my_show_and_refresh(
    show_id: i32,
    items: RwSignal<Vec<UserAttendedShow>>,
    input: RwSignal<String>,
    message: RwSignal<Option<(String, bool)>>,
    loading: RwSignal<bool>,
) {
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
}

#[cfg(feature = "hydrate")]
async fn remove_my_show_and_refresh(
    show_id: i32,
    items: RwSignal<Vec<UserAttendedShow>>,
    message: RwSignal<Option<(String, bool)>>,
    loading: RwSignal<bool>,
) {
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
}

#[cfg(feature = "hydrate")]
fn render_my_shows_message_view(message: Option<(String, bool)>) -> Option<AnyView> {
    message.map(|(msg, is_error)| {
        let class_name = if is_error {
            "form-message form-message--error"
        } else {
            "form-message"
        };
        view! { <p class=class_name>{msg}</p> }.into_any()
    })
}

#[cfg(feature = "hydrate")]
fn render_saved_show_rows<F>(saved: Vec<UserAttendedShow>, on_remove: F) -> impl IntoView
where
    F: Fn(i32) + Clone + 'static,
{
    let count = saved.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing {count} saved shows")}</p>
            <ul class="result-list">
                {saved
                    .into_iter()
                    .map(move |item| {
                        let href = format!("/shows/{}", item.show_id);
                        let date = item
                            .show_date
                            .clone()
                            .unwrap_or_else(|| "Unknown date".to_string());
                        let show_id = item.show_id;
                        let on_remove_click = on_remove.clone();
                        view! {
                            <li class="result-card">
                                <span class="pill">{format!("#{}", show_id)}</span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{date}</a>
                                    <span class="result-meta">{format!("Show ID {show_id}")}</span>
                                </div>
                                <button type="button" class="pill pill--ghost" on:click=move |_| on_remove_click(show_id)>
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

#[cfg(feature = "hydrate")]
fn render_my_shows_hydrated<F>(
    loading: bool,
    saved: Vec<UserAttendedShow>,
    on_remove: F,
) -> impl IntoView
where
    F: Fn(i32) + Clone + 'static,
{
    if loading {
        return loading_state("Loading saved shows", "Reading your local show list.").into_any();
    }
    if saved.is_empty() {
        return empty_state_with_link(
            "No saved shows yet",
            "Add a show ID to start tracking your attended history.",
            "/shows",
            "Browse shows",
        )
        .into_any();
    }
    render_saved_show_rows(saved, on_remove).into_any()
}

#[must_use]
pub fn my_shows_page() -> impl IntoView {
    let items = RwSignal::new(Vec::<UserAttendedShow>::new());
    let input = RwSignal::new(String::new());
    let message = RwSignal::new(None::<(String, bool)>);
    #[cfg(feature = "hydrate")]
    let loading = RwSignal::new(true);

    #[cfg(feature = "hydrate")]
    {
        hydrate_my_shows_state(items, loading, input, message);
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
                add_my_show_and_refresh(show_id, items, input, message, loading).await;
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
                remove_my_show_and_refresh(show_id, items, message, loading).await;
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
                    render_my_shows_message_view(message.get())
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    None::<leptos::prelude::View<leptos::prelude::AnyView>>
                }
            }}
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    render_my_shows_hydrated(loading.get(), items.get(), on_remove.clone()).into_any()
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
                            .as_ref().map_or_else(|| format!("Song #{}", entry.song_id), |song| song.title.clone());
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
    normalized_nonempty_lower(Some(raw), "other")
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
        custom => titleize_words_with_fallback(custom, "Other"),
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
        .map_or_else(
            || {
                let type_label =
                    curated_item_type_label(&normalized_curated_item_type(&item.item_type));
                format!("{type_label} #{id}", id = item.id)
            },
            ToString::to_string,
        )
}

fn curated_item_matches_query(item: &CuratedListItem, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let in_title = optional_text_matches_query(item.item_title.as_deref(), query);
    let in_notes = optional_text_matches_query(item.notes.as_deref(), query);
    let in_type = text_matches_query(&item.item_type, query);
    in_title || in_notes || in_type
}

fn render_curated_filter_buttons(
    type_counts: Vec<(String, usize)>,
    active_filter: RwSignal<String>,
) -> impl IntoView {
    type_counts
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
        .collect::<Vec<_>>()
}

fn render_curated_empty_state(
    has_filters: bool,
    active_filter: RwSignal<String>,
    query: RwSignal<String>,
) -> impl IntoView {
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
}

fn render_curated_item_rows(filtered_items: Vec<CuratedListItem>) -> impl IntoView {
    view! {
        <ol id="curated-list-results" class="tracklist" aria-label="Curated list items">
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
}

fn render_curated_list_detail_content(
    list: CuratedList,
    items: Vec<CuratedListItem>,
    active_filter: RwSignal<String>,
    query: RwSignal<String>,
) -> impl IntoView {
    let CuratedList {
        title,
        category,
        description,
        is_featured,
        ..
    } = list;

    let description = description
        .as_deref()
        .map(str::trim)
        .filter(|description| !description.is_empty())
        .unwrap_or("No description is available for this list.")
        .to_string();
    let total_count = items.len();
    let type_counts = curated_item_type_counts(&items);
    let active_key = active_filter.get();
    let query_text = query.get().trim().to_string();
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
                    <h2>{title.clone()}</h2>
                    <p class="muted">{description}</p>
                </div>
                <div class="pill-row detail-list-head__meta">
                    <span class="pill">{category.clone()}</span>
                    {is_featured.unwrap_or(false).then(|| view! { <span class="pill">"Featured"</span> })}
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
                {render_curated_filter_buttons(type_counts, active_filter)}
            </div>
        </div>

        <p class="list-summary" role="status" aria-live="polite">
            {summary}
        </p>

        {if filtered_items.is_empty() {
            render_curated_empty_state(has_filters, active_filter, query).into_any()
        } else {
            render_curated_item_rows(filtered_items).into_any()
        }}
    }
}

#[must_use]
pub fn liberation_page() -> impl IntoView {
    let items = unit_resource(|| load_liberation_list(50));

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

#[must_use]
pub fn discography_page() -> impl IntoView {
    let items = unit_resource(load_all_releases);

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

#[must_use]
pub fn curated_lists_page() -> impl IntoView {
    let items = unit_resource(load_curated_lists);

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

#[must_use]
pub fn curated_list_detail_page() -> impl IntoView {
    let list_id = route_param_or_default("listId");
    let seed_data_state = use_seed_data_state();
    let active_filter = RwSignal::new("all".to_string());
    let query = RwSignal::new(String::new());

    let list = optional_resource_from_param!(list_id, parse_list_id_param, load_curated_list);

    let items = resource_from_param_or_default!(
        list_id,
        parse_list_id_param,
        Vec::new(),
        load_curated_list_items_page
    );

    #[cfg(feature = "hydrate")]
    {
        reset_filter_and_query_on_route_change(list_id, active_filter, query);
    }

    view! {
        <section class="page">
            {detail_nav("/lists", "Back to curated lists")}
            <h1>"Curated List Details"</h1>
            <p class="lead">"Highlights, context, and quick filtering for every item in this collection."</p>
            {move || render_route_param_subhead("List ID", &list_id(), parse_list_id_param)}
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
                    } else if parse_list_id_param(&list_id()).is_err() {
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
                        render_import_or_missing_with_link(
                            seed_data_state,
                            "Curated list details are still loading",
                            "List not found",
                            "This curated list id could not be resolved.",
                            "/lists",
                            "Browse curated lists",
                        )
                    }
                }}
            </Suspense>
        </section>
    }
}

#[must_use]
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

#[must_use]
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

#[must_use]
pub fn protocol_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    let protocol_value = {
        let value = RwSignal::new(None::<String>);
        let value_signal = value.clone();
        request_animation_frame(move || {
            value_signal.set(current_search_param("url"));
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

#[must_use]
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
        normalize_guests, normalize_releases, normalize_search_filter, normalize_show_summaries,
        normalize_songs, normalize_tours, normalize_venues, release_track_disc_counts,
        release_track_matches_query, setlist_set_counts, ShowSummary,
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

    #[test]
    fn normalize_search_filter_accepts_known_values() {
        assert_eq!(normalize_search_filter("song"), "song");
        assert_eq!(normalize_search_filter("SHOW"), "show");
        assert_eq!(normalize_search_filter(" venue "), "venue");
        assert_eq!(normalize_search_filter("invalid"), "all");
        assert_eq!(normalize_search_filter(""), "all");
    }
}
