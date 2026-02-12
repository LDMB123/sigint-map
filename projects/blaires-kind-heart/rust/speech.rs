//! SpeechSynthesis wrapper — Blaire is 4 and can't read.
//! Every text in the app should be spoken aloud.
//!
//! Voice selection strategy:
//! - Attempt to select child-friendly voices (Fiona, Victoria, Moira)
//! - Use voiceschanged listener to handle iOS async loading
//! - Fall back gracefully to system default if voices unavailable

use web_sys::{SpeechSynthesisUtterance, SpeechSynthesisVoice};
use wasm_bindgen::{JsCast, closure::Closure};
use std::cell::RefCell;
use crate::dom;

thread_local! {
    static VOICES_READY: RefCell<bool> = const { RefCell::new(false) };
    static PREFERRED_VOICE: RefCell<Option<SpeechSynthesisVoice>> = const { RefCell::new(None) };
    static LISTENER_REGISTERED: RefCell<bool> = const { RefCell::new(false) };
}

/// Initialize voice selection on first speech request.
/// Works around iOS race condition where getVoices() returns empty on first call.
pub fn init_voices() {
    // Skip if already initialized
    if VOICES_READY.with(|ready| *ready.borrow()) {
        return;
    }

    let synth = match dom::window().speech_synthesis() {
        Ok(s) => s,
        Err(_) => return,
    };

    // Check if voices already loaded
    if try_select_voice(&synth) {
        return;
    }

    // Only register voiceschanged listener once (ML-5 fix)
    let already_registered = LISTENER_REGISTERED.with(|registered| {
        if *registered.borrow() {
            true
        } else {
            *registered.borrow_mut() = true;
            false
        }
    });

    if already_registered {
        return;
    }

    // Otherwise wait for voiceschanged event
    let cb = Closure::wrap(Box::new(move |_: web_sys::Event| {
        // Short-circuit if voices already selected
        if VOICES_READY.with(|ready| *ready.borrow()) {
            return;
        }
        if let Ok(synth) = dom::window().speech_synthesis() {
            try_select_voice(&synth);
        }
    }) as Box<dyn Fn(web_sys::Event)>);

    let _ = synth.add_event_listener_with_callback(
        "voiceschanged",
        cb.as_ref().unchecked_ref(),
    );
    cb.forget();
}

/// Try to select a child-friendly voice from available voices.
/// Priority: Fiona (Australian, warm) > Victoria/Moira > en-US default > first en-US
fn try_select_voice(synth: &web_sys::SpeechSynthesis) -> bool {
    let voices = synth.get_voices();

    if voices.length() == 0 {
        return false;
    }

    let preferred_names = ["Fiona", "Victoria", "Moira"];

    // Try preferred voices first (Fiona is en-AU, Victoria/Moira may be en-IE)
    for name in &preferred_names {
        for i in 0..voices.length() {
            if let Ok(voice) = voices.get(i).dyn_into::<SpeechSynthesisVoice>() {
                if voice.name().contains(name) && voice.lang().starts_with("en") {
                    PREFERRED_VOICE.with(|v| *v.borrow_mut() = Some(voice));
                    VOICES_READY.with(|ready| *ready.borrow_mut() = true);
                    return true;
                }
            }
        }
    }

    // Fall back to en-US default
    for i in 0..voices.length() {
        if let Ok(voice) = voices.get(i).dyn_into::<SpeechSynthesisVoice>() {
            if voice.lang() == "en-US" && voice.default() {
                PREFERRED_VOICE.with(|v| *v.borrow_mut() = Some(voice));
                VOICES_READY.with(|ready| *ready.borrow_mut() = true);
                return true;
            }
        }
    }

    // Fall back to first en-US voice
    for i in 0..voices.length() {
        if let Ok(voice) = voices.get(i).dyn_into::<SpeechSynthesisVoice>() {
            if voice.lang() == "en-US" {
                PREFERRED_VOICE.with(|v| *v.borrow_mut() = Some(voice));
                VOICES_READY.with(|ready| *ready.borrow_mut() = true);
                return true;
            }
        }
    }

    false
}

/// Core speech helper — cancels previous, sets rate/pitch, fires.
/// Now with automatic child-friendly voice selection.
/// Phase 7: Enhanced error handling with console logging
fn say(text: &str, rate: f32, pitch: f32) {
    // Initialize voices on first call
    init_voices();

    let synth = match dom::window().speech_synthesis() {
        Ok(s) => s,
        Err(_) => {
            web_sys::console::warn_1(&"[speech] SpeechSynthesis API unavailable".into());
            return;
        }
    };

    synth.cancel(); // stop any previous utterance

    let utterance = match SpeechSynthesisUtterance::new_with_text(text) {
        Ok(u) => u,
        Err(e) => {
            web_sys::console::warn_1(&format!("[speech] Failed to create utterance: {:?}", e).into());
            return;
        }
    };

    utterance.set_lang("en-US");
    utterance.set_rate(rate);
    utterance.set_pitch(pitch);

    // Try to set preferred voice if available
    PREFERRED_VOICE.with(|v| {
        if let Some(ref voice) = *v.borrow() {
            utterance.set_voice(Some(voice));
        }
    });

    synth.speak(&utterance);
}

/// Speak text aloud. Fire-and-forget. Slightly slower + warmer pitch for a 4-year-old.
pub fn speak(text: &str) {
    say(text, 0.82, 1.15);  // Slightly slower + higher pitch = warmer
}

/// Narrate story text — slower for comprehension with gentle pitch.
pub fn narrate(text: &str) {
    say(text, 0.72, 1.12);  // Slower for comprehension, gentle pitch
}

/// Celebrate with enthusiastic speech (praise phrases for kind acts, stickers, etc).
pub fn celebrate(text: &str) {
    say(text, 0.88, 1.35);  // Enthusiastic but not rushed, bright pitch
}

/// Stop any in-progress speech.
pub fn stop() {
    if let Ok(synth) = dom::window().speech_synthesis() {
        synth.cancel();
    }
}
