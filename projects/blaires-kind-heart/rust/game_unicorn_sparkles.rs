//! Sparkle particle system for Unicorn Adventure.
//! Pool-based: pre-allocates particles, recycles dead ones.
//! Each particle has position, velocity, rotation, alpha fade, size decay.

use web_sys::CanvasRenderingContext2d;

const MAX_PARTICLES: usize = 60;

#[derive(Clone)]
struct Particle {
    x: f64,
    y: f64,
    vx: f64,
    vy: f64,
    life: f64,      // 0.0 = dead, 1.0 = just spawned
    rotation: f64,
    spin: f64,       // rotation speed
    size: f64,
    active: bool,
}

impl Default for Particle {
    fn default() -> Self {
        Self {
            x: 0.0, y: 0.0, vx: 0.0, vy: 0.0,
            life: 0.0, rotation: 0.0, spin: 0.0, size: 8.0,
            active: false,
        }
    }
}

pub struct SparkleSystem {
    particles: Vec<Particle>,
    /// Pre-loaded sparkle image (optional — falls back to drawn stars)
    image: Option<web_sys::HtmlImageElement>,
    image_loaded: bool,
}

impl SparkleSystem {
    pub fn new() -> Self {
        let mut particles = Vec::with_capacity(MAX_PARTICLES);
        for _ in 0..MAX_PARTICLES {
            particles.push(Particle::default());
        }

        // Try to load sparkle sprite
        let image = web_sys::HtmlImageElement::new().ok();
        let image_loaded = false;
        if let Some(ref img) = image {
            img.set_src("game-sprites/sparkle_effect.png");
            // We'll check .complete in draw
        }

        Self { particles, image, image_loaded }
    }

    /// Spawn a sparkle at (x, y) with random velocity.
    pub fn spawn(&mut self, x: f64, y: f64) {
        // Find a dead particle to recycle
        let slot = self.particles.iter_mut().find(|p| !p.active);
        let Some(p) = slot else { return };

        p.x = x;
        p.y = y;
        p.vx = (js_sys::Math::random() - 0.5) * 60.0;
        p.vy = -js_sys::Math::random() * 40.0 - 20.0; // float upward
        p.life = 1.0;
        p.rotation = js_sys::Math::random() * std::f64::consts::TAU;
        p.spin = (js_sys::Math::random() - 0.5) * 4.0;
        p.size = 6.0 + js_sys::Math::random() * 8.0;
        p.active = true;
    }

    /// Update all active particles by dt seconds.
    pub fn update(&mut self, dt: f64) {
        for p in &mut self.particles {
            if !p.active { continue; }

            p.life -= dt * 1.5; // ~0.67s lifetime
            if p.life <= 0.0 {
                p.active = false;
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 30.0 * dt; // gentle gravity
            p.rotation += p.spin * dt;
        }
    }

    /// Draw all active particles onto the canvas.
    pub fn draw(&mut self, ctx: &CanvasRenderingContext2d) {
        // Check image loaded state lazily
        if !self.image_loaded {
            if let Some(ref img) = self.image {
                if img.complete() && img.natural_width() > 0 {
                    self.image_loaded = true;
                }
            }
        }

        for p in &self.particles {
            if !p.active { continue; }

            let alpha = p.life.max(0.0);
            let size = p.size * (0.5 + p.life * 0.5); // shrink as it fades

            ctx.save();
            ctx.set_global_alpha(alpha);
            ctx.translate(p.x, p.y).ok();
            ctx.rotate(p.rotation).ok();

            if self.image_loaded {
                if let Some(ref img) = self.image {
                    ctx.draw_image_with_html_image_element_and_dw_and_dh(
                        img,
                        -size / 2.0,
                        -size / 2.0,
                        size,
                        size,
                    ).ok();
                }
            } else {
                // Fallback: draw a simple star shape
                draw_star(ctx, size * 0.5);
            }

            ctx.restore();
        }
    }

    /// Check if any particles are active.
    /// Kept for future particle health monitoring and debugging.
    #[allow(dead_code)]
    pub fn has_active(&self) -> bool {
        self.particles.iter().any(|p| p.active)
    }
}

/// Draw a 4-pointed star shape (fallback when no sprite image).
fn draw_star(ctx: &CanvasRenderingContext2d, radius: f64) {
    ctx.begin_path();
    let points = 4;
    let inner = radius * 0.4;
    for i in 0..(points * 2) {
        let angle = (i as f64) * std::f64::consts::PI / points as f64 - std::f64::consts::FRAC_PI_2;
        let r = if i % 2 == 0 { radius } else { inner };
        let x = angle.cos() * r;
        let y = angle.sin() * r;
        if i == 0 {
            ctx.move_to(x, y);
        } else {
            ctx.line_to(x, y);
        }
    }
    ctx.close_path();
    ctx.set_fill_style_str("rgba(255, 255, 200, 0.9)");
    ctx.fill();
}
