#![allow(clippy::large_types_passed_by_value)]

use leptos::prelude::*;
#[cfg(feature = "hydrate")]
use leptos::task::spawn_local;
#[cfg(feature = "hydrate")]
use serde_json;
#[cfg(feature = "hydrate")]
use serde_wasm_bindgen;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

use crate::data::{ImportStatus, StorageInfo};

#[cfg(any(feature = "hydrate", test))]
const UPDATE_SNOOZE_MS: f64 = 6.0 * 60.0 * 60.0 * 1000.0;
// Proactively check for SW updates so stale cached bundles don't trap users on SSR defaults.
// Throttled to avoid hammering sw.js on every navigation.
#[cfg(feature = "hydrate")]
const AUTO_UPDATE_CHECK_INTERVAL_MS: f64 = 30.0 * 60.0 * 1000.0;
#[cfg(feature = "hydrate")]
const UPDATE_CHECKED_AT_KEY: &str = "pwa_update_checked_at";
#[cfg(feature = "hydrate")]
const SW_VERSION_KEY: &str = "pwa_sw_version";
#[cfg(feature = "hydrate")]
const SW_ACTIVATED_AT_KEY: &str = "pwa_sw_activated_at";
// Used during cutover: delete CacheStorage entries created by the previous JS prototype SW
// (which uses cache names like `dmb-shell-*`, `dmb-api-*`, etc). This prevents quota
// pressure and confusing "ghost" offline state after the Rust app takes over.
#[cfg(feature = "hydrate")]
const PREVIOUS_CACHE_CLEANED_AT_KEY: &str = "pwa_previous_cache_cleaned_at";

#[cfg(any(feature = "hydrate", test))]
fn e2e_version_from_sw_script_url(script_url: &str) -> Option<String> {
    // Playwright SW update E2E tests register `/sw.js?e2e=<version>`.
    // If present, we can derive the expected version deterministically without waiting on a PONG.
    let marker = "e2e=";
    let start = script_url.find(marker)? + marker.len();
    let rest = &script_url[start..];
    let end = rest.find('&').unwrap_or(rest.len());
    let value = rest[..end].trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

#[cfg(any(feature = "hydrate", test))]
fn should_suppress_update_notice(last_dismissed_ms: Option<f64>, now_ms: f64) -> bool {
    let Some(last) = last_dismissed_ms else {
        return false;
    };
    if now_ms < last {
        return true;
    }
    (now_ms - last) < UPDATE_SNOOZE_MS
}

#[cfg(any(feature = "hydrate", test))]
fn remaining_snooze_ms(last_dismissed_ms: Option<f64>, now_ms: f64) -> Option<f64> {
    let last = last_dismissed_ms?;
    if now_ms < last {
        return Some(UPDATE_SNOOZE_MS);
    }
    let elapsed = now_ms - last;
    if elapsed >= UPDATE_SNOOZE_MS {
        None
    } else {
        Some(UPDATE_SNOOZE_MS - elapsed)
    }
}

#[cfg(feature = "hydrate")]
fn format_last_checked(ts: f64, now_ms: f64) -> String {
    if now_ms <= ts {
        return "Last checked: just now".to_string();
    }
    let minutes = (now_ms - ts) / 60000.0;
    if minutes < 1.0 {
        "Last checked: just now".to_string()
    } else if minutes < 60.0 {
        format!("Last checked: {:.0}m ago", minutes)
    } else {
        let hours = minutes / 60.0;
        format!("Last checked: {:.1}h ago", hours)
    }
}

#[cfg(feature = "hydrate")]
fn format_age(prefix: &str, ts: f64, now_ms: f64) -> String {
    if now_ms <= ts {
        return format!("{prefix}: just now");
    }
    let minutes = (now_ms - ts) / 60000.0;
    if minutes < 1.0 {
        format!("{prefix}: just now")
    } else if minutes < 60.0 {
        format!("{prefix}: {:.0}m ago", minutes)
    } else {
        let hours = minutes / 60.0;
        format!("{prefix}: {:.1}h ago", hours)
    }
}

#[cfg(feature = "hydrate")]
async fn count_cache_entries() -> Option<usize> {
    use wasm_bindgen::JsCast;
    use wasm_bindgen_futures::JsFuture;

    let window = web_sys::window()?;
    let caches = window.caches().ok()?;
    let keys_value = JsFuture::from(caches.keys()).await.ok()?;
    let keys = js_sys::Array::from(&keys_value);
    let mut total = 0usize;
    for key in keys.iter() {
        let name = key.as_string().unwrap_or_default();
        let cache_value = JsFuture::from(caches.open(&name)).await.ok()?;
        let cache: web_sys::Cache = cache_value.dyn_into().ok()?;
        let requests_value = JsFuture::from(cache.keys()).await.ok()?;
        let requests = js_sys::Array::from(&requests_value);
        total += requests.length() as usize;
    }
    Some(total)
}

#[cfg(feature = "hydrate")]
fn is_previous_app_cache_name(name: &str) -> bool {
    // Rust app SW caches are scoped with a distinct prefix.
    if name.starts_with("dmb-almanac-rs") {
        return false;
    }

    // Previous app cache name prefixes (from the pre-Rust service worker).
    let previous_prefixes = [
        "dmb-shell-",
        "dmb-assets-",
        "dmb-api-",
        "dmb-pages-",
        "dmb-images-",
        "dmb-fonts-stylesheets-",
        "dmb-fonts-webfonts-",
        "dmb-offline-",
        "dmb-sync-",
        // Older cache names from earlier iterations/tests.
        "dmb-almanac-",
    ];

    previous_prefixes
        .iter()
        .any(|prefix| name.starts_with(prefix))
}

#[cfg(feature = "hydrate")]
async fn cleanup_previous_app_caches() -> Option<usize> {
    use wasm_bindgen::JsCast;
    use wasm_bindgen_futures::JsFuture;

    let window = web_sys::window()?;
    let cache_storage = window.caches().ok()?;
    let keys_value = JsFuture::from(cache_storage.keys()).await.ok()?;
    let keys: js_sys::Array = keys_value.dyn_into().ok()?;

    let mut deleted = 0usize;
    for key in keys.iter() {
        let name = key.as_string().unwrap_or_default();
        if !is_previous_app_cache_name(&name) {
            continue;
        }
        if let Ok(result) = JsFuture::from(cache_storage.delete(&name)).await {
            if result.as_bool().unwrap_or(false) {
                deleted += 1;
            }
        }
    }
    Some(deleted)
}

#[cfg(feature = "hydrate")]
fn sw_state(worker: &web_sys::ServiceWorker) -> Option<String> {
    js_sys::Reflect::get(worker.as_ref(), &JsValue::from_str("state"))
        .ok()
        .and_then(|v| v.as_string())
}

#[cfg(feature = "hydrate")]
fn has_sw_controller() -> bool {
    web_sys::window()
        .map(|window| window.navigator().service_worker().controller().is_some())
        .unwrap_or(false)
}

fn shorten_script_url(url: &str) -> String {
    // Keep the UI readable. `scriptURL` can be a full origin URL.
    url.rsplit('/')
        .next()
        .map_or_else(|| url.to_string(), std::string::ToString::to_string)
}

#[cfg(feature = "hydrate")]
fn schedule_window_timeout(timeout_ms: i32, callback: impl FnOnce() + 'static) {
    use wasm_bindgen::closure::Closure;
    use wasm_bindgen::JsCast;

    let Some(window) = web_sys::window() else {
        return;
    };
    let cb = Closure::once(callback);
    let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
        cb.as_ref().unchecked_ref(),
        timeout_ms,
    );
    cb.forget();
}

#[cfg(feature = "hydrate")]
fn set_sw_action_status(sw_action_status: RwSignal<Option<String>>, message: &str) {
    sw_action_status.set(Some(message.to_string()));
    schedule_window_timeout(5000, move || {
        sw_action_status.set(None);
    });
}

#[cfg(feature = "hydrate")]
fn post_sw_message_type(worker: &web_sys::ServiceWorker, message_type: &str) {
    let msg = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        msg.as_ref(),
        &JsValue::from_str("type"),
        &JsValue::from_str(message_type),
    );
    let _ = worker.post_message(&msg);
}

#[cfg(feature = "hydrate")]
fn parse_sw_message_payload(event: &web_sys::MessageEvent) -> Option<serde_json::Value> {
    if let Some(data) = event.data().as_string() {
        if let Ok(payload) = serde_json::from_str::<serde_json::Value>(&data) {
            return Some(payload);
        }
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
fn set_local_storage_item(key: &str, value: &str) {
    if let Some(window) = web_sys::window() {
        if let Ok(Some(storage)) = window.local_storage() {
            let _ = storage.set_item(key, value);
        }
    }
}

#[cfg(feature = "hydrate")]
fn remove_local_storage_item(key: &str) {
    if let Some(window) = web_sys::window() {
        if let Ok(Some(storage)) = window.local_storage() {
            let _ = storage.remove_item(key);
        }
    }
}

#[derive(Clone, Copy)]
struct PwaStatusState {
    status: RwSignal<ImportStatus>,
    storage: RwSignal<Option<StorageInfo>>,
    online: RwSignal<bool>,
    update_ready: RwSignal<bool>,
    update_version: RwSignal<Option<String>>,
    update_snoozed: RwSignal<bool>,
    update_snooze_remaining: RwSignal<Option<f64>>,
    update_checking: RwSignal<bool>,
    update_last_checked: RwSignal<Option<f64>>,
    update_state: RwSignal<Option<String>>,
    update_applying: RwSignal<bool>,
    update_error: RwSignal<Option<String>>,
    sw_version: RwSignal<Option<String>>,
    sw_activated_at: RwSignal<Option<f64>>,
    sw_controller_url: RwSignal<Option<String>>,
    sw_controller_state: RwSignal<Option<String>>,
    sw_controller_impl: RwSignal<Option<String>>,
    sw_controller_cache_prefix: RwSignal<Option<String>>,
    sw_scope: RwSignal<Option<String>>,
    previous_cache_cleaned_at: RwSignal<Option<f64>>,
    previous_cache_cleanup: RwSignal<Option<String>>,
    cache_entries: RwSignal<Option<usize>>,
    storage_warning: RwSignal<Option<String>>,
    ann_cap_override: RwSignal<Option<u64>>,
    ai_config_version: RwSignal<Option<String>>,
    ai_config_generated_at: RwSignal<Option<String>>,
    embedding_sample_enabled: RwSignal<Option<bool>>,
    ai_config_status: RwSignal<Option<String>>,
    manifest_diff: RwSignal<Option<crate::data::ManifestDiff>>,
    integrity_report: RwSignal<Option<crate::data::IntegrityReport>>,
    sqlite_parity: RwSignal<Option<crate::data::SqliteParityReport>>,
    sw_action_status: RwSignal<Option<String>>,
}

impl PwaStatusState {
    fn new() -> Self {
        Self {
            status: RwSignal::new(ImportStatus {
                message: "Checking offline data…".to_string(),
                ..Default::default()
            }),
            storage: RwSignal::new(None::<StorageInfo>),
            online: RwSignal::new(true),
            update_ready: RwSignal::new(false),
            update_version: RwSignal::new(None::<String>),
            update_snoozed: RwSignal::new(false),
            update_snooze_remaining: RwSignal::new(None::<f64>),
            update_checking: RwSignal::new(false),
            update_last_checked: RwSignal::new(None::<f64>),
            update_state: RwSignal::new(None::<String>),
            update_applying: RwSignal::new(false),
            update_error: RwSignal::new(None::<String>),
            sw_version: RwSignal::new(None::<String>),
            sw_activated_at: RwSignal::new(None::<f64>),
            sw_controller_url: RwSignal::new(None::<String>),
            sw_controller_state: RwSignal::new(None::<String>),
            sw_controller_impl: RwSignal::new(None::<String>),
            sw_controller_cache_prefix: RwSignal::new(None::<String>),
            sw_scope: RwSignal::new(None::<String>),
            previous_cache_cleaned_at: RwSignal::new(None::<f64>),
            previous_cache_cleanup: RwSignal::new(None::<String>),
            cache_entries: RwSignal::new(None::<usize>),
            storage_warning: RwSignal::new(None::<String>),
            ann_cap_override: RwSignal::new(None::<u64>),
            ai_config_version: RwSignal::new(None::<String>),
            ai_config_generated_at: RwSignal::new(None::<String>),
            embedding_sample_enabled: RwSignal::new(None::<bool>),
            ai_config_status: RwSignal::new(None::<String>),
            manifest_diff: RwSignal::new(None::<crate::data::ManifestDiff>),
            integrity_report: RwSignal::new(None::<crate::data::IntegrityReport>),
            sqlite_parity: RwSignal::new(None::<crate::data::SqliteParityReport>),
            sw_action_status: RwSignal::new(None::<String>),
        }
    }
}

fn action_export_parity(state: PwaStatusState) {
    #[cfg(feature = "hydrate")]
    {
        spawn_local(async move {
            use wasm_bindgen::JsCast;

            state
                .manifest_diff
                .set(crate::data::fetch_manifest_diff().await);
            state
                .integrity_report
                .set(crate::data::fetch_integrity_report().await);
            state
                .sqlite_parity
                .set(crate::data::fetch_sqlite_parity_report().await);

            let current_status = state.status.get_untracked();
            let payload = serde_json::json!({
                "generatedAtMs": js_sys::Date::now(),
                "import": {
                    "message": current_status.message,
                    "progress": current_status.progress,
                    "done": current_status.done,
                    "error": current_status.error,
                },
                "sw": {
                    "version": state.sw_version.get_untracked(),
                    "activatedAtMs": state.sw_activated_at.get_untracked(),
                },
                "manifestDiff": state.manifest_diff.get_untracked().map(|diff| serde_json::json!({
                    "version": diff.version,
                    "totalChanged": diff.total_changed,
                    "changed": diff.changed.iter().map(|e| serde_json::json!({
                        "name": e.name,
                        "before": e.before,
                        "after": e.after,
                        "delta": e.delta,
                    })).collect::<Vec<_>>(),
                })),
                "integrityReport": state.integrity_report.get_untracked().map(|report| serde_json::json!({
                    "totalMismatches": report.total_mismatches,
                    "mismatches": report.mismatches.iter().map(|e| serde_json::json!({
                        "store": e.store,
                        "expected": e.expected,
                        "actual": e.actual,
                    })).collect::<Vec<_>>(),
                })),
                "sqliteParity": state.sqlite_parity.get_untracked().map(|report| serde_json::json!({
                    "available": report.available,
                    "totalMismatches": report.total_mismatches,
                    "missingTables": report.missing_tables,
                    "idbCountFailures": report.idb_count_failures,
                    "mismatches": report.mismatches.iter().map(|e| serde_json::json!({
                        "store": e.store,
                        "sqliteTable": e.sqlite_table,
                        "idbCount": e.idb_count,
                        "sqliteCount": e.sqlite_count,
                    })).collect::<Vec<_>>(),
                })),
            });

            let Some(window) = web_sys::window() else {
                return;
            };
            let json_str =
                serde_json::to_string_pretty(&payload).unwrap_or_else(|_| "{}".to_string());
            let blob_parts = js_sys::Array::new();
            blob_parts.push(&JsValue::from_str(&json_str));
            let blob = web_sys::Blob::new_with_str_sequence(&blob_parts).ok();
            let Some(blob) = blob else {
                return;
            };
            let url = web_sys::Url::create_object_url_with_blob(&blob).ok();
            let Some(url) = url else {
                return;
            };
            let document = window.document();
            let Some(document) = document else {
                return;
            };
            let a = document.create_element("a").ok();
            let Some(a) = a else {
                return;
            };
            let Ok(a) = a.dyn_into::<web_sys::HtmlAnchorElement>() else {
                return;
            };
            a.set_href(&url);
            a.set_download("dmb-parity-report.json");
            a.click();
            let _ = web_sys::Url::revoke_object_url(&url);
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = state;
    }
}

fn action_update_click(state: PwaStatusState) {
    #[cfg(feature = "hydrate")]
    {
        state.update_applying.set(true);
        state.update_error.set(None);
        state.update_state.set(Some("Applying update…".to_string()));

        spawn_local(async move {
            use wasm_bindgen_futures::JsFuture;

            if let Some(window) = web_sys::window() {
                let container = window.navigator().service_worker();
                if let Ok(reg_val) = JsFuture::from(container.get_registration()).await {
                    if let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() {
                        if let Some(worker) = reg.waiting() {
                            post_sw_message_type(&worker, "SKIP_WAITING");
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
                }

                let container = window.navigator().service_worker();
                let state_on_change = state.clone();
                let window_reload = window.clone();
                let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                    state_on_change
                        .update_state
                        .set(Some("Reloading…".to_string()));
                    state_on_change.update_applying.set(false);
                    let _ = window_reload.location().reload();
                }) as Box<dyn Fn()>);
                container
                    .add_event_listener_with_callback(
                        "controllerchange",
                        cb.as_ref().unchecked_ref(),
                    )
                    .ok();
                cb.forget();

                let state_timeout = state.clone();
                let window_reload = window.clone();
                schedule_window_timeout(1500, move || {
                    state_timeout
                        .update_state
                        .set(Some("Reloading…".to_string()));
                    state_timeout.update_applying.set(false);
                    if let Err(err) = window_reload.location().reload() {
                        state_timeout.update_error.set(Some(format!(
                            "Reload blocked: {:?}. Please refresh manually.",
                            err
                        )));
                    }
                });
            }
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = state;
    }
}

fn action_update_later(state: PwaStatusState) {
    #[cfg(feature = "hydrate")]
    {
        if let Some(window) = web_sys::window() {
            if let Ok(Some(storage)) = window.local_storage() {
                let now = js_sys::Date::now();
                let _ = storage.set_item("pwa_update_dismissed_at", &now.to_string());
            }
        }
        state.update_snoozed.set(true);
        state.update_ready.set(false);
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = state;
    }
}

fn action_update_check(state: PwaStatusState) {
    #[cfg(feature = "hydrate")]
    {
        state.update_checking.set(true);
        state
            .update_state
            .set(Some("Checking for updates…".to_string()));

        spawn_local(async move {
            use wasm_bindgen_futures::JsFuture;

            if let Some(window) = web_sys::window() {
                let container = window.navigator().service_worker();
                if let Ok(reg_val) = JsFuture::from(container.get_registration()).await {
                    if let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() {
                        if let Ok(promise) = reg.update() {
                            let _ = JsFuture::from(promise).await;
                        }
                    }
                }
                let now = js_sys::Date::now();
                if let Ok(Some(storage)) = window.local_storage() {
                    let _ = storage.set_item(UPDATE_CHECKED_AT_KEY, &now.to_string());
                }
                state.update_last_checked.set(Some(now));
            }

            state.update_checking.set(false);
            if !state.update_ready.get_untracked() && state.update_error.get_untracked().is_none() {
                state.update_state.set(Some("No update found.".to_string()));
                let state_for_timeout = state.clone();
                schedule_window_timeout(2500, move || {
                    if state_for_timeout.update_state.get_untracked().as_deref()
                        == Some("No update found.")
                    {
                        state_for_timeout.update_state.set(None);
                    }
                });
            } else {
                state.update_state.set(None);
            }
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = state;
    }
}

fn action_storage_cleanup(state: PwaStatusState) {
    #[cfg(feature = "hydrate")]
    {
        spawn_local(async move {
            let _ = crate::data::handle_storage_pressure().await;
            state.storage_warning.set(Some(
                "Cleared AI cache to relieve storage pressure.".to_string(),
            ));
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = state;
    }
}

fn action_cleanup_previous_caches(state: PwaStatusState) {
    #[cfg(feature = "hydrate")]
    {
        state
            .previous_cache_cleanup
            .set(Some("Cleaning old caches…".to_string()));

        spawn_local(async move {
            let deleted = cleanup_previous_app_caches().await.unwrap_or(0);
            let now = js_sys::Date::now();

            if let Some(window) = web_sys::window() {
                if let Ok(Some(storage)) = window.local_storage() {
                    let _ = storage.set_item(PREVIOUS_CACHE_CLEANED_AT_KEY, &now.to_string());
                }
            }

            state.previous_cache_cleaned_at.set(Some(now));
            state.cache_entries.set(count_cache_entries().await);

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
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = state;
    }
}

fn action_ping_sw(state: PwaStatusState) {
    #[cfg(feature = "hydrate")]
    {
        set_sw_action_status(state.sw_action_status, "Pinging service worker…");

        spawn_local(async move {
            use wasm_bindgen_futures::JsFuture;

            let Some(window) = web_sys::window() else {
                set_sw_action_status(state.sw_action_status, "No window");
                return;
            };

            let container = window.navigator().service_worker();
            let Some(controller) = container.controller() else {
                set_sw_action_status(state.sw_action_status, "No SW controller yet.");
                return;
            };

            if let Ok(reg_val) = JsFuture::from(container.get_registration()).await {
                if let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() {
                    if reg.waiting().is_some() {
                        set_sw_action_status(
                            state.sw_action_status,
                            "Ping sent (note: update is waiting).",
                        );
                    }
                }
            }

            post_sw_message_type(&controller, "PING");
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = state;
    }
}

fn action_unregister_sw(state: PwaStatusState) {
    #[cfg(feature = "hydrate")]
    {
        set_sw_action_status(state.sw_action_status, "Unregistering service worker…");

        spawn_local(async move {
            use wasm_bindgen_futures::JsFuture;

            let Some(window) = web_sys::window() else {
                set_sw_action_status(state.sw_action_status, "No window");
                return;
            };

            let container = window.navigator().service_worker();
            let Ok(reg_val) = JsFuture::from(container.get_registration()).await else {
                set_sw_action_status(state.sw_action_status, "No SW registration found.");
                return;
            };
            let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() else {
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

            let unregistered = match JsFuture::from(promise).await {
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

            if let Ok(Some(storage)) = window.local_storage() {
                let _ = storage.remove_item(SW_VERSION_KEY);
                let _ = storage.remove_item(SW_ACTIVATED_AT_KEY);
                let _ = storage.remove_item("pwa_update_dismissed_at");
            }

            set_sw_action_status(state.sw_action_status, "SW unregistered. Reloading…");
            let _ = window.location().reload();
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = state;
    }
}

fn action_reset_data() {
    #[cfg(feature = "hydrate")]
    {
        spawn_local(async move {
            if let Some(window) = web_sys::window() {
                if let Ok(cache_storage) = window.caches() {
                    if let Ok(keys) =
                        wasm_bindgen_futures::JsFuture::from(cache_storage.keys()).await
                    {
                        let keys: js_sys::Array = keys.dyn_into().unwrap_or_default();
                        for key in keys.iter() {
                            if let Some(name) = key.as_string() {
                                let _ = wasm_bindgen_futures::JsFuture::from(
                                    cache_storage.delete(&name),
                                )
                                .await;
                            }
                        }
                    }
                }
            }
            let _ = dmb_idb::delete_db().await;
            if let Some(window) = web_sys::window() {
                let _ = window.location().reload();
            }
        });
    }
}

#[cfg(feature = "hydrate")]
fn refresh_update_notice_state(state: &PwaStatusState) -> bool {
    if let Some(window) = web_sys::window() {
        if let Ok(Some(storage)) = window.local_storage() {
            if let Ok(Some(value)) = storage.get_item("pwa_update_dismissed_at") {
                if let Ok(ts) = value.parse::<f64>() {
                    let now = js_sys::Date::now();
                    let remaining = remaining_snooze_ms(Some(ts), now);
                    state.update_snooze_remaining.set(remaining);
                    return should_suppress_update_notice(Some(ts), now);
                }
            }
        }
    }

    state.update_snooze_remaining.set(None);
    false
}

#[cfg(feature = "hydrate")]
fn hydrate_local_snapshot(state: &PwaStatusState) {
    if let Some(window) = web_sys::window() {
        if let Ok(Some(storage)) = window.local_storage() {
            if let Ok(Some(value)) = storage.get_item(UPDATE_CHECKED_AT_KEY) {
                if let Ok(ts) = value.parse::<f64>() {
                    state.update_last_checked.set(Some(ts));
                }
            }
            if let Ok(Some(version)) = storage.get_item(SW_VERSION_KEY) {
                state.sw_version.set(Some(version));
            }
            if let Ok(Some(ts)) = storage.get_item(SW_ACTIVATED_AT_KEY) {
                if let Ok(value) = ts.parse::<f64>() {
                    state.sw_activated_at.set(Some(value));
                }
            }
            if let Ok(Some(ts)) = storage.get_item(PREVIOUS_CACHE_CLEANED_AT_KEY) {
                if let Ok(value) = ts.parse::<f64>() {
                    state.previous_cache_cleaned_at.set(Some(value));
                }
            }
            if let Ok(Some(version)) = storage.get_item("dmb-ai-config-version") {
                state.ai_config_version.set(Some(version));
            }
            if let Ok(Some(generated_at)) = storage.get_item("dmb-ai-config-generated-at") {
                state.ai_config_generated_at.set(Some(generated_at));
            }
            if let Ok(Some(sample)) = storage.get_item("dmb-embedding-sample") {
                state.embedding_sample_enabled.set(Some(sample == "1"));
            }
        }
    }
}

#[cfg(feature = "hydrate")]
fn spawn_seed_and_diagnostics_refresh(state: &PwaStatusState) {
    let status = state.status;
    let manifest_diff = state.manifest_diff;
    let integrity_report = state.integrity_report;
    let sqlite_parity = state.sqlite_parity;

    spawn_local(async move {
        crate::data::ensure_seed_data(status).await;
        manifest_diff.set(crate::data::fetch_manifest_diff().await);
        integrity_report.set(crate::data::fetch_integrity_report().await);
        sqlite_parity.set(crate::data::fetch_sqlite_parity_report().await);
    });
}

#[cfg(feature = "hydrate")]
fn spawn_storage_health_tasks(state: &PwaStatusState) {
    let storage = state.storage;
    let storage_warning = state.storage_warning;

    spawn_local(async move {
        let info = crate::data::estimate_storage().await;
        storage.set(info);
        let cleared = crate::data::handle_storage_pressure()
            .await
            .unwrap_or(false);
        if cleared {
            storage_warning.set(Some(
                "Cleared AI cache to relieve storage pressure.".to_string(),
            ));
        }
    });

    let cache_entries = state.cache_entries;
    spawn_local(async move {
        cache_entries.set(count_cache_entries().await);
    });
}

#[cfg(feature = "hydrate")]
fn spawn_ai_config_sync_task(state: &PwaStatusState) {
    let ai_config_status = state.ai_config_status;
    let ai_config_version = state.ai_config_version;
    let ai_config_generated_at = state.ai_config_generated_at;

    spawn_local(async move {
        if let Some(remote) = crate::ai::fetch_ai_config_meta().await {
            let normalize = |value: Option<String>| {
                value
                    .map(|item| item.trim().to_string())
                    .filter(|item| !item.is_empty())
            };

            let remote_v = normalize(remote.version.clone());
            let remote_g = normalize(remote.generated_at.clone());
            let mut local_v = normalize(ai_config_version.get_untracked());
            let mut local_g = normalize(ai_config_generated_at.get_untracked());
            let mut mismatched = remote_v != local_v || remote_g != local_g;

            if mismatched {
                if crate::ai::refresh_ai_config().await {
                    local_v = normalize(crate::ai::ai_config_version());
                    local_g = normalize(crate::ai::ai_config_generated_at());
                    ai_config_version.set(local_v.clone());
                    ai_config_generated_at.set(local_g.clone());
                    mismatched = remote_v != local_v || remote_g != local_g;
                }

                if mismatched
                    && crate::ai::sync_ai_config_meta(remote_v.as_deref(), remote_g.as_deref())
                {
                    local_v = remote_v.clone();
                    local_g = remote_g.clone();
                    ai_config_version.set(local_v.clone());
                    ai_config_generated_at.set(local_g.clone());
                    mismatched = false;
                }
            }

            if mismatched {
                let msg = format!(
                    "AI config mismatch: remote {} @ {}.",
                    remote_v.clone().unwrap_or_else(|| "n/a".to_string()),
                    remote_g.clone().unwrap_or_else(|| "n/a".to_string())
                );
                ai_config_status.set(Some(msg));
            } else {
                ai_config_status.set(None);
            }
        }
    });
}

#[cfg(feature = "hydrate")]
fn ping_controller_for_metadata(controller: &web_sys::ServiceWorker, state: &PwaStatusState) {
    state.sw_controller_impl.set(None);
    state.sw_controller_cache_prefix.set(None);

    post_sw_message_type(controller, "PING");
    state.sw_action_status.set(None);
}

#[cfg(feature = "hydrate")]
fn sync_current_controller_state(
    container: &web_sys::ServiceWorkerContainer,
    state: &PwaStatusState,
) -> bool {
    let has_controller = container.controller().is_some();

    if let Some(controller) = container.controller() {
        let script_url = controller.script_url();
        state.sw_controller_url.set(Some(script_url.clone()));
        state.sw_controller_state.set(sw_state(&controller));

        if let Some(version) = e2e_version_from_sw_script_url(&script_url) {
            state.sw_version.set(Some(version.clone()));
            set_local_storage_item(SW_VERSION_KEY, &version);
        }

        ping_controller_for_metadata(&controller, state);
    } else {
        state.sw_controller_url.set(None);
        state.sw_controller_state.set(None);
        state.sw_controller_impl.set(None);
        state.sw_controller_cache_prefix.set(None);
    }

    has_controller
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

        let persist_sw_version = |version: &str, state: &PwaStatusState| {
            let effective =
                resolve_effective_sw_version(state.sw_controller_url.get_untracked(), version);
            state.sw_version.set(Some(effective.clone()));
            set_local_storage_item(SW_VERSION_KEY, &effective);
        };

        match event_type {
            "PONG" => {
                if let Some(impl_name) = payload.get("impl").and_then(|v| v.as_str()) {
                    state.sw_controller_impl.set(Some(impl_name.to_string()));
                }
                if let Some(version) = payload.get("version").and_then(|v| v.as_str()) {
                    persist_sw_version(version, &state);
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
                    persist_sw_version(version, &state);
                }
                let now = js_sys::Date::now();
                state.sw_activated_at.set(Some(now));
                set_local_storage_item(SW_ACTIVATED_AT_KEY, &now.to_string());
                state.update_ready.set(false);
                state.update_state.set(None);
                state.update_error.set(None);
                state.update_applying.set(false);
                remove_local_storage_item("pwa_update_dismissed_at");
                state.update_snoozed.set(false);
                spawn_local(async move {
                    state.cache_entries.set(count_cache_entries().await);
                });
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
                let script_url = controller.script_url();
                state.sw_controller_url.set(Some(script_url.clone()));
                state.sw_controller_state.set(sw_state(&controller));

                if let Some(version) = e2e_version_from_sw_script_url(&script_url) {
                    state.sw_version.set(Some(version.clone()));
                    set_local_storage_item(SW_VERSION_KEY, &version);
                }

                ping_controller_for_metadata(&controller, &state);
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
        let worker_state = js_sys::Reflect::get(
            worker_for_state.as_ref(),
            &wasm_bindgen::JsValue::from_str("state"),
        )
        .ok()
        .and_then(|v| v.as_string());

        if let Some(current_state) = worker_state.as_deref() {
            state
                .update_state
                .set(Some(format!("Update {current_state}…")));
            if current_state == "installed" {
                let waiting = reg.waiting().is_some();
                if has_sw_controller() && waiting && !refresh_update_notice_state(&state) {
                    state.update_ready.set(true);
                    state
                        .update_state
                        .set(Some("Update ready to install.".to_string()));
                }
                state.update_error.set(None);
                state.update_applying.set(false);
                state.update_checking.set(false);
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
            .set(Some("Downloading update…".to_string()));
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

    let Some(window) = web_sys::window() else {
        return;
    };

    let Ok(reg_val) = JsFuture::from(container.get_registration()).await else {
        return;
    };
    let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() else {
        return;
    };

    state.sw_scope.set(Some(reg.scope()));

    if reg.waiting().is_some() {
        if has_controller && !refresh_update_notice_state(&state) {
            state.update_ready.set(true);
            state
                .update_state
                .set(Some("Update ready to install.".to_string()));
        }
        state.update_error.set(None);
        state.update_applying.set(false);
        state.update_checking.set(false);
    }

    if let Some(worker) = reg.installing() {
        attach_installing_state_listener(reg.clone(), worker, state.clone());
    }

    attach_updatefound_listener(reg.clone(), state.clone());

    if window.navigator().on_line() {
        let now = js_sys::Date::now();
        let mut should_check = true;

        if let Ok(Some(storage)) = window.local_storage() {
            if let Ok(Some(value)) = storage.get_item(UPDATE_CHECKED_AT_KEY) {
                if let Ok(ts) = value.parse::<f64>() {
                    if now > ts && (now - ts) < AUTO_UPDATE_CHECK_INTERVAL_MS {
                        should_check = false;
                    }
                }
            }
        }

        if should_check {
            if let Ok(promise) = reg.update() {
                let _ = JsFuture::from(promise).await;
            }
            if let Ok(Some(storage)) = window.local_storage() {
                let _ = storage.set_item(UPDATE_CHECKED_AT_KEY, &now.to_string());
            }
            state.update_last_checked.set(Some(now));
        }
    }

    if has_controller && window.navigator().on_line() {
        let now = js_sys::Date::now();
        let mut should_cleanup = true;

        if let Ok(Some(storage)) = window.local_storage() {
            if storage
                .get_item(PREVIOUS_CACHE_CLEANED_AT_KEY)
                .ok()
                .flatten()
                .is_some()
            {
                should_cleanup = false;
            }
        }

        if should_cleanup {
            let _ = cleanup_previous_app_caches().await;
            if let Ok(Some(storage)) = window.local_storage() {
                let _ = storage.set_item(PREVIOUS_CACHE_CLEANED_AT_KEY, &now.to_string());
            }
            state.previous_cache_cleaned_at.set(Some(now));
            state.cache_entries.set(count_cache_entries().await);
        }
    }
}

#[cfg(feature = "hydrate")]
fn spawn_sw_runtime_task(state: &PwaStatusState) {
    let state = state.clone();

    spawn_local(async move {
        let Some(window) = web_sys::window() else {
            return;
        };

        let container = window.navigator().service_worker();
        attach_sw_message_listener(&container, &state);
        attach_sw_controllerchange_listener(&container, &state);

        let has_controller = sync_current_controller_state(&container, &state);
        process_sw_registration(container, state, has_controller).await;
    });
}

#[cfg(feature = "hydrate")]
fn register_online_offline_listeners(state: &PwaStatusState) {
    if let Some(window) = web_sys::window() {
        state.online.set(window.navigator().on_line());

        let online = state.online;
        let online_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
            online.set(true);
        }) as Box<dyn Fn()>);
        window
            .add_event_listener_with_callback("online", online_cb.as_ref().unchecked_ref())
            .ok();
        online_cb.forget();

        let online = state.online;
        let offline_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
            online.set(false);
        }) as Box<dyn Fn()>);
        window
            .add_event_listener_with_callback("offline", offline_cb.as_ref().unchecked_ref())
            .ok();
        offline_cb.forget();
    }
}

fn initialize_pwa_status_state(state: PwaStatusState) {
    #[cfg(not(feature = "hydrate"))]
    let _ = state;

    #[cfg(feature = "hydrate")]
    {
        request_animation_frame(move || {
            state
                .update_snoozed
                .set(refresh_update_notice_state(&state));
            hydrate_local_snapshot(&state);
            state.ann_cap_override.set(crate::ai::ann_cap_override_mb());

            spawn_seed_and_diagnostics_refresh(&state);
            spawn_storage_health_tasks(&state);
            spawn_ai_config_sync_task(&state);
            spawn_sw_runtime_task(&state);
            register_online_offline_listeners(&state);
        });
    }
}

fn setup_post_import_refresh(state: PwaStatusState) {
    #[cfg(not(feature = "hydrate"))]
    let _ = state;

    #[cfg(feature = "hydrate")]
    {
        let post_import_refreshed = RwSignal::new(false);
        let status = state.status;
        let manifest_diff = state.manifest_diff;
        let integrity_report = state.integrity_report;
        let sqlite_parity = state.sqlite_parity;

        Effect::new(move |_| {
            let current = status.get();
            if !current.done || current.error.is_some() {
                return;
            }
            if post_import_refreshed.get_untracked() {
                return;
            }
            post_import_refreshed.set(true);
            spawn_local(async move {
                manifest_diff.set(crate::data::fetch_manifest_diff().await);
                integrity_report.set(crate::data::fetch_integrity_report().await);
                sqlite_parity.set(crate::data::fetch_sqlite_parity_report().await);
            });
        });
    }
}

fn render_import_status_rows(state: PwaStatusState) -> impl IntoView {
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

fn render_storage_rows(state: PwaStatusState) -> impl IntoView {
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

fn render_metadata_rows(state: PwaStatusState) -> impl IntoView {
    let sw_version = state.sw_version;
    let sw_activated_at = state.sw_activated_at;
    let ai_config_version = state.ai_config_version;
    let ai_config_generated_at = state.ai_config_generated_at;
    let embedding_sample_enabled = state.embedding_sample_enabled;
    let ai_config_status = state.ai_config_status;
    let ann_cap_override = state.ann_cap_override;
    let cache_entries = state.cache_entries;
    let update_state = state.update_state;

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
            {move || {
                update_state.get().map(|message| {
                    view! { <div class="pwa-status__row muted">{message}</div> }
                })
            }}
        </>
    }
}

fn render_network_rows(state: PwaStatusState) -> impl IntoView {
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
    if let Some(_ts) = state.sw_activated_at.get() {
        #[cfg(feature = "hydrate")]
        {
            parts.push(format_age("Activated", _ts, js_sys::Date::now()));
        }
    }
    if let Some(_ts) = state.previous_cache_cleaned_at.get() {
        #[cfg(feature = "hydrate")]
        {
            parts.push(format_age("Old caches cleaned", _ts, js_sys::Date::now()));
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

fn render_update_control_rows(state: PwaStatusState) -> impl IntoView {
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

fn render_export_row(state: PwaStatusState) -> impl IntoView {
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

fn render_last_checked_row(state: PwaStatusState) -> impl IntoView {
    let update_last_checked = state.update_last_checked;

    view! {
        <Show when=move || update_last_checked.get().is_some() fallback=|| ()>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    let ts = update_last_checked.get().unwrap_or(0.0);
                    let now = js_sys::Date::now();
                    let label = format_last_checked(ts, now);
                    view! { <div class="pwa-status__row muted">{label}</div> }
                }
                #[cfg(not(feature = "hydrate"))]
                {

                }
            }}
        </Show>
    }
}

fn render_update_ready_banner(state: PwaStatusState) -> impl IntoView {
    let update_ready = state.update_ready;
    let update_snoozed = state.update_snoozed;
    let update_version = state.update_version;
    let update_applying = state.update_applying;

    view! {
        {move || {
            if !update_ready.get() || update_snoozed.get() {
                return ().into_any();
            }

            let label = update_version
                .get()
                .map_or_else(|| "Update ready".to_string(), |version| {
                    format!("Update ready ({version})")
                });
            let state_for_reload = state.clone();
            let state_for_later = state.clone();

            view! {
                <div class="pwa-status__row pwa-status__row--update" role="status" aria-live="polite">
                    <div class="pwa-update-message">{label}</div>
                    <div class="pwa-update-actions">
                        <button
                            type="button"
                            class="pill"
                            on:click=move |_| action_update_click(state_for_reload.clone())
                            disabled=move || update_applying.get()
                        >
                            {move || if update_applying.get() { "Applying…" } else { "Reload" }}
                        </button>
                        <button
                            type="button"
                            class="pill pill--ghost"
                            on:click=move |_| action_update_later(state_for_later.clone())
                            disabled=move || update_applying.get()
                        >
                            "Later"
                        </button>
                    </div>
                </div>
            }
            .into_any()
        }}
    }
}

fn render_manifest_diff_notice(state: PwaStatusState) -> impl IntoView {
    let manifest_diff = state.manifest_diff;

    view! {
        <Show
            when=move || manifest_diff.get().is_some_and(|diff| diff.total_changed > 0)
            fallback=|| ()
        >
            {move || manifest_diff.get().map(|diff| {
                let items = diff.changed.iter().take(5).map(|entry| {
                    let sign = if entry.delta >= 0 { "+" } else { "" };
                    view! {
                        <li>{format!(
                            "{}: {}{} ({} → {})",
                            entry.name,
                            sign,
                            entry.delta,
                            entry.before,
                            entry.after
                        )}</li>
                    }
                });
                view! {
                    <div class="pwa-status__row pwa-status__row--update muted">
                        <div class="pwa-update-message">
                            {format!("Data changes detected (manifest v{})", diff.version)}
                        </div>
                        <ul class="list">{items.collect_view()}</ul>
                    </div>
                }
            })}
        </Show>
    }
}

fn render_integrity_notice(state: PwaStatusState) -> impl IntoView {
    let manifest_diff = state.manifest_diff;
    let integrity_report = state.integrity_report;
    let status = state.status;

    view! {
        <Show
            when=move || {
                let update_pending = manifest_diff.get().is_some_and(|diff| diff.total_changed > 0);
                integrity_report
                    .get()
                    .is_some_and(|report| report.total_mismatches > 0)
                    && status.get().done
                    && !update_pending
            }
            fallback=|| ()
        >
            {move || integrity_report.get().map(|report| {
                let items = report.mismatches.iter().take(5).map(|entry| {
                    view! {
                        <li>{format!(
                            "{}: {} expected / {} actual",
                            entry.store,
                            entry.expected,
                            entry.actual
                        )}</li>
                    }
                });
                view! {
                    <div class="pwa-status__row pwa-status__row--update" role="alert">
                        <div class="pwa-update-message">
                            {format!("Integrity mismatches detected ({})", report.total_mismatches)}
                        </div>
                        <ul class="list">{items.collect_view()}</ul>
                    </div>
                }
            })}
        </Show>
    }
}

fn render_update_error_notice(state: PwaStatusState) -> impl IntoView {
    let update_error = state.update_error;

    view! {
        <Show when=move || update_error.get().is_some() fallback=|| ()>
            {move || update_error.get().map(|message| {
                view! {
                    <div class="pwa-status__row pwa-status__row--update muted" role="alert">
                        {message}
                    </div>
                }
            })}
        </Show>
    }
}

fn render_sqlite_mismatch_notice(state: PwaStatusState) -> impl IntoView {
    let manifest_diff = state.manifest_diff;
    let sqlite_parity = state.sqlite_parity;
    let status = state.status;

    view! {
        <Show
            when=move || {
                let update_pending = manifest_diff.get().is_some_and(|diff| diff.total_changed > 0);
                sqlite_parity
                    .get()
                    .is_some_and(|report| report.available && report.total_mismatches > 0)
                    && status.get().done
                    && !update_pending
            }
            fallback=|| ()
        >
            {move || sqlite_parity.get().map(|report| {
                let items = report.mismatches.iter().take(5).map(|entry| {
                    view! {
                        <li>{format!(
                            "{} ({}) – IDB {} / SQLite {}",
                            entry.store,
                            entry.sqlite_table,
                            entry.idb_count,
                            entry.sqlite_count
                        )}</li>
                    }
                });
                view! {
                    <div class="pwa-status__row pwa-status__row--warn" role="alert">
                        <div class="pwa-update-message">
                            {format!("SQLite parity mismatches ({})", report.total_mismatches)}
                        </div>
                        <ul class="list">{items.collect_view()}</ul>
                    </div>
                }
            })}
        </Show>
    }
}

fn render_sqlite_failure_notice(state: PwaStatusState) -> impl IntoView {
    let manifest_diff = state.manifest_diff;
    let sqlite_parity = state.sqlite_parity;
    let status = state.status;

    view! {
        <Show
            when=move || {
                let update_pending = manifest_diff.get().is_some_and(|diff| diff.total_changed > 0);
                sqlite_parity
                    .get()
                    .is_some_and(|report| report.available && !report.idb_count_failures.is_empty())
                    && status.get().done
                    && !update_pending
            }
            fallback=|| ()
        >
            {move || sqlite_parity.get().map(|report| {
                let items = report.idb_count_failures.iter().take(5).map(|store| {
                    view! { <li>{store.clone()}</li> }
                });
                view! {
                    <div class="pwa-status__row pwa-status__row--warn" role="alert">
                        <div class="pwa-update-message">
                            {format!(
                                "SQLite parity check incomplete (could not count {} IDB stores)",
                                report.idb_count_failures.len()
                            )}
                        </div>
                        <ul class="list">{items.collect_view()}</ul>
                    </div>
                }
            })}
        </Show>
    }
}

fn render_snooze_row(state: PwaStatusState) -> impl IntoView {
    let update_snoozed = state.update_snoozed;
    let update_snooze_remaining = state.update_snooze_remaining;

    view! {
        <Show
            when=move || update_snoozed.get() && update_snooze_remaining.get().is_some()
            fallback=|| ()
        >
            {move || {
                let remaining = update_snooze_remaining.get().unwrap_or(0.0);
                let hours = remaining / (1000.0 * 60.0 * 60.0);
                view! {
                    <div class="pwa-status__row muted">
                        {format!("Update snoozed ({hours:.1}h remaining)")}
                    </div>
                }
            }}
        </Show>
    }
}

fn render_updated_version_row(state: PwaStatusState) -> impl IntoView {
    let update_version = state.update_version;

    view! {
        {move || {
            update_version.get().map(|version| {
                view! { <div class="pwa-status__row">{"Updated to "}{version}</div> }
            })
        }}
    }
}

fn render_update_notices(state: PwaStatusState) -> impl IntoView {
    view! {
        <>
            {render_last_checked_row(state.clone())}
            {render_update_ready_banner(state.clone())}
            {render_manifest_diff_notice(state.clone())}
            {render_integrity_notice(state.clone())}
            {render_update_error_notice(state.clone())}
            {render_sqlite_mismatch_notice(state.clone())}
            {render_sqlite_failure_notice(state.clone())}
            {render_snooze_row(state.clone())}
            {render_updated_version_row(state)}
        </>
    }
}

fn render_pwa_status(state: PwaStatusState) -> impl IntoView {
    view! {
        <aside class="pwa-status" aria-label="PWA status">
            <h2>"App Status"</h2>
            <p class="muted">"Offline availability, update state, cache health, and recovery actions."</p>
            {render_import_status_rows(state.clone())}
            {render_storage_rows(state.clone())}
            {render_metadata_rows(state.clone())}
            {render_network_rows(state.clone())}
            {render_update_control_rows(state.clone())}
            {render_export_row(state.clone())}
            {render_update_notices(state.clone())}
            <crate::components::AiStatus />
        </aside>
    }
}

#[component]
#[allow(clippy::must_use_candidate)]
#[must_use]
pub fn PwaStatus() -> impl IntoView {
    let state = PwaStatusState::new();
    initialize_pwa_status_state(state.clone());
    setup_post_import_refresh(state.clone());
    render_pwa_status(state)
}

#[cfg(test)]
mod tests {
    use super::{
        e2e_version_from_sw_script_url, remaining_snooze_ms, should_suppress_update_notice,
        UPDATE_SNOOZE_MS,
    };

    #[test]
    fn suppress_update_notice_within_snooze_window() {
        let now = 1_000_000.0;
        let last = now - (UPDATE_SNOOZE_MS / 2.0);
        assert!(should_suppress_update_notice(Some(last), now));
    }

    #[test]
    fn allow_update_notice_after_snooze_window() {
        let now = 1_000_000.0;
        let last = now - (UPDATE_SNOOZE_MS * 1.2);
        assert!(!should_suppress_update_notice(Some(last), now));
    }

    #[test]
    fn remaining_snooze_reports_time_left() {
        let now = 1_000_000.0;
        let last = now - (UPDATE_SNOOZE_MS / 2.0);
        let remaining = remaining_snooze_ms(Some(last), now).expect("remaining snooze missing");
        assert!(remaining > 0.0);
        assert!(remaining < UPDATE_SNOOZE_MS);
    }

    #[test]
    fn suppress_update_notice_with_clock_skew() {
        let now = 1_000_000.0;
        let last = now + 5_000.0;
        assert!(should_suppress_update_notice(Some(last), now));
    }

    #[test]
    fn remaining_snooze_none_after_window() {
        let now = 2_000_000.0;
        let last = now - (UPDATE_SNOOZE_MS * 2.0);
        assert!(remaining_snooze_ms(Some(last), now).is_none());
    }

    #[test]
    fn e2e_version_parser_handles_query_shapes() {
        assert_eq!(
            e2e_version_from_sw_script_url("/sw.js?e2e=build123"),
            Some("build123".to_string())
        );
        assert_eq!(
            e2e_version_from_sw_script_url("/sw.js?foo=1&e2e=build999&bar=2"),
            Some("build999".to_string())
        );
        assert_eq!(e2e_version_from_sw_script_url("/sw.js"), None);
    }
}
