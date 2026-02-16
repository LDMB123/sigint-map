use leptos::prelude::*;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

#[component]
pub fn AiStatus() -> impl IntoView {
    // Hydration requires the first client render to match SSR exactly. Treat capability
    // detection as a post-mount (hydrate-only) enhancement to avoid SSR/CSR divergence.
    let caps = RwSignal::new(crate::ai::AiCapabilities::default());
    let worker_status = RwSignal::new(crate::ai::WorkerFailureStatus::default());
    let cross_origin_isolated = RwSignal::new(None::<bool>);
    let is_secure_context = RwSignal::new(None::<bool>);

    #[cfg(feature = "hydrate")]
    {
        let caps = caps.clone();
        let worker_status = worker_status.clone();
        let cross_origin_isolated = cross_origin_isolated.clone();
        let is_secure_context = is_secure_context.clone();
        request_animation_frame(move || {
            caps.set(crate::ai::detect_ai_capabilities());
            worker_status.set(crate::ai::worker_failure_status());

            // Used only for better user-facing messaging; the actual gating is via capabilities.
            if let Some(window) = web_sys::window() {
                if let Ok(value) =
                    js_sys::Reflect::get(&window, &JsValue::from_str("crossOriginIsolated"))
                {
                    cross_origin_isolated.set(Some(value.as_bool().unwrap_or(false)));
                }
                if let Ok(value) =
                    js_sys::Reflect::get(&window, &JsValue::from_str("isSecureContext"))
                {
                    is_secure_context.set(Some(value.as_bool().unwrap_or(false)));
                }
            }
        });
    }

    view! {
        <div class="ai-status" role="status" aria-live="polite" aria-label="AI capability status">
            <span>"AI: "</span>
            <span class="pill">"WebGPU " {move || if caps.get().webgpu_enabled { "on" } else { "off" }}</span>
            <span class="pill">"GPU Worker " {move || if caps.get().webgpu_worker { "on" } else { "off" }}</span>
            <span class="pill">"WebNN " {move || if caps.get().webnn { "on" } else { "off" }}</span>
            <span class="pill">"SIMD " {move || if caps.get().wasm_simd { "on" } else { "off" }}</span>
            <span class="pill">"Threads " {move || if caps.get().threads { "on" } else { "off" }}</span>
            <Show
                when=move || worker_status.get().cooldown_remaining_ms.is_some()
                fallback=|| ()
            >
                <span class="ai-status__note">
                    {move || {
                        let remaining = worker_status
                            .get()
                            .cooldown_remaining_ms
                            .unwrap_or(0.0)
                            / 1000.0;
                        format!("WebGPU worker cooldown: {:.0}s", remaining.max(0.0))
                    }}
                </span>
            </Show>
            <Show
                when=move || worker_status.get().last_error.as_ref().is_some()
                fallback=|| ()
            >
                <span class="ai-status__note">
                    {move || {
                        worker_status
                            .get()
                            .last_error
                            .clone()
                            .unwrap_or_else(|| "Worker error".to_string())
                    }}
                </span>
            </Show>
            <Show
                when=move || !caps.get().threads
                fallback=|| ()
            >
                <span class="ai-status__note">
                    {move || {
                        if is_secure_context.get() == Some(false) {
                            "Threads disabled (insecure context)".to_string()
                        } else if cross_origin_isolated.get() == Some(false) {
                            "Threads disabled (cross-origin isolation off)".to_string()
                        } else {
                            "Threads disabled (SharedArrayBuffer unavailable)".to_string()
                        }
                    }}
                </span>
            </Show>
            <Show
                when=move || caps.get().webnn && !caps.get().webgpu_enabled
                fallback=|| ()
            >
                <span class="ai-status__note">
                    "WebNN detected (experimental; using WASM SIMD fallback)"
                </span>
            </Show>
            <Show
                when=move || !caps.get().webgpu_enabled && !caps.get().webnn
                fallback=|| ()
            >
                <span class="ai-status__note">
                    "GPU acceleration unavailable; semantic search may run slower on CPU."
                </span>
            </Show>
        </div>
    }
}
