use crate::browser_apis;
use std::cell::{Cell, RefCell};
use web_sys::OscillatorType;
thread_local! {
    static AUDIO_CTX: RefCell<Option<web_sys::AudioContext>> = const { RefCell::new(None) };
    static ENABLED: Cell<bool> = const { Cell::new(true) };
    static MASTER_VOL: Cell<f32> = const { Cell::new(0.5) };
    static VOICE_POOL: RefCell<VoicePool> = const { RefCell::new(VoicePool::new()) };
    static REVERB_NODE: RefCell<Option<web_sys::ConvolverNode>> = const { RefCell::new(None) };
    static MUSIC_NODES: RefCell<Vec<web_sys::OscillatorNode>> = const { RefCell::new(Vec::new()) };
}
#[derive(Debug, Clone, Copy)]
struct EnvelopeParams {
    attack_ms: f64,
    decay_ms: f64,
    sustain_level: f64,
    release_ms: f64,
}
#[derive(Debug, Clone, Copy)]
struct SoundLayer {
    osc_type: OscillatorType,
    freq_multiplier: f64,
    detune_cents: f64,
    amplitude: f64,
}
#[derive(Debug, Clone)]
struct SoundPreset {
    layers: Vec<SoundLayer>,
    envelope: EnvelopeParams,
}
struct Voice {
    gain_node: web_sys::GainNode,
    in_use: bool,
    last_used_ms: f64,
}
struct VoicePool {
    voices: Vec<Voice>,
    max_voices: usize,
}
impl VoicePool {
    const fn new() -> Self {
        let max_voices = if cfg!(target_os = "ios") {
            16 // iPad mini 6 (A15, 4GB RAM) tested stable at 16 voices
        } else {
            12 // Safe fallback for other platforms
        };
        VoicePool {
            voices: Vec::new(),
            max_voices,
        }
    }
    fn acquire_voice(&mut self, ctx: &web_sys::AudioContext) -> Option<usize> {
        if let Some(idx) = self.voices.iter().position(|v| !v.in_use) {
            self.voices[idx].in_use = true;
            self.voices[idx].last_used_ms = browser_apis::now_ms();
            return Some(idx);
        }
        if self.voices.len() < self.max_voices {
            if let Ok(gain) = ctx.create_gain() {
                let idx = self.voices.len();
                self.voices.push(Voice {
                    gain_node: gain,
                    in_use: true,
                    last_used_ms: browser_apis::now_ms(),
                });
                return Some(idx);
            }
        }
        let oldest_idx = self
            .voices
            .iter()
            .enumerate()
            .min_by_key(|(_, v)| v.last_used_ms as u64)
            .map(|(idx, _)| idx)?;
        self.voices[oldest_idx].in_use = true;
        self.voices[oldest_idx].last_used_ms = browser_apis::now_ms();
        Some(oldest_idx)
    }
    fn release_voice(&mut self, idx: usize) {
        if idx < self.voices.len() {
            self.voices[idx].in_use = false;
            self.voices[idx].last_used_ms = browser_apis::now_ms();
        }
    }
    fn shrink_if_idle(&mut self) {
        let now = browser_apis::now_ms();
        let idle_threshold = 30_000.0; // 30 seconds
        if self.voices.is_empty() {
            return;
        }
        let all_idle = self
            .voices
            .iter()
            .all(|v| !v.in_use && (now - v.last_used_ms) > idle_threshold);
        if all_idle {
            self.voices.clear();
        }
    }
    fn get_gain_node(&self, idx: usize) -> Option<&web_sys::GainNode> {
        self.voices.get(idx).map(|v| &v.gain_node)
    }
}
fn get_sound_preset(sound: &str) -> SoundPreset {
    match sound {
        "chime" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 2.0,
                    detune_cents: 0.0,
                    amplitude: 0.3,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 5.0,
                    amplitude: 0.15,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 50.0,
                decay_ms: 100.0,
                sustain_level: 0.7,
                release_ms: 800.0,
            },
        },
        "sparkle" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 2.0,
                    detune_cents: 3.0,
                    amplitude: 0.4,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 4.0,
                    detune_cents: 0.0,
                    amplitude: 0.2,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 30.0,
                decay_ms: 80.0,
                sustain_level: 0.6,
                release_ms: 600.0,
            },
        },
        "fanfare" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 2.0,
                    detune_cents: 0.0,
                    amplitude: 0.5,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 0.5,
                    detune_cents: 0.0,
                    amplitude: 0.3,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 80.0,
                decay_ms: 150.0,
                sustain_level: 0.8,
                release_ms: 1000.0,
            },
        },
        "tap" => SoundPreset {
            layers: vec![SoundLayer {
                osc_type: OscillatorType::Sine,
                freq_multiplier: 1.0,
                detune_cents: 0.0,
                amplitude: 1.0,
            }],
            envelope: EnvelopeParams {
                attack_ms: 10.0,
                decay_ms: 30.0,
                sustain_level: 0.5,
                release_ms: 200.0,
            },
        },
        "whoosh" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sawtooth,
                    freq_multiplier: 1.0,
                    detune_cents: 8.0,
                    amplitude: 0.3,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 30.0,
                decay_ms: 80.0,
                sustain_level: 0.6,
                release_ms: 400.0,
            },
        },
        "gentle" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: -3.0,
                    amplitude: 0.4,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 60.0,
                decay_ms: 120.0,
                sustain_level: 0.7,
                release_ms: 900.0,
            },
        },
        "magic_wand" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 2.0,
                    detune_cents: 5.0,
                    amplitude: 0.4,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 3.0,
                    detune_cents: 0.0,
                    amplitude: 0.25,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 40.0,
                decay_ms: 100.0,
                sustain_level: 0.65,
                release_ms: 700.0,
            },
        },
        "level_up" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 2.0,
                    detune_cents: 0.0,
                    amplitude: 0.4,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 7.0,
                    amplitude: 0.2,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 50.0,
                decay_ms: 120.0,
                sustain_level: 0.75,
                release_ms: 950.0,
            },
        },
        "whoops" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sawtooth,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: -5.0,
                    amplitude: 0.4,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 20.0,
                decay_ms: 60.0,
                sustain_level: 0.5,
                release_ms: 500.0,
            },
        },
        "dreamy" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 5.0,
                    amplitude: 0.8,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: -5.0,
                    amplitude: 0.6,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 2.0,
                    detune_cents: 0.0,
                    amplitude: 0.3,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 150.0,
                decay_ms: 200.0,
                sustain_level: 0.85,
                release_ms: 1500.0,
            },
        },
        "giggle" => SoundPreset {
            layers: vec![SoundLayer {
                osc_type: OscillatorType::Sine,
                freq_multiplier: 1.0,
                detune_cents: 0.0,
                amplitude: 1.0,
            }],
            envelope: EnvelopeParams {
                attack_ms: 15.0,
                decay_ms: 40.0,
                sustain_level: 0.6,
                release_ms: 300.0,
            },
        },
        "lullaby" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 3.0,
                    amplitude: 0.5,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 80.0,
                decay_ms: 150.0,
                sustain_level: 0.75,
                release_ms: 1100.0,
            },
        },
        "rainbow_burst" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 2.0,
                    detune_cents: 0.0,
                    amplitude: 0.35,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 25.0,
                decay_ms: 70.0,
                sustain_level: 0.65,
                release_ms: 500.0,
            },
        },
        "page_turn" => SoundPreset {
            layers: vec![SoundLayer {
                osc_type: OscillatorType::Triangle,
                freq_multiplier: 1.0,
                detune_cents: 0.0,
                amplitude: 1.0,
            }],
            envelope: EnvelopeParams {
                attack_ms: 15.0,
                decay_ms: 40.0,
                sustain_level: 0.5,
                release_ms: 250.0,
            },
        },
        "treasure_reveal" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 2.0,
                    detune_cents: 0.0,
                    amplitude: 0.35,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 40.0,
                decay_ms: 90.0,
                sustain_level: 0.7,
                release_ms: 700.0,
            },
        },
        "reunion_sparkle" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 5.0,
                    amplitude: 0.6,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 2.0,
                    detune_cents: 0.0,
                    amplitude: 0.3,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 70.0,
                decay_ms: 140.0,
                sustain_level: 0.8,
                release_ms: 1000.0,
            },
        },
        "chomp" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 2.0,
                    detune_cents: 0.0,
                    amplitude: 0.3,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 10.0,
                decay_ms: 40.0,
                sustain_level: 0.4,
                release_ms: 200.0,
            },
        },
        "purr" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 3.0,
                    amplitude: 0.8,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 0.5,
                    detune_cents: 0.0,
                    amplitude: 0.4,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 200.0,
                decay_ms: 300.0,
                sustain_level: 0.85,
                release_ms: 2000.0,
            },
        },
        "boing" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 2.0,
                    detune_cents: 0.0,
                    amplitude: 0.2,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 15.0,
                decay_ms: 50.0,
                sustain_level: 0.5,
                release_ms: 400.0,
            },
        },
        "shimmer" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 5.0,
                    amplitude: 0.6,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 2.0,
                    detune_cents: -3.0,
                    amplitude: 0.3,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 3.0,
                    detune_cents: 0.0,
                    amplitude: 0.15,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 80.0,
                decay_ms: 150.0,
                sustain_level: 0.7,
                release_ms: 1200.0,
            },
        },
        "twinkle" => SoundPreset {
            layers: vec![
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 1.0,
                    detune_cents: 0.0,
                    amplitude: 1.0,
                },
                SoundLayer {
                    osc_type: OscillatorType::Sine,
                    freq_multiplier: 3.0,
                    detune_cents: 0.0,
                    amplitude: 0.25,
                },
                SoundLayer {
                    osc_type: OscillatorType::Triangle,
                    freq_multiplier: 2.0,
                    detune_cents: 7.0,
                    amplitude: 0.2,
                },
            ],
            envelope: EnvelopeParams {
                attack_ms: 20.0,
                decay_ms: 60.0,
                sustain_level: 0.5,
                release_ms: 500.0,
            },
        },
        _ => SoundPreset {
            layers: vec![SoundLayer {
                osc_type: OscillatorType::Sine,
                freq_multiplier: 1.0,
                detune_cents: 0.0,
                amplitude: 1.0,
            }],
            envelope: EnvelopeParams {
                attack_ms: 50.0,
                decay_ms: 100.0,
                sustain_level: 0.7,
                release_ms: 800.0,
            },
        },
    }
}
pub fn init() {
    if let Ok(ctx) = web_sys::AudioContext::new() {
        AUDIO_CTX.with(|c| *c.borrow_mut() = Some(ctx));
        crate::browser_apis::spawn_local_logged("synth-reverb-init", async { init_reverb().await });
    }
}
async fn init_reverb() -> Result<(), wasm_bindgen::JsValue> {
    let ctx = AUDIO_CTX.with(|c| c.borrow().clone());
    let Some(ctx) = ctx else {
        return Ok(());
    };
    let impulse = create_reverb_impulse_chunked(&ctx, 1.0, 3.0).await?;
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
    let length = (duration_sec * f64::from(sample_rate)) as u32;
    let buffer = ctx.create_buffer(2, length, sample_rate)?;
    let mut left = vec![0.0f32; length as usize];
    let mut right = vec![0.0f32; length as usize];
    const CHUNK_SIZE: usize = 4096;
    for chunk_start in (0..length as usize).step_by(CHUNK_SIZE) {
        let chunk_end = (chunk_start + CHUNK_SIZE).min(length as usize);
        for i in chunk_start..chunk_end {
            let t = i as f64 / f64::from(length);
            let envelope = (-decay * t).exp();
            left[i] = ((js_sys::Math::random() * 2.0 - 1.0) * envelope) as f32;
            right[i] = ((js_sys::Math::random() * 2.0 - 1.0) * envelope) as f32;
        }
        crate::browser_apis::scheduler_yield().await;
    }
    buffer.copy_to_channel(&left, 0)?;
    buffer.copy_to_channel(&right, 1)?;
    Ok(buffer)
}
pub fn get_context() -> Option<web_sys::AudioContext> {
    AUDIO_CTX.with(|c| c.borrow().clone())
}
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
#[inline]
fn master_vol() -> f64 {
    f64::from(MASTER_VOL.with(Cell::get))
}
fn play_layered_note(freq: f64, duration: f64, delay: f64, preset: &SoundPreset) {
    AUDIO_CTX.with(|c| {
        let borrow = c.borrow();
        let Some(ctx) = borrow.as_ref() else { return };
        let start_time = ctx.current_time() + delay;
        let end_time = start_time + duration;
        let vol = master_vol();
        VOICE_POOL.with(|pool| {
            let mut pool = pool.borrow_mut();
            for layer in &preset.layers {
                let Some(voice_idx) = pool.acquire_voice(ctx) else {
                    continue;
                };
                let Some(gain_node) = pool.get_gain_node(voice_idx) else {
                    continue;
                };
                let Ok(osc) = ctx.create_oscillator() else {
                    continue;
                };
                osc.set_type(layer.osc_type);
                let layer_freq = freq * layer.freq_multiplier;
                osc.frequency().set_value(layer_freq as f32);
                osc.detune().set_value(layer.detune_cents as f32);
                let peak_volume = (vol * layer.amplitude * 0.15) as f32;
                apply_envelope(
                    &gain_node.gain(),
                    &preset.envelope,
                    start_time,
                    peak_volume,
                    duration,
                );
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
fn apply_envelope(
    param: &web_sys::AudioParam,
    envelope: &EnvelopeParams,
    start_time: f64,
    peak_volume: f32,
    note_duration: f64,
) {
    let attack_end = start_time + envelope.attack_ms / 1000.0;
    let decay_end = attack_end + envelope.decay_ms / 1000.0;
    let sustain_level = (f64::from(peak_volume) * envelope.sustain_level) as f32;
    let note_end = start_time + note_duration;
    let release_end = note_end + envelope.release_ms / 1000.0;
    let _ = param.set_value_at_time(0.0, start_time);
    let _ = param.linear_ramp_to_value_at_time(peak_volume, attack_end);
    let _ = param.linear_ramp_to_value_at_time(sustain_level, decay_end);
    let _ = param.set_value_at_time(sustain_level, note_end);
    let _ = param.linear_ramp_to_value_at_time(0.0, release_end);
}
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
                let Some(voice_idx) = pool.acquire_voice(ctx) else {
                    continue;
                };
                let Some(gain_node) = pool.get_gain_node(voice_idx) else {
                    continue;
                };
                let Ok(osc) = ctx.create_oscillator() else {
                    continue;
                };
                osc.set_type(layer.osc_type);
                let layer_start = start_freq * layer.freq_multiplier;
                let layer_end = end_freq * layer.freq_multiplier;
                let _ = osc
                    .frequency()
                    .set_value_at_time(layer_start as f32, start_time);
                let _ = osc
                    .frequency()
                    .exponential_ramp_to_value_at_time(layer_end as f32, end_time);
                osc.detune().set_value(layer.detune_cents as f32);
                let peak_volume = (vol * layer.amplitude * 0.12) as f32;
                apply_envelope(
                    &gain_node.gain(),
                    &preset.envelope,
                    start_time,
                    peak_volume,
                    duration,
                );
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
#[inline]
fn is_enabled() -> bool {
    ENABLED.with(Cell::get)
}
fn with_audio(name: &str, f: impl FnOnce(SoundPreset)) {
    if !is_enabled() {
        return;
    }
    ensure_resumed();
    f(get_sound_preset(name));
}
pub fn chime() {
    with_audio("chime", |preset| {
        play_layered_note(523.25, 0.08, 0.0, &preset);
        play_layered_note(659.25, 0.08, 0.08, &preset);
        play_layered_note(783.99, 0.12, 0.16, &preset);
    });
}
pub fn sparkle() {
    with_audio("sparkle", |preset| {
        play_layered_note(1046.5, 0.06, 0.0, &preset);
        play_layered_note(1318.5, 0.06, 0.05, &preset);
        play_layered_note(1568.0, 0.06, 0.1, &preset);
        play_layered_note(2093.0, 0.1, 0.15, &preset);
    });
}
pub fn fanfare() {
    with_audio("fanfare", |preset| {
        play_layered_note(523.25, 0.15, 0.0, &preset);
        play_layered_note(659.25, 0.15, 0.12, &preset);
        play_layered_note(783.99, 0.15, 0.24, &preset);
        play_layered_note(1046.5, 0.25, 0.36, &preset);
    });
}
pub fn tap() {
    with_audio("tap", |preset| {
        play_layered_note(880.0, 0.03, 0.0, &preset);
    });
}
pub fn whoosh() {
    with_audio("whoosh", |preset| {
        play_sweep(400.0, 200.0, 0.15, 0.0, &preset);
    });
}
pub fn gentle() {
    with_audio("gentle", |preset| {
        play_layered_note(440.0, 0.15, 0.0, &preset);
        play_layered_note(392.0, 0.2, 0.1, &preset);
    });
}
pub fn magic_wand() {
    with_audio("magic_wand", |preset| {
        play_layered_note(523.25, 0.10, 0.0, &preset);
        play_layered_note(659.25, 0.10, 0.06, &preset);
        play_layered_note(783.99, 0.10, 0.12, &preset);
        play_layered_note(987.77, 0.10, 0.18, &preset);
        play_layered_note(1046.5, 0.18, 0.24, &preset);
    });
}
pub fn level_up() {
    with_audio("level_up", |preset| {
        let notes: &[(f64, f64, f64)] = &[
            (523.25, 0.08, 0.0),
            (587.33, 0.08, 0.06),
            (659.25, 0.08, 0.12),
            (698.46, 0.08, 0.18),
            (783.99, 0.08, 0.24),
            (880.00, 0.08, 0.30),
            (987.77, 0.08, 0.36),
            (1046.5, 0.30, 0.42),
        ];
        for &(freq, dur, delay) in notes {
            play_layered_note(freq, dur, delay, &preset);
        }
    });
}
pub fn whoops() {
    with_audio("whoops", |preset| {
        play_sweep(800.0, 200.0, 0.25, 0.0, &preset);
        play_layered_note(200.0, 0.08, 0.22, &preset);
    });
}
pub fn dreamy() {
    with_audio("dreamy", |preset| {
        play_layered_note(261.63, 1.2, 0.0, &preset);
        play_layered_note(329.63, 1.2, 0.0, &preset);
        play_layered_note(392.00, 1.2, 0.0, &preset);
    });
}
pub fn giggle() {
    with_audio("giggle", |preset| {
        let hi = 1318.5;
        let lo = 1175.0;
        for i in 0..6 {
            let freq = if i % 2 == 0 { hi } else { lo };
            play_layered_note(freq, 0.04, f64::from(i) * 0.05, &preset);
        }
    });
}
pub fn lullaby() {
    with_audio("lullaby", |preset| {
        let melody: &[(f64, f64, f64)] = &[
            (659.25, 0.20, 0.0),
            (587.33, 0.20, 0.22),
            (523.25, 0.20, 0.44),
            (587.33, 0.20, 0.66),
            (523.25, 0.35, 0.88),
        ];
        for &(freq, dur, delay) in melody {
            play_layered_note(freq, dur, delay, &preset);
        }
    });
}
pub fn rainbow_burst() {
    with_audio("rainbow_burst", |preset| {
        let base = 523.25_f64;
        let step_time = 0.04;
        for i in 0..13 {
            let freq = base * 2.0_f64.powf(f64::from(i) / 12.0);
            play_layered_note(freq, 0.05, f64::from(i) * step_time, &preset);
        }
    });
}
pub fn page_turn() {
    with_audio("page_turn", |preset| {
        play_sweep(3000.0, 500.0, 0.08, 0.0, &preset);
    });
}
pub fn treasure_reveal() {
    with_audio("treasure_reveal", |preset| {
        let notes: &[(f64, f64, f64)] = &[
            (783.99, 0.10, 0.0),
            (880.00, 0.10, 0.08),
            (987.77, 0.10, 0.16),
            (1046.5, 0.10, 0.24),
            (1318.5, 0.10, 0.32),
            (1568.0, 0.18, 0.40),
        ];
        for &(freq, dur, delay) in notes {
            play_layered_note(freq, dur, delay, &preset);
        }
    });
}
pub fn reunion_sparkle() {
    with_audio("reunion_sparkle", |preset| {
        let notes: &[(f64, f64, f64)] = &[
            (1046.5, 0.12, 0.0),
            (1318.5, 0.12, 0.10),
            (1568.0, 0.12, 0.20),
            (2093.0, 0.12, 0.30),
            (1568.0, 0.12, 0.40),
            (2093.0, 0.18, 0.50),
        ];
        for &(freq, dur, delay) in notes {
            play_layered_note(freq, dur, delay, &preset);
        }
    });
}
pub fn chomp() {
    with_audio("chomp", |preset| {
        play_layered_note(220.0, 0.06, 0.0, &preset);
        play_layered_note(180.0, 0.04, 0.05, &preset);
    });
}
pub fn purr() {
    with_audio("purr", |preset| {
        play_layered_note(80.0, 2.0, 0.0, &preset);
    });
}
pub fn boing() {
    with_audio("boing", |preset| {
        play_sweep(200.0, 600.0, 0.15, 0.0, &preset);
        play_sweep(600.0, 300.0, 0.15, 0.12, &preset);
    });
}
pub fn shimmer() {
    with_audio("shimmer", |preset| {
        play_layered_note(880.0, 0.15, 0.0, &preset);
        play_layered_note(1046.5, 0.15, 0.08, &preset);
        play_layered_note(1318.5, 0.15, 0.16, &preset);
        play_layered_note(1568.0, 0.20, 0.24, &preset);
    });
}
pub fn twinkle() {
    with_audio("twinkle", |preset| {
        play_layered_note(1568.0, 0.06, 0.0, &preset);
        play_layered_note(2093.0, 0.06, 0.06, &preset);
        play_layered_note(1568.0, 0.06, 0.12, &preset);
        play_layered_note(2637.0, 0.10, 0.18, &preset);
    });
}
pub fn munch() {
    with_audio("chomp", |preset| {
        for i in 0..3 {
            play_layered_note(220.0, 0.05, f64::from(i) * 0.12, &preset);
            play_layered_note(180.0, 0.04, f64::from(i) * 0.12 + 0.04, &preset);
        }
    });
}
pub fn stop_game_music() {
    MUSIC_NODES.with(|nodes| {
        for node in nodes.borrow().iter() {
            let _ = node.stop();
        }
        nodes.borrow_mut().clear();
    });
}
pub fn start_game_music(game_id: &str) {
    stop_game_music();
    if !is_enabled() {
        return;
    }
    ensure_resumed();
    let Some(ctx) = get_context() else { return };
    let layers: &[(OscillatorType, f64, f64)] = match game_id {
        "heart_catcher" | "catcher" => &[
            (OscillatorType::Sine, 261.63, 0.06),
            (OscillatorType::Triangle, 329.63, 0.04),
            (OscillatorType::Sine, 392.00, 0.03),
        ],
        "coloring" | "paint" => &[
            (OscillatorType::Sine, 220.00, 0.05),
            (OscillatorType::Sine, 329.63, 0.04),
        ],
        "garden_decor" | "gardens" => &[
            (OscillatorType::Triangle, 293.66, 0.05),
            (OscillatorType::Sine, 440.00, 0.03),
            (OscillatorType::Triangle, 369.99, 0.02),
        ],
        _ => &[
            (OscillatorType::Triangle, 261.63, 0.05),
            (OscillatorType::Sine, 392.00, 0.04),
        ],
    };
    let mut oscillators = Vec::with_capacity(layers.len());
    for &(osc_type, freq, gain) in layers {
        let Ok(osc) = ctx.create_oscillator() else {
            continue;
        };
        let Ok(gain_node) = ctx.create_gain() else {
            continue;
        };
        osc.set_type(osc_type);
        osc.frequency().set_value(freq as f32);
        osc.detune().set_value(2.0);
        let _ = gain_node.gain().set_value_at_time(0.0, ctx.current_time());
        let _ = gain_node
            .gain()
            .linear_ramp_to_value_at_time((gain * master_vol()) as f32, ctx.current_time() + 1.0);
        let _ = osc.connect_with_audio_node(&gain_node);
        let _ = gain_node.connect_with_audio_node(&ctx.destination());
        let _ = osc.start();
        oscillators.push(osc);
    }
    MUSIC_NODES.with(|nodes| {
        *nodes.borrow_mut() = oscillators;
    });
}
pub fn on_visibility_change(visible: bool) {
    AUDIO_CTX.with(|c| {
        let borrow = c.borrow();
        if let Some(ctx) = borrow.as_ref() {
            if visible {
                let _ = ctx.resume();
            } else {
                let _ = ctx.suspend(); // Reclaim idle voice pool memory when backgrounded
                VOICE_POOL.with(|pool| pool.borrow_mut().shrink_if_idle());
            }
        }
    });
}
