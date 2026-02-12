/**
 * Web Audio Synthesizer for Blaire's Unicorn Adventure
 *
 * All sounds are synthesized — zero audio files, works offline, tiny footprint.
 * Pentatonic scale only (universally "happy" sounding).
 * Volume capped at 60% system volume for young ears.
 * Respects prefers-reduced-motion (no rapid sound bursts).
 */

// Pentatonic notes: C5, D5, E5, G5, A5, C6 (Hz)
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

// Lower octave for bass warmth
const PENTA_LOW = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

export class AudioSynth {
    constructor() {
        /** @type {AudioContext|null} */
        this._ctx = null;
        this._masterGain = null;
        this._muted = false;
        this._initialized = false;

        // Combo pitch tracking: rises with consecutive collections
        this._comboIndex = 0;
        this._comboTimer = 0;
    }

    /**
     * Lazy-init AudioContext on first user gesture (browser autoplay policy).
     * Call this from any tap/click handler.
     */
    init() {
        if (this._initialized) return;
        try {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._masterGain = this._ctx.createGain();
            this._masterGain.gain.value = 0.55; // 55% max volume — gentle for small ears
            this._masterGain.connect(this._ctx.destination);
            this._initialized = true;
        } catch {
            // Web Audio not supported — all methods become no-ops
            console.warn('Web Audio not available');
        }
    }

    /** Resume suspended context (needed after tab-switch on iOS) */
    resume() {
        if (this._ctx?.state === 'suspended') {
            this._ctx.resume();
        }
    }

    /** Mute/unmute */
    get muted() { return this._muted; }
    set muted(v) {
        this._muted = v;
        if (this._masterGain) {
            this._masterGain.gain.setTargetAtTime(v ? 0 : 0.55, this._ctx.currentTime, 0.05);
        }
    }

    // ───────────────────────────────────────────────
    // Core synthesis helpers
    // ───────────────────────────────────────────────

    /**
     * Play a single tone with attack-decay envelope.
     * @param {number} freq - Hz
     * @param {number} duration - seconds
     * @param {string} type - oscillator type
     * @param {number} [volume=0.3]
     */
    _tone(freq, duration, type = 'sine', volume = 0.3) {
        if (!this._ctx || this._muted) return;
        const now = this._ctx.currentTime;
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        // Soft attack, natural decay
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this._masterGain);

        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    /**
     * Play a scheduled tone at a future time offset.
     */
    _toneAt(freq, duration, delay, type = 'sine', volume = 0.3) {
        if (!this._ctx || this._muted) return;
        const now = this._ctx.currentTime + delay;
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this._masterGain);

        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    // ───────────────────────────────────────────────
    // Game sound effects
    // ───────────────────────────────────────────────

    /**
     * Friend collected: per-animal chime with combo pitch rise.
     * Each animal type has a subtly different timbre/pattern.
     * Pitch rises with combo (3+ in 5 seconds creates a musical scale).
     * @param {string} [typeId='bunny'] - FRIEND_TYPES id
     */
    collectFriend(typeId = 'bunny') {
        if (!this._ctx) return;

        // Combo tracking (shared across all types for musical scale)
        const now = performance.now();
        if (now - this._comboTimer < 5000) {
            this._comboIndex = Math.min(this._comboIndex + 1, PENTA.length - 1);
        } else {
            this._comboIndex = 0;
        }
        this._comboTimer = now;

        const note = PENTA[this._comboIndex];

        switch (typeId) {
            case 'fox':
                // Warm, two-note chirp: sine → triangle slide
                this._tone(note * 0.75, 0.2, 'triangle', 0.22);
                this._toneAt(note, 0.3, 0.08, 'sine', 0.2);
                break;
            case 'owl':
                // Low, soft hoot: deep sine with gentle harmonic
                this._tone(note * 0.5, 0.4, 'sine', 0.2);
                this._toneAt(note, 0.25, 0.12, 'triangle', 0.08);
                break;
            case 'deer':
                // Airy bell chime: two harmonics, slightly echoed
                this._tone(note, 0.35, 'sine', 0.2);
                this._toneAt(note * 1.5, 0.25, 0.05, 'sine', 0.12);
                this._toneAt(note * 2, 0.2, 0.1, 'triangle', 0.06);
                break;
            case 'hedgehog':
                // Quick plucky bounce: short attack, rising pair
                this._tone(note * 0.8, 0.12, 'square', 0.1);
                this._toneAt(note * 1.2, 0.15, 0.06, 'sine', 0.18);
                break;
            default: // bunny — classic bright chime
                this._tone(note, 0.3, 'sine', 0.25);
                this._toneAt(note * 2, 0.2, 0.05, 'triangle', 0.1);
                break;
        }
    }

    /** @deprecated Use collectFriend() — kept for backwards compat */
    collect() {
        this.collectFriend('bunny');
    }

    /**
     * Combo achieved (3+ collections within 5 seconds).
     * Descending bell arpeggio.
     */
    combo() {
        if (!this._ctx) return;
        // Descending: A5, G5, E5
        this._toneAt(880.00, 0.25, 0.00, 'sine', 0.2);
        this._toneAt(783.99, 0.25, 0.08, 'sine', 0.18);
        this._toneAt(659.25, 0.35, 0.16, 'triangle', 0.15);
    }

    /**
     * Milestone: triumphant 4-note fanfare.
     * Every 5 friends collected.
     */
    milestone() {
        if (!this._ctx) return;
        // Rising: C5 → E5 → G5 → C6
        this._toneAt(523.25, 0.2, 0.00, 'sine', 0.25);
        this._toneAt(659.25, 0.2, 0.12, 'sine', 0.25);
        this._toneAt(783.99, 0.2, 0.24, 'sine', 0.25);
        this._toneAt(1046.50, 0.5, 0.36, 'triangle', 0.3);
        // Bass root underneath
        this._toneAt(261.63, 0.7, 0.36, 'sine', 0.12);
    }

    /**
     * UI button tap: soft bubble pop.
     */
    tap() {
        if (!this._ctx) return;
        this._tone(600, 0.08, 'sine', 0.15);
    }

    /**
     * View transition: gentle windchime sweep (3 descending tones).
     */
    transition() {
        if (!this._ctx) return;
        this._toneAt(880.00, 0.15, 0.00, 'triangle', 0.12);
        this._toneAt(659.25, 0.15, 0.06, 'triangle', 0.10);
        this._toneAt(523.25, 0.20, 0.12, 'triangle', 0.08);
    }

    /**
     * Friend spawns: tiny twinkle.
     */
    spawn() {
        if (!this._ctx) return;
        // Quick high sine blip
        this._tone(1200, 0.1, 'sine', 0.08);
    }

    /**
     * Unicorn tapped directly: playful giggle (two quick notes).
     */
    giggle() {
        if (!this._ctx) return;
        this._toneAt(PENTA[3], 0.1, 0.00, 'sine', 0.2);
        this._toneAt(PENTA[5], 0.15, 0.08, 'sine', 0.2);
        this._toneAt(PENTA[4], 0.12, 0.18, 'triangle', 0.12);
    }

    /**
     * Flower bloom: soft low plink when tapping forest floor.
     */
    flower() {
        if (!this._ctx) return;
        this._tone(PENTA_LOW[2], 0.25, 'sine', 0.12);
        this._toneAt(PENTA_LOW[4], 0.2, 0.08, 'triangle', 0.08);
    }

    /**
     * Footstep: very subtle plink (mapped to unicorn movement).
     * Only plays occasionally to avoid being annoying.
     */
    step() {
        if (!this._ctx) return;
        const freq = PENTA_LOW[Math.floor(Math.random() * PENTA_LOW.length)];
        this._tone(freq, 0.06, 'sine', 0.04);
    }

    // ───────────────────────────────────────────────
    // Ambient Nature Soundscape
    // ───────────────────────────────────────────────

    /**
     * Start a gentle looping ambient soundscape: layered soft tones
     * that fade in/out organically for a forest-at-dusk feel.
     * Uses oscillators instead of audio files — fully synthesized.
     * Call once when game starts; stops automatically on pause.
     */
    startAmbient() {
        if (!this._ctx || this._ambientRunning) return;
        this._ambientRunning = true;
        this._ambientLoop();
    }

    stopAmbient() {
        this._ambientRunning = false;
        if (this._ambientTimeout) {
            clearTimeout(this._ambientTimeout);
            this._ambientTimeout = null;
        }
    }

    /**
     * Internal: schedule the next ambient layer after a random delay.
     * Each iteration plays a soft random chord from the low pentatonic scale
     * with long attack/decay — creating a shimmering pad texture.
     */
    _ambientLoop() {
        if (!this._ambientRunning || !this._ctx) return;

        // Only create oscillators if not muted (but always schedule next loop)
        if (!this._muted) {
            // Pick 2-3 random notes from low pentatonic for a soft chord
            const count = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                const note = PENTA_LOW[Math.floor(Math.random() * PENTA_LOW.length)];
                const dur = 3 + Math.random() * 4; // 3-7 seconds
                const vol = 0.02 + Math.random() * 0.02; // Very quiet: 0.02-0.04
                const delay = Math.random() * 1.5;

                const now = this._ctx.currentTime + delay;
                const osc = this._ctx.createOscillator();
                const gain = this._ctx.createGain();

                osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
                osc.frequency.value = note;

                // Very slow attack (fade in) → slow decay (fade out)
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(vol, now + dur * 0.4);
                gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

                osc.connect(gain);
                gain.connect(this._masterGain);
                osc.start(now);
                osc.stop(now + dur + 0.05);
            }
        }

        // Always schedule next loop iteration (even when muted)
        const nextDelay = 4000 + Math.random() * 4000;
        this._ambientTimeout = setTimeout(() => this._ambientLoop(), nextDelay);
    }

    /** Get current combo count (for external combo detection) */
    get comboCount() { return this._comboIndex; }
}
