//! GPU-accelerated particle system using WebGPU compute + render shaders.
//! Replaces DOM confetti with hundreds of GPU particles at 60fps.
//! Falls back to DOM confetti if WebGPU is unavailable.
//! All GPU types via custom bindings in bindings.rs (web-sys 0.3 lacks typed WebGPU).

use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsValue;

use crate::{bindings, dom, gpu, native_apis};

/// Per-particle data: position (x,y), velocity (vx,vy), life, color_idx, size, rotation.
/// 8 floats = 32 bytes per particle.
const FLOATS_PER_PARTICLE: usize = 8;
const MAX_PARTICLES: usize = 512;
const PARTICLE_BUFFER_SIZE: usize = MAX_PARTICLES * FLOATS_PER_PARTICLE * 4; // bytes

/// Burst configuration for different celebration types.
pub struct BurstConfig {
    pub count: u32,
    pub lifetime: f32,       // seconds
    pub speed_min: f32,
    pub speed_max: f32,
    pub gravity: f32,
    pub colors: &'static [[f32; 4]], // RGBA
    pub size_min: f32,
    pub size_max: f32,
}

// Pre-defined color palettes (RGBA, premultiplied alpha)
const HEART_COLORS: &[[f32; 4]] = &[
    [0.8, 0.2, 0.6, 1.0], // purple-pink
    [1.0, 0.4, 0.4, 1.0], // red
    [0.4, 0.8, 0.4, 1.0], // green
    [1.0, 0.8, 0.2, 1.0], // gold
    [0.8, 0.4, 0.9, 1.0], // violet
];

const STAR_COLORS: &[[f32; 4]] = &[
    [1.0, 0.85, 0.0, 1.0], // gold
    [1.0, 0.95, 0.5, 1.0], // light gold
    [0.9, 0.7, 1.0, 1.0],  // lavender
    [0.5, 0.9, 1.0, 1.0],  // cyan
    [1.0, 0.6, 0.8, 1.0],  // pink
];

const PARTY_COLORS: &[[f32; 4]] = &[
    [1.0, 0.3, 0.5, 1.0], // hot pink
    [0.3, 0.8, 1.0, 1.0], // sky blue
    [1.0, 0.9, 0.1, 1.0], // yellow
    [0.5, 1.0, 0.5, 1.0], // mint
    [0.8, 0.4, 1.0, 1.0], // purple
    [1.0, 0.5, 0.2, 1.0], // orange
];

const UNICORN_COLORS: &[[f32; 4]] = &[
    [0.8, 0.4, 0.9, 1.0], // purple
    [1.0, 0.6, 0.8, 1.0], // pink
    [0.5, 0.9, 1.0, 1.0], // cyan
    [1.0, 0.95, 0.5, 1.0],// gold sparkle
    [1.0, 1.0, 1.0, 0.9], // white shimmer
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

// GPU pipeline state — lazily created on first burst.
thread_local! {
    static PIPELINE: RefCell<Option<ParticlePipeline>> = const { RefCell::new(None) };
    static ACTIVE_BURST: RefCell<Option<ActiveBurst>> = const { RefCell::new(None) };
    static RENDERING_PAUSED: RefCell<bool> = const { RefCell::new(false) };
}

struct ParticlePipeline {
    compute_pipeline: bindings::GpuComputePipeline,
    render_pipeline: bindings::GpuRenderPipeline,
    particle_buffer: bindings::GpuBuffer,
    uniform_buffer: bindings::GpuBuffer,
}

struct ActiveBurst {
    _start_time: f64,
    _duration: f64,
    frame_id: i32,
    _closure: Closure<dyn FnMut(f64)>,
}

/// Fire a GPU particle burst. Falls back to DOM if GPU unavailable.
pub fn burst(config: &BurstConfig) {
    if dom::prefers_reduced_motion() { return; }

    if !gpu::is_available() {
        // No GPU — this will be handled by confetti.rs DOM fallback
        return;
    }

    // Haptic feedback for celebrations
    native_apis::vibrate_success();

    // Initialize pipeline if needed, then spawn particles
    ensure_pipeline();
    spawn_burst(config);
}

fn ensure_pipeline() {
    PIPELINE.with(|cell| {
        if cell.borrow().is_some() { return; }
        if let Some(Some(p)) = gpu::with_gpu(create_pipeline) {
            *cell.borrow_mut() = Some(p);
        }
    });
}

fn create_pipeline(state: &gpu::GpuState) -> Option<ParticlePipeline> {
    let device = &state.device;

    // Create particle storage buffer
    let particle_desc = bindings::GpuBufferDescriptor::new(
        PARTICLE_BUFFER_SIZE as f64,
        bindings::gpu_buffer_usage::STORAGE | bindings::gpu_buffer_usage::VERTEX | bindings::gpu_buffer_usage::COPY_DST,
    );
    particle_desc.set_label("particles");
    let particle_buffer = device.create_buffer(&particle_desc);

    // Create uniform buffer (time, dt, gravity, particle_count, canvas_size)
    let uniform_desc = bindings::GpuBufferDescriptor::new(
        32.0, // 8 floats
        bindings::gpu_buffer_usage::UNIFORM | bindings::gpu_buffer_usage::COPY_DST,
    );
    uniform_desc.set_label("uniforms");
    let uniform_buffer = device.create_buffer(&uniform_desc);

    // Create compute shader
    let compute_shader = create_compute_shader(device)?;

    // Create render shader
    let render_shader = create_render_shader(device)?;

    // Bind group layout
    let bind_group_layout_desc = create_bind_group_layout_desc();
    let bind_group_layout = device.create_bind_group_layout(&bind_group_layout_desc);

    let layouts = js_sys::Array::new();
    layouts.push(&bind_group_layout);
    let pipeline_layout_desc = bindings::GpuPipelineLayoutDescriptor::new(&layouts);
    let pipeline_layout = device.create_pipeline_layout(&pipeline_layout_desc);

    // Compute pipeline
    let compute_stage = bindings::GpuProgrammableStage::new(&compute_shader);
    compute_stage.set_entry_point("main");
    let compute_desc = bindings::GpuComputePipelineDescriptor::new(&pipeline_layout, &compute_stage);
    compute_desc.set_label("particle-compute");
    let compute_pipeline = device.create_compute_pipeline(&compute_desc);

    // Render pipeline
    let render_pipeline = create_render_pipeline(device, &render_shader, &pipeline_layout, &state.format)?;

    Some(ParticlePipeline {
        compute_pipeline,
        render_pipeline,
        particle_buffer,
        uniform_buffer,
    })
}

fn create_compute_shader(device: &bindings::GpuDevice) -> Option<bindings::GpuShaderModule> {
    let code = include_str!("../shaders/particles_compute.wgsl");
    let desc = bindings::GpuShaderModuleDescriptor::new(code);
    desc.set_label("particle-compute");
    Some(device.create_shader_module(&desc))
}

fn create_render_shader(device: &bindings::GpuDevice) -> Option<bindings::GpuShaderModule> {
    let code = include_str!("../shaders/particles_render.wgsl");
    let desc = bindings::GpuShaderModuleDescriptor::new(code);
    desc.set_label("particle-render");
    Some(device.create_shader_module(&desc))
}

fn create_bind_group_layout_desc() -> bindings::GpuBindGroupLayoutDescriptor {
    let entries = js_sys::Array::new();

    // Entry 0: particle buffer (storage, read-write in compute)
    let particle_entry = bindings::GpuBindGroupLayoutEntry::new(0, bindings::gpu_shader_stage::COMPUTE | bindings::gpu_shader_stage::VERTEX);
    let buffer_layout = bindings::GpuBufferBindingLayout::new();
    buffer_layout.set_type("storage");
    particle_entry.set_buffer(&buffer_layout);
    entries.push(&particle_entry);

    // Entry 1: uniform buffer
    let uniform_entry = bindings::GpuBindGroupLayoutEntry::new(1, bindings::gpu_shader_stage::COMPUTE | bindings::gpu_shader_stage::VERTEX | bindings::gpu_shader_stage::FRAGMENT);
    let uni_layout = bindings::GpuBufferBindingLayout::new();
    uni_layout.set_type("uniform");
    uniform_entry.set_buffer(&uni_layout);
    entries.push(&uniform_entry);

    bindings::GpuBindGroupLayoutDescriptor::new(&entries)
}

fn create_render_pipeline(
    device: &bindings::GpuDevice,
    shader: &bindings::GpuShaderModule,
    layout: &bindings::GpuPipelineLayout,
    format: &JsValue,
) -> Option<bindings::GpuRenderPipeline> {
    // Vertex state — instanced quads from particle buffer
    let vertex_state = bindings::GpuVertexState::new(shader);
    vertex_state.set_entry_point("vs_main");

    // Fragment state with alpha blending
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

    Some(device.create_render_pipeline(&desc))
}

fn spawn_burst(config: &BurstConfig) {
    // Cancel any active burst
    stop_active_burst();

    let count = config.count.min(MAX_PARTICLES as u32);
    let duration = config.lifetime as f64 * 1000.0; // ms

    // Generate initial particle data on CPU, upload to GPU
    let mut particle_data = vec![0.0f32; MAX_PARTICLES * FLOATS_PER_PARTICLE];
    let now = crate::browser_apis::now_ms();

    for i in 0..count as usize {
        let base = i * FLOATS_PER_PARTICLE;
        let seed = ((now as u64).wrapping_add(i as u64 * 7919)) % 10000;
        let angle = (seed as f32 / 10000.0) * std::f32::consts::TAU;
        let speed = config.speed_min + (((seed * 3) % 10000) as f32 / 10000.0) * (config.speed_max - config.speed_min);

        // x, y — start from center-ish with spread
        particle_data[base] = 0.4 + (((seed * 7) % 1000) as f32 / 1000.0) * 0.2; // x: 0.4..0.6
        particle_data[base + 1] = 0.5 + (((seed * 13) % 1000) as f32 / 1000.0) * 0.1; // y: 0.5..0.6
        // vx, vy — burst outward
        particle_data[base + 2] = angle.cos() * speed;
        particle_data[base + 3] = angle.sin() * speed - 0.3; // upward bias
        // life (1.0 = alive, 0.0 = dead)
        particle_data[base + 4] = 1.0;
        // color index
        particle_data[base + 5] = (i % config.colors.len()) as f32;
        // size
        particle_data[base + 6] = config.size_min + (((seed * 17) % 1000) as f32 / 1000.0) * (config.size_max - config.size_min);
        // rotation
        particle_data[base + 7] = angle;
    }

    // Upload particle data to GPU
    PIPELINE.with(|cell| {
        let guard = cell.borrow();
        let Some(pipeline) = guard.as_ref() else { return; };
        gpu::with_gpu(|state| {
            let bytes: &[u8] = bytemuck_cast_slice(&particle_data);
            let u8_arr = js_sys::Uint8Array::from(bytes);
            state.queue.write_buffer_with_u32_and_u8_array(&pipeline.particle_buffer, 0, &u8_arr);
        });
    });

    // Start render loop
    let start_time = now;
    let gravity = config.gravity;
    let particle_count = count;

    // Create animation frame loop
    type RafClosure = Rc<RefCell<Option<Closure<dyn FnMut(f64)>>>>;
    let closure: RafClosure = Rc::new(RefCell::new(None));
    let closure_clone = closure.clone();

    let frame_fn = Closure::<dyn FnMut(f64)>::new(move |timestamp: f64| {
        // Skip rendering if paused (e.g., during View Transitions)
        let is_paused = RENDERING_PAUSED.with(|cell| *cell.borrow());
        if is_paused {
            return;
        }

        let elapsed = timestamp - start_time;
        if elapsed > duration + 500.0 {
            // Burst finished — clean up
            ACTIVE_BURST.with(|cell| {
                *cell.borrow_mut() = None;
            });
            gpu::clear_frame();
            return;
        }

        let dt = 1.0 / 60.0; // Fixed timestep
        render_frame(dt as f32, gravity, particle_count, elapsed as f32 / 1000.0);

        // Request next frame
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

    *closure.borrow_mut() = None; // We stored the closure in ActiveBurst
}

fn render_frame(dt: f32, gravity: f32, particle_count: u32, elapsed: f32) {
    PIPELINE.with(|cell| {
        let guard = cell.borrow();
        let Some(pipeline) = guard.as_ref() else { return; };

        gpu::with_gpu(|state| {
            let canvas_w = state.canvas.width() as f32;
            let canvas_h = state.canvas.height() as f32;

            // Update uniforms: [time, dt, gravity, count, canvas_w, canvas_h, 0, 0]
            let uniforms = [elapsed, dt, gravity, particle_count as f32, canvas_w, canvas_h, 0.0f32, 0.0];
            let bytes: &[u8] = bytemuck_cast_slice(&uniforms);
            let u8_arr = js_sys::Uint8Array::from(bytes);
            state.queue.write_buffer_with_u32_and_u8_array(&pipeline.uniform_buffer, 0, &u8_arr);

            // Create bind group
            let particle_binding = bindings::GpuBufferBinding::new(&pipeline.particle_buffer);
            let uniform_binding = bindings::GpuBufferBinding::new(&pipeline.uniform_buffer);

            let entries = js_sys::Array::new();
            entries.push(&bindings::GpuBindGroupEntry::new(0, particle_binding.as_ref()));
            entries.push(&bindings::GpuBindGroupEntry::new(1, uniform_binding.as_ref()));

            let bind_group_desc = bindings::GpuBindGroupDescriptor::new(
                &entries,
                &pipeline.compute_pipeline.get_bind_group_layout(0),
            );
            let bind_group = state.device.create_bind_group(&bind_group_desc);

            let encoder = state.device.create_command_encoder();

            // Compute pass — update particle positions
            let compute_pass = encoder.begin_compute_pass();
            compute_pass.set_pipeline(&pipeline.compute_pipeline);
            compute_pass.set_bind_group(0, Some(&bind_group));
            let workgroups = particle_count.div_ceil(64);
            compute_pass.dispatch_workgroups(workgroups);
            compute_pass.end();

            // Render pass — draw particles as quads
            let texture = state.context.get_current_texture();
            let view = texture.create_view();

            let color_attachment = bindings::GpuRenderPassColorAttachment::new(
                "clear",
                "store",
                &view,
            );
            let clear_color = bindings::GpuColorDict::new(0.0, 0.0, 0.0, 0.0);
            color_attachment.set_clear_value(&clear_color.into());

            let color_attachments = js_sys::Array::new();
            color_attachments.push(&color_attachment);
            let pass_desc = bindings::GpuRenderPassDescriptor::new(&color_attachments);
            let render_pass = encoder.begin_render_pass(&pass_desc);
            render_pass.set_pipeline_render(&pipeline.render_pipeline);
            render_pass.set_bind_group_render(0, Some(&bind_group));
            // 4 vertices per quad (triangle strip) x particle_count instances
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

/// Reinterpret &[f32] as &[u8] safely (same alignment).
fn bytemuck_cast_slice(data: &[f32]) -> &[u8] {
    unsafe {
        std::slice::from_raw_parts(
            data.as_ptr() as *const u8,
            std::mem::size_of_val(data),
        )
    }
}
