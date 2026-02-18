//! Confetti particle system — GPU-accelerated with DOM fallback.
//! When WebGPU is available (iPad mini 6 A15 chip), uses compute shaders
//! for hundreds of particles at 60fps. Falls back to CSS emoji particles.
//!
//! Celebration tiers for mega moments:
//! - Nice: Single burst (default)
//! - Great: Double burst + sparkle
//! - Amazing: Triple burst + rainbow particles
//! - Epic: Full-screen cascade + sound explosion

use crate::{browser_apis, dom, gpu, gpu_particles, native_apis, render, synth_audio};

/// Celebration intensity tiers for different achievement levels
#[derive(Debug, Clone, Copy)]
pub enum CelebrationTier {
    Nice,    // Single burst (current default)
    Great,   // Double burst + sparkle
    Amazing, // Triple burst + rainbow particles
    Epic,    // Full-screen explosion + sound cascade
}

/// Emoji sets for DOM fallback.
const HEARTS: &[&str] = &[
    "\u{1F49C}", "\u{1F49B}", "\u{1F49A}", "\u{2764}\u{FE0F}", "\u{1F496}",
];
const STARS: &[&str] = &[
    "\u{2B50}", "\u{1F31F}", "\u{2728}", "\u{1FA90}", "\u{1F4AB}",
];
const PARTY: &[&str] = &[
    "\u{1F389}", "\u{1F388}", "\u{1F38A}", "\u{1F381}", "\u{2728}",
    "\u{1F984}", "\u{1F31F}", "\u{1F496}", "\u{1F308}", "\u{1F33B}",
];
const UNICORN: &[&str] = &[
    "\u{1F984}", "\u{2728}", "\u{1F308}", "\u{1F49C}", "\u{1FA84}",
];

/// Burst confetti for a kind act (hearts).
pub fn burst_hearts()  { do_burst(&gpu_particles::BURST_HEARTS,  false, HEARTS,   8, 1200); }
/// Burst confetti for quest/sticker (stars).
pub fn burst_stars()   { do_burst(&gpu_particles::BURST_STARS,   false, STARS,   10, 1500); }
/// Big party burst for celebrations (Show Mom, all quests).
pub fn burst_party()   { do_burst(&gpu_particles::BURST_PARTY,   true,  PARTY,   20, 2000); }
/// Unicorn sparkle burst for Sparkle reactions.
pub fn burst_unicorn() { do_burst(&gpu_particles::BURST_UNICORN, false, UNICORN,  6, 1000); }

/// Shared burst dispatch: reduced-motion guard + GPU path + DOM fallback.
/// `success_vibrate` chooses `vibrate_success` (party) vs `vibrate_tap` (other).
fn do_burst(
    gpu_cfg: &'static gpu_particles::BurstConfig,
    success_vibrate: bool,
    emojis: &'static [&'static str],
    count: usize,
    duration_ms: u32,
) {
    if dom::prefers_reduced_motion() { return; }
    if gpu::is_available() {
        gpu_particles::burst(gpu_cfg);
    } else {
        if success_vibrate { native_apis::vibrate_success(); } else { native_apis::vibrate_tap(); }
        spawn_burst(emojis, count, duration_ms);
    }
}

/// DOM fallback — CSS-animated emoji particles.
fn spawn_burst(emojis: &'static [&'static str], count: usize, duration_ms: u32) {
    let doc = dom::document();

    let container = render::create_el_with_class(&doc, "div", "confetti-container");
    let _ = container.set_attribute("aria-hidden", "true");

    let now = browser_apis::now_ms() as u64;
    for i in 0..count {
        let emoji = emojis[i % emojis.len()];
        let particle = doc.create_element("span").unwrap();
        let _ = particle.set_attribute("class", "confetti-particle");
        particle.set_text_content(Some(emoji));

        let seed = (now.wrapping_add(i as u64 * 7919)) % 1000;
        let left = (seed % 100) as f32;
        let delay_ms = ((seed * 3) % 400) as f32;
        let size = 1.2 + (((seed * 7) % 100) as f32 / 100.0) * 1.0;
        let drift = -30.0 + (((seed * 13) % 100) as f32 / 100.0) * 60.0;

        let style = format!(
            "left:{left:.0}%;animation-delay:{delay_ms:.0}ms;font-size:{size:.1}rem;--drift:{drift:.0}px;animation-duration:{duration_ms}ms"
        );
        let _ = particle.set_attribute("style", &style);
        let _ = container.append_child(&particle);
    }

    if let Some(body) = dom::query("body") {
        let _ = body.append_child(&container);
    }

    // Remove THIS burst container after animation completes
    // (using the cloned reference prevents leaks when multiple bursts fire rapidly).
    dom::delayed_remove(container.clone(), (duration_ms + 500) as i32);
}

/// Spawn a single floating emoji at a specific element.
pub fn float_emoji(target_selector: &str, emoji: &str) {
    if dom::prefers_reduced_motion() { return; }
    let Some(target) = dom::query(target_selector) else { return; };
    let doc = dom::document();
    let el = doc.create_element("span").unwrap();
    let _ = el.set_attribute("class", "confetti-float");
    el.set_text_content(Some(emoji));
    let _ = target.append_child(&el);

    dom::delayed_remove(el, 1000);
}

/// Mega celebration with tiered confetti and sound cascades.
/// Use this for major achievements: quest completion, streaks, milestones.
pub fn celebrate(tier: CelebrationTier) {
    if dom::prefers_reduced_motion() { return; }

    match tier {
        CelebrationTier::Nice => {
            // Single burst (default behavior)
            burst_hearts();
        },

        CelebrationTier::Great => {
            // Double burst + sparkle sound
            burst_stars();
            delayed_burst(HEARTS, 25, 1500, 300);
            synth_audio::sparkle();
        },

        CelebrationTier::Amazing => {
            // Triple burst + rainbow particles + multiple sounds
            burst_unicorn();
            delayed_burst(PARTY, 35, 2000, 200);
            delayed_burst(HEARTS, 30, 1800, 400);
            synth_audio::rainbow_burst();
            dom::set_timeout_once(400, || {
                synth_audio::magic_wand();
            });
        },

        CelebrationTier::Epic => {
            // Cascade of 4 bursts + full sound explosion
            burst_party();
            delayed_burst(PARTY, 45, 2200, 150);
            delayed_burst(UNICORN, 40, 2000, 300);
            delayed_burst(PARTY, 35, 1800, 450);

            // Sound cascade
            synth_audio::fanfare();
            dom::set_timeout_once(200, || {
                synth_audio::rainbow_burst();
            });
            dom::set_timeout_once(400, || {
                synth_audio::magic_wand();
            });
            dom::set_timeout_once(600, || {
                synth_audio::level_up();
            });
        },
    }
}

/// Delayed confetti burst helper for celebration cascades
fn delayed_burst(emojis: &'static [&'static str], count: usize, duration_ms: u32, delay_ms: u32) {
    dom::set_timeout_once(delay_ms as i32, move || {
        if dom::prefers_reduced_motion() { return; }
        native_apis::vibrate_tap();
        spawn_burst(emojis, count, duration_ms);
    });
}
