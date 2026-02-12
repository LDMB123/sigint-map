//! Deprecated: Use synth_audio instead.
//! This module is kept for backward compatibility with lib.rs boot sequence.
//! All audio functionality has been consolidated into synth_audio.rs.

pub fn init() {
    crate::synth_audio::init();
}

pub fn on_visibility_change(visible: bool) {
    crate::synth_audio::on_visibility_change(visible);
}
