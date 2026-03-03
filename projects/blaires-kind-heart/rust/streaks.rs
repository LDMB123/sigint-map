use crate::{
    confetti, constants::SELECTOR_REWARDS_BODY, db_client, dom, render, rewards, speech,
    state::AppState, theme, ui, utils,
};
use std::cell::RefCell;
use std::rc::Rc;
pub fn init() {
    render_streak_panel();
}
fn render_streak_panel() {
    let Some(body) = dom::query(SELECTOR_REWARDS_BODY) else {
        return;
    };
    let doc = dom::document();
    let Some(section) = render::create_el_with_class(&doc, "div", "streak-section") else {
        return;
    };
    render::append_text(
        &doc,
        &section,
        "h3",
        "streak-title",
        "\u{1F525} Kindness Streak",
    );
    let Some(counter) = render::create_el_with_data(&doc, "div", "streak-counter", "data-streak")
    else {
        return;
    };
    counter.set_text_content(Some("Start your streak today!"));
    let _ = section.append_child(&counter);
    let Some(cal) =
        render::create_el_with_data(&doc, "div", "streak-calendar", "data-streak-calendar")
    else {
        return;
    };
    for i in 0..7 {
        let Some(day) = render::create_el_with_class(&doc, "div", "streak-day") else {
            continue;
        };
        dom::set_attr(&day, "data-day-offset", &i.to_string());
        day.set_text_content(Some("\u{25CB}"));
        let _ = cal.append_child(&day);
    }
    let _ = section.append_child(&cal);
    let Some(milestones) = render::create_el_with_class(&doc, "div", "streak-milestones") else {
        return;
    };
    for &m in theme::STREAK_MILESTONES {
        let Some(badge) = render::create_el_with_class(&doc, "span", "streak-milestone") else {
            continue;
        };
        dom::set_attr(&badge, "data-milestone", &m.to_string());
        badge.set_text_content(Some(&m.to_string()));
        let _ = milestones.append_child(&badge);
    }
    let _ = section.append_child(&milestones);
    let _ = body.append_child(&section);
}
pub fn record_today(state: Rc<RefCell<AppState>>) {
    let day_key = utils::today_key();
    let hearts = state.borrow().hearts_today;
    db_client::exec_fire_and_forget(
        "streak-upsert",
        "INSERT INTO streaks (day_key, acts_count, hearts_total) VALUES (?1, 1, ?2) \
        ON CONFLICT(day_key) DO UPDATE SET acts_count = acts_count + 1, hearts_total = excluded.hearts_total",
        vec![day_key, hearts.to_string()],
    );
    let streak = state.borrow().streak_days;
    ui::update_streak(streak);
    if let Some(dot) = dom::query("[data-day-offset=\"0\"]") {
        dot.set_text_content(Some("\u{1F49C}"));
        dom::set_attr(&dot, "class", "streak-day streak-day--active");
    }
    check_milestones(streak);
}
fn check_milestones(streak: u32) {
    for &milestone in theme::STREAK_MILESTONES {
        if streak == milestone {
            let tier = match milestone {
                7 => confetti::CelebrationTier::Amazing,
                14 => confetti::CelebrationTier::Great,
                30 => confetti::CelebrationTier::Epic,
                _ => confetti::CelebrationTier::Nice,
            };
            confetti::celebrate(tier);
            rewards::award_streak_sticker(milestone);
            if let Some(badge) = dom::query_data("milestone", &milestone.to_string()) {
                dom::set_attr(&badge, "class", "streak-milestone streak-milestone--earned");
            }
            if milestone == 7 {
                speech::celebrate("SEVEN DAYS of kindness! You're a superstar!");
            } else if milestone == 30 {
                speech::celebrate("THIRTY DAYS! You're the kindest person in the whole world!");
            }
        }
    }
}
