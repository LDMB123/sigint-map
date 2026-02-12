//! Kid-friendly UI components — each builds DOM via browser APIs.
//! No virtual DOM, no diffing. Direct DOM construction.

use web_sys::Element;
use crate::{dom, render, state};

/// Large emoji button (tracker categories, home hub).
/// `color_variant` adds a color-coded CSS modifier (e.g. "hug" → "kind-btn--hug").
/// When `image` is Some, renders an `<img>` instead of emoji text.
pub fn big_emoji_button(emoji: &str, label: &str, action: &str, color_variant: &str, image: Option<&str>) -> Element {
    let doc = dom::document();
    let class = if color_variant.is_empty() {
        "kind-btn".to_string()
    } else {
        format!("kind-btn kind-btn--{color_variant}")
    };
    let btn = render::create_el_with_class(&doc, "button", &class);
    let _ = btn.set_attribute("type", "button");
    let _ = btn.set_attribute("data-action", action);

    if let Some(src) = image {
        let img = render::create_img(&doc, src, "", "kind-btn-img");
        let _ = img.set_attribute("aria-hidden", "true");
        let _ = img.set_attribute("width", "256");
        let _ = img.set_attribute("height", "256");
        let _ = btn.append_child(&img);
    } else {
        let emoji_span = render::create_el_with_class(&doc, "span", "kind-btn-emoji");
        emoji_span.set_text_content(Some(emoji));
        let _ = emoji_span.set_attribute("aria-hidden", "true");
        let _ = btn.append_child(&emoji_span);
    }

    let label_span = render::create_el_with_class(&doc, "span", "kind-btn-label");
    label_span.set_text_content(Some(label));
    let _ = btn.append_child(&label_span);
    btn
}

/// Heart counter display (shows number with heart emoji).
/// Updates both the home hub counter ([data-hearts]) and tracker panel counter ([data-tracker-hearts-count]).
pub fn update_heart_counter(count: u32) {
    let text = format!("{count}");

    // Phase 2.4: Use cached elements with fallback
    let hearts = state::get_cached_hearts_counter()
        .or_else(|| dom::query("[data-hearts]"));
    let tracker_hearts = state::get_cached_tracker_hearts_counter()
        .or_else(|| dom::query("[data-tracker-hearts-count]"));

    if let Some(el) = hearts {
        el.set_text_content(Some(&text));
    }
    if let Some(el) = tracker_hearts {
        el.set_text_content(Some(&text));
    }
}

/// Streak counter display.
pub fn update_streak(days: u32) {
    if days > 0 {
        dom::set_text("[data-streak]", &format!("{days} day streak!"));
    } else {
        dom::set_text("[data-streak]", "Start your streak today!");
    }
}

/// Quest card element.
pub fn quest_card(emoji: &str, title: &str, desc: &str, done: bool) -> Element {
    let doc = dom::document();
    let class = if done { "quest-card quest-card--done" } else { "quest-card" };
    let card = render::create_el_with_class(&doc, "div", class);

    // Quest cards are interactive (tappable to complete)
    let _ = card.set_attribute("role", "button");
    let _ = card.set_attribute("tabindex", "0");
    let aria_label = if done { format!("{title} — completed") } else { format!("{title} — tap to complete") };
    let _ = card.set_attribute("aria-label", &aria_label);

    let emoji_el = render::create_el_with_class(&doc, "span", "quest-emoji");
    emoji_el.set_text_content(Some(emoji));
    let _ = emoji_el.set_attribute("aria-hidden", "true"); // decorative

    let content = render::create_el_with_class(&doc, "div", "quest-content");
    let title_el = render::create_el_with_class(&doc, "div", "quest-title");
    title_el.set_text_content(Some(title));
    let desc_el = render::create_el_with_class(&doc, "div", "quest-desc");
    desc_el.set_text_content(Some(desc));
    let _ = content.append_child(&title_el);
    let _ = content.append_child(&desc_el);

    let check = render::create_el_with_class(&doc, "div",
        if done { "quest-check quest-check--done" } else { "quest-check" });
    if done { check.set_text_content(Some("\u{2713}")); }

    let _ = card.append_child(&emoji_el);
    let _ = card.append_child(&content);
    let _ = card.append_child(&check);
    card
}

/// Story cover with rich emoji illustration (for library grid).
/// When `cover_image` is Some, renders an `<img>` that overlays the emoji (CSS :has(img) hides emoji).
pub fn story_cover(title: &str, done: bool, cover_emoji: &str, cover_color: &str, cover_image: Option<&str>) -> Element {
    let doc = dom::document();
    let class = if done { "story-cover story-cover--done" } else { "story-cover" };
    let cover = render::create_el_with_class(&doc, "div", class);

    let img_div = render::create_el_with_class(&doc, "div", "story-cover-img");
    img_div.set_text_content(Some(cover_emoji));
    let _ = img_div.set_attribute("style", &format!("background:{cover_color}"));

    // Overlay real image when available (emoji remains as fallback via CSS :has(img))
    if let Some(src) = cover_image {
        let img_el = render::create_img(&doc, src, title, "");
        let _ = img_div.append_child(&img_el);
    }

    let title_el = render::create_el_with_class(&doc, "div", "story-cover-title");
    title_el.set_text_content(Some(title));

    let _ = cover.append_child(&img_div);
    let _ = cover.append_child(&title_el);
    if done {
        let badge = render::create_el_with_class(&doc, "span", "story-cover-badge");
        badge.set_text_content(Some("\u{2B50}"));
        let _ = cover.append_child(&badge);
    }
    cover
}

/// Sticker grid item with optional Imagen PNG.
/// When `image` is Some and sticker is earned, renders an `<img>` instead of emoji text.
/// Locked stickers always show "?" regardless.
pub fn sticker_item_with_image(emoji: &str, image: Option<&str>, earned: bool, is_new: bool) -> Element {
    let doc = dom::document();
    let class = if is_new { "sticker-cell sticker-cell--new" }
        else if earned { "sticker-cell sticker-cell--earned" }
        else { "sticker-cell sticker-cell--locked" };
    let cell = render::create_el_with_class(&doc, "div", class);
    if earned || is_new {
        if let Some(src) = image {
            let img = render::create_img(&doc, src, emoji, "sticker-img");
            let _ = cell.append_child(&img);
        } else {
            cell.set_text_content(Some(emoji));
        }
    } else {
        cell.set_text_content(Some("?"));
    }
    cell
}
