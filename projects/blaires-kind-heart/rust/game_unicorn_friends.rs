//! Friend collectibles for Unicorn Adventure.
//! Spawns different forest friend types that move toward the unicorn.

use web_sys::CanvasRenderingContext2d;

const FRIEND_SIZE: f64 = 48.0;
const FRIEND_SPEED: f64 = 80.0; // pixels per second
const COLLECT_DIST: f64 = 40.0;
const MAX_FRIENDS: usize = 8;
const SPAWN_INTERVAL: f64 = 2.5; // seconds

/// Forest friend types with emoji, point values, and spawn weights.
const FRIEND_TYPES: &[(&str, &str, u32, u32)] = &[
    ("bunny", "\u{1F430}", 1, 40),      // bunny - common
    ("fox", "\u{1F98A}", 2, 25),        // fox - uncommon
    ("deer", "\u{1F98C}", 3, 20),       // deer - rare
    ("owl", "\u{1F989}", 2, 25),        // owl - uncommon  
    ("squirrel", "\u{1F43F}", 1, 35),   // squirrel - common
    ("hedgehog", "\u{1F994}", 3, 15),   // hedgehog - rare
    ("bird", "\u{1F426}", 1, 40),       // bird - common
    ("butterfly", "\u{1F98B}", 2, 30),  // butterfly - uncommon
];

struct Friend {
    type_id: String,
    emoji: String,
    points: u32,
    x: f64,
    y: f64,
    active: bool,
    bob_timer: f64,
}

impl Friend {
    fn new(type_id: &str, emoji: &str, points: u32, x: f64, y: f64) -> Self {
        Self {
            type_id: type_id.to_string(),
            emoji: emoji.to_string(),
            points,
            x,
            y,
            active: true,
            bob_timer: js_sys::Math::random() * std::f64::consts::TAU,
        }
    }
}

pub struct FriendManager {
    friends: Vec<Friend>,
    spawn_timer: f64,
    pub score: u32,
    pub total_collected: u32,
    last_collect_time: f64,
    combo_window: f64,
}

impl FriendManager {
    pub fn new() -> Self {
        Self {
            friends: Vec::with_capacity(MAX_FRIENDS),
            spawn_timer: 1.0, // spawn first friend quickly
            score: 0,
            total_collected: 0,
            last_collect_time: 0.0,
            combo_window: 0.0,
        }
    }

    /// Update all friends. Returns vec of collected type IDs.
    pub fn update(
        &mut self,
        dt: f64,
        unicorn_x: f64,
        unicorn_y: f64,
        canvas_w: f64,
        canvas_h: f64,
        reduced_motion: bool,
    ) -> Vec<String> {
        let mut collected = Vec::new();

        // Update existing friends
        for friend in &mut self.friends {
            if !friend.active {
                continue;
            }

            // Move toward unicorn
            let dx = unicorn_x - friend.x;
            let dy = unicorn_y - friend.y;
            let dist = (dx * dx + dy * dy).sqrt();

            if dist > COLLECT_DIST {
                // Move closer
                let speed = FRIEND_SPEED * dt;
                friend.x += (dx / dist) * speed;
                friend.y += (dy / dist) * speed;

                // Bob animation
                if !reduced_motion {
                    friend.bob_timer += dt * 5.0;
                }
            } else {
                // Collected!
                friend.active = false;
                collected.push(friend.type_id.clone());
                self.score += friend.points;
                self.total_collected += 1;
                
                // Combo tracking
                let now = crate::utils::now_epoch_ms() / 1000.0;
                if now - self.last_collect_time < 2.0 {
                    self.combo_window += 1.0;
                } else {
                    self.combo_window = 1.0;
                }
                self.last_collect_time = now;
            }
        }

        // Remove collected friends
        self.friends.retain(|f| f.active);

        // Spawn new friends
        self.spawn_timer -= dt;
        if self.spawn_timer <= 0.0 && self.friends.len() < MAX_FRIENDS {
            self.spawn_friend(canvas_w, canvas_h);
            self.spawn_timer = SPAWN_INTERVAL;
        }

        collected
    }

    fn spawn_friend(&mut self, canvas_w: f64, canvas_h: f64) {
        // Weighted random selection
        let total_weight: u32 = FRIEND_TYPES.iter().map(|(_, _, _, w)| w).sum();
        let mut roll = (js_sys::Math::random() * total_weight as f64) as u32;
        
        let mut selected = FRIEND_TYPES[0];
        for &entry in FRIEND_TYPES {
            if roll < entry.3 {
                selected = entry;
                break;
            }
            roll -= entry.3;
        }

        let (type_id, emoji, points, _) = selected;

        // Spawn at random edge position
        let (x, y) = if js_sys::Math::random() < 0.5 {
            // Top or bottom edge
            let x = js_sys::Math::random() * canvas_w;
            let y = if js_sys::Math::random() < 0.5 { -FRIEND_SIZE } else { canvas_h + FRIEND_SIZE };
            (x, y)
        } else {
            // Left or right edge
            let x = if js_sys::Math::random() < 0.5 { -FRIEND_SIZE } else { canvas_w + FRIEND_SIZE };
            let y = js_sys::Math::random() * canvas_h;
            (x, y)
        };

        self.friends.push(Friend::new(type_id, emoji, points, x, y));
    }

    pub fn draw(&self, ctx: &CanvasRenderingContext2d, reduced_motion: bool) {
        for friend in &self.friends {
            if !friend.active {
                continue;
            }

            ctx.save();
            ctx.translate(friend.x, friend.y).ok();

            // Bob animation
            let bob_offset = if reduced_motion {
                0.0
            } else {
                (friend.bob_timer * std::f64::consts::TAU).sin() * 3.0
            };
            ctx.translate(0.0, bob_offset).ok();

            // Draw friend emoji
            ctx.set_font(&format!("{}px serif", FRIEND_SIZE));
            ctx.set_text_align("center");
            ctx.set_text_baseline("middle");
            ctx.fill_text(&friend.emoji, 0.0, 0.0).ok();

            ctx.restore();
        }
    }

    #[allow(dead_code)]
    pub fn combo_count(&self) -> u32 {
        self.combo_window as u32
    }
}
