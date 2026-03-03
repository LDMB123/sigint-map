use crate::bindings;
use crate::dom;
use std::cell::RefCell;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::HtmlCanvasElement;
thread_local! {
    static GPU: RefCell<Option<GpuState>> = const { RefCell::new(None) };
    static GPU_INIT_TIMEOUT: RefCell<bool> = const { RefCell::new(false) };
}
pub struct GpuState {
    pub device: bindings::GpuDevice,
    pub queue: bindings::GpuQueue,
    pub context: bindings::GpuCanvasContext,
    pub format: JsValue,
    pub canvas: HtmlCanvasElement,
}
pub fn is_available() -> bool {
    GPU.with(|cell| cell.borrow().is_some())
}
pub fn with_gpu<F, R>(f: F) -> Option<R>
where
    F: FnOnce(&GpuState) -> R,
{
    GPU.with(|cell| {
        let guard = cell.borrow();
        guard.as_ref().map(f)
    })
}
pub async fn init() {
    let gpu_promise = wasm_bindgen_futures::future_to_promise(async {
        match try_init().await {
            Ok(()) => Ok(JsValue::TRUE),
            Err(e) => Err(e),
        }
    });
    let timeout_promise = wasm_bindgen_futures::future_to_promise(async {
        crate::browser_apis::sleep_ms(1500).await;
        GPU_INIT_TIMEOUT.with(|flag| *flag.borrow_mut() = true);
        Err(JsValue::from_str("GPU init timed out after 1.5s"))
    });
    let race_arr = js_sys::Array::new();
    race_arr.push(&gpu_promise);
    race_arr.push(&timeout_promise);
    let result = JsFuture::from(js_sys::Promise::race(&race_arr)).await;
    match result {
        Ok(_) => dom::warn("[gpu] WebGPU initialized (Metal backend)"),
        Err(e) => {
            let msg = e.as_string().unwrap_or_else(|| format!("{e:?}"));
            dom::warn(&format!(
                "[gpu] WebGPU unavailable, using DOM fallback: {msg}"
            ));
        }
    }
}
async fn try_init() -> Result<(), JsValue> {
    let nav = dom::window().navigator();
    let ext_nav: &bindings::ExtNavigator = nav.unchecked_ref();
    let gpu_js = ext_nav.gpu();
    if gpu_js.is_null() || gpu_js.is_undefined() {
        return Err(JsValue::from_str("navigator.gpu unavailable"));
    }
    let gpu: bindings::Gpu = gpu_js.unchecked_into();
    let adapter_opts = bindings::GpuRequestAdapterOptions::new();
    adapter_opts.set_power_preference("low-power");
    let adapter_val = JsFuture::from(gpu.request_adapter_with_options(&adapter_opts)).await?;
    if adapter_val.is_null() || adapter_val.is_undefined() {
        return Err(JsValue::from_str("No WebGPU adapter available"));
    }
    let adapter: bindings::GpuAdapter = adapter_val.unchecked_into();
    let device_promise = adapter.request_device();
    let device_val = JsFuture::from(device_promise).await?;
    if device_val.is_null() || device_val.is_undefined() {
        return Err(JsValue::from_str("Failed to acquire WebGPU device"));
    }
    let device: bindings::GpuDevice = device_val.unchecked_into();
    let queue = device.queue();
    let canvas = get_or_create_canvas()?;
    let context: bindings::GpuCanvasContext = canvas
        .get_context("webgpu")?
        .ok_or_else(|| JsValue::from_str("webgpu context unavailable"))?
        .unchecked_into();
    let format = gpu.get_preferred_canvas_format();
    let config = bindings::GpuCanvasConfiguration::new(&device, &format);
    config.set_alpha_mode("premultiplied");
    context.configure(&config);
    let timed_out = GPU_INIT_TIMEOUT.with(|flag| *flag.borrow());
    if timed_out {
        dom::warn("[gpu] Init completed after timeout, discarding state");
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
fn size_canvas_to_window(canvas: &HtmlCanvasElement) {
    let window = dom::window();
    let w = window
        .inner_width()
        .ok()
        .and_then(|v| v.as_f64())
        .unwrap_or(800.0) as u32;
    let h = window
        .inner_height()
        .ok()
        .and_then(|v| v.as_f64())
        .unwrap_or(600.0) as u32;
    let dpr = window.device_pixel_ratio();
    canvas.set_width((f64::from(w) * dpr) as u32);
    canvas.set_height((f64::from(h) * dpr) as u32);
}
fn get_or_create_canvas() -> Result<HtmlCanvasElement, JsValue> {
    if let Some(el) = dom::query("#gpu-canvas") {
        return el.dyn_into().map_err(JsValue::from);
    }
    let doc = dom::document();
    let canvas: HtmlCanvasElement = doc.create_element("canvas")?.dyn_into()?;
    canvas.set_id("gpu-canvas");
    dom::set_attr(&canvas, "class", "gpu-canvas-overlay");
    dom::set_attr(&canvas, "aria-hidden", "true");
    size_canvas_to_window(&canvas);
    if let Some(body) = doc.body() {
        let _ = body.append_child(&canvas);
    }
    Ok(canvas)
}
pub fn resize_canvas() {
    GPU.with(|cell| {
        let guard = cell.borrow();
        let Some(state) = guard.as_ref() else { return };
        size_canvas_to_window(&state.canvas);
    });
}
pub fn clear_frame() {
    with_gpu(|state| {
        let texture = state.context.get_current_texture();
        let view = texture.create_view();
        let encoder = state.device.create_command_encoder();
        let color_attachment = bindings::GpuRenderPassColorAttachment::new("clear", "store", &view);
        color_attachment.set_clear_value(&bindings::GpuColorDict::new(0.0, 0.0, 0.0, 0.0).into());
        let color_attachments = js_sys::Array::new();
        color_attachments.push(&color_attachment);
        let pass =
            encoder.begin_render_pass(&bindings::GpuRenderPassDescriptor::new(&color_attachments));
        pass.end();
        let commands = js_sys::Array::new();
        commands.push(&encoder.finish());
        state.queue.submit(&commands);
    });
}
