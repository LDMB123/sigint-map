//! Sparkle the Unicorn — Blaire's animated companion.
//! Lives in a fixed-position div, reacts to kind acts with bounces + speech.
//! Expression system: idle, happy, excited, sleepy, cheering, dancing.
//! Random idle behaviors every 15-30s. Typewriter speech bubbles.

use web_sys::Element;

use crate::{animations, browser_apis, confetti, dom, speech, state, synth_audio};

const IDLE_PHRASES: &[&str] = &[
    "Hi Blaire!",
    "You're so kind!",
    "I love you!",
    "Let's be kind today!",
    "You're my best friend!",
    "Sparkle loves you!",
    "What kindness shall we do?",
    "You make me smile!",
    "Ready for an adventure?",
];

const CELEBRATE_PHRASES: &[&str] = &[
    "Yay Blaire! That was so kind!",
    "Wow! You're amazing!",
    "I'm so proud of you!",
    "That made someone happy!",
    "You're a kindness superstar!",
    "Sparkle is so happy!",
    "Your heart is so big!",
    "That was wonderful Blaire!",
    "You're spreading so much love!",
    "The world is better because of you!",
    "Sparkle is doing a happy dance!",
    "That was the kindest thing ever!",
];

const QUEST_PHRASES: &[&str] = &[
    "You did it! Quest complete!",
    "Amazing! Another quest done!",
    "Sparkle knew you could do it!",
];

const STICKER_PHRASES: &[&str] = &[
    "Ooh! A new sticker! So pretty!",
    "Look at that beautiful sticker!",
    "Your collection is growing!",
];

// Story completion phrases
const STORY_PHRASES: &[&str] = &[
    "What a great story!",
    "I love that story!",
    "Stories are magical!",
];

// Game completion phrases
const GAME_PHRASES: &[&str] = &[
    "Great job!",
    "You did it!",
    "That was so fun!",
];

// First act of day phrases
const FIRST_ACT_PHRASES: &[&str] = &[
    "WOW! First kind act today! The day is starting AMAZING!",
    "YES! The kindness streak begins!",
    "First kindness of the day! You're incredible!",
];

// Idle expressions with their CSS class, sound, and duration (ms)
const IDLE_BEHAVIORS: &[(&str, &str)] = &[
    ("companion--excited", "Ooh!"),
    ("companion--dancing", "La la la!"),
    ("companion--sleepy", "*yawn*"),
    ("companion--cheering", "Go Blaire!"),
    ("companion--happy", "Hee hee!"),
    ("companion--surprised", "Wow!"),
    ("companion--proud", "I'm so proud!"),
    ("companion--silly", "Hee hee hee!"),
    ("companion--curious", "Ooh, interesting!"),
    ("companion--loving", "💖"),
    ("companion--thinking", "Hmm..."),
    ("companion--celebrating", "Hooray!"),
];

/// Pick a pseudo-random phrase from a list using current time.
fn pick_phrase<'a>(phrases: &'a [&'a str]) -> &'a str {
    let idx = (browser_apis::now_ms() as usize) % phrases.len();
    phrases[idx]
}

/// Pick a pseudo-random index 0..n using a mix of time + offset.
fn pick_index(n: usize, salt: u32) -> usize {
    ((browser_apis::now_ms() as u64).wrapping_add(salt as u64) as usize) % n
}

/// Set up the companion div on boot with idle float + glow breathe animations.
/// Renders sparkle-unicorn image with emoji fallback (CSS :has(img) hides emoji).
/// Starts the idle expression loop.
pub fn init() {
    // Phase 2.4: Cache-first pattern with fallback
    let companion = state::get_cached_companion()
        .or_else(|| dom::query("[data-companion]"));

    if let Some(el) = companion {
        el.set_text_content(Some("\u{1F984}")); // unicorn emoji fallback during async load
        let _ = el.set_attribute("aria-label", "Sparkle the Unicorn");
        let _ = el.set_attribute("role", "img");

        // Track init render to prevent race with user interactions
        thread_local! {
            static PENDING_RENDER_ABORT: std::cell::RefCell<Option<web_sys::AbortController>> = const { std::cell::RefCell::new(None) };
        }

        // Abort previous render if exists
        PENDING_RENDER_ABORT.with(|cell| {
            if let Some(controller) = cell.borrow().as_ref() {
                controller.abort();
            }
        });

        // Create new AbortController for this render
        let abort_controller = web_sys::AbortController::new().ok();
        let signal = abort_controller.as_ref().map(|c| c.signal());

        // Store controller to enable abort on next request
        PENDING_RENDER_ABORT.with(|cell| {
            *cell.borrow_mut() = abort_controller;
        });

        // Query active skin from DB and render appropriate WebP asset
        wasm_bindgen_futures::spawn_local(async move {
            let skin_id = crate::companion_skins::get_active_skin().await
                .unwrap_or_else(|| "default".to_string());

            // Check if aborted (user interaction took precedence)
            if signal.as_ref().is_some_and(|s| s.aborted()) {
                return;
            }

            render_companion_with_skin(&skin_id, "happy");

            // Clear controller after successful render
            PENDING_RENDER_ABORT.with(|cell| *cell.borrow_mut() = None);
        });

        // Add idle floating animation + ambient glow
        let _ = el.class_list().add_1("companion--idle");
        let _ = el.class_list().add_1("glow-breathe");
    }

    // Start idle expression loop
    start_idle_loop();
}

/// Render companion image based on active skin and expression.
/// Falls back to emoji if WebP asset fails to load.
/// 
/// # Arguments
/// * `skin_id` - Skin identifier (e.g., "default", "unicorn", "rainbow")
/// * `expression` - Expression type: "happy", "celebrating", or "proud"
pub fn render_companion_with_skin(skin_id: &str, expression: &str) {
    use wasm_bindgen::JsCast;

    // Phase 2.4: Cache-first pattern with fallback
    let companion = state::get_cached_companion()
        .or_else(|| dom::query("[data-companion]"));

    let Some(companion_el) = companion else { return };
    
    // Get skin definition from companion_skins module
    let skin = crate::companion_skins::SKINS.iter()
        .find(|s| s.id == skin_id)
        .unwrap_or(&crate::companion_skins::SKINS[0]); // Fallback to default

    // Map expression category to specific expression name
    let expression_name = match expression {
        "happy" | "idle" | "excited" | "silly" | "curious" => "happy",
        "celebrating" | "cheering" | "dancing" => "celebrate",
        "proud" | "loving" | "encourage" => "encourage",
        _ => "happy", // Default to happy for unmapped expressions
    };

    // Get asset path from manifest
    let asset_path = skin.get_asset(expression_name)
        .unwrap_or("assets/companions/default_happy.webp"); // Emergency fallback
    
    // Clear existing image
    if let Some(old_img) = companion_el.query_selector("img").ok().flatten() {
        old_img.remove();
    }
    
    // Render new WebP image
    let doc = dom::document();
    let img = crate::render::create_img(&doc, asset_path, "Sparkle the Unicorn", "");
    let _ = img.set_attribute("width", "256");
    let _ = img.set_attribute("height", "256");
    
    // Add error fallback to emoji if asset fails to load
    if let Ok(html_img) = img.clone().dyn_into::<web_sys::HtmlImageElement>() {
        let companion_clone = companion_el.clone();
        // Use Closure::once_into_js() to avoid WASM memory leak
        // This transfers ownership to JS, no forget() needed
        let error_closure = wasm_bindgen::closure::Closure::once_into_js(move || {
            companion_clone.set_text_content(Some("\u{1F984}"));
        });
        html_img.set_onerror(Some(error_closure.as_ref().unchecked_ref()));
    }
    
    let _ = companion_el.append_child(&img);
}

/// React to a kind act — bounce + confetti hearts + speak.
pub fn on_kind_act() {
    let phrase = pick_phrase(CELEBRATE_PHRASES);
    set_expression("companion--excited");
    react(phrase);
    confetti::float_emoji("[data-companion]", "\u{1F49C}");
}

/// React to quest completion — bounce + stars + speak.
pub fn on_quest_complete() {
    let phrase = pick_phrase(QUEST_PHRASES);
    set_expression("companion--cheering");
    react(phrase);
    confetti::float_emoji("[data-companion]", "\u{2B50}");
}

/// React to earning a sticker — bounce + unicorn confetti + speak.
pub fn on_sticker_earned() {
    let phrase = pick_phrase(STICKER_PHRASES);
    set_expression("companion--dancing");
    react(phrase);
    confetti::float_emoji("[data-companion]", "\u{1F984}");
    synth_audio::gentle();
}

/// React to reflection completion — gentle praise.
pub fn celebrate_reflection() {
    let phrases = &[
        "Thank you for sharing!",
        "I love learning about kindness!",
        "That's so thoughtful!",
        "You're helping me understand!",
    ];
    let phrase = pick_phrase(phrases);
    set_expression("companion--happy");

    // Phase 2.4: Cache-first pattern with fallback
    let companion = state::get_cached_companion()
        .or_else(|| dom::query("[data-companion]"));

    if let Some(el) = companion {
        show_bubble_typewriter(&el, phrase);
    }
    speech::speak(phrase);
}

/// React to story completion — curious and engaged.
pub fn on_story_complete() {
    let phrase = pick_phrase(STORY_PHRASES);
    set_expression("companion--curious");
    react(phrase);
    confetti::float_emoji("[data-companion]", "\u{1F4D6}"); // 📖 book emoji
}

/// React to game completion — excited celebration.
pub fn on_game_complete() {
    let phrase = pick_phrase(GAME_PHRASES);
    set_expression("companion--silly");
    react(phrase);
    confetti::float_emoji("[data-companion]", "\u{1F389}"); // 🎉 party emoji
    synth_audio::chime();
}

/// Celebrate the first kind act of the day — MEGA excitement!
pub fn celebrate_first_act_today() {
    let phrase = pick_phrase(FIRST_ACT_PHRASES);
    set_expression("companion--celebrating");
    react(phrase);
    confetti::float_emoji("[data-companion]", "\u{2B50}"); // ⭐ star emoji
}

/// Idle greeting when app opens.
pub fn greet() {
    let phrase = pick_phrase(IDLE_PHRASES);

    // Phase 2.4: Cache-first pattern with fallback
    let companion = state::get_cached_companion()
        .or_else(|| dom::query("[data-companion]"));

    if let Some(el) = companion {
        show_bubble_typewriter(&el, phrase);
    }
    speech::speak(phrase);
}

fn react(phrase: &str) {
    // Phase 2.4: Cache-first pattern with fallback
    let companion = state::get_cached_companion()
        .or_else(|| dom::query("[data-companion]"));

    if let Some(el) = companion {
        animations::bounce(&el);
        show_bubble_typewriter(&el, phrase);
    }
    speech::celebrate(phrase);
}

// ── Expression system ───────────────────────────────────────────

const EXPRESSION_CLASSES: &[&str] = &[
    "companion--idle",
    "companion--happy",
    "companion--excited",
    "companion--sleepy",
    "companion--cheering",
    "companion--dancing",
    "companion--surprised",
    "companion--proud",
    "companion--silly",
    "companion--curious",
    "companion--loving",
    "companion--thinking",
    "companion--celebrating",
];

/// Set Sparkle's current expression by toggling CSS classes.
/// Auto-reverts to idle after 4s.
fn set_expression(class: &'static str) {
    // Phase 2.4: Cache-first pattern with fallback
    let companion = state::get_cached_companion()
        .or_else(|| dom::query("[data-companion]"));

    if let Some(el) = companion {
        // Remove all expression classes
        for &c in EXPRESSION_CLASSES {
            let _ = el.class_list().remove_1(c);
        }
        let _ = el.class_list().add_1(class);
        
        // Track latest render request to prevent race conditions using AbortController
        thread_local! {
            static EXPRESSION_RENDER_ABORT: std::cell::RefCell<Option<web_sys::AbortController>> = const { std::cell::RefCell::new(None) };
        }

        // Abort previous expression render if exists
        EXPRESSION_RENDER_ABORT.with(|cell| {
            if let Some(controller) = cell.borrow().as_ref() {
                controller.abort();
            }
        });

        // Create new AbortController for this expression render
        let abort_controller = web_sys::AbortController::new().ok();
        let signal = abort_controller.as_ref().map(|c| c.signal());

        // Store controller to enable abort on next request
        EXPRESSION_RENDER_ABORT.with(|cell| {
            *cell.borrow_mut() = abort_controller;
        });

        // Update companion asset based on expression
        wasm_bindgen_futures::spawn_local(async move {
            let skin_id = crate::companion_skins::get_active_skin().await
                .unwrap_or_else(|| "default".to_string());

            // Check if aborted
            if signal.as_ref().is_some_and(|s| s.aborted()) {
                return;
            }

            // Map expression class to asset type
            let expression = match class {
                "companion--celebrating" | "companion--cheering" | "companion--dancing" => "celebrating",
                "companion--proud" | "companion--loving" => "proud",
                _ => "happy",
            };

            render_companion_with_skin(&skin_id, expression);

            // Clear controller after successful render
            EXPRESSION_RENDER_ABORT.with(|cell| *cell.borrow_mut() = None);
        });

        // Revert to idle after 4s
        dom::set_timeout_once(4000, move || {
            // Phase 2.4: Cache-first pattern with fallback
            let companion = state::get_cached_companion()
                .or_else(|| dom::query("[data-companion]"));

            if let Some(el) = companion {
                let _ = el.class_list().remove_1(class);
                let _ = el.class_list().add_1("companion--idle");

                // Abort any pending expression render before reverting
                EXPRESSION_RENDER_ABORT.with(|cell| {
                    if let Some(controller) = cell.borrow().as_ref() {
                        controller.abort();
                    }
                });

                // Create new AbortController for revert render
                let revert_abort = web_sys::AbortController::new().ok();
                let revert_signal = revert_abort.as_ref().map(|c| c.signal());

                EXPRESSION_RENDER_ABORT.with(|cell| {
                    *cell.borrow_mut() = revert_abort;
                });

                wasm_bindgen_futures::spawn_local(async move {
                    let skin_id = crate::companion_skins::get_active_skin().await
                        .unwrap_or_else(|| "default".to_string());

                    // Check if aborted
                    if revert_signal.as_ref().is_some_and(|s| s.aborted()) {
                        return;
                    }

                    render_companion_with_skin(&skin_id, "happy");
                    EXPRESSION_RENDER_ABORT.with(|cell| *cell.borrow_mut() = None);
                });
            }
        });
    }
}

// ── Idle expression loop ────────────────────────────────────────

/// Every 15-30s, Sparkle does a spontaneous idle reaction.
fn start_idle_loop() {
    wasm_bindgen_futures::spawn_local(async {
        loop {
            // Wait 15-30s (pseudo-random interval)
            let wait = 15000 + (pick_index(15000, 7919) as i32);
            browser_apis::sleep_ms(wait).await;

            // Only do idle behavior if on the home panel
            let on_home = dom::query("[data-panel='home']:not([hidden])")
                .is_some();
            if !on_home { continue; }

            // Pick a random behavior
            let idx = pick_index(IDLE_BEHAVIORS.len(), 3571);
            let (class, phrase) = IDLE_BEHAVIORS[idx];

            set_expression(class);

            // Phase 2.4: Cache-first pattern with fallback
            let companion = state::get_cached_companion()
                .or_else(|| dom::query("[data-companion]"));

            if let Some(el) = companion {
                show_bubble_typewriter(&el, phrase);
            }

            // Play a subtle sound for some expressions
            match class {
                "companion--dancing" => synth_audio::giggle(),
                "companion--sleepy" => synth_audio::dreamy(),
                "companion--excited" => synth_audio::magic_wand(),
                "companion--cheering" => synth_audio::chime(),
                _ => {}
            }
        }
    });
}

// ── Typewriter speech bubble ────────────────────────────────────

/// Show a speech bubble with typewriter text reveal, auto-dismiss after 3s.
fn show_bubble_typewriter(companion: &Element, text: &str) {
    // Remove existing bubble
    if let Some(old) = dom::query("[data-companion-bubble]") {
        old.remove();
    }

    let doc = dom::document();
    let bubble = doc.create_element("div").unwrap();
    let _ = bubble.set_attribute("class", "companion-bubble");
    let _ = bubble.set_attribute("data-companion-bubble", "");
    let _ = bubble.set_attribute("aria-live", "polite");
    // Start empty — typewriter fills it
    bubble.set_text_content(Some(""));

    let _ = companion.append_child(&bubble);

    // Phase 1.4: Typewriter effect — cache element before loop (save 5-15ms per phrase)
    let full_text = text.to_string();
    wasm_bindgen_futures::spawn_local(async move {
        // Cache bubble element once before loop
        let bubble_el = dom::query("[data-companion-bubble]");
        if bubble_el.is_none() {
            return; // bubble removed before typewriter started
        }

        let chars: Vec<char> = full_text.chars().collect();
        let mut shown = String::new();
        for ch in &chars {
            shown.push(*ch);
            if let Some(ref b) = bubble_el {
                b.set_text_content(Some(&shown));
            } else {
                return; // bubble removed externally
            }
            // 40ms per char — fast enough to feel snappy, slow enough to see
            browser_apis::sleep_ms(40).await;
        }

        // Hold for 3s then dismiss
        browser_apis::sleep_ms(3000).await;
        if let Some(ref b) = bubble_el {
            b.remove();
        }
    });
}
