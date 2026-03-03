use crate::{
    adaptive_quests, animations, companion, confetti, constants::SELECTOR_QUESTS_BODY, dom, render,
    rewards, speech, state::AppState, streaks, synth_audio, theme, ui, utils, weekly_goals,
};
use std::cell::RefCell;
use std::fmt::Write;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use web_sys::{Element, Event};
struct QuestTemplate {
    emoji: &'static str,
    title: &'static str,
    desc: &'static str,
}
const QUEST_POOL: &[QuestTemplate] = &[
    QuestTemplate {
        emoji: "🌅",
        title: "Morning Hug",
        desc: "Give a big morning hug to someone you love",
    },
    QuestTemplate {
        emoji: "🧸",
        title: "Teddy Hug",
        desc: "Hug your favorite stuffed animal tight",
    },
    QuestTemplate {
        emoji: "👨‍👩‍👧",
        title: "Group Hug",
        desc: "Get everyone together for a big family hug",
    },
    QuestTemplate {
        emoji: "🐶",
        title: "Pet Hug",
        desc: "Give your pet or a stuffed animal a gentle hug",
    },
    QuestTemplate {
        emoji: "🤗",
        title: "Comfort Hug",
        desc: "Hug someone who looks sad or tired",
    },
    QuestTemplate {
        emoji: "🌙",
        title: "Goodnight Hug",
        desc: "Give everyone a goodnight hug before bed",
    },
    QuestTemplate {
        emoji: "🎉",
        title: "Celebration Hug",
        desc: "Celebrate something with a big happy hug",
    },
    QuestTemplate {
        emoji: "👪",
        title: "Family Hug",
        desc: "Hug each person in your family today",
    },
    QuestTemplate {
        emoji: "👭",
        title: "Friend Hug",
        desc: "Give your best friend a warm hug",
    },
    QuestTemplate {
        emoji: "🙏",
        title: "Thank You Hug",
        desc: "Hug someone and say thank you",
    },
    QuestTemplate {
        emoji: "🎈",
        title: "Surprise Hug",
        desc: "Surprise someone with a hug when they don't expect it",
    },
    QuestTemplate {
        emoji: "⏰",
        title: "Long Hug",
        desc: "Give someone a nice long hug that lasts to 10",
    },
    QuestTemplate {
        emoji: "🌸",
        title: "Gentle Hug",
        desc: "Give someone a super gentle soft hug",
    },
    QuestTemplate {
        emoji: "⭐",
        title: "Special Hug",
        desc: "Make up your own special hug style",
    },
    QuestTemplate {
        emoji: "🍪",
        title: "Cookie Share",
        desc: "Share a cookie or treat with someone",
    },
    QuestTemplate {
        emoji: "🧸",
        title: "Toy Share",
        desc: "Let someone play with your favorite toy",
    },
    QuestTemplate {
        emoji: "🖍️",
        title: "Art Supplies",
        desc: "Share your crayons or art supplies",
    },
    QuestTemplate {
        emoji: "📚",
        title: "Book Share",
        desc: "Share a book and read together",
    },
    QuestTemplate {
        emoji: "🍎",
        title: "Snack Share",
        desc: "Share your snack at snack time",
    },
    QuestTemplate {
        emoji: "🪑",
        title: "Space Share",
        desc: "Share your spot on the couch or chair",
    },
    QuestTemplate {
        emoji: "🎮",
        title: "Turn Share",
        desc: "Take turns nicely with a game or toy",
    },
    QuestTemplate {
        emoji: "🎲",
        title: "Game Share",
        desc: "Share a game and play together",
    },
    QuestTemplate {
        emoji: "🖊️",
        title: "Crayon Share",
        desc: "Share your favorite crayon color",
    },
    QuestTemplate {
        emoji: "⭐",
        title: "Sticker Share",
        desc: "Give someone one of your stickers",
    },
    QuestTemplate {
        emoji: "🧺",
        title: "Blanket Share",
        desc: "Share a blanket to stay cozy together",
    },
    QuestTemplate {
        emoji: "💡",
        title: "Idea Share",
        desc: "Share your ideas for what to play",
    },
    QuestTemplate {
        emoji: "⏰",
        title: "Time Share",
        desc: "Share your time to help someone",
    },
    QuestTemplate {
        emoji: "😊",
        title: "Joy Share",
        desc: "Do something to share happiness",
    },
    QuestTemplate {
        emoji: "🧹",
        title: "Clean Up",
        desc: "Help clean up without being asked",
    },
    QuestTemplate {
        emoji: "🍽️",
        title: "Set Table",
        desc: "Help put plates and cups on the table",
    },
    QuestTemplate {
        emoji: "🐕",
        title: "Feed Pet",
        desc: "Help feed a pet or water plant",
    },
    QuestTemplate {
        emoji: "🪴",
        title: "Water Plants",
        desc: "Help water the plants with a cup",
    },
    QuestTemplate {
        emoji: "🧸",
        title: "Put Away Toys",
        desc: "Put all your toys away nicely",
    },
    QuestTemplate {
        emoji: "📦",
        title: "Help Carry",
        desc: "Help carry something (not too heavy!)",
    },
    QuestTemplate {
        emoji: "🌅",
        title: "Morning Helper",
        desc: "Help with something in the morning",
    },
    QuestTemplate {
        emoji: "🛏️",
        title: "Tidy Room",
        desc: "Make your room nice and tidy",
    },
    QuestTemplate {
        emoji: "👨‍🍳",
        title: "Help Cook",
        desc: "Help in the kitchen (stir, pour, mix)",
    },
    QuestTemplate {
        emoji: "👕",
        title: "Sort Laundry",
        desc: "Help sort laundry by colors",
    },
    QuestTemplate {
        emoji: "🌻",
        title: "Garden Help",
        desc: "Help in the garden or with plants",
    },
    QuestTemplate {
        emoji: "🐾",
        title: "Pet Care",
        desc: "Help take care of a pet",
    },
    QuestTemplate {
        emoji: "👶",
        title: "Sibling Help",
        desc: "Help your sibling with something",
    },
    QuestTemplate {
        emoji: "🌙",
        title: "Bedtime Help",
        desc: "Help get ready for bedtime",
    },
    QuestTemplate {
        emoji: "🌅",
        title: "Morning Greeting",
        desc: "Say good morning nicely to everyone",
    },
    QuestTemplate {
        emoji: "🙏",
        title: "Thank You",
        desc: "Say thank you at least 3 times today",
    },
    QuestTemplate {
        emoji: "✨",
        title: "Please",
        desc: "Remember to say please when asking",
    },
    QuestTemplate {
        emoji: "💝",
        title: "Compliment",
        desc: "Say something nice about someone",
    },
    QuestTemplate {
        emoji: "👏",
        title: "Encourage",
        desc: "Tell someone 'you can do it!'",
    },
    QuestTemplate {
        emoji: "😔",
        title: "Apologize",
        desc: "Say sorry if you make a mistake",
    },
    QuestTemplate {
        emoji: "🌟",
        title: "Praise",
        desc: "Tell someone they did a good job",
    },
    QuestTemplate {
        emoji: "👋",
        title: "Kind Greeting",
        desc: "Say hello nicely to 3 people",
    },
    QuestTemplate {
        emoji: "🚪",
        title: "Excuse Me",
        desc: "Say excuse me when you need to",
    },
    QuestTemplate {
        emoji: "💙",
        title: "Sorry",
        desc: "Say sorry with your gentle voice",
    },
    QuestTemplate {
        emoji: "🎊",
        title: "Good Job",
        desc: "Tell someone good job today",
    },
    QuestTemplate {
        emoji: "💪",
        title: "You Can Do It",
        desc: "Encourage someone trying hard",
    },
    QuestTemplate {
        emoji: "❤️",
        title: "I Love You",
        desc: "Tell someone you love them",
    },
    QuestTemplate {
        emoji: "🌙",
        title: "Sweet Dreams",
        desc: "Wish someone sweet dreams tonight",
    },
    QuestTemplate {
        emoji: "💕",
        title: "Tell Love",
        desc: "Tell 3 people you love them today",
    },
    QuestTemplate {
        emoji: "💗",
        title: "Draw Heart",
        desc: "Draw hearts for people you love",
    },
    QuestTemplate {
        emoji: "💌",
        title: "Heart Note",
        desc: "Make a love note for someone",
    },
    QuestTemplate {
        emoji: "👨‍👩‍👧",
        title: "Family Time",
        desc: "Spend special time with family",
    },
    QuestTemplate {
        emoji: "😘",
        title: "Bedtime Kiss",
        desc: "Give everyone a kiss goodnight",
    },
    QuestTemplate {
        emoji: "🎵",
        title: "Love Song",
        desc: "Sing a song about love or family",
    },
    QuestTemplate {
        emoji: "🙏",
        title: "Gratitude",
        desc: "Say what you're thankful for",
    },
    QuestTemplate {
        emoji: "🌈",
        title: "Care Act",
        desc: "Do something caring for someone",
    },
    QuestTemplate {
        emoji: "🎁",
        title: "Thoughtful Gift",
        desc: "Give someone a thoughtful surprise",
    },
    QuestTemplate {
        emoji: "👂",
        title: "Listen Carefully",
        desc: "Listen really well when someone talks",
    },
    QuestTemplate {
        emoji: "🍽️",
        title: "Special Dinner",
        desc: "Help make dinnertime special",
    },
    QuestTemplate {
        emoji: "📸",
        title: "Memory Share",
        desc: "Share a happy memory with someone",
    },
    QuestTemplate {
        emoji: "🤗",
        title: "Cuddle Time",
        desc: "Snuggle with someone you love",
    },
    QuestTemplate {
        emoji: "💭",
        title: "Dream Share",
        desc: "Share your dreams or wishes",
    },
    QuestTemplate {
        emoji: "✨",
        title: "Magical Kindness",
        desc: "Do something magical and kind",
    },
    QuestTemplate {
        emoji: "😊",
        title: "Sparkle Smile",
        desc: "Give your sparkliest smile to everyone",
    },
    QuestTemplate {
        emoji: "🌈",
        title: "Rainbow Help",
        desc: "Help someone in a colorful way",
    },
    QuestTemplate {
        emoji: "⭐",
        title: "Star Share",
        desc: "Share something special like a star",
    },
    QuestTemplate {
        emoji: "🌟",
        title: "Dream Big",
        desc: "Do something brave you've been wishing for",
    },
    QuestTemplate {
        emoji: "💫",
        title: "Believe",
        desc: "Believe in yourself and be brave",
    },
    QuestTemplate {
        emoji: "🦄",
        title: "Wonder",
        desc: "Do something wonderful and surprising",
    },
    QuestTemplate {
        emoji: "🌠",
        title: "Wish Well",
        desc: "Make a wish and do a kind act",
    },
    QuestTemplate {
        emoji: "✨",
        title: "Magic Moment",
        desc: "Create a magical moment for someone",
    },
    QuestTemplate {
        emoji: "🧚",
        title: "Fairy Friend",
        desc: "Be a fairy friend and grant a wish",
    },
    QuestTemplate {
        emoji: "🪄",
        title: "Enchanted Help",
        desc: "Help someone like magic",
    },
    QuestTemplate {
        emoji: "⭐",
        title: "Starlight Share",
        desc: "Share joy like starlight",
    },
    QuestTemplate {
        emoji: "🌙",
        title: "Moon Hug",
        desc: "Give a hug under the moon (or pretend!)",
    },
    QuestTemplate {
        emoji: "💃",
        title: "Unicorn Dance",
        desc: "Dance and be silly to make someone smile",
    },
    QuestTemplate {
        emoji: "🎨",
        title: "Draw a Picture",
        desc: "Draw a picture and give it to someone",
    },
    QuestTemplate {
        emoji: "🎵",
        title: "Sing a Song",
        desc: "Sing a happy song to cheer someone up",
    },
    QuestTemplate {
        emoji: "🤝",
        title: "Play Together",
        desc: "Ask someone to play with you",
    },
    QuestTemplate {
        emoji: "😊",
        title: "Big Smile",
        desc: "Give your biggest smile to 3 people",
    },
    QuestTemplate {
        emoji: "🧡",
        title: "Be Patient",
        desc: "Wait your turn without fussing",
    },
    QuestTemplate {
        emoji: "😍",
        title: "Cheer Up",
        desc: "Try to make someone smile who looks sad",
    },
    QuestTemplate {
        emoji: "🏠",
        title: "Family Helper",
        desc: "Do something nice for someone in your family",
    },
    QuestTemplate {
        emoji: "💜",
        title: "Gentle Words",
        desc: "Use your gentle voice all morning",
    },
    QuestTemplate {
        emoji: "🎈",
        title: "Balloon Buddy",
        desc: "Pretend to give a balloon to someone who needs one",
    },
    QuestTemplate {
        emoji: "🌻",
        title: "Sunshine Act",
        desc: "Do something to brighten someone's day",
    },
    QuestTemplate {
        emoji: "🍀",
        title: "Lucky Help",
        desc: "Help someone feel lucky today",
    },
    QuestTemplate {
        emoji: "🎀",
        title: "Gift of Time",
        desc: "Give someone your time and attention",
    },
    QuestTemplate {
        emoji: "🌺",
        title: "Flower Power",
        desc: "Be as kind as a beautiful flower",
    },
    QuestTemplate {
        emoji: "🦋",
        title: "Butterfly Kind",
        desc: "Do something light and joyful",
    },
    QuestTemplate {
        emoji: "🎪",
        title: "Circus Joy",
        desc: "Be silly and fun to make someone laugh",
    },
    QuestTemplate {
        emoji: "🎭",
        title: "Drama Helper",
        desc: "Put on a little show or performance",
    },
];
fn get_did_you_know(emoji: &str) -> &'static str {
    match emoji {
        "🌅" | "🌙" | "🛏️" => "Healthy sleep helps your brain grow!",
        "🧸" | "🐶" | "🐾" | "🐕" => {
            "Animals feel love and gratitude just like we do when we are kind to them!"
        }
        "👨‍👩‍👧" | "👪" | "💃" | "🤗" | "👭" => {
            "Hugging for 20 seconds releases a happy chemical called oxytocin!"
        }
        "🍎" | "🍪" | "🍽️" | "👨‍🍳" => {
            "Sharing food has been a sign of friendship for thousands of years!"
        }
        "🌱" | "🌻" | "🪴" => {
            "Plants can feel when you are taking care of them—water helps them stretch to the sun!"
        }
        "🧹" | "🧼" | "👕" | "🧺" => {
            "Keeping your space clean helps your mind feel calm and organized!"
        }
        "🎨" | "🖍️" | "📚" => {
            "Doing art and reading builds new pathways in your imagination!"
        }
        "🙏" | "✨" | "💝" | "👏" | "🎊" => {
            "Saying kind words makes other people's hearts feel warm and safe!"
        }
        _ => "Every time you are kind, your heart grows a little bit stronger!",
    }
}
pub fn init(state: Rc<RefCell<AppState>>) {
    if let Some(body) = dom::query(SELECTOR_QUESTS_BODY) {
        dom::set_attr(&body, "aria-busy", "true");
        let doc = dom::document();
        dom::safe_set_inner_html(&body, "");
        if let Some(skeleton) = render::build_skeleton(
            &doc,
            "quests-list quest-skeleton",
            "skeleton-quest-card shimmer",
            3,
        ) {
            let _ = body.append_child(&skeleton);
        }
    }
    wasm_bindgen_futures::spawn_local(render_daily_quests(state));
}
async fn render_daily_quests(state: Rc<RefCell<AppState>>) {
    let Some(body) = dom::query(SELECTOR_QUESTS_BODY) else {
        return;
    };
    let indices = adaptive_quests::get_daily_quests_adaptive().await;
    let doc = dom::document();
    let Some(list) = render::create_el_with_class(&doc, "div", "quests-list") else {
        return;
    };
    let completed_count = state.borrow().quests_completed_today;

    // We will still display progress but we must not recreate the "Daily Quests" title.
    // Progress is now tracked silently, or we can update the existing header if one exists.
    // To keep it simple, we just omit the duplicate progress header, or append just a progress bar at the top of the body.
    let completed_pct = (completed_count as f64 / 3.0 * 100.0).min(100.0) as u32;
    if let Some(progress) = render::create_el_with_class(&doc, "div", "quests-progress") {
        let Some(progress_bar) = render::create_el_with_class(&doc, "div", "quests-progress-bar")
        else {
            return;
        };
        dom::set_attr(&progress_bar, "role", "progressbar");
        dom::set_attr(&progress_bar, "aria-valuemin", "0");
        dom::set_attr(&progress_bar, "aria-valuemax", "100");
        dom::set_attr(&progress_bar, "aria-label", "Quest progress");
        dom::with_buf(|buf| {
            let _ = write!(buf, "{completed_pct}");
            dom::set_attr(&progress_bar, "aria-valuenow", buf);
        });
        let Some(progress_fill) = render::create_el_with_class(&doc, "div", "quests-progress-fill")
        else {
            return;
        };
        let progress_scale = f64::from(completed_pct) / 100.0;
        dom::with_buf(|buf| {
            let _ = write!(buf, "--quests-progress-scale: {progress_scale:.4}");
            dom::set_attr(&progress_fill, "style", buf);
        });
        if completed_pct == 0 {
            dom::set_attr(&progress_fill, "data-progress-zero", "true");
        } else {
            dom::remove_attr(&progress_fill, "data-progress-zero");
        }
        if let Some(sparkle_marker) = render::text_el(&doc, "div", "quests-sparkle-marker", "🦄")
        {
            let _ = progress_fill.append_child(&sparkle_marker);
        }
        let _ = progress_bar.append_child(&progress_fill);

        let Some(progress_text) = dom::with_buf(|buf| {
            let _ = write!(buf, "{} / 3 Complete", completed_count);
            render::text_el(&doc, "div", "quests-progress-text", buf)
        }) else {
            return;
        };

        let _ = progress.append_child(&progress_bar);
        let _ = progress.append_child(&progress_text);
        let _ = list.append_child(&progress);
    }
    for (i, &idx) in indices.iter().enumerate() {
        let q = &QUEST_POOL[idx];
        let is_done = i < completed_count as usize;
        let did_you_know = get_did_you_know(q.emoji);
        let Some(card) = ui::quest_card(q.emoji, q.title, q.desc, did_you_know, is_done) else {
            continue;
        };
        dom::set_attr(&card, "data-quest-idx", &idx.to_string());
        if i == completed_count as usize {
            dom::set_attr(&card, "data-focus", "true");
            let _ = card.class_list().add_1("quest-card--focus");
        }
        let _ = list.append_child(&card);
    }
    dom::safe_set_inner_html(&body, "");
    let _ = body.append_child(&list);
    dom::remove_attr(&body, "aria-busy");
    let first = &QUEST_POOL[indices[0]];
    speech::speak(&format!("Today's quests! First: {}", first.title));
    let s = state.clone();
    let complete_quest = Rc::new(move |card: Element, confirmed: bool| {
        if card.class_list().contains("quest-card--done") {
            return;
        }
        if dom::get_attr(&card, "data-completing").is_some() {
            return;
        }
        if !confirmed {
            if dom::get_attr(&card, "data-confirming").is_none() {
                dom::set_attr(&card, "data-confirming", "true");
                if let Ok(Some(content)) = card.query_selector(".quest-content") {
                    let doc = dom::document();
                    if let Some(prompt) =
                        render::create_el_with_class(&doc, "div", "quest-confirm-prompt")
                    {
                        let _ = prompt.class_list().add_1("slide-down-in");
                        if let Some(btn) = dom::with_buf(|buf| {
                            let _ = write!(buf, "💖 I did it with a kind heart!");
                            render::text_el(&doc, "button", "kind-btn", buf)
                        }) {
                            let _ = prompt.append_child(&btn);
                            let _ = content.append_child(&prompt);
                        }
                    }
                }
            }
            return;
        }
        dom::set_attr(&card, "data-completing", "");
        let _ = card.class_list().add_1("quest-card--done");
        let _ = card.class_list().remove_1("quest-card--focus");
        dom::remove_attr(&card, "data-focus");
        if let Ok(Some(prompt)) = card.query_selector(".quest-confirm-prompt") {
            prompt.remove();
        }
        animations::jelly_wobble(&card);
        if let Ok(Some(check)) = card.query_selector(".quest-check") {
            let _ = check.class_list().add_1("quest-check--done");
            dom::safe_set_inner_html(&check, crate::ui::CHECK_SVG);
        }
        let mut spoken_msg = "Quest completed! ".to_string();
        if let Some(idx_str) = dom::get_attr(&card, "data-quest-idx") {
            let idx: usize = idx_str.parse().unwrap_or(0);
            if idx >= QUEST_POOL.len() {
                return;
            }
            let q = &QUEST_POOL[idx];
            let did_you_know = get_did_you_know(q.emoji);
            if let Ok(Some(content)) = card.query_selector(".quest-content") {
                if let Some(fun_el) = render::create_el_with_class(
                    &dom::document(),
                    "div",
                    "quest-did-you-know slide-down-in",
                ) {
                    dom::safe_set_inner_html(
                        &fun_el,
                        &format!("🪄 <strong>Did you know?</strong> {}", did_you_know),
                    );
                    let _ = content.append_child(&fun_el);
                }
            }
            spoken_msg.push_str(did_you_know);
            let id = utils::create_id();
            let day_key = utils::today_key();
            let now = utils::now_epoch_ms();
            let title = q.title.to_string();
            let desc = q.desc.to_string();
            let emoji = q.emoji.to_string();
            wasm_bindgen_futures::spawn_local(async move {
                let _ = crate::offline_queue::queued_exec(
                    "INSERT INTO quests (id, title, description, emoji, day_key, completed, completed_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
                    vec![id, title, desc, emoji, day_key, now.to_string()],
                )
                .await;
            });
        }
        let hearts_total = {
            let mut st = s.borrow_mut();
            st.quests_completed_today += 1;
            st.hearts_today += theme::HEARTS_PER_QUEST;
            st.hearts_total += theme::HEARTS_PER_QUEST;
            st.hearts_total
        };
        ui::update_heart_counter(hearts_total);
        crate::badges::check_ultimate_heart_spawn(hearts_total);
        let completed = s.borrow().quests_completed_today;
        if let Some(progress_fill) = dom::query(".quests-progress-fill") {
            let pct = (completed as f64 / 3.0 * 100.0).min(100.0) as u32;
            let progress_scale = f64::from(pct) / 100.0;
            dom::with_buf(|buf| {
                let _ = write!(buf, "--quests-progress-scale: {progress_scale:.4}");
                dom::set_attr(&progress_fill, "style", buf);
            });
            if pct == 0 {
                dom::set_attr(&progress_fill, "data-progress-zero", "true");
            } else {
                dom::remove_attr(&progress_fill, "data-progress-zero");
            }
        }
        if let Some(progress_text) = dom::query(".quests-progress-text") {
            dom::with_buf(|buf| {
                let _ = write!(buf, "{completed} / 3 Complete");
                progress_text.set_text_content(Some(buf));
            });
        }
        dom::announce_live(&format!(
            "Quest completed! {} of 3 quests done today",
            completed
        ));
        synth_audio::chime();
        crate::native_apis::vibrate_success();
        confetti::sparkle_kindness_aura();
        if let Some(heart_counter) = dom::query(".heart-counter") {
            let _ = heart_counter.class_list().add_1("heart-counter-fill");
            dom::delayed_class_remove(heart_counter, "heart-counter-fill", 1500);
        }
        companion::on_quest_complete();
        speech::speak(&spoken_msg);
        weekly_goals::increment_progress("quests", 1);
        weekly_goals::increment_progress("hearts", theme::HEARTS_PER_QUEST);
        streaks::record_today(s.clone());
        let completed = s.borrow().quests_completed_today;
        if completed >= 3 {
            rewards::award_sticker("quest-bonus");
            dom::toast("🌟 All quests done! Bonus sticker! 🌟");
            dom::set_timeout_once(500, || {
                synth_audio::fanfare();
                confetti::celebrate(confetti::CelebrationTier::Epic);
                speech::celebrate("You finished ALL your quests! AMAZING, Blaire!");
            });
            dom::set_timeout_once(2000, || {
                confetti::burst_party();
                synth_audio::level_up();
            });
            dom::set_timeout_once(3500, || {
                confetti::burst_unicorn();
            });
        }
    });
    let complete_click = complete_quest.clone();
    dom::on(body.unchecked_ref(), "click", move |event: Event| {
        let Some(el) = dom::event_target_element(&event) else {
            return;
        };
        if let Some(confirm_btn) = dom::closest(&el, ".quest-confirm-prompt button") {
            if let Some(card) = dom::closest(&confirm_btn, "[data-quest-idx]") {
                complete_click(card, true);
            }
            return;
        }
        if let Some(card) = dom::closest(&el, "[data-quest-idx]") {
            crate::native_apis::vibrate_tap();
            complete_click(card, false);
        }
    });
    let complete_key = complete_quest;
    let key_cb = wasm_bindgen::closure::Closure::<dyn FnMut(web_sys::KeyboardEvent)>::new(
        move |e: web_sys::KeyboardEvent| {
            let key = e.key();
            if key != "Enter" && key != " " {
                return;
            }
            let target = e.target().and_then(|t| t.dyn_into::<Element>().ok());
            let Some(el) = target else { return };
            if let Some(confirm_btn) = dom::closest(&el, ".quest-confirm-prompt button") {
                if let Some(card) = dom::closest(&confirm_btn, "[data-quest-idx]") {
                    e.prevent_default();
                    complete_key(card, true);
                }
                return;
            }
            if let Some(card) = dom::closest(&el, "[data-quest-idx]") {
                e.prevent_default();
                crate::native_apis::vibrate_tap();
                complete_key(card, false);
            }
        },
    );
    let _ = body.add_event_listener_with_callback("keydown", key_cb.as_ref().unchecked_ref());
    key_cb.forget();
}
