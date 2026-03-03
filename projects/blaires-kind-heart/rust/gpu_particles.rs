use crate::{bindings, dom, gpu, native_apis};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsValue;
const FLOATS_PER_PARTICLE: usize = 8;
const MAX_PARTICLES: usize = 512;
const PARTICLE_WORKGROUP_SIZE: u32 = 256;
const PARTICLE_BUFFER_SIZE: usize = MAX_PARTICLES * FLOATS_PER_PARTICLE * 4;
const PARTICLE_UNIFORM_FLOATS: usize = 12;
const PARTICLE_UNIFORM_BUFFER_SIZE: f64 = (PARTICLE_UNIFORM_FLOATS * 4) as f64;
const IPAD_MINI_PARTICLE_SCALE: f32 = 0.75;
const IPAD_MINI_PARTICLE_FRAME_MS: f64 = 33.0;
pub struct BurstConfig {
    pub count: u32,
    pub lifetime: f32,
    pub speed_min: f32,
    pub speed_max: f32,
    pub gravity: f32,
    pub colors: &'static [[f32; 4]],
    pub size_min: f32,
    pub size_max: f32,
}
const HEART_COLORS: &[[f32; 4]] = &[
    [0.8, 0.2, 0.6, 1.0],
    [1.0, 0.4, 0.4, 1.0],
    [0.4, 0.8, 0.4, 1.0],
    [1.0, 0.8, 0.2, 1.0],
    [0.8, 0.4, 0.9, 1.0],
];
const STAR_COLORS: &[[f32; 4]] = &[
    [1.0, 0.85, 0.0, 1.0],
    [1.0, 0.95, 0.5, 1.0],
    [0.9, 0.7, 1.0, 1.0],
    [0.5, 0.9, 1.0, 1.0],
    [1.0, 0.6, 0.8, 1.0],
];
const PARTY_COLORS: &[[f32; 4]] = &[
    [1.0, 0.3, 0.5, 1.0],
    [0.3, 0.8, 1.0, 1.0],
    [1.0, 0.9, 0.1, 1.0],
    [0.5, 1.0, 0.5, 1.0],
    [0.8, 0.4, 1.0, 1.0],
    [1.0, 0.5, 0.2, 1.0],
];
const UNICORN_COLORS: &[[f32; 4]] = &[
    [0.8, 0.4, 0.9, 1.0],
    [1.0, 0.6, 0.8, 1.0],
    [0.5, 0.9, 1.0, 1.0],
    [1.0, 0.95, 0.5, 1.0],
    [1.0, 1.0, 1.0, 0.9],
];
pub const BURST_HEARTS: BurstConfig = BurstConfig {
    count: 40,
    lifetime: 1.5,
    speed_min: 0.3,
    speed_max: 0.8,
    gravity: 0.5,
    colors: HEART_COLORS,
    size_min: 4.0,
    size_max: 10.0,
};
pub const BURST_STARS: BurstConfig = BurstConfig {
    count: 60,
    lifetime: 1.8,
    speed_min: 0.2,
    speed_max: 0.7,
    gravity: 0.3,
    colors: STAR_COLORS,
    size_min: 3.0,
    size_max: 8.0,
};
pub const BURST_PARTY: BurstConfig = BurstConfig {
    count: 120,
    lifetime: 2.5,
    speed_min: 0.4,
    speed_max: 1.0,
    gravity: 0.4,
    colors: PARTY_COLORS,
    size_min: 3.0,
    size_max: 12.0,
};
pub const BURST_UNICORN: BurstConfig = BurstConfig {
    count: 50,
    lifetime: 1.2,
    speed_min: 0.3,
    speed_max: 0.6,
    gravity: 0.2,
    colors: UNICORN_COLORS,
    size_min: 5.0,
    size_max: 14.0,
};
thread_local! {
    static PIPELINE: RefCell<Option<ParticlePipeline>> = const { RefCell::new(None) };
    static ACTIVE_BURST: RefCell<Option<ActiveBurst>> = const { RefCell::new(None) };
    static RENDERING_PAUSED: RefCell<bool> = const { RefCell::new(false) };
    static PARTICLE_SCRATCH: RefCell<[f32; MAX_PARTICLES * FLOATS_PER_PARTICLE]> =
        const { RefCell::new([0.0; MAX_PARTICLES * FLOATS_PER_PARTICLE]) };
}
pub fn set_paused(paused: bool) {
    RENDERING_PAUSED.with(|cell| {
        *cell.borrow_mut() = paused;
    });
}
struct ParticlePipeline {
    compute_pipeline: bindings::GpuComputePipeline,
    render_pipeline: bindings::GpuRenderPipeline,
    particle_buffer: bindings::GpuBuffer,
    uniform_buffer: bindings::GpuBuffer,
    compute_bind_group: bindings::GpuBindGroup,
    render_bind_group: bindings::GpuBindGroup,
}
struct ActiveBurst {
    _start_time: f64,
    _duration: f64,
    frame_id: i32,
    _closure: Closure<dyn FnMut(f64)>,
}
pub fn burst(config: &BurstConfig) {
    if dom::prefers_reduced_motion() {
        return;
    }
    if !gpu::is_available() {
        return;
    }
    native_apis::vibrate_success();
    ensure_pipeline();
    spawn_burst(config);
}
fn ensure_pipeline() {
    PIPELINE.with(|cell| {
        if cell.borrow().is_some() {
            return;
        }
        if let Some(Some(p)) = gpu::with_gpu(create_pipeline) {
            *cell.borrow_mut() = Some(p);
        }
    });
}
fn create_pipeline(state: &gpu::GpuState) -> Option<ParticlePipeline> {
    let device = &state.device;
    let particle_desc = bindings::GpuBufferDescriptor::new(
        PARTICLE_BUFFER_SIZE as f64,
        bindings::gpu_buffer_usage::STORAGE
            | bindings::gpu_buffer_usage::VERTEX
            | bindings::gpu_buffer_usage::COPY_DST,
    );
    particle_desc.set_label("particles");
    let particle_buffer = device.create_buffer(&particle_desc);

    let uniform_desc = bindings::GpuBufferDescriptor::new(
        PARTICLE_UNIFORM_BUFFER_SIZE,
        bindings::gpu_buffer_usage::UNIFORM | bindings::gpu_buffer_usage::COPY_DST,
    );
    uniform_desc.set_label("uniforms");
    let uniform_buffer = device.create_buffer(&uniform_desc);

    let compute_shader = create_shader(
        device,
        include_str!("../shaders/particles_compute.wgsl"),
        "particle-compute",
    );
    let render_shader = create_shader(
        device,
        include_str!("../shaders/particles_render.wgsl"),
        "particle-render",
    );

    let compute_bgl = device.create_bind_group_layout(&create_bind_group_layout_desc(true));
    let render_bgl = device.create_bind_group_layout(&create_bind_group_layout_desc(false));

    let compute_layouts = js_sys::Array::new();
    compute_layouts.push(&compute_bgl);
    let compute_pipeline_layout = device.create_pipeline_layout(
        &bindings::GpuPipelineLayoutDescriptor::new(&compute_layouts),
    );

    let render_layouts = js_sys::Array::new();
    render_layouts.push(&render_bgl);
    let render_pipeline_layout =
        device.create_pipeline_layout(&bindings::GpuPipelineLayoutDescriptor::new(&render_layouts));

    let compute_stage = bindings::GpuProgrammableStage::new(&compute_shader);
    compute_stage.set_entry_point("compute_main");
    let compute_desc =
        bindings::GpuComputePipelineDescriptor::new(&compute_pipeline_layout, &compute_stage);
    compute_desc.set_label("particle-compute");
    let compute_pipeline = device.create_compute_pipeline(&compute_desc);

    let render_pipeline = create_render_pipeline(
        device,
        &render_shader,
        &render_pipeline_layout,
        &state.format,
    );

    let compute_bind_group =
        create_bind_group(device, &compute_bgl, &particle_buffer, &uniform_buffer);
    let render_bind_group =
        create_bind_group(device, &render_bgl, &particle_buffer, &uniform_buffer);

    Some(ParticlePipeline {
        compute_pipeline,
        render_pipeline,
        particle_buffer,
        uniform_buffer,
        compute_bind_group,
        render_bind_group,
    })
}
fn create_shader(
    device: &bindings::GpuDevice,
    code: &str,
    label: &str,
) -> bindings::GpuShaderModule {
    let desc = bindings::GpuShaderModuleDescriptor::new(code);
    desc.set_label(label);
    device.create_shader_module(&desc)
}
fn create_bind_group_layout_desc(is_compute: bool) -> bindings::GpuBindGroupLayoutDescriptor {
    let entries = js_sys::Array::new();

    let particle_entry = bindings::GpuBindGroupLayoutEntry::new(
        0,
        if is_compute {
            bindings::gpu_shader_stage::COMPUTE
        } else {
            bindings::gpu_shader_stage::VERTEX
        },
    );
    let buffer_layout = bindings::GpuBufferBindingLayout::new();
    buffer_layout.set_type(if is_compute {
        "storage"
    } else {
        "read-only-storage"
    });
    particle_entry.set_buffer(&buffer_layout);
    entries.push(&particle_entry);

    let uniform_entry = bindings::GpuBindGroupLayoutEntry::new(
        1,
        if is_compute {
            bindings::gpu_shader_stage::COMPUTE
        } else {
            bindings::gpu_shader_stage::VERTEX | bindings::gpu_shader_stage::FRAGMENT
        },
    );
    let uni_layout = bindings::GpuBufferBindingLayout::new();
    uni_layout.set_type("uniform");
    uniform_entry.set_buffer(&uni_layout);
    entries.push(&uniform_entry);

    bindings::GpuBindGroupLayoutDescriptor::new(&entries)
}
fn create_bind_group(
    device: &bindings::GpuDevice,
    layout: &bindings::GpuBindGroupLayout,
    particle_buffer: &bindings::GpuBuffer,
    uniform_buffer: &bindings::GpuBuffer,
) -> bindings::GpuBindGroup {
    let particle_binding = bindings::GpuBufferBinding::new(particle_buffer);
    let uniform_binding = bindings::GpuBufferBinding::new(uniform_buffer);
    let entries = js_sys::Array::new();
    entries.push(&bindings::GpuBindGroupEntry::new(
        0,
        particle_binding.as_ref(),
    ));
    entries.push(&bindings::GpuBindGroupEntry::new(
        1,
        uniform_binding.as_ref(),
    ));
    device.create_bind_group(&bindings::GpuBindGroupDescriptor::new(&entries, layout))
}
fn create_render_pipeline(
    device: &bindings::GpuDevice,
    shader: &bindings::GpuShaderModule,
    layout: &bindings::GpuPipelineLayout,
    format: &JsValue,
) -> bindings::GpuRenderPipeline {
    let vertex_state = bindings::GpuVertexState::new(shader);
    vertex_state.set_entry_point("vs_main");
    let blend_component_color = bindings::GpuBlendComponent::new();
    blend_component_color.set_src_factor("src-alpha");
    blend_component_color.set_dst_factor("one-minus-src-alpha");
    blend_component_color.set_operation("add");
    let blend_component_alpha = bindings::GpuBlendComponent::new();
    blend_component_alpha.set_src_factor("one");
    blend_component_alpha.set_dst_factor("one-minus-src-alpha");
    blend_component_alpha.set_operation("add");
    let blend_state = bindings::GpuBlendState::new(&blend_component_alpha, &blend_component_color);
    let color_target = bindings::GpuColorTargetState::new(format);
    color_target.set_blend(&blend_state);
    let targets = js_sys::Array::new();
    targets.push(&color_target);
    let fragment_state = bindings::GpuFragmentState::new(shader, &targets);
    fragment_state.set_entry_point("fs_main");
    let primitive = bindings::GpuPrimitiveState::new();
    primitive.set_topology("triangle-strip");
    let desc = bindings::GpuRenderPipelineDescriptor::new(layout, &vertex_state);
    desc.set_fragment(&fragment_state);
    desc.set_primitive(&primitive);
    desc.set_label("particle-render");
    device.create_render_pipeline(&desc)
}
fn spawn_burst(config: &BurstConfig) {
    stop_active_burst();
    let requested_count = config.count.min(MAX_PARTICLES as u32);
    // iPad mini 6 profile keeps burst effects smooth while reducing compute load.
    let count = if gpu::is_ipad_mini_6_profile() {
        ((requested_count as f32) * IPAD_MINI_PARTICLE_SCALE)
            .round()
            .clamp(24.0, MAX_PARTICLES as f32) as u32
    } else {
        requested_count
    };
    let duration = f64::from(config.lifetime) * 1000.0;
    let now = crate::browser_apis::now_ms();
    PARTICLE_SCRATCH.with(|scratch| {
        let mut particle_data = scratch.borrow_mut();
        particle_data.fill(0.0);
        for i in 0..count as usize {
            let base = i * FLOATS_PER_PARTICLE;
            let seed = ((now as u64).wrapping_add(i as u64 * 7919)) % 10000;
            let angle = (seed as f32 / 10000.0) * std::f32::consts::TAU;
            let speed = config.speed_min
                + (((seed * 3) % 10000) as f32 / 10000.0) * (config.speed_max - config.speed_min);
            particle_data[base] = 0.4 + (((seed * 7) % 1000) as f32 / 1000.0) * 0.2;
            particle_data[base + 1] = 0.5 + (((seed * 13) % 1000) as f32 / 1000.0) * 0.1;
            particle_data[base + 2] = angle.cos() * speed;
            particle_data[base + 3] = angle.sin() * speed - 0.3;
            particle_data[base + 4] = 1.0;
            particle_data[base + 5] = (i % config.colors.len()) as f32;
            particle_data[base + 6] = config.size_min
                + (((seed * 17) % 1000) as f32 / 1000.0) * (config.size_max - config.size_min);
            particle_data[base + 7] = angle;
        }
        PIPELINE.with(|cell| {
            let guard = cell.borrow();
            let Some(pipeline) = guard.as_ref() else {
                return;
            };
            gpu::with_gpu(|state| {
                write_buffer_from_f32(&state.queue, &pipeline.particle_buffer, &particle_data[..]);
            });
        });
    });
    let start_time = now;
    let gravity = config.gravity;
    let particle_count = count;
    let target_frame_ms = if gpu::is_ipad_mini_6_profile() {
        IPAD_MINI_PARTICLE_FRAME_MS
    } else {
        16.0
    };
    let last_frame_ts = Rc::new(RefCell::new(0.0f64));
    type RafClosure = Rc<RefCell<Option<Closure<dyn FnMut(f64)>>>>;
    let closure: RafClosure = Rc::new(RefCell::new(None));
    let closure_clone = closure.clone();
    let last_frame_ts_clone = last_frame_ts.clone();
    let frame_fn = Closure::<dyn FnMut(f64)>::new(move |timestamp: f64| {
        let is_paused = RENDERING_PAUSED.with(|cell| *cell.borrow());
        if is_paused {
            return;
        }
        let elapsed = timestamp - start_time;
        if elapsed > duration + 500.0 {
            ACTIVE_BURST.with(|cell| {
                *cell.borrow_mut() = None;
            });
            gpu::clear_frame();
            return;
        }
        let should_render = {
            let mut last = last_frame_ts_clone.borrow_mut();
            if *last > 0.0 && (timestamp - *last) < target_frame_ms {
                false
            } else {
                *last = timestamp;
                true
            }
        };
        if should_render {
            let dt = if target_frame_ms >= 30.0 {
                1.0 / 30.0
            } else {
                1.0 / 60.0
            };
            render_frame(dt as f32, gravity, particle_count, elapsed as f32 / 1000.0);
        }
        if let Some(ref cb) = *closure_clone.borrow() {
            let id = native_apis::request_animation_frame(cb);
            ACTIVE_BURST.with(|cell| {
                if let Some(ref mut burst) = *cell.borrow_mut() {
                    burst.frame_id = id;
                }
            });
        }
    });
    let frame_id = native_apis::request_animation_frame(&frame_fn);
    ACTIVE_BURST.with(|cell| {
        *cell.borrow_mut() = Some(ActiveBurst {
            _start_time: start_time,
            _duration: duration,
            frame_id,
            _closure: frame_fn,
        });
    });
    *closure.borrow_mut() = None;
}
fn render_frame(dt: f32, gravity: f32, particle_count: u32, elapsed: f32) {
    PIPELINE.with(|cell| {
        let guard = cell.borrow();
        let Some(pipeline) = guard.as_ref() else {
            return;
        };
        gpu::with_gpu(|state| {
            let (sparkle_strength, rotation_enabled) = if gpu::is_ipad_mini_6_profile() {
                (0.0f32, 0.0f32)
            } else {
                (1.0f32, 1.0f32)
            };
            let canvas_w = state.canvas.width() as f32;
            let canvas_h = state.canvas.height() as f32;
            let uniforms = [
                elapsed,
                dt,
                gravity,
                particle_count as f32,
                canvas_w,
                canvas_h,
                sparkle_strength,
                rotation_enabled,
                0.0f32,
                0.0f32,
                0.0f32,
                0.0f32,
            ];
            write_buffer_from_f32(&state.queue, &pipeline.uniform_buffer, &uniforms);

            let encoder = state.device.create_command_encoder();
            let compute_pass = encoder.begin_compute_pass();
            compute_pass.set_pipeline(&pipeline.compute_pipeline);
            compute_pass.set_bind_group(0, Some(&pipeline.compute_bind_group));

            let workgroups = particle_count.div_ceil(PARTICLE_WORKGROUP_SIZE);
            compute_pass.dispatch_workgroups(workgroups);
            compute_pass.end();

            let texture = state.context.get_current_texture();
            let view = texture.create_view();

            let color_attachment =
                bindings::GpuRenderPassColorAttachment::new("clear", "store", &view);
            color_attachment
                .set_clear_value(&bindings::GpuColorDict::new(0.0, 0.0, 0.0, 0.0).into());
            let color_attachments = js_sys::Array::new();
            color_attachments.push(&color_attachment);

            let render_pass = encoder
                .begin_render_pass(&bindings::GpuRenderPassDescriptor::new(&color_attachments));
            render_pass.set_pipeline_render(&pipeline.render_pipeline);
            render_pass.set_bind_group_render(0, Some(&pipeline.render_bind_group));
            render_pass.draw_with_instance_count(4, particle_count);
            render_pass.end();

            let commands = js_sys::Array::new();
            commands.push(&encoder.finish());
            state.queue.submit(&commands);
        });
    });
}
fn stop_active_burst() {
    ACTIVE_BURST.with(|cell| {
        if let Some(burst) = cell.borrow_mut().take() {
            native_apis::cancel_animation_frame(burst.frame_id);
        }
    });
}
fn write_buffer_from_f32(queue: &bindings::GpuQueue, buffer: &bindings::GpuBuffer, data: &[f32]) {
    // SAFETY: view() borrows current WASM linear memory. We immediately call
    // writeBuffer and do not allocate between creating the view and using it.
    // That avoids memory growth invalidating the view during this call.
    let bytes = bytemuck_cast_slice(data);
    let view = unsafe { js_sys::Uint8Array::view(bytes) };
    queue.write_buffer_with_u32_and_u8_array(buffer, 0, &view);
}
const fn bytemuck_cast_slice(data: &[f32]) -> &[u8] {
    unsafe { std::slice::from_raw_parts(data.as_ptr() as *const u8, std::mem::size_of_val(data)) }
}
