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
// Used during cutover: delete CacheStorage entries created by the legacy JS app SW
// (which uses cache names like `dmb-shell-*`, `dmb-api-*`, etc). This prevents quota
// pressure and confusing "ghost" offline state after the Rust app takes over.
#[cfg(feature = "hydrate")]
const LEGACY_CACHE_CLEANED_AT_KEY: &str = "pwa_legacy_cache_cleaned_at";

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
fn is_legacy_cache_name(name: &str) -> bool {
    // Rust app SW caches are scoped with a distinct prefix.
    if name.starts_with("dmb-almanac-rs") {
        return false;
    }

    // Legacy JS app caches (see `app/static/sw.js` in the repo).
    let legacy_prefixes = [
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

    legacy_prefixes
        .iter()
        .any(|prefix| name.starts_with(prefix))
}

#[cfg(feature = "hydrate")]
async fn cleanup_legacy_caches() -> Option<usize> {
    use wasm_bindgen::JsCast;
    use wasm_bindgen_futures::JsFuture;

    let window = web_sys::window()?;
    let cache_storage = window.caches().ok()?;
    let keys_value = JsFuture::from(cache_storage.keys()).await.ok()?;
    let keys: js_sys::Array = keys_value.dyn_into().ok()?;

    let mut deleted = 0usize;
    for key in keys.iter() {
        let name = key.as_string().unwrap_or_default();
        if !is_legacy_cache_name(&name) {
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
        .map(|tail| tail.to_string())
        .unwrap_or_else(|| url.to_string())
}

#[cfg(feature = "hydrate")]
fn set_sw_action_status(sw_action_status: RwSignal<Option<String>>, message: &str) {
    use wasm_bindgen::closure::Closure;
    use wasm_bindgen::JsCast;

    sw_action_status.set(Some(message.to_string()));
    let Some(window) = web_sys::window() else {
        return;
    };
    let sw_action_status = sw_action_status.clone();
    let cb = Closure::once(move || {
        sw_action_status.set(None);
    });
    let _ = window
        .set_timeout_with_callback_and_timeout_and_arguments_0(cb.as_ref().unchecked_ref(), 5000);
    cb.forget();
}

#[component]
pub fn PwaStatus() -> impl IntoView {
    let status = RwSignal::new(ImportStatus {
        message: "Checking offline data…".to_string(),
        ..Default::default()
    });
    let storage = RwSignal::new(None::<StorageInfo>);
    let online = RwSignal::new(true);
    let update_ready = RwSignal::new(false);
    let update_version = RwSignal::new(None::<String>);
    let update_snoozed = RwSignal::new(false);
    let update_snooze_remaining = RwSignal::new(None::<f64>);
    let update_checking = RwSignal::new(false);
    let update_last_checked = RwSignal::new(None::<f64>);
    let update_state = RwSignal::new(None::<String>);
    let update_applying = RwSignal::new(false);
    let update_error = RwSignal::new(None::<String>);
    let sw_version = RwSignal::new(None::<String>);
    let sw_activated_at = RwSignal::new(None::<f64>);
    let sw_controller_url = RwSignal::new(None::<String>);
    let sw_controller_state = RwSignal::new(None::<String>);
    let sw_controller_impl = RwSignal::new(None::<String>);
    let sw_controller_cache_prefix = RwSignal::new(None::<String>);
    let sw_scope = RwSignal::new(None::<String>);
    let legacy_cache_cleaned_at = RwSignal::new(None::<f64>);
    let legacy_cache_cleanup = RwSignal::new(None::<String>);
    let cache_entries = RwSignal::new(None::<usize>);
    let storage_warning = RwSignal::new(None::<String>);
    let ann_cap_override = RwSignal::new(None::<u64>);
    let ai_config_version = RwSignal::new(None::<String>);
    let ai_config_generated_at = RwSignal::new(None::<String>);
    let embedding_sample_enabled = RwSignal::new(None::<bool>);
    let ai_config_status = RwSignal::new(None::<String>);
    let manifest_diff = RwSignal::new(None::<crate::data::ManifestDiff>);
    let integrity_report = RwSignal::new(None::<crate::data::IntegrityReport>);
    let sqlite_parity = RwSignal::new(None::<crate::data::SqliteParityReport>);
    let show_sw_details = RwSignal::new(false);
    let sw_action_status = RwSignal::new(None::<String>);
    let on_export_parity = {
        #[cfg(feature = "hydrate")]
        {
            let sw_version = sw_version.clone();
            let sw_activated_at = sw_activated_at.clone();
            let manifest_diff = manifest_diff.clone();
            let integrity_report = integrity_report.clone();
            let sqlite_parity = sqlite_parity.clone();
            move |_| {
                spawn_local(async move {
                    use wasm_bindgen::JsCast;
                    let payload = serde_json::json!({
                        "generatedAtMs": js_sys::Date::now(),
                        "sw": {
                            "version": sw_version.get_untracked(),
                            "activatedAtMs": sw_activated_at.get_untracked(),
                        },
                        "manifestDiff": manifest_diff.get_untracked().map(|diff| serde_json::json!({
                            "version": diff.version,
                            "totalChanged": diff.total_changed,
                            "changed": diff.changed.iter().map(|e| serde_json::json!({
                                "name": e.name,
                                "before": e.before,
                                "after": e.after,
                                "delta": e.delta,
                            })).collect::<Vec<_>>(),
                        })),
                        "integrityReport": integrity_report.get_untracked().map(|report| serde_json::json!({
                            "totalMismatches": report.total_mismatches,
                            "mismatches": report.mismatches.iter().map(|e| serde_json::json!({
                                "store": e.store,
                                "expected": e.expected,
                                "actual": e.actual,
                            })).collect::<Vec<_>>(),
                        })),
                        "sqliteParity": sqlite_parity.get_untracked().map(|report| serde_json::json!({
                            "available": report.available,
                            "totalMismatches": report.total_mismatches,
                            "missingTables": report.missing_tables,
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
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let on_update_click = {
        #[cfg(feature = "hydrate")]
        {
            let update_state = update_state.clone();
            let update_applying = update_applying.clone();
            let update_error = update_error.clone();
            let update_ready = update_ready.clone();
            move |_| {
                update_applying.set(true);
                update_error.set(None);
                update_state.set(Some("Applying update…".to_string()));
                spawn_local(async move {
                    use wasm_bindgen_futures::JsFuture;
                    if let Some(window) = web_sys::window() {
                        let container = window.navigator().service_worker();
                        if let Ok(reg_val) = JsFuture::from(container.get_registration()).await {
                            if let Ok(reg) =
                                reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>()
                            {
                                if let Some(worker) = reg.waiting() {
                                    let msg = js_sys::Object::new();
                                    let _ = js_sys::Reflect::set(
                                        &msg,
                                        &JsValue::from_str("type"),
                                        &JsValue::from_str("SKIP_WAITING"),
                                    );
                                    let _ = worker.post_message(&msg);
                                } else {
                                    update_error.set(Some(
                                        "No waiting service worker. Try again in a moment."
                                            .to_string(),
                                    ));
                                    update_applying.set(false);
                                    update_state.set(None);
                                    update_ready.set(false);
                                    return;
                                }
                            }
                        }
                        let container = window.navigator().service_worker();
                        let update_state_inner = update_state.clone();
                        let update_applying_inner = update_applying.clone();
                        let window_reload = window.clone();
                        let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                            update_state_inner.set(Some("Reloading…".to_string()));
                            update_applying_inner.set(false);
                            let _ = window_reload.location().reload();
                        })
                            as Box<dyn Fn()>);
                        container
                            .add_event_listener_with_callback(
                                "controllerchange",
                                cb.as_ref().unchecked_ref(),
                            )
                            .ok();
                        cb.forget();
                        let update_state_inner = update_state.clone();
                        let update_applying_inner = update_applying.clone();
                        let update_error_inner = update_error.clone();
                        let window_reload = window.clone();
                        let timeout_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                            update_state_inner.set(Some("Reloading…".to_string()));
                            update_applying_inner.set(false);
                            if let Err(err) = window_reload.location().reload() {
                                update_error_inner.set(Some(format!(
                                    "Reload blocked: {:?}. Please refresh manually.",
                                    err
                                )));
                            }
                        })
                            as Box<dyn Fn()>);
                        let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
                            timeout_cb.as_ref().unchecked_ref(),
                            1500,
                        );
                        timeout_cb.forget();
                    }
                });
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let on_update_later = {
        #[cfg(feature = "hydrate")]
        {
            let update_ready = update_ready.clone();
            let update_snoozed = update_snoozed.clone();
            move |_| {
                if let Some(window) = web_sys::window() {
                    if let Ok(Some(storage)) = window.local_storage() {
                        let now = js_sys::Date::now();
                        let _ = storage.set_item("pwa_update_dismissed_at", &now.to_string());
                    }
                }
                update_snoozed.set(true);
                update_ready.set(false);
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let on_update_check = {
        #[cfg(feature = "hydrate")]
        {
            let update_checking = update_checking.clone();
            let update_last_checked = update_last_checked.clone();
            let update_state = update_state.clone();
            let update_ready = update_ready.clone();
            let update_error = update_error.clone();
            move |_| {
                update_checking.set(true);
                update_state.set(Some("Checking for updates…".to_string()));
                spawn_local(async move {
                    use wasm_bindgen_futures::JsFuture;
                    if let Some(window) = web_sys::window() {
                        let container = window.navigator().service_worker();
                        if let Ok(reg_val) = JsFuture::from(container.get_registration()).await {
                            if let Ok(reg) =
                                reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>()
                            {
                                if let Ok(promise) = reg.update() {
                                    let _ = JsFuture::from(promise).await;
                                }
                            }
                        }
                        let now = js_sys::Date::now();
                        if let Ok(Some(storage)) = window.local_storage() {
                            let _ = storage.set_item(UPDATE_CHECKED_AT_KEY, &now.to_string());
                        }
                        update_last_checked.set(Some(now));
                    }
                    update_checking.set(false);
                    if !update_ready.get_untracked() && update_error.get_untracked().is_none() {
                        update_state.set(Some("No update found.".to_string()));
                        if let Some(window) = web_sys::window() {
                            let update_state_inner = update_state.clone();
                            let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                                if update_state_inner.get_untracked().as_deref()
                                    == Some("No update found.")
                                {
                                    update_state_inner.set(None);
                                }
                            })
                                as Box<dyn Fn()>);
                            let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
                                cb.as_ref().unchecked_ref(),
                                2500,
                            );
                            cb.forget();
                        }
                    } else {
                        update_state.set(None);
                    }
                });
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let on_storage_cleanup = {
        #[cfg(feature = "hydrate")]
        {
            let storage_warning = storage_warning.clone();
            move |_| {
                spawn_local(async move {
                    let _ = crate::data::handle_storage_pressure().await;
                    storage_warning.set(Some(
                        "Cleared AI cache to relieve storage pressure.".to_string(),
                    ));
                });
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let on_cleanup_legacy_caches = {
        #[cfg(feature = "hydrate")]
        {
            let legacy_cache_cleanup = legacy_cache_cleanup.clone();
            let legacy_cache_cleaned_at = legacy_cache_cleaned_at.clone();
            let cache_entries = cache_entries.clone();
            move |_| {
                legacy_cache_cleanup.set(Some("Cleaning legacy caches…".to_string()));
                spawn_local(async move {
                    let deleted = cleanup_legacy_caches().await.unwrap_or(0);
                    let now = js_sys::Date::now();

                    if let Some(window) = web_sys::window() {
                        if let Ok(Some(storage)) = window.local_storage() {
                            let _ = storage.set_item(LEGACY_CACHE_CLEANED_AT_KEY, &now.to_string());
                        }
                    }
                    legacy_cache_cleaned_at.set(Some(now));
                    cache_entries.set(count_cache_entries().await);

                    let msg = if deleted == 0 {
                        "Legacy caches: none found.".to_string()
                    } else if deleted == 1 {
                        "Legacy caches: removed 1 cache.".to_string()
                    } else {
                        format!("Legacy caches: removed {deleted} caches.")
                    };
                    legacy_cache_cleanup.set(Some(msg));

                    if let Some(window) = web_sys::window() {
                        let legacy_cache_cleanup = legacy_cache_cleanup.clone();
                        let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                            let current = legacy_cache_cleanup.get_untracked();
                            if current
                                .as_deref()
                                .map(|v| v.starts_with("Legacy caches:"))
                                .unwrap_or(false)
                            {
                                legacy_cache_cleanup.set(None);
                            }
                        })
                            as Box<dyn Fn()>);
                        let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
                            cb.as_ref().unchecked_ref(),
                            4500,
                        );
                        cb.forget();
                    }
                });
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let on_ping_sw = {
        #[cfg(feature = "hydrate")]
        {
            let sw_action_status = sw_action_status.clone();
            move |_| {
                set_sw_action_status(sw_action_status, "Pinging service worker…");
                spawn_local(async move {
                    use wasm_bindgen_futures::JsFuture;

                    let Some(window) = web_sys::window() else {
                        set_sw_action_status(sw_action_status, "No window");
                        return;
                    };
                    let container = window.navigator().service_worker();
                    let Some(controller) = container.controller() else {
                        set_sw_action_status(sw_action_status, "No SW controller yet.");
                        return;
                    };

                    if let Ok(reg_val) = JsFuture::from(container.get_registration()).await {
                        if let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() {
                            if reg.waiting().is_some() {
                                // Helpful hint: if there's a waiting worker, pinging may not
                                // reflect the soon-to-be active controller until reload.
                                set_sw_action_status(
                                    sw_action_status,
                                    "Ping sent (note: update is waiting).",
                                );
                            }
                        }
                    }

                    let msg = js_sys::Object::new();
                    let _ = js_sys::Reflect::set(
                        &msg,
                        &JsValue::from_str("type"),
                        &JsValue::from_str("PING"),
                    );
                    let _ = controller.post_message(&msg);
                });
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let on_unregister_sw = {
        #[cfg(feature = "hydrate")]
        {
            let sw_action_status = sw_action_status.clone();
            move |_| {
                set_sw_action_status(sw_action_status, "Unregistering service worker…");
                spawn_local(async move {
                    use wasm_bindgen_futures::JsFuture;

                    let Some(window) = web_sys::window() else {
                        set_sw_action_status(sw_action_status, "No window");
                        return;
                    };
                    let container = window.navigator().service_worker();
                    let Ok(reg_val) = JsFuture::from(container.get_registration()).await else {
                        set_sw_action_status(sw_action_status, "No SW registration found.");
                        return;
                    };
                    let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() else {
                        set_sw_action_status(sw_action_status, "No SW registration found.");
                        return;
                    };

                    let promise = match reg.unregister() {
                        Ok(promise) => promise,
                        Err(err) => {
                            set_sw_action_status(
                                sw_action_status,
                                &format!("SW unregister failed: {err:?}"),
                            );
                            return;
                        }
                    };
                    let unregistered = match JsFuture::from(promise).await {
                        Ok(value) => value.as_bool().unwrap_or(true),
                        Err(err) => {
                            set_sw_action_status(
                                sw_action_status,
                                &format!("SW unregister failed: {err:?}"),
                            );
                            return;
                        }
                    };
                    if !unregistered {
                        set_sw_action_status(sw_action_status, "SW unregister returned false.");
                        return;
                    }

                    if let Ok(Some(storage)) = window.local_storage() {
                        let _ = storage.remove_item(SW_VERSION_KEY);
                        let _ = storage.remove_item(SW_ACTIVATED_AT_KEY);
                        let _ = storage.remove_item("pwa_update_dismissed_at");
                    }

                    set_sw_action_status(sw_action_status, "SW unregistered. Reloading…");
                    let _ = window.location().reload();
                });
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let on_reset_data = {
        #[cfg(feature = "hydrate")]
        {
            move |_| {
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
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };

    #[cfg(feature = "hydrate")]
    {
        // Defer all client-only reads (localStorage, navigator/service worker) until after the
        // initial hydration pass, otherwise returning users can trip a tachys hydration panic.
        let status = status.clone();
        let storage = storage.clone();
        let online = online.clone();
        let update_ready = update_ready.clone();
        let update_version = update_version.clone();
        let update_snoozed = update_snoozed.clone();
        let update_snooze_remaining = update_snooze_remaining.clone();
        let update_checking = update_checking.clone();
        let update_last_checked = update_last_checked.clone();
        let update_state = update_state.clone();
        let update_applying = update_applying.clone();
        let update_error = update_error.clone();
        let sw_version = sw_version.clone();
        let sw_activated_at = sw_activated_at.clone();
        let sw_controller_url = sw_controller_url.clone();
        let sw_controller_state = sw_controller_state.clone();
        let sw_controller_impl = sw_controller_impl.clone();
        let sw_controller_cache_prefix = sw_controller_cache_prefix.clone();
        let sw_scope = sw_scope.clone();
        let sw_action_status = sw_action_status.clone();
        let legacy_cache_cleaned_at = legacy_cache_cleaned_at.clone();
        let cache_entries = cache_entries.clone();
        let storage_warning = storage_warning.clone();
        let ann_cap_override = ann_cap_override.clone();
        let ai_config_version = ai_config_version.clone();
        let ai_config_generated_at = ai_config_generated_at.clone();
        let embedding_sample_enabled = embedding_sample_enabled.clone();
        let ai_config_status = ai_config_status.clone();
        let manifest_diff = manifest_diff.clone();
        let integrity_report = integrity_report.clone();
        let sqlite_parity = sqlite_parity.clone();

        request_animation_frame(move || {
            let update_ready_signal = update_ready.clone();
            let update_snoozed_signal = update_snoozed.clone();
            let update_snooze_remaining_signal = update_snooze_remaining.clone();
            let update_notice_suppressed = move || {
                if let Some(window) = web_sys::window() {
                    if let Ok(Some(storage)) = window.local_storage() {
                        if let Ok(Some(value)) = storage.get_item("pwa_update_dismissed_at") {
                            if let Ok(ts) = value.parse::<f64>() {
                                let now = js_sys::Date::now();
                                let remaining = remaining_snooze_ms(Some(ts), now);
                                update_snooze_remaining_signal.set(remaining);
                                return should_suppress_update_notice(Some(ts), now);
                            }
                        }
                    }
                }
                update_snooze_remaining_signal.set(None);
                false
            };
            update_snoozed_signal.set(update_notice_suppressed());
            if let Some(window) = web_sys::window() {
                if let Ok(Some(storage)) = window.local_storage() {
                    if let Ok(Some(value)) = storage.get_item(UPDATE_CHECKED_AT_KEY) {
                        if let Ok(ts) = value.parse::<f64>() {
                            update_last_checked.set(Some(ts));
                        }
                    }
                    if let Ok(Some(version)) = storage.get_item(SW_VERSION_KEY) {
                        sw_version.set(Some(version));
                    }
                    if let Ok(Some(ts)) = storage.get_item(SW_ACTIVATED_AT_KEY) {
                        if let Ok(value) = ts.parse::<f64>() {
                            sw_activated_at.set(Some(value));
                        }
                    }
                    if let Ok(Some(ts)) = storage.get_item(LEGACY_CACHE_CLEANED_AT_KEY) {
                        if let Ok(value) = ts.parse::<f64>() {
                            legacy_cache_cleaned_at.set(Some(value));
                        }
                    }
                    if let Ok(Some(version)) = storage.get_item("dmb-ai-config-version") {
                        ai_config_version.set(Some(version));
                    }
                    if let Ok(Some(generated_at)) = storage.get_item("dmb-ai-config-generated-at") {
                        ai_config_generated_at.set(Some(generated_at));
                    }
                    if let Ok(Some(sample)) = storage.get_item("dmb-embedding-sample") {
                        embedding_sample_enabled.set(Some(sample == "1"));
                    }
                }
            }
            ann_cap_override.set(crate::ai::ann_cap_override_mb());

            let status_signal = status.clone();
            spawn_local(async move {
                crate::data::ensure_seed_data(status_signal).await;
            });

            let storage_signal = storage.clone();
            let storage_warning_signal = storage_warning.clone();
            spawn_local(async move {
                let info = crate::data::estimate_storage().await;
                storage_signal.set(info);
                let cleared = crate::data::handle_storage_pressure()
                    .await
                    .unwrap_or(false);
                if cleared {
                    storage_warning_signal.set(Some(
                        "Cleared AI cache to relieve storage pressure.".to_string(),
                    ));
                }
            });

            let cache_entries_signal = cache_entries.clone();
            spawn_local(async move {
                cache_entries_signal.set(count_cache_entries().await);
            });

            let manifest_diff_signal = manifest_diff.clone();
            spawn_local(async move {
                manifest_diff_signal.set(crate::data::fetch_manifest_diff().await);
            });

            let integrity_report_signal = integrity_report.clone();
            spawn_local(async move {
                integrity_report_signal.set(crate::data::fetch_integrity_report().await);
            });

            let sqlite_parity_signal = sqlite_parity.clone();
            spawn_local(async move {
                sqlite_parity_signal.set(crate::data::fetch_sqlite_parity_report().await);
            });

            let ai_status_signal = ai_config_status.clone();
            let local_version = ai_config_version.clone();
            let local_generated_at = ai_config_generated_at.clone();
            spawn_local(async move {
                if let Some(remote) = crate::ai::fetch_ai_config_meta().await {
                    let local_v = local_version.get_untracked();
                    let local_g = local_generated_at.get_untracked();
                    if remote.version != local_v || remote.generated_at != local_g {
                        let msg = format!(
                            "AI config mismatch: remote {} @ {}.",
                            remote.version.unwrap_or_else(|| "n/a".to_string()),
                            remote.generated_at.unwrap_or_else(|| "n/a".to_string())
                        );
                        ai_status_signal.set(Some(msg));
                    }
                }
            });

            let update_signal = update_ready.clone();
            let update_version_signal = update_version.clone();
            let update_checking_signal = update_checking.clone();
            let update_state_signal = update_state.clone();
            let update_error_signal = update_error.clone();
            let update_applying_signal = update_applying.clone();
            let sw_version_signal = sw_version.clone();
            let sw_activated_at_signal = sw_activated_at.clone();
            let sw_controller_url_signal = sw_controller_url.clone();
            let sw_controller_state_signal = sw_controller_state.clone();
            let sw_controller_impl_signal = sw_controller_impl.clone();
            let sw_controller_cache_prefix_signal = sw_controller_cache_prefix.clone();
            let sw_scope_signal = sw_scope.clone();
            let sw_action_status_signal = sw_action_status.clone();
            let legacy_cache_cleaned_at_signal = legacy_cache_cleaned_at.clone();
            let cache_entries_signal = cache_entries.clone();
            let update_last_checked_signal = update_last_checked.clone();
            spawn_local(async move {
                use wasm_bindgen_futures::JsFuture;
                if let Some(window) = web_sys::window() {
                    let container = window.navigator().service_worker();
                    let has_controller = container.controller().is_some();
                    if let Some(controller) = container.controller() {
                        sw_controller_url_signal.set(Some(controller.script_url()));
                        sw_controller_state_signal.set(sw_state(&controller));

                        // Reset impl metadata and ping the controller to identify it.
                        sw_controller_impl_signal.set(None);
                        sw_controller_cache_prefix_signal.set(None);
                        let msg = js_sys::Object::new();
                        let _ = js_sys::Reflect::set(
                            &msg,
                            &JsValue::from_str("type"),
                            &JsValue::from_str("PING"),
                        );
                        let _ = controller.post_message(&msg);
                        sw_action_status_signal.set(None);
                    } else {
                        sw_controller_url_signal.set(None);
                        sw_controller_state_signal.set(None);
                        sw_controller_impl_signal.set(None);
                        sw_controller_cache_prefix_signal.set(None);
                    }
                    if let Ok(reg_val) = JsFuture::from(container.get_registration()).await {
                        if let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() {
                            sw_scope_signal.set(Some(reg.scope()));
                            if reg.waiting().is_some() {
                                if has_controller && !update_notice_suppressed() {
                                    update_signal.set(true);
                                    update_state_signal
                                        .set(Some("Update ready to install.".to_string()));
                                }
                                update_error_signal.set(None);
                                update_applying_signal.set(false);
                                update_checking_signal.set(false);
                            }
                            if let Some(worker) = reg.installing() {
                                let update_signal_inner = update_signal.clone();
                                let update_checking_inner = update_checking_signal.clone();
                                let update_state_inner = update_state_signal.clone();
                                let update_error_inner = update_error_signal.clone();
                                let update_applying_inner = update_applying_signal.clone();
                                let reg_for_state = reg.clone();
                                let worker_state = worker.clone();
                                let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                                    let state = js_sys::Reflect::get(
                                        worker_state.as_ref(),
                                        &wasm_bindgen::JsValue::from_str("state"),
                                    )
                                    .ok()
                                    .and_then(|v| v.as_string());
                                    if let Some(state) = state.as_deref() {
                                        update_state_inner.set(Some(format!("Update {state}…")));
                                        if state == "installed" {
                                            let waiting = reg_for_state.waiting().is_some();
                                            if has_sw_controller()
                                                && waiting
                                                && !update_notice_suppressed()
                                            {
                                                update_signal_inner.set(true);
                                                update_state_inner.set(Some(
                                                    "Update ready to install.".to_string(),
                                                ));
                                            }
                                            update_error_inner.set(None);
                                            update_applying_inner.set(false);
                                            update_checking_inner.set(false);
                                        }
                                    }
                                })
                                    as Box<dyn Fn()>);
                                worker
                                    .add_event_listener_with_callback(
                                        "statechange",
                                        cb.as_ref().unchecked_ref(),
                                    )
                                    .ok();
                                cb.forget();
                            }
                            let update_signal_inner = update_signal.clone();
                            let update_checking_inner = update_checking_signal.clone();
                            let update_state_inner = update_state_signal.clone();
                            let update_error_inner = update_error_signal.clone();
                            let update_applying_inner = update_applying_signal.clone();
                            let reg_for_updatefound = reg.clone();
                            let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                                update_checking_inner.set(true);
                                update_state_inner.set(Some("Downloading update…".to_string()));
                                update_error_inner.set(None);
                                update_applying_inner.set(false);
                                update_signal_inner.set(false);

                                if let Some(worker) = reg_for_updatefound.installing() {
                                    let update_signal_state = update_signal_inner.clone();
                                    let update_checking_state = update_checking_inner.clone();
                                    let update_state_state = update_state_inner.clone();
                                    let update_error_state = update_error_inner.clone();
                                    let update_applying_state = update_applying_inner.clone();
                                    let reg_for_state = reg_for_updatefound.clone();
                                    let worker_state = worker.clone();
                                    let cb =
                                        wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                                            let state = js_sys::Reflect::get(
                                                worker_state.as_ref(),
                                                &wasm_bindgen::JsValue::from_str("state"),
                                            )
                                            .ok()
                                            .and_then(|v| v.as_string());
                                            if let Some(state) = state.as_deref() {
                                                update_state_state
                                                    .set(Some(format!("Update {state}…")));
                                                if state == "installed" {
                                                    let waiting = reg_for_state.waiting().is_some();
                                                    if has_sw_controller()
                                                        && waiting
                                                        && !update_notice_suppressed()
                                                    {
                                                        update_signal_state.set(true);
                                                        update_state_state.set(Some(
                                                            "Update ready to install.".to_string(),
                                                        ));
                                                    }
                                                    update_error_state.set(None);
                                                    update_applying_state.set(false);
                                                    update_checking_state.set(false);
                                                }
                                            }
                                        })
                                            as Box<dyn Fn()>);
                                    worker
                                        .add_event_listener_with_callback(
                                            "statechange",
                                            cb.as_ref().unchecked_ref(),
                                        )
                                        .ok();
                                    cb.forget();
                                }
                            })
                                as Box<dyn Fn()>);
                            reg.add_event_listener_with_callback(
                                "updatefound",
                                cb.as_ref().unchecked_ref(),
                            )
                            .ok();
                            cb.forget();

                            // Silent periodic revalidation: avoids stale `/pkg/*` bundles sticking
                            // around for hours when users keep a tab open.
                            if window.navigator().on_line() {
                                let now = js_sys::Date::now();
                                let mut should_check = true;
                                if let Ok(Some(storage)) = window.local_storage() {
                                    if let Ok(Some(value)) = storage.get_item(UPDATE_CHECKED_AT_KEY)
                                    {
                                        if let Ok(ts) = value.parse::<f64>() {
                                            if now > ts
                                                && (now - ts) < AUTO_UPDATE_CHECK_INTERVAL_MS
                                            {
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
                                        let _ = storage
                                            .set_item(UPDATE_CHECKED_AT_KEY, &now.to_string());
                                    }
                                    update_last_checked_signal.set(Some(now));
                                }
                            }

                            // One-time cleanup for legacy CacheStorage entries left behind by the JS app.
                            // Keeps users from hitting quota limits during the Rust cutover.
                            if has_controller && window.navigator().on_line() {
                                let now = js_sys::Date::now();
                                let mut should_cleanup = true;
                                if let Ok(Some(storage)) = window.local_storage() {
                                    if storage
                                        .get_item(LEGACY_CACHE_CLEANED_AT_KEY)
                                        .ok()
                                        .flatten()
                                        .is_some()
                                    {
                                        should_cleanup = false;
                                    }
                                }
                                if should_cleanup {
                                    let _ = cleanup_legacy_caches().await;
                                    if let Ok(Some(storage)) = window.local_storage() {
                                        let _ = storage.set_item(
                                            LEGACY_CACHE_CLEANED_AT_KEY,
                                            &now.to_string(),
                                        );
                                    }
                                    legacy_cache_cleaned_at_signal.set(Some(now));
                                    cache_entries_signal.set(count_cache_entries().await);
                                }
                            }
                        }
                    }
                    let update_signal = update_signal.clone();
                    let update_version_signal = update_version_signal.clone();
                    let sw_version_signal = sw_version_signal.clone();
                    let sw_activated_at_signal = sw_activated_at_signal.clone();
                    let cache_entries_signal = cache_entries_signal.clone();
                    let update_state_signal = update_state_signal.clone();
                    let update_error_signal = update_error_signal.clone();
                    let update_applying_signal = update_applying_signal.clone();
                    let sw_controller_impl_signal = sw_controller_impl_signal.clone();
                    let sw_controller_cache_prefix_signal =
                        sw_controller_cache_prefix_signal.clone();
                    let sw_action_status_signal = sw_action_status_signal.clone();
                    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(
                        move |event: web_sys::MessageEvent| {
                            if let Some(data) = event.data().as_string() {
                                if let Ok(payload) =
                                    serde_json::from_str::<serde_json::Value>(&data)
                                {
                                    if payload.get("type").and_then(|v| v.as_str()) == Some("PONG")
                                    {
                                        if let Some(impl_name) =
                                            payload.get("impl").and_then(|v| v.as_str())
                                        {
                                            sw_controller_impl_signal
                                                .set(Some(impl_name.to_string()));
                                        }
                                        if let Some(version) =
                                            payload.get("version").and_then(|v| v.as_str())
                                        {
                                            sw_version_signal.set(Some(version.to_string()));
                                            if let Some(window) = web_sys::window() {
                                                if let Ok(Some(storage)) = window.local_storage() {
                                                    let _ = storage.set_item(SW_VERSION_KEY, version);
                                                }
                                            }
                                        }
                                        if let Some(prefix) =
                                            payload.get("cachePrefix").and_then(|v| v.as_str())
                                        {
                                            sw_controller_cache_prefix_signal
                                                .set(Some(prefix.to_string()));
                                        }
                                        set_sw_action_status(
                                            sw_action_status_signal,
                                            "Service worker responded to ping.",
                                        );
                                    } else if payload.get("type").and_then(|v| v.as_str())
                                        == Some("SW_ACTIVATED")
                                    {
                                        if let Some(version) =
                                            payload.get("version").and_then(|v| v.as_str())
                                        {
                                            update_version_signal.set(Some(version.to_string()));
                                            sw_version_signal.set(Some(version.to_string()));
                                            if let Some(window) = web_sys::window() {
                                                if let Ok(Some(storage)) = window.local_storage() {
                                                    let _ =
                                                        storage.set_item(SW_VERSION_KEY, version);
                                                }
                                            }
                                        }
                                        let now = js_sys::Date::now();
                                        sw_activated_at_signal.set(Some(now));
                                        if let Some(window) = web_sys::window() {
                                            if let Ok(Some(storage)) = window.local_storage() {
                                                let _ = storage.set_item(
                                                    SW_ACTIVATED_AT_KEY,
                                                    &now.to_string(),
                                                );
                                            }
                                        }
                                        update_signal.set(false);
                                        update_state_signal.set(None);
                                        update_error_signal.set(None);
                                        update_applying_signal.set(false);
                                        if let Some(window) = web_sys::window() {
                                            if let Ok(Some(storage)) = window.local_storage() {
                                                let _ =
                                                    storage.remove_item("pwa_update_dismissed_at");
                                            }
                                        }
                                        update_ready_signal.set(false);
                                        update_snoozed_signal.set(false);
                                        spawn_local(async move {
                                            cache_entries_signal.set(count_cache_entries().await);
                                        });
                                    } else if payload.get("type").and_then(|v| v.as_str())
                                        == Some("SW_INSTALLED")
                                    {
                                        if let Some(version) =
                                            payload.get("version").and_then(|v| v.as_str())
                                        {
                                            let current = sw_version_signal.get_untracked();
                                            if current.as_deref() != Some(version)
                                                && current.is_some()
                                            {
                                                update_version_signal
                                                    .set(Some(version.to_string()));
                                                if !update_notice_suppressed() {
                                                    update_signal.set(true);
                                                    update_state_signal.set(Some(
                                                        "Update ready to install.".to_string(),
                                                    ));
                                                }
                                                update_error_signal.set(None);
                                                update_applying_signal.set(false);
                                            }
                                        }
                                    }
                                }
                            } else if let Ok(payload) =
                                serde_wasm_bindgen::from_value::<serde_json::Value>(event.data())
                            {
                                if payload.get("type").and_then(|v| v.as_str()) == Some("PONG") {
                                    if let Some(impl_name) =
                                        payload.get("impl").and_then(|v| v.as_str())
                                    {
                                        sw_controller_impl_signal.set(Some(impl_name.to_string()));
                                    }
                                    if let Some(version) =
                                        payload.get("version").and_then(|v| v.as_str())
                                    {
                                        sw_version_signal.set(Some(version.to_string()));
                                        if let Some(window) = web_sys::window() {
                                            if let Ok(Some(storage)) = window.local_storage() {
                                                let _ = storage.set_item(SW_VERSION_KEY, version);
                                            }
                                        }
                                    }
                                    if let Some(prefix) =
                                        payload.get("cachePrefix").and_then(|v| v.as_str())
                                    {
                                        sw_controller_cache_prefix_signal
                                            .set(Some(prefix.to_string()));
                                    }
                                    set_sw_action_status(
                                        sw_action_status_signal,
                                        "Service worker responded to ping.",
                                    );
                                } else if payload.get("type").and_then(|v| v.as_str())
                                    == Some("SW_ACTIVATED")
                                {
                                    if let Some(version) =
                                        payload.get("version").and_then(|v| v.as_str())
                                    {
                                        update_version_signal.set(Some(version.to_string()));
                                        sw_version_signal.set(Some(version.to_string()));
                                        if let Some(window) = web_sys::window() {
                                            if let Ok(Some(storage)) = window.local_storage() {
                                                let _ = storage.set_item(SW_VERSION_KEY, version);
                                            }
                                        }
                                    }
                                    let now = js_sys::Date::now();
                                    sw_activated_at_signal.set(Some(now));
                                    if let Some(window) = web_sys::window() {
                                        if let Ok(Some(storage)) = window.local_storage() {
                                            let _ = storage
                                                .set_item(SW_ACTIVATED_AT_KEY, &now.to_string());
                                        }
                                    }
                                    update_signal.set(false);
                                    update_state_signal.set(None);
                                    update_error_signal.set(None);
                                    update_applying_signal.set(false);
                                    if let Some(window) = web_sys::window() {
                                        if let Ok(Some(storage)) = window.local_storage() {
                                            let _ = storage.remove_item("pwa_update_dismissed_at");
                                        }
                                    }
                                    update_ready_signal.set(false);
                                    update_snoozed_signal.set(false);
                                    spawn_local(async move {
                                        cache_entries_signal.set(count_cache_entries().await);
                                    });
                                } else if payload.get("type").and_then(|v| v.as_str())
                                    == Some("SW_INSTALLED")
                                {
                                    if let Some(version) =
                                        payload.get("version").and_then(|v| v.as_str())
                                    {
                                        let current = sw_version_signal.get_untracked();
                                        if current.as_deref() != Some(version) && current.is_some()
                                        {
                                            update_version_signal.set(Some(version.to_string()));
                                            if !update_notice_suppressed() {
                                                update_signal.set(true);
                                                update_state_signal.set(Some(
                                                    "Update ready to install.".to_string(),
                                                ));
                                            }
                                            update_error_signal.set(None);
                                            update_applying_signal.set(false);
                                        }
                                    }
                                }
                            }
                        },
                    )
                        as Box<dyn FnMut(web_sys::MessageEvent)>);
                    container
                        .add_event_listener_with_callback("message", cb.as_ref().unchecked_ref())
                        .ok();
                    cb.forget();
                }
            });

            if let Some(window) = web_sys::window() {
                online.set(window.navigator().on_line());

                let online_signal = online.clone();
                let online_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                    online_signal.set(true);
                })
                    as Box<dyn Fn()>);
                window
                    .add_event_listener_with_callback("online", online_cb.as_ref().unchecked_ref())
                    .ok();
                online_cb.forget();

                let offline_signal = online.clone();
                let offline_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                    offline_signal.set(false);
                })
                    as Box<dyn Fn()>);
                window
                    .add_event_listener_with_callback(
                        "offline",
                        offline_cb.as_ref().unchecked_ref(),
                    )
                    .ok();
                offline_cb.forget();
            }
        });
    }

    #[cfg(feature = "hydrate")]
    {
        // When an import finishes successfully, rerun integrity/parity checks once so the
        // diagnostics reflect the post-import state (not the in-flight counts).
        let post_import_refreshed = RwSignal::new(false);
        let status_signal = status.clone();
        let manifest_diff_signal = manifest_diff.clone();
        let integrity_report_signal = integrity_report.clone();
        let sqlite_parity_signal = sqlite_parity.clone();
        Effect::new(move |_| {
            let current = status_signal.get();
            if !current.done || current.error.is_some() {
                return;
            }
            if post_import_refreshed.get_untracked() {
                return;
            }
            post_import_refreshed.set(true);
            spawn_local(async move {
                manifest_diff_signal.set(crate::data::fetch_manifest_diff().await);
                integrity_report_signal.set(crate::data::fetch_integrity_report().await);
                sqlite_parity_signal.set(crate::data::fetch_sqlite_parity_report().await);
            });
        });
    }

    view! {
        <div class="pwa-status">
            <div class="pwa-status__row">
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
                            <span>
                                {format!("Storage pressure: {:.0}% used", ratio * 100.0)}
                            </span>
                            <button class="pill pill--ghost" on:click=on_storage_cleanup>
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
            {move || {
                sw_version.get().map(|version| {
                    view! { <div class="pwa-status__row">{"SW version "}{version}</div> }
                })
            }}
            <Show when=move || sw_activated_at.get().is_some() fallback=|| () >
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
                    view! { <div class="pwa-status__row muted">{format!("Cache entries: {}", count)}</div> }
                })
            }}
            {move || {
                update_state.get().map(|message| {
                    view! { <div class="pwa-status__row muted">{message}</div> }
                })
            }}
            <div class="pwa-status__row">
                <span class="pill">{move || if online.get() { "Online" } else { "Offline" }}</span>
            </div>
            {move || {
                let current = status.get();
                if current.can_reset {
                    Some(view! {
                        <div class="pwa-status__row pwa-status__row--warn">
                            <span>"Offline data needs attention."</span>
                            <button class="pill pill--ghost" on:click=on_reset_data>
                                "Reset offline data"
                            </button>
                        </div>
                    })
                } else {
                    None
                }
            }}
            <div class="pwa-status__row">
                <button
                    class="pill pill--ghost"
                    on:click=on_update_check
                    disabled=move || update_checking.get()
                >
                    {move || if update_checking.get() { "Checking updates…" } else { "Check for updates" }}
                </button>
                <button
                    class="pill pill--ghost"
                    on:click=move |_| show_sw_details.set(!show_sw_details.get_untracked())
                >
                    {move || if show_sw_details.get() { "Hide SW details" } else { "SW details" }}
                </button>
            </div>
            <Show when=move || show_sw_details.get() fallback=|| () >
                <div class="pwa-status__row muted">
                    {move || {
                        let mut parts = Vec::new();
                        if let Some(version) = sw_version.get() {
                            parts.push(format!("SW {version}"));
                        }
                        if let Some(url) = sw_controller_url.get() {
                            parts.push(format!("Controller {}", shorten_script_url(&url)));
                        }
                        if let Some(state) = sw_controller_state.get() {
                            parts.push(format!("Controller {state}"));
                        }
                        if let Some(impl_name) = sw_controller_impl.get() {
                            parts.push(format!("Impl {impl_name}"));
                        }
                        if let Some(prefix) = sw_controller_cache_prefix.get() {
                            parts.push(format!("Cache {prefix}"));
                        }
                        if let Some(scope) = sw_scope.get() {
                            parts.push(format!("Scope {scope}"));
                        }
                        if let Some(_ts) = sw_activated_at.get() {
                            #[cfg(feature = "hydrate")]
                            {
                                parts.push(format_age("Activated", _ts, js_sys::Date::now()));
                            }
                        }
                        if let Some(_ts) = legacy_cache_cleaned_at.get() {
                            #[cfg(feature = "hydrate")]
                            {
                                parts.push(format_age("Legacy caches cleaned", _ts, js_sys::Date::now()));
                            }
                        }
                        if let Some(count) = cache_entries.get() {
                            parts.push(format!("Cache {count} entries"));
                        }
                        #[cfg(feature = "hydrate")]
                        {
                            if let Some(ts) = update_last_checked.get() {
                                let label = format_last_checked(ts, js_sys::Date::now());
                                parts.push(label);
                            }
                        }
                        if parts.is_empty() {
                            "No SW details yet.".to_string()
                        } else {
                            parts.join(" · ")
                        }
                    }}
                </div>
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
                        class="pill pill--ghost"
                        on:click=on_cleanup_legacy_caches
                        disabled=move || !online.get()
                    >
                        "Cleanup legacy caches"
                    </button>
                    <button class="pill pill--ghost" on:click=on_ping_sw>
                        "Ping SW"
                    </button>
                    <button class="pill pill--ghost" on:click=on_unregister_sw>
                        "Unregister SW"
                    </button>
                </div>
                {move || {
                    legacy_cache_cleanup.get().map(|message| {
                        view! { <div class="pwa-status__row muted">{message}</div> }
                    })
                }}
                {move || {
                    sw_action_status.get().map(|message| {
                        view! { <div class="pwa-status__row muted">{message}</div> }
                    })
                }}
            </Show>
            <div class="pwa-status__row">
                <button class="pill pill--ghost" on:click=on_export_parity>
                    "Export parity report"
                </button>
            </div>
            <Show
                when=move || update_last_checked.get().is_some()
                fallback=|| ()
            >
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
            <Show
                when=move || update_ready.get() && !update_snoozed.get()
                fallback=|| ()
            >
                {move || {
                    let label = update_version
                        .get()
                        .map(|version| format!("Update ready ({version})"))
                        .unwrap_or_else(|| "Update ready".to_string());
                    view! {
                        <div class="pwa-status__row pwa-status__row--update" role="status" aria-live="polite">
                            <div class="pwa-update-message">{label}</div>
                            <div class="pwa-update-actions">
                                <button class="pill" on:click=on_update_click disabled=move || update_applying.get()>
                                    {move || if update_applying.get() { "Applying…" } else { "Reload" }}
                                </button>
                                <button class="pill pill--ghost" on:click=on_update_later disabled=move || update_applying.get()>
                                    "Later"
                                </button>
                            </div>
                        </div>
                    }
                }}
            </Show>
            <Show
                when=move || {
                    manifest_diff
                        .get()
                        .map(|diff| diff.total_changed > 0)
                        .unwrap_or(false)
                }
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
                            <ul class="list">
                                {items.collect_view()}
                            </ul>
                        </div>
                    }
                })}
            </Show>
            <Show
                when=move || {
                    integrity_report
                        .get()
                        .map(|report| report.total_mismatches > 0)
                        .unwrap_or(false)
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
                            <ul class="list">
                                {items.collect_view()}
                            </ul>
                        </div>
                    }
                })}
            </Show>
            <Show
                when=move || update_error.get().is_some()
                fallback=|| ()
            >
                {move || update_error.get().map(|msg| view! {
                    <div class="pwa-status__row pwa-status__row--update muted" role="alert">
                        {msg}
                    </div>
                })}
            </Show>
            <Show
                when=move || {
                    sqlite_parity
                        .get()
                        .map(|report| report.available && report.total_mismatches > 0)
                        .unwrap_or(false)
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
                            <ul class="list">
                                {items.collect_view()}
                            </ul>
                        </div>
                    }
                })}
            </Show>
            <Show
                when=move || update_snoozed.get() && update_snooze_remaining.get().is_some()
                fallback=|| ()
            >
                {move || {
                    let remaining = update_snooze_remaining.get().unwrap_or(0.0);
                    let hours = remaining / (1000.0 * 60.0 * 60.0);
                    view! {
                        <div class="pwa-status__row muted">
                            {format!("Update snoozed ({:.1}h remaining)", hours)}
                        </div>
                    }
                }}
            </Show>
            {move || {
                update_version.get().map(|version| {
                    view! { <div class="pwa-status__row">{"Updated to "}{version}</div> }
                })
            }}
            <crate::components::AiStatus />
        </div>
    }
}

#[cfg(test)]
mod tests {
    use super::{should_suppress_update_notice, UPDATE_SNOOZE_MS};

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
        let remaining =
            super::remaining_snooze_ms(Some(last), now).expect("remaining snooze missing");
        assert!(remaining > 0.0);
        assert!(remaining < UPDATE_SNOOZE_MS);
    }
}
