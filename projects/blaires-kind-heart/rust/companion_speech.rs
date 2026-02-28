use crate::{browser_apis, companion, speech};
use std::cell::Cell;

thread_local! {
    static LAST_BUBBLE_MS: Cell<f64> = const { Cell::new(0.0) };
}

const RATE_LIMIT_MS: f64 = 30_000.0;

const FEED_PHRASES: &[&str] = &[
    "Yummy! Thank you! 🌈",
    "That was delicious! 😋",
    "My tummy is happy! 💜",
    "You take such good care of me! 🦄",
];

const PET_PHRASES: &[&str] = &[
    "That feels so nice! 💜",
    "I love cuddles! 🤗",
    "You're the best friend! ⭐",
    "Purrrr! 😊",
];

const PLAY_PHRASES: &[&str] = &[
    "Wheee! So fun! 🎪",
    "Again! Again! 🌟",
    "That was amazing! ✨",
    "I love playing with you! 💜",
];

const MOOD_UP_PHRASES: &[&str] = &[
    "I feel so happy! 💜",
    "Kindness makes me sparkle! ✨",
    "What a wonderful day! 🌈",
    "You make everything better! ⭐",
];

fn try_show_bubble(phrases: &[&str]) -> bool {
    let now = browser_apis::now_ms();
    let last = LAST_BUBBLE_MS.with(|c| c.get());
    if now - last < RATE_LIMIT_MS {
        return false;
    }
    let Some(el) = companion::get_companion() else {
        return false;
    };
    let idx = (now as usize) % phrases.len();
    let phrase = phrases[idx];
    companion::show_bubble_typewriter(&el, phrase);
    speech::speak(phrase);
    LAST_BUBBLE_MS.with(|c| c.set(now));
    true
}

pub fn on_feed() {
    try_show_bubble(FEED_PHRASES);
}

pub fn on_pet() {
    try_show_bubble(PET_PHRASES);
}

pub fn on_play() {
    try_show_bubble(PLAY_PHRASES);
}

pub fn on_mood_change(mood: &str) {
    match mood {
        "happy" | "excited" => {
            try_show_bubble(MOOD_UP_PHRASES);
        }
        _ => {}
    }
}
