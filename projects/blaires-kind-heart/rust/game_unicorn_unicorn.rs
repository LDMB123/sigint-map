//! Unicorn player entity for Unicorn Adventure.
//! Smooth movement toward touch/pointer target with idle state animations.

use web_sys::CanvasRenderingContext2d;

const UNICORN_SIZE: f64 = 64.0;
const MOVE_SPEED: f64 = 200.0; // pixels per second
const COLLISION_RADIUS: f64 = 32.0;

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum IdleState {
    Active,   // moving or just moved
    Looking,  // stationary 4+ seconds - looking around
    Sitting,  // stationary 8+ seconds - sitting down
}

pub struct Unicorn {
    pub x: f64,
    pub y: f64,
    pub target_x: f64,
    pub target_y: f64,
    pub idle_state: IdleState,

    // Animation state
    bounce_timer: f64,
    giggle_timer: f64,
    blink_timer: f64,
    next_blink: f64,
}

impl Unicorn {
    pub fn new() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            target_x: 0.0,
            target_y: 0.0,
            idle_state: IdleState::Active,
            bounce_timer: 0.0,
            giggle_timer: 0.0,
            blink_timer: 0.0,
            next_blink: 3.0 + js_sys::Math::random() * 2.0,
        }
    }

    pub fn center_in(&mut self, width: f64, height: f64) {
        self.x = width / 2.0;
        self.y = height / 2.0;
        self.target_x = self.x;
        self.target_y = self.y;
    }

    /// Update position toward target. Returns true if moved this frame.
    pub fn update(&mut self, dt: f64, reduced_motion: bool) -> bool {
        // Distance to target
        let dx = self.target_x - self.x;
        let dy = self.target_y - self.y;
        let dist = (dx * dx + dy * dy).sqrt();

        let moved = if dist > 1.0 {
            // Move toward target
            let speed = MOVE_SPEED * dt;
            let move_dist = speed.min(dist);
            self.x += (dx / dist) * move_dist;
            self.y += (dy / dist) * move_dist;
            true
        } else {
            false
        };

        // Animation timers
        if !reduced_motion {
            if moved {
                self.bounce_timer += dt * 8.0; // fast bounce while moving
            } else {
                self.bounce_timer += dt * 2.0; // slow gentle bounce when idle
            }
        }

        if self.giggle_timer > 0.0 {
            self.giggle_timer -= dt;
        }

        // Blink system
        self.blink_timer += dt;
        if self.blink_timer >= self.next_blink {
            self.blink_timer = 0.0;
            self.next_blink = 2.0 + js_sys::Math::random() * 3.0;
        }

        moved
    }

    pub fn draw(&self, ctx: &CanvasRenderingContext2d, reduced_motion: bool) {
        ctx.save();
        ctx.translate(self.x, self.y).ok();

        // Bounce animation
        let bounce_offset = if reduced_motion {
            0.0
        } else {
            (self.bounce_timer * std::f64::consts::TAU).sin() * 4.0
        };
        ctx.translate(0.0, bounce_offset).ok();

        // Giggle wobble
        if self.giggle_timer > 0.0 && !reduced_motion {
            let wobble = (self.giggle_timer * 20.0).sin() * 8.0;
            ctx.rotate(wobble * std::f64::consts::PI / 180.0).ok();
        }

        // Choose emoji based on idle state and blink
        let is_blinking = self.blink_timer < 0.15;
        let emoji = if is_blinking {
            "\u{1F610}" // neutral face (blink)
        } else {
            match self.idle_state {
                IdleState::Active => {
                    if self.giggle_timer > 0.0 {
                        "\u{1F606}" // laughing
                    } else {
                        "\u{1F984}" // unicorn
                    }
                }
                IdleState::Looking => "\u{1F914}", // thinking
                IdleState::Sitting => "\u{1F634}",  // sleeping
            }
        };

        // Draw unicorn emoji
        ctx.set_font(&format!("{}px serif", UNICORN_SIZE));
        ctx.set_text_align("center");
        ctx.set_text_baseline("middle");
        ctx.fill_text(emoji, 0.0, 0.0).ok();

        ctx.restore();
    }

    pub fn contains_point(&self, x: f64, y: f64) -> bool {
        let dx = x - self.x;
        let dy = y - self.y;
        (dx * dx + dy * dy).sqrt() < COLLISION_RADIUS
    }

    pub fn giggle(&mut self) {
        self.giggle_timer = 0.5;
    }

    #[allow(dead_code)]
    pub fn collision_radius(&self) -> f64 {
        COLLISION_RADIUS
    }
}
