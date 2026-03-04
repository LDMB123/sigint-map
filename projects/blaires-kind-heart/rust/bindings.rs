use wasm_bindgen::prelude::*;
use web_sys::EventTarget;
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = EventTarget)]
    pub type Navigation;
    #[wasm_bindgen(method)]
    pub fn navigate(this: &Navigation, url: &str, options: &JsValue) -> JsValue;
    #[wasm_bindgen(method)]
    pub fn back(this: &Navigation) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = canGoBack)]
    pub fn can_go_back(this: &Navigation) -> bool;
    #[wasm_bindgen(method, getter, js_name = currentEntry)]
    pub fn current_entry(this: &Navigation) -> JsValue;
    #[wasm_bindgen(method, js_name = updateCurrentEntry)]
    pub fn update_current_entry(this: &Navigation, options: &JsValue);
    pub type NavigateEvent;
    #[wasm_bindgen(method, getter, js_name = navigationType)]
    pub fn navigation_type(this: &NavigateEvent) -> String;
    #[wasm_bindgen(method, getter)]
    pub fn destination(this: &NavigateEvent) -> NavigationDestination;
    #[wasm_bindgen(method)]
    pub fn intercept(this: &NavigateEvent, options: &JsValue);
    #[wasm_bindgen(method, getter, js_name = downloadRequest)]
    pub fn download_request(this: &NavigateEvent) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = canIntercept)]
    pub fn can_intercept(this: &NavigateEvent) -> bool;
    pub type NavigationDestination;
    #[wasm_bindgen(method, js_name = getState)]
    pub fn get_state(this: &NavigationDestination) -> JsValue;
    pub type NavigationHistoryEntry;
    #[wasm_bindgen(method, js_name = getState)]
    pub fn entry_get_state(this: &NavigationHistoryEntry) -> JsValue;
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type AddEventListenerOptions;
    #[wasm_bindgen(method, setter)]
    pub fn set_signal(this: &AddEventListenerOptions, signal: &web_sys::AbortSignal);
}
impl AddEventListenerOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
    pub fn with_signal(signal: &web_sys::AbortSignal) -> Self {
        let opts = Self::new();
        opts.set_signal(signal);
        opts
    }
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type InterceptOptions;
    #[wasm_bindgen(method, setter)]
    pub fn set_handler(this: &InterceptOptions, handler: &js_sys::Function);
}
impl InterceptOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type PerformanceObserveOptions;
    #[wasm_bindgen(method, setter, js_name = "type")]
    pub fn set_type(this: &PerformanceObserveOptions, val: &str);
    #[wasm_bindgen(method, setter)]
    pub fn set_buffered(this: &PerformanceObserveOptions, val: bool);
    #[wasm_bindgen(method, setter, js_name = durationThreshold)]
    pub fn set_duration_threshold(this: &PerformanceObserveOptions, val: f64);
}
impl PerformanceObserveOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = web_sys::HtmlElement, extends = web_sys::Element)]
    pub type PopoverElement;
    #[wasm_bindgen(method, js_name = showPopover)]
    pub fn show_popover(this: &PopoverElement);
    #[wasm_bindgen(method, js_name = hidePopover)]
    pub fn hide_popover(this: &PopoverElement);
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type TrustedTypePolicyOptions;
    #[wasm_bindgen(method, setter, js_name = createHTML)]
    pub fn set_create_html(this: &TrustedTypePolicyOptions, handler: &js_sys::Function);
    #[wasm_bindgen(method, setter, js_name = createScriptURL)]
    pub fn set_create_script_url(this: &TrustedTypePolicyOptions, handler: &js_sys::Function);
}
impl TrustedTypePolicyOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}
#[wasm_bindgen]
extern "C" {
    pub type TrustedTypePolicyFactory;
    pub type TrustedTypePolicy;
    pub type TrustedHTML;
    pub type TrustedScriptURL;
    #[wasm_bindgen(method, js_name = createPolicy)]
    pub fn create_policy(
        this: &TrustedTypePolicyFactory,
        name: &str,
        options: &JsValue,
    ) -> TrustedTypePolicy;
    #[wasm_bindgen(method, js_name = createHTML)]
    pub fn create_html(this: &TrustedTypePolicy, input: &str) -> TrustedHTML;
    #[wasm_bindgen(method, js_name = createScriptURL)]
    pub fn create_script_url(this: &TrustedTypePolicy, input: &str) -> TrustedScriptURL;
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = web_sys::EventTarget)]
    pub type TrustedWorker;
    #[wasm_bindgen(constructor, js_class = "Worker", catch)]
    pub fn new_with_options(
        script_url: &TrustedScriptURL,
        options: &web_sys::WorkerOptions,
    ) -> Result<TrustedWorker, JsValue>;
    #[wasm_bindgen(method, setter, js_name = onmessage)]
    pub fn set_onmessage(this: &TrustedWorker, handler: Option<&js_sys::Function>);
    #[wasm_bindgen(method, catch, js_name = postMessage)]
    pub fn post_message(this: &TrustedWorker, message: &JsValue) -> Result<(), JsValue>;
    #[wasm_bindgen(method)]
    pub fn terminate(this: &TrustedWorker);
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = web_sys::Navigator, extends = EventTarget)]
    pub type BadgeNavigator;
    #[wasm_bindgen(method, catch, js_name = setAppBadge)]
    pub fn set_app_badge(this: &BadgeNavigator, count: u32) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(method, getter, js_name = standalone)]
    pub fn standalone(this: &BadgeNavigator) -> JsValue;
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = web_sys::Element, extends = EventTarget)]
    pub type TrustedElement;
    #[wasm_bindgen(method, setter, js_name = innerHTML)]
    pub fn set_inner_html_trusted(this: &TrustedElement, value: &TrustedHTML);
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = web_sys::Window)]
    pub type NavigationWindow;
    #[wasm_bindgen(method, getter)]
    pub fn navigation(this: &NavigationWindow) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = trustedTypes)]
    pub fn trusted_types(this: &NavigationWindow) -> JsValue;
}
#[wasm_bindgen]
extern "C" {
    pub type NavigateErrorEvent;
    #[wasm_bindgen(method, getter)]
    pub fn message(this: &NavigateErrorEvent) -> Option<String>;
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type KeyframeAnimationOptions;
    #[wasm_bindgen(method, setter)]
    pub fn set_duration(this: &KeyframeAnimationOptions, val: &JsValue);
    #[wasm_bindgen(method, setter)]
    pub fn set_easing(this: &KeyframeAnimationOptions, val: &str);
    #[wasm_bindgen(method, setter)]
    pub fn set_fill(this: &KeyframeAnimationOptions, val: &str);
}
impl KeyframeAnimationOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = web_sys::Element)]
    pub type AnimatableElement;
    #[wasm_bindgen(method, js_name = animate)]
    pub fn animate_with_keyframe_animation_options(
        this: &AnimatableElement,
        keyframes: Option<&JsValue>,
        options: &KeyframeAnimationOptions,
    ) -> web_sys::Animation;
}
#[wasm_bindgen]
extern "C" {
    pub type LockManager;
    #[wasm_bindgen(method, js_name = request)]
    pub fn request_with_callback(
        this: &LockManager,
        name: &str,
        callback: &js_sys::Function,
    ) -> js_sys::Promise;
    #[wasm_bindgen(method, js_name = request)]
    pub fn request_with_options(
        this: &LockManager,
        name: &str,
        options: &JsValue,
        callback: &js_sys::Function,
    ) -> js_sys::Promise;
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = web_sys::Navigator)]
    pub type ExtNavigator;
    #[wasm_bindgen(method, getter)]
    pub fn gpu(this: &ExtNavigator) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = wakeLock)]
    pub fn wake_lock(this: &ExtNavigator) -> JsValue;
    #[wasm_bindgen(method, getter)]
    pub fn locks(this: &ExtNavigator) -> LockManager;
}
#[wasm_bindgen]
extern "C" {
    pub type ScreenOrientation;
    #[wasm_bindgen(method, catch)]
    pub fn lock(this: &ScreenOrientation, orientation: &str) -> Result<js_sys::Promise, JsValue>;
    #[wasm_bindgen(method)]
    pub fn unlock(this: &ScreenOrientation);
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = web_sys::Screen)]
    pub type ExtScreen;
    #[wasm_bindgen(method, getter)]
    pub fn orientation(this: &ExtScreen) -> ScreenOrientation;
}
#[wasm_bindgen]
extern "C" {
    pub type Gpu;
    #[wasm_bindgen(method, js_name = requestAdapter)]
    pub fn request_adapter_with_options(
        this: &Gpu,
        options: &GpuRequestAdapterOptions,
    ) -> js_sys::Promise;
    #[wasm_bindgen(method, js_name = getPreferredCanvasFormat)]
    pub fn get_preferred_canvas_format(this: &Gpu) -> JsValue;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuRequestAdapterOptions;
    #[wasm_bindgen(method, setter, js_name = powerPreference)]
    pub fn set_power_preference(this: &GpuRequestAdapterOptions, val: &str);
    pub type GpuAdapter;
    #[wasm_bindgen(method, js_name = requestDevice)]
    pub fn request_device(this: &GpuAdapter) -> js_sys::Promise;
    #[wasm_bindgen(extends = EventTarget)]
    pub type GpuDevice;
    #[wasm_bindgen(method, getter)]
    pub fn queue(this: &GpuDevice) -> GpuQueue;
    #[wasm_bindgen(method, getter)]
    pub fn lost(this: &GpuDevice) -> js_sys::Promise;
    #[wasm_bindgen(method, js_name = createBuffer)]
    pub fn create_buffer(this: &GpuDevice, descriptor: &GpuBufferDescriptor) -> GpuBuffer;
    #[wasm_bindgen(method, js_name = createShaderModule)]
    pub fn create_shader_module(
        this: &GpuDevice,
        descriptor: &GpuShaderModuleDescriptor,
    ) -> GpuShaderModule;
    #[wasm_bindgen(method, js_name = createBindGroupLayout)]
    pub fn create_bind_group_layout(
        this: &GpuDevice,
        descriptor: &GpuBindGroupLayoutDescriptor,
    ) -> GpuBindGroupLayout;
    #[wasm_bindgen(method, js_name = createPipelineLayout)]
    pub fn create_pipeline_layout(
        this: &GpuDevice,
        descriptor: &GpuPipelineLayoutDescriptor,
    ) -> GpuPipelineLayout;
    #[wasm_bindgen(method, js_name = createComputePipeline)]
    pub fn create_compute_pipeline(
        this: &GpuDevice,
        descriptor: &GpuComputePipelineDescriptor,
    ) -> GpuComputePipeline;
    #[wasm_bindgen(method, js_name = createRenderPipeline)]
    pub fn create_render_pipeline(
        this: &GpuDevice,
        descriptor: &GpuRenderPipelineDescriptor,
    ) -> GpuRenderPipeline;
    #[wasm_bindgen(method, js_name = createBindGroup)]
    pub fn create_bind_group(this: &GpuDevice, descriptor: &GpuBindGroupDescriptor)
        -> GpuBindGroup;
    #[wasm_bindgen(method, js_name = createCommandEncoder)]
    pub fn create_command_encoder(this: &GpuDevice) -> GpuCommandEncoder;
    pub type GpuQueue;
    #[wasm_bindgen(method, js_name = writeBuffer)]
    pub fn write_buffer_with_u32_and_u8_array(
        this: &GpuQueue,
        buffer: &GpuBuffer,
        offset: u32,
        data: &js_sys::Uint8Array,
    );
    #[wasm_bindgen(method)]
    pub fn submit(this: &GpuQueue, command_buffers: &js_sys::Array);
    pub type GpuBuffer;
    #[wasm_bindgen(method, js_name = getMappedRange)]
    pub fn get_mapped_range(this: &GpuBuffer) -> js_sys::ArrayBuffer;
    #[wasm_bindgen(method)]
    pub fn unmap(this: &GpuBuffer);
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuBufferDescriptor;
    #[wasm_bindgen(method, setter)]
    pub fn set_label(this: &GpuBufferDescriptor, val: &str);
    #[wasm_bindgen(method, setter, js_name = mappedAtCreation)]
    pub fn set_mapped_at_creation(this: &GpuBufferDescriptor, val: bool);
    pub type GpuShaderModule;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuShaderModuleDescriptor;
    #[wasm_bindgen(method, setter)]
    pub fn set_label(this: &GpuShaderModuleDescriptor, val: &str);
    pub type GpuComputePipeline;

    pub type GpuRenderPipeline;
    pub type GpuPipelineLayout;
    pub type GpuBindGroupLayout;
    pub type GpuBindGroup;
    pub type GpuCommandEncoder;
    #[wasm_bindgen(method, js_name = beginComputePass)]
    pub fn begin_compute_pass(this: &GpuCommandEncoder) -> GpuComputePassEncoder;
    #[wasm_bindgen(method, js_name = beginRenderPass)]
    pub fn begin_render_pass(
        this: &GpuCommandEncoder,
        descriptor: &GpuRenderPassDescriptor,
    ) -> GpuRenderPassEncoder;
    #[wasm_bindgen(method)]
    pub fn finish(this: &GpuCommandEncoder) -> GpuCommandBuffer;
    pub type GpuCommandBuffer;
    pub type GpuComputePassEncoder;
    #[wasm_bindgen(method, js_name = setPipeline)]
    pub fn set_pipeline(this: &GpuComputePassEncoder, pipeline: &GpuComputePipeline);
    #[wasm_bindgen(method, js_name = setBindGroup)]
    pub fn set_bind_group(
        this: &GpuComputePassEncoder,
        index: u32,
        bind_group: Option<&GpuBindGroup>,
    );
    #[wasm_bindgen(method, js_name = dispatchWorkgroups)]
    pub fn dispatch_workgroups(this: &GpuComputePassEncoder, x: u32);
    #[wasm_bindgen(method)]
    pub fn end(this: &GpuComputePassEncoder);
    pub type GpuRenderPassEncoder;
    #[wasm_bindgen(method, js_name = setPipeline)]
    pub fn set_pipeline_render(this: &GpuRenderPassEncoder, pipeline: &GpuRenderPipeline);
    #[wasm_bindgen(method, js_name = setBindGroup)]
    pub fn set_bind_group_render(
        this: &GpuRenderPassEncoder,
        index: u32,
        bind_group: Option<&GpuBindGroup>,
    );
    #[wasm_bindgen(method, js_name = draw)]
    pub fn draw_with_instance_count(
        this: &GpuRenderPassEncoder,
        vertex_count: u32,
        instance_count: u32,
    );
    #[wasm_bindgen(method)]
    pub fn end(this: &GpuRenderPassEncoder);
    pub type GpuCanvasContext;
    #[wasm_bindgen(method)]
    pub fn configure(this: &GpuCanvasContext, configuration: &GpuCanvasConfiguration);
    #[wasm_bindgen(method, js_name = getCurrentTexture)]
    pub fn get_current_texture(this: &GpuCanvasContext) -> GpuTexture;
    pub type GpuTexture;
    #[wasm_bindgen(method, js_name = createView)]
    pub fn create_view(this: &GpuTexture) -> GpuTextureView;
    pub type GpuTextureView;
    pub type GpuUncapturedErrorEvent;
    #[wasm_bindgen(method, getter)]
    pub fn error(this: &GpuUncapturedErrorEvent) -> JsValue;
    pub type GpuDeviceLostInfo;
    #[wasm_bindgen(method, getter)]
    pub fn reason(this: &GpuDeviceLostInfo) -> JsValue;
    #[wasm_bindgen(method, getter)]
    pub fn message(this: &GpuDeviceLostInfo) -> JsValue;
}
impl GpuRequestAdapterOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}
impl GpuBufferDescriptor {
    pub fn new(size: f64, usage: u32) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"size".into(), &JsValue::from_f64(size));
        let _ = js_sys::Reflect::set(&obj, &"usage".into(), &JsValue::from_f64(f64::from(usage)));
        obj.unchecked_into()
    }
}
impl GpuShaderModuleDescriptor {
    pub fn new(code: &str) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"code".into(), &JsValue::from_str(code));
        obj.unchecked_into()
    }
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuBindGroupLayoutDescriptor;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuBindGroupLayoutEntry;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuBufferBindingLayout;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuPipelineLayoutDescriptor;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuComputePipelineDescriptor;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuProgrammableStage;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuRenderPipelineDescriptor;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuVertexState;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuFragmentState;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuPrimitiveState;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuColorTargetState;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuBlendState;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuBlendComponent;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuRenderPassDescriptor;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuRenderPassColorAttachment;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuColorDict;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuBindGroupDescriptor;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuBindGroupEntry;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuBufferBinding;
    #[wasm_bindgen(extends = js_sys::Object)]
    pub type GpuCanvasConfiguration;
}
impl GpuBindGroupLayoutDescriptor {
    pub fn new(entries: &js_sys::Array) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"entries".into(), entries);
        obj.unchecked_into()
    }
}
impl GpuBindGroupLayoutEntry {
    pub fn new(binding: u32, visibility: u32) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &obj,
            &"binding".into(),
            &JsValue::from_f64(f64::from(binding)),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &"visibility".into(),
            &JsValue::from_f64(f64::from(visibility)),
        );
        obj.unchecked_into()
    }
    pub fn set_buffer(&self, layout: &GpuBufferBindingLayout) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"buffer".into(), layout.as_ref());
    }
}
impl GpuBufferBindingLayout {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
    pub fn set_type(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"type".into(), &JsValue::from_str(val));
    }
}
impl GpuPipelineLayoutDescriptor {
    pub fn new(bind_group_layouts: &js_sys::Array) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"bindGroupLayouts".into(), bind_group_layouts);
        obj.unchecked_into()
    }
}
impl GpuProgrammableStage {
    pub fn new(module: &GpuShaderModule) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"module".into(), module.as_ref());
        obj.unchecked_into()
    }
    pub fn set_entry_point(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"entryPoint".into(), &JsValue::from_str(val));
    }
}
impl GpuComputePipelineDescriptor {
    pub fn new(layout: &GpuPipelineLayout, compute: &GpuProgrammableStage) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"layout".into(), layout.as_ref());
        let _ = js_sys::Reflect::set(&obj, &"compute".into(), compute.as_ref());
        obj.unchecked_into()
    }
    pub fn set_label(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"label".into(), &JsValue::from_str(val));
    }
}
impl GpuRenderPipelineDescriptor {
    pub fn new(layout: &GpuPipelineLayout, vertex: &GpuVertexState) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"layout".into(), layout.as_ref());
        let _ = js_sys::Reflect::set(&obj, &"vertex".into(), vertex.as_ref());
        obj.unchecked_into()
    }
    pub fn set_fragment(&self, val: &GpuFragmentState) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"fragment".into(), val.as_ref());
    }
    pub fn set_primitive(&self, val: &GpuPrimitiveState) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"primitive".into(), val.as_ref());
    }
    pub fn set_label(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"label".into(), &JsValue::from_str(val));
    }
}
impl GpuVertexState {
    pub fn new(module: &GpuShaderModule) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"module".into(), module.as_ref());
        obj.unchecked_into()
    }
    pub fn set_entry_point(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"entryPoint".into(), &JsValue::from_str(val));
    }
}
impl GpuFragmentState {
    pub fn new(module: &GpuShaderModule, targets: &js_sys::Array) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"module".into(), module.as_ref());
        let _ = js_sys::Reflect::set(&obj, &"targets".into(), targets);
        obj.unchecked_into()
    }
    pub fn set_entry_point(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"entryPoint".into(), &JsValue::from_str(val));
    }
}
impl GpuPrimitiveState {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
    pub fn set_topology(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"topology".into(), &JsValue::from_str(val));
    }
}
impl GpuColorTargetState {
    pub fn new(format: &JsValue) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"format".into(), format);
        obj.unchecked_into()
    }
    pub fn set_blend(&self, val: &GpuBlendState) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"blend".into(), val.as_ref());
    }
}
impl GpuBlendState {
    pub fn new(alpha: &GpuBlendComponent, color: &GpuBlendComponent) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"alpha".into(), alpha.as_ref());
        let _ = js_sys::Reflect::set(&obj, &"color".into(), color.as_ref());
        obj.unchecked_into()
    }
}
impl GpuBlendComponent {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
    pub fn set_src_factor(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"srcFactor".into(), &JsValue::from_str(val));
    }
    pub fn set_dst_factor(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"dstFactor".into(), &JsValue::from_str(val));
    }
    pub fn set_operation(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"operation".into(), &JsValue::from_str(val));
    }
}
impl GpuRenderPassDescriptor {
    pub fn new(color_attachments: &js_sys::Array) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"colorAttachments".into(), color_attachments);
        obj.unchecked_into()
    }
}
impl GpuRenderPassColorAttachment {
    pub fn new(load_op: &str, store_op: &str, view: &GpuTextureView) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"loadOp".into(), &JsValue::from_str(load_op));
        let _ = js_sys::Reflect::set(&obj, &"storeOp".into(), &JsValue::from_str(store_op));
        let _ = js_sys::Reflect::set(&obj, &"view".into(), view.as_ref());
        obj.unchecked_into()
    }
    pub fn set_clear_value(&self, val: &JsValue) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"clearValue".into(), val);
    }
}
impl GpuColorDict {
    pub fn new(r: f64, g: f64, b: f64, a: f64) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"r".into(), &JsValue::from_f64(r));
        let _ = js_sys::Reflect::set(&obj, &"g".into(), &JsValue::from_f64(g));
        let _ = js_sys::Reflect::set(&obj, &"b".into(), &JsValue::from_f64(b));
        let _ = js_sys::Reflect::set(&obj, &"a".into(), &JsValue::from_f64(a));
        obj.unchecked_into()
    }
}
impl GpuBindGroupDescriptor {
    pub fn new(entries: &js_sys::Array, layout: &GpuBindGroupLayout) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"entries".into(), entries);
        let _ = js_sys::Reflect::set(&obj, &"layout".into(), layout.as_ref());
        obj.unchecked_into()
    }
}
impl GpuBindGroupEntry {
    pub fn new(binding: u32, resource: &JsValue) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &obj,
            &"binding".into(),
            &JsValue::from_f64(f64::from(binding)),
        );
        let _ = js_sys::Reflect::set(&obj, &"resource".into(), resource);
        obj.unchecked_into()
    }
}
impl GpuBufferBinding {
    pub fn new(buffer: &GpuBuffer) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"buffer".into(), buffer.as_ref());
        obj.unchecked_into()
    }
}
impl GpuCanvasConfiguration {
    pub fn new(device: &GpuDevice, format: &JsValue) -> Self {
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"device".into(), device.as_ref());
        let _ = js_sys::Reflect::set(&obj, &"format".into(), format);
        obj.unchecked_into()
    }
    pub fn set_alpha_mode(&self, val: &str) {
        let _ = js_sys::Reflect::set(self.as_ref(), &"alphaMode".into(), &JsValue::from_str(val));
    }
}
pub mod gpu_buffer_usage {
    pub const COPY_DST: u32 = 0x0008;
    pub const VERTEX: u32 = 0x0020;
    pub const UNIFORM: u32 = 0x0040;
    pub const STORAGE: u32 = 0x0080;
}
pub mod gpu_shader_stage {
    pub const VERTEX: u32 = 0x1;
    pub const FRAGMENT: u32 = 0x2;
    pub const COMPUTE: u32 = 0x4;
}
