use super::*;

#[cfg(feature = "hydrate")]
static WEBGPU_RUNTIME_PRELOAD_STARTED: AtomicBool = AtomicBool::new(false);

#[cfg(feature = "hydrate")]
pub fn preload_webgpu_runtime() {
    if WEBGPU_RUNTIME_PRELOAD_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }
    spawn_local(async {
        if let Some(config) = webgpu_runtime_config_js_value() {
            let _ = dmb_wasm::set_webgpu_runtime_config(config).await;
        }
        let _ = dmb_wasm::ensure_webgpu_helpers_loaded().await;
    });
}

#[cfg(not(feature = "hydrate"))]
pub fn preload_webgpu_runtime() {}

#[cfg(feature = "hydrate")]
fn webgpu_runtime_config() -> crate::browser::pwa::WebgpuRuntimeConfig {
    let profile =
        crate::browser::webgpu_diagnostics::load_apple_silicon_profile().unwrap_or_default();
    let device_memory_gb = crate::browser::runtime::navigator_device_memory_gb();
    let cores = crate::browser::runtime::navigator_hardware_concurrency().unwrap_or(1);
    crate::browser::pwa::WebgpuRuntimeConfig {
        is_apple_silicon: profile.is_apple_silicon,
        score_workgroup_size: profile
            .workgroup
            .as_ref()
            .and_then(|workgroup| workgroup.score)
            .and_then(|value| u32::try_from(value).ok())
            .unwrap_or(64),
        power_preference: "high-performance".to_string(),
        worker_threshold_floats: worker_threshold_value(),
        worker_max_floats: worker_max_floats_value(),
        low_memory_guard_mb: device_memory_gb.and_then(|value| {
            if value <= 4.0 {
                Some(1024)
            } else if value <= 8.0 {
                Some(2048)
            } else {
                None
            }
        }),
        matrix_cache_max_bytes: Some(default_matrix_cache_max_bytes_for_profile(
            device_memory_gb,
            cores,
            profile.is_apple_silicon,
        )),
        result_cache_max_bytes: Some(default_result_cache_max_bytes_for_profile(
            device_memory_gb,
            cores,
            profile.is_apple_silicon,
        )),
        cache_idle_ms: Some(default_cache_idle_ms_for_profile(
            device_memory_gb,
            cores,
            profile.is_apple_silicon,
        )),
        eager_warmup: profile.is_apple_silicon,
        prime_matrix_on_worker_init: default_prime_matrix_on_worker_init_for_profile(
            device_memory_gb,
            cores,
            profile.is_apple_silicon,
        ),
    }
}

#[cfg(feature = "hydrate")]
fn webgpu_runtime_config_js_value() -> Option<JsValue> {
    serde_wasm_bindgen::to_value(&webgpu_runtime_config()).ok()
}

#[cfg(feature = "hydrate")]
pub(crate) const fn browser_runtime_supported() -> bool {
    cfg!(target_arch = "wasm32")
}

#[cfg(feature = "hydrate")]
pub fn detect_ai_capabilities() -> AiCapabilities {
    if !browser_runtime_supported() {
        return AiCapabilities::default();
    }
    ensure_default_worker_threshold();
    let webgpu_disabled = webgpu_disabled_value();
    detect_ai_capabilities_with_webgpu_disabled(webgpu_disabled)
}

#[cfg(not(feature = "hydrate"))]
#[must_use]
pub fn detect_ai_capabilities() -> AiCapabilities {
    AiCapabilities::default()
}

#[cfg(feature = "hydrate")]
pub async fn probe_webgpu_device() -> Option<bool> {
    dmb_wasm::webgpu_probe_available().await
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn probe_webgpu_device() -> Option<bool> {
    None
}

#[cfg(feature = "hydrate")]
pub(crate) async fn warm_webgpu_worker() {
    if let Some(status) = dmb_wasm::warm_webgpu_worker().await
        && !status.warmed
    {
        record_ai_warning("webgpu_worker_warm_failed", status.reason);
    }
}
