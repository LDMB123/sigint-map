use crate::{
    animations, constants::SELECTOR_STORIES_BODY, dom, navigation, render, stories_store, story_data,
    story_engine, ui,
};
use wasm_bindgen::JsCast;
use web_sys::Event;
pub fn init() {
    if let Some(body) = dom::query(SELECTOR_STORIES_BODY) {
        dom::set_attr(&body, "aria-busy", "true");
    }
    crate::browser_apis::spawn_local_logged("stories-init", async {
        render_library_async().await;
        Ok(())
    });
    bind_story_clicks();
    bind_story_done_event();
}
fn bind_story_done_event() {
    let window = dom::window();
    dom::on(
        window.unchecked_ref(),
        "kindheart-story-done",
        move |_: Event| {
            crate::browser_apis::spawn_local_logged("stories-refresh", async {
                render_library_async().await;
                Ok(())
            });
        },
    );
}
async fn render_library_async() {
    let mut completed: Vec<String> = Vec::new();
    if let Ok(rows) = stories_store::fetch_completed_story_ids().await
    {
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
    let Some(body) = dom::query(SELECTOR_STORIES_BODY) else {
        return;
    };
    dom::remove_attr(&body, "aria-busy");
    let doc = dom::document();
    let Some(grid) = render::create_el_with_class(&doc, "div", "story-library") else {
        return;
    };
    for story in story_data::ALL_STORIES {
        let done = completed_ids.iter().any(|id| id == story.id);
        let Some(cover) = ui::story_cover(
            story.title,
            done,
            story.cover_emoji,
            story.cover_color,
            story.cover_image,
        ) else {
            continue;
        };
        for (k, v) in [
            ("data-story", story.id),
            ("role", "button"),
            ("tabindex", "0"),
            ("aria-label", story.title),
        ] {
            dom::set_attr(&cover, k, v);
        }
        let _ = grid.append_child(&cover);
    }
    dom::safe_set_inner_html(&body, "");
    let _ = body.append_child(&grid);
}
fn bind_story_clicks() {
    if let Some(body) = dom::query(SELECTOR_STORIES_BODY) {
        dom::on(body.unchecked_ref(), "click", move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if let Some(cover) = dom::closest(&el, "[data-story]") {
                if let Some(story_id) = dom::get_attr(&cover, "data-story") {
                    crate::native_apis::vibrate_tap();
                    animations::jelly_wobble(&cover);
                    story_engine::open_story(&story_id);
                }
            }
        });
    }
}
pub fn hydrate_completed_story(story_id: &str) {
    let cover = dom::query_data("story", story_id);
    if let Some(cover) = cover {
        let _ = cover.class_list().add_1("story-cover--done");
        if dom::query_in(&cover, ".story-cover-badge").is_none() {
            let doc = dom::document();
            render::append_text(&doc, &cover, "span", "story-cover-badge", "\u{2B50}");
        }
    }
}
