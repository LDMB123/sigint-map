use crate::dom;
use std::cell::{Cell, RefCell};
use wasm_bindgen::{closure::Closure, JsCast};
use web_sys::{SpeechSynthesisUtterance, SpeechSynthesisVoice};
thread_local! {
    static VOICES_READY: Cell<bool> = const { Cell::new(false) };
    static PREFERRED_VOICE: RefCell<Option<SpeechSynthesisVoice>> = const { RefCell::new(None) };
    static LISTENER_REGISTERED: Cell<bool> = const { Cell::new(false) };
    static SPEECH_ERROR_COUNT: Cell<u32> = const { Cell::new(0) };
}
fn init_voices() {
    if VOICES_READY.with(Cell::get) {
        return;
    }
    let Ok(synth) = dom::window().speech_synthesis() else {
        return;
    };
    if try_select_voice(&synth) {
        return;
    }
    if LISTENER_REGISTERED.with(|r| r.replace(true)) {
        return;
    }
    let cb = Closure::wrap(Box::new(move |_: web_sys::Event| {
        if VOICES_READY.with(Cell::get) {
            return;
        }
        if let Ok(synth) = dom::window().speech_synthesis() {
            try_select_voice(&synth);
        }
    }) as Box<dyn Fn(web_sys::Event)>);
    let _ = synth.add_event_listener_with_callback("voiceschanged", cb.as_ref().unchecked_ref());
    cb.forget();
}
fn store_voice(voice: SpeechSynthesisVoice) -> bool {
    PREFERRED_VOICE.with(|v| *v.borrow_mut() = Some(voice));
    VOICES_READY.with(|r| r.set(true));
    true
}
fn voice_iter(voices: &js_sys::Array) -> impl Iterator<Item = SpeechSynthesisVoice> + '_ {
    (0..voices.length()).filter_map(|i| voices.get(i).dyn_into::<SpeechSynthesisVoice>().ok())
}
fn try_select_voice(synth: &web_sys::SpeechSynthesis) -> bool {
    let voices = synth.get_voices();
    if voices.length() == 0 {
        return false;
    }
    for name in &["Fiona", "Victoria", "Moira"] {
        if let Some(v) =
            voice_iter(&voices).find(|v| v.name().contains(name) && v.lang().starts_with("en"))
        {
            return store_voice(v);
        }
    }
    if let Some(v) = voice_iter(&voices).find(|v| v.lang() == "en-US" && v.default()) {
        return store_voice(v);
    }
    if let Some(v) = voice_iter(&voices).find(|v| v.lang() == "en-US") {
        return store_voice(v);
    }
    false
}
fn say(text: &str, rate: f32, pitch: f32) {
    init_voices();
    let Ok(synth) = dom::window().speech_synthesis() else {
        dom::warn("[speech] SpeechSynthesis API unavailable");
        return;
    };
    synth.cancel();
    let utterance = match SpeechSynthesisUtterance::new_with_text(text) {
        Ok(u) => u,
        Err(e) => {
            dom::warn(&format!("[speech] Failed to create utterance: {e:?}"));
            return;
        }
    };
    utterance.set_lang("en-US");
    utterance.set_rate(rate);
    utterance.set_pitch(pitch);
    PREFERRED_VOICE.with(|v| {
        if let Some(ref voice) = *v.borrow() {
            utterance.set_voice(Some(voice));
        }
    });
    let on_error = Closure::once_into_js(move |_: web_sys::Event| {
        let count = SPEECH_ERROR_COUNT.with(|c| {
            let v = c.get();
            c.set(v + 1);
            v
        });
        if count == 0 {
            crate::dom::warn("[speech] Utterance error — speech synthesis may need restart");
        } else if count == 2 {
            crate::dom::warn("[speech] Suppressing further speech errors (synthesis unavailable)");
        }
    });
    utterance.set_onerror(Some(on_error.unchecked_ref()));
    synth.speak(&utterance);
}
pub const NARRATE_RATE: f32 = 0.72;
pub const NARRATE_PITCH: f32 = 1.12;
pub fn speak(text: &str) {
    say(text, 0.82, 1.15);
}
pub fn narrate(text: &str) {
    say(text, NARRATE_RATE, NARRATE_PITCH);
}
pub fn celebrate(text: &str) {
    say(text, 0.88, 1.35);
} // Enthusiastic but not rushed, bright pitch
pub fn stop() {
    if let Ok(synth) = dom::window().speech_synthesis() {
        synth.cancel();
    }
}
/// Apply preferred voice to an externally-created utterance (used by karaoke engine)
pub fn apply_voice(utterance: &SpeechSynthesisUtterance) {
    init_voices();
    utterance.set_lang("en-US");
    PREFERRED_VOICE.with(|v| {
        if let Some(ref voice) = *v.borrow() {
            utterance.set_voice(Some(voice));
        }
    });
}
