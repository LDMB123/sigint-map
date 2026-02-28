use web_sys::CanvasRenderingContext2d;
const MAX_PARTICLES: usize = 60;
#[derive(Clone)]
struct Particle {
    x: f64,
    y: f64,
    vx: f64,
    vy: f64,
    life: f64,
    rotation: f64,
    spin: f64,
    size: f64,
    active: bool,
}
impl Default for Particle {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            vx: 0.0,
            vy: 0.0,
            life: 0.0,
            rotation: 0.0,
            spin: 0.0,
            size: 8.0,
            active: false,
        }
    }
}
pub struct SparkleSystem {
    particles: Vec<Particle>,
    image: Option<web_sys::HtmlImageElement>,
    image_loaded: bool,
}
impl SparkleSystem {
    pub fn new() -> Self {
        let mut particles = Vec::with_capacity(MAX_PARTICLES);
        for _ in 0..MAX_PARTICLES {
            particles.push(Particle::default());
        }
        let image = web_sys::HtmlImageElement::new().ok();
        let image_loaded = false;
        if let Some(ref img) = image {
            img.set_src("game-sprites/sparkle_effect.webp");
        }
        Self {
            particles,
            image,
            image_loaded,
        }
    }
    pub fn spawn(&mut self, x: f64, y: f64) {
        let slot = self.particles.iter_mut().find(|p| !p.active);
        let Some(p) = slot else { return };
        p.x = x;
        p.y = y;
        p.vx = (js_sys::Math::random() - 0.5) * 60.0;
        p.vy = -js_sys::Math::random() * 40.0 - 20.0;
        p.life = 1.0;
        p.rotation = js_sys::Math::random() * std::f64::consts::TAU;
        p.spin = (js_sys::Math::random() - 0.5) * 4.0;
        p.size = 6.0 + js_sys::Math::random() * 8.0;
        p.active = true;
    }
    pub fn update(&mut self, dt: f64) {
        for p in &mut self.particles {
            if !p.active {
                continue;
            }
            p.life -= dt * 1.5; // ~0.67s lifetime
            if p.life <= 0.0 {
                p.active = false;
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 30.0 * dt;
            p.rotation += p.spin * dt;
        }
    }
    pub fn draw(&mut self, ctx: &CanvasRenderingContext2d) {
        if !self.image_loaded {
            if let Some(ref img) = self.image {
                if img.complete() && img.natural_width() > 0 {
                    self.image_loaded = true;
                }
            }
        }
        for p in &self.particles {
            if !p.active {
                continue;
            }
            let alpha = p.life.max(0.0);
            let size = p.size * (0.5 + p.life * 0.5);
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
                    )
                    .ok();
                }
            } else {
                draw_star(ctx, size * 0.5);
            }
            ctx.restore();
        }
    }
}
fn draw_star(ctx: &CanvasRenderingContext2d, radius: f64) {
    ctx.begin_path();
    let points = 4;
    let inner = radius * 0.4;
    for i in 0..(points * 2) {
        let angle =
            f64::from(i) * std::f64::consts::PI / f64::from(points) - std::f64::consts::FRAC_PI_2;
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
