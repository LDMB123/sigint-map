use crate::synth_audio;

#[allow(dead_code)]
#[derive(Debug, Clone, Copy)]
pub struct PanelMeta {
    pub id: &'static str,
    pub narration_phrase: Option<&'static str>,
    pub first_visit_tip: Option<&'static str>,
    pub sound_key: Option<&'static str>,
}

include!("panel_registry_generated.rs");

pub fn get_panel(id: &str) -> Option<&'static PanelMeta> {
    PANEL_REGISTRY.iter().find(|panel| panel.id == id)
}

pub fn is_known_panel(id: &str) -> bool {
    get_panel(id).is_some()
}

pub fn narration_phrase(id: &str) -> Option<&'static str> {
    get_panel(id).and_then(|panel| panel.narration_phrase)
}

pub fn play_sound(id: &str) {
    let Some(sound_key) = get_panel(id).and_then(|panel| panel.sound_key) else {
        return;
    };

    match sound_key {
        "gentle" => synth_audio::gentle(),
        "fanfare" => synth_audio::fanfare(),
        "dreamy" => synth_audio::dreamy(),
        "sparkle" => synth_audio::sparkle(),
        "chime" => synth_audio::chime(),
        "magic_wand" => synth_audio::magic_wand(),
        _ => {}
    }
}
