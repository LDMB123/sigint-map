//! Emotion Vocabulary - Emotion check-in system for building emotional intelligence
//!
//! After kind acts and Sparkle story moments, Blaire can identify her feelings
//! using 16 emotion words across 4 developmental tiers.

use wasm_bindgen::prelude::*;
use web_sys::{Document, Element};

/// Emotion developmental tiers
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EmotionTier {
    /// Basic emotions (age 2-3): Happy, Sad, Excited, Proud
    Basic,
    /// Kindness emotions (age 3-4): Caring, Loving, Helpful, Generous
    Kindness,
    /// Impact emotions (age 4-5): Grateful, Relieved, Comforted, Included
    Impact,
    /// Growth emotions (age 5+): Brave, Patient, Gentle, Thoughtful
    Growth,
}

/// An emotion with name, emoji, and developmental tier
#[derive(Debug, Clone)]
pub struct Emotion {
    pub name: &'static str,
    pub emoji: &'static str,
    pub tier: EmotionTier,
}

/// All 16 emotions organized by tier
pub const EMOTIONS: [Emotion; 16] = [
    // Basic (4)
    Emotion {
        name: "Happy",
        emoji: "😊",
        tier: EmotionTier::Basic,
    },
    Emotion {
        name: "Sad",
        emoji: "😢",
        tier: EmotionTier::Basic,
    },
    Emotion {
        name: "Excited",
        emoji: "🤩",
        tier: EmotionTier::Basic,
    },
    Emotion {
        name: "Proud",
        emoji: "😌",
        tier: EmotionTier::Basic,
    },
    // Kindness (4)
    Emotion {
        name: "Caring",
        emoji: "🤗",
        tier: EmotionTier::Kindness,
    },
    Emotion {
        name: "Loving",
        emoji: "💕",
        tier: EmotionTier::Kindness,
    },
    Emotion {
        name: "Helpful",
        emoji: "🙏",
        tier: EmotionTier::Kindness,
    },
    Emotion {
        name: "Generous",
        emoji: "🎁",
        tier: EmotionTier::Kindness,
    },
    // Impact (4)
    Emotion {
        name: "Grateful",
        emoji: "🙏",
        tier: EmotionTier::Impact,
    },
    Emotion {
        name: "Relieved",
        emoji: "😌",
        tier: EmotionTier::Impact,
    },
    Emotion {
        name: "Comforted",
        emoji: "🫂",
        tier: EmotionTier::Impact,
    },
    Emotion {
        name: "Included",
        emoji: "🤝",
        tier: EmotionTier::Impact,
    },
    // Growth (4)
    Emotion {
        name: "Brave",
        emoji: "💪",
        tier: EmotionTier::Growth,
    },
    Emotion {
        name: "Patient",
        emoji: "🧘",
        tier: EmotionTier::Growth,
    },
    Emotion {
        name: "Gentle",
        emoji: "🌸",
        tier: EmotionTier::Growth,
    },
    Emotion {
        name: "Thoughtful",
        emoji: "💭",
        tier: EmotionTier::Growth,
    },
];

/// Creates the emotion check-in UI
///
/// Displays "How did YOU feel?" prompt with 16 emoji buttons in 4×4 grid.
/// Uses event delegation - caller must attach click handler to grid.
pub fn create_emotion_checkin_ui(document: &Document) -> Result<Element, JsValue> {
    // Main container
    let container = document.create_element("div")?;
    container.set_attribute("data-emotion-checkin", "")?;

    // Prompt
    let prompt = document.create_element("div")?;
    prompt.set_attribute("data-emotion-prompt", "")?;
    prompt.set_inner_html("How did YOU feel?");
    container.append_child(&prompt)?;

    // Emotion grid (4×4)
    let grid = document.create_element("div")?;
    grid.set_attribute("data-emotion-grid", "")?;

    for emotion in &EMOTIONS {
        let button = create_emotion_button(document, emotion)?;
        grid.append_child(&button)?;
    }

    container.append_child(&grid)?;

    // Skip button (optional)
    let skip = document.create_element("button")?;
    skip.set_attribute("data-emotion-skip", "")?;
    skip.set_inner_html("Skip");
    container.append_child(&skip)?;

    Ok(container)
}

/// Creates a single emotion button
fn create_emotion_button(document: &Document, emotion: &Emotion) -> Result<Element, JsValue> {
    let button = document.create_element("button")?;
    button.set_attribute("data-emotion", emotion.name)?;
    button.set_attribute("data-tier", tier_name(emotion.tier))?;

    // Emoji (large)
    let emoji_div = document.create_element("div")?;
    emoji_div.set_attribute("class", "emoji")?;
    emoji_div.set_inner_html(emotion.emoji);

    // Label (small text)
    let label_div = document.create_element("div")?;
    label_div.set_attribute("class", "label")?;
    label_div.set_inner_html(emotion.name);

    button.append_child(&emoji_div)?;
    button.append_child(&label_div)?;

    Ok(button)
}

/// Gets tier name as string for data attribute
fn tier_name(tier: EmotionTier) -> &'static str {
    match tier {
        EmotionTier::Basic => "basic",
        EmotionTier::Kindness => "kindness",
        EmotionTier::Impact => "impact",
        EmotionTier::Growth => "growth",
    }
}

/// Finds emotion by name
pub fn get_emotion_by_name(name: &str) -> Option<&'static Emotion> {
    EMOTIONS.iter().find(|e| e.name == name)
}

/// Gets emoji for emotion name (for database queries)
#[allow(dead_code)]
pub fn get_emoji_for_emotion(name: &str) -> Option<&'static str> {
    get_emotion_by_name(name).map(|e| e.emoji)
}

/// Counts emotions by tier from a list of emotion names
#[allow(dead_code)]
pub fn count_by_tier(emotion_names: &[String]) -> (u32, u32, u32, u32) {
    let mut basic = 0;
    let mut kindness = 0;
    let mut impact = 0;
    let mut growth = 0;

    for name in emotion_names {
        if let Some(emotion) = get_emotion_by_name(name) {
            match emotion.tier {
                EmotionTier::Basic => basic += 1,
                EmotionTier::Kindness => kindness += 1,
                EmotionTier::Impact => impact += 1,
                EmotionTier::Growth => growth += 1,
            }
        }
    }

    (basic, kindness, impact, growth)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_emotion_count() {
        assert_eq!(EMOTIONS.len(), 16);
    }

    #[test]
    fn test_tier_distribution() {
        let mut basic = 0;
        let mut kindness = 0;
        let mut impact = 0;
        let mut growth = 0;

        for emotion in &EMOTIONS {
            match emotion.tier {
                EmotionTier::Basic => basic += 1,
                EmotionTier::Kindness => kindness += 1,
                EmotionTier::Impact => impact += 1,
                EmotionTier::Growth => growth += 1,
            }
        }

        assert_eq!(basic, 4);
        assert_eq!(kindness, 4);
        assert_eq!(impact, 4);
        assert_eq!(growth, 4);
    }

    #[test]
    fn test_get_emotion_by_name() {
        let happy = get_emotion_by_name("Happy");
        assert!(happy.is_some());
        assert_eq!(happy.unwrap().emoji, "😊");

        let invalid = get_emotion_by_name("Nonexistent");
        assert!(invalid.is_none());
    }
}
