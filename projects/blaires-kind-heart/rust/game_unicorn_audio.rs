use std::cell::RefCell;
use web_sys::{AudioContext, GainNode, OscillatorType};
thread_local! { static AMBIENT_GAIN: RefCell<Option<GainNode>> = const { RefCell::new(None) }; static MUTED: RefCell<bool> = const { RefCell::new(false) }; static LAST_COLLECT_TIME: RefCell<f64> = const { RefCell::new(0.0) }; static COMBO_COUNT: RefCell<u32> = const { RefCell::new(0) }; }
fn get_audio_ctx() -> Option<AudioContext> {
    crate::synth_audio::get_context()
}
pub fn start_ambient(freq: f32) {
    let Some(ctx) = get_audio_ctx() else { return };
    let Ok(gain) = ctx.create_gain() else { return };
    let _ = gain.connect_with_audio_node(&ctx.destination());
    let is_muted = MUTED.with(|m| *m.borrow());
    gain.gain().set_value(if is_muted { 0.0 } else { 0.15 });
    AMBIENT_GAIN.with(|ag| *ag.borrow_mut() = Some(gain.clone()));
    if let Ok(osc) = ctx.create_oscillator() {
        osc.set_type(OscillatorType::Sine);
        osc.frequency().set_value(freq);
        let _ = osc.connect_with_audio_node(&gain);
        let _ = osc.start();
        let _ = osc.stop_with_when(ctx.current_time() + 60.0);
    }
}
pub fn stop_ambient() {
    AMBIENT_GAIN.with(|ag| {
        if let Some(ref gain) = *ag.borrow() {
            let _ = gain.disconnect();
        }
        *ag.borrow_mut() = None;
    });
}
pub fn step() {
    let Some(ctx) = get_audio_ctx() else { return };
    if is_muted_state() {
        return;
    }
    if let Ok(osc) = ctx.create_oscillator() {
        osc.set_type(OscillatorType::Sine);
        osc.frequency()
            .set_value((200.0 + js_sys::Math::random() * 100.0) as f32);
        if let Ok(gain) = ctx.create_gain() {
            gain.gain().set_value(0.05);
            let _ = osc.connect_with_audio_node(&gain);
            let _ = gain.connect_with_audio_node(&ctx.destination());
            let now = ctx.current_time();
            let _ = osc.start();
            let _ = osc.stop_with_when(now + 0.05);
        }
    }
}
pub fn collect_friend(type_id: &str) {
    let Some(ctx) = get_audio_ctx() else { return };
    if is_muted_state() {
        return;
    }
    let freq = match type_id {
        "bunny" => 523.25,
        "fox" => 587.33,
        "deer" => 659.25,
        "owl" => 698.46,
        "squirrel" => 783.99,
        "hedgehog" => 880.0,
        "bird" => 987.77,
        "butterfly" => 1046.50,
        "bat" => 262.0,
        "glowworm" => 293.66,
        "crystal_spider" => 329.63,
        "cave_fish" => 349.23,
        "mushroom" => 392.0,
        "gem_dragon" => 440.0,
        "mole" => 493.88,
        "firefly" => 523.25,
        "cloud_bunny" => 587.33,
        "sky_fish" => 659.25,
        "rainbow_bird" => 698.46,
        "wind_sprite" => 783.99,
        "star_mouse" => 880.0,
        "moon_cat" => 987.77,
        "sun_bear" => 1046.50,
        "thunder_pup" => 1174.66,
        "crab" => 293.66,
        "starfish" => 329.63,
        "seahorse" => 349.23,
        "dolphin" => 392.0,
        "turtle" => 440.0,
        "octopus" => 493.88,
        "jellyfish" => 523.25,
        "clownfish" => 587.33,
        _ => 440.0,
    };
    if let Ok(osc) = ctx.create_oscillator() {
        osc.set_type(OscillatorType::Triangle);
        osc.frequency().set_value(freq);
        if let Ok(gain) = ctx.create_gain() {
            gain.gain().set_value(0.2);
            let _ = osc.connect_with_audio_node(&gain);
            let _ = gain.connect_with_audio_node(&ctx.destination());
            let now = ctx.current_time();
            let _ = osc.start();
            let _ = osc.stop_with_when(now + 0.15);
        }
    }
    let now = crate::utils::now_epoch_ms() / 1000.0;
    LAST_COLLECT_TIME.with(|lct| {
        let last = *lct.borrow();
        if now - last < 2.0 {
            COMBO_COUNT.with(|cc| *cc.borrow_mut() += 1);
        } else {
            COMBO_COUNT.with(|cc| *cc.borrow_mut() = 1);
        }
        *lct.borrow_mut() = now;
    });
}
pub fn is_muted_state() -> bool {
    MUTED.with(|m| *m.borrow())
}
pub fn set_muted(muted: bool) {
    MUTED.with(|m| *m.borrow_mut() = muted);
    AMBIENT_GAIN.with(|ag| {
        if let Some(ref gain) = *ag.borrow() {
            gain.gain().set_value(if muted { 0.0 } else { 0.15 });
        }
    });
}
pub fn combo_count() -> u32 {
    COMBO_COUNT.with(|cc| *cc.borrow())
}
pub fn cleanup() {
    stop_ambient();
    COMBO_COUNT.with(|cc| *cc.borrow_mut() = 0);
    LAST_COLLECT_TIME.with(|lct| *lct.borrow_mut() = 0.0);
}
