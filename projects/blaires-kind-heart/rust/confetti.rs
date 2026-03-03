use crate::{browser_apis, dom, gpu, gpu_particles, native_apis, render, synth_audio};
#[derive(Debug, Clone, Copy)]
pub enum CelebrationTier {
    Nice, // Single burst (current default)
    Great,
    Amazing,
    Epic,
}
const HEARTS: &[&str] = &[
    "\u{1F49C}",
    "\u{1F49B}",
    "\u{1F49A}",
    "\u{2764}\u{FE0F}",
    "\u{1F496}",
];
const STARS: &[&str] = &[
    "\u{2B50}",
    "\u{1F31F}",
    "\u{2728}",
    "\u{1FA90}",
    "\u{1F4AB}",
];
const PARTY: &[&str] = &[
    "\u{1F389}",
    "\u{1F388}",
    "\u{1F38A}",
    "\u{1F381}",
    "\u{2728}",
    "\u{1F984}",
    "\u{1F31F}",
    "\u{1F496}",
    "\u{1F308}",
    "\u{1F33B}",
];
const UNICORN: &[&str] = &[
    "\u{1F984}",
    "\u{2728}",
    "\u{1F308}",
    "\u{1F49C}",
    "\u{1FA84}",
];
pub fn burst_hearts() {
    do_burst(&gpu_particles::BURST_HEARTS, false, HEARTS, 8, 1200);
}
pub fn burst_stars() {
    do_burst(&gpu_particles::BURST_STARS, false, STARS, 10, 1500);
}
pub fn burst_party() {
    do_burst(&gpu_particles::BURST_PARTY, true, PARTY, 20, 2000);
}
pub fn burst_unicorn() {
    do_burst(&gpu_particles::BURST_UNICORN, false, UNICORN, 6, 1000);
}
fn do_burst(
    gpu_cfg: &'static gpu_particles::BurstConfig,
    success_vibrate: bool,
    emojis: &'static [&'static str],
    count: usize,
    duration_ms: u32,
) {
    if dom::prefers_reduced_motion() {
        return;
    }
    if gpu::is_available() {
        gpu_particles::burst(gpu_cfg);
    } else {
        if success_vibrate {
            native_apis::vibrate_success();
        } else {
            native_apis::vibrate_tap();
        }
        spawn_burst(emojis, count, duration_ms);
    }
}

fn gpu_config_for_emojis(
    emojis: &'static [&'static str],
) -> Option<&'static gpu_particles::BurstConfig> {
    if std::ptr::eq(emojis, HEARTS) {
        Some(&gpu_particles::BURST_HEARTS)
    } else if std::ptr::eq(emojis, STARS) {
        Some(&gpu_particles::BURST_STARS)
    } else if std::ptr::eq(emojis, PARTY) {
        Some(&gpu_particles::BURST_PARTY)
    } else if std::ptr::eq(emojis, UNICORN) {
        Some(&gpu_particles::BURST_UNICORN)
    } else {
        None
    }
}

fn spawn_burst(emojis: &'static [&'static str], count: usize, duration_ms: u32) {
    let doc = dom::document();
    let Some(container) = render::create_el_with_class(&doc, "div", "confetti-container") else {
        return;
    };
    dom::set_attr(&container, "aria-hidden", "true");
    let frag = doc.create_document_fragment();
    let now = browser_apis::now_ms() as u64;
    let mut buf = String::with_capacity(128);
    for i in 0..count {
        let emoji = emojis[i % emojis.len()];
        let Some(particle) = render::text_el(&doc, "span", "confetti-particle", emoji) else {
            continue;
        };
        let seed = (now.wrapping_add(i as u64 * 7919)) % 1000;
        let left = (seed % 100) as f32;
        let delay_ms = ((seed * 3) % 400) as f32;
        let size = 1.2 + (((seed * 7) % 100) as f32 / 100.0) * 1.0;
        let drift = -30.0 + (((seed * 13) % 100) as f32 / 100.0) * 60.0;
        buf.clear();
        use std::fmt::Write;
        let _ = write!(buf, "left:{left:.0}%;animation-delay:{delay_ms:.0}ms;font-size:{size:.1}rem;--drift:{drift:.0}px;animation-duration:{duration_ms}ms");
        dom::set_attr(&particle, "style", &buf);
        let _ = frag.append_child(&particle);
    }
    let _ = container.append_child(&frag);
    let _ = dom::body().append_child(&container);
    dom::delayed_remove(container, (duration_ms + 500) as i32);
}
pub fn float_emoji(target_selector: &str, emoji: &str) {
    if dom::prefers_reduced_motion() {
        return;
    }
    let Some(target) = dom::query(target_selector) else {
        return;
    };
    let doc = dom::document();
    let Some(el) = render::append_text(&doc, &target, "span", "confetti-float", emoji) else {
        return;
    };
    dom::delayed_remove(el, 1000);
}
pub fn celebrate(tier: CelebrationTier) {
    if dom::prefers_reduced_motion() {
        return;
    }
    match tier {
        CelebrationTier::Nice => {
            burst_hearts();
        }
        CelebrationTier::Great => {
            burst_stars();
            delayed_burst(HEARTS, 25, 1500, 300);
            synth_audio::sparkle();
        }
        CelebrationTier::Amazing => {
            burst_unicorn();
            delayed_burst(PARTY, 35, 2000, 200);
            delayed_burst(HEARTS, 30, 1800, 400);
            synth_audio::rainbow_burst();
            dom::set_timeout_once(400, synth_audio::magic_wand);
        }
        CelebrationTier::Epic => {
            burst_party();
            delayed_burst(PARTY, 45, 2200, 150);
            delayed_burst(UNICORN, 40, 2000, 300);
            delayed_burst(PARTY, 35, 1800, 450);
            synth_audio::fanfare();
            dom::set_timeout_once(200, synth_audio::rainbow_burst);
            dom::set_timeout_once(400, synth_audio::magic_wand);
            dom::set_timeout_once(600, synth_audio::level_up);
        }
    }
}
fn delayed_burst(emojis: &'static [&'static str], count: usize, duration_ms: u32, delay_ms: u32) {
    dom::set_timeout_once(delay_ms as i32, move || {
        if dom::prefers_reduced_motion() {
            return;
        }
        if gpu::is_available() {
            if let Some(cfg) = gpu_config_for_emojis(emojis) {
                gpu_particles::burst(cfg);
                return;
            }
        }
        native_apis::vibrate_tap();
        spawn_burst(emojis, count, duration_ms);
    });
}

pub fn sparkle_kindness_aura() {
    if dom::prefers_reduced_motion() {
        return;
    }
    let doc = dom::document();
    let Some(container) = render::create_el_with_class(&doc, "div", "kindness-aura-container")
    else {
        return;
    };
    let Some(bg) = render::create_el_with_class(&doc, "div", "kindness-aura-bg") else {
        return;
    };
    let _ = container.append_child(&bg);

    let frag = doc.create_document_fragment();
    let num_particles = if gpu::is_ipad_mini_6_profile() {
        10
    } else {
        15
    };
    let colors = [
        "rgba(255, 143, 171, 0.9)", // Pink
        "rgba(181, 126, 255, 0.9)", // Purple
        "rgba(255, 211, 45, 0.9)",  // Gold
        "rgba(255, 255, 255, 0.9)", // White
    ];

    let now = browser_apis::now_ms() as u64;
    for i in 0..num_particles {
        if let Some(particle) = render::create_el_with_class(&doc, "div", "kindness-aura-particle")
        {
            let seed = (now.wrapping_add(i as u64 * 31337)) % 1000;
            let size = 10.0 + (seed % 20) as f32;
            let duration = 1.5 + ((seed * 7) % 15) as f32 / 10.0;
            let tx = -150.0 + ((seed * 11) % 300) as f32;
            let ty = -150.0 + ((seed * 13) % 300) as f32;
            let color = colors[(seed as usize) % colors.len()];

            dom::with_buf(|buf| {
                use std::fmt::Write;
                let _ = write!(
                    buf,
                    "--size:{}px;--color:{};--duration:{}s;--tx:{}px;--ty:{}px;",
                    size, color, duration, tx, ty
                );
                dom::set_attr(&particle, "style", buf);
            });
            let _ = frag.append_child(&particle);
        }
    }

    let _ = container.append_child(&frag);
    let _ = dom::body().append_child(&container);
    dom::delayed_remove(container, 2500);
}
