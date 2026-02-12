//! Branching story page logic — renders text, choices, feedback.
//! View Transitions API handles page-to-page animation.
//! All paths lead to happy endings.

use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

use crate::{animations, companion, confetti, constants::SELECTOR_STORIES_BODY, db_client, dom, navigation, render, rewards, speech, story_data, synth_audio, utils, weekly_goals};

/// Open a story by ID, show page 0.
pub fn open_story(story_id: &str) {
    let Some(story) = story_data::get_story(story_id) else { return };
    render_page(story, 0);
}

/// Render a story page: illustration placeholder + text + choice buttons.
fn render_page(story: &story_data::Story, page_idx: usize) {
    let Some(page) = story.pages.get(page_idx) else { return };
    let Some(body) = dom::query(SELECTOR_STORIES_BODY) else { return };

    let doc = dom::document();
    let reader = render::create_el_with_class(&doc, "div", "story-reader");

    // Illustration — image with emoji fallback (CSS :has(img) hides emoji)
    let illus = render::create_el_with_class(&doc, "div", "story-illustration");
    illus.set_text_content(Some(page.illustration_emoji));
    if let Some(src) = page.illustration_image {
        let img = render::create_img(&doc, src, page.illustration_emoji, "");
        let _ = illus.append_child(&img);
    }
    let _ = reader.append_child(&illus);

    // Story text
    let text = render::create_el_with_class(&doc, "p", "story-text");
    text.set_text_content(Some(page.text));
    let _ = reader.append_child(&text);

    // Narrate the page text aloud (Blaire is 4 and can't read)
    speech::narrate(page.text);

    // Choices or "The End"
    if page.choices.is_empty() {
        // Story complete — award hearts, save progress, award sticker
        let feedback = render::create_el_with_class(&doc, "div", "story-feedback");
        feedback.set_text_content(Some("The End! \u{2B50} Great job being kind!"));
        animations::magic_entrance(&feedback);
        let _ = reader.append_child(&feedback);
        speech::celebrate("The End! Great job being kind!");

        // Celebration effects for story completion!
        synth_audio::fanfare();
        confetti::burst_stars();

        // Sparkle celebrates the story completion with curious delight
        companion::on_story_complete();

        // Award hearts for story completion
        rewards::award_sticker("story-complete");

        // Increment weekly goal progress for stories
        weekly_goals::increment_progress("stories", 1);

        // Save completion to stories_progress table
        let sid = story.id.to_string();
        let pidx = page_idx;
        let now = utils::now_epoch_ms();
        wasm_bindgen_futures::spawn_local(async move {
            let _ = db_client::exec(
                "INSERT INTO stories_progress (story_id, page_index, choices_json, completed, completed_at) \
                 VALUES (?1, ?2, '[]', 1, ?3) \
                 ON CONFLICT(story_id) DO UPDATE SET completed = 1, completed_at = ?3, page_index = ?2",
                vec![sid.clone(), pidx.to_string(), now.to_string()],
            ).await;

            // Award story completion badge
            let badge_id = format!("badge-story-{}", sid);
            crate::badges::award_badge(&badge_id).await;
        });

        // "More Stories" button — back to library
        let back_btn = render::create_button(&doc, "story-back-btn", "\u{1F4DA} More Stories!");
        dom::on(back_btn.unchecked_ref(), "click", move |_: Event| {
            // Dispatch a custom event — stories.rs listens for this to re-render library
            let window = dom::window();
            if let Ok(ev) = web_sys::CustomEvent::new("kindheart-story-done") {
                let _ = window.dispatch_event(&ev);
            }
        });
        let _ = reader.append_child(&back_btn);
    } else {
        let choices_div = render::create_el_with_class(&doc, "div", "story-choices");
        for choice in page.choices {
            let btn = render::create_button(&doc, "story-choice", choice.text);
            let _ = btn.set_attribute("data-next", &choice.next_page.to_string());
            let _ = btn.set_attribute("data-kind", &choice.kind_value.to_string());
            let _ = choices_div.append_child(&btn);
        }
        let _ = reader.append_child(&choices_div);

        // Bind choice clicks
        let story_id = story.id.to_string();
        dom::on(choices_div.unchecked_ref(), "click", move |event: Event| {
            let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
            let Some(el) = target else { return };
            if let Ok(Some(btn)) = el.closest("[data-next]") {
                // Play sound for making a choice
                synth_audio::tap();
                // If it's a kind choice, play chime + float heart
                if let Some(kind) = btn.get_attribute("data-kind") {
                    if kind != "0" {
                        synth_audio::chime();
                        confetti::float_emoji(".story-reader", "\u{1F49C}");
                    }
                }
                if let Some(next) = btn.get_attribute("data-next") {
                    if let Ok(next_idx) = next.parse::<usize>() {
                        if let Some(story) = story_data::get_story(&story_id) {
                            render_page(story, next_idx);
                        }
                    }
                }
            }
        });
    }

    // Swap content with View Transition
    navigation::with_view_transition(move || {
        dom::safe_set_inner_html(&body, "");
        let _ = body.append_child(&reader);
    });
}
