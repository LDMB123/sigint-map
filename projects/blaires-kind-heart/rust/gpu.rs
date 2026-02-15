//! WebGPU device initialization + canvas management.
//! Safari 26.2 ships WebGPU via the Metal backend on A15 (iPad mini 6).
//! Falls back gracefully: if no GPU, confetti stays DOM-based.
//! All GPU types via custom bindings in bindings.rs (web-sys 0.3 lacks typed WebGPU).

use std::cell::RefCell;

use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::HtmlCanvasElement;

use crate::bindings;
use crate::dom;

// Shared GPU state — initialized once, used by particle system.
thread_local! {
    static GPU: RefCell<Option<GpuState>> = const { RefCell::new(None) };
    /// Timeout flag: prevents late GPU init from storing state after timeout.
    static GPU_INIT_TIMEOUT: RefCell<bool> = const { RefCell::new(false) };
}

pub struct GpuState {
    pub device: bindings::GpuDevice,
    pub queue: bindings::GpuQueue,
    pub context: bindings::GpuCanvasContext,
    /// Preferred texture format as a JsValue string (e.g. "bgra8unorm").
    pub format: JsValue,
    pub canvas: HtmlCanvasElement,
}

/// Returns true if GPU was successfully initialized.
pub fn is_available() -> bool {
    GPU.with(|cell| cell.borrow().is_some())
}

/// Borrow GPU state for rendering. Panics if not initialized.
pub fn with_gpu<F, R>(f: F) -> Option<R>
where
    F: FnOnce(&GpuState) -> R,
{
    GPU.with(|cell| {
        let guard = cell.borrow();
        guard.as_ref().map(f)
    })
}

/// Initialize WebGPU: request adapter → device → configure canvas.
/// Call once from boot_async(). Non-fatal: if GPU unavailable, app uses DOM fallback.
/// Includes a 1.5-second timeout to prevent hanging boot if requestAdapter never resolves.
pub async fn init() {
    // Race GPU init against a 1.5-second timeout using Promise.race
    let gpu_promise = wasm_bindgen_futures::future_to_promise(async {
        match try_init().await {
            Ok(()) => Ok(JsValue::TRUE),
            Err(e) => Err(e),
        }
    });
    let timeout_promise = wasm_bindgen_futures::future_to_promise(async {
        crate::browser_apis::sleep_ms(1500).await;
        // Set timeout flag to prevent late GPU init from storing state
        GPU_INIT_TIMEOUT.with(|flag| *flag.borrow_mut() = true);
        Err(JsValue::from_str("GPU init timed out after 1.5s"))
    });

    let race_arr = js_sys::Array::new();
    race_arr.push(&gpu_promise);
    race_arr.push(&timeout_promise);

    let result = JsFuture::from(js_sys::Promise::race(&race_arr)).await;
    match result {
        Ok(_) => web_sys::console::log_1(&"[gpu] WebGPU initialized (Metal backend)".into()),
        Err(e) => {
            let msg = e.as_string().unwrap_or_else(|| format!("{:?}", e));
            web_sys::console::warn_1(&format!("[gpu] WebGPU unavailable, using DOM fallback: {msg}").into());
        }
    }
}

async fn try_init() -> Result<(), JsValue> {
    // 1. navigator.gpu (may be unavailable in headless/CI browsers)
    let nav = dom::window().navigator();
    let ext_nav: &bindings::ExtNavigator = nav.unchecked_ref();
    let gpu_js = ext_nav.gpu();
    if gpu_js.is_null() || gpu_js.is_undefined() {
        return Err(JsValue::from_str("navigator.gpu unavailable"));
    }
    let gpu: bindings::Gpu = gpu_js.unchecked_into();

    // 2. Request adapter (prefer high-performance for A15 GPU)
    // Safari 26.2 guarantees WebGPU on A15+ — this should never fail
    let adapter_opts = bindings::GpuRequestAdapterOptions::new();
    adapter_opts.set_power_preference("high-performance");
    let adapter_promise = gpu.request_adapter_with_options(&adapter_opts);
    let adapter_val = JsFuture::from(adapter_promise).await?;
    if adapter_val.is_null() || adapter_val.is_undefined() {
        return Err(JsValue::from_str("No WebGPU adapter available"));
    }
    let adapter: bindings::GpuAdapter = adapter_val.unchecked_into();

    // 3. Request device
    let device_promise = adapter.request_device();
    let device_val = JsFuture::from(device_promise).await?;
    if device_val.is_null() || device_val.is_undefined() {
        return Err(JsValue::from_str("Failed to acquire WebGPU device"));
    }
    let device: bindings::GpuDevice = device_val.unchecked_into();
    let queue = device.queue();

    // 4. Get or create canvas
    let canvas = get_or_create_canvas()?;

    // 5. Configure canvas context
    // Safari 26.2 guarantees WebGPU canvas context on A15+
    let context: bindings::GpuCanvasContext = canvas
        .get_context("webgpu")?
        .expect("webgpu context should be available")
        .unchecked_into();

    let format = gpu.get_preferred_canvas_format();

    let config = bindings::GpuCanvasConfiguration::new(&device, &format);
    // Alpha mode: premultiplied so canvas overlays DOM content
    config.set_alpha_mode("premultiplied");
    context.configure(&config);

    // Store globally only if timeout hasn't fired
    // Prevents race condition where timeout completes first but GPU init finishes later
    let timed_out = GPU_INIT_TIMEOUT.with(|flag| *flag.borrow());
    if timed_out {
        web_sys::console::warn_1(&"[gpu] Init completed after timeout, discarding state".into());
        return Err(JsValue::from_str("Init completed after timeout"));
    }

    GPU.with(|cell| {
        *cell.borrow_mut() = Some(GpuState {
            device,
            queue,
            context,
            format,
            canvas,
        });
    });

    Ok(())
}

fn get_or_create_canvas() -> Result<HtmlCanvasElement, JsValue> {
    // Look for existing canvas
    if let Some(el) = dom::query("#gpu-canvas") {
        return el.dyn_into().map_err(JsValue::from);
    }

    // Create one dynamically
    let doc = dom::document();
    let canvas: HtmlCanvasElement = doc.create_element("canvas")?.dyn_into()?;
    canvas.set_id("gpu-canvas");
    let _ = canvas.set_attribute("class", "gpu-canvas-overlay");
    let _ = canvas.set_attribute("aria-hidden", "true");

    // Match viewport size
    let window = dom::window();
    let w = window.inner_width().ok().and_then(|v| v.as_f64()).unwrap_or(800.0) as u32;
    let h = window.inner_height().ok().and_then(|v| v.as_f64()).unwrap_or(600.0) as u32;
    // Use device pixel ratio for crisp rendering on Retina
    let dpr = window.device_pixel_ratio();
    canvas.set_width((w as f64 * dpr) as u32);
    canvas.set_height((h as f64 * dpr) as u32);

    if let Some(body) = doc.body() {
        let _ = body.append_child(&canvas);
    }

    Ok(canvas)
}

/// Resize GPU canvas to match current viewport (call on resize/orientation change).
pub fn resize_canvas() {
    GPU.with(|cell| {
        let guard = cell.borrow();
        let Some(state) = guard.as_ref() else { return };
        let window = dom::window();
        let w = window.inner_width().ok().and_then(|v| v.as_f64()).unwrap_or(800.0) as u32;
        let h = window.inner_height().ok().and_then(|v| v.as_f64()).unwrap_or(600.0) as u32;
        let dpr = window.device_pixel_ratio();
        state.canvas.set_width((w as f64 * dpr) as u32);
        state.canvas.set_height((h as f64 * dpr) as u32);
    });
}

/// Clear the canvas (transparent) — call at start of each frame.
pub fn clear_frame() {
    with_gpu(|state| {
        let texture = state.context.get_current_texture();
        let view = texture.create_view();
        let encoder = state.device.create_command_encoder();

        // Create a render pass that clears to transparent
        let color_attachment = bindings::GpuRenderPassColorAttachment::new(
            "clear",
            "store",
            &view,
        );
        // Set clear color to fully transparent
        let clear_color = bindings::GpuColorDict::new(0.0, 0.0, 0.0, 0.0);
        color_attachment.set_clear_value(&clear_color.into());

        let color_attachments = js_sys::Array::new();
        color_attachments.push(&color_attachment);
        let pass_desc = bindings::GpuRenderPassDescriptor::new(&color_attachments);
        let pass = encoder.begin_render_pass(&pass_desc);
        pass.end();

        let commands = js_sys::Array::new();
        commands.push(&encoder.finish());
        state.queue.submit(&commands);
    });
}
