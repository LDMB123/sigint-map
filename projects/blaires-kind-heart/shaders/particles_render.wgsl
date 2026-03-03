// Particle render shader — draws instanced quads with per-particle color/size.
// Each instance reads from the storage buffer. Triangle strip = 4 vertices.

struct Uniforms {
    time: f32,
    dt: f32,
    gravity: f32,
    count: f32,
    canvas_w: f32,
    canvas_h: f32,
    sparkle_strength: f32,
    rotation_enabled: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
    _pad3: f32,
};

struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    life: f32,
    color_idx: f32,
    size: f32,
    rotation: f32,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) uv: vec2<f32>,
};

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

// Color palette — matches Rust-side arrays
const COLORS = array<vec4<f32>, 8>(
    vec4<f32>(0.8, 0.2, 0.6, 1.0),  // purple-pink
    vec4<f32>(1.0, 0.4, 0.4, 1.0),  // red
    vec4<f32>(0.4, 0.8, 0.4, 1.0),  // green
    vec4<f32>(1.0, 0.85, 0.0, 1.0), // gold
    vec4<f32>(0.8, 0.4, 0.9, 1.0),  // violet
    vec4<f32>(0.5, 0.9, 1.0, 1.0),  // cyan
    vec4<f32>(1.0, 0.6, 0.8, 1.0),  // pink
    vec4<f32>(1.0, 0.95, 0.5, 1.0), // light gold
);

@vertex
fn vs_main(
    @builtin(vertex_index) vid: u32,
    @builtin(instance_index) iid: u32,
) -> VertexOutput {
    var out: VertexOutput;

    let p = particles[iid];

    // Skip dead particles (move offscreen)
    if (p.life <= 0.0) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        out.uv = vec2<f32>(0.0);
        return out;
    }

    // Quad corners: triangle strip (0,1,2,3) → (TL, TR, BL, BR)
    let corners = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, 1.0),
    );
    let corner = corners[vid];

    // UVs for circular mask
    out.uv = corner * 0.5 + 0.5;

    // Size in normalized device coords (relative to canvas)
    let pixel_size = p.size / max(uniforms.canvas_w, 1.0);

    // iPad mini low-power mode can disable per-particle trig rotation.
    let use_rotation = uniforms.rotation_enabled > 0.5;
    var rotated = corner;
    if (use_rotation) {
        let c = cos(p.rotation);
        let s = sin(p.rotation);
        rotated = vec2<f32>(
            corner.x * c - corner.y * s,
            corner.x * s + corner.y * c,
        );
    }

    // Convert particle position (0..1) to NDC (-1..1)
    let ndc_x = p.x * 2.0 - 1.0 + rotated.x * pixel_size;
    let ndc_y = -(p.y * 2.0 - 1.0) + rotated.y * pixel_size; // flip Y

    out.position = vec4<f32>(ndc_x, ndc_y, 0.0, 1.0);

    // Color from palette with life-based alpha fadeout
    let color_idx = u32(p.color_idx) % 8u;
    var color = COLORS[color_idx];
    // Smooth fadeout in last 30% of life
    let alpha = smoothstep(0.0, 0.3, p.life);
    color.a *= alpha;
    out.color = color;

    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Circular soft particle (distance from center)
    let dist = length(in.uv - vec2<f32>(0.5));
    if (dist > 0.5) {
        discard;
    }
    // Soft edge
    let softness = 1.0 - smoothstep(0.3, 0.5, dist);
    var color = in.color;
    color.a *= softness;

    // Sparkle effect — disabled on low-power profile.
    var sparkle = 1.0;
    if (uniforms.sparkle_strength > 0.0) {
        sparkle = 0.8 + 0.2 * sin(uniforms.time * 8.0 + in.uv.x * 20.0);
    }
    color = vec4<f32>(color.rgb * sparkle, color.a);

    return color;
}
