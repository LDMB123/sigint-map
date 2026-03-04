use crate::{
    animations, confetti, constants::SELECTOR_REWARDS_BODY, db_client, dom, domain_services,
    render, speech, synth_audio, ui, utils,
};
use std::fmt::Write;
use wasm_bindgen::JsCast;
struct StickerDesign {
    emoji: &'static str,
    name: &'static str,
    image: Option<&'static str>,
}
const STICKER_DESIGNS: &[StickerDesign] = &[
    StickerDesign {
        emoji: "\u{1F984}",
        name: "Rainbow Unicorn",
        image: Some("./illustrations/stickers/unicorn-rainbow.webp"),
    },
    StickerDesign {
        emoji: "\u{1F984}\u{2728}",
        name: "Sparkle Unicorn",
        image: Some("./illustrations/stickers/unicorn-sparkle.webp"),
    },
    StickerDesign {
        emoji: "\u{1F984}\u{1F308}",
        name: "Magic Unicorn",
        image: Some("./illustrations/stickers/unicorn-magic.webp"),
    },
    StickerDesign {
        emoji: "\u{1F984}\u{1F31F}",
        name: "Star Unicorn",
        image: Some("./illustrations/stickers/unicorn-star.webp"),
    },
    StickerDesign {
        emoji: "\u{1F984}\u{1F49C}",
        name: "Purple Unicorn",
        image: Some("./illustrations/stickers/unicorn-purple.webp"),
    },
    StickerDesign {
        emoji: "\u{1F388}",
        name: "Red Balloon",
        image: Some("./illustrations/stickers/balloon-red.webp"),
    },
    StickerDesign {
        emoji: "\u{1F388}\u{1F388}",
        name: "Double Balloon",
        image: Some("./illustrations/stickers/balloon-double.webp"),
    },
    StickerDesign {
        emoji: "\u{1F389}",
        name: "Party Popper",
        image: Some("./illustrations/stickers/party-popper.webp"),
    },
    StickerDesign {
        emoji: "\u{1F38A}",
        name: "Confetti Ball",
        image: Some("./illustrations/stickers/confetti-ball.webp"),
    },
    StickerDesign {
        emoji: "\u{1F38B}",
        name: "Tanabata Tree",
        image: Some("./illustrations/stickers/tanabata-tree.webp"),
    },
    StickerDesign {
        emoji: "\u{1F49C}",
        name: "Purple Heart",
        image: Some("./illustrations/stickers/heart-purple.webp"),
    },
    StickerDesign {
        emoji: "\u{2B50}",
        name: "Gold Star",
        image: Some("./illustrations/stickers/star-gold.webp"),
    },
    StickerDesign {
        emoji: "\u{1F31F}",
        name: "Glowing Star",
        image: Some("./illustrations/stickers/glowing-star.webp"),
    },
    StickerDesign {
        emoji: "\u{1F496}",
        name: "Sparkling Heart",
        image: Some("./illustrations/stickers/heart-sparkling.webp"),
    },
    StickerDesign {
        emoji: "\u{1F49D}",
        name: "Heart Ribbon",
        image: Some("./illustrations/stickers/heart-ribbon.webp"),
    },
    StickerDesign {
        emoji: "\u{1F430}",
        name: "Bunny",
        image: Some("./illustrations/stickers/bunny.webp"),
    },
    StickerDesign {
        emoji: "\u{1F436}",
        name: "Puppy",
        image: Some("./illustrations/stickers/puppy.webp"),
    },
    StickerDesign {
        emoji: "\u{1F431}",
        name: "Kitty",
        image: Some("./illustrations/stickers/kitty.webp"),
    },
    StickerDesign {
        emoji: "\u{1F98B}",
        name: "Butterfly",
        image: Some("./illustrations/stickers/butterfly.webp"),
    },
    StickerDesign {
        emoji: "\u{1F426}",
        name: "Bird",
        image: Some("./illustrations/stickers/bird.webp"),
    },
    StickerDesign {
        emoji: "\u{1F33B}",
        name: "Sunflower",
        image: Some("./illustrations/stickers/sunflower.webp"),
    },
    StickerDesign {
        emoji: "\u{1F308}",
        name: "Rainbow",
        image: Some("./illustrations/stickers/rainbow.webp"),
    },
    StickerDesign {
        emoji: "\u{2600}\u{FE0F}",
        name: "Sunshine",
        image: Some("./illustrations/stickers/sunshine.webp"),
    },
    StickerDesign {
        emoji: "\u{1F338}",
        name: "Cherry Blossom",
        image: Some("./illustrations/stickers/cherry-blossom.webp"),
    },
    StickerDesign {
        emoji: "\u{1F337}",
        name: "Tulip",
        image: Some("./illustrations/stickers/tulip.webp"),
    },
    StickerDesign {
        emoji: "\u{1F525}",
        name: "3 Day Fire",
        image: Some("./illustrations/stickers/streak-3-fire.webp"),
    },
    StickerDesign {
        emoji: "\u{1F48E}",
        name: "7 Day Gem",
        image: Some("./illustrations/stickers/streak-7-gem.webp"),
    },
    StickerDesign {
        emoji: "\u{1F451}",
        name: "14 Day Crown",
        image: Some("./illustrations/stickers/streak-14-crown.webp"),
    },
    StickerDesign {
        emoji: "\u{1F3C6}",
        name: "30 Day Trophy",
        image: Some("./illustrations/stickers/streak-30-trophy.webp"),
    },
    StickerDesign {
        emoji: "\u{1F984}\u{1F451}",
        name: "Unicorn Queen",
        image: Some("./illustrations/stickers/unicorn-queen.webp"),
    },
    StickerDesign {
        emoji: "\u{1F33B}\u{1F3C6}",
        name: "Garden Hero",
        image: Some("./illustrations/stickers/garden-hero.webp"),
    },
    StickerDesign {
        emoji: "\u{1F31F}\u{1F3C6}",
        name: "Kindness Champion",
        image: Some("./illustrations/stickers/kindness-champion.webp"),
    },
    StickerDesign {
        emoji: "\u{1F49C}\u{2B50}",
        name: "Super Helper",
        image: Some("./illustrations/stickers/super-helper.webp"),
    },
    StickerDesign {
        emoji: "\u{1F949}",
        name: "Bronze Sharing Master",
        image: Some("./illustrations/stickers/mastery-bronze-sharing.webp"),
    },
    StickerDesign {
        emoji: "\u{1F949}",
        name: "Bronze Helping Master",
        image: Some("./illustrations/stickers/mastery-bronze-helping.webp"),
    },
    StickerDesign {
        emoji: "\u{1F949}",
        name: "Bronze Hug Master",
        image: Some("./illustrations/stickers/mastery-bronze-hug.webp"),
    },
    StickerDesign {
        emoji: "\u{1F949}",
        name: "Bronze Love Master",
        image: Some("./illustrations/stickers/mastery-bronze-love.webp"),
    },
    StickerDesign {
        emoji: "\u{1F948}",
        name: "Silver Sharing Expert",
        image: Some("./illustrations/stickers/mastery-silver-sharing.webp"),
    },
    StickerDesign {
        emoji: "\u{1F948}",
        name: "Silver Helping Expert",
        image: Some("./illustrations/stickers/mastery-silver-helping.webp"),
    },
    StickerDesign {
        emoji: "\u{1F948}",
        name: "Silver Hug Expert",
        image: Some("./illustrations/stickers/mastery-silver-hug.webp"),
    },
    StickerDesign {
        emoji: "\u{1F948}",
        name: "Silver Love Expert",
        image: Some("./illustrations/stickers/mastery-silver-love.webp"),
    },
    StickerDesign {
        emoji: "\u{1F947}",
        name: "Gold Sharing Champion",
        image: Some("./illustrations/stickers/mastery-gold-sharing.webp"),
    },
    StickerDesign {
        emoji: "\u{1F947}",
        name: "Gold Helping Champion",
        image: Some("./illustrations/stickers/mastery-gold-helping.webp"),
    },
    StickerDesign {
        emoji: "\u{1F947}",
        name: "Gold Hug Champion",
        image: Some("./illustrations/stickers/mastery-gold-hug.webp"),
    },
    StickerDesign {
        emoji: "\u{1F947}",
        name: "Gold Love Champion",
        image: Some("./illustrations/stickers/mastery-gold-love.webp"),
    },
];
pub fn init() {
    if let Some(body) = dom::query(SELECTOR_REWARDS_BODY) {
        dom::set_attr(&body, "aria-busy", "true");
        let doc = dom::document();
        dom::safe_set_inner_html(&body, "");
        for class in ["skeleton-header shimmer", "skeleton-count shimmer"] {
            if let Some(el) = render::create_el_with_class(&doc, "div", class) {
                let _ = body.append_child(&el);
            }
        }
        if let Some(skeleton) =
            render::build_skeleton(&doc, "sticker-skeleton", "skeleton-cell shimmer", 12)
        {
            let _ = body.append_child(&skeleton);
        }
    }
    render_sticker_grid();
    setup_locked_sticker_tap();
}
fn render_sticker_grid() {
    let Some(body) = dom::query(SELECTOR_REWARDS_BODY) else {
        return;
    };
    let doc = dom::document();

    let Some(header) = render::text_el(
        &doc,
        "div",
        "rewards-header",
        "🦄 Blaire's Sticker Collection 🦄",
    ) else {
        return;
    };

    // Dress-up area
    let Some(dress_up_area) =
        render::create_el_with_class(&doc, "div", "dress-up-area drop-shadow")
    else {
        return;
    };
    let Some(unicorn_avatar) = render::create_img(
        &doc,
        "illustrations/stickers/unicorn-rainbow.webp",
        "Unicorn",
        "dress-up-unicorn",
    ) else {
        return;
    };
    let _ = dress_up_area.append_child(&unicorn_avatar);

    let Some(count) =
        render::create_el_with_data(&doc, "div", "sticker-count", "data-sticker-count")
    else {
        return;
    };
    dom::set_attr(&count, "aria-live", "polite");
    count.set_text_content(Some("\u{1F31F} No stickers yet \u{2014} be kind to earn your first! \u{1F49C}"));

    let Some(grid) = render::create_el_with_class(&doc, "div", "sticker-grid") else {
        return;
    };

    for (i, design) in STICKER_DESIGNS.iter().enumerate() {
        let Some(cell) = ui::sticker_item_with_image(design.emoji, design.image, false, false)
        else {
            continue;
        };
        dom::with_buf(|buf| {
            let _ = write!(buf, "{i}");
            dom::set_attr(&cell, "data-sticker-idx", buf);
        });
        dom::set_attr(&cell, "title", design.name);
        dom::with_buf(|buf| {
            let _ = write!(buf, "{} sticker, locked", design.name);
            dom::set_attr(&cell, "aria-label", buf);
        });
        dom::set_attr(&cell, "role", "img");

        let _ = grid.append_child(&cell);
    }

    dom::safe_set_inner_html(&body, "");
    let _ = body.append_child(&header);
    let _ = body.append_child(&dress_up_area);
    let _ = body.append_child(&count);
    let _ = body.append_child(&grid);
    dom::remove_attr(&body, "aria-busy");

    setup_drag_and_drop();
}
fn persist_sticker_spawn(sticker_type: &str, source: &str) {
    let id = utils::create_id();
    let now = utils::now_epoch_ms();
    let st = sticker_type.to_string();
    let src = source.to_string();
    crate::browser_apis::spawn_local_logged("sticker-persist", async move {
        db_client::exec(
            "INSERT OR IGNORE INTO stickers (id, sticker_type, earned_at, source) VALUES (?1, ?2, ?3, ?4)",
            vec![id, st, now.to_string(), src],
        )
        .await
    });
}
fn reveal_sticker_at(idx: usize, emoji: &str, image: Option<&str>) {
    let selector = dom::with_buf(|buf| {
        let _ = write!(buf, "{idx}");
        buf.clone()
    });
    let cell = dom::query_data("sticker-idx", &selector);
    if let Some(cell) = cell {
        reveal_sticker_cell(&cell, emoji, image, true);
        animations::sparkle_reveal(&cell);
    }
}
pub fn award_sticker(source: &str) {
    let Some(idx) = next_unlocked_sticker_index() else {
        return;
    };
    let design = &STICKER_DESIGNS[idx];
    let id = utils::create_id();
    let now = utils::now_epoch_ms();
    let sticker_type = design.name.to_string();
    let source = source.to_string();
    db_client::exec_fire_and_forget(
        "sticker-save",
        "INSERT INTO stickers (id, sticker_type, earned_at, source) VALUES (?1, ?2, ?3, ?4)",
        vec![id, sticker_type, now.to_string(), source],
    );
    reveal_sticker_at(idx, design.emoji, design.image);
    update_sticker_count(idx + 1);
    let earned = idx + 1;
    let remaining = STICKER_DESIGNS.len() - earned;
    dom::announce_live(&format!(
        "Sticker earned! {} of {} collected, {} remaining",
        earned,
        STICKER_DESIGNS.len(),
        remaining
    ));
    if idx == 0 {
        confetti::celebrate(confetti::CelebrationTier::Great);
        speech::celebrate("Your FIRST sticker! This is SO special!");
    } else {
        synth_audio::sparkle();
        confetti::burst_unicorn();
    }
    dom::toast(&format!("New sticker: {} {}", design.emoji, design.name));
    speech::celebrate(&format!("New sticker! {}", design.name));
    domain_services::notify_sticker_earned();
}
pub fn award_streak_sticker(streak_days: u32) {
    let idx = match streak_days {
        3 => 25,
        7 => 26,
        14 => 27,
        30 => 28,
        _ => return,
    };
    let design = &STICKER_DESIGNS[idx];
    persist_sticker_spawn(design.name, "streak");
    reveal_sticker_at(idx, design.emoji, design.image);
    dom::toast(&format!(
        "{} day streak! {} {}",
        streak_days, design.emoji, design.name
    ));
}
pub fn award_goal_sticker(goal_sticker: &str) {
    let idx = match goal_sticker {
        "Garden Hero" => 30,
        "Kindness Champion" => 31,
        "Super Helper" => 32,
        _ => return,
    };
    let design = &STICKER_DESIGNS[idx];
    persist_sticker_spawn(design.name, "goal");
    reveal_sticker_at(idx, design.emoji, design.image);
    synth_audio::fanfare();
    confetti::burst_party();
    dom::toast(&format!("Goal sticker: {} {}", design.emoji, design.name));
    speech::celebrate(&format!("You earned the {} sticker!", design.name));
}
pub fn award_mastery_sticker(sticker_type: &str, source: &str) {
    let idx = STICKER_DESIGNS
        .iter()
        .position(|d| d.name == sticker_type_to_name(sticker_type));
    let Some(idx) = idx else { return };
    let design = &STICKER_DESIGNS[idx];
    persist_sticker_spawn(sticker_type, source);
    reveal_sticker_at(idx, design.emoji, design.image);
    synth_audio::fanfare();
    confetti::burst_party();
    dom::toast(&format!("Mastery badge: {} {}", design.emoji, design.name));
    speech::celebrate(&format!("You earned the {} badge!", design.name));
}
fn sticker_type_to_name(sticker_type: &str) -> String {
    let parts: Vec<&str> = sticker_type.splitn(3, '-').collect();
    if parts.len() != 3 || parts[0] != "skill" {
        return String::new();
    }
    let tier = parts[1];
    let skill = parts[2];
    let skill_cap = {
        let mut c = skill.chars();
        let f = c.next().unwrap_or_default();
        &format!("{}{}", f.to_uppercase(), c.as_str())
    };
    match tier {
        "bronze" => format!("Bronze {skill_cap} Master"),
        "silver" => format!("Silver {skill_cap} Expert"),
        "gold" => format!("Gold {skill_cap} Champion"),
        _ => String::new(),
    }
}
fn next_unlocked_sticker_index() -> Option<usize> {
    for i in (0..25).chain(std::iter::once(29)) {
        let selector = dom::with_buf(|buf| {
            let _ = write!(buf, "{i}");
            buf.clone()
        });
        let cell = dom::query_data("sticker-idx", &selector);
        if let Some(cell) = cell {
            if cell.class_list().contains("sticker-cell--locked") {
                return Some(i);
            }
        }
    }
    None
}
pub fn update_sticker_count(earned: usize) {
    dom::fmt_text("[data-sticker-count]", |buf| {
        let _ = write!(buf, "{earned} / 45 stickers earned!");
    });
    if let Some(el) = dom::query("[data-sticker-count]") {
        let _ = el.class_list().add_1("counter-bounce");
        dom::delayed_class_remove(el, "counter-bounce", 350);
    }
}
fn setup_locked_sticker_tap() {
    let Some(body) = dom::query(SELECTOR_REWARDS_BODY) else {
        return;
    };
    let target: web_sys::EventTarget = body.into();
    dom::on(&target, "click", move |e| {
        let Some(elem) = dom::event_target_element(&e) else {
            return;
        };
        let cell = if elem.class_list().contains("sticker-cell--locked") {
            elem
        } else if let Some(parent) = dom::closest(&elem, ".sticker-cell--locked") {
            parent
        } else {
            return;
        };
        animations::jelly_wobble(&cell);
        dom::toast("Keep being kind to unlock! 💝");
    });
}

fn setup_drag_and_drop() {
    let dragging = std::rc::Rc::new(std::cell::RefCell::new(None::<web_sys::Element>));
    let start_x = std::rc::Rc::new(std::cell::RefCell::new(0.0));
    let start_y = std::rc::Rc::new(std::cell::RefCell::new(0.0));

    let get_pos = |e: &web_sys::Event| -> (f64, f64) {
        if let Some(mouse_e) = e.dyn_ref::<web_sys::MouseEvent>() {
            (mouse_e.client_x() as f64, mouse_e.client_y() as f64)
        } else if let Some(touch_e) = e.dyn_ref::<web_sys::TouchEvent>() {
            if let Some(t) = touch_e.touches().get(0) {
                (t.client_x() as f64, t.client_y() as f64)
            } else {
                (0.0, 0.0)
            }
        } else {
            (0.0, 0.0)
        }
    };

    let down_drag = dragging.clone();
    let down_x = start_x.clone();
    let down_y = start_y.clone();
    let on_down = move |e: web_sys::Event| {
        let Some(target) = dom::event_target_element(&e) else {
            return;
        };
        if let Some(cell) = dom::closest(&target, ".sticker-cell--earned") {
            let (x, y) = get_pos(&e);

            // Create a clone to drag around
            if let Some(clone) = cell
                .clone_node_with_deep(true)
                .ok()
                .and_then(|n| n.dyn_into::<web_sys::Element>().ok())
            {
                let _ = clone.class_list().add_1("sticker-dragging");
                crate::dom::set_centered_fixed_style(&clone, x, y, 100);
                let Some(body) = dom::document().body() else { return; };
                let _ = body.append_child(&clone);

                *down_drag.borrow_mut() = Some(clone);
                *down_x.borrow_mut() = x;
                *down_y.borrow_mut() = y;
            }
        }
    };

    let move_drag = dragging.clone();
    let on_move = move |e: web_sys::Event| {
        if let Some(clone) = &*move_drag.borrow() {
            e.prevent_default();
            let (x, y) = get_pos(&e);
            crate::dom::set_centered_fixed_style(clone, x, y, 100);
        }
    };

    let up_drag = dragging.clone();
    let on_up = move |e: web_sys::Event| {
        if let Some(clone) = up_drag.borrow_mut().take() {
            let (x, y) = get_pos(&e);

            // Check if dropped over dress-up area
            let dropped_on_target = if let Some(area) = dom::query(".dress-up-area") {
                let rect = area.get_bounding_client_rect();
                x >= rect.left() && x <= rect.right() && y >= rect.top() && y <= rect.bottom()
            } else {
                false
            };

            if dropped_on_target {
                if let Some(area) = dom::query(".dress-up-area") {
                    let rect = area.get_bounding_client_rect();
                    let rel_x = x - rect.left();
                    let rel_y = y - rect.top();

                    let _ = clone.class_list().remove_1("sticker-dragging");
                    let _ = clone.class_list().add_1("sticker-placed");
                    crate::dom::set_centered_absolute_style(&clone, rel_x, rel_y, 20);
                    let _ = area.append_child(&clone);

                    synth_audio::tap();
                    crate::confetti::float_emoji(crate::constants::SELECTOR_GAME_ARENA, "✨");
                }
            } else {
                clone.remove();
                synth_audio::whoosh();
            }
        }
    };

    if let Some(body) = dom::query(SELECTOR_REWARDS_BODY) {
        let t: web_sys::EventTarget = body.into();
        dom::on(&t, "mousedown", on_down.clone());
        dom::on(&t, "touchstart", on_down);
    }

    let window: web_sys::EventTarget = dom::window().into();
    dom::on(&window, "mousemove", on_move.clone());
    dom::on(&window, "touchmove", on_move);
    dom::on(&window, "mouseup", on_up.clone());
    dom::on(&window, "touchend", on_up.clone());
    dom::on(&window, "touchcancel", on_up);
}
pub fn hydrate_stickers_batch(sticker_types: &[String]) {
    use std::collections::{HashMap, HashSet};
    let mut type_to_idx: HashMap<&str, usize> = HashMap::new();
    for (i, design) in STICKER_DESIGNS.iter().enumerate() {
        type_to_idx.insert(design.name, i);
    }
    let mut indices_to_unlock: HashSet<usize> = HashSet::new();
    for stype in sticker_types {
        if let Some(&idx) = type_to_idx.get(stype.as_str()) {
            indices_to_unlock.insert(idx);
        }
    }
    dom::for_each_match("[data-sticker-idx]", |cell| {
        if let Some(elem) = cell.dyn_ref::<web_sys::HtmlElement>() {
            if let Some(idx_str) = elem.dataset().get("stickerIdx") {
                if let Ok(idx) = idx_str.parse::<usize>() {
                    if idx < STICKER_DESIGNS.len() && indices_to_unlock.contains(&idx) {
                        let design = &STICKER_DESIGNS[idx];
                        reveal_sticker_cell(&cell, design.emoji, design.image, false);
                    }
                }
            }
        }
    });
}
fn reveal_sticker_cell(cell: &web_sys::Element, emoji: &str, image: Option<&str>, is_new: bool) {
    let class = if is_new {
        "sticker-cell sticker-cell--new rainbow-pulse"
    } else {
        "sticker-cell sticker-cell--earned"
    };
    dom::set_attr(cell, "class", class);
    if let Some(current_label) = dom::get_attr(cell, "aria-label") {
        dom::set_attr(
            cell,
            "aria-label",
            &current_label.replace(", locked", ", earned"),
        );
    }
    dom::safe_set_inner_html(cell, "");
    if let Some(src) = image {
        let doc = dom::document();
        if let Some(img) = render::create_img(&doc, src, emoji, "sticker-img") {
            let _ = cell.append_child(&img);
        }
    } else {
        cell.set_text_content(Some(emoji));
    }
}
