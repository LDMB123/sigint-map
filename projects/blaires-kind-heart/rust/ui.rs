use crate::{dom, render, state};
use std::fmt::Write;
use web_sys::Element;
const STAR_IMG: &str = r#"<img src="illustrations/stickers/star-gold.webp" alt="Gold Star" class="star-img" />"#;
pub const CHECK_SVG: &str = r#"<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>"#;
const FIRE_IMG: &str = r#"<img src="illustrations/stickers/streak-3-fire.webp" alt="Streak Fire" class="streak-fire-img" />"#;

pub fn big_emoji_button(
    emoji: &str,
    label: &str,
    action: &str,
    color_variant: &str,
    image: Option<&str>,
) -> Option<Element> {
    let doc = dom::document();
    let btn = if color_variant.is_empty() {
        render::create_el_with_class(&doc, "button", "kind-btn")?
    } else {
        let el = dom::with_buf(|buf| {
            let _ = write!(buf, "kind-btn kind-btn--{color_variant}");
            render::create_el_with_class(&doc, "button", buf)
        })?;
        el
    };
    dom::set_attr(&btn, "type", "button");
    dom::set_attr(&btn, "data-action", action);
    if let Some(src) = image {
        let img = render::create_img(&doc, src, "", "kind-btn-img")?;
        dom::set_attr(&img, "aria-hidden", "true");
        dom::set_attr(&img, "width", "256");
        dom::set_attr(&img, "height", "256");
        let _ = btn.append_child(&img);
    } else {
        let emoji_span = render::text_el(&doc, "span", "kind-btn-emoji", emoji)?;
        dom::set_attr(&emoji_span, "aria-hidden", "true");
        let _ = btn.append_child(&emoji_span);
    }
    render::append_text(&doc, &btn, "span", "kind-btn-label", label);
    Some(btn)
}
pub fn update_heart_counter(count: u32) {
    dom::with_buf(|buf| {
        let _ = std::fmt::Write::write_fmt(buf, format_args!("{count}"));
        if let Some(el) = state::get_cached_hearts_counter().or_else(|| dom::query("[data-hearts]"))
        {
            el.set_text_content(Some(buf));
        }
        if let Some(el) = state::get_cached_tracker_hearts_counter()
            .or_else(|| dom::query("[data-tracker-hearts-count]"))
        {
            el.set_text_content(Some(buf));
        }
    });
}
pub fn update_streak(days: u32) {
    if days > 0 {
        dom::fmt_text("[data-streak]", |buf| {
            let _ = write!(buf, "{days} day streak!");
        });
    } else {
        dom::set_text("[data-streak]", "Start your streak today!");
    }
    update_streak_fire(days);
}
fn update_streak_fire(days: u32) {
    if let Some(fire) = dom::query("[data-streak-fire]") {
        for cls in [
            "streak-fire--small",
            "streak-fire--medium",
            "streak-fire--big",
            "streak-fire--rainbow",
        ] {
            let _ = fire.class_list().remove_1(cls);
        }
        if days == 0 {
            fire.set_text_content(Some(""));
            return;
        }
        let size_class = match days {
            1..=2 => "streak-fire--small",
            3..=4 => "streak-fire--medium",
            5..=9 => "streak-fire--big",
            _ => "streak-fire--rainbow",
        };
        let _ = fire.class_list().add_1(size_class);
        dom::safe_set_inner_html(&fire, FIRE_IMG);
    }
}
pub fn quest_card(
    emoji: &str,
    title: &str,
    desc: &str,
    did_you_know: &str,
    done: bool,
) -> Option<Element> {
    let doc = dom::document();
    let class = if done {
        "quest-card quest-card--done"
    } else {
        "quest-card"
    };
    let card = render::create_el_with_class(&doc, "div", class)?;
    dom::set_attr(&card, "role", "button");
    dom::set_attr(&card, "tabindex", "0");
    dom::with_buf(|buf| {
        let _ = write!(
            buf,
            "{title} — {}",
            if done { "completed" } else { "tap to complete" }
        );
        dom::set_attr(&card, "aria-label", buf);
    });
    let emoji_el = render::text_el(&doc, "span", "quest-emoji", emoji)?;
    dom::set_attr(&emoji_el, "aria-hidden", "true");
    let content = render::create_el_with_class(&doc, "div", "quest-content")?;
    let title_el = render::text_el(&doc, "div", "quest-title", title)?;
    let desc_el = render::text_el(&doc, "div", "quest-desc", desc)?;
    let _ = content.append_child(&title_el);
    let _ = content.append_child(&desc_el);
    if done && !did_you_know.is_empty() {
        if let Some(fun_el) = render::create_el_with_class(&doc, "div", "quest-did-you-know") {
            dom::safe_set_inner_html(
                &fun_el,
                &format!("🪄 <strong>Did you know?</strong> {}", did_you_know),
            );
            let _ = content.append_child(&fun_el);
        }
    }
    let check = render::create_el_with_class(
        &doc,
        "div",
        if done {
            "quest-check quest-check--done"
        } else {
            "quest-check"
        },
    )?;
    if done {
        dom::safe_set_inner_html(&check, CHECK_SVG);
    }
    let _ = card.append_child(&emoji_el);
    let _ = card.append_child(&content);
    let _ = card.append_child(&check);
    Some(card)
}
pub fn story_cover(
    title: &str,
    done: bool,
    cover_emoji: &str,
    cover_color: &str,
    cover_image: Option<&str>,
) -> Option<Element> {
    let doc = dom::document();
    let class = if done {
        "story-cover story-cover--done"
    } else {
        "story-cover"
    };
    let cover = render::create_el_with_class(&doc, "div", class)?;
    let img_div = render::text_el(&doc, "div", "story-cover-img", cover_emoji)?;
    dom::with_buf(|buf| {
        let _ = write!(buf, "background:{cover_color}");
        dom::set_attr(&img_div, "style", buf);
    });
    if let Some(src) = cover_image {
        let img_el = render::create_img(&doc, src, title, "")?;
        let _ = img_div.append_child(&img_el);
    }
    let title_el = render::text_el(&doc, "div", "story-cover-title", title)?;
    let _ = cover.append_child(&img_div);
    let _ = cover.append_child(&title_el);
    if done {
        if let Some(badge) = render::create_el_with_class(&doc, "span", "story-cover-badge") {
            dom::safe_set_inner_html(&badge, STAR_IMG);
            let _ = cover.append_child(&badge);
        }
    }
    Some(cover)
}
pub fn sticker_item_with_image(
    emoji: &str,
    image: Option<&str>,
    earned: bool,
    is_new: bool,
) -> Option<Element> {
    let doc = dom::document();
    let class = if is_new {
        "sticker-cell sticker-cell--new"
    } else if earned {
        "sticker-cell sticker-cell--earned"
    } else {
        "sticker-cell sticker-cell--locked"
    };
    let cell = render::create_el_with_class(&doc, "div", class)?;
    if earned || is_new {
        if let Some(src) = image {
            let img = render::create_img(&doc, src, emoji, "sticker-img")?;
            let _ = cell.append_child(&img);
        } else {
            cell.set_text_content(Some(emoji));
        }
    } else {
        cell.set_text_content(Some("?"));
    }
    Some(cell)
}
