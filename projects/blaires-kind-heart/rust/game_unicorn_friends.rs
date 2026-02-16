//! Friend collectibles for Unicorn Adventure.
//! Spawns different forest friend types that move toward the unicorn.

use web_sys::CanvasRenderingContext2d;

const FRIEND_SIZE: f64 = 48.0;
const FRIEND_SPEED: f64 = 80.0; // pixels per second
const COLLECT_DIST: f64 = 40.0;
const MAX_FRIENDS: usize = 8;
const SPAWN_INTERVAL: f64 = 2.5; // seconds

pub struct Biome {
    pub name: &'static str,
    pub picker_emoji: &'static str,
    pub friends: &'static [(&'static str, &'static str, u32, u32)],
    pub bg_gradient: (&'static str, &'static str, &'static str),
    pub ambient_freq: f32,
}

pub const BIOME_FOREST: Biome = Biome {
    name: "Enchanted Forest",
    picker_emoji: "\u{1F332}",
    friends: FRIEND_TYPES,
    bg_gradient: ("#87CEEB", "#90EE90", "#228B22"),
    ambient_freq: 110.0,
};

pub const BIOME_CAVE: Biome = Biome {
    name: "Crystal Cave",
    picker_emoji: "\u{1F48E}",
    friends: &[
        ("bat", "\u{1F987}", 1, 40),
        ("glowworm", "\u{1F41B}", 2, 25),
        ("crystal_spider", "\u{1F577}", 3, 20),
        ("cave_fish", "\u{1F420}", 2, 25),
        ("mushroom", "\u{1F344}", 1, 35),
        ("gem_dragon", "\u{1F432}", 5, 10),
        ("mole", "\u{1F401}", 1, 35),
        ("firefly", "\u{2728}", 2, 30),
    ],
    bg_gradient: ("#2d1b69", "#4a148c", "#1a0033"),
    ambient_freq: 85.0,
};

pub const BIOME_CLOUD: Biome = Biome {
    name: "Cloud Kingdom",
    picker_emoji: "\u{2601}",
    friends: &[
        ("cloud_bunny", "\u{1F430}", 1, 40),
        ("sky_fish", "\u{1F41F}", 2, 25),
        ("rainbow_bird", "\u{1F426}", 3, 20),
        ("wind_sprite", "\u{1F4A8}", 2, 25),
        ("star_mouse", "\u{1F42D}", 1, 35),
        ("moon_cat", "\u{1F431}", 2, 30),
        ("sun_bear", "\u{1F43B}", 3, 15),
        ("thunder_pup", "\u{1F436}", 5, 10),
    ],
    bg_gradient: ("#E3F2FD", "#BBDEFB", "#87CEEB"),
    ambient_freq: 165.0,
};

pub const BIOME_OCEAN: Biome = Biome {
    name: "Ocean Shore",
    picker_emoji: "\u{1F30A}",
    friends: &[
        ("crab", "\u{1F980}", 1, 40),
        ("starfish", "\u{2B50}", 2, 25),
        ("seahorse", "\u{1F40E}", 3, 20),
        ("dolphin", "\u{1F42C}", 2, 25),
        ("turtle", "\u{1F422}", 1, 35),
        ("octopus", "\u{1F419}", 3, 15),
        ("jellyfish", "\u{1FAB8}", 2, 30),
        ("clownfish", "\u{1F420}", 1, 40),
    ],
    bg_gradient: ("#00BCD4", "#80DEEA", "#FFECB3"),
    ambient_freq: 130.0,
};

pub const ALL_BIOMES: &[&Biome] = &[&BIOME_FOREST, &BIOME_CAVE, &BIOME_CLOUD, &BIOME_OCEAN];

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
    friend_types: &'static [(&'static str, &'static str, u32, u32)],
    spawn_timer: f64,
    pub score: u32,
    pub total_collected: u32,
    last_collect_time: f64,
    combo_window: f64,
}

impl FriendManager {
    pub fn new(friends: &'static [(&'static str, &'static str, u32, u32)]) -> Self {
        Self {
            friends: Vec::with_capacity(MAX_FRIENDS),
            friend_types: friends,
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
        let total_weight: u32 = self.friend_types.iter().map(|(_, _, _, w)| w).sum();
        let mut roll = (js_sys::Math::random() * total_weight as f64) as u32;

        let mut selected = self.friend_types[0];
        for &entry in self.friend_types {
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
