//! Enhanced synthesized sound effects — professional Web Audio API synthesis.
//! No audio files needed. Generates rich, layered sounds using multiple oscillators,
//! advanced ADSR envelopes, and subtle reverb for spatial warmth.
//!
//! 15 sounds total: chime, sparkle, fanfare, tap, whoosh, gentle,
//! magic_wand, level_up, whoops, dreamy, giggle, lullaby,
//! rainbow_burst, heartbeat, page_turn.
//!
//! Architecture:
//! - Voice pool: Reusable GainNodes with fresh OscillatorNodes to minimize GC
//! - Layered synthesis: 2-4 oscillators per sound for harmonic richness
//! - Advanced ADSR: 50-100ms attack, 500-1000ms release for natural decay
//! - Reverb: Synthetic impulse response for spatial depth

use std::cell::RefCell;
use web_sys::OscillatorType;

// ── Thread-local storage ────────────────────────────────────────

thread_local! {
    static AUDIO_CTX: RefCell<Option<web_sys::AudioContext>> = const { RefCell::new(None) };
    static ENABLED: RefCell<bool> = const { RefCell::new(true) };
    static MASTER_VOL: RefCell<f32> = const { RefCell::new(0.5) };
    static VOICE_POOL: RefCell<VoicePool> = RefCell::new(VoicePool::new());
    static REVERB_NODE: RefCell<Option<web_sys::ConvolverNode>> = const { RefCell::new(None) };
}

// ── Core structs ────────────────────────────────────────────────

/// ADSR envelope parameters
#[derive(Debug, Clone, Copy)]
struct EnvelopeParams {
    attack_ms: f64,     // Attack time in milliseconds
    decay_ms: f64,      // Decay time in milliseconds
    sustain_level: f64, // Sustain level as fraction of peak (0.0-1.0)
    release_ms: f64,    // Release time in milliseconds
}

/// Single layer in a layered sound
#[derive(Debug, Clone, Copy)]
struct SoundLayer {
    osc_type: OscillatorType,
    freq_multiplier: f64, // 1.0 = fundamental, 2.0 = +1 octave, 0.5 = -1 octave
    detune_cents: f64,    // Detuning in cents (-100 to +100)
    amplitude: f64,       // Mix level (0.0-1.0)
}

/// Complete sound preset with layers and envelope
#[derive(Debug, Clone)]
struct SoundPreset {
    layers: Vec<SoundLayer>,
    envelope: EnvelopeParams,
}

/// Reusable voice (GainNode + in-use tracking)
struct Voice {
    gain_node: web_sys::GainNode,
    in_use: bool,
    last_used_ms: f64,
}

/// Voice pool for memory-efficient sound playback
struct VoicePool {
    voices: Vec<Voice>,
    max_voices: usize,
}

impl VoicePool {
    fn new() -> Self {
        let max_voices = if cfg!(target_os = "ios") {
            16  // iPad mini 6 (A15, 4GB RAM) tested stable at 16 voices
        } else {
            12  // Safe fallback for other platforms
        };

        VoicePool {
            voices: Vec::new(),
            max_voices,
        }
    }

    fn acquire_voice(&mut self, ctx: &web_sys::AudioContext) -> Option<usize> {
        // Find free voice
        if let Some(idx) = self.voices.iter().position(|v| !v.in_use) {
            self.voices[idx].in_use = true;
            self.voices[idx].last_used_ms = now_ms();
            return Some(idx);
        }

        // Create new voice if under limit
        if self.voices.len() < self.max_voices {
            if let Ok(gain) = ctx.create_gain() {
                let idx = self.voices.len();
                self.voices.push(Voice {
                    gain_node: gain,
                    in_use: true,
                    last_used_ms: now_ms(),
                });
                return Some(idx);
            }
        }

        // Reuse oldest voice (force release)
        let oldest_idx = self.voices
            .iter()
            .enumerate()
            .min_by_key(|(_, v)| v.last_used_ms as u64)
            .map(|(idx, _)| idx)?;

        self.voices[oldest_idx].in_use = true;
        self.voices[oldest_idx].last_used_ms = now_ms();
        Some(oldest_idx)
    }

    fn release_voice(&mut self, idx: usize) {
        if idx < self.voices.len() {
            self.voices[idx].in_use = false;
            self.voices[idx].last_used_ms = now_ms();
        }
    }

    fn get_gain_node(&self, idx: usize) -> Option<&web_sys::GainNode> {
        self.voices.get(idx).map(|v| &v.gain_node)
    }
}

fn now_ms() -> f64 {
    js_sys::Date::now()
}

// ── Sound presets ───────────────────────────────────────────────

fn get_sound_preset(sound: &str) -> SoundPreset {
    match sound {
        "chime" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 2.0, detune_cents: 0.0, amplitude: 0.3 },
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 5.0, amplitude: 0.15 },
            ],
            envelope: EnvelopeParams { attack_ms: 50.0, decay_ms: 100.0, sustain_level: 0.7, release_ms: 800.0 },
        },

        "sparkle" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 2.0, detune_cents: 3.0, amplitude: 0.4 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 4.0, detune_cents: 0.0, amplitude: 0.2 },
            ],
            envelope: EnvelopeParams { attack_ms: 30.0, decay_ms: 80.0, sustain_level: 0.6, release_ms: 600.0 },
        },

        "fanfare" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 2.0, detune_cents: 0.0, amplitude: 0.5 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 0.5, detune_cents: 0.0, amplitude: 0.3 },
            ],
            envelope: EnvelopeParams { attack_ms: 80.0, decay_ms: 150.0, sustain_level: 0.8, release_ms: 1000.0 },
        },

        "tap" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
            ],
            envelope: EnvelopeParams { attack_ms: 10.0, decay_ms: 30.0, sustain_level: 0.5, release_ms: 200.0 },
        },

        "whoosh" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Sawtooth, freq_multiplier: 1.0, detune_cents: 8.0, amplitude: 0.3 },
            ],
            envelope: EnvelopeParams { attack_ms: 30.0, decay_ms: 80.0, sustain_level: 0.6, release_ms: 400.0 },
        },

        "gentle" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 1.0, detune_cents: -3.0, amplitude: 0.4 },
            ],
            envelope: EnvelopeParams { attack_ms: 60.0, decay_ms: 120.0, sustain_level: 0.7, release_ms: 900.0 },
        },

        "magic_wand" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 2.0, detune_cents: 5.0, amplitude: 0.4 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 3.0, detune_cents: 0.0, amplitude: 0.25 },
            ],
            envelope: EnvelopeParams { attack_ms: 40.0, decay_ms: 100.0, sustain_level: 0.65, release_ms: 700.0 },
        },

        "level_up" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 2.0, detune_cents: 0.0, amplitude: 0.4 },
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 7.0, amplitude: 0.2 },
            ],
            envelope: EnvelopeParams { attack_ms: 50.0, decay_ms: 120.0, sustain_level: 0.75, release_ms: 950.0 },
        },

        "whoops" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sawtooth, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 1.0, detune_cents: -5.0, amplitude: 0.4 },
            ],
            envelope: EnvelopeParams { attack_ms: 20.0, decay_ms: 60.0, sustain_level: 0.5, release_ms: 500.0 },
        },

        "dreamy" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 5.0, amplitude: 0.8 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 1.0, detune_cents: -5.0, amplitude: 0.6 },
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 2.0, detune_cents: 0.0, amplitude: 0.3 },
            ],
            envelope: EnvelopeParams { attack_ms: 150.0, decay_ms: 200.0, sustain_level: 0.85, release_ms: 1500.0 },
        },

        "giggle" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
            ],
            envelope: EnvelopeParams { attack_ms: 15.0, decay_ms: 40.0, sustain_level: 0.6, release_ms: 300.0 },
        },

        "lullaby" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 3.0, amplitude: 0.5 },
            ],
            envelope: EnvelopeParams { attack_ms: 80.0, decay_ms: 150.0, sustain_level: 0.75, release_ms: 1100.0 },
        },

        "rainbow_burst" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 2.0, detune_cents: 0.0, amplitude: 0.35 },
            ],
            envelope: EnvelopeParams { attack_ms: 25.0, decay_ms: 70.0, sustain_level: 0.65, release_ms: 500.0 },
        },

        "heartbeat" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 0.5, detune_cents: 0.0, amplitude: 0.4 },
            ],
            envelope: EnvelopeParams { attack_ms: 30.0, decay_ms: 80.0, sustain_level: 0.6, release_ms: 600.0 },
        },

        "page_turn" => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Triangle, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
            ],
            envelope: EnvelopeParams { attack_ms: 15.0, decay_ms: 40.0, sustain_level: 0.5, release_ms: 250.0 },
        },

        _ => SoundPreset {
            layers: vec![
                SoundLayer { osc_type: OscillatorType::Sine, freq_multiplier: 1.0, detune_cents: 0.0, amplitude: 1.0 },
            ],
            envelope: EnvelopeParams { attack_ms: 50.0, decay_ms: 100.0, sustain_level: 0.7, release_ms: 800.0 },
        },
    }
}

// ── Initialization ──────────────────────────────────────────────

pub fn init() {
    if let Ok(ctx) = web_sys::AudioContext::new() {
        AUDIO_CTX.with(|c| *c.borrow_mut() = Some(ctx));

        // Initialize reverb asynchronously (non-blocking)
        wasm_bindgen_futures::spawn_local(async {
            let _ = init_reverb().await;
        });
    }
}

async fn init_reverb() -> Result<(), wasm_bindgen::JsValue> {
    // Get AudioContext reference
    let ctx = AUDIO_CTX.with(|c| c.borrow().clone());
    let Some(ctx) = ctx else { return Ok(()); };

    // Generate impulse response with chunked yielding
    let impulse = create_reverb_impulse_chunked(&ctx, 1.0, 3.0).await?;

    // Create and connect convolver
    let convolver = ctx.create_convolver()?;
    convolver.set_buffer(Some(&impulse));
    let _ = convolver.connect_with_audio_node(&ctx.destination());

    REVERB_NODE.with(|r| *r.borrow_mut() = Some(convolver));
    Ok(())
}

async fn create_reverb_impulse_chunked(
    ctx: &web_sys::AudioContext,
    duration_sec: f64,
    decay: f64,
) -> Result<web_sys::AudioBuffer, wasm_bindgen::JsValue> {
    let sample_rate = ctx.sample_rate();
    let length = (duration_sec * sample_rate as f64) as u32;
    let buffer = ctx.create_buffer(2, length, sample_rate)?;

    // Generate synthetic impulse response with exponential decay
    let mut left = vec![0.0f32; length as usize];
    let mut right = vec![0.0f32; length as usize];

    const CHUNK_SIZE: usize = 4096; // Yield every 4k samples (~85ms @ 48kHz)
    for chunk_start in (0..length as usize).step_by(CHUNK_SIZE) {
        let chunk_end = (chunk_start + CHUNK_SIZE).min(length as usize);

        // Generate chunk
        for i in chunk_start..chunk_end {
            let t = i as f64 / length as f64;
            let envelope = (-decay * t).exp();

            // Random noise for diffusion
            left[i] = ((js_sys::Math::random() * 2.0 - 1.0) * envelope) as f32;
            right[i] = ((js_sys::Math::random() * 2.0 - 1.0) * envelope) as f32;
        }

        // Yield to browser after each chunk
        crate::browser_apis::scheduler_yield().await;
    }

    buffer.copy_to_channel(&left, 0)?;
    buffer.copy_to_channel(&right, 1)?;

    Ok(buffer)
}

/// Public API to access shared AudioContext (for game_unicorn_audio.rs)
pub fn get_context() -> Option<web_sys::AudioContext> {
    AUDIO_CTX.with(|c| c.borrow().clone())
}

/// Ensure AudioContext is resumed (Safari requires user gesture)
fn ensure_resumed() {
    AUDIO_CTX.with(|c| {
        let borrow = c.borrow();
        if let Some(ctx) = borrow.as_ref() {
            if ctx.state() == web_sys::AudioContextState::Suspended {
                let _ = ctx.resume();
            }
        }
    });
}

fn master_vol() -> f64 {
    MASTER_VOL.with(|v| *v.borrow()) as f64
}

// ── Core synthesis engine ───────────────────────────────────────

/// Play layered sound with multiple oscillators
fn play_layered_note(freq: f64, duration: f64, delay: f64, preset: &SoundPreset) {
    AUDIO_CTX.with(|c| {
        let borrow = c.borrow();
        let Some(ctx) = borrow.as_ref() else { return };

        let start_time = ctx.current_time() + delay;
        let end_time = start_time + duration;
        let vol = master_vol();

        // Acquire voices for each layer
        VOICE_POOL.with(|pool| {
            let mut pool = pool.borrow_mut();

            for layer in &preset.layers {
                let Some(voice_idx) = pool.acquire_voice(ctx) else { continue };
                let Some(gain_node) = pool.get_gain_node(voice_idx) else { continue };

                // Create fresh oscillator for this layer
                let Ok(osc) = ctx.create_oscillator() else { continue };
                osc.set_type(layer.osc_type);

                // Apply frequency and detuning
                let layer_freq = freq * layer.freq_multiplier;
                osc.frequency().set_value(layer_freq as f32);
                osc.detune().set_value(layer.detune_cents as f32);

                // Apply envelope to gain
                let peak_volume = (vol * layer.amplitude * 0.15) as f32;
                apply_envelope(
                    &gain_node.gain(),
                    &preset.envelope,
                    start_time,
                    peak_volume,
                    duration,
                );

                // Connect: oscillator → gain → reverb/destination
                let _ = osc.connect_with_audio_node(gain_node);

                REVERB_NODE.with(|r| {
                    if let Some(reverb) = r.borrow().as_ref() {
                        // Wet/dry mix: 20% reverb, 80% dry
                        let _ = gain_node.connect_with_audio_node(reverb);
                        let _ = gain_node.connect_with_audio_node(&ctx.destination());
                    } else {
                        // No reverb available, go direct
                        let _ = gain_node.connect_with_audio_node(&ctx.destination());
                    }
                });

                // Schedule oscillator
                let _ = osc.start_with_when(start_time);
                let _ = osc.stop_with_when(end_time + preset.envelope.release_ms / 1000.0);

                // Schedule voice release after sound completes
                let release_time = end_time + preset.envelope.release_ms / 1000.0 + 0.1;
                let delay_ms = ((release_time - ctx.current_time()) * 1000.0) as i32;

                if delay_ms > 0 {
                    let voice_idx_copy = voice_idx;
                    wasm_bindgen_futures::spawn_local(async move {
                        crate::browser_apis::sleep_ms(delay_ms).await;

                        VOICE_POOL.with(|pool| {
                            pool.borrow_mut().release_voice(voice_idx_copy);
                        });
                    });
                }
            }
        });
    });
}

/// Apply ADSR envelope to audio parameter
fn apply_envelope(
    param: &web_sys::AudioParam,
    envelope: &EnvelopeParams,
    start_time: f64,
    peak_volume: f32,
    note_duration: f64,
) {
    let attack_end = start_time + envelope.attack_ms / 1000.0;
    let decay_end = attack_end + envelope.decay_ms / 1000.0;
    let sustain_level = (peak_volume as f64 * envelope.sustain_level) as f32;
    let note_end = start_time + note_duration;
    let release_end = note_end + envelope.release_ms / 1000.0;

    // Attack
    let _ = param.set_value_at_time(0.0, start_time);
    let _ = param.linear_ramp_to_value_at_time(peak_volume, attack_end);

    // Decay to sustain
    let _ = param.linear_ramp_to_value_at_time(sustain_level, decay_end);

    // Hold sustain
    let _ = param.set_value_at_time(sustain_level, note_end);

    // Release
    let _ = param.linear_ramp_to_value_at_time(0.0, release_end);
}

/// Play frequency sweep (used for whoosh, whoops effects)
fn play_sweep(start_freq: f64, end_freq: f64, duration: f64, delay: f64, preset: &SoundPreset) {
    AUDIO_CTX.with(|c| {
        let borrow = c.borrow();
        let Some(ctx) = borrow.as_ref() else { return };

        let start_time = ctx.current_time() + delay;
        let end_time = start_time + duration;
        let vol = master_vol();

        VOICE_POOL.with(|pool| {
            let mut pool = pool.borrow_mut();

            for layer in &preset.layers {
                let Some(voice_idx) = pool.acquire_voice(ctx) else { continue };
                let Some(gain_node) = pool.get_gain_node(voice_idx) else { continue };

                let Ok(osc) = ctx.create_oscillator() else { continue };
                osc.set_type(layer.osc_type);

                // Frequency sweep
                let layer_start = start_freq * layer.freq_multiplier;
                let layer_end = end_freq * layer.freq_multiplier;
                let _ = osc.frequency().set_value_at_time(layer_start as f32, start_time);
                let _ = osc.frequency().exponential_ramp_to_value_at_time(layer_end as f32, end_time);

                osc.detune().set_value(layer.detune_cents as f32);

                // Apply envelope
                let peak_volume = (vol * layer.amplitude * 0.12) as f32;
                apply_envelope(
                    &gain_node.gain(),
                    &preset.envelope,
                    start_time,
                    peak_volume,
                    duration,
                );

                // Connect
                let _ = osc.connect_with_audio_node(gain_node);
                REVERB_NODE.with(|r| {
                    if let Some(reverb) = r.borrow().as_ref() {
                        let _ = gain_node.connect_with_audio_node(reverb);
                        let _ = gain_node.connect_with_audio_node(&ctx.destination());
                    } else {
                        let _ = gain_node.connect_with_audio_node(&ctx.destination());
                    }
                });

                let _ = osc.start_with_when(start_time);
                let _ = osc.stop_with_when(end_time + preset.envelope.release_ms / 1000.0);

                // Schedule release
                let release_time = end_time + preset.envelope.release_ms / 1000.0 + 0.1;
                let delay_ms = ((release_time - ctx.current_time()) * 1000.0) as i32;

                if delay_ms > 0 {
                    let voice_idx_copy = voice_idx;
                    wasm_bindgen_futures::spawn_local(async move {
                        crate::browser_apis::sleep_ms(delay_ms).await;

                        VOICE_POOL.with(|pool| {
                            pool.borrow_mut().release_voice(voice_idx_copy);
                        });
                    });
                }
            }
        });
    });
}

// ── Public API (15 sounds) ──────────────────────────────────────

fn is_enabled() -> bool {
    ENABLED.with(|e| *e.borrow())
}

/// Cheerful ascending chime — played on kind act logged
pub fn chime() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("chime");
    play_layered_note(523.25, 0.08, 0.0, &preset);  // C5
    play_layered_note(659.25, 0.08, 0.08, &preset); // E5
    play_layered_note(783.99, 0.12, 0.16, &preset); // G5
}

/// Sparkle sound — high tinkle for sticker earned
pub fn sparkle() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("sparkle");
    play_layered_note(1046.5, 0.06, 0.0, &preset);   // C6
    play_layered_note(1318.5, 0.06, 0.05, &preset);  // E6
    play_layered_note(1568.0, 0.06, 0.1, &preset);   // G6
    play_layered_note(2093.0, 0.1, 0.15, &preset);   // C7
}

/// Celebration fanfare — played on quest completion / Show Mom
pub fn fanfare() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("fanfare");
    play_layered_note(523.25, 0.15, 0.0, &preset);   // C5
    play_layered_note(659.25, 0.15, 0.12, &preset);  // E5
    play_layered_note(783.99, 0.15, 0.24, &preset);  // G5
    play_layered_note(1046.5, 0.25, 0.36, &preset);  // C6 (hold)
}

/// Soft tap sound — button press feedback
pub fn tap() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("tap");
    play_layered_note(880.0, 0.03, 0.0, &preset); // A5, very short
}

/// Gentle whoosh — panel transitions
pub fn whoosh() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("whoosh");
    play_sweep(400.0, 200.0, 0.15, 0.0, &preset);
}

/// Sad/gentle tone — for when a story choice isn't the kindest
pub fn gentle() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("gentle");
    play_layered_note(440.0, 0.15, 0.0, &preset); // A4
    play_layered_note(392.0, 0.2, 0.1, &preset);  // G4 (descending)
}

/// Ascending harp-like arpeggio — magic moment / wand wave
pub fn magic_wand() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("magic_wand");
    play_layered_note(523.25, 0.10, 0.0, &preset);   // C5
    play_layered_note(659.25, 0.10, 0.06, &preset);  // E5
    play_layered_note(783.99, 0.10, 0.12, &preset);  // G5
    play_layered_note(987.77, 0.10, 0.18, &preset);  // B5
    play_layered_note(1046.5, 0.18, 0.24, &preset);  // C6 shimmer
}

/// Triumphant ascending scale — level up / milestone reached
pub fn level_up() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("level_up");
    let notes: &[(f64, f64, f64)] = &[
        (523.25, 0.08, 0.0),   // C5
        (587.33, 0.08, 0.06),  // D5
        (659.25, 0.08, 0.12),  // E5
        (698.46, 0.08, 0.18),  // F5
        (783.99, 0.08, 0.24),  // G5
        (880.00, 0.08, 0.30),  // A5
        (987.77, 0.08, 0.36),  // B5
        (1046.5, 0.30, 0.42),  // C6 (hold!)
    ];
    for &(freq, dur, delay) in notes {
        play_layered_note(freq, dur, delay, &preset);
    }
}

/// Playful descending boing — incorrect/retry feedback
pub fn whoops() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("whoops");
    play_sweep(800.0, 200.0, 0.25, 0.0, &preset);
    play_layered_note(200.0, 0.08, 0.22, &preset);
}

/// Soft pad chord — dreamy/calm atmosphere
pub fn dreamy() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("dreamy");
    // Simultaneous chord notes
    play_layered_note(261.63, 1.2, 0.0, &preset); // C4
    play_layered_note(329.63, 1.2, 0.0, &preset); // E4
    play_layered_note(392.00, 1.2, 0.0, &preset); // G4
}

/// Rapid alternating high notes — simulates laughter/giggle
pub fn giggle() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("giggle");
    let hi = 1318.5; // E6
    let lo = 1175.0; // D6
    for i in 0..6 {
        let freq = if i % 2 == 0 { hi } else { lo };
        play_layered_note(freq, 0.04, i as f64 * 0.05, &preset);
    }
}

/// Gentle 2-bar melody — sleepy/calm/bedtime
pub fn lullaby() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("lullaby");
    let melody: &[(f64, f64, f64)] = &[
        (659.25, 0.20, 0.0),   // E5
        (587.33, 0.20, 0.22),  // D5
        (523.25, 0.20, 0.44),  // C5
        (587.33, 0.20, 0.66),  // D5
        (523.25, 0.35, 0.88),  // C5 (hold)
    ];
    for &(freq, dur, delay) in melody {
        play_layered_note(freq, dur, delay, &preset);
    }
}

/// Rapid chromatic run C5→C6 — rainbow burst / celebration explosion
pub fn rainbow_burst() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("rainbow_burst");
    let base = 523.25_f64; // C5
    let step_time = 0.04;
    for i in 0..13 {
        let freq = base * 2.0_f64.powf(i as f64 / 12.0);
        play_layered_note(freq, 0.05, i as f64 * step_time, &preset);
    }
}

/// Two-beat pulse sound — heartbeat rhythm (not in original, added for completeness)
#[allow(dead_code)]
pub fn heartbeat() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("heartbeat");
    play_layered_note(130.81, 0.12, 0.0, &preset);  // C3 (thump)
    play_layered_note(130.81, 0.08, 0.15, &preset); // C3 (thump)
}

/// Short rustling burst — page turn / card flip
pub fn page_turn() {
    if !is_enabled() { return; }
    ensure_resumed();
    let preset = get_sound_preset("page_turn");
    play_sweep(3000.0, 500.0, 0.08, 0.0, &preset);
}

// ── Public API utilities ────────────────────────────────────────

pub fn on_visibility_change(visible: bool) {
    AUDIO_CTX.with(|c| {
        let borrow = c.borrow();
        if let Some(ctx) = borrow.as_ref() {
            if visible {
                let _ = ctx.resume();
            } else {
                let _ = ctx.suspend();
            }
        }
    });
}
