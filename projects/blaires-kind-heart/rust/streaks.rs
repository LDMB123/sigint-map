//! Streak tracking — consecutive days of kindness.
//! SQLite stores day records. DOM renders a calendar grid.
//! Streak milestones at 3, 7, 14, 30 days trigger special stickers.

use std::cell::RefCell;
use std::rc::Rc;

use crate::{confetti, constants::SELECTOR_REWARDS_BODY, db_client, dom, render, rewards, speech, state::AppState, theme, ui, utils};

pub fn init() {
    render_streak_panel();
}

fn render_streak_panel() {
    let Some(body) = dom::query(SELECTOR_REWARDS_BODY) else { return };
    let doc = dom::document();

    // Streak counter (appended after sticker grid by rewards::init)
    let section = render::create_el_with_class(&doc, "div", "streak-section");

    let title = render::create_el_with_class(&doc, "h3", "streak-title");
    title.set_text_content(Some("\u{1F525} Kindness Streak"));
    let _ = section.append_child(&title);

    let counter = render::create_el_with_class(&doc, "div", "streak-counter");
    let _ = counter.set_attribute("data-streak", "");
    counter.set_text_content(Some("Start your streak today!"));
    let _ = section.append_child(&counter);

    // Mini calendar (last 7 days)
    let cal = render::create_el_with_class(&doc, "div", "streak-calendar");
    let _ = cal.set_attribute("data-streak-calendar", "");
    for i in 0..7 {
        let day = render::create_el_with_class(&doc, "div", "streak-day");
        let _ = day.set_attribute("data-day-offset", &i.to_string());
        day.set_text_content(Some("\u{25CB}")); // empty circle
        let _ = cal.append_child(&day);
    }
    let _ = section.append_child(&cal);

    // Milestone progress
    let milestones = render::create_el_with_class(&doc, "div", "streak-milestones");
    for &m in theme::STREAK_MILESTONES {
        let badge = render::create_el_with_class(&doc, "span", "streak-milestone");
        let _ = badge.set_attribute("data-milestone", &m.to_string());
        badge.set_text_content(Some(&format!("{m}")));
        let _ = milestones.append_child(&badge);
    }
    let _ = section.append_child(&milestones);

    let _ = body.append_child(&section);
}

/// Record today's activity and check streak.
/// Called after any kind act is logged.
pub fn record_today(state: Rc<RefCell<AppState>>) {
    let day_key = utils::today_key();
    let hearts = state.borrow().hearts_today;

    // Upsert today's streak record (fire-and-forget with error logging)
    let dk = day_key.clone();
    db_client::exec_fire_and_forget(
        "streak-upsert",
        "INSERT INTO streaks (day_key, acts_count, hearts_total) VALUES (?1, 1, ?2) \
         ON CONFLICT(day_key) DO UPDATE SET acts_count = acts_count + 1, hearts_total = hearts_total + 1",
        vec![dk, hearts.to_string()],
    );

    // Update streak display
    let streak = state.borrow().streak_days;
    ui::update_streak(streak);

    // Fill today's calendar dot
    if let Some(dot) = dom::query("[data-day-offset=\"0\"]") {
        dot.set_text_content(Some("\u{1F49C}")); // purple heart
        let _ = dot.set_attribute("class", "streak-day streak-day--active");
    }

    // Check milestones
    check_milestones(streak);
}

fn check_milestones(streak: u32) {
    for &milestone in theme::STREAK_MILESTONES {
        if streak == milestone {
            // Celebration tier based on milestone
            let tier = match milestone {
                3 => confetti::CelebrationTier::Nice,
                7 => confetti::CelebrationTier::Amazing,  // Week streak!
                14 => confetti::CelebrationTier::Great,
                30 => confetti::CelebrationTier::Epic,     // Month streak!
                _ => confetti::CelebrationTier::Nice,
            };
            confetti::celebrate(tier);

            rewards::award_streak_sticker(milestone);
            if let Some(badge) = dom::query(&format!("[data-milestone=\"{milestone}\"]")) {
                let _ = badge.set_attribute("class", "streak-milestone streak-milestone--earned");
            }

            // Special speech for big milestones
            if milestone == 7 {
                speech::celebrate("SEVEN DAYS of kindness! You're a superstar!");
            } else if milestone == 30 {
                speech::celebrate("THIRTY DAYS! You're the kindest person in the whole world!");
            }
        }
    }
}
