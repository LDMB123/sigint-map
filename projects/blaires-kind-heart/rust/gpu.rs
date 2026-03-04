use crate::bindings;
use crate::dom;
use std::cell::{Cell, RefCell};
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::HtmlCanvasElement;

const IPAD_MINI_6_SCREEN_W: i32 = 744;
const IPAD_MINI_6_SCREEN_H: i32 = 1133;
const IPAD_MINI_COMPAT_SCREEN_W: i32 = 768;
const IPAD_MINI_COMPAT_SCREEN_H: i32 = 1024;
const IPAD_MINI_6_DPR: f64 = 2.0;
const IPAD_MINI_6_GPU_SCALE_THROUGHPUT: f64 = 0.62;
const IPAD_MINI_6_GPU_SCALE_BALANCED: f64 = 0.75;
const IPAD_MINI_6_GPU_SCALE_QUALITY: f64 = 1.0;
const GPU_PARAM_KEY: &str = "gpu";
const PERF_PARAM_KEY: &str = "perf";
const MAX_GPU_RECOVERY_ATTEMPTS: u8 = 1;

thread_local! {
    static GPU: RefCell<Option<GpuState>> = const { RefCell::new(None) };
    static GPU_INIT_TIMEOUT: RefCell<bool> = const { RefCell::new(false) };
    static GPU_REQUESTED_MODE: Cell<GpuMode> = const { Cell::new(GpuMode::Auto) };
    static PERF_MODE: Cell<PerfMode> = const { Cell::new(PerfMode::Balanced) };
    static GPU_RECOVERY_ATTEMPTS: Cell<u8> = const { Cell::new(0) };
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum GpuMode {
    Off,
    Auto,
    On,
}

impl GpuMode {
    fn as_str(self) -> &'static str {
        match self {
            Self::Off => "off",
            Self::Auto => "auto",
            Self::On => "on",
        }
    }

    fn from_query_param(raw: &str) -> Option<Self> {
        match raw {
            "off" => Some(Self::Off),
            "auto" => Some(Self::Auto),
            "on" => Some(Self::On),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PerfMode {
    Throughput,
    Balanced,
    Quality,
}

impl PerfMode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Throughput => "throughput",
            Self::Balanced => "balanced",
            Self::Quality => "quality",
        }
    }

    fn from_query_param(raw: &str) -> Option<Self> {
        match raw {
            "throughput" => Some(Self::Throughput),
            "balanced" => Some(Self::Balanced),
            "quality" => Some(Self::Quality),
            _ => None,
        }
    }
}

struct PerfModeSelection {
    mode: PerfMode,
    source: &'static str,
    raw_query: Option<String>,
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

pub fn current_perf_mode() -> PerfMode {
    PERF_MODE.with(Cell::get)
}

pub fn is_throughput_mode() -> bool {
    current_perf_mode() == PerfMode::Throughput
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

pub fn is_ipad_mini_6_profile() -> bool {
    let window = dom::window();
    let Ok(screen) = window.screen() else {
        return false;
    };
    let screen_dims = (screen.width().unwrap_or_default(), screen.height().unwrap_or_default());
    let avail_dims = (
        screen.avail_width().unwrap_or_default(),
        screen.avail_height().unwrap_or_default(),
    );
    let outer_dims = (
        window
            .outer_width()
            .ok()
            .and_then(|value| value.as_f64())
            .unwrap_or_default() as i32,
        window
            .outer_height()
            .ok()
            .and_then(|value| value.as_f64())
            .unwrap_or_default() as i32,
    );
    let dpr = window.device_pixel_ratio();
    let nav = window.navigator();
    let touch_points = nav.max_touch_points();
    let ua = nav
        .user_agent()
        .unwrap_or_default()
        .to_ascii_lowercase();

    let dims_match = [screen_dims, avail_dims, outer_dims]
        .into_iter()
        .any(|(w, h)| {
            let native_dims_match = (w == IPAD_MINI_6_SCREEN_W && h == IPAD_MINI_6_SCREEN_H)
                || (w == IPAD_MINI_6_SCREEN_H && h == IPAD_MINI_6_SCREEN_W);
            let compat_dims_match = (w == IPAD_MINI_COMPAT_SCREEN_W && h == IPAD_MINI_COMPAT_SCREEN_H)
                || (w == IPAD_MINI_COMPAT_SCREEN_H && h == IPAD_MINI_COMPAT_SCREEN_W);
            native_dims_match || compat_dims_match
        });
    let dpr_match = (dpr - IPAD_MINI_6_DPR).abs() < 0.05;
    dims_match && dpr_match && (touch_points > 0 || ua.contains("ipad"))
}

fn gpu_resolution_scale(mode: PerfMode) -> f64 {
    if !is_ipad_mini_6_profile() {
        return 1.0;
    }
    match mode {
        PerfMode::Throughput => IPAD_MINI_6_GPU_SCALE_THROUGHPUT,
        PerfMode::Balanced => IPAD_MINI_6_GPU_SCALE_BALANCED,
        PerfMode::Quality => IPAD_MINI_6_GPU_SCALE_QUALITY,
    }
}

fn apply_profile_attrs(mode: PerfMode) {
    let document = dom::document();
    let Some(body) = document.body() else {
        return;
    };
    let body_el: &web_sys::Element = body.as_ref();
    if is_ipad_mini_6_profile() {
        dom::set_attr(body_el, "data-device-profile", "ipad-mini-6");
        dom::set_attr(body_el, "data-gpu-scale", &format!("{:.2}", gpu_resolution_scale(mode)));
    } else {
        dom::remove_attr(body_el, "data-device-profile");
        dom::remove_attr(body_el, "data-gpu-scale");
    }
}

fn set_gpu_mode_attr(mode: GpuMode) {
    let body = dom::body();
    let body_el: &web_sys::Element = body.as_ref();
    dom::set_attr(body_el, "data-gpu-mode", mode.as_str());
}

fn set_perf_mode_attr(mode: PerfMode) {
    let body = dom::body();
    let body_el: &web_sys::Element = body.as_ref();
    dom::set_attr(body_el, "data-perf-mode", mode.as_str());
}

fn set_gpu_status_attr(status: &str) {
    let body = dom::body();
    let body_el: &web_sys::Element = body.as_ref();
    dom::set_attr(body_el, "data-gpu-status", status);
}

fn parse_gpu_mode_from_query() -> GpuMode {
    let Ok(search) = dom::window().location().search() else {
        return GpuMode::Auto;
    };
    let search = search.strip_prefix('?').unwrap_or(search.as_str());
    for pair in search.split('&') {
        if pair.is_empty() {
            continue;
        }
        let mut parts = pair.splitn(2, '=');
        let key = parts.next().unwrap_or_default();
        if key != GPU_PARAM_KEY {
            continue;
        }
        let value = parts.next().unwrap_or_default().to_ascii_lowercase();
        if let Some(mode) = GpuMode::from_query_param(value.as_str()) {
            return mode;
        }
    }
    GpuMode::Auto
}

fn resolve_perf_mode_from_query() -> PerfModeSelection {
    let is_ipad = is_ipad_mini_6_profile();
    let default_mode = if is_ipad {
        PerfMode::Throughput
    } else {
        PerfMode::Balanced
    };

    let Ok(search) = dom::window().location().search() else {
        return PerfModeSelection {
            mode: default_mode,
            source: "default",
            raw_query: None,
        };
    };
    let search = search.strip_prefix('?').unwrap_or(search.as_str());
    for pair in search.split('&') {
        if pair.is_empty() {
            continue;
        }
        let mut parts = pair.splitn(2, '=');
        let key = parts.next().unwrap_or_default();
        if key != PERF_PARAM_KEY {
            continue;
        }
        let raw_value = parts.next().unwrap_or_default().to_ascii_lowercase();
        if raw_value == "auto" {
            return PerfModeSelection {
                mode: default_mode,
                source: "query-auto",
                raw_query: Some(raw_value),
            };
        }
        if let Some(mode) = PerfMode::from_query_param(raw_value.as_str()) {
            return PerfModeSelection {
                mode,
                source: "query-explicit",
                raw_query: Some(raw_value),
            };
        }
        return PerfModeSelection {
            mode: default_mode,
            source: "query-invalid",
            raw_query: Some(raw_value),
        };
    }

    PerfModeSelection {
        mode: default_mode,
        source: "default",
        raw_query: None,
    }
}

fn adapter_preferences(mode: GpuMode) -> [&'static str; 2] {
    match mode {
        GpuMode::Off => ["low-power", "low-power"],
        GpuMode::On => ["high-performance", "low-power"],
        GpuMode::Auto => {
            if dom::prefers_reduced_motion() || is_ipad_mini_6_profile() {
                ["low-power", "high-performance"]
            } else {
                ["high-performance", "low-power"]
            }
        }
    }
}

fn emit_runtime_diag(kind: &str, level: &str, details: &js_sys::Object) {
    let global = js_sys::global();
    let Ok(diag) = js_sys::Reflect::get(&global, &JsValue::from_str("__BKH_RUNTIME_DIAGNOSTICS__"))
    else {
        return;
    };
    if diag.is_null() || diag.is_undefined() {
        return;
    }

    let Ok(record_fn) = js_sys::Reflect::get(&diag, &JsValue::from_str("record"))
        .and_then(|value| value.dyn_into::<js_sys::Function>())
    else {
        return;
    };

    let _ = record_fn.call4(
        &diag,
        &JsValue::from_str("wasm-init"),
        &JsValue::from_str(kind),
        details.as_ref(),
        &JsValue::from_str(level),
    );
}

fn clear_gpu_state() {
    GPU.with(|cell| {
        *cell.borrow_mut() = None;
    });
    crate::gpu_particles::clear_pipeline();
}

fn handle_device_lost(mode: GpuMode, reason: String, message: Option<String>) {
    clear_gpu_state();
    set_gpu_status_attr("lost");

    let loss_details = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        &loss_details,
        &JsValue::from_str("reason"),
        &JsValue::from_str(&reason),
    );
    if let Some(msg) = message {
        let _ = js_sys::Reflect::set(
            &loss_details,
            &JsValue::from_str("message"),
            &JsValue::from_str(&msg),
        );
    }
    emit_runtime_diag("gpu-device-lost", "warn", &loss_details);

    if mode == GpuMode::Off {
        set_gpu_status_attr("off");
        return;
    }

    let should_retry = GPU_RECOVERY_ATTEMPTS.with(|attempts| {
        let current = attempts.get();
        if current >= MAX_GPU_RECOVERY_ATTEMPTS {
            false
        } else {
            attempts.set(current + 1);
            true
        }
    });

    if !should_retry {
        set_gpu_status_attr("unavailable");
        let details = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &details,
            &JsValue::from_str("reason"),
            &JsValue::from_str("recovery-limit-reached"),
        );
        emit_runtime_diag("gpu-fallback", "warn", &details);
        return;
    }

    set_gpu_status_attr("recovering");
    let details = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        &details,
        &JsValue::from_str("mode"),
        &JsValue::from_str(mode.as_str()),
    );
    emit_runtime_diag("gpu-recovery-start", "info", &details);

    wasm_bindgen_futures::spawn_local(async move {
        match try_init(mode).await {
            Ok(status) => {
                set_gpu_status_attr(status);
                let details = js_sys::Object::new();
                let _ = js_sys::Reflect::set(
                    &details,
                    &JsValue::from_str("status"),
                    &JsValue::from_str(status),
                );
                emit_runtime_diag("gpu-recovery-success", "info", &details);
            }
            Err(err) => {
                clear_gpu_state();
                set_gpu_status_attr("unavailable");
                let details = js_sys::Object::new();
                let _ = js_sys::Reflect::set(
                    &details,
                    &JsValue::from_str("error"),
                    &JsValue::from_str(&err.as_string().unwrap_or_else(|| format!("{err:?}"))),
                );
                emit_runtime_diag("gpu-fallback", "warn", &details);
            }
        }
    });
}

fn install_device_watchers(device: &bindings::GpuDevice, mode: GpuMode) {
    let lost_promise = device.lost();
    wasm_bindgen_futures::spawn_local(async move {
        let info = JsFuture::from(lost_promise).await.unwrap_or(JsValue::NULL);
        let reason = js_sys::Reflect::get(&info, &JsValue::from_str("reason"))
            .ok()
            .and_then(|value| value.as_string())
            .unwrap_or_else(|| "unknown".to_string());
        let message = js_sys::Reflect::get(&info, &JsValue::from_str("message"))
            .ok()
            .and_then(|value| value.as_string());
        handle_device_lost(mode, reason, message);
    });

    let uncaptured_handler =
        Closure::<dyn FnMut(web_sys::Event)>::new(move |event: web_sys::Event| {
        let error_value = js_sys::Reflect::get(event.as_ref(), &JsValue::from_str("error"))
            .unwrap_or(JsValue::NULL);
        let message = js_sys::Reflect::get(&error_value, &JsValue::from_str("message"))
            .ok()
            .and_then(|value| value.as_string())
            .unwrap_or_else(|| format!("{error_value:?}"));
        dom::warn(&format!("[gpu] Uncaptured GPU error: {message}"));

        let details = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &details,
            &JsValue::from_str("message"),
            &JsValue::from_str(&message),
        );
        emit_runtime_diag("gpu-uncaptured-error", "warn", &details);
    });

    let target: &web_sys::EventTarget = device.unchecked_ref();
    let _ = target.add_event_listener_with_callback(
        "uncapturederror",
        uncaptured_handler.as_ref().unchecked_ref(),
    );
    uncaptured_handler.forget();
}

pub async fn init() {
    GPU_INIT_TIMEOUT.with(|flag| *flag.borrow_mut() = false);
    GPU_RECOVERY_ATTEMPTS.with(|attempts| attempts.set(0));
    clear_gpu_state();

    let mode = parse_gpu_mode_from_query();
    GPU_REQUESTED_MODE.with(|selected| selected.set(mode));
    set_gpu_mode_attr(mode);

    let perf_mode = resolve_perf_mode_from_query();
    PERF_MODE.with(|selected| selected.set(perf_mode.mode));
    set_perf_mode_attr(perf_mode.mode);
    apply_profile_attrs(perf_mode.mode);
    dom::set_timeout_once(250, move || {
        apply_profile_attrs(perf_mode.mode);
    });

    let perf_details = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        &perf_details,
        &JsValue::from_str("mode"),
        &JsValue::from_str(perf_mode.mode.as_str()),
    );
    let _ = js_sys::Reflect::set(
        &perf_details,
        &JsValue::from_str("source"),
        &JsValue::from_str(perf_mode.source),
    );
    if let Some(raw) = perf_mode.raw_query {
        let _ = js_sys::Reflect::set(
            &perf_details,
            &JsValue::from_str("query"),
            &JsValue::from_str(&raw),
        );
    }
    let perf_log_level = if perf_mode.source == "query-invalid" {
        "warn"
    } else {
        "info"
    };
    emit_runtime_diag("perf-mode-selected", perf_log_level, &perf_details);

    if mode == GpuMode::Off {
        set_gpu_status_attr("off");
        dom::warn("[gpu] GPU mode is off; skipping WebGPU init");
        return;
    }

    set_gpu_status_attr("unavailable");

    let gpu_promise = wasm_bindgen_futures::future_to_promise(async move {
        match try_init(mode).await {
            Ok(status) => Ok(JsValue::from_str(status)),
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
        Ok(status) => {
            let status = status.as_string().unwrap_or_else(|| "ready".to_string());
            set_gpu_status_attr(&status);
            dom::warn("[gpu] WebGPU initialized (Metal backend)");
        }
        Err(e) => {
            let msg = e.as_string().unwrap_or_else(|| format!("{e:?}"));
            let timed_out = GPU_INIT_TIMEOUT.with(|flag| *flag.borrow());
            set_gpu_status_attr(if timed_out { "timeout" } else { "unavailable" });
            clear_gpu_state();
            dom::warn(&format!(
                "[gpu] WebGPU unavailable, using DOM fallback: {msg}"
            ));
        }
    }
}

async fn try_init(mode: GpuMode) -> Result<&'static str, JsValue> {
    let nav = dom::window().navigator();
    let ext_nav: &bindings::ExtNavigator = nav.unchecked_ref();
    let gpu_js = ext_nav.gpu();
    if gpu_js.is_null() || gpu_js.is_undefined() {
        return Err(JsValue::from_str("navigator.gpu unavailable"));
    }
    let gpu: bindings::Gpu = gpu_js.unchecked_into();
    let preferences = adapter_preferences(mode);
    for (idx, preference) in preferences.into_iter().enumerate() {
        let adapter_opts = bindings::GpuRequestAdapterOptions::new();
        adapter_opts.set_power_preference(preference);
        let adapter_val = JsFuture::from(gpu.request_adapter_with_options(&adapter_opts)).await?;
        if adapter_val.is_null() || adapter_val.is_undefined() {
            continue;
        }
        let adapter: bindings::GpuAdapter = adapter_val.unchecked_into();
        let device_promise = adapter.request_device();
        let device_val = JsFuture::from(device_promise).await?;
        if device_val.is_null() || device_val.is_undefined() {
            continue;
        }

        let device: bindings::GpuDevice = device_val.unchecked_into();
        install_device_watchers(&device, mode);
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

        return Ok(if idx == 0 { "ready" } else { "fallback" });
    }

    Err(JsValue::from_str("No WebGPU adapter available"))
}

fn size_canvas_to_window(canvas: &HtmlCanvasElement) {
    let window = dom::window();
    let perf_mode = current_perf_mode();
    apply_profile_attrs(perf_mode);

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
    let dpr = window.device_pixel_ratio() * gpu_resolution_scale(perf_mode);
    canvas.set_width((f64::from(w) * dpr).round() as u32);
    canvas.set_height((f64::from(h) * dpr).round() as u32);
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
    apply_profile_attrs(current_perf_mode());
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
