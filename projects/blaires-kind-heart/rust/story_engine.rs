use crate::{
    animations, companion, confetti, constants::SELECTOR_STORIES_BODY, db_client, dom, navigation,
    render, rewards, speech, story_data, synth_audio, utils, weekly_goals,
};
use std::fmt::Write;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event, SpeechSynthesisEvent, SpeechSynthesisUtterance};
pub fn open_story(story_id: &str) {
    let Some(story) = story_data::get_story(story_id) else {
        return;
    };
    render_page(story, 0);
}
fn render_page(story: &story_data::Story, page_idx: usize) {
    let Some(page) = story.pages.get(page_idx) else {
        return;
    };
    let Some(body) = dom::query(SELECTOR_STORIES_BODY) else {
        return;
    };
    let doc = dom::document();
    let Some(reader) = render::create_el_with_class(&doc, "div", "story-reader") else {
        return;
    };
    let Some(illus) = render::text_el(&doc, "div", "story-illustration", page.illustration_emoji)
    else {
        return;
    };
    if let Some(src) = page.illustration_image {
        if let Some(img) = render::create_img(&doc, src, page.illustration_emoji, "") {
            let _ = illus.append_child(&img);
        }
    }
    let _ = reader.append_child(&illus);
    // Page progress dots
    if let Some(progress) = render::create_el_with_class(&doc, "div", "story-progress") {
        for i in 0..story.pages.len() {
            let cls = if i == page_idx {
                "story-progress-dot story-progress-dot--active"
            } else {
                "story-progress-dot"
            };
            if let Some(dot) = render::create_el_with_class(&doc, "span", cls) {
                let _ = progress.append_child(&dot);
            }
        }
        let _ = reader.append_child(&progress);
    }
    let Some(text_el) = render::create_el_with_class(&doc, "p", "story-text") else {
        return;
    };
    let _ = reader.append_child(&text_el);
    start_karaoke(page.text, &text_el);
    let Some(replay_btn) = render::create_button(&doc, "story-replay-btn", "\u{1F50A} Read Again")
    else {
        return;
    };
    let replay_text = page.text.to_string();
    let replay_container = text_el;
    dom::on(replay_btn.unchecked_ref(), "click", move |_: Event| {
        synth_audio::tap();
        start_karaoke(&replay_text, &replay_container);
    });
    let _ = reader.append_child(&replay_btn);
    if page.choices.is_empty() {
        if let Some(feedback) = render::text_el(
            &doc,
            "div",
            "story-feedback",
            "The End! \u{2B50} Great job being kind!",
        ) {
            animations::magic_entrance(&feedback);
            let _ = reader.append_child(&feedback);
        }
        speech::celebrate("The End! Great job being kind!");
        synth_audio::fanfare();
        confetti::burst_stars();
        companion::on_story_complete();
        rewards::award_sticker("story-complete");
        weekly_goals::increment_progress("stories", 1);
        let sid = story.id.to_string();
        let pidx = page_idx;
        let now = utils::now_epoch_ms();
        wasm_bindgen_futures::spawn_local(async move {
            let _ = db_client::exec( "INSERT INTO stories_progress (story_id, page_index, choices_json, completed, completed_at) \
                 VALUES (?1, ?2, '[]', 1, ?3) \
                 ON CONFLICT(story_id) DO UPDATE SET completed = 1, completed_at = ?3, page_index = ?2",
                vec![sid.clone(), pidx.to_string(), now.to_string()],).await;
            let badge_id = format!("badge-story-{sid}");
            crate::badges::award_badge(&badge_id).await;
        });
        if let Some(back_btn) =
            render::create_button(&doc, "story-back-btn", "\u{1F4DA} More Stories!")
        {
            dom::on(back_btn.unchecked_ref(), "click", move |_: Event| {
                let window = dom::window();
                if let Ok(ev) = web_sys::CustomEvent::new("kindheart-story-done") {
                    let _ = window.dispatch_event(&ev);
                }
            });
            let _ = reader.append_child(&back_btn);
        }
    } else {
        let Some(choices_div) = render::create_el_with_class(&doc, "div", "story-choices") else {
            return;
        };
        for choice in page.choices {
            let Some(btn) = render::create_button(&doc, "story-choice", choice.text) else {
                continue;
            };
            dom::set_attr(&btn, "data-next", &choice.next_page.to_string());
            dom::set_attr(&btn, "data-kind", &choice.kind_value.to_string());
            let _ = choices_div.append_child(&btn);
        }
        let _ = reader.append_child(&choices_div);
        let story_id = story.id.to_string();
        dom::on(choices_div.unchecked_ref(), "click", move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if let Some(btn) = dom::closest(&el, "[data-next]") {
                synth_audio::tap();
                let _ = btn.class_list().add_1("story-choice--selected");
                if let Some(kind) = dom::get_attr(&btn, "data-kind") {
                    if kind != "0" {
                        synth_audio::chime();
                        confetti::float_emoji(".story-reader", "\u{1F49C}");
                    }
                }
                let next_attr = dom::get_attr(&btn, "data-next");
                let sid = story_id.clone();
                dom::set_timeout_once(350, move || {
                    if let Some(next) = next_attr {
                        if let Ok(next_idx) = next.parse::<usize>() {
                            if let Some(story) = story_data::get_story(&sid) {
                                render_page(story, next_idx);
                            }
                        }
                    }
                });
            }
        });
    }

    // Add floating exit button
    if let Some(exit_btn) = render::create_button(&doc, "floating-back-btn", "⬅️") {
        dom::set_attr(&exit_btn, "aria-label", "Exit Story");
        dom::on(exit_btn.unchecked_ref(), "click", |_| {
            crate::synth_audio::tap();
            crate::speech::stop();
            let window = dom::window();
            if let Ok(ev) = web_sys::CustomEvent::new("kindheart-story-done") {
                let _ = window.dispatch_event(&ev);
            }
        });
        let _ = reader.append_child(&exit_btn);
    }

    navigation::with_view_transition(move || {
        dom::safe_set_inner_html(&body, "");
        let _ = body.append_child(&reader);
    });
}
fn wrap_words_in_spans(text: &str, container: &Element) {
    dom::safe_set_inner_html(container, "");
    let doc = dom::document();
    for (i, word) in text.split_whitespace().enumerate() {
        let Some(span) = render::create_el_with_class(&doc, "span", "story-word") else {
            continue;
        };
        dom::with_buf(|buf| {
            let _ = write!(buf, "{i}");
            dom::set_attr(&span, "data-word-index", buf);
        });
        dom::with_buf(|buf| {
            buf.push_str(word);
            buf.push(' ');
            span.set_text_content(Some(buf));
        });
        let _ = container.append_child(&span);
    }
}
pub fn start_karaoke(text: &str, container: &Element) {
    speech::stop();
    wrap_words_in_spans(text, container);
    // Build char ranges with single-pass scan (handles repeated words correctly)
    let mut char_ranges: Vec<(usize, usize)> = Vec::new();
    let mut in_word = false;
    let mut word_start = 0usize;
    for (i, ch) in text.char_indices() {
        if ch.is_whitespace() {
            if in_word {
                char_ranges.push((word_start, i));
                in_word = false;
            }
        } else if !in_word {
            word_start = i;
            in_word = true;
        }
    }
    if in_word {
        char_ranges.push((word_start, text.len()));
    }
    let Ok(utterance) = SpeechSynthesisUtterance::new_with_text(text) else {
        return;
    };
    // Use shared constants + preferred voice from speech module
    utterance.set_rate(speech::NARRATE_RATE);
    utterance.set_pitch(speech::NARRATE_PITCH);
    speech::apply_voice(&utterance);
    let container_clone = container.clone();
    let ranges = char_ranges.clone();
    let prev_word = std::cell::Cell::new(usize::MAX); // track previous to avoid full re-scan
    let on_boundary =
        Closure::<dyn FnMut(SpeechSynthesisEvent)>::new(move |evt: SpeechSynthesisEvent| {
            let char_idx = evt.char_index() as usize;
            let Some(word_idx) = ranges
                .iter()
                .position(|&(s, e)| char_idx >= s && char_idx < e)
            else {
                return;
            };
            let prev = prev_word.get();
            if prev == word_idx {
                return;
            } // same word, skip
              // Only touch changed elements: mark previous active as done, set new active
            if prev != usize::MAX {
                if let Some(el) =
                    dom::query_child_data(&container_clone, "word-index", &prev.to_string())
                {
                    let _ = el.class_list().remove_1("story-word--active");
                    let _ = el.class_list().add_1("story-word--done");
                }
            }
            if let Some(el) =
                dom::query_child_data(&container_clone, "word-index", &word_idx.to_string())
            {
                let _ = el.class_list().add_1("story-word--active");
            }
            prev_word.set(word_idx);
        });
    utterance.set_onboundary(Some(on_boundary.as_ref().unchecked_ref()));
    on_boundary.forget();
    let container_end = container.clone();
    let on_end = Closure::<dyn FnMut(Event)>::new(move |_: Event| {
        if let Ok(spans) = container_end.query_selector_all(".story-word") {
            for i in 0..spans.length() {
                if let Some(node) = spans.get(i) {
                    if let Ok(el) = node.dyn_into::<Element>() {
                        let _ = el.class_list().remove_1("story-word--active");
                        let _ = el.class_list().add_1("story-word--done");
                    }
                }
            }
        }
    });
    utterance.set_onend(Some(on_end.as_ref().unchecked_ref()));
    on_end.forget();
    if let Ok(synth) = dom::window().speech_synthesis() {
        synth.speak(&utterance);
    }
}
