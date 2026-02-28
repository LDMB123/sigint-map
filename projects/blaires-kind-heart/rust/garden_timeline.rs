use crate::{browser_apis, db_client, dom, render, speech, synth_audio, utils};
use std::fmt::Write;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

pub fn init() {
    listen_panel();
}

fn listen_panel() {
    let doc = dom::document();
    dom::on(
        doc.unchecked_ref(),
        crate::constants::EVENT_PANEL_OPENED,
        |event: Event| {
            let evt: &web_sys::CustomEvent = event.unchecked_ref();
            let detail = evt.detail();
            let target = js_sys::Reflect::get(&detail, &"target_panel".into())
                .ok()
                .and_then(|v| v.as_string());
            if target.as_deref() == Some(crate::constants::PANEL_PROGRESS) {
                browser_apis::spawn_local_logged("garden-timeline", async {
                    render_timeline().await;
                    Ok(())
                });
            }
        },
    );
}

async fn render_timeline() {
    let rows = db_client::query(
        "SELECT day_key, COUNT(*) as act_count FROM kind_acts GROUP BY day_key ORDER BY day_key DESC LIMIT 30",
        vec![],
    )
    .await
    .unwrap_or_default();

    let mut day_map = std::collections::HashMap::new();
    if let Some(arr) = rows.as_array() {
        for row in arr {
            if let (Some(dk), Some(count)) = (
                row.get("day_key").and_then(|v| v.as_str()),
                row.get("act_count").and_then(|v| v.as_u64()),
            ) {
                day_map.insert(dk.to_string(), count as u32);
            }
        }
    }

    let Some(body) = dom::query(crate::constants::SELECTOR_PROGRESS_BODY) else {
        return;
    };
    // Remove existing timeline if re-rendering
    if let Some(old) = dom::query("[data-garden-timeline]") {
        old.remove();
    }

    let doc = dom::document();
    let Some(container) =
        render::create_el_with_data(&doc, "div", "garden-timeline", "data-garden-timeline")
    else {
        return;
    };

    dom::set_attr(&container, "role", "region");
    dom::set_attr(&container, "aria-label", "Garden growth history");

    render::append_text(
        &doc,
        &container,
        "div",
        "garden-timeline__title",
        "\u{1F331} Garden History",
    );

    if day_map.is_empty() {
        render::append_text(
            &doc,
            &container,
            "div",
            "garden-timeline__empty",
            "\u{1F331} Your garden history will grow here!",
        );
        insert_timeline(&body, &container);
        return;
    }

    let Some(strip) = render::create_el_with_class(&doc, "div", "garden-timeline__strip") else {
        return;
    };

    let today = utils::today_key();
    let mut day = today;
    for i in 0..30u32 {
        let count = day_map.get(&day).copied().unwrap_or(0);
        let (emoji, stage_class) = growth_stage(count);
        let day_label = abbreviated_day(&day);

        // Avoid format!() — create with base class, add stage via classList
        let Some(tile) = render::create_el_with_class(&doc, "div", "timeline-day") else {
            day = utils::prev_day_key(&day);
            continue;
        };
        let _ = tile.class_list().add_1(stage_class);
        dom::set_attr(&tile, "data-timeline-day", &day);
        // Reuse buffer for aria-label
        dom::with_buf(|buf| {
            let _ = write!(buf, "{count} kind acts on {day_label}");
            dom::set_attr(&tile, "aria-label", buf);
        });
        if i == 0 {
            let _ = tile.class_list().add_1("timeline-day--today");
        }

        render::append_text(&doc, &tile, "div", "timeline-day__emoji", emoji);
        render::append_text(&doc, &tile, "div", "timeline-day__label", day_label);

        let _ = strip.append_child(&tile);
        day = utils::prev_day_key(&day);
    }

    let _ = container.append_child(&strip);
    insert_timeline(&body, &container);

    // Tap handler for day tooltips
    dom::on(strip.unchecked_ref(), "click", |event: Event| {
        let Some(el) = dom::event_target_element(&event) else {
            return;
        };
        if let Some(tile) = dom::closest(&el, "[data-timeline-day]") {
            if let Some(day_key) = dom::get_attr(&tile, "data-timeline-day") {
                synth_audio::tap();
                show_day_tooltip(&tile, &day_key);
            }
        }
    });
}

fn insert_timeline(body: &Element, container: &Element) {
    // Insert before sparkle motivation section if it exists
    if let Some(sparkle) = dom::query("[data-sparkle-motivation]") {
        let _ = body.insert_before(container, Some(&sparkle));
    } else {
        let _ = body.append_child(container);
    }
}

const fn growth_stage(count: u32) -> (&'static str, &'static str) {
    match count {
        0 => ("\u{1F331}", "timeline-day--seed"),
        1..=2 => ("\u{1F33F}", "timeline-day--sprout"),
        3..=4 => ("\u{1F33B}", "timeline-day--flower"),
        _ => ("\u{1F338}", "timeline-day--bloom"),
    }
}

fn abbreviated_day(day_key: &str) -> &'static str {
    // Parse "YYYY-MM-DD" without collecting into Vec — use split iterator directly
    let mut parts = day_key.splitn(3, '-');
    if let (Some(ys), Some(ms), Some(ds)) = (parts.next(), parts.next(), parts.next()) {
        if let (Ok(y), Ok(m), Ok(d)) = (ys.parse::<f64>(), ms.parse::<f64>(), ds.parse::<f64>()) {
            let date = js_sys::Date::new_with_year_month_day(y as u32, (m as i32) - 1, d as i32);
            let dow = date.get_day() as usize;
            return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                .get(dow)
                .unwrap_or(&"???");
        }
    }
    "???"
}

fn show_day_tooltip(_tile: &Element, day_key: &str) {
    // Remove existing tooltip
    if let Some(old) = dom::query("[data-timeline-tooltip]") {
        old.remove();
    }

    let doc = dom::document();
    let dk = day_key.to_string();
    let tile_key = day_key.to_string();
    browser_apis::spawn_local_logged("garden-timeline-tooltip", async move {
        let count = db_client::query(
            "SELECT COUNT(*) as cnt FROM kind_acts WHERE day_key = ?1",
            vec![dk],
        )
        .await
        .ok()
        .and_then(|rows| rows.get(0)?.get("cnt")?.as_u64())
        .unwrap_or(0);

        let tile_el = dom::with_buf(|buf| {
            let _ = write!(buf, "[data-timeline-day='{tile_key}']");
            dom::query(buf)
        });
        if let Some(tile_el) = tile_el {
            let Some(tooltip) = render::create_el_with_data(
                &doc,
                "div",
                "timeline-tooltip",
                "data-timeline-tooltip",
            ) else {
                return Ok(());
            };
            dom::with_buf(|buf| {
                let _ = write!(buf, "{count} kind acts!");
                tooltip.set_text_content(Some(buf));
            });
            dom::set_attr(&tooltip, "aria-live", "polite");
            let _ = tile_el.append_child(&tooltip);
            dom::set_timeout_once(2500, || {
                if let Some(t) = dom::query("[data-timeline-tooltip]") {
                    t.remove();
                }
            });
        }
        dom::with_buf(|buf| {
            let _ = write!(buf, "{count} kind acts!");
            speech::speak(buf);
        });
        Ok(())
    });
}
