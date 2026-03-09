use super::*;

#[path = "ai_policy_profiles.rs"]
mod profiles;

#[cfg(feature = "hydrate")]
pub(crate) use profiles::{
    default_cache_idle_ms_for_profile, default_matrix_cache_max_bytes_for_profile,
    default_prime_matrix_on_worker_init_for_profile, default_result_cache_max_bytes_for_profile,
    default_worker_max_floats_for_profile, default_worker_threshold_for_profile,
};

#[cfg(feature = "hydrate")]
pub(crate) fn read_worker_threshold() -> Option<usize> {
    local_storage_parse(WORKER_THRESHOLD_KEY)
}

#[cfg(feature = "hydrate")]
pub(crate) fn parse_worker_threshold(raw: Option<String>) -> Option<usize> {
    raw.and_then(|value| value.parse::<usize>().ok())
        .map(clamp_worker_threshold)
}

#[cfg(feature = "hydrate")]
pub(crate) fn read_worker_max_floats() -> Option<usize> {
    let device_memory = crate::browser::runtime::navigator_device_memory_gb();
    let cores = crate::browser::runtime::navigator_hardware_concurrency().unwrap_or(1);
    let is_apple_silicon = crate::browser::webgpu_diagnostics::is_apple_silicon_host();
    Some(default_worker_max_floats_for_profile(
        device_memory,
        cores,
        is_apple_silicon,
    ))
}

#[cfg(feature = "hydrate")]
fn load_webgpu_policy_telemetry(storage: &web_sys::Storage) -> WebgpuPolicyTelemetry {
    storage_item(storage, WEBGPU_POLICY_KEY)
        .and_then(|payload| serde_json::from_str::<WebgpuPolicyTelemetry>(&payload).ok())
        .unwrap_or_default()
}

#[cfg(feature = "hydrate")]
fn store_webgpu_policy_telemetry(storage: &web_sys::Storage, telemetry: &WebgpuPolicyTelemetry) {
    set_storage_json(storage, WEBGPU_POLICY_KEY, telemetry);
}

#[cfg(feature = "hydrate")]
pub(crate) fn bump_webgpu_policy_metric(storage: &web_sys::Storage, event: &str) {
    let mut telemetry = load_webgpu_policy_telemetry(storage);
    *telemetry.counters.entry(event.to_string()).or_insert(0) += 1;
    telemetry.last_event = Some(event.to_string());
    telemetry.last_event_ts = Some(js_sys::Date::now());
    store_webgpu_policy_telemetry(storage, &telemetry);
}

#[cfg(feature = "hydrate")]
fn reset_webgpu_policy_telemetry_storage(storage: &web_sys::Storage) {
    remove_storage_item(storage, WEBGPU_POLICY_KEY);
}

#[cfg(feature = "hydrate")]
pub fn worker_threshold_value() -> Option<usize> {
    ensure_default_worker_threshold();
    read_worker_threshold()
}

#[cfg(feature = "hydrate")]
pub fn worker_max_floats_value() -> Option<usize> {
    read_worker_max_floats()
}

#[cfg_attr(not(feature = "hydrate"), must_use)]
pub fn worker_failure_status() -> WorkerFailureStatus {
    #[cfg(feature = "hydrate")]
    {
        with_local_storage(worker_failure_status_from_storage).unwrap_or_default()
    }
    #[cfg(not(feature = "hydrate"))]
    {
        WorkerFailureStatus::default()
    }
}

#[cfg(feature = "hydrate")]
pub fn clear_worker_failure_status() {
    let _ = with_local_storage(|storage| {
        clear_worker_failure_storage(storage);
        bump_webgpu_policy_metric(storage, "worker_failure_cleared");
    });
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
pub fn set_worker_threshold_override(value: Option<usize>) {
    match value {
        Some(val) => {
            let clamped = clamp_worker_threshold(val);
            store_worker_threshold(clamped);
        }
        None => {
            remove_local_storage_item(WORKER_THRESHOLD_KEY);
            reset_worker_threshold_ready();
            ensure_default_worker_threshold();
        }
    }
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
pub(crate) fn read_ann_cap_override_mb() -> Option<u64> {
    local_storage_parse::<u64>(ANN_CAP_OVERRIDE_KEY)
        .map(|mb| mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB))
}

#[cfg(feature = "hydrate")]
pub fn ann_cap_override_mb() -> Option<u64> {
    read_ann_cap_override_mb()
}

#[cfg(feature = "hydrate")]
pub fn set_ann_cap_override_mb(value: Option<u64>) {
    match value {
        Some(mb) => {
            let clamped = mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB);
            set_local_storage_item(ANN_CAP_OVERRIDE_KEY, &clamped.to_string());
        }
        None => {
            remove_local_storage_item(ANN_CAP_OVERRIDE_KEY);
        }
    }
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
pub fn set_webgpu_disabled(disabled: bool) {
    set_local_storage_flag(WEBGPU_DISABLE_KEY, disabled);
    if disabled {
        clear_worker_matrix_signature();
        dmb_wasm::reset_webgpu_worker_runtime();
    }
    WEBGPU_DISABLED_CACHE.with(|cache| {
        *cache.borrow_mut() = Some(disabled);
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn store_worker_threshold(value: usize) {
    set_local_storage_item(WORKER_THRESHOLD_KEY, &value.to_string());
    let _ = with_local_storage(|storage| {
        bump_webgpu_policy_metric(storage, "worker_threshold_updated");
    });
    mark_worker_threshold_ready();
}

#[cfg(feature = "hydrate")]
pub(crate) fn ensure_default_worker_threshold() {
    if worker_threshold_ready() {
        return;
    }
    if read_worker_threshold().is_some() {
        mark_worker_threshold_ready();
        return;
    }
    let device_memory = crate::browser::runtime::navigator_device_memory_gb();
    let cores = crate::browser::runtime::navigator_hardware_concurrency().unwrap_or(1);
    let is_apple_silicon = crate::browser::webgpu_diagnostics::is_apple_silicon_host();
    let threshold = default_worker_threshold_for_profile(device_memory, cores, is_apple_silicon);
    store_worker_threshold(clamp_worker_threshold(threshold));
}

#[cfg(feature = "hydrate")]
pub(crate) fn clamp_worker_threshold(value: usize) -> usize {
    value.clamp(MIN_WORKER_THRESHOLD, MAX_WORKER_THRESHOLD)
}

#[cfg(feature = "hydrate")]
pub(crate) fn detect_ai_capabilities_with_webgpu_disabled(webgpu_disabled: bool) -> AiCapabilities {
    let webgpu = js_value_exists(&navigator_property("gpu"));
    let webgpu_helper_failed = dmb_wasm::webgpu_helpers_failed();
    let webgpu_worker = dmb_wasm::webgpu_worker_supported();
    let webgpu_available = webgpu && !webgpu_helper_failed;
    if webgpu && webgpu_helper_failed {
        record_ai_warning_once(
            WEBGPU_HELPER_WARN_KEY,
            "webgpu_helper_missing",
            "navigator.gpu present but WebGPU module failed to load",
        );
    }
    let webnn = js_value_exists(&navigator_property("ml"));
    let threads = crate::browser::runtime::cross_origin_isolated().unwrap_or(false);

    let webgpu_enabled = webgpu_available && !webgpu_disabled;
    AiCapabilities {
        webgpu_available,
        webgpu_enabled,
        webgpu_worker: webgpu_worker && webgpu_enabled,
        webnn,
        wasm_simd: true,
        threads,
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn worker_failure_status_from_storage(
    storage: &web_sys::Storage,
) -> WorkerFailureStatus {
    let now = js_sys::Date::now();
    let until =
        storage_item(storage, WORKER_FAILURE_UNTIL_KEY).and_then(|raw| raw.parse::<f64>().ok());
    let remaining = until.and_then(|ts| if ts <= now { None } else { Some(ts - now) });
    if remaining.is_some() {
        record_ai_warning_once(
            WORKER_COOLDOWN_WARN_KEY,
            "webgpu_worker_cooldown",
            "WebGPU worker in cooldown; using direct scoring",
        );
    }
    WorkerFailureStatus {
        cooldown_until_ms: until,
        cooldown_remaining_ms: remaining,
        last_error: storage_item(storage, WORKER_FAILURE_REASON_KEY),
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn set_worker_failure_cooldown(storage: &web_sys::Storage, reason: &str) {
    let until = js_sys::Date::now() + WORKER_FAIL_COOLDOWN_MS;
    set_storage_item(storage, WORKER_FAILURE_UNTIL_KEY, &until.to_string());
    set_storage_item(storage, WORKER_FAILURE_REASON_KEY, reason);
    remove_storage_item(storage, WORKER_COOLDOWN_WARN_KEY);
    bump_webgpu_policy_metric(storage, "worker_failure_marked");
}

#[cfg(feature = "hydrate")]
pub(crate) fn clear_worker_failure_storage(storage: &web_sys::Storage) {
    for key in [
        WORKER_FAILURE_UNTIL_KEY,
        WORKER_FAILURE_REASON_KEY,
        WORKER_COOLDOWN_WARN_KEY,
    ] {
        remove_storage_item(storage, key);
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn worker_preflight_allows(
    storage: &web_sys::Storage,
    matrix_floats: usize,
    metric_prefix: &str,
) -> bool {
    let failure = worker_failure_status_from_storage(storage);
    if failure.cooldown_remaining_ms.is_some() {
        bump_webgpu_policy_metric(storage, &format!("{metric_prefix}_fallback_cooldown"));
        return false;
    }

    let worker_max_floats = read_worker_max_floats().unwrap_or(WORKER_MAX_FLOATS_FALLBACK);
    if matrix_floats > worker_max_floats {
        bump_webgpu_policy_metric(storage, &format!("{metric_prefix}_fallback_maxfloats"));
        return false;
    }

    let threshold = parse_worker_threshold(storage_item(storage, WORKER_THRESHOLD_KEY))
        .unwrap_or(MIN_WORKER_THRESHOLD);
    if matrix_floats < threshold {
        bump_webgpu_policy_metric(
            storage,
            &format!("{metric_prefix}_fallback_below_threshold"),
        );
        return false;
    }

    true
}

#[cfg(feature = "hydrate")]
pub(crate) fn webgpu_policy_snapshot_from_storage(
    storage: &web_sys::Storage,
) -> WebgpuPolicySnapshot {
    let failure = worker_failure_status_from_storage(storage);
    WebgpuPolicySnapshot {
        worker_threshold: parse_worker_threshold(storage_item(storage, WORKER_THRESHOLD_KEY)),
        worker_max_floats: read_worker_max_floats(),
        worker_failure_until_ms: failure.cooldown_until_ms,
        worker_failure_remaining_ms: failure.cooldown_remaining_ms,
        worker_failure_reason: failure.last_error,
        telemetry: load_webgpu_policy_telemetry(storage),
    }
}

#[cfg(feature = "hydrate")]
pub fn load_webgpu_policy_snapshot() -> Option<WebgpuPolicySnapshot> {
    with_local_storage(webgpu_policy_snapshot_from_storage)
}

#[cfg(feature = "hydrate")]
pub fn reset_webgpu_policy_telemetry() {
    let _ = with_local_storage(reset_webgpu_policy_telemetry_storage);
}
