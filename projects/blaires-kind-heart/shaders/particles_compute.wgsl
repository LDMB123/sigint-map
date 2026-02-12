// Particle compute shader — updates position, velocity, lifetime.
// Each particle: [x, y, vx, vy, life, color_idx, size, rotation] = 8 floats.

struct Uniforms {
    time: f32,
    dt: f32,
    gravity: f32,
    count: f32,
    canvas_w: f32,
    canvas_h: f32,
    _pad0: f32,
    _pad1: f32,
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

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.x;
    if (idx >= u32(uniforms.count)) {
        return;
    }

    var p = particles[idx];

    // Dead particles stay dead
    if (p.life <= 0.0) {
        return;
    }

    // Decay life
    let lifetime_rate = 1.0 / (uniforms.count * 0.02 + 0.5); // ~1-2s total
    p.life -= uniforms.dt * lifetime_rate;
    if (p.life <= 0.0) {
        p.life = 0.0;
        particles[idx] = p;
        return;
    }

    // Apply gravity (downward = positive y in screen space)
    p.vy += uniforms.gravity * uniforms.dt;

    // Air resistance (drag)
    let drag = 0.98;
    p.vx *= drag;
    p.vy *= drag;

    // Update position
    p.x += p.vx * uniforms.dt;
    p.y += p.vy * uniforms.dt;

    // Spin rotation
    p.rotation += (p.vx * 3.0) * uniforms.dt;

    // Bounce off edges (soft)
    if (p.x < 0.0) {
        p.x = 0.0;
        p.vx = abs(p.vx) * 0.5;
    }
    if (p.x > 1.0) {
        p.x = 1.0;
        p.vx = -abs(p.vx) * 0.5;
    }
    // Let particles fall off bottom (don't bounce)
    if (p.y > 1.2) {
        p.life = 0.0;
    }

    particles[idx] = p;
}
