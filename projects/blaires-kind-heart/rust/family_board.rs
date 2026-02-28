use crate::{confetti, db_client, dom, render, speech, synth_audio, utils};
use wasm_bindgen::JsCast;
use web_sys::Event;

const FAMILY_MEMBERS: &[(&str, &str)] = &[
    ("\u{1F469}", "Mommy"),
    ("\u{1F468}", "Daddy"),
    ("\u{1F466}", "Brother"),
    ("\u{1F467}", "Sister"),
    ("\u{1F475}", "Grandma"),
    ("\u{1F474}", "Grandpa"),
    ("\u{1F9D1}\u{200D}\u{1F91D}\u{200D}\u{1F9D1}", "Friend"),
];

const FAMILY_CATEGORIES: &[(&str, &str)] = &[
    ("\u{1F917}", "hug"),
    ("\u{1F91D}", "sharing"),
    ("\u{1F64F}", "helping"),
    ("\u{1F49C}", "love"),
];

pub fn init() {
    render_family_button();
}

fn render_family_button() {
    let Some(body) = dom::query(crate::constants::SELECTOR_TRACKER_BODY) else {
        return;
    };
    let doc = dom::document();
    let Some(btn) = render::create_button_with_data(
        &doc,
        "family-board-toggle",
        "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466} Family Kindness",
        "data-family-toggle",
    ) else {
        return;
    };
    dom::set_attr(&btn, "aria-label", "Log a family member's kind act");
    let _ = body.append_child(&btn);

    dom::on(btn.unchecked_ref(), "click", |_: Event| {
        synth_audio::tap();
        toggle_family_panel();
    });
}

fn toggle_family_panel() {
    if let Some(existing) = dom::query("[data-family-panel]") {
        existing.remove();
        return;
    }
    let Some(body) = dom::query(crate::constants::SELECTOR_TRACKER_BODY) else {
        return;
    };
    let doc = dom::document();
    let Some(panel) = render::create_el_with_data(&doc, "div", "family-board", "data-family-panel")
    else {
        return;
    };
    render::append_text(&doc, &panel, "div", "family-board__title", "Who was kind?");

    let Some(grid) = render::create_el_with_class(&doc, "div", "family-board__members") else {
        return;
    };
    for &(emoji, name) in FAMILY_MEMBERS {
        let Some(btn) = render::create_button(&doc, "family-board__member", emoji) else {
            continue;
        };
        dom::set_attr(&btn, "data-family-member", name);
        dom::set_attr(&btn, "aria-label", name);
        let _ = grid.append_child(&btn);
    }
    let _ = panel.append_child(&grid);

    // Category sub-panel (hidden initially)
    let Some(cat_panel) = render::create_el_with_data(
        &doc,
        "div",
        "family-board__categories",
        "data-family-categories",
    ) else {
        return;
    };
    dom::set_attr(&cat_panel, "hidden", "");
    dom::set_attr(&cat_panel, "role", "group");
    dom::set_attr(&cat_panel, "aria-label", "Kind act categories");
    for &(emoji, cat) in FAMILY_CATEGORIES {
        let Some(btn) = render::create_button(&doc, "family-board__category", emoji) else {
            continue;
        };
        dom::set_attr(&btn, "data-family-cat", cat);
        dom::set_attr(&btn, "aria-label", cat);
        let _ = cat_panel.append_child(&btn);
    }
    let _ = panel.append_child(&cat_panel);
    dom::set_attr(&panel, "role", "dialog");
    dom::set_attr(&panel, "aria-label", "Family kindness board");
    let _ = body.append_child(&panel);
    bind_family_events();

    // Auto-dismiss after 15s (generous for a 4-year-old doing the 2-step member+category flow)
    dom::set_timeout_once(15000, || {
        if let Some(p) = dom::query("[data-family-panel]") {
            p.remove();
        }
    });
}

fn bind_family_events() {
    let Some(panel) = dom::query("[data-family-panel]") else {
        return;
    };
    dom::on(panel.unchecked_ref(), "click", |event: Event| {
        let Some(el) = dom::event_target_element(&event) else {
            return;
        };
        // Member tap -> show categories
        if let Some(member_btn) = dom::closest(&el, "[data-family-member]") {
            if let Some(name) = dom::get_attr(&member_btn, "data-family-member") {
                show_family_categories(&name);
            }
            return;
        }
        // Category tap -> log family act
        if let Some(cat_btn) = dom::closest(&el, "[data-family-cat]") {
            if let Some(cat) = dom::get_attr(&cat_btn, "data-family-cat") {
                log_family_act(&cat);
            }
        }
    });
}

fn show_family_categories(member: &str) {
    if let Some(panel) = dom::query("[data-family-panel]") {
        dom::set_attr(&panel, "data-selected-member", member);
    }
    if let Some(cats) = dom::query("[data-family-categories]") {
        dom::remove_attr(&cats, "hidden");
        if dom::query_in(&cats, ".family-board__cat-title").is_none() {
            let doc = dom::document();
            if let Some(title) =
                render::create_el_with_class(&doc, "div", "family-board__cat-title")
            {
                title.set_text_content(Some(&format!("What did {member} do?")));
                dom::set_attr(&title, "role", "heading");
                dom::set_attr(&title, "aria-level", "3");
                let _ = cats.insert_before(&title, cats.first_child().as_ref());
            }
        }
    }
    if let Some(grid) = dom::query(".family-board__members") {
        dom::set_attr(&grid, "hidden", "");
    }
    synth_audio::chime();
}

fn log_family_act(category: &str) {
    let member = dom::query("[data-family-panel]")
        .and_then(|p| dom::get_attr(&p, "data-selected-member"))
        .unwrap_or_else(|| "Friend".to_string());

    let id = utils::create_id();
    let day_key = utils::today_key();
    let now = utils::now_epoch_ms();

    db_client::exec_fire_and_forget(
        "family-act",
        "INSERT INTO family_acts (id, member, category, created_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5)",
        vec![id, member.clone(), category.to_string(), now.to_string(), day_key],
    );

    let msg = format!("{member} did a kind act! That's so sweet!");
    speech::speak(&msg);
    synth_audio::sparkle();
    confetti::float_emoji("[data-family-panel]", "\u{1F49C}");

    if let Some(panel) = dom::query("[data-family-panel]") {
        panel.remove();
    }
}
