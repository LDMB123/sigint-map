//! Daily quests — adaptive focus quest + deterministic rotation.
//! Slot 0: Focus quest (targets skill needing practice)
//! Slots 1-2: Deterministic rotation from pool
//! SQLite tracks completion.
//! All quests are designed for a 4-year-old: no reading/writing required,
//! actions she can do independently or with minimal help.

use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

use crate::{adaptive_quests, animations, companion, confetti, constants::SELECTOR_QUESTS_BODY, dom, rewards, speech, state::AppState, streaks, synth_audio, theme, ui, utils, weekly_goals};

/// Quest template (static data, no allocation).
struct QuestTemplate {
    emoji: &'static str,
    title: &'static str,
    desc: &'static str,
}

const QUEST_POOL: &[QuestTemplate] = &[
    // CHAIN-HUG-1: Bunny Hug Week (indices 0-6)
    QuestTemplate { emoji: "🌅", title: "Morning Hug", desc: "Give a big morning hug to someone you love" },
    QuestTemplate { emoji: "🧸", title: "Teddy Hug", desc: "Hug your favorite stuffed animal tight" },
    QuestTemplate { emoji: "👨‍👩‍👧", title: "Group Hug", desc: "Get everyone together for a big family hug" },
    QuestTemplate { emoji: "🐶", title: "Pet Hug", desc: "Give your pet or a stuffed animal a gentle hug" },
    QuestTemplate { emoji: "🤗", title: "Comfort Hug", desc: "Hug someone who looks sad or tired" },
    QuestTemplate { emoji: "🌙", title: "Goodnight Hug", desc: "Give everyone a goodnight hug before bed" },
    QuestTemplate { emoji: "🎉", title: "Celebration Hug", desc: "Celebrate something with a big happy hug" },

    // CHAIN-HUG-2: Warm Hug Week (indices 7-13)
    QuestTemplate { emoji: "👪", title: "Family Hug", desc: "Hug each person in your family today" },
    QuestTemplate { emoji: "👭", title: "Friend Hug", desc: "Give your best friend a warm hug" },
    QuestTemplate { emoji: "🙏", title: "Thank You Hug", desc: "Hug someone and say thank you" },
    QuestTemplate { emoji: "🎈", title: "Surprise Hug", desc: "Surprise someone with a hug when they don't expect it" },
    QuestTemplate { emoji: "⏰", title: "Long Hug", desc: "Give someone a nice long hug that lasts to 10" },
    QuestTemplate { emoji: "🌸", title: "Gentle Hug", desc: "Give someone a super gentle soft hug" },
    QuestTemplate { emoji: "⭐", title: "Special Hug", desc: "Make up your own special hug style" },

    // CHAIN-SHARING-1: Gift Share Week (indices 14-20)
    QuestTemplate { emoji: "🍪", title: "Cookie Share", desc: "Share a cookie or treat with someone" },
    QuestTemplate { emoji: "🧸", title: "Toy Share", desc: "Let someone play with your favorite toy" },
    QuestTemplate { emoji: "🖍️", title: "Art Supplies", desc: "Share your crayons or art supplies" },
    QuestTemplate { emoji: "📚", title: "Book Share", desc: "Share a book and read together" },
    QuestTemplate { emoji: "🍎", title: "Snack Share", desc: "Share your snack at snack time" },
    QuestTemplate { emoji: "🪑", title: "Space Share", desc: "Share your spot on the couch or chair" },
    QuestTemplate { emoji: "🎮", title: "Turn Share", desc: "Take turns nicely with a game or toy" },

    // CHAIN-SHARING-2: Balloon Share Week (indices 21-27)
    QuestTemplate { emoji: "🎲", title: "Game Share", desc: "Share a game and play together" },
    QuestTemplate { emoji: "🖊️", title: "Crayon Share", desc: "Share your favorite crayon color" },
    QuestTemplate { emoji: "⭐", title: "Sticker Share", desc: "Give someone one of your stickers" },
    QuestTemplate { emoji: "🧺", title: "Blanket Share", desc: "Share a blanket to stay cozy together" },
    QuestTemplate { emoji: "💡", title: "Idea Share", desc: "Share your ideas for what to play" },
    QuestTemplate { emoji: "⏰", title: "Time Share", desc: "Share your time to help someone" },
    QuestTemplate { emoji: "😊", title: "Joy Share", desc: "Do something to share happiness" },

    // CHAIN-HELPING-1: Helper's Week (indices 28-34)
    QuestTemplate { emoji: "🧹", title: "Clean Up", desc: "Help clean up without being asked" },
    QuestTemplate { emoji: "🍽️", title: "Set Table", desc: "Help put plates and cups on the table" },
    QuestTemplate { emoji: "🐕", title: "Feed Pet", desc: "Help feed a pet or water plant" },
    QuestTemplate { emoji: "🪴", title: "Water Plants", desc: "Help water the plants with a cup" },
    QuestTemplate { emoji: "🧸", title: "Put Away Toys", desc: "Put all your toys away nicely" },
    QuestTemplate { emoji: "📦", title: "Help Carry", desc: "Help carry something (not too heavy!)" },
    QuestTemplate { emoji: "🌅", title: "Morning Helper", desc: "Help with something in the morning" },

    // CHAIN-HELPING-2: Star Helper Week (indices 35-41)
    QuestTemplate { emoji: "🛏️", title: "Tidy Room", desc: "Make your room nice and tidy" },
    QuestTemplate { emoji: "👨‍🍳", title: "Help Cook", desc: "Help in the kitchen (stir, pour, mix)" },
    QuestTemplate { emoji: "👕", title: "Sort Laundry", desc: "Help sort laundry by colors" },
    QuestTemplate { emoji: "🌻", title: "Garden Help", desc: "Help in the garden or with plants" },
    QuestTemplate { emoji: "🐾", title: "Pet Care", desc: "Help take care of a pet" },
    QuestTemplate { emoji: "👶", title: "Sibling Help", desc: "Help your sibling with something" },
    QuestTemplate { emoji: "🌙", title: "Bedtime Help", desc: "Help get ready for bedtime" },

    // CHAIN-NICE-WORDS-1: Kind Words Week (indices 42-48)
    QuestTemplate { emoji: "🌅", title: "Morning Greeting", desc: "Say good morning nicely to everyone" },
    QuestTemplate { emoji: "🙏", title: "Thank You", desc: "Say thank you at least 3 times today" },
    QuestTemplate { emoji: "✨", title: "Please", desc: "Remember to say please when asking" },
    QuestTemplate { emoji: "💝", title: "Compliment", desc: "Say something nice about someone" },
    QuestTemplate { emoji: "👏", title: "Encourage", desc: "Tell someone 'you can do it!'" },
    QuestTemplate { emoji: "😔", title: "Apologize", desc: "Say sorry if you make a mistake" },
    QuestTemplate { emoji: "🌟", title: "Praise", desc: "Tell someone they did a good job" },

    // CHAIN-NICE-WORDS-2: Magic Words Week (indices 49-55)
    QuestTemplate { emoji: "👋", title: "Kind Greeting", desc: "Say hello nicely to 3 people" },
    QuestTemplate { emoji: "🚪", title: "Excuse Me", desc: "Say excuse me when you need to" },
    QuestTemplate { emoji: "💙", title: "Sorry", desc: "Say sorry with your gentle voice" },
    QuestTemplate { emoji: "🎊", title: "Good Job", desc: "Tell someone good job today" },
    QuestTemplate { emoji: "💪", title: "You Can Do It", desc: "Encourage someone trying hard" },
    QuestTemplate { emoji: "❤️", title: "I Love You", desc: "Tell someone you love them" },
    QuestTemplate { emoji: "🌙", title: "Sweet Dreams", desc: "Wish someone sweet dreams tonight" },

    // CHAIN-LOVE-1: Heart Week (indices 56-62)
    QuestTemplate { emoji: "💕", title: "Tell Love", desc: "Tell 3 people you love them today" },
    QuestTemplate { emoji: "💗", title: "Draw Heart", desc: "Draw hearts for people you love" },
    QuestTemplate { emoji: "💌", title: "Heart Note", desc: "Make a love note for someone" },
    QuestTemplate { emoji: "👨‍👩‍👧", title: "Family Time", desc: "Spend special time with family" },
    QuestTemplate { emoji: "😘", title: "Bedtime Kiss", desc: "Give everyone a kiss goodnight" },
    QuestTemplate { emoji: "🎵", title: "Love Song", desc: "Sing a song about love or family" },
    QuestTemplate { emoji: "🙏", title: "Gratitude", desc: "Say what you're thankful for" },

    // CHAIN-LOVE-2: Rainbow Week (indices 63-69)
    QuestTemplate { emoji: "🌈", title: "Care Act", desc: "Do something caring for someone" },
    QuestTemplate { emoji: "🎁", title: "Thoughtful Gift", desc: "Give someone a thoughtful surprise" },
    QuestTemplate { emoji: "👂", title: "Listen Carefully", desc: "Listen really well when someone talks" },
    QuestTemplate { emoji: "🍽️", title: "Special Dinner", desc: "Help make dinnertime special" },
    QuestTemplate { emoji: "📸", title: "Memory Share", desc: "Share a happy memory with someone" },
    QuestTemplate { emoji: "🤗", title: "Cuddle Time", desc: "Snuggle with someone you love" },
    QuestTemplate { emoji: "💭", title: "Dream Share", desc: "Share your dreams or wishes" },

    // CHAIN-UNICORN-1: Unicorn Week (indices 70-76)
    QuestTemplate { emoji: "✨", title: "Magical Kindness", desc: "Do something magical and kind" },
    QuestTemplate { emoji: "😊", title: "Sparkle Smile", desc: "Give your sparkliest smile to everyone" },
    QuestTemplate { emoji: "🌈", title: "Rainbow Help", desc: "Help someone in a colorful way" },
    QuestTemplate { emoji: "⭐", title: "Star Share", desc: "Share something special like a star" },
    QuestTemplate { emoji: "🌟", title: "Dream Big", desc: "Do something brave you've been wishing for" },
    QuestTemplate { emoji: "💫", title: "Believe", desc: "Believe in yourself and be brave" },
    QuestTemplate { emoji: "🦄", title: "Wonder", desc: "Do something wonderful and surprising" },

    // CHAIN-UNICORN-2: Dream Week (indices 77-83)
    QuestTemplate { emoji: "🌠", title: "Wish Well", desc: "Make a wish and do a kind act" },
    QuestTemplate { emoji: "✨", title: "Magic Moment", desc: "Create a magical moment for someone" },
    QuestTemplate { emoji: "🧚", title: "Fairy Friend", desc: "Be a fairy friend and grant a wish" },
    QuestTemplate { emoji: "🪄", title: "Enchanted Help", desc: "Help someone like magic" },
    QuestTemplate { emoji: "⭐", title: "Starlight Share", desc: "Share joy like starlight" },
    QuestTemplate { emoji: "🌙", title: "Moon Hug", desc: "Give a hug under the moon (or pretend!)" },
    QuestTemplate { emoji: "💃", title: "Unicorn Dance", desc: "Dance and be silly to make someone smile" },

    // EXTRA GENERAL QUESTS (indices 84-99) - Used when no theme is active
    QuestTemplate { emoji: "🎨", title: "Draw a Picture", desc: "Draw a picture and give it to someone" },
    QuestTemplate { emoji: "🎵", title: "Sing a Song", desc: "Sing a happy song to cheer someone up" },
    QuestTemplate { emoji: "🤝", title: "Play Together", desc: "Ask someone to play with you" },
    QuestTemplate { emoji: "😊", title: "Big Smile", desc: "Give your biggest smile to 3 people" },
    QuestTemplate { emoji: "🧡", title: "Be Patient", desc: "Wait your turn without fussing" },
    QuestTemplate { emoji: "😍", title: "Cheer Up", desc: "Try to make someone smile who looks sad" },
    QuestTemplate { emoji: "🏠", title: "Family Helper", desc: "Do something nice for someone in your family" },
    QuestTemplate { emoji: "💜", title: "Gentle Words", desc: "Use your gentle voice all morning" },
    QuestTemplate { emoji: "🎈", title: "Balloon Buddy", desc: "Pretend to give a balloon to someone who needs one" },
    QuestTemplate { emoji: "🌻", title: "Sunshine Act", desc: "Do something to brighten someone's day" },
    QuestTemplate { emoji: "🍀", title: "Lucky Help", desc: "Help someone feel lucky today" },
    QuestTemplate { emoji: "🎀", title: "Gift of Time", desc: "Give someone your time and attention" },
    QuestTemplate { emoji: "🌺", title: "Flower Power", desc: "Be as kind as a beautiful flower" },
    QuestTemplate { emoji: "🦋", title: "Butterfly Kind", desc: "Do something light and joyful" },
    QuestTemplate { emoji: "🎪", title: "Circus Joy", desc: "Be silly and fun to make someone laugh" },
    QuestTemplate { emoji: "🎭", title: "Drama Helper", desc: "Put on a little show or performance" },
];

pub fn init(state: Rc<RefCell<AppState>>) {
    show_loading_skeleton();
    // Brief delay to show skeleton, then render real quests
    dom::set_timeout_once(100, move || {
        wasm_bindgen_futures::spawn_local(async move {
            render_daily_quests(state).await;
        });
    });
}

/// Show loading skeleton while quests are being fetched.
/// Creates 3 shimmer placeholder cards.
fn show_loading_skeleton() {
    let Some(body) = dom::query(SELECTOR_QUESTS_BODY) else { return };
    let doc = dom::document();

    // Clear body
    dom::safe_set_inner_html(&body, "");

    // Create skeleton list
    let list = doc.create_element("div").unwrap();
    let _ = list.set_attribute("class", "quests-list quest-skeleton");

    // 3 skeleton cards (matching quest count)
    for _ in 0..3 {
        let card = doc.create_element("div").unwrap();
        let _ = card.set_attribute("class", "skeleton-quest-card shimmer");
        let _ = list.append_child(&card);
    }

    let _ = body.append_child(&list);
}

/// Get today's quest indices: adaptive focus quest + rotation quests
async fn get_quest_indices() -> [usize; 3] {
    adaptive_quests::get_daily_quests_adaptive().await
}

async fn render_daily_quests(state: Rc<RefCell<AppState>>) {
    let Some(body) = dom::query(SELECTOR_QUESTS_BODY) else { return };
    let indices = get_quest_indices().await;
    let doc = dom::document();
    let list = doc.create_element("div").unwrap();
    let _ = list.set_attribute("class", "quests-list");

    for (i, &idx) in indices.iter().enumerate() {
        let q = &QUEST_POOL[idx];
        let card = ui::quest_card(q.emoji, q.title, q.desc, false);
        let _ = card.set_attribute("data-quest-idx", &idx.to_string());

        // Mark focus quest (slot 0) with data-focus and special class
        if i == 0 {
            let _ = card.set_attribute("data-focus", "true");
            let _ = card.class_list().add_1("quest-card--focus");
        }

        let _ = list.append_child(&card);
    }

    dom::safe_set_inner_html(&body, "");
    let _ = body.append_child(&list);

    // Speak the first quest aloud
    let first = &QUEST_POOL[indices[0]];
    speech::speak(&format!("Today's quests! First: {}", first.title));

    // Bind quest completion — click + keyboard (Enter/Space for role="button")
    let s = state.clone();
    let complete_quest = Rc::new(move |card: Element| {
        // Double-tap guard: check both CSS class and data attribute to prevent race conditions
        if card.class_list().contains("quest-card--done") { return; }
        if card.get_attribute("data-completing").is_some() { return; }
        let _ = card.set_attribute("data-completing", "");
        let _ = card.class_list().add_1("quest-card--done");
        animations::jelly_wobble(&card);
        // Update checkmark visual
        if let Ok(Some(check)) = card.query_selector(".quest-check") {
            let _ = check.class_list().add_1("quest-check--done");
            check.set_text_content(Some("\u{2713}"));
        }

        // Update state
        let hearts_total = {
            let mut st = s.borrow_mut();
            st.quests_completed_today += 1;
            st.hearts_today += theme::HEARTS_PER_QUEST;
            st.hearts_total += theme::HEARTS_PER_QUEST;
            st.hearts_total
        };
        ui::update_heart_counter(hearts_total);

        // Check Ultimate Heart badge (500 total hearts)
        wasm_bindgen_futures::spawn_local(async move {
            crate::badges::check_ultimate_heart(hearts_total).await;
        });

        // ARIA announcement for screen readers
        let completed = s.borrow().quests_completed_today;
        let hearts_earned = theme::HEARTS_PER_QUEST;
        dom::announce_live(&format!("Quest completed! {} hearts earned. {} of 3 quests done today", hearts_earned, completed));

        synth_audio::chime();
        confetti::burst_stars();
        companion::on_quest_complete();

        // SQLite write
        if let Some(idx_str) = card.get_attribute("data-quest-idx") {
            let idx: usize = idx_str.parse().unwrap_or(0);
            let q = &QUEST_POOL[idx];
            let id = utils::create_id();
            let day_key = utils::today_key();
            let now = utils::now_epoch_ms();
            let title = q.title.to_string();
            let desc = q.desc.to_string();
            let emoji = q.emoji.to_string();

            wasm_bindgen_futures::spawn_local(async move {
                let _ = crate::offline_queue::queued_exec(
                    "INSERT INTO quests (id, title, description, emoji, day_key, completed, completed_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
                    vec![id, title, desc, emoji, day_key.clone(), now.to_string()],
                ).await;

                // Dead Code Cleanup: quest_chains/weekly_themes modules removed
                // Increment quest chain progress if active chain
                //                 let week_key = crate::weekly_themes::get_week_key();
                //                 crate::quest_chains::increment_chain_progress(&week_key).await;
            });
        }

        // Increment weekly goal progress for quests and hearts
        weekly_goals::increment_progress("quests", 1);
        weekly_goals::increment_progress("hearts", theme::HEARTS_PER_QUEST);

        // Record streak activity
        streaks::record_today(s.clone());

        // All 3 quests done → EPIC CELEBRATION + bonus sticker!
        let completed = s.borrow().quests_completed_today;
        if completed >= 3 {
            confetti::celebrate(confetti::CelebrationTier::Epic);
            rewards::award_sticker("quest-bonus");
            dom::toast("\u{1F31F} All quests done! Bonus sticker! \u{1F31F}");
            speech::celebrate("WOW! You finished ALL the quests! You're AMAZING!");
        }
    });

    // Click handler (event delegation)
    let complete_click = complete_quest.clone();
    dom::on(body.unchecked_ref(), "click", move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };
        if let Ok(Some(card)) = el.closest("[data-quest-idx]") {
            complete_click(card);
        }
    });

    // Keyboard handler: Enter and Space activate role="button" elements (ARIA spec)
    let complete_key = complete_quest.clone();
    let key_cb = wasm_bindgen::closure::Closure::<dyn FnMut(web_sys::KeyboardEvent)>::new(move |e: web_sys::KeyboardEvent| {
        let key = e.key();
        if key != "Enter" && key != " " { return; }
        let target = e.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };
        if let Ok(Some(card)) = el.closest("[data-quest-idx]") {
            e.prevent_default(); // Prevent Space from scrolling
            complete_key(card);
        }
    });
    let _ = body.add_event_listener_with_callback("keydown", key_cb.as_ref().unchecked_ref());
    key_cb.forget();
}
