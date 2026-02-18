//! Sticker reward system — unicorns, balloons, achievements.
//! Blaire earns stickers by being kind. She can show Mom and Dad.
//! SQLite tracks what's earned. DOM renders the collection grid.

use crate::{animations, companion, confetti, constants::SELECTOR_REWARDS_BODY, db_client, dom, render, speech, synth_audio, ui, utils};

/// 30 sticker designs — unicorns, balloons, stars, animals.
/// Blaire's favorites front-loaded so she earns them first.
/// `image` links to Imagen 3 Pro generated PNGs when available.
struct StickerDesign {
    emoji: &'static str,
    name: &'static str,
    image: Option<&'static str>,
}

const STICKER_DESIGNS: &[StickerDesign] = &[
    // Unicorns (Blaire's #1)
    StickerDesign { emoji: "\u{1F984}", name: "Rainbow Unicorn", image: Some("./illustrations/stickers/unicorn-rainbow.png") },
    StickerDesign { emoji: "\u{1F984}\u{2728}", name: "Sparkle Unicorn", image: Some("./illustrations/stickers/unicorn-sparkle.png") },
    StickerDesign { emoji: "\u{1F984}\u{1F308}", name: "Magic Unicorn", image: Some("./illustrations/stickers/unicorn-magic.png") },
    StickerDesign { emoji: "\u{1F984}\u{1F31F}", name: "Star Unicorn", image: Some("./illustrations/stickers/unicorn-star.png") },
    StickerDesign { emoji: "\u{1F984}\u{1F49C}", name: "Purple Unicorn", image: Some("./illustrations/stickers/unicorn-purple.png") },
    // Balloons (Blaire's #2)
    StickerDesign { emoji: "\u{1F388}", name: "Red Balloon", image: Some("./illustrations/stickers/balloon-red.png") },
    StickerDesign { emoji: "\u{1F388}\u{1F388}", name: "Double Balloon", image: Some("./illustrations/stickers/balloon-double.png") },
    StickerDesign { emoji: "\u{1F389}", name: "Party Popper", image: Some("./illustrations/stickers/party-popper.png") },
    StickerDesign { emoji: "\u{1F38A}", name: "Confetti Ball", image: None },
    StickerDesign { emoji: "\u{1F38B}", name: "Tanabata Tree", image: None },
    // Hearts & Stars (kindness theme)
    StickerDesign { emoji: "\u{1F49C}", name: "Purple Heart", image: Some("./illustrations/stickers/heart-purple.png") },
    StickerDesign { emoji: "\u{2B50}", name: "Gold Star", image: Some("./illustrations/stickers/star-gold.png") },
    StickerDesign { emoji: "\u{1F31F}", name: "Glowing Star", image: None },
    StickerDesign { emoji: "\u{1F496}", name: "Sparkling Heart", image: Some("./illustrations/stickers/heart-sparkling.png") },
    StickerDesign { emoji: "\u{1F49D}", name: "Heart Ribbon", image: None },
    // Animals
    StickerDesign { emoji: "\u{1F430}", name: "Bunny", image: Some("./illustrations/stickers/bunny.png") },
    StickerDesign { emoji: "\u{1F436}", name: "Puppy", image: Some("./illustrations/stickers/puppy.png") },
    StickerDesign { emoji: "\u{1F431}", name: "Kitty", image: Some("./illustrations/stickers/kitty.png") },
    StickerDesign { emoji: "\u{1F98B}", name: "Butterfly", image: Some("./illustrations/stickers/butterfly.png") },
    StickerDesign { emoji: "\u{1F426}", name: "Bird", image: None },
    // Nature
    StickerDesign { emoji: "\u{1F33B}", name: "Sunflower", image: Some("./illustrations/stickers/sunflower.png") },
    StickerDesign { emoji: "\u{1F308}", name: "Rainbow", image: Some("./illustrations/stickers/rainbow.png") },
    StickerDesign { emoji: "\u{2600}\u{FE0F}", name: "Sunshine", image: None },
    StickerDesign { emoji: "\u{1F338}", name: "Cherry Blossom", image: Some("./illustrations/stickers/cherry-blossom.png") },
    StickerDesign { emoji: "\u{1F337}", name: "Tulip", image: None },
    // Streak milestones (special — earned at 3, 7, 14, 30 day streaks)
    StickerDesign { emoji: "\u{1F525}", name: "3 Day Fire", image: Some("./illustrations/stickers/streak-3-fire.png") },
    StickerDesign { emoji: "\u{1F48E}", name: "7 Day Gem", image: Some("./illustrations/stickers/streak-7-gem.png") },
    StickerDesign { emoji: "\u{1F451}", name: "14 Day Crown", image: Some("./illustrations/stickers/streak-14-crown.png") },
    StickerDesign { emoji: "\u{1F3C6}", name: "30 Day Trophy", image: Some("./illustrations/stickers/streak-30-trophy.png") },
    // Ultimate
    StickerDesign { emoji: "\u{1F984}\u{1F451}", name: "Unicorn Queen", image: Some("./illustrations/stickers/unicorn-queen.png") },
    // Goal achievements (earned via weekly goals)
    StickerDesign { emoji: "\u{1F33B}\u{1F3C6}", name: "Garden Hero", image: None },
    StickerDesign { emoji: "\u{1F31F}\u{1F3C6}", name: "Kindness Champion", image: None },
    StickerDesign { emoji: "\u{1F49C}\u{2B50}", name: "Super Helper", image: None },
    // Skill mastery badges (bronze/silver/gold for each skill category)
    // Bronze badges (10+ acts)
    StickerDesign { emoji: "\u{1F949}", name: "Bronze Sharing Master", image: None },
    StickerDesign { emoji: "\u{1F949}", name: "Bronze Helping Master", image: None },
    StickerDesign { emoji: "\u{1F949}", name: "Bronze Hug Master", image: None },
    StickerDesign { emoji: "\u{1F949}", name: "Bronze Nice Words Master", image: None },
    StickerDesign { emoji: "\u{1F949}", name: "Bronze Love Master", image: None },
    StickerDesign { emoji: "\u{1F949}", name: "Bronze Unicorn Master", image: None },
    // Silver badges (25+ acts)
    StickerDesign { emoji: "\u{1F948}", name: "Silver Sharing Expert", image: None },
    StickerDesign { emoji: "\u{1F948}", name: "Silver Helping Expert", image: None },
    StickerDesign { emoji: "\u{1F948}", name: "Silver Hug Expert", image: None },
    StickerDesign { emoji: "\u{1F948}", name: "Silver Nice Words Expert", image: None },
    StickerDesign { emoji: "\u{1F948}", name: "Silver Love Expert", image: None },
    StickerDesign { emoji: "\u{1F948}", name: "Silver Unicorn Expert", image: None },
    // Gold badges (50+ acts)
    StickerDesign { emoji: "\u{1F947}", name: "Gold Sharing Champion", image: None },
    StickerDesign { emoji: "\u{1F947}", name: "Gold Helping Champion", image: None },
    StickerDesign { emoji: "\u{1F947}", name: "Gold Hug Champion", image: None },
    StickerDesign { emoji: "\u{1F947}", name: "Gold Nice Words Champion", image: None },
    StickerDesign { emoji: "\u{1F947}", name: "Gold Love Champion", image: None },
    StickerDesign { emoji: "\u{1F947}", name: "Gold Unicorn Champion", image: None },
];

pub fn init() {
    show_loading_skeleton();
    // Render immediately — skeleton stays until hydrate_stickers_batch() is called by lib.rs
    render_sticker_grid();
    // App-lifetime listener — locked sticker tap feedback (single registration — init() called once at boot)
    setup_locked_sticker_tap();
}

/// Show loading skeleton while stickers are being fetched/hydrated.
/// Creates shimmer placeholders that get replaced by real stickers.
fn show_loading_skeleton() {
    let Some(body) = dom::query(SELECTOR_REWARDS_BODY) else { return };
    let doc = dom::document();

    // Clear body
    dom::safe_set_inner_html(&body, "");

    // Header skeleton
    let header_skeleton = render::create_el_with_class(&doc, "div", "skeleton-header shimmer");
    let _ = body.append_child(&header_skeleton);

    // Count skeleton
    let count_skeleton = render::create_el_with_class(&doc, "div", "skeleton-count shimmer");
    let _ = body.append_child(&count_skeleton);

    // Grid skeleton with 12 placeholder cells
    let grid_skeleton = render::create_el_with_class(&doc, "div", "sticker-skeleton");
    for _ in 0..12 {
        let cell = render::create_el_with_class(&doc, "div", "skeleton-cell shimmer");
        let _ = grid_skeleton.append_child(&cell);
    }

    let _ = body.append_child(&grid_skeleton);
}

fn render_sticker_grid() {
    let Some(body) = dom::query(SELECTOR_REWARDS_BODY) else { return };
    let doc = dom::document();
    let grid = render::create_el_with_class(&doc, "div", "sticker-grid");

    // Achievement summary at top — "Blaire's Sticker Collection"
    let header = render::create_el_with_class(&doc, "div", "rewards-header");
    header.set_text_content(Some("\u{1F984} Blaire's Sticker Collection \u{1F984}"));
    let _ = body.append_child(&header);

    // Count display — "X / 51 stickers earned!" (30 base + 3 goals + 18 mastery badges)
    let count = render::create_el_with_class(&doc, "div", "sticker-count");
    let _ = count.set_attribute("data-sticker-count", "");
    let _ = count.set_attribute("aria-live", "polite");
    count.set_text_content(Some("0 / 51 stickers earned!"));
    let _ = body.append_child(&count);

    // Render all sticker slots — use Imagen PNGs when available
    for (i, design) in STICKER_DESIGNS.iter().enumerate() {
        // Default: locked. DB hydration will unlock earned ones.
        let cell = ui::sticker_item_with_image(design.emoji, design.image, false, false);
        let _ = cell.set_attribute("data-sticker-idx", &i.to_string());
        let _ = cell.set_attribute("title", design.name);
        // Enhanced aria-label for screen readers
        let aria_label = format!("{} sticker, locked", design.name);
        let _ = cell.set_attribute("aria-label", &aria_label);
        let _ = cell.set_attribute("role", "img");
        let _ = grid.append_child(&cell);
    }

    dom::safe_set_inner_html(&body, "");
    let _ = body.append_child(&header);
    let _ = body.append_child(&count);
    let _ = body.append_child(&grid);
}

/// Reveal a sticker cell at `idx` and play the sparkle animation.
fn reveal_sticker_at(idx: usize, emoji: &str, image: Option<&str>) {
    if let Some(cell) = dom::query(&format!("[data-sticker-idx=\"{idx}\"]")) {
        reveal_sticker_cell(&cell, emoji, image, true);
        animations::sparkle_reveal(&cell);
    }
}

/// Award a sticker. Called by tracker (every 5th act), quests (all 3 complete), stories (completion).
pub fn award_sticker(source: &str) {
    let next_idx = next_unlocked_sticker_index();
    let Some(idx) = next_idx else { return }; // All 30 earned!
    let design = &STICKER_DESIGNS[idx];

    // SQLite write
    let id = utils::create_id();
    let now = utils::now_epoch_ms();
    let sticker_type = design.name.to_string();
    let source = source.to_string();

    db_client::exec_fire_and_forget(
        "sticker-save",
        "INSERT INTO stickers (id, sticker_type, earned_at, source) VALUES (?1, ?2, ?3, ?4)",
        vec![id, sticker_type, now.to_string(), source],
    );

    // Reveal the sticker in the grid — prefer Imagen PNG over emoji
    reveal_sticker_at(idx, design.emoji, design.image);

    // Update count
    update_sticker_count(idx + 1);

    // ARIA announcement for screen readers
    let earned = idx + 1;
    let remaining = STICKER_DESIGNS.len() - earned;
    dom::announce_live(&format!("Sticker earned! {} of {} collected, {} remaining", earned, STICKER_DESIGNS.len(), remaining));

    // CELEBRATION based on sticker milestone!
    if idx == 0 {
        // FIRST STICKER EVER — Great celebration!
        confetti::celebrate(confetti::CelebrationTier::Great);
        speech::celebrate("Your FIRST sticker! This is SO special!");
    } else {
        synth_audio::sparkle();
        confetti::burst_unicorn();
    }

    dom::toast(&format!("New sticker: {} {}", design.emoji, design.name));
    speech::celebrate(&format!("New sticker! {}", design.name));
    companion::on_sticker_earned();
}

/// Award a streak milestone sticker (indices 25-28 in STICKER_DESIGNS).
pub fn award_streak_sticker(streak_days: u32) {
    let idx = match streak_days {
        3 => 25,
        7 => 26,
        14 => 27,
        30 => 28,
        _ => return,
    };
    let design = &STICKER_DESIGNS[idx];

    let id = utils::create_id();
    let now = utils::now_epoch_ms();
    let sticker_type = design.name.to_string();

    wasm_bindgen_futures::spawn_local(async move {
        let _ = db_client::exec(
            "INSERT OR IGNORE INTO stickers (id, sticker_type, earned_at, source) VALUES (?1, ?2, ?3, ?4)",
            vec![id, sticker_type, now.to_string(), "streak".to_string()],
        ).await;
    });

    reveal_sticker_at(idx, design.emoji, design.image);

    // Toast only (celebration happens in streaks::check_milestones)
    dom::toast(&format!("{} day streak! {} {}", streak_days, design.emoji, design.name));
}

/// Award a goal-completion sticker.
/// "Garden Hero" = all weekly goals complete (idx 30)
/// "Kindness Champion" = repeated champion (idx 31)
/// "Super Helper" = custom goal done (idx 32)
pub fn award_goal_sticker(goal_sticker: &str) {
    let idx = match goal_sticker {
        "Garden Hero" => 30,
        "Kindness Champion" => 31,
        "Super Helper" => 32,
        _ => return,
    };
    let design = &STICKER_DESIGNS[idx];

    let id = utils::create_id();
    let now = utils::now_epoch_ms();
    let sticker_type = design.name.to_string();

    wasm_bindgen_futures::spawn_local(async move {
        let _ = db_client::exec(
            "INSERT OR IGNORE INTO stickers (id, sticker_type, earned_at, source) VALUES (?1, ?2, ?3, ?4)",
            vec![id, sticker_type, now.to_string(), "goal".to_string()],
        ).await;
    });

    reveal_sticker_at(idx, design.emoji, design.image);

    synth_audio::fanfare();
    confetti::burst_party();

    dom::toast(&format!("Goal sticker: {} {}", design.emoji, design.name));
    speech::celebrate(&format!("You earned the {} sticker!", design.name));
}

/// Award a skill mastery badge sticker.
/// Called by skill_progression when reaching bronze (10), silver (25), or gold (50) acts.
/// sticker_type format: "skill-bronze-sharing", "skill-silver-helping", "skill-gold-hug", etc.
/// source: "skill-mastery"
pub async fn award_mastery_sticker(sticker_type: &str, source: &str) {
    // Find the sticker design by name pattern
    let idx = STICKER_DESIGNS.iter().position(|d| {
        // Match by converting sticker_type to expected name format
        let expected_name = sticker_type_to_name(sticker_type);
        d.name == expected_name
    });

    let Some(idx) = idx else { return };
    let design = &STICKER_DESIGNS[idx];

    let id = utils::create_id();
    let now = utils::now_epoch_ms();
    let sticker_type_owned = sticker_type.to_string();
    let source_owned = source.to_string();

    let _ = db_client::exec(
        "INSERT OR IGNORE INTO stickers (id, sticker_type, earned_at, source) VALUES (?1, ?2, ?3, ?4)",
        vec![id, sticker_type_owned, now.to_string(), source_owned],
    ).await;

    reveal_sticker_at(idx, design.emoji, design.image);

    synth_audio::fanfare();
    confetti::burst_party();

    dom::toast(&format!("Mastery badge: {} {}", design.emoji, design.name));
    speech::celebrate(&format!("You earned the {} badge!", design.name));
}

/// Convert sticker_type format to design name.
/// "skill-bronze-sharing" => "Bronze Sharing Master"
/// "skill-silver-helping" => "Silver Helping Expert"
/// "skill-gold-hug" => "Gold Hug Champion"
fn sticker_type_to_name(sticker_type: &str) -> String {
    // Split sticker_type into [prefix, tier, skill]
    // "skill-bronze-nice-words" → ["skill", "bronze", "nice-words"]
    let parts: Vec<&str> = sticker_type.splitn(3, '-').collect();
    if parts.len() != 3 || parts[0] != "skill" { return String::new(); }

    let tier = parts[1];
    let skill = parts[2];

    // Capitalize skill name - handle multi-word skills
    let skill_cap = match skill {
        "nice-words" => "Nice Words",
        "unicorn" => "Unicorn",
        other => {
            // Capitalize first letter for single-word skills
            let mut c = other.chars();
            match c.next() {
                None => "",
                Some(f) => &format!("{}{}", f.to_uppercase(), c.as_str()),
            }
        }
    };

    match tier {
        "bronze" => format!("Bronze {} Master", skill_cap),
        "silver" => format!("Silver {} Expert", skill_cap),
        "gold" => format!("Gold {} Champion", skill_cap),
        _ => String::new(),
    }
}

fn next_unlocked_sticker_index() -> Option<usize> {
    // Simple: find first locked sticker cell in DOM (skip streak slots 25-28)
    for i in 0..25 {
        let sel = format!("[data-sticker-idx=\"{i}\"]");
        if let Some(cell) = dom::query(&sel) {
            if cell.class_list().contains("sticker-cell--locked") {
                return Some(i);
            }
        }
    }
    // Try ultimate slot
    if let Some(cell) = dom::query("[data-sticker-idx=\"29\"]") {
        if cell.class_list().contains("sticker-cell--locked") {
            return Some(29);
        }
    }
    None
}

pub fn update_sticker_count(earned: usize) {
    dom::set_text("[data-sticker-count]", &format!("{earned} / 51 stickers earned!"));
    // Bounce the count element to celebrate the new number
    if let Some(el) = dom::query("[data-sticker-count]") {
        let _ = el.class_list().add_1("counter-bounce");
        dom::set_timeout_once(350, move || {
            if let Some(el) = dom::query("[data-sticker-count]") {
                let _ = el.class_list().remove_1("counter-bounce");
            }
        });
    }
}

/// Set up tap feedback for locked sticker slots.
/// Uses event delegation on the rewards body — fires jelly_wobble + toast hint.
fn setup_locked_sticker_tap() {
    use wasm_bindgen::JsCast;
    let Some(body) = dom::query(SELECTOR_REWARDS_BODY) else { return };
    let target: web_sys::EventTarget = body.into();
    dom::on(&target, "click", move |e| {
        let Some(event) = e.dyn_ref::<web_sys::MouseEvent>() else { return };
        let Some(el) = event.target() else { return };
        let Some(elem) = el.dyn_ref::<web_sys::Element>() else { return };
        // Walk up to find closest sticker cell (tap may land on img inside cell)
        let cell = if elem.class_list().contains("sticker-cell--locked") {
            elem.clone()
        } else if let Some(parent) = elem.closest(".sticker-cell--locked").ok().flatten() {
            parent
        } else {
            return;
        };
        animations::jelly_wobble(&cell);
        dom::toast("Keep being kind to unlock! \u{1F495}");
    });
}

/// Batch hydrate multiple stickers at once (O(n) instead of O(n²)).
/// Single DOM query using querySelectorAll, then lookup by index.
pub fn hydrate_stickers_batch(sticker_types: &[String]) {
    use std::collections::{HashMap, HashSet};
    use wasm_bindgen::JsCast;

    // Build lookup: sticker_type -> index in STICKER_DESIGNS
    let mut type_to_idx: HashMap<&str, usize> = HashMap::new();
    for (i, design) in STICKER_DESIGNS.iter().enumerate() {
        type_to_idx.insert(design.name, i);
    }

    // Build set of indices to unlock
    let mut indices_to_unlock: HashSet<usize> = HashSet::new();
    for stype in sticker_types {
        if let Some(&idx) = type_to_idx.get(stype.as_str()) {
            indices_to_unlock.insert(idx);
        }
    }

    // Single querySelectorAll for all sticker cells (returns Vec<Element>)
    let cells = dom::query_all("[data-sticker-idx]");
    for cell in cells.iter() {
        if let Some(elem) = cell.dyn_ref::<web_sys::HtmlElement>() {
            // Get the data-sticker-idx attribute
            if let Some(idx_str) = elem.dataset().get("stickerIdx") {
                if let Ok(idx) = idx_str.parse::<usize>() {
                    if indices_to_unlock.contains(&idx) {
                        let design = &STICKER_DESIGNS[idx];
                        reveal_sticker_cell(cell, design.emoji, design.image, false);
                    }
                }
            }
        }
    }
}

/// Reveal a sticker cell — shows Imagen PNG if available, otherwise emoji.
fn reveal_sticker_cell(cell: &web_sys::Element, emoji: &str, image: Option<&str>, is_new: bool) {
    let class = if is_new {
        "sticker-cell sticker-cell--new rainbow-pulse"
    } else {
        "sticker-cell sticker-cell--earned"
    };
    let _ = cell.set_attribute("class", class);

    // Update aria-label to reflect unlocked status
    if let Some(current_label) = cell.get_attribute("aria-label") {
        let unlocked_label = current_label.replace(", locked", ", earned");
        let _ = cell.set_attribute("aria-label", &unlocked_label);
    }

    // Clear existing content
    dom::safe_set_inner_html(cell, "");

    if let Some(src) = image {
        let doc = dom::document();
        let img = render::create_img(&doc, src, emoji, "sticker-img");
        let _ = cell.append_child(&img);
    } else {
        cell.set_text_content(Some(emoji));
    }
}
