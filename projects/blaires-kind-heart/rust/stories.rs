//! Story library + reader UI.
//! Renders story covers, opens reader. story_engine handles page logic.

use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

use crate::{animations, constants::SELECTOR_STORIES_BODY, db_client, dom, navigation, story_data, story_engine, ui};

pub fn init() {
    // Fetch completed story IDs before first render so done states are correct from the start
    wasm_bindgen_futures::spawn_local(async {
        render_library_async().await;
    });
    bind_story_clicks();
    bind_story_done_event();
}

/// Listen for "kindheart-story-done" custom event to re-render library after story completion.
fn bind_story_done_event() {
    let window = dom::window();
    dom::on(window.unchecked_ref(), "kindheart-story-done", move |_: Event| {
        // Re-render with async DB query so completed stories get badges
        wasm_bindgen_futures::spawn_local(async {
            render_library_async().await;
        });
    });
}

/// Async re-render that queries DB for completed story IDs first.
async fn render_library_async() {
    let mut completed: Vec<String> = Vec::new();
    if let Ok(rows) = db_client::query(
        "SELECT story_id FROM stories_progress WHERE completed = 1",
        vec![],
    ).await {
        if let Some(arr) = rows.as_array() {
            for row in arr {
                if let Some(sid) = row.get("story_id").and_then(|v| v.as_str()) {
                    completed.push(sid.to_string());
                }
            }
        }
    }
    navigation::with_view_transition(move || {
        render_library_sync(&completed);
    });
}

fn render_library_sync(completed_ids: &[String]) {
    let Some(body) = dom::query(SELECTOR_STORIES_BODY) else { return };
    let doc = dom::document();
    let grid = doc.create_element("div").unwrap();
    let _ = grid.set_attribute("class", "story-library");

    for story in story_data::ALL_STORIES {
        let done = completed_ids.iter().any(|id| id == story.id);
        let cover = ui::story_cover(story.title, done, story.cover_emoji, story.cover_color, story.cover_image);
        let _ = cover.set_attribute("data-story", story.id);
        let _ = cover.set_attribute("role", "button");
        let _ = cover.set_attribute("tabindex", "0");
        let _ = grid.append_child(&cover);
    }

    dom::safe_set_inner_html(&body, "");
    let _ = body.append_child(&grid);
}

fn bind_story_clicks() {
    if let Some(body) = dom::query(SELECTOR_STORIES_BODY) {
        dom::on(body.unchecked_ref(), "click", move |event: Event| {
            let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
            let Some(el) = target else { return };
            if let Ok(Some(cover)) = el.closest("[data-story]") {
                if let Some(story_id) = cover.get_attribute("data-story") {
                    animations::jelly_wobble(&cover);
                    story_engine::open_story(&story_id);
                }
            }
        });
    }
}

/// Mark a story as completed in the library grid (called during hydration from lib.rs).
pub fn hydrate_completed_story(story_id: &str) {
    let selector = format!("[data-story=\"{story_id}\"]");
    if let Some(cover) = dom::query(&selector) {
        let _ = cover.class_list().add_1("story-cover--done");
        // Add completion star badge if not already there
        if cover.query_selector(".story-cover-badge").ok().flatten().is_none() {
            let doc = dom::document();
            let badge = doc.create_element("span").unwrap();
            let _ = badge.set_attribute("class", "story-cover-badge");
            badge.set_text_content(Some("\u{2B50}"));
            let _ = cover.append_child(&badge);
        }
    }
}
